// api/controllers/authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import chalk from 'chalk';

import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import Organization from '../models/Organization.js';
import mailer from '../utils/mailer.js';
import { EmailTemplates } from '../utils/mailer.js';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXP = process.env.ACCESS_TOKEN_EXP || '15m';
const REFRESH_TOKEN_EXP = process.env.REFRESH_TOKEN_EXP || '30d';
const REFRESH_TOKEN_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'assessly_refresh_token';
const FRONTEND_URL = process.env.FRONTEND_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate required environment variables
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error(chalk.red('❌ JWT secrets not configured'));
  if (NODE_ENV === 'production') {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET are required');
  }
}

/* ---------- Utility Functions ---------- */

/**
 * Get client IP address from request
 */
function getClientIp(req) {
  return req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';
}

/**
 * Get client device information from request
 */
function getClientDevice(req) {
  const userAgent = req.get('User-Agent') || '';
  
  // Simple device detection (can be enhanced with a proper library)
  let deviceType = 'unknown';
  if (/mobile/i.test(userAgent)) deviceType = 'mobile';
  else if (/tablet/i.test(userAgent)) deviceType = 'tablet';
  else if (/desktop|windows|macintosh|linux/i.test(userAgent)) deviceType = 'desktop';

  return {
    userAgent,
    type: deviceType,
    ip: getClientIp(req)
  };
}

/**
 * Generate access token
 */
function generateAccessToken(user) {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    organization: user.organization?.toString(),
    permissions: user.permissions
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXP,
    issuer: 'assessly-platform',
    audience: 'assessly-users'
  });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    id: user._id.toString(),
    version: user.security?.passwordChangedAt?.getTime() || 1
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXP,
    issuer: 'assessly-platform',
    audience: 'assessly-users'
  });
}

/**
 * Get cookie options based on environment
 */
function getCookieOptions(req) {
  const isProduction = NODE_ENV === 'production';
  const isSecure = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';

  return {
    httpOnly: true,
    secure: isProduction && isSecure,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/v1/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    domain: isProduction ? new URL(FRONTEND_URL).hostname : undefined
  };
}

/**
 * Validate password strength
 */
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!hasUpperCase) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumbers) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }

  return { isValid: true };
}

/**
 * Log authentication activity
 */
async function logAuthActivity(user, action, metadata = {}) {
  try {
    // This would integrate with your UserActivity model
    console.log(chalk.blue(`🔐 Auth Activity: ${user.email} - ${action}`), {
      userId: user._id,
      organization: user.organization,
      ...metadata
    });
  } catch (error) {
    console.error(chalk.red('Failed to log auth activity:'), error);
  }
}

/* ---------- Controller Actions ---------- */

/**
 * Register a new user and organization
 */
export async function register(req, res) {
  const session = await User.startSession();
  
  try {
    await session.startTransaction();

    const { name, email, password, organizationName, timezone = 'UTC', language = 'en' } = req.body;

    // Validation
    if (!name?.trim() || !email?.trim() || !password || !organizationName?.trim()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and organization name are required'
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Create organization first
    const organization = new Organization({
      name: organizationName.trim(),
      description: `Organization for ${name.trim()}`,
      owner: null, // Will be set after user creation
      settings: {
        allowSelfRegistration: true,
        allowGoogleOAuth: true,
        allowEmailPassword: true
      },
      subscription: {
        plan: 'free',
        status: 'active'
      }
    });

    await organization.save({ session });

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      organization: organization._id,
      role: 'org_admin',
      preferences: {
        language,
        timezone
      },
      metadata: {
        signupSource: 'direct',
        timezone,
        locale: language
      }
    });

    await user.save({ session });

    // Set organization owner and add user as member
    organization.owner = user._id;
    organization.members.push({
      user: user._id,
      role: 'org_admin',
      joinedAt: new Date()
    });
    await organization.save({ session });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token with device information
    const deviceInfo = getClientDevice(req);
    const refreshTokenDoc = new RefreshToken({
      user: user._id,
      organization: user.organization,
      token: refreshToken,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      device: {
        name: deviceInfo.userAgent.substring(0, 100),
        type: deviceInfo.type,
        userAgent: deviceInfo.userAgent
      },
      location: {
        ip: deviceInfo.ip
      },
      security: {
        fingerprint: crypto.createHash('md5').update(deviceInfo.userAgent).digest('hex')
      }
    });

    await refreshTokenDoc.save({ session });

    // Send welcome email
    try {
      const welcomeEmail = EmailTemplates.welcome({
        name: user.name,
        dashboardUrl: `${FRONTEND_URL}/dashboard`,
        supportEmail: 'support@assessly.com'
      });

      await mailer.sendMail({
        to: user.email,
        ...welcomeEmail
      });
    } catch (emailError) {
      console.warn(chalk.yellow('Failed to send welcome email:'), emailError.message);
    }

    await session.commitTransaction();

    // Set refresh token cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getCookieOptions(req));

    // Log activity
    await logAuthActivity(user, 'registration', {
      organization: organization._id,
      device: deviceInfo
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: user.toJSON(),
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug
        },
        accessToken,
        expiresIn: ACCESS_TOKEN_EXP
      }
    });

  } catch (error) {
    await session.abortTransaction();
    
    console.error(chalk.red('❌ Registration error:'), error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  } finally {
    session.endSession();
  }
}

