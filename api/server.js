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
// Add these imports at the top of api/server.js
import cookieParser from 'cookie-parser';
import stripe from 'stripe';

// Add after your existing imports
const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

// ==============================
// Add cookie parser middleware (after body parsing)
// ==============================
app.use(cookieParser());

// ==============================
// Organization Routes
// ==============================

// Get organization details
app.get("/api/organizations/:orgId", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { orgId } = req.params;

    // Verify user has access to this organization
    const organization = await Organization.findOne({ 
      _id: orgId,
      $or: [
        { owner: req.user.userId },
        { 'members.user': req.user.userId }
      ]
    }).populate('owner', 'name email')
      .populate('members.user', 'name email role');

    if (!organization) {
      return res.status(404).json({
        error: "Organization not found or access denied",
        code: "ORGANIZATION_NOT_FOUND"
      });
    }

    res.json({
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        owner: organization.owner,
        members: organization.members,
        subscription: organization.subscription,
        settings: organization.settings,
        createdAt: organization.createdAt
      },
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

// Get user's organizations
app.get("/api/organizations", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const organizations = await Organization.find({
      $or: [
        { owner: req.user.userId },
        { 'members.user': req.user.userId }
      ]
    })
    .populate('owner', 'name email')
    .populate('members.user', 'name email role')
    .sort({ createdAt: -1 });

    res.json({
      organizations: organizations.map(org => ({
        id: org._id,
        name: org.name,
        slug: org.slug,
        owner: org.owner,
        role: org.owner._id.toString() === req.user.userId ? 'owner' : 
              org.members.find(m => m.user._id.toString() === req.user.userId)?.role || 'member',
        subscription: org.subscription,
        memberCount: org.members.length + 1, // +1 for owner
        createdAt: org.createdAt
      })),
      code: "ORGANIZATIONS_RETRIEVED"
    });
  } catch (error) {
    console.error("Organizations fetch error:", error);
    res.status(500).json({
      error: "Failed to retrieve organizations",
      code: "ORGANIZATIONS_RETRIEVAL_FAILED"
    });
  }
});


// ==============================
// Add these routes AFTER your existing routes but BEFORE 404 handler
// ==============================

// ==============================
// Token Refresh Route
// ==============================
app.get("/api/auth/refresh", securityHeaders, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      console.warn("⚠️ No refresh token found in cookies");
      return res.status(401).json({ error: "No refresh token provided" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Issue new access token
    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Issue new refresh token
    const newRefreshToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Store refresh token in HTTP-only cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log(`✅ Token refreshed for user: ${decoded.email}`);

    res.json({
      token: newAccessToken,
      message: "Access token refreshed successfully",
      code: "TOKEN_REFRESHED"
    });
  } catch (error) {
    console.error("❌ Token refresh failed:", error.message);
    res.status(401).json({ 
      error: "Invalid or expired refresh token",
      code: "REFRESH_TOKEN_INVALID"
    });
  }
});

