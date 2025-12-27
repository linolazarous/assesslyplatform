// config/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as JwtStrategy } from "passport-jwt";
import { ExtractJwt } from "passport-jwt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import Organization from "../models/Organization.js";

dotenv.config();

// Configuration validation
class PassportConfig {
  constructor() {
    this.requiredEnvVars = {
      jwt: ['JWT_SECRET', 'JWT_REFRESH_SECRET'],
      google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'],
      frontend: ['FRONTEND_URL']
    };
    
    this.validateConfiguration();
    this.setupStrategies();
  }

  /**
   * Validate all required environment variables
   */
  validateConfiguration() {
    const errors = [];

    // Check JWT configuration
    const missingJwt = this.requiredEnvVars.jwt.filter(envVar => !process.env[envVar]);
    if (missingJwt.length > 0) {
      errors.push(`JWT configuration missing: ${missingJwt.join(', ')}`);
    }

    // Check Google OAuth (optional but recommended)
    const missingGoogle = this.requiredEnvVars.google.filter(envVar => !process.env[envVar]);
    if (missingGoogle.length > 0) {
      console.warn('⚠️  Google OAuth disabled - missing:', missingGoogle.join(', '));
    }

    // Check frontend URL
    if (!process.env.FRONTEND_URL) {
      errors.push('FRONTEND_URL is required for OAuth callbacks');
    }

    if (errors.length > 0 && process.env.NODE_ENV === 'production') {
      throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }

    console.log('✅ Passport configuration validated');
  }

  /**
   * Generate JWT tokens for user
   */
  issueTokens(user) {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets not configured');
    }

    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      organization: user.organization
    };

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        issuer: 'assessly-platform',
        audience: 'assessly-users'
      }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { 
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: 'assessly-platform',
        audience: 'assessly-users'
      }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token, secret) {
    try {
      return jwt.verify(token, secret, {
        issuer: 'assessly-platform',
        audience: 'assessly-users'
      });
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Setup JWT Strategy for API authentication
   */
  setupJwtStrategy() {
    const jwtOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token')
      ]),
      secretOrKey: process.env.JWT_SECRET,
      issuer: 'assessly-platform',
      audience: 'assessly-users',
      passReqToCallback: true
    };

    passport.use('jwt', new JwtStrategy(jwtOptions, async (req, payload, done) => {
      try {
        // Check if token is blacklisted (for logout functionality)
        if (req.redisClient) {
          const isBlacklisted = await req.redisClient.get(`blacklist:${payload.id}`);
          if (isBlacklisted) {
            return done(null, false, { message: 'Token revoked' });
          }
        }

        const user = await User.findById(payload.id)
          .select('-password')
          .populate('organization', 'name slug settings');

        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        if (!user.isActive) {
          return done(null, false, { message: 'Account deactivated' });
        }

        // Update last activity
        user.lastActive = new Date();
        await user.save();

        return done(null, user);
      } catch (error) {
        console.error('❌ JWT Strategy Error:', error);
        return done(error, false);
      }
    }));

    console.log('✅ JWT strategy initialized');
  }

  /**
   * Setup Google OAuth Strategy
   */
  setupGoogleStrategy() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn('⚠️  Google OAuth strategy skipped - missing configuration');
      return;
    }

    const googleOptions = {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
      state: true, // CSRF protection
      passReqToCallback: true
    };

    passport.use('google', new GoogleStrategy(googleOptions, async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔐 Google OAuth profile received:', {
          id: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value
        });

        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('Google account email not available'), null);
        }

        // Check for existing user by Google ID or email
        let user = await User.findOne({
          $or: [
            { googleId: profile.id },
            { email: email.toLowerCase() }
          ]
        }).populate('organization', 'name slug settings');

        if (user) {
          // Update existing user
          if (!user.googleId) {
            user.googleId = profile.id;
            user.isEmailVerified = true;
            console.log('✅ Existing user linked with Google OAuth:', user._id);
          }

          user.avatar = profile.photos?.[0]?.value || user.avatar;
          user.lastLogin = new Date();
          user.loginCount = (user.loginCount || 0) + 1;

          await user.save();
          console.log('✅ Existing user authenticated via Google OAuth:', user._id);
        } else {
          // Create new user with default organization
          user = await this.createUserWithOrganization({
            googleId: profile.id,
            name: profile.displayName,
            email: email.toLowerCase(),
            avatar: profile.photos?.[0]?.value,
            provider: 'google',
            isEmailVerified: true
          });
          console.log('✅ New user created via Google OAuth:', user._id);
        }

        // Generate tokens
        const tokens = this.issueTokens(user);
        
        return done(null, {
          user: user.toJSON(),
          tokens,
          isNewUser: !user.lastLogin // First time login
        });
      } catch (error) {
        console.error('❌ Google OAuth Error:', error);
        return done(error, null);
      }
    }));

    console.log('✅ Google OAuth strategy initialized');
  }

  /**
   * Create new user with default organization
   */
  async createUserWithOrganization(userData) {
    const session = await User.startSession();
    
    try {
      session.startTransaction();

      // Create organization for the user
      const organization = await Organization.create([{
        name: `${userData.name}'s Organization`,
        slug: await this.generateOrganizationSlug(userData.name),
        owner: null, // Will be set after user creation
        settings: {
          isPublic: false,
          allowSelfRegistration: true,
          requireApproval: false,
          allowGoogleOAuth: true,
          allowEmailPassword: true
        },
        subscription: {
          plan: 'free',
          status: 'active'
        }
      }], { session });

      // Create user
      const user = await User.create([{
        ...userData,
        organization: organization[0]._id,
        role: 'org_admin', // First user becomes organization admin
        isActive: true
      }], { session });

      // Set organization owner
      organization[0].owner = user[0]._id;
      organization[0].members.push({
        user: user[0]._id,
        role: 'org_admin',
        joinedAt: new Date()
      });
      await organization[0].save({ session });

      await session.commitTransaction();

      // Populate organization data
      await user[0].populate('organization', 'name slug settings');
      return user[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Generate unique organization slug
   */
  async generateOrganizationSlug(name) {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await Organization.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Setup all authentication strategies
   */
  setupStrategies() {
    this.setupJwtStrategy();
    this.setupGoogleStrategy();

    // Serialization
    passport.serializeUser((user, done) => {
      done(null, user._id || user.id);
    });

    passport.deserializeUser(async (id, done) => {
      try {
        const user = await User.findById(id)
          .select('-password')
          .populate('organization', 'name slug settings');
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });

    console.log('✅ All Passport strategies initialized');
  }

  /**
   * Middleware to require JWT authentication
   */
  requireAuth = passport.authenticate('jwt', { 
    session: false,
    failWithError: true 
  });

  /**
   * Middleware to require specific roles
   */
  requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRoles = Array.isArray(roles) ? roles : [roles];
      if (!userRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  /**
   * Middleware to require organization membership
   */
  requireOrganizationAccess = (req, res, next) => {
    if (!req.user || !req.user.organization) {
      return res.status(403).json({
        success: false,
        message: 'Organization access required'
      });
    }

    // Check if user has access to the requested organization
    const requestedOrgId = req.params.orgId || req.body.organization;
    if (requestedOrgId && requestedOrgId !== req.user.organization._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access to this organization is denied'
      });
    }

    next();
  };
}

// Create and export configured instance
const passportConfig = new PassportConfig();

// Export utilities and middleware
export const { issueTokens, verifyToken, requireAuth, requireRole, requireOrganizationAccess } = passportConfig;

export default passport;
