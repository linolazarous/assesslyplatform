// api/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import User from "../models/User.js";
import { protect, verifyRefreshToken } from "../middleware/authMiddleware.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret-key";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "your-fallback-refresh-secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

// ✅ Rate limiter for brute force protection
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again later.",
});

/**
 * Generate Access and Refresh Tokens
 */
const generateTokens = (user) => {
  const payload = { userId: user._id, role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
};

/**
 * ✅ REGISTER
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "user" } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email, and password required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed, role, isVerified: true }); // toggle verification later

    const { accessToken, refreshToken } = generateTokens(user);
    res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ✅ LOGIN
 */
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const { accessToken, refreshToken } = generateTokens(user);
    res.json({
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ✅ TOKEN REFRESH
 */
router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: "Refresh token required" });

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded)
    return res.status(401).json({ message: "Invalid or expired refresh token" });

  const user = await User.findById(decoded.userId);
  if (!user) return res.status(401).json({ message: "User not found" });

  const { accessToken, refreshToken: newRefresh } = generateTokens(user);
  res.json({ accessToken, refreshToken: newRefresh });
});

/**
 * ✅ GET PROFILE (Protected)
 */
router.get("/profile", protect, async (req, res) => {
  res.json({ user: req.user });
});

/**
 * ✅ LOGOUT
 */
router.post("/logout", (req, res) => {
  res.json({ message: "Logout successful" });
});

/**
 * ✅ PASSWORD RESET (Email placeholder)
 */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  console.log(`🔗 Password reset link: ${resetLink}`);
  // TODO: Send email here
  res.json({ message: "Password reset link sent to email" });
});
export default router;
