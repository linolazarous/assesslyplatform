/**
 * api/server.js – FINAL PRODUCTION VERSION
 * Authentication System FIXED:
 * - HttpOnly Refresh Token Support
 * - CORS Cookie Credentials Enabled
 * - Refresh Endpoint Exposed
 */

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import xss from "xss-clean";
import mongoSanitize from "express-mongo-sanitize";
import compression from "compression";
import morgan from "morgan";
import chalk from "chalk";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import statusMonitor from "express-status-monitor";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';

import routes from "./routes/index.js";
import { seedDatabase } from "./utils/seedDatabase.js";
import { setupSwagger } from "./config/swagger.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || "production";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://assessly-gedp.onrender.com";
const BACKEND_URL = process.env.BACKEND_URL || "https://assesslyplatform-t49h.onrender.com";
const MONGODB_URI = process.env.MONGODB_URI;
const isProd = NODE_ENV === "production";

// ======== Environment Validation ========
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(chalk.red(`❌ Missing required environment variable: ${envVar}`));
    process.exit(1);
  }
});

if (!MONGODB_URI) {
  console.error(chalk.red("❌ MONGODB_URI missing!"));
  process.exit(1);
}

// ======== Request ID Tracking Middleware ========
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ======== Response Time Header Middleware ========
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Log slow requests (optional)
    if (duration > 1000) { // 1 second threshold
      console.log(chalk.yellow(`⚠️  Slow request detected: ${req.method} ${req.path} - ${duration}ms - Request ID: ${req.id}`));
    }
  });
  next();
});

