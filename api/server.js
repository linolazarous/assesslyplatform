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

// Fix for rate limiting proxy warning
app.set('trust proxy', 1);

// Initialize Stripe
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

// ==============================
// 1. Database Connection with Auto-Seeding
// ==============================
const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log('✅ Database connection established');
    
    // Auto-seed if enabled and no admin exists
    const adminExists = await User.findOne({ email: 'admin@assessly.com' });
    if (!adminExists && process.env.AUTO_SEED === 'true') {
      console.log('🌱 Auto-seeding database...');
      const { seedDatabase } = await import('./scripts/seed.js');
      await seedDatabase();
      console.log('✅ Auto-seeding completed');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Initialize database
initializeDatabase();

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

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many requests from this IP.",
    code: "STRICT_RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", generalLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/admin/", strictLimiter);

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
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    version: "1.0.0"
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Assessly Platform API",
    version: "1.0.0",
    status: "Running",
    timestamp: new Date().toISOString(),
    documentation: "https://docs.assessly.com"
  });
});

// Debug route
app.get("/api/debug", securityHeaders, (req, res) => {
  res.json({
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    has_mongodb_uri: !!process.env.MONGODB_URI,
    has_jwt_secret: !!process.env.JWT_SECRET,
    has_stripe_key: !!process.env.STRIPE_SECRET_KEY,
    has_admin_password: !!process.env.ADMIN_DEFAULT_PASSWORD,
    auto_seed_enabled: process.env.AUTO_SEED === 'true',
    allowed_origins: process.env.ALLOWED_ORIGINS
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
        code: "INVALID_EMAIL"
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
        code: "WEAK_PASSWORD"
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        error: "User already exists with this email",
        code: "USER_EXISTS"
      });
    }

    const user = new User({ 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      password, 
      role 
    });
    await user.save();

    // Log user activity
    await UserActivity.create({
      userId: user._id,
      action: 'register',
      details: 'New user registration'
    });

    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        createdAt: user.createdAt
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
      error: "Internal server error", 
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

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ 
        error: "Invalid email or password", 
        code: "INVALID_CREDENTIALS"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "Account is deactivated",
        code: "ACCOUNT_DEACTIVATED"
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Log user activity
    await UserActivity.create({
      userId: user._id,
      action: 'login',
      details: 'User logged in'
    });

    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
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
      error: "Internal server error", 
      code: "LOGIN_FAILED" 
    });
  }
});

app.post("/api/auth/logout", authenticateToken, securityHeaders, (req, res) => {
  try {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (token) invalidateToken(token);
    
    // Log user activity
    UserActivity.create({
      userId: req.user.userId,
      action: 'logout',
      details: 'User logged out'
    }).catch(console.error);
    
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

app.get("/api/auth/me", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      },
      code: "PROFILE_RETRIEVED"
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch profile",
      code: "PROFILE_FETCH_FAILED"
    });
  }
});

app.post("/api/auth/refresh", securityHeaders, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ 
        error: "No refresh token provided",
        code: "MISSING_REFRESH_TOKEN"
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "User not found or inactive",
        code: "USER_INACTIVE"
      });
    }

    const newAccessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ 
      token: newAccessToken, 
      message: "Token refreshed", 
      code: "TOKEN_REFRESHED" 
    });
  } catch (error) {
    console.error("Token refresh failed:", error);
    res.status(401).json({ 
      error: "Invalid refresh token", 
      code: "REFRESH_TOKEN_INVALID" 
    });
  }
});

// ==============================
// 7. User & Organization Routes
// ==============================
app.get("/api/user/profile", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('organization', 'name description');
    
    if (!user) {
      return res.status(404).json({ 
        error: "User not found", 
        code: "USER_NOT_FOUND" 
      });
    }

    res.json({ 
      user, 
      code: "PROFILE_RETRIEVED" 
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ 
      error: "Failed to retrieve profile", 
      code: "PROFILE_RETRIEVAL_FAILED" 
    });
  }
});

app.put("/api/user/profile", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { name } = req.body;
    const updates = {};

    if (name && name.trim()) {
      updates.name = name.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "No valid fields to update",
        code: "NO_VALID_UPDATES"
      });
    }

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

// Organizations
app.get("/api/organizations", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const organizations = await Organization.find({ owner: req.user.userId })
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

app.post("/api/organizations", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ 
        error: "Organization name is required", 
        code: "MISSING_NAME" 
      });
    }

    // Check organization limits based on subscription
    const userOrganizations = await Organization.countDocuments({ owner: req.user.userId });
    // Basic plan allows only 1 organization
    if (userOrganizations >= 1) {
      return res.status(403).json({
        error: "Organization limit reached. Upgrade your plan to create more organizations.",
        code: "ORGANIZATION_LIMIT_REACHED"
      });
    }

    const organization = new Organization({
      name: name.trim(),
      description: description?.trim(),
      owner: req.user.userId
    });

    await organization.save();

    res.status(201).json({ 
      organization, 
      code: "ORGANIZATION_CREATED" 
    });
  } catch (error) {
    console.error("Organization creation error:", error);
    res.status(500).json({ 
      error: "Failed to create organization", 
      code: "ORGANIZATION_CREATION_FAILED" 
    });
  }
});

