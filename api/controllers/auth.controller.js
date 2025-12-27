// src/api/controllers/auth.controller.js
import chalk from 'chalk';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import User from '../models/User.js';
import Organization from '../models/Organization.js';
import RefreshToken from '../models/RefreshToken.js';
import mailer, { EmailTemplates } from '../utils/mailer.js';

import { getClientInfo } from '../utils/clientInfo.js';
import {
  createAccessToken,
  createRefreshTokenDoc,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUserOrg
} from '../services/auth.service.js';

const REFRESH_TOKEN_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'assessly_refresh_token';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com';
const NODE_ENV = process.env.NODE_ENV || 'development';
const ACCESS_TOKEN_EXP = process.env.ACCESS_TOKEN_EXP || '15m';

/**
 * Cookie options builder
 */
function getCookieOptions(req) {
  const isProd = NODE_ENV === 'production';
  const secure = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
  const cookie = {
    httpOnly: true,
    secure: isProd && secure,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30d
  };

  // set cookie domain for production if FRONTEND_URL is provided
  try {
    if (isProd && FRONTEND_URL) cookie.domain = new URL(FRONTEND_URL).hostname;
  } catch (err) {
    // ignore invalid FRONTEND_URL
  }

  return cookie;
}

/* -------------------------
  Register
--------------------------*/
export async function register(req, res) {
  const session = await User.startSession();
  try {
    await session.startTransaction();

    const { name, email, password, organizationName, timezone = 'UTC', language = 'en' } = req.body;
    if (!name || !email || !password || !organizationName) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() }).session(session);
    if (existing) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const org = await Organization.create([{
      name: organizationName.trim(),
      description: `Organization for ${name.trim()}`,
      settings: { allowSelfRegistration: true, allowGoogleOAuth: true, allowEmailPassword: true },
      subscription: { plan: 'free', status: 'active' }
    }], { session });

    const organization = org[0];

    const user = await User.create([{
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      organization: organization._id,
      role: 'org_admin',
      preferences: { language, timezone },
      metadata: { signupSource: 'direct' }
    }], { session });

    const createdUser = user[0];

    // set org owner & member
    organization.owner = createdUser._id;
    organization.members = organization.members || [];
    organization.members.push({ user: createdUser._id, role: 'org_admin', joinedAt: new Date() });
    await organization.save({ session });

    // create tokens
    const accessToken = createAccessToken(createdUser);
    const deviceInfo = getClientInfo(req);
    const { rawToken: refreshToken } = await createRefreshTokenDoc({ user: createdUser, deviceInfo, ip: deviceInfo.ip });

    // send welcome email (non-blocking)
    try {
      const template = EmailTemplates.welcome({
        name: createdUser.name,
        organizationName: organization.name,
        dashboardUrl: `${FRONTEND_URL}/dashboard`,
        supportEmail: process.env.SUPPORT_EMAIL || 'assesslyinc@gmail.com'
      });
      await mailer.sendMail({ to: createdUser.email, ...template });
    } catch (err) {
      console.warn(chalk.yellow('⚠️ Welcome email failed:'), err?.message || err);
    }

    await session.commitTransaction();

    // set cookie and respond
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getCookieOptions(req));
    return res.status(201).json({
      success: true,
      message: 'Account created',
      data: {
        user: createdUser.toJSON(),
        organization: { id: organization._id, name: organization.name, slug: organization.slug },
        accessToken,
        expiresIn: ACCESS_TOKEN_EXP
      }
    });
  } catch (err) {
    await session.abortTransaction();
    console.error(chalk.red('❌ Registration error:'), err);
    return res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  } finally {
    session.endSession();
  }
}