/**
 * User login
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user with security fields
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password +security +isActive')
      .populate('organization', 'name slug settings');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to multiple failed attempts. Try again later.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment failed attempts
      await user.incrementLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login and activity
    user.lastLogin = new Date();
    user.lastActivity = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token with device information
    const deviceInfo = getClientDevice(req);
    const refreshTokenDoc = new RefreshToken({
      user: user._id,
      organization: user.organization,
      token: refreshToken,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      device: {
        name: deviceInfo.userAgent.substring(0, 100),
        type: deviceInfo.type,
        userAgent: deviceInfo.userAgent
      },
      location: {
        ip: deviceInfo.ip
      },
      security: {
        fingerprint: crypto.createHash('md5').update(deviceInfo.userAgent).digest('hex')
      }
    });

    await refreshTokenDoc.save();

    // Set refresh token cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getCookieOptions(req));

    // Log activity
    await logAuthActivity(user, 'login', {
      device: deviceInfo
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        organization: user.organization,
        accessToken,
        expiresIn: ACCESS_TOKEN_EXP
      }
    });

  } catch (error) {
    console.error(chalk.red('❌ Login error:'), error);

    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
}

/**
 * Refresh access token
 */
export async function refreshToken(req, res) {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || req.body.refreshToken;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Find user and refresh token
    const user = await User.findById(decoded.id)
      .select('+security')
      .populate('organization', 'name slug settings');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Password changed. Please login again.'
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update refresh token in database
    const deviceInfo = getClientDevice(req);
    await RefreshToken.findOneAndUpdate(
      { token },
      {
        $set: {
          replacedByToken: newRefreshToken,
          revokedAt: new Date(),
          reasonRevoked: 'refreshed',
          revokedByIp: deviceInfo.ip
        }
      }
    );

    // Save new refresh token
    const newRefreshTokenDoc = new RefreshToken({
      user: user._id,
      organization: user.organization,
      token: newRefreshToken,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      device: {
        name: deviceInfo.userAgent.substring(0, 100),
        type: deviceInfo.type,
        userAgent: deviceInfo.userAgent
      },
      location: {
        ip: deviceInfo.ip
      },
      security: {
        fingerprint: crypto.createHash('md5').update(deviceInfo.userAgent).digest('hex')
      }
    });

    await newRefreshTokenDoc.save();

    // Set new refresh token cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, getCookieOptions(req));

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        expiresIn: ACCESS_TOKEN_EXP
      }
    });

  } catch (error) {
    console.error(chalk.red('❌ Refresh token error:'), error);

    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
}

/**
 * Logout user
 */
export async function logout(req, res) {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || req.body.refreshToken;
    const userId = req.user?.id;

    if (token) {
      // Revoke refresh token
      const deviceInfo = getClientDevice(req);
      await RefreshToken.findOneAndUpdate(
        { token },
        {
          $set: {
            revokedAt: new Date(),
            reasonRevoked: 'logout',
            revokedByIp: deviceInfo.ip
          }
        }
      );
    }

    if (userId) {
      // Update user last activity
      await User.findByIdAndUpdate(userId, {
        lastActivity: new Date()
      });

      // Log activity
      await logAuthActivity({ _id: userId, email: req.user.email }, 'logout', {
        device: getClientDevice(req)
      });
    }

    // Clear cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      path: '/api/v1/auth',
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: NODE_ENV === 'production' ? 'strict' : 'lax'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error(chalk.red('❌ Logout error:'), error);

    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
}

/**
 * Get current user profile
 */
export async function profile(req, res) {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate('organization', 'name slug settings subscription')
      .select('-security -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error(chalk.red('❌ Profile error:'), error);

    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
}

/**
 * Update user profile
 */
export async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { name, preferences, profile } = req.body;

    const updateData = {};
    if (name?.trim()) updateData.name = name.trim();
    if (preferences) updateData.preferences = preferences;
    if (profile) updateData.profile = profile;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('organization', 'name slug settings')
      .select('-security -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error(chalk.red('❌ Update profile error:'), error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
}

/**
 * Change password
 */
export async function changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    const user = await User.findById(userId).select('+password +security');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Revoke all refresh tokens for security
    await RefreshToken.revokeAllForUser(user.organization, user._id, 'password_change', user._id);

    // Log activity
    await logAuthActivity(user, 'password_change');

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error(chalk.red('❌ Change password error:'), error);

    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
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