app.get("/api/organizations/:orgId", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const organization = await Organization.findOne({ 
      _id: req.params.orgId, 
      owner: req.user.userId 
    }).populate('owner', 'name email');

    if (!organization) {
      return res.status(404).json({ 
        error: "Organization not found", 
        code: "ORGANIZATION_NOT_FOUND" 
      });
    }

    res.json({ 
      organization, 
      code: "ORGANIZATION_RETRIEVED" 
    });
  } catch (error) {
    console.error("Organization fetch error:", error);
    res.status(500).json({ 
      error: "Failed to retrieve organization", 
      code: "ORGANIZATION_RETRIEVAL_FAILED" 
    });
  }
});

app.put("/api/organizations/:orgId", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { name, description } = req.body;
    const updates = {};

    if (name && name.trim()) {
      updates.name = name.trim();
    }
    if (description !== undefined) {
      updates.description = description?.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "No valid fields to update",
        code: "NO_VALID_UPDATES"
      });
    }

    const organization = await Organization.findOneAndUpdate(
      { _id: req.params.orgId, owner: req.user.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({
        error: "Organization not found",
        code: "ORGANIZATION_NOT_FOUND"
      });
    }

    res.json({
      message: "Organization updated successfully",
      organization,
      code: "ORGANIZATION_UPDATED"
    });
  } catch (error) {
    console.error("Organization update error:", error);
    res.status(500).json({
      error: "Failed to update organization",
      code: "ORGANIZATION_UPDATE_FAILED"
    });
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

app.post("/api/assessments", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { title, description, questions, organizationId, duration } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ 
        error: "Assessment title is required", 
        code: "MISSING_TITLE" 
      });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        error: "Questions array is required and cannot be empty", 
        code: "MISSING_QUESTIONS" 
      });
    }

    // Validate questions structure
    for (const question of questions) {
      if (!question.text || !question.text.trim()) {
        return res.status(400).json({
          error: "All questions must have text",
          code: "INVALID_QUESTION"
        });
      }
    }

    // Check assessment limits based on subscription
    const userAssessments = await Assessment.countDocuments({ createdBy: req.user.userId });
    // Basic plan allows only 10 assessments
    if (userAssessments >= 10) {
      return res.status(403).json({
        error: "Assessment limit reached. Upgrade your plan to create more assessments.",
        code: "ASSESSMENT_LIMIT_REACHED"
      });
    }

    const assessment = new Assessment({
      title: title.trim(),
      description: description?.trim(),
      questions,
      duration,
      organization: organizationId,
      createdBy: req.user.userId
    });

    await assessment.save();

    res.status(201).json({ 
      assessment, 
      code: "ASSESSMENT_CREATED" 
    });
  } catch (error) {
    console.error("Assessment creation error:", error);
    res.status(500).json({ 
      error: "Failed to create assessment", 
      code: "ASSESSMENT_CREATION_FAILED" 
    });
  }
});

app.get("/api/assessments/:assessmentId", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.assessmentId,
      createdBy: req.user.userId
    })
      .populate('createdBy', 'name email')
      .populate('organization', 'name');

    if (!assessment) {
      return res.status(404).json({
        error: "Assessment not found",
        code: "ASSESSMENT_NOT_FOUND"
      });
    }

    res.json({
      assessment,
      code: "ASSESSMENT_RETRIEVED"
    });
  } catch (error) {
    console.error("Assessment fetch error:", error);
    res.status(500).json({
      error: "Failed to retrieve assessment",
      code: "ASSESSMENT_RETRIEVAL_FAILED"
    });
  }
});

