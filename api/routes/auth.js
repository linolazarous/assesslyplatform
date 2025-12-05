// api/routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import passport from '../config/passport.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Invitation from '../models/Invitation.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect } from '../middleware/auth.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// Debug middleware to log all auth requests
router.use((req, res, next) => {
  console.log(`🔐 Auth Route: ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

/**
 * Production-ready authentication adjustments:
 * - Login now sets a secure, HttpOnly refresh cookie (sameSite=None for cross-site).
 * - /refresh route issues a new access token using refresh cookie.
 * - /logout clears refresh cookie.
 *
 * Requirements:
 * - app must use cookie-parser middleware (app.use(cookieParser()))
 * - app must configure CORS with credentials: true and origin: process.env.FRONTEND_URL
 * - Environment variables:
 *   - JWT_SECRET
 *   - JWT_REFRESH_SECRET
 *   - FRONTEND_URL
 *   - NODE_ENV
 *
 * Security recommendations (not implemented here but strongly recommended for production):
 * - Persist refresh tokens in DB with rotation & revocation
 * - Rate-limit /login and /refresh endpoints
 * - Use TLS (https) — Render provides HTTPS by default
 */

// Helper: create access & refresh tokens
function createAccessToken(payload) {
  // Short lived access token
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function createRefreshToken(payload) {
  // Longer lived refresh token
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

// Cookie options for refresh token
function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd, // in production, must be true (HTTPS)
    sameSite: 'none', // allow cross-site cookie (frontend and backend on different origins)
    path: '/api/v1/auth', // limit cookie to auth routes
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days in ms
  };
}

// Helper: send refresh cookie
function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
}

// Helper: clear refresh cookie
function clearRefreshCookie(res) {
  // Set cookie with immediate expiry in the same scope
  res.cookie('refreshToken', '', {
    ...refreshCookieOptions(),
    maxAge: 0
  });
}

/**
 * NOTE:
 * For maximum security, persist a hashed refresh token in the DB per user (or a refresh token table).
 * This file uses signed JWT refresh tokens in cookies for simplicity and compatibility with the frontend.
 */

/* -------------------------------
   Registration (unchanged - minor safety)
   ------------------------------- */
router.post('/register', asyncHandler(async (req, res) => {
  try {
    console.log('📝 Registration request:', { 
      email: req.body.email, 
      role: req.body.role,
      hasInvitation: !!req.body.invitationToken,
      hasOrgName: !!req.body.organizationName
    });
    
    const { name, email, password, role, organizationName, invitationToken } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, email, password, role'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Validate role
    const validRoles = ['superadmin', 'admin', 'team_lead', 'assessor', 'team_member', 'candidate'];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User with this email already exists' 
      });
    }

    // Handle organization logic
    let organization = null;
    let organizationRole = role;
    let teams = [];

    // Case 1: User has invitation token (joining existing organization)
    if (invitationToken) {
      const invitation = await Invitation.findOne({
        token: invitationToken,
        email: email.toLowerCase(),
        status: 'pending'
      }).populate('organization');

      if (!invitation) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired invitation'
        });
      }

      organization = invitation.organization;
      organizationRole = invitation.role;
      teams = invitation.teams || [];

      // Mark invitation as used
      invitation.status = 'accepted';
      invitation.usedAt = new Date();
      await invitation.save();

    } 
    // Case 2: Admin creating new organization
    else if (role === 'admin' && organizationName) {
      // Create new organization
      organization = new Organization({
        name: organizationName.trim(),
        slug: generateSlug(organizationName),
        owner: null // Will be set after user creation
      });
      await organization.save();
      console.log('✅ New organization created:', organization._id);

    } 
    // Case 3: Candidate without organization (public registration)
    else if (role === 'candidate') {
      // Candidates can register without organization
      // They'll be assigned to organizations via invitations later
    } 
    // Case 4: Invalid combination
    else {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required for admin registration, or use an invitation link'
      });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role.toLowerCase(),
      isEmailVerified: false
    });

    // Add organization membership if applicable
    if (organization) {
      user.organizations.push({
        organization: organization._id,
        role: organizationRole,
        teams: teams,
        joinedAt: new Date()
      });

      // If user created the organization, set as owner
      if (role === 'admin' && organizationName) {
        organization.owner = user._id;
        await organization.save();
      }
    }

    await user.save();
    console.log('✅ User created successfully:', user._id);

    // Generate JWT token with organization context (access token)
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      organizations: user.organizations.map(org => ({
        organization: org.organization,
        role: org.role
      }))
    };

    const accessToken = createAccessToken(tokenPayload);

    // Send verification email
    await sendVerificationEmail(user);

    res.status(201).json({
      success: true,
      message: organization ? 'User registered and organization created successfully' : 'User registered successfully',
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        organizations: user.organizations
      },
      ...(organization && { 
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug
        }
      })
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
}));

/* -------------------------------
   Login: set refresh cookie + return access token
   ------------------------------- */
router.post('/login', asyncHandler(async (req, res) => {
  try {
    console.log('🔑 Login attempt for email:', req.body.email);
    
    const { email, password, organization: requestedOrganization } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .populate('organizations.organization', 'name slug logo isActive');

    if (!user) {
      console.log('❌ Login failed: User not found');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('❌ Login failed: Invalid password');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Filter active organizations
    const activeOrganizations = user.organizations.filter(org => 
      org.organization && org.organization.isActive !== false
    );

    // If specific organization requested, validate access
    if (requestedOrganization) {
      const hasAccess = activeOrganizations.some(org => 
        org.organization._id.toString() === requestedOrganization
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to requested organization'
        });
      }
    }

    // Generate token payload
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      organizations: activeOrganizations.map(org => ({
        organization: org.organization._id,
        role: org.role,
        teams: org.teams
      }))
    };

    // Create access & refresh tokens
    const accessToken = createAccessToken(tokenPayload);
    const refreshToken = createRefreshToken({ userId: user._id });

    // IMPORTANT: For extra security, persist a hashed refresh token in DB tied to the user
    // and verify it during /refresh. Not implemented here but strongly recommended.

    // Set refresh token cookie
    setRefreshCookie(res, refreshToken);

    console.log('✅ Login successful for user:', user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        organizations: activeOrganizations.map(org => ({
          organization: {
            id: org.organization._id,
            name: org.organization.name,
            slug: org.organization.slug,
            logo: org.organization.logo
          },
          role: org.role,
          teams: org.teams,
          joinedAt: org.joinedAt
        }))
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
}));

/* -------------------------------
   Refresh endpoint — issues new access token using refresh cookie
   ------------------------------- */
router.get('/refresh', asyncHandler(async (req, res) => {
  try {
    // `req.cookies` requires cookie-parser middleware at the app level
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token' });
    }

    // Verify refresh token signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      console.warn('⚠️ Invalid refresh token', err.message);
      // Clear possibly invalid cookie
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Optionally: verify that the refresh token is still valid in DB (not revoked)
    // e.g. const stored = await RefreshToken.findOne({ userId: decoded.userId, tokenHash: hash(refreshToken) });
    // if (!stored) return res.status(401)...

    // Load user to build token context (optional)
    const user = await User.findById(decoded.userId).populate('organizations.organization', 'name slug logo isActive');
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Invalid token user' });
    }

    // Rebuild active organization list
    const activeOrganizations = user.organizations.filter(org => 
      org.organization && org.organization.isActive !== false
    );

    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      organizations: activeOrganizations.map(org => ({
        organization: org.organization._id,
        role: org.role,
        teams: org.teams
      }))
    };

    const newAccessToken = createAccessToken(tokenPayload);

    // OPTIONAL: rotate refresh token (issue new refresh token cookie)
    // For this implementation we will keep the same refresh expiry, but rotating is recommended.
    // const newRefreshToken = createRefreshToken({ userId: user._id });
    // setRefreshCookie(res, newRefreshToken);

    res.json({
      success: true,
      token: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        organizations: activeOrganizations.map(org => ({
          organization: {
            id: org.organization._id,
            name: org.organization.name,
            slug: org.organization.slug,
            logo: org.organization.logo
          },
          role: org.role,
          teams: org.teams,
          joinedAt: org.joinedAt
        }))
      }
    });
  } catch (error) {
    console.error('❌ Refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token refresh',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
}));

/**
 * @swagger
 * /api/v1/auth/organizations/switch:
 *   post:
 *     summary: Switch active organization
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationId
 *             properties:
 *               organizationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization switched successfully
 */
router.post('/organizations/switch', protect, asyncHandler(async (req, res) => {
  const { organizationId } = req.body;

  // Check if user has access to the requested organization
  const userOrganization = req.user.organizations.find(
    org => org.organization.toString() === organizationId
  );

  if (!userOrganization) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this organization'
    });
  }

  // Generate new token with updated organization context
  const tokenPayload = {
    userId: req.user._id,
    email: req.user.email,
    role: req.user.role,
    organizations: req.user.organizations,
    currentOrganization: organizationId
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({
    success: true,
    message: 'Organization switched successfully',
    token,
    currentOrganization: {
      id: organizationId,
      role: userOrganization.role
    }
  });
}));

/**
 * @swagger
 * /api/v1/auth/invitations/accept:
 *   post:
 *     summary: Accept organization invitation
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 */
router.post('/invitations/accept', protect, asyncHandler(async (req, res) => {
  const { token } = req.body;

  const invitation = await Invitation.findOne({
    token,
    email: req.user.email,
    status: 'pending'
  }).populate('organization');

  if (!invitation) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired invitation'
    });
  }

  // Check if user already belongs to this organization
  const alreadyMember = req.user.organizations.some(
    org => org.organization.toString() === invitation.organization._id.toString()
  );

  if (alreadyMember) {
    return res.status(400).json({
      success: false,
      message: 'You are already a member of this organization'
    });
  }

  // Add organization to user
  req.user.organizations.push({
    organization: invitation.organization._id,
    role: invitation.role,
    teams: invitation.teams || [],
    joinedAt: new Date()
  });

  await req.user.save();

  // Mark invitation as accepted
  invitation.status = 'accepted';
  invitation.usedAt = new Date();
  invitation.acceptedBy = req.user._id;
  await invitation.save();

  // Generate new token with updated organizations
  const tokenPayload = {
    userId: req.user._id,
    email: req.user.email,
    role: req.user.role,
    organizations: req.user.organizations
  };

  const newAuthToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({
    success: true,
    message: 'Invitation accepted successfully',
    token: newAuthToken,
    organization: {
      id: invitation.organization._id,
      name: invitation.organization.name,
      slug: invitation.organization.slug
    }
  });
}));

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;

  // In a real implementation, you'd verify the JWT token
  // and update the user's email verification status
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  const user = await User.findById(decoded.userId);
  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification token'
    });
  }

  user.isEmailVerified = true;
  user.emailVerifiedAt = new Date();
  await user.save();

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
}));

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile with organization context
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get('/me', protect, asyncHandler(async (req, res) => {
  // Populate organization details
  const user = await User.findById(req.user._id)
    .populate('organizations.organization', 'name slug logo isActive');

  res.json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      avatar: user.avatar,
      provider: user.provider,
      organizations: user.organizations.map(org => ({
        organization: {
          id: org.organization._id,
          name: org.organization.name,
          slug: org.organization.slug,
          logo: org.organization.logo,
          isActive: org.organization.isActive
        },
        role: org.role,
        teams: org.teams,
        joinedAt: org.joinedAt
      }))
    }
  });
}));

/* -------------------------------
   Logout: clear refresh cookie
   ------------------------------- */
router.post('/logout', protect, (req, res) => {
  console.log('🚪 User logout:', req.user._id);

  // If you store refresh tokens in DB, remove/revoke them here for this user.
  clearRefreshCookie(res);

  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Helper functions
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function sendVerificationEmail(user) {
  const verificationToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email Address - Assessly',
    template: 'email-verification',
    context: {
      name: user.name,
      verificationUrl,
      supportEmail: 'support@assessly.com'
    }
  });
}

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    features: {
      multitenant: true,
      organizations: true,
      invitations: true
    }
  });
});

export default router;
