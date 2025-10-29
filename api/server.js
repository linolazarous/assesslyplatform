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
import Stripe from "stripe"; // ✅ Correct import

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
import AssessmentResponse from "./models/AssessmentResponse.js";
import UserActivity from "./models/UserActivity.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY); // ✅ Correct initialization

// ==============================
// 1. Database Connection
// ==============================
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

app.post("/api/auth/login", authLimiter, securityHeaders, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required", code: "MISSING_CREDENTIALS"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ 
        error: "Invalid email or password", code: "INVALID_CREDENTIALS"
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error", code: "LOGIN_FAILED" });
  }
});

app.post("/api/auth/logout", authenticateToken, securityHeaders, (req, res) => {
  try {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (token) invalidateToken(token);
    
    res.json({ message: "Logged out successfully", code: "LOGOUT_SUCCESS" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Error during logout", code: "LOGOUT_FAILED" });
  }
});

app.get("/api/auth/refresh", securityHeaders, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ token: newAccessToken, message: "Token refreshed", code: "TOKEN_REFRESHED" });
  } catch (error) {
    console.error("Token refresh failed:", error);
    res.status(401).json({ error: "Invalid refresh token", code: "REFRESH_TOKEN_INVALID" });
  }
});

// ==============================
// 7. User & Organization Routes
// ==============================
app.get("/api/user/profile", authenticateToken, securityHeaders, (req, res) => {
  res.json({ user: req.user, code: "PROFILE_RETRIEVED" });
});

app.get("/api/organizations", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const organizations = await Organization.find({ owner: req.user.userId })
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    res.json({ organizations, code: "ORGANIZATIONS_RETRIEVED" });
  } catch (error) {
    console.error("Organizations error:", error);
    res.status(500).json({ error: "Failed to retrieve organizations", code: "ORGANIZATIONS_RETRIEVAL_FAILED" });
  }
});

app.get("/api/organizations/:orgId", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const organization = await Organization.findOne({ 
      _id: req.params.orgId, 
      owner: req.user.userId 
    }).populate('owner', 'name email');

    if (!organization) {
      return res.status(404).json({ error: "Organization not found", code: "ORGANIZATION_NOT_FOUND" });
    }

    res.json({ organization, code: "ORGANIZATION_RETRIEVED" });
  } catch (error) {
    console.error("Organization fetch error:", error);
    res.status(500).json({ error: "Failed to retrieve organization", code: "ORGANIZATION_RETRIEVAL_FAILED" });
  }
});

// ==============================
// 8. Assessment Routes
// ==============================
app.get("/api/assessments", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const assessments = await Assessment.find({ createdBy: req.user.userId })
      .populate('createdBy', 'name email')
      .populate('organization', 'name')
      .sort({ createdAt: -1 });

    res.json({ assessments, code: "ASSESSMENTS_RETRIEVED" });
  } catch (error) {
    console.error("Assessments error:", error);
    res.status(500).json({ error: "Failed to retrieve assessments", code: "ASSESSMENTS_RETRIEVAL_FAILED" });
  }
});

app.post("/api/assessments/ai-score", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { text, questionId } = req.body;
    if (!text || !questionId) {
      return res.status(400).json({ error: "Text and question ID are required", code: "MISSING_FIELDS" });
    }

    const mockAiScore = (text) => {
      const lengthScore = Math.min(text.length / 150, 1);
      const keywordScore = ["structure", "analysis", "evidence", "conclusion"]
        .filter(kw => text.toLowerCase().includes(kw)).length / 4;
      const totalScore = Math.round((lengthScore * 0.7 + keywordScore * 0.3) * 100);
      
      return {
        score: totalScore,
        feedback: [
          totalScore > 80 ? "Highly detailed and insightful response." : 
          totalScore > 50 ? "Solid content, needs better structural evidence." : 
          "Response is minimal; require more depth."
        ],
        confidence: 0.95
      };
    };

    res.json({ ...mockAiScore(text), code: "AI_SCORE_GENERATED" });
  } catch (error) {
    console.error("AI scoring error:", error);
    res.status(500).json({ error: "Failed to generate AI score", code: "AI_SCORE_FAILED" });
  }
});

// ==============================
// 9. Subscription & Billing Routes
// ==============================
app.get("/api/subscriptions/plans", securityHeaders, (req, res) => {
  res.json({ plans: SUBSCRIPTION_PLANS, code: "PLANS_RETRIEVED" });
});

