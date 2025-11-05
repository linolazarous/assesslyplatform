// routes/auth/github.js
import express from "express";
import passport from "passport";

const router = express.Router();

// Step 1: Redirect to GitHub login
router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));

// Step 2: GitHub redirects back
router.get(
  "/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: "/login" }),
  (req, res) => {
    const { token, user } = req.user;
    const redirectUrl = `${process.env.FRONTEND_URL}/auth-success?token=${token}&name=${encodeURIComponent(
      user.name
    )}`;
    res.redirect(redirectUrl);
  }
);

export default router;
