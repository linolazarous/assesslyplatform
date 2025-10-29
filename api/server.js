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
import cookieParser from "cookie-parser";
import Stripe from "stripe";

// Load environment variables FIRST
dotenv.config();

// Database connection
import connectDB from "./db.js";

// Models
import User from "./models/User.js";
import Organization from "./models/Organization.js";
import Assessment from "./models/Assessment.js";
import AssessmentResponse from "./models/AssessmentResponse.js";
import UserActivity from "./models/UserActivity.js";

// Middleware
import { 
  authenticateToken, 
  requireAdmin, 
  securityHeaders,
  invalidateToken 
} from "./middleware/auth.js";

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize Stripe
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// ==============================
// 1. Database Connection
// ==============================
connectDB().then(() => {
  console.log('✅ Database connection established');
}).catch((error) => {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
});

// ==============================
// 2. Middleware Configuration
// ==============================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [
      "http://localhost:5173",
      "http://localhost:3000", 
      "https://assessly-frontend.onrender.com",
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("⚠️ CORS Blocked:", origin);
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(morgan(isProduction ? "combined" : "dev"));

// ==============================
// 3. Rate Limiting
// ==============================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many authentication attempts.",
    code: "AUTH_RATE_LIMIT_EXCEEDED"
  }
});

app.use("/api/", generalLimiter);
app.use("/api/auth/", authLimiter);

// ==============================
// 4. Subscription Plans Configuration
// ==============================
const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    price: 0,
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: [
      'Up to 10 assessments',
      'Basic analytics',
      'Email support',
      '1 organization'
    ],
    limits: { assessments: 10, users: 5 }
  },
  professional: {
    name: 'Professional', 
    price: 50,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    features: [
      'Unlimited assessments',
      'Advanced analytics',
      'Priority support',
      'Multiple organizations'
    ],
    limits: { assessments: -1, users: 50 }
  },
  enterprise: {
    name: 'Enterprise',
    price: 100,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom integrations'
    ],
    limits: { assessments: -1, users: -1 }
  }
};

// ==============================
// 5. API Routes
// ==============================

// Health check
app.get("/api/health", securityHeaders, (req, res) => {
  res.json({
    status: "OK",
    message: "Assessly backend running 🚀",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

// ==============================
// 6. Authentication Routes
// ==============================
app.post("/api/auth/register", authLimiter, securityHeaders, async (req, res) => {
  try {
    const { name, email, password, role = 'candidate' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: "Name, email, and password are required",
        code: "MISSING_FIELDS"
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        error: "User already exists with this email",
        code: "USER_EXISTS"
      });
    }

    const user = new User({ name, email: email.toLowerCase(), password, role });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error("Registration error:", error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: "Validation failed", details: errors, code: "VALIDATION_ERROR"
      });
    }
    res.status(500).json({ error: "Internal server error", code: "REGISTRATION_FAILED" });
  }
});

// Add other routes here (login, organizations, assessments, etc.)
// ... (keep your existing routes as they were)

// Simple test route
app.get("/", (req, res) => {
  res.json({ 
    message: "Assessly API is running!",
    timestamp: new Date().toISOString()
  });
});

// ==============================
// Error Handling
// ==============================
app.use("/api/*", securityHeaders, (req, res) => {
  res.status(404).json({ error: "API endpoint not found", code: "ENDPOINT_NOT_FOUND" });
});

app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({ error: "Validation failed", details: errors, code: "VALIDATION_ERROR" });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: "Duplicate entry found", code: "DUPLICATE_ENTRY" });
  }

  const statusCode = err.statusCode || 500;
  const message = isProduction && statusCode === 500 ? "Internal server error" : err.message;

  res.status(statusCode).json({ error: message, code: "INTERNAL_SERVER_ERROR" });
});

// ==============================
// Server Startup
// ==============================
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`
🚀 Assessly Backend Server Started
📍 Port: ${port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Health: http://localhost:${port}/api/health
  `);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

export default app;
