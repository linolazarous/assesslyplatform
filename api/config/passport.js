// config/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID', 
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'FRONTEND_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
}

// Helper to generate JWT
const issueJWT = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// --- Google Strategy ---
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('🔐 Google OAuth profile received:', {
            id: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value
          });

          // Find existing user by Google ID or email
          let user = await User.findOne({ 
            $or: [
              { googleId: profile.id },
              { email: profile.emails?.[0]?.value }
            ]
          });

          if (!user) {
            // Create new user
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails?.[0]?.value || null,
              avatar: profile.photos?.[0]?.value || null,
              provider: "google",
              role: "candidate", // Default role for OAuth users
              isEmailVerified: true // Google verified emails are trusted
            });
            console.log('✅ New user created via Google OAuth:', user._id);
          } else {
            // Update existing user with Google ID if not set
            if (!user.googleId) {
              user.googleId = profile.id;
              user.avatar = profile.photos?.[0]?.value || user.avatar;
              await user.save();
              console.log('✅ Existing user linked with Google OAuth:', user._id);
            }
            console.log('✅ Existing user logged in via Google OAuth:', user._id);
          }

          const token = issueJWT(user);
          return done(null, { user, token });
        } catch (err) {
          console.error("❌ Google OAuth Error:", err);
          return done(err, null);
        }
      }
    )
  );
  console.log('✅ Google OAuth strategy initialized');
} else {
  console.warn('⚠️ Google OAuth disabled - missing client ID or secret');
}

// Serialization for session management (if needed)
passport.serializeUser((data, done) => {
  done(null, data);
});

passport.deserializeUser((data, done) => {
  done(null, data);
});

console.log('✅ Passport configuration completed');

export default passport;
