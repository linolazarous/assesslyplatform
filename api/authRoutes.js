// assesslyplatform/api/authRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config();

const router = express.Router();

// ✅ Apply cookie parser middleware
router.use(cookieParser());

/**
 * 🔄 Refresh Access Token Endpoint
 * Route: GET /api/auth/refresh
 * Purpose: Verify existing refresh token (in cookie) and issue new short-lived access token.
 */
router.get("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      console.warn("⚠️ No refresh token found in cookies");
      return res.status(401).json({ error: "No refresh token provided" });
    }

    // 🔐 Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // ✅ Issue new access token (short lifespan)
    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        orgs: decoded.orgs || {},
        permissions: decoded.permissions || [],
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // ✅ (Optional) Issue a new refresh token as well
    const newRefreshToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // 🍪 Securely store refresh token in HTTP-only cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log(`✅ Token refreshed successfully for user: ${decoded.email}`);

    // Return new access token to frontend
    res.json({
      token: newAccessToken,
      message: "Access token refreshed successfully",
    });
  } catch (error) {
    console.error("❌ Token refresh failed:", error.message);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

export default router;
