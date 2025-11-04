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
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication
    const { token, user } = req.user;

    // Redirect to frontend with token in URL
    const redirectUrl = `${process.env.FRONTEND_URL}/auth-success?token=${token}&name=${encodeURIComponent(
      user.name
    )}`;
    res.redirect(redirectUrl);
  }
);

export default router;