app.post("/api/assessments/ai-score", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { text, questionId } = req.body;
    
    if (!text || !questionId) {
      return res.status(400).json({ 
        error: "Text and question ID are required", 
        code: "MISSING_FIELDS" 
      });
    }

    // Enhanced AI scoring simulation
    const mockAiScore = (text) => {
      const lengthScore = Math.min(text.length / 200, 1); // More generous length scoring
      const keywordMatches = ["structure", "analysis", "evidence", "conclusion", "example", "demonstrate"]
        .filter(kw => text.toLowerCase().includes(kw)).length;
      const keywordScore = keywordMatches / 6;
      
      // Grammar and structure scoring (simplified)
      const sentenceCount = (text.match(/[.!?]+/g) || []).length;
      const structureScore = sentenceCount > 1 ? Math.min(sentenceCount / 5, 1) : 0.3;
      
      const totalScore = Math.round(
        (lengthScore * 0.4 + keywordScore * 0.3 + structureScore * 0.3) * 100
      );

      // Generate contextual feedback
      let feedback = [];
      if (totalScore >= 85) {
        feedback = [
          "Excellent response with strong structure and evidence",
          "Well-articulated points with clear examples",
          "Comprehensive analysis demonstrating deep understanding"
        ];
      } else if (totalScore >= 70) {
        feedback = [
          "Good response with solid structure",
          "Consider adding more specific examples",
          "Well-reasoned but could expand on key points"
        ];
      } else if (totalScore >= 50) {
        feedback = [
          "Adequate response but needs more depth",
          "Consider improving structure and organization",
          "Add more evidence to support your points"
        ];
      } else {
        feedback = [
          "Response needs significant improvement",
          "Focus on providing more detailed analysis",
          "Consider the question requirements more carefully"
        ];
      }

      return {
        score: totalScore,
        feedback,
        confidence: Math.min(0.7 + (totalScore / 100) * 0.3, 0.95), // Higher confidence for better scores
        breakdown: {
          content: Math.round(lengthScore * 100),
          keywords: Math.round(keywordScore * 100),
          structure: Math.round(structureScore * 100)
        }
      };
    };

    const result = mockAiScore(text);
    
    res.json({ 
      ...result, 
      code: "AI_SCORE_GENERATED" 
    });
  } catch (error) {
    console.error("AI scoring error:", error);
    res.status(500).json({ 
      error: "Failed to generate AI score", 
      code: "AI_SCORE_FAILED" 
    });
  }
});

// ==============================
// 9. Subscription & Billing Routes
// ==============================
app.get("/api/subscriptions/plans", securityHeaders, (req, res) => {
  res.json({ 
    plans: SUBSCRIPTION_PLANS, 
    code: "PLANS_RETRIEVED" 
  });
});

app.get("/api/subscriptions/current", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const organization = await Organization.findOne({ owner: req.user.userId });
    if (!organization) {
      return res.status(404).json({ 
        error: "Organization not found", 
        code: "ORGANIZATION_NOT_FOUND" 
      });
    }

    const currentPlan = SUBSCRIPTION_PLANS[organization.subscription.plan] || SUBSCRIPTION_PLANS.basic;
    
    res.json({ 
      subscription: organization.subscription, 
      plan: currentPlan, 
      code: "SUBSCRIPTION_RETRIEVED" 
    });
  } catch (error) {
    console.error("Subscription retrieval error:", error);
    res.status(500).json({ 
      error: "Failed to retrieve subscription", 
      code: "SUBSCRIPTION_RETRIEVAL_FAILED" 
    });
  }
});

