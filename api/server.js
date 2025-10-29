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

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// ==============================
// Fix: Trust proxy for rate limiting
// ==============================
app.set('trust proxy', 1);

// Initialize Stripe with fallback
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

// ==============================
// 1. Database Connection with better error handling
// ==============================
const connectDB = async () => {
  try {
    // Check if MONGODB_URI is available
    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI is not defined in environment variables');
      console.log('💡 Please set MONGODB_URI in your Render environment variables');
      // Don't exit - allow server to start without DB for now
      return;
    }

    console.log('🔗 Attempting to connect to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('⚠️ Continuing without database connection');
    // Don't exit - allow server to start without DB
  }
};

// Connect to database
connectDB();

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
// 3. Rate Limiting (Fixed for proxy)
// ==============================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many authentication attempts.",
    code: "AUTH_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
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
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Assessly backend running 🚀",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    mongodb_uri_configured: !!process.env.MONGODB_URI
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Assessly Platform API",
    version: "1.0.0",
    status: "Running",
    timestamp: new Date().toISOString()
  });
});

// Debug route to check environment variables
app.get("/api/debug", (req, res) => {
  res.json({
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    has_mongodb_uri: !!process.env.MONGODB_URI,
    has_jwt_secret: !!process.env.JWT_SECRET,
    has_stripe_key: !!process.env.STRIPE_SECRET_KEY,
    allowed_origins: process.env.ALLOWED_ORIGINS
  });
});

// ==============================
// 6. Authentication Routes (Simplified)
// ==============================
app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: "Name, email, and password are required",
        code: "MISSING_FIELDS"
      });
    }

    // For now, just return success without saving to database
    const token = jwt.sign(
      { userId: "temp", email: email.toLowerCase(), role: 'user' },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: { id: "temp", name, email: email.toLowerCase(), role: 'user' }
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error", code: "REGISTRATION_FAILED" });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required", code: "MISSING_CREDENTIALS"
      });
    }

    // For now, accept any login
    const token = jwt.sign(
      { userId: "temp", email: email.toLowerCase(), role: 'user' },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: '7d' }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: "temp", name: "Test User", email: email.toLowerCase(), role: 'user' }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error", code: "LOGIN_FAILED" });
  }
});

// Subscription plans
app.get("/api/subscriptions/plans", (req, res) => {
  res.json({ plans: SUBSCRIPTION_PLANS, code: "PLANS_RETRIEVED" });
});

// ==============================
// Error Handling
// ==============================
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found", code: "ENDPOINT_NOT_FOUND" });
});

app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({ error: "Internal server error", code: "INTERNAL_SERVER_ERROR" });
});

// ==============================
// Server Startup
// ==============================
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`
🚀 Assessly Backend Server Started
📍 Port: ${port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Health: https://assesslyplatform.onrender.com/api/health
🔍 Debug: https://assesslyplatform.onrender.com/api/debug
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
