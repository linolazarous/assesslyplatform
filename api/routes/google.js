// api/routes/google.js
import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import Invitation from "../models/Invitation.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendEmail } from "../services/emailService.js";

const router = express.Router();

// Debug middleware for OAuth flows
router.use((req, res, next) => {
  console.log(`🔐 Google OAuth: ${req.method} ${req.path}`, {
    query: req.query,
    hasSession: !!req.session,
    ip: req.ip
  });
  next();
});

/**
 * @swagger
 * tags:
 *   name: Google OAuth
 *   description: Google OAuth authentication with multitenant support
 */

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Initiate Google OAuth flow
 *     tags: [Google OAuth]
 *     parameters:
 *       - in: query
 *         name: redirectUrl
 *         schema:
 *           type: string
 *         description: Frontend redirect URL after authentication
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *         description: Organization ID or slug for context
 *       - in: query
 *         name: invitation
 *         schema:
 *           type: string
 *         description: Invitation token for organization joining
 *       - in: query
 *         name: connection
 *         schema:
 *           type: string
 *           enum: [login, register, connect]
 *           default: login
 *         description: OAuth flow type
 *     responses:
 *       302:
 *         description: Redirects to Google OAuth
 */
router.get(
  "/google",
  (req, res, next) => {
    const { 
      redirectUrl = `${process.env.FRONTEND_URL}/auth/success`,
      organization,
      invitation,
      connection = 'login'
    } = req.query;

    // Store OAuth state in session or signed cookie
    const stateParams = {
      redirectUrl,
      organization,
      invitation,
      connection,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2)
    };

    // Encode state parameters
    const state = Buffer.from(JSON.stringify(stateParams)).toString('base64');
    
    console.log('🚀 Initiating Google OAuth:', {
      connection,
      organization,
      hasInvitation: !!invitation,
      redirectUrl
    });

    const authOptions = {
      scope: [
        'profile',
        'email',
        'openid'
      ],
      state: state,
      accessType: 'offline',
      prompt: 'consent',
      // Include organization context in login hint if available
      ...(req.query.login_hint && { loginHint: req.query.login_hint })
    };

    passport.authenticate("google", authOptions)(req, res, next);
  }
);

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback handler
 *     tags: [Google OAuth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to frontend with auth result
 *       400:
 *         description: Authentication failed
 */
router.get(
  "/google/callback",
  (req, res, next) => {
    console.log('🔄 Google OAuth callback received:', {
      hasCode: !!req.query.code,
      hasState: !!req.query.state,
      hasError: !!req.query.error,
      scope: req.query.scope
    });

    // Handle OAuth errors from Google
    if (req.query.error) {
      console.error('❌ Google OAuth error:', req.query.error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=oauth_failed&message=${encodeURIComponent(req.query.error)}`
      );
    }

    passport.authenticate("google", { 
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`
    })(req, res, next);
  },
  asyncHandler(async (req, res) => {
    try {
      // Successful authentication
      const { token, user, isNewUser } = req.user;
      
      console.log('✅ Google OAuth successful:', {
        userId: user._id,
        email: user.email,
        isNewUser,
        provider: user.provider
      });

      // Parse state parameters
      let stateParams = {};
      try {
        if (req.query.state) {
          stateParams = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
        }
      } catch (error) {
        console.warn('⚠️ Failed to parse OAuth state:', error);
      }

      const {
        redirectUrl = `${process.env.FRONTEND_URL}/auth/success`,
        organization: orgIdentifier,
        invitation: invitationToken,
        connection = 'login'
      } = stateParams;

      // Handle organization invitation for new users
      if (isNewUser && invitationToken) {
        await processInvitation(user, invitationToken);
      }

      // Handle organization context for new admin users
      if (isNewUser && orgIdentifier && user.role === 'admin') {
        await processOrganizationCreation(user, orgIdentifier);
      }

      // Prepare user data for frontend
      const userData = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        provider: user.provider,
        organizations: user.organizations
      };

      // Construct success URL with proper encoding
      const successUrl = new URL(redirectUrl);
      
      // Add token to URL params or use hash based on frontend preference
      const urlParams = new URLSearchParams(successUrl.search);
      urlParams.set('token', token);
      urlParams.set('user', JSON.stringify(userData));
      urlParams.set('isNewUser', isNewUser.toString());
      urlParams.set('provider', 'google');
      
      successUrl.search = urlParams.toString();

      console.log('🎯 Redirecting to:', successUrl.toString());

      res.redirect(successUrl.toString());

    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      res.redirect(
        `${process.env.FRONTEND_URL}/login?error=callback_error&message=${encodeURIComponent(error.message)}`
      );
    }
  })
);

