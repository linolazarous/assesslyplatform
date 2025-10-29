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
import connectDB from "./db.js";
import { 
  authenticateToken, 
  requireAdmin, 
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
connectDB();

// ==============================
// 2. CORS Configuration (Updated with environment variable)
// ==============================
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [
      "http://localhost:5173",
      "http://localhost:3000", 
      "https://assessly-frontend.onrender.com",
    ];

console.log(`🌐 Allowed CORS origins: ${allowedOrigins.join(', ')}`);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("⚠️ CORS Blocked:", origin);
      callback(new Error(`Not allowed by CORS. Allowed origins: ${allowedOrigins.join(', ')}`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ==============================
// 3. Security Middleware
// ==============================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// ==============================
// 4. Performance & Logging Middleware
// ==============================
app.use(compression());
app.use(express.json({ 
  limit: "10mb"
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: "10mb"
}));

// Logging
app.use(morgan(isProduction ? "combined" : "dev"));

// ==============================
// 5. Rate Limiting
// ==============================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests from this IP, please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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

// Health check
app.get("/api/health", securityHeaders, (req, res) => {
  const healthCheck = {
    status: "OK",
    message: "Assessly backend running 🚀",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    uptime: process.uptime(),
    version: "1.0.0",
    cors: {
      allowedOrigins: allowedOrigins
    }
  };

  res.status(200).json(healthCheck);
});

// ==============================
// 7. Authentication Routes (Updated JWT config)
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

    // Generate JWT token with environment config
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
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error("Registration error:", error);
    
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

    // Generate JWT token with environment config
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
        lastLogin: user.lastLogin
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

// Admin routes
app.get("/api/admin/users", authenticateToken, requireAdmin, securityHeaders, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({
      users,
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

// Assessment routes
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
// 9. 404 Handler
// ==============================
app.use("/api/*", securityHeaders, (req, res) => {
  res.status(404).json({ 
    error: "API endpoint not found",
    code: "ENDPOINT_NOT_FOUND"
  });
});

// ==============================
// 10. Global Error Handler
// ==============================
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      error: "Validation failed",
      details: errors,
      code: "VALIDATION_ERROR"
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      error: "Duplicate entry found",
      code: "DUPLICATE_ENTRY"
    });
  }

  // CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      error: "CORS policy violation",
      code: "CORS_ERROR"
    });
  }

  const statusCode = err.statusCode || 500;
  const message = isProduction && statusCode === 500 
    ? "Internal server error" 
    : err.message;

  res.status(statusCode).json({
    error: message,
    code: "INTERNAL_SERVER_ERROR"
  });
});

// ==============================
// 11. Start Server
// ==============================
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`
🚀 Assessly Backend Server Started
📍 Port: ${port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Health: http://localhost:${port}/api/health
🔑 JWT Expires In: ${process.env.JWT_EXPIRES_IN || '7d'}
🌐 CORS Origins: ${allowedOrigins.join(', ')}
🕒 Started: ${new Date().toISOString()}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ HTTP server closed');
    mongoose.connection.close();
    process.exit(0);
  });
});

export default app;
