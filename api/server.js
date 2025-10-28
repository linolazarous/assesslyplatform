// api/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import compression from "compression";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Database and Models
import { connectDB } from "./db.js";
import { 
  authenticateToken, 
  requireRole, 
  requireAdmin, 
  requireAssessor,
  securityHeaders,
  invalidateToken 
} from "./middleware/auth.js";
import User from "./models/User.js";
import Organization from "./models/Organization.js";
import Assessment from "./models/Assessment.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// ==============================
// 1. Database Connection
// ==============================
connectDB().catch(console.error);

// ==============================
// 2. Security Middleware
// ==============================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// ==============================
// 3. CORS Configuration
// ==============================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://assessly-frontend.onrender.com",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("⚠️ CORS Blocked:", origin);
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ==============================
// 4. Performance & Logging Middleware
// ==============================
app.use(compression());
app.use(express.json({ 
  limit: "10mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: "10mb"
}));

// Conditional logging - more verbose in development
app.use(morgan(isProduction ? "combined" : "dev"));

// ==============================
// 5. Rate Limiting
// ==============================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // stricter limit for auth endpoints
  message: {
    error: "Too many authentication attempts, please try again later.",
    code: "AUTH_RATE_LIMIT_EXCEEDED"
  }
});

// Apply rate limiting
app.use("/api/", generalLimiter);
app.use("/api/auth/", authLimiter);

// ==============================
// 6. API Routes
// ==============================

// Health check with detailed system info
app.get("/api/health", securityHeaders, (req, res) => {
  const healthCheck = {
    status: "OK",
    message: "Assessly backend running 🚀",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || "1.0.0"
  };

  // Add database connection details in development
  if (!isProduction) {
    healthCheck.databaseDetails = {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      readyState: mongoose.connection.readyState
    };
  }

  res.status(200).json(healthCheck);
});

// ==============================
// 7. Authentication Routes
// ==============================
app.post("/api/auth/register", authLimiter, securityHeaders, async (req, res) => {
  try {
    const { name, email, password, role = 'candidate' } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: "Name, email, and password are required",
        code: "MISSING_FIELDS"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: "Password must be at least 6 characters",
        code: "PASSWORD_TOO_SHORT"
      });
    }

    // Validate role
    const allowedRoles = ['admin', 'assessor', 'candidate'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ 
        error: "Invalid role specified",
        code: "INVALID_ROLE"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        error: "User already exists with this email",
        code: "USER_EXISTS"
      });
    }

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error("Registration error:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: "Validation failed",
        details: errors,
        code: "VALIDATION_ERROR"
      });
    }

    res.status(500).json({ 
      error: "Internal server error during registration",
      code: "REGISTRATION_FAILED"
    });
  }
});

app.post("/api/auth/login", authLimiter, securityHeaders, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required",
        code: "MISSING_CREDENTIALS"
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: "Account is deactivated. Please contact support.",
        code: "ACCOUNT_DEACTIVATED"
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
        lastLogin: user.lastLogin,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      error: "Internal server error during login",
      code: "LOGIN_FAILED"
    });
  }
});

// Logout endpoint
app.post("/api/auth/logout", authenticateToken, securityHeaders, (req, res) => {
  try {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (token) {
      invalidateToken(token);
    }
    
    res.json({ 
      message: "Logged out successfully",
      code: "LOGOUT_SUCCESS"
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ 
      error: "Error during logout",
      code: "LOGOUT_FAILED"
    });
  }
});

// ==============================
// 8. Protected Routes
// ==============================

// User profile
app.get("/api/user/profile", authenticateToken, securityHeaders, (req, res) => {
  res.json({
    user: req.user,
    code: "PROFILE_RETRIEVED"
  });
});

// Update user profile
app.patch("/api/user/profile", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { name, profile } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (profile) updates.profile = { ...req.user.profile, ...profile };

    const user = await User.findByIdAndUpdate(
      req.user.userId, 
      updates, 
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: "Profile updated successfully",
      user,
      code: "PROFILE_UPDATED"
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ 
      error: "Failed to update profile",
      code: "PROFILE_UPDATE_FAILED"
    });
  }
});

// Admin routes
app.get("/api/admin/users", authenticateToken, requireAdmin, securityHeaders, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      code: "USERS_RETRIEVED"
    });
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ 
      error: "Failed to retrieve users",
      code: "USERS_RETRIEVAL_FAILED"
    });
  }
});

// Organization routes
app.get("/api/organizations", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const organizations = await Organization.find()
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      organizations,
      code: "ORGANIZATIONS_RETRIEVED"
    });
  } catch (error) {
    console.error("Organizations error:", error);
    res.status(500).json({ 
      error: "Failed to retrieve organizations",
      code: "ORGANIZATIONS_RETRIEVAL_FAILED"
    });
  }
});

// Assessment routes (basic)
app.get("/api/assessments", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const assessments = await Assessment.find()
      .populate('createdBy', 'name email')
      .populate('organization', 'name')
      .sort({ createdAt: -1 });

    res.json({
      assessments,
      code: "ASSESSMENTS_RETRIEVED"
    });
  } catch (error) {
    console.error("Assessments error:", error);
    res.status(500).json({ 
      error: "Failed to retrieve assessments",
      code: "ASSESSMENTS_RETRIEVAL_FAILED"
    });
  }
});

// ==============================
// 9. 404 Handler for unknown API routes
// ==============================
app.use("/api/*", securityHeaders, (req, res) => {
  res.status(404).json({ 
    error: "API endpoint not found",
    code: "ENDPOINT_NOT_FOUND",
    path: req.originalUrl
  });
});

// ==============================
// 10. Global Error Handler
// ==============================
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      error: "Validation failed",
      details: errors,
      code: "VALIDATION_ERROR"
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      error: `${field} already exists`,
      code: "DUPLICATE_ENTRY"
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: "Invalid token",
      code: "INVALID_TOKEN"
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: "Token expired",
      code: "TOKEN_EXPIRED"
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = isProduction && statusCode === 500 
    ? "Internal server error" 
    : err.message;

  res.status(statusCode).json({
    error: message,
    code: "INTERNAL_SERVER_ERROR",
    ...(!isProduction && { stack: err.stack })
  });
});

// ==============================
// 11. Graceful Shutdown
// ==============================
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️ Received ${signal}. Closing server gracefully...`);
  
  server.close(() => {
    console.log("✅ HTTP server closed.");
    mongoose.connection.close(false, () => {
      console.log("✅ MongoDB connection closed.");
      process.exit(0);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error("❌ Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==============================
// 12. Start Server
// ==============================
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`
🚀 Assessly Backend Server Started
📍 Port: ${port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Health: http://localhost:${port}/api/health
🕒 Started: ${new Date().toISOString()}
  `);
});

export default app;