// ==============================
// Search Route
// ==============================
app.post("/api/search", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { searchTerm, type, limit = 20 } = req.body;

    if (!searchTerm) {
      return res.status(400).json({ 
        error: "Search term is required",
        code: "MISSING_SEARCH_TERM"
      });
    }

    let results = [];
    const searchRegex = new RegExp(searchTerm, 'i');

    if (type === 'assessments') {
      results = await Assessment.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex }
        ],
        $or: [
          { createdBy: req.user.userId },
          { organization: { $in: await Organization.find({ owner: req.user.userId }).select('_id') } }
        ]
      })
      .populate('createdBy', 'name email')
      .populate('organization', 'name')
      .limit(limit)
      .sort({ createdAt: -1 });

    } else if (type === 'questions') {
      // This is a simplified search - you might need a more complex aggregation
      const assessments = await Assessment.find({
        'questions.text': searchRegex,
        $or: [
          { createdBy: req.user.userId },
          { organization: { $in: await Organization.find({ owner: req.user.userId }).select('_id') } }
        ]
      })
      .select('title questions')
      .limit(limit);

      results = assessments.flatMap(assessment => 
        assessment.questions
          .filter(question => question.text.match(searchRegex))
          .map(question => ({
            id: question._id,
            assessmentId: assessment._id,
            assessmentTitle: assessment.title,
            text: question.text
          }))
      );
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

// ==============================
// Billing Routes
// ==============================

// Create checkout session
app.post("/api/billing/checkout-session", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;

    // Find user's organization
    const organization = await Organization.findOne({ owner: req.user.userId });
    if (!organization) {
      return res.status(404).json({ 
        error: "Organization not found",
        code: "ORGANIZATION_NOT_FOUND"
      });
    }

    let customerId = organization.subscription?.stripeCustomerId;

    // Create customer if doesn't exist
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

      // Update organization with customer ID
      await Organization.findByIdAndUpdate(organization._id, {
        'subscription.stripeCustomerId': customerId
      });
    }

    // Create checkout session
    const session = await stripeInstance.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.CLIENT_URL}/billing/success`,
      cancel_url: cancelUrl || `${process.env.CLIENT_URL}/billing/cancel`,
      metadata: {
        userId: req.user.userId,
        organizationId: organization._id.toString()
      }
    });

    res.json({
      sessionId: session.id,
      url: session.url,
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

// Stripe webhook
app.post("/api/billing/webhook", express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`❌ Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      handleCheckoutSessionCompleted(session);
      break;
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      handleSubscriptionUpdated(subscription);
      break;
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      handleSubscriptionDeleted(deletedSubscription);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({received: true});
});

// Webhook handlers
const handleCheckoutSessionCompleted = async (session) => {
  try {
    const { userId, organizationId } = session.metadata;
    
    await Organization.findByIdAndUpdate(organizationId, {
      'subscription.status': 'active',
      'subscription.stripeSubscriptionId': session.subscription,
      'subscription.plan': 'professional', // or determine from price
      'subscription.currentPeriodEnd': new Date(session.subscription.current_period_end * 1000)
    });

    console.log(`✅ Subscription activated for organization: ${organizationId}`);
  } catch (error) {
    console.error('Error handling checkout session:', error);
  }
};

const handleSubscriptionUpdated = async (subscription) => {
  try {
    await Organization.findOneAndUpdate(
      { 'subscription.stripeSubscriptionId': subscription.id },
      {
        'subscription.status': subscription.status,
        'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000)
      }
    );
  } catch (error) {
    console.error('Error updating subscription:', error);
  }
};

const handleSubscriptionDeleted = async (subscription) => {
  try {
    await Organization.findOneAndUpdate(
      { 'subscription.stripeSubscriptionId': subscription.id },
      {
        'subscription.status': 'canceled',
        'subscription.plan': 'free'
      }
    );
  } catch (error) {
    console.error('Error canceling subscription:', error);
  }
};

// ==============================
// Admin Routes (Add these)
// ==============================

