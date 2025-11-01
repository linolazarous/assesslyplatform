// api/controllers/authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import chalk from 'chalk';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret';
const JWT_EXP = process.env.ACCESS_TOKEN_EXP || '15m';
const REFRESH_TOKEN_EXP_DAYS = Number(process.env.REFRESH_TOKEN_EXP_DAYS || 30);
const REFRESH_TOKEN_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken';

/* ---------- Helpers ---------- */

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXP }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function cookieOptions(req) {
  const isSecure = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax', // Changed from 'none' for better compatibility
    path: '/', // Changed from '/api' to work across all routes
    maxAge: REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000,
  };
}

/* ---------- Controller Actions ---------- */

export async function register(req, res) {
  try {
    const { name, email, password, role = 'candidate' } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    // Create user - let the User model handle password hashing
    const user = new User({ 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      password, 
      role 
    });
    
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshTokenValue = generateRefreshToken();

    // Save refresh token
    const refreshTokenDoc = new RefreshToken({
      user: user._id,
      token: refreshTokenValue,
      expires: new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000),
      createdByIp: getClientIp(req)
    });
    await refreshTokenDoc.save();

    // Set cookie and response
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshTokenValue, cookieOptions(req));
    
    res.status(201).json({
      message: 'User created successfully',
      user: user.toJSON(),
      accessToken,
      expiresIn: JWT_EXP
    });

  } catch (err) {
    console.error(chalk.red('Register error:'), err);
    
    // More specific error messages
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user with password field explicitly selected
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +loginAttempts +lockUntil');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({ message: 'Account temporarily locked. Try again later.' });
    }

    // Use the User model's comparePassword method instead of direct bcrypt
    let isPasswordValid = false;
    try {
      isPasswordValid = await user.comparePassword(password);
    } catch (compareError) {
      // Handle specific error from comparePassword method
      if (compareError.message.includes('locked')) {
        return res.status(423).json({ message: compareError.message });
      }
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshTokenValue = generateRefreshToken();

    // Save refresh token
    const refreshTokenDoc = new RefreshToken({
      user: user._id,
      token: refreshTokenValue,
      expires: new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000),
      createdByIp: getClientIp(req)
    });
    await refreshTokenDoc.save();

    // Set cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshTokenValue, cookieOptions(req));

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      accessToken,
      expiresIn: JWT_EXP
    });

  } catch (err) {
    console.error(chalk.red('Login error:'), err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
}

// Helper function to get client IP
function getClientIp(req) {
  return req.ip || 
         req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         'unknown';
}

export async function refreshToken(req, res) {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || req.body.refreshToken;
    if (!token) return res.status(401).json({ message: 'Refresh token missing' });

    const stored = await RefreshToken.findOne({ token }).populate('user');
    if (!stored || !stored.isActive) return res.status(401).json({ message: 'Invalid refresh token' });

    // Create new refresh token and revoke old
    const newTokenValue = generateRefreshToken();
    const newRefreshDoc = new RefreshToken({
      user: stored.user._id,
      token: newTokenValue,
      expires: new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000),
      createdByIp: getClientIp(req)
    });
    await newRefreshDoc.save();

    stored.revokedAt = new Date();
    stored.revokedByIp = getClientIp(req);
    stored.replacedByToken = newTokenValue;
    stored.reasonRevoked = 'Refreshed';
    await stored.save();

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
        stored.revokedAt = new Date();
        stored.revokedByIp = getClientIp(req);
        stored.reasonRevoked = 'User logout';
        await stored.save();
      }
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { 
      path: '/',
      httpOnly: true,
      secure: req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https'
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(chalk.red('Logout error:'), err);
    res.status(500).json({ message: 'Logout failed' });
  }
}

export async function profile(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({ user: user.toJSON() });
  } catch (err) {
    console.error(chalk.red('Profile error:'), err);
    res.status(500).json({ message: 'Failed to get profile' });
  }
}
