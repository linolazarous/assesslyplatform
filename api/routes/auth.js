// api/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// =======================
// CONFIGURATION
// =======================
const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret";
const JWT_EXPIRES_IN = "7d";

// =======================
// UTILITY FUNCTIONS
// =======================

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Centralized error response
const sendError = (res, code, message) => {
  return res.status(code).json({ success: false, message });
};

// =======================
// ROUTES
// =======================

// ✅ LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return sendError(res, 400, "Email and password are required.");

    let user = await User.findOne({ email }).select("+password");

    // Auto-create default admin if no users exist
    if (!user) {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        const hashedPassword = await bcrypt.hash("admin123", 12);
        user = await User.create({
          name: "Admin User",
          email: "admin@assessly.com",
          password: hashedPassword,
          role: "admin",
        });
      } else {
        return sendError(res, 401, "Invalid email or password.");
      }
    }

    // Check password validity
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return sendError(res, 401, "Invalid email or password.");

    // Generate token
    const token = generateToken(user);

    // Update login metadata
    user.lastLogin = new Date();
    user.lastActivity = new Date();
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("🔥 Login error:", error);
    sendError(res, 500, "Server error during login.");
  }
});

// ✅ REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "candidate" } = req.body;

    if (!name || !email || !password)
      return sendError(res, 400, "Name, email, and password are required.");

    if (password.length < 8)
      return sendError(res, 400, "Password must be at least 8 characters long.");

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return sendError(res, 409, "An account with this email already exists.");

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("🔥 Registration error:", error);
    sendError(res, 500, "Server error during registration.");
  }
});

// ✅ PROFILE (Protected route example)
router.get("/profile", async (req, res) => {
  try {
    // For production, use auth middleware to decode JWT
    return res.json({
      success: true,
      message: "Profile endpoint - authentication required.",
    });
  } catch (error) {
    console.error("🔥 Profile error:", error);
    sendError(res, 500, "Server error retrieving profile.");
  }
});

// =======================
// HEALTH CHECK ROUTE
// =======================
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes active.",
    availableEndpoints: [
      { method: "POST", path: "/api/auth/login" },
      { method: "POST", path: "/api/auth/register" },
      { method: "GET", path: "/api/auth/profile" },
    ],
  });
});

export default router;