app.get("/api/subscriptions/current", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const organization = await Organization.findOne({ owner: req.user.userId });
    if (!organization) {
      return res.status(404).json({ error: "Organization not found", code: "ORGANIZATION_NOT_FOUND" });
    }

    const currentPlan = SUBSCRIPTION_PLANS[organization.subscription.plan] || SUBSCRIPTION_PLANS.basic;
    res.json({ subscription: organization.subscription, plan: currentPlan, code: "SUBSCRIPTION_RETRIEVED" });
  } catch (error) {
    console.error("Subscription retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve subscription", code: "SUBSCRIPTION_RETRIEVAL_FAILED" });
  }
});

app.post("/api/billing/checkout-session", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { priceId, plan } = req.body;
    const organization = await Organization.findOne({ owner: req.user.userId });
    
    if (!organization) {
      return res.status(404).json({ error: "Organization not found", code: "ORGANIZATION_NOT_FOUND" });
    }

    if (plan === 'basic') {
      await Organization.findByIdAndUpdate(organization._id, {
        'subscription.plan': 'basic', 'subscription.status': 'active'
      });
      return res.json({ isFree: true, code: "FREE_PLAN_ACTIVATED" });
    }

    let customerId = organization.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeInstance.customers.create({
        email: req.user.email, name: req.user.name,
        metadata: { userId: req.user.userId, organizationId: organization._id.toString() }
      });
      customerId = customer.id;
      await Organization.findByIdAndUpdate(organization._id, {
        'subscription.stripeCustomerId': customerId
      });
    }

    const session = await stripeInstance.checkout.sessions.create({
      customer: customerId, payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/billing/success`,
      cancel_url: `${process.env.CLIENT_URL}/billing`,
      metadata: { userId: req.user.userId, organizationId: organization._id.toString(), plan }
    });

    res.json({ sessionId: session.id, url: session.url, isFree: false, code: "CHECKOUT_SESSION_CREATED" });
  } catch (error) {
    console.error("Checkout session error:", error);
    res.status(500).json({ error: "Failed to create checkout session", code: "CHECKOUT_SESSION_FAILED" });
  }
});

// ==============================
// 10. Admin Routes
// ==============================
app.get("/api/admin/stats", authenticateToken, requireAdmin, securityHeaders, async (req, res) => {
  try {
    const [assessments, users, organizations, completions] = await Promise.all([
      Assessment.countDocuments(),
      User.countDocuments({ isActive: true }),
      Organization.countDocuments(),
      AssessmentResponse.countDocuments({ status: 'completed' })
    ]);

    res.json({ assessments, activeUsers: users, organizations, completions, code: "STATS_RETRIEVED" });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to retrieve admin statistics", code: "STATS_RETRIEVAL_FAILED" });
  }
});

app.get("/api/admin/users", authenticateToken, requireAdmin, securityHeaders, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users, code: "USERS_RETRIEVED" });
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ error: "Failed to retrieve users", code: "USERS_RETRIEVAL_FAILED" });
  }
});

// ==============================
// 11. Utility Routes
// ==============================
app.post("/api/search", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { searchTerm, type, limit = 20 } = req.body;
    if (!searchTerm) {
      return res.status(400).json({ error: "Search term is required", code: "MISSING_SEARCH_TERM" });
    }

    const searchRegex = new RegExp(searchTerm, 'i');
    let results = [];

    if (type === 'assessments') {
      results = await Assessment.find({
        $or: [{ title: searchRegex }, { description: searchRegex }],
        createdBy: req.user.userId
      }).limit(limit).sort({ createdAt: -1 });
    }

    res.json({ results, code: "SEARCH_COMPLETED" });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed", code: "SEARCH_FAILED" });
  }
});

app.get("/api/cron/expiring-subscriptions", async (req, res) => {
  try {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringSubscriptions = await Organization.find({
      'subscription.currentPeriodEnd': { $lte: sevenDaysFromNow, $gte: new Date() },
      'subscription.status': 'active'
    });

    console.log(`📅 Found ${expiringSubscriptions.length} expiring subscriptions`);
    res.json({ message: `Checked ${expiringSubscriptions.length} subscriptions`, code: "SUBSCRIPTIONS_CHECKED" });
  } catch (error) {
    console.error("Cron job error:", error);
    res.status(500).json({ error: "Cron job failed", code: "CRON_JOB_FAILED" });
  }
});

// ==============================
// 12. Error Handling
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
// 13. Server Startup
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