app.post("/api/billing/checkout-session", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { priceId, plan } = req.body;
    
    if (!priceId || !plan) {
      return res.status(400).json({
        error: "Price ID and plan are required",
        code: "MISSING_FIELDS"
      });
    }

    const organization = await Organization.findOne({ owner: req.user.userId });
    if (!organization) {
      return res.status(404).json({ 
        error: "Organization not found", 
        code: "ORGANIZATION_NOT_FOUND" 
      });
    }

    // Handle free plan
    if (plan === 'basic') {
      await Organization.findByIdAndUpdate(organization._id, {
        'subscription.plan': 'basic', 
        'subscription.status': 'active',
        'subscription.currentPeriodEnd': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      });
      
      return res.json({ 
        isFree: true, 
        code: "FREE_PLAN_ACTIVATED" 
      });
    }

    // Handle paid plans
    let customerId = organization.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeInstance.customers.create({
        email: req.user.email, 
        name: req.user.name,
        metadata: { 
          userId: req.user.userId, 
          organizationId: organization._id.toString() 
        }
      });
      customerId = customer.id;
      
      await Organization.findByIdAndUpdate(organization._id, {
        'subscription.stripeCustomerId': customerId
      });
    }

    const session = await stripeInstance.checkout.sessions.create({
      customer: customerId, 
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL || 'https://assesslyplatform.onrender.com'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'https://assesslyplatform.onrender.com'}/billing`,
      metadata: { 
        userId: req.user.userId, 
        organizationId: organization._id.toString(), 
        plan 
      },
      subscription_data: {
        metadata: {
          userId: req.user.userId,
          organizationId: organization._id.toString(),
          plan
        }
      }
    });

    res.json({ 
      sessionId: session.id, 
      url: session.url, 
      isFree: false, 
      code: "CHECKOUT_SESSION_CREATED" 
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    res.status(500).json({ 
      error: "Failed to create checkout session", 
      code: "CHECKOUT_SESSION_FAILED" 
    });
  }
});

// ==============================
// 10. Admin Routes
// ==============================
app.get("/api/admin/stats", authenticateToken, requireAdmin, securityHeaders, async (req, res) => {
  try {
    const [
      totalAssessments,
      activeUsers,
      totalOrganizations,
      completedAssessments,
      recentRegistrations
    ] = await Promise.all([
      Assessment.countDocuments(),
      User.countDocuments({ isActive: true }),
      Organization.countDocuments(),
      AssessmentResponse.countDocuments({ status: 'completed' }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({ 
      stats: {
        totalAssessments,
        activeUsers,
        totalOrganizations,
        completedAssessments,
        recentRegistrations
      },
      code: "STATS_RETRIEVED" 
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ 
      error: "Failed to retrieve admin statistics", 
      code: "STATS_RETRIEVAL_FAILED" 
    });
  }
});

app.get("/api/admin/users", authenticateToken, requireAdmin, securityHeaders, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .populate('organization', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalUsers: total
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

// ==============================
// 11. Utility Routes
// ==============================
app.post("/api/search", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { searchTerm, type = 'assessments', limit = 20 } = req.body;
    
    if (!searchTerm || !searchTerm.trim()) {
      return res.status(400).json({ 
        error: "Search term is required", 
        code: "MISSING_SEARCH_TERM" 
      });
    }

    const searchRegex = new RegExp(searchTerm.trim(), 'i');
    let results = [];

    if (type === 'assessments') {
      results = await Assessment.find({
        $or: [
          { title: searchRegex }, 
          { description: searchRegex }
        ],
        createdBy: req.user.userId
      })
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
    } else if (type === 'organizations') {
      results = await Organization.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ],
        owner: req.user.userId
      })
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
    }

    res.json({ 
      results, 
      code: "SEARCH_COMPLETED" 
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ 
      error: "Search failed", 
      code: "SEARCH_FAILED" 
    });
  }
});

// Cron endpoint for expiring subscriptions (can be called by external cron service)
app.get("/api/cron/expiring-subscriptions", async (req, res) => {
  try {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringSubscriptions = await Organization.find({
      'subscription.currentPeriodEnd': { 
        $lte: sevenDaysFromNow, 
        $gte: new Date() 
      },
      'subscription.status': 'active'
    }).populate('owner', 'email name');

    console.log(`📅 Found ${expiringSubscriptions.length} expiring subscriptions`);

    // In a real implementation, you would send email notifications here
    expiringSubscriptions.forEach(org => {
      console.log(`⚠️ Subscription expiring for ${org.owner.email} (${org.name})`);
    });

    res.json({ 
      message: `Checked ${expiringSubscriptions.length} subscriptions`, 
      expiringCount: expiringSubscriptions.length,
      code: "SUBSCRIPTIONS_CHECKED" 
    });
  } catch (error) {
    console.error("Cron job error:", error);
    res.status(500).json({ 
      error: "Cron job failed", 
      code: "CRON_JOB_FAILED" 
    });
  }
});

// ==============================
// 12. Error Handling
// ==============================
app.use("/api/*", securityHeaders, (req, res) => {
  res.status(404).json({ 
    error: "API endpoint not found", 
    code: "ENDPOINT_NOT_FOUND" 
  });
});

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
    const field = Object.keys(err.keyPattern)[0];
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

  // Rate limit error (from express-rate-limit)
  if (err.statusCode === 429) {
    return res.status(429).json({
      error: "Too many requests",
      code: "RATE_LIMIT_EXCEEDED"
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = isProduction && statusCode === 500 
    ? "Internal server error" 
    : err.message;

  res.status(statusCode).json({ 
    error: message, 
    code: "INTERNAL_SERVER_ERROR",
    ...(!isProduction && { stack: err.stack }) // Include stack trace in development
  });
});

// ==============================
// 13. Security Headers & Production Optimizations
// ==============================
// Additional security headers for production
app.use((req, res, next) => {
  // Prevent framing of the site
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log('⚠️ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle different shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ==============================
// 14. Server Startup
// ==============================
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`
🚀 Assessly Backend Server Started
📍 Port: ${port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Health: https://assesslyplatform.onrender.com/api/health
🔍 Debug: https://assesslyplatform.onrender.com/api/debug
🕒 Started: ${new Date().toISOString()}
  `);

  // Log important configuration
  console.log(`
📋 Configuration:
   • Database: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}
   • Auto-seed: ${process.env.AUTO_SEED === 'true' ? 'Enabled ✅' : 'Disabled ⚠️'}
   • Rate Limiting: Enabled ✅
   • CORS: ${allowedOrigins.length} allowed origins
   • Trust Proxy: Enabled ✅
  `);
});

export default app;
    
