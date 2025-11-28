// api/routes/auth/google.js
import express from "express";
import passport from "passport";

const router = express.Router();

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth flow
 * @access  Public
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback handler
 * @access  Public
 */
router.get(
  "/google/callback",
  passport.authenticate("google", { 
    failureRedirect: `${process.env.FRONTEND_URL}/auth/failure`,
    session: false 
  }),
  (req, res) => {
    try {
      // Successful authentication
      const user = req.user;
      
      // Generate JWT token (assuming your user model has generateAuthToken method)
      const token = user.generateAuthToken?.() || user.token;
      
      // Redirect to frontend with token
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/success?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }))}`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Authentication failed`);
    }
  }
);

/**
 * @route   POST /api/auth/google/token
 * @desc    Google OAuth for mobile apps or token-based flow
 * @access  Public
 */
router.post("/google/token", async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required",
      });
    }

    // This would use your existing Passport Google strategy
    // or a custom verification logic
    passport.authenticate("google-token", { session: false }, (err, user, info) => {
      if (err || !user) {
        return res.status(401).json({
          success: false,
          message: "Google authentication failed",
          error: info?.message || err?.message,
        });
      }

      // Generate JWT token
      const token = user.generateAuthToken?.() || user.token;

      res.status(200).json({
        success: true,
        message: "Google authentication successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          isVerified: user.isVerified,
        },
      });
    })(req, res);

  } catch (error) {
    console.error("Google token authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/auth/google/success
 * @desc    Check if Google OAuth is properly configured
 * @access  Public
 */
router.get("/google/status", (req, res) => {
  const hasGoogleConfig = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
  
  res.status(200).json({
    success: true,
    googleOAuth: {
      configured: hasGoogleConfig,
      clientId: process.env.GOOGLE_CLIENT_ID ? "✓ Configured" : "✗ Missing",
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || "Not set",
    },
  });
});

export default router;