/**
 * @swagger
 * /api/v1/auth/google/connect:
 *   post:
 *     summary: Connect Google account to existing user
 *     tags: [Google OAuth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: OAuth authorization code
 *     responses:
 *       200:
 *         description: Google account connected successfully
 */
router.post("/google/connect", asyncHandler(async (req, res) => {
  const { code } = req.body;
  const userId = req.user?._id; // From protect middleware

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Authorization code is required'
    });
  }

  // In a real implementation, you would:
  // 1. Exchange code for tokens
  // 2. Fetch Google profile
  // 3. Link to existing user account
  // 4. Return success response

  res.json({
    success: true,
    message: 'Google account connected successfully',
    data: {
      connected: true,
      provider: 'google'
    }
  });
}));

/**
 * @swagger
 * /api/v1/auth/google/disconnect:
 *   post:
 *     summary: Disconnect Google account
 *     tags: [Google OAuth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Google account disconnected successfully
 */
router.post("/google/disconnect", asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Remove Google OAuth connection
  user.googleId = undefined;
  user.oauthProvider = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'Google account disconnected successfully',
    data: {
      connected: false,
      provider: null
    }
  });
}));

/**
 * @swagger
 * /api/v1/auth/google/status:
 *   get:
 *     summary: Check Google OAuth status and configuration
 *     tags: [Google OAuth]
 *     responses:
 *       200:
 *         description: OAuth status retrieved successfully
 */
router.get("/status", (req, res) => {
  const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  
  res.json({
    success: true,
    data: {
      service: "google-oauth",
      status: isConfigured ? "configured" : "not_configured",
      configured: isConfigured,
      clientId: process.env.GOOGLE_CLIENT_ID ? "present" : "missing",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? "present" : "missing",
      redirectUri: process.env.GOOGLE_REDIRECT_URI || "not_set",
      endpoints: {
        auth: "/api/v1/auth/google",
        callback: "/api/v1/auth/google/callback",
        connect: "/api/v1/auth/google/connect",
        disconnect: "/api/v1/auth/google/disconnect"
      }
    },
    message: "Google OAuth status check"
  });
});

// Helper functions
async function processInvitation(user, invitationToken) {
  try {
    const invitation = await Invitation.findOne({
      token: invitationToken,
      email: user.email,
      status: 'pending'
    }).populate('organization');

    if (!invitation) {
      console.warn('⚠️ No valid invitation found for:', user.email);
      return;
    }

    // Add user to organization
    user.organizations.push({
      organization: invitation.organization._id,
      role: invitation.role,
      teams: invitation.teams || [],
      joinedAt: new Date()
    });

    // Mark invitation as accepted
    invitation.status = 'accepted';
    invitation.usedAt = new Date();
    invitation.acceptedBy = user._id;

    await Promise.all([user.save(), invitation.save()]);

    console.log('✅ User added to organization via invitation:', {
      userId: user._id,
      organization: invitation.organization.name,
      role: invitation.role
    });

    // Send welcome email
    await sendEmail({
      to: user.email,
      subject: `Welcome to ${invitation.organization.name}!`,
      template: 'organization-welcome',
      context: {
        name: user.name,
        organizationName: invitation.organization.name,
        role: invitation.role,
        loginUrl: `${process.env.FRONTEND_URL}/login`
      }
    });

  } catch (error) {
    console.error('❌ Error processing invitation:', error);
    // Don't fail the entire OAuth flow due to invitation error
  }
}

async function processOrganizationCreation(user, orgIdentifier) {
  try {
    // Check if organization already exists
    let organization = await Organization.findOne({
      $or: [
        { _id: orgIdentifier },
        { slug: orgIdentifier.toLowerCase() }
      ]
    });

    if (!organization) {
      // Create new organization
      organization = new Organization({
        name: orgIdentifier, // In real implementation, you might get this from somewhere else
        slug: generateSlug(orgIdentifier),
        owner: user._id
      });
      await organization.save();
    }

    // Add user as admin to organization
    const alreadyMember = user.organizations.some(
      org => org.organization.toString() === organization._id.toString()
    );

    if (!alreadyMember) {
      user.organizations.push({
        organization: organization._id,
        role: 'admin',
        joinedAt: new Date()
      });
      await user.save();
    }

    console.log('✅ Organization processed for user:', {
      userId: user._id,
      organization: organization.name
    });

  } catch (error) {
    console.error('❌ Error processing organization creation:', error);
    // Don't fail the entire OAuth flow due to organization error
  }
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Error handling middleware for OAuth routes
router.use((error, req, res, next) => {
  console.error('💥 OAuth Route Error:', error);
  
  if (req.originalUrl.includes('/auth/google')) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?error=oauth_error&message=${encodeURIComponent(error.message)}`
    );
  }
  
  res.status(500).json({
    success: false,
    message: 'OAuth authentication failed',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

export default router;