// ======== Rate Limiting ========
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
    requestId: null // Will be populated by middleware
  },
  keyGenerator: (req) => {
    // Use IP + request ID for better tracking
    return `${req.ip}-${req.id}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

app.use(limiter);

// ======== Enhanced Morgan Logging with Request ID ========
morgan.token('request-id', (req) => req.id);
morgan.token('response-time', (req, res) => {
  if (!res.getHeader('X-Response-Time')) return '';
  return res.getHeader('X-Response-Time');
});

const morganFormat = isProd 
  ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms - request-id::request-id'
  : ':method :url :status :response-time ms - :res[content-length] - request-id::request-id';

app.use(morgan(morganFormat));

// ======== FIXED CORS with Cookies Support ========
const corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Request-ID"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  exposedHeaders: ["Content-Length", "Content-Type", "X-Request-ID", "X-Response-Time"]
};
app.use(cors(corsOptions));

// ======== Security Middleware ========
app.use(helmet({
  contentSecurityPolicy: isProd ? undefined : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(xss());
app.use(mongoSanitize());
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());

// ======== Status Monitor ========
if (!isProd) {
  app.use(statusMonitor());
}

// ======== ROUTE HANDLERS FOR ROOT & COMMON PATHS ========

/**
 * Root endpoint - Welcome message
 */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Assessly Platform API v1.0.0",
    description: "Multi-tenant assessment platform API",
    status: "operational",
    timestamp: new Date().toISOString(),
    requestId: req.id,
    links: {
      frontend: FRONTEND_URL,
      apiDocumentation: `${BACKEND_URL}/api/docs`,
      apiSpecification: `${BACKEND_URL}/api/docs.json`,
      healthCheck: `${BACKEND_URL}/health`,
      apiStatus: `${BACKEND_URL}/api`,
      support: "mailto:assesslyinc@gmail.com"
    },
    authentication: {
      methods: ["JWT Bearer Token", "Google OAuth 2.0"],
      header: "Authorization: Bearer <your-jwt-token>"
    }
  });
});

/**
 * General health check endpoint
 */
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  
  res.json({
    success: true,
    status: "healthy",
    service: "Assessly Platform API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    requestId: req.id,
    uptime: process.uptime(),
    environment: NODE_ENV,
    memory: {
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
    },
    database: dbStatus,
    frontend: FRONTEND_URL,
    backend: BACKEND_URL
  });
});

/**
 * API root endpoint
 */
app.get("/api", (req, res) => {
  res.json({
    success: true,
    name: "Assessly Platform API",
    version: "1.0.0",
    basePath: "/api/v1",
    documentation: `${BACKEND_URL}/api/docs`,
    status: "operational",
    requestId: req.id,
    endpoints: {
      v1: {
        auth: "/api/v1/auth",
        users: "/api/v1/users",
        organizations: "/api/v1/organizations",
        assessments: "/api/v1/assessments",
        subscriptions: "/api/v1/subscriptions",
        analytics: "/api/v1/analytics"
      }
    },
    quickStart: "Visit /api/docs for interactive API documentation"
  });
});

// Health check for API
app.get("/api/health", (req, res) => {
  res.json({ 
    success: true, 
    status: "ok",
    timestamp: new Date().toISOString(),
    requestId: req.id,
    service: "Assessly API"
  });
});

// ======== JWT Refresh Token Endpoint ========
app.get("/api/v1/auth/refresh", (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ 
      success: false,
      message: "No refresh token provided",
      requestId: req.id
    });
  }

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false,
        message: "Invalid or expired refresh token",
        requestId: req.id
      });
    }

    const accessToken = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({ 
      success: true,
      accessToken,
      tokenType: "Bearer",
      expiresIn: 900, // 15 minutes in seconds
      requestId: req.id
    });
  });
});

// ======== Swagger & Routes ========
setupSwagger(app);
app.use("/api/v1", routes);

// ======== Global Error Handler ========
app.use((err, req, res, next) => {
  console.error(chalk.red(`❌ Error [${req.id}]: ${err.message}`), err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  res.status(statusCode).json({
    success: false,
    error: message,
    requestId: req.id,
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ======== 404 Handler ========
app.use((req, res) => {
  if (req.path.startsWith("/api/v1")) {
    return res.status(404).json({
      success: false,
      error: "API route not found",
      path: req.path,
      method: req.method,
      requestId: req.id,
      availableEndpoints: {
        docs: "/api/docs",
        v1: "/api/v1",
        health: "/health",
        apiHealth: "/api/health"
      },
      suggestion: `This is an API server. For the web application, visit: ${FRONTEND_URL}`
    });
  }
  
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
    requestId: req.id,
    suggestion: `Try one of these:
      • API Documentation: ${BACKEND_URL}/api/docs
      • Frontend Application: ${FRONTEND_URL}
      • Health Check: ${BACKEND_URL}/health
      • API Status: ${BACKEND_URL}/api`
  });
});

// ======== Server Start ========
async function startServer() {
  try {
    console.log(chalk.blue(`🔗 Connecting to MongoDB...`));
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    });
    
    console.log(chalk.green("✅ MongoDB Connected Successfully"));
    
    // Optional: Seed database if needed
    if (process.env.AUTO_SEED === 'true') {
      console.log(chalk.yellow("🌱 Seeding database..."));
      await seedDatabase();
      console.log(chalk.green("✅ Database seeded successfully"));
    }
    
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(chalk.green(`🚀 Server running on port ${PORT}`));
      console.log(chalk.cyan(`🌐 Backend URL: ${BACKEND_URL}`));
      console.log(chalk.cyan(`🌍 Frontend URL: ${FRONTEND_URL}`));
      console.log(chalk.yellow(`📚 API Documentation: ${BACKEND_URL}/api/docs`));
      console.log(chalk.magenta(`⚡ Environment: ${NODE_ENV}`));
      console.log(chalk.blue(`🔑 Request ID tracking: Enabled`));
      console.log(chalk.blue(`⏱️  Response time headers: Enabled`));
    });
    
    // Graceful shutdown
    const gracefulShutdown = () => {
      console.log(chalk.yellow('⚠️  SIGTERM/SIGINT received. Shutting down gracefully...'));
      
      server.close(() => {
        console.log(chalk.green('✅ HTTP server closed'));
        mongoose.connection.close(false, () => {
          console.log(chalk.green('✅ MongoDB connection closed'));
          console.log(chalk.green('✅ Graceful shutdown complete'));
          process.exit(0);
        });
      });
      
      // Force shutdown after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        console.error(chalk.red('❌ Could not close connections in time, forcefully shutting down'));
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error(chalk.red('❌ Uncaught Exception:'), error);
      gracefulShutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
      // Don't shutdown here, just log
    });
    
  } catch (err) {
    console.error(chalk.red("❌ Startup Failed:"), err);
    process.exit(1);
  }
}

startServer();
