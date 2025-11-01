// api/controllers/authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import chalk from 'chalk';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret';
const JWT_EXP = process.env.ACCESS_TOKEN_EXP || '15m'; // short-lived access token
const REFRESH_TOKEN_EXP_DAYS = Number(process.env.REFRESH_TOKEN_EXP_DAYS || 30);
const REFRESH_TOKEN_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken';

/* ---------- Helpers ---------- */

function generateAccessToken(user) {
  // Minimal payload; keep it small
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXP }
  );
}

function generateRefreshToken() {
  // cryptographically secure random token (not JWT)
  return crypto.randomBytes(64).toString('hex');
}

function cookieOptions(req) {
  // secure cookie for HTTPS only; sameSite 'none' when cross-site (frontend + backend on different domains)
  const isSecure = true; // Render uses HTTPS
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'none',
    path: '/api',
    maxAge: REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000,
  };
}

/* ---------- Controller Actions ---------- */

export async function register(req, res) {
  try {
    const { name, email, password, role = 'candidate' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, password required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'User already exists' });

    const user = new User({ name, email, password, role });
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshTokenValue = generateRefreshToken();

    const refreshTokenDoc = new RefreshToken({
      user: user._id,
      token: refreshTokenValue,
      expires: new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000),
      createdByIp: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });
    await refreshTokenDoc.save();

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshTokenValue, cookieOptions(req));
    res.status(201).json({
      message: 'User created',
      user: user.toJSON(),
      accessToken,
      expiresIn: JWT_EXP
    });
  } catch (err) {
    console.error(chalk.red('Register error:'), err);
    res.status(500).json({ message: 'Registration failed' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // optional: call user.recordFailedAttempt() if implemented
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // success: create tokens
    const accessToken = generateAccessToken(user);
    const refreshTokenValue = generateRefreshToken();

    const refreshTokenDoc = new RefreshToken({
      user: user._id,
      token: refreshTokenValue,
      expires: new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000),
      createdByIp: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });
    await refreshTokenDoc.save();

    // set cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshTokenValue, cookieOptions(req));

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      accessToken,
      expiresIn: JWT_EXP
    });
  } catch (err) {
    console.error(chalk.red('Login error:'), err);
    res.status(500).json({ message: 'Login failed' });
  }
}

export async function refreshToken(req, res) {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || req.body.refreshToken;
    if (!token) return res.status(401).json({ message: 'Refresh token missing' });

    const stored = await RefreshToken.findOne({ token }).populate('user');
    if (!stored || !stored.isActive) return res.status(401).json({ message: 'Invalid refresh token' });

    // rotate: create new refresh token and revoke old
    const newTokenValue = generateRefreshToken();
    const newRefreshDoc = new RefreshToken({
      user: stored.user._id,
      token: newTokenValue,
      expires: new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000),
      createdByIp: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });
    await newRefreshDoc.save();

    stored.revokedAt = Date.now();
    stored.revokedByIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    stored.replacedByToken = newTokenValue;
    await stored.save();

    // issue new access token
    const accessToken = generateAccessToken(stored.user);
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, newTokenValue, cookieOptions(req));

    res.json({ accessToken, expiresIn: JWT_EXP });
  } catch (err) {
    console.error(chalk.red('Refresh token error:'), err);
    res.status(500).json({ message: 'Could not refresh token' });
  }
}

export async function logout(req, res) {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || req.body.refreshToken;
    if (token) {
      const stored = await RefreshToken.findOne({ token });
      if (stored && stored.isActive) {
        stored.revokedAt = Date.now();
        stored.revokedByIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        stored.reasonRevoked = 'User logout';
        await stored.save();
      }
    }

    // clear cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: '/api' });
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(chalk.red('Logout error:'), err);
    res.status(500).json({ message: 'Logout failed' });
  }
}

/* Protected profile endpoint example */
export async function profile(req, res) {
  try {
    // req.user is set by auth middleware
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(chalk.red('Profile error:'), err);
    res.status(500).json({ message: 'Failed to get profile' });
  }
}