// Admin stats
app.get("/api/admin/stats", authenticateToken, requireAdmin, securityHeaders, async (req, res) => {
  try {
    const [assessments, users, organizations, completions] = await Promise.all([
      Assessment.countDocuments(),
      User.countDocuments({ isActive: true }),
      Organization.countDocuments(),
      AssessmentResponse.countDocuments({ status: 'completed' })
    ]);

    res.json({
      assessments,
      activeUsers: users,
      organizations,
      completions,
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

// Admin assessments
app.get("/api/admin/assessments", authenticateToken, requireAdmin, securityHeaders, async (req, res) => {
  try {
    const assessments = await Assessment.find()
      .populate('createdBy', 'name email')
      .populate('organization', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      assessments,
      code: "ADMIN_ASSESSMENTS_RETRIEVED"
    });
  } catch (error) {
    console.error("Admin assessments error:", error);
    res.status(500).json({ 
      error: "Failed to retrieve admin assessments",
      code: "ADMIN_ASSESSMENTS_RETRIEVAL_FAILED"
    });
  }
});

// Admin user activity
app.get("/api/admin/user-activity", authenticateToken, requireAdmin, securityHeaders, async (req, res) => {
  try {
    const activities = await UserActivity.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      activities,
      code: "USER_ACTIVITY_RETRIEVED"
    });
  } catch (error) {
    console.error("User activity error:", error);
    res.status(500).json({ 
      error: "Failed to retrieve user activity",
      code: "USER_ACTIVITY_RETRIEVAL_FAILED"
    });
  }
});

// ==============================
// AI Scoring Route
// ==============================
app.post("/api/assessments/ai-score", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { text, questionId, assessmentId } = req.body;

    if (!text || !questionId) {
      return res.status(400).json({ 
        error: "Text and question ID are required",
        code: "MISSING_FIELDS"
      });
    }

    // Mock AI scoring (replace with actual AI service)
    const mockAiScore = (text) => {
      const lengthScore = Math.min(text.length / 150, 1);
      const keywordScore = ["structure", "analysis", "evidence", "conclusion"].filter(kw => 
        text.toLowerCase().includes(kw)
      ).length / 4;
      
      const totalScore = Math.round((lengthScore * 0.7 + keywordScore * 0.3) * 100);
      
      return {
        score: totalScore,
        feedback: [
          totalScore > 80 ? "AI Analysis: Highly detailed and insightful response." : 
          totalScore > 50 ? "AI Analysis: Solid content, needs better structural evidence." : 
          "AI Analysis: Response is minimal; require more depth."
        ],
        confidence: 0.95
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
// Cron endpoint for expiring subscriptions
// ==============================
app.get("/api/cron/expiring-subscriptions", async (req, res) => {
  // Simple cron endpoint - in production, use actual cron jobs
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

    // Here you would send email notifications
    // await sendExpirationEmails(expiringSubscriptions);

    res.json({
      message: `Checked ${expiringSubscriptions.length} expiring subscriptions`,
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

// Add these constants at the top of api/server.js (after imports)
const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    price: 0,
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID, // You'll set this in env
    features: [
      'Up to 10 assessments',
      'Basic analytics',
      'Email support',
      '1 organization'
    ],
    limits: {
      assessments: 10,
      users: 5,
      storage: '1GB'
    }
  },
  professional: {
    name: 'Professional', 
    price: 50,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    features: [
      'Unlimited assessments',
      'Advanced analytics',
      'Priority support',
      'Multiple organizations',
      'Custom branding',
      'API access'
    ],
    limits: {
      assessments: -1, // -1 means unlimited
      users: 50,
      storage: '10GB'
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 100,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom integrations',
      'On-premise deployment',
      'White-label solution'
    ],
    limits: {
      assessments: -1,
      users: -1,
      storage: '100GB'
    }
  }
};

// ==============================
// Subscription Management Routes
// ==============================

// Get available subscription plans
app.get("/api/subscriptions/plans", securityHeaders, (req, res) => {
  res.json({
    plans: SUBSCRIPTION_PLANS,
    code: "PLANS_RETRIEVED"
  });
});

// Get organization's current subscription
app.get("/api/subscriptions/current", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const organization = await Organization.findOne({ owner: req.user.userId })
      .populate('owner', 'name email');
    
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
      usage: await getOrganizationUsage(organization._id),
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

// Update checkout session to handle free plan
app.post("/api/billing/checkout-session", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { priceId, plan, successUrl, cancelUrl } = req.body;

    // Handle free plan (no Stripe payment needed)
    if (plan === 'basic') {
      const organization = await Organization.findOne({ owner: req.user.userId });
      if (organization) {
        // Update to basic plan immediately
        await Organization.findByIdAndUpdate(organization._id, {
          'subscription.plan': 'basic',
          'subscription.status': 'active'
        });

        return res.json({
          sessionId: null,
          url: successUrl || `${process.env.CLIENT_URL}/billing/success`,
          isFree: true,
          code: "FREE_PLAN_ACTIVATED"
        });
      }
    }

    // Paid plans - create Stripe checkout session
    const organization = await Organization.findOne({ owner: req.user.userId });
    if (!organization) {
      return res.status(404).json({ 
        error: "Organization not found",
        code: "ORGANIZATION_NOT_FOUND"
      });
    }

    let customerId = organization.subscription?.stripeCustomerId;

    // Create customer if doesn't exist
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
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.CLIENT_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.CLIENT_URL}/billing`,
      metadata: {
        userId: req.user.userId,
        organizationId: organization._id.toString(),
        plan: plan
      },
      subscription_data: {
        metadata: {
          organizationId: organization._id.toString(),
          plan: plan
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

// Create customer portal session
app.post("/api/billing/portal-session", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const { returnUrl } = req.body;

    const organization = await Organization.findOne({ owner: req.user.userId });
    if (!organization?.subscription?.stripeCustomerId) {
      return res.status(404).json({
        error: "No active subscription found",
        code: "NO_SUBSCRIPTION_FOUND"
      });
    }

    const session = await stripeInstance.billingPortal.sessions.create({
      customer: organization.subscription.stripeCustomerId,
      return_url: returnUrl || `${process.env.CLIENT_URL}/billing`
    });

    res.json({
      url: session.url,
      code: "PORTAL_SESSION_CREATED"
    });
  } catch (error) {
    console.error("Portal session error:", error);
    res.status(500).json({
      error: "Failed to create portal session",
      code: "PORTAL_SESSION_FAILED"
    });
  }
});

// Check subscription limits
app.get("/api/subscriptions/limits", authenticateToken, securityHeaders, async (req, res) => {
  try {
    const organization = await Organization.findOne({ owner: req.user.userId });
    if (!organization) {
      return res.status(404).json({
        error: "Organization not found",
        code: "ORGANIZATION_NOT_FOUND"
      });
    }

    const currentPlan = SUBSCRIPTION_PLANS[organization.subscription.plan] || SUBSCRIPTION_PLANS.basic;
    const usage = await getOrganizationUsage(organization._id);

    res.json({
      plan: currentPlan,
      usage: usage,
      canCreateAssessment: canCreateAssessment(usage.assessmentsCount, currentPlan.limits.assessments),
      canAddUser: canAddUser(usage.usersCount, currentPlan.limits.users),
      code: "LIMITS_RETRIEVED"
    });
  } catch (error) {
    console.error("Limits check error:", error);
    res.status(500).json({
      error: "Failed to check subscription limits",
      code: "LIMITS_CHECK_FAILED"
    });
  }
});

// ==============================
// Helper Functions
// ==============================

const getOrganizationUsage = async (organizationId) => {
  const [assessmentsCount, usersCount] = await Promise.all([
    Assessment.countDocuments({ organization: organizationId }),
    User.countDocuments({ organization: organizationId, isActive: true })
  ]);

  return {
    assessmentsCount,
    usersCount
  };
};

const canCreateAssessment = (currentCount, limit) => {
  return limit === -1 || currentCount < limit;
};

const canAddUser = (currentCount, limit) => {
  return limit === -1 || currentCount < limit;
};

// Update webhook handler to set correct plan
const handleCheckoutSessionCompleted = async (session) => {
  try {
    const { userId, organizationId, plan } = session.metadata;
    const selectedPlan = plan || 'professional'; // Default to professional if not specified
    
    await Organization.findByIdAndUpdate(organizationId, {
      'subscription.status': 'active',
      'subscription.plan': selectedPlan,
      'subscription.stripeSubscriptionId': session.subscription,
      'subscription.currentPeriodEnd': new Date(session.subscription.current_period_end * 1000)
    });

    console.log(`✅ ${selectedPlan} subscription activated for organization: ${organizationId}`);
  } catch (error) {
    console.error('Error handling checkout session:', error);
  }
};

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
