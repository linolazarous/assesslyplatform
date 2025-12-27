// src/api/utils/security.js
import crypto from 'crypto';

export function generateRandomToken(byteLength = 48) {
  return crypto.randomBytes(byteLength).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Safe constant-time comparison to avoid timing attacks
 */
export function secureCompare(a = '', b = '') {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}