/* -------------------------
  Login
--------------------------*/
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +isActive +security').populate('organization', 'name slug settings');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated' });

    if (!await user.comparePassword(password)) {
      await user.incrementLoginAttempts?.();
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    await user.resetLoginAttempts?.();
    user.lastLogin = new Date();
    user.lastActivity = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    const accessToken = createAccessToken(user);
    const deviceInfo = getClientInfo(req);
    const { rawToken: refreshToken } = await createRefreshTokenDoc({ user, deviceInfo, ip: deviceInfo.ip });

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getCookieOptions(req));

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        organization: user.organization,
        accessToken,
        expiresIn: ACCESS_TOKEN_EXP
      }
    });
  } catch (err) {
    console.error(chalk.red('❌ Login error:'), err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
}

/* -------------------------
  Refresh token
--------------------------*/
export async function refreshToken(req, res) {
  try {
    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || req.body?.refreshToken;
    if (!rawToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

    // verify token doc
    const verification = await verifyRefreshToken(rawToken);
    if (!verification.valid) {
      // if not found or invalid, respond 401. For reuse detection, verification.doc may hold info.
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const tokenDoc = verification.doc;
    const user = await User.findById(tokenDoc.user._id).select('+isActive +security').populate('organization', 'name slug settings');
    if (!user || !user.isActive) {
      // revoke token if user missing
      await revokeRefreshToken(rawToken, 'user_not_found');
      return res.status(401).json({ success: false, message: 'Invalid token or user inactive' });
    }

    // rotate: revoke old and mint new refresh token
    const deviceInfo = getClientInfo(req);
    const { rawToken: newRawToken } = await rotateRefreshToken(rawToken, user, deviceInfo, deviceInfo.ip);

    const accessToken = createAccessToken(user);
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRawToken, getCookieOptions(req));

    return res.json({
      success: true,
      message: 'Token refreshed',
      data: { accessToken, expiresIn: ACCESS_TOKEN_EXP }
    });
  } catch (err) {
    console.error(chalk.red('❌ Refresh token error:'), err);
    return res.status(500).json({ success: false, message: 'Failed to refresh token' });
  }
}

/* -------------------------
  Logout
--------------------------*/
export async function logout(req, res) {
  try {
    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || req.body?.refreshToken;
    const deviceInfo = getClientInfo(req);
    if (rawToken) {
      await revokeRefreshToken(rawToken, 'user_logout', deviceInfo.ip);
    }

    // clear cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      path: '/api/v1/auth',
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: NODE_ENV === 'production' ? 'none' : 'lax'
    });

    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error(chalk.red('❌ Logout error:'), err);
    return res.status(500).json({ success: false, message: 'Logout failed' });
  }
}

/* -------------------------
  Profile & Updates
--------------------------*/
export async function profile(req, res) {
  try {
    const user = await User.findById(req.user.id).populate('organization', 'name slug settings subscription').select('-security -__v');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: { user: user.toJSON() } });
  } catch (err) {
    console.error(chalk.red('❌ Profile error:'), err);
    return res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
}

export async function updateProfile(req, res) {
  try {
    const { name, preferences, profile } = req.body;
    const updates = {};
    if (name?.trim()) updates.name = name.trim();
    if (preferences) updates.preferences = preferences;
    if (profile) updates.profile = profile;

    const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true, runValidators: true }).populate('organization', 'name slug settings').select('-security -__v');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, message: 'Profile updated', data: { user: user.toJSON() } });
  } catch (err) {
    console.error(chalk.red('❌ Update profile error:'), err);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
}

/* -------------------------
  Change Password
--------------------------*/
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Current and new passwords required' });

    const user = await User.findById(req.user.id).select('+password +security');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!await user.comparePassword(currentPassword)) return res.status(401).json({ success: false, message: 'Current password incorrect' });

    // update password (assuming User model hashes on save)
    user.password = newPassword;
    await user.save();

    // Revoke all refresh tokens for this user within the org
    await revokeAllForUserOrg(user._id, user.organization, 'password_change');

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error(chalk.red('❌ Change password error:'), err);
    return res.status(500).json({ success: false, message: 'Failed to change password' });
  }
}

export default {
  register,
  login,
  refreshToken,
  logout,
  profile,
  updateProfile,
  changePassword
};
