// src/api/services/auth.service.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import chalk from 'chalk';
import RefreshToken from '../models/RefreshToken.js';
import User from '../models/User.js';
import { generateRandomToken, hashToken } from '../utils/security.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXP = process.env.ACCESS_TOKEN_EXP || '15m';
const REFRESH_TOKEN_EXP = process.env.REFRESH_TOKEN_EXP || '30d';
const REFRESH_TOKEN_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error(chalk.red('❌ Missing JWT secrets in environment'));
  // don't throw here; controllers will handle but this is critical
}

/**
 * Build access token from user object (minimal payload)
 */
export function createAccessToken(user) {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    organization: user.organization?.toString()
  };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXP,
    issuer: 'assessly-platform',
    audience: 'assessly-users'
  });
}

/**
 * Create a refresh token pair: raw token (returned to client) and hashed stored in DB
 */
export async function createRefreshTokenDoc({ user, deviceInfo = {}, ip, replacedToken = null }) {
  // raw token to return to client
  const rawToken = generateRandomToken(48);
  const tokenHash = hashToken(rawToken);

  const now = Date.now();

  const rtDoc = new RefreshToken({
    user: user._id,
    organization: user.organization,
    tokenHash,
    createdAt: new Date(now),
    expiresAt: new Date(now + REFRESH_TOKEN_EXPIRES_MS),
    device: {
      name: (deviceInfo.userAgent || '').substr(0, 200),
      type: deviceInfo.device?.type || deviceInfo.type || 'unknown',
      userAgent: deviceInfo.userAgent || ''
    },
    location: {
      ip: ip || deviceInfo.ip || 'unknown'
    },
    replacedByTokenHash: null,
    revokedAt: null,
    replacedReason: null,
    security: {
      fingerprint: crypto.createHash('md5').update(deviceInfo.userAgent || '').digest('hex')
    }
  });

  if (replacedToken) {
    rtDoc.replacedByTokenHash = hashToken(replacedToken);
  }

  await rtDoc.save();

  return { rawToken, doc: rtDoc };
}

/**
 * Verify incoming raw refresh token string:
 *  - hash and search DB for matching tokenHash for the user + organization
 *  - detect reuse (token is already revoked/replaced)
 */
export async function verifyRefreshToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const tokenHash = hashToken(rawToken);

  // find token doc
  const doc = await RefreshToken.findOne({ tokenHash }).populate('user', '+security +isActive');
  if (!doc) return { valid: false, reason: 'not_found' };
  if (doc.revokedAt) return { valid: false, reason: 'revoked', doc };
  if (doc.expiresAt && doc.expiresAt < new Date()) return { valid: false, reason: 'expired', doc };

  // ensure user still exists and is active
  if (!doc.user || !doc.user.isActive) return { valid: false, reason: 'user_inactive', doc };

  // OK
  return { valid: true, doc };
}

/**
 * Rotate refresh token: revoke old doc, create new doc, link replacedByTokenHash
 */
export async function rotateRefreshToken(oldRawToken, user, deviceInfo = {}, ip) {
  const oldHash = hashToken(oldRawToken);
  // mark old token revoked and set replacedByTokenHash once we create new
  const oldDoc = await RefreshToken.findOne({ tokenHash: oldHash });
  if (oldDoc && !oldDoc.revokedAt) {
    oldDoc.revokedAt = new Date();
    oldDoc.replacedReason = 'rotated';
    await oldDoc.save();
  }

  const { rawToken: newRaw, doc: newDoc } = await createRefreshTokenDoc({ user, deviceInfo, ip, replacedToken: oldRawToken });
  // link old to new
  if (oldDoc) {
    oldDoc.replacedByTokenHash = newDoc.tokenHash;
    await oldDoc.save();
  }

  return { rawToken: newRaw, doc: newDoc };
}

/**
 * Revoke a refresh token by raw token (hash)
 */
export async function revokeRefreshToken(rawToken, reason = 'revoked', ip = '') {
  const tokenHash = hashToken(rawToken);
  const doc = await RefreshToken.findOne({ tokenHash });
  if (!doc) return null;
  doc.revokedAt = new Date();
  doc.replacedReason = reason;
  doc.revokedByIp = ip;
  await doc.save();
  return doc;
}

/**
 * Revoke all tokens for a user in an org (useful on password change)
 */
export async function revokeAllForUserOrg(userId, organizationId, reason = 'revoke_all') {
  return RefreshToken.updateMany({ user: userId, organization: organizationId, revokedAt: null }, { $set: { revokedAt: new Date(), replacedReason: reason } });
}
