// api/routes/google.js
import express from "express";
import passport from "passport";

const router = express.Router();

// Step 1: Redirect user to Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Step 2: Google redirects back to our callback URL
router.get(
  "/google/callback",
  passport.authenticate("google", { 
    session: false, 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`
  }),
  (req, res) => {
    // Successful authentication
    const { token, user } = req.user;

    // Validate response structure aligns with API documentation
    if (!token || !user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_auth_response`);
    }

    // Construct redirect URL with proper encoding
    const queryParams = new URLSearchParams({
      token: token,
      name: encodeURIComponent(user.name || ''),
      email: encodeURIComponent(user.email || ''),
      success: 'true'
    });

    const redirectUrl = `${process.env.FRONTEND_URL}/auth-success?${queryParams.toString()}`;
    res.redirect(redirectUrl);
  }
);

// Optional: Add token validation endpoint that matches API structure
router.get("/validate", (req, res) => {
  // This would typically validate against the Assessly API
  res.json({
    success: true,
    message: "Google OAuth endpoint is active",
    data: {
      service: "google-oauth",
      status: "operational"
    }
  });
});

export default router;
