/**
 * api/server.js
 * Assessly Backend - Production Server (Render-optimized)
 *
 * - Mounts API at /api/v1
 * - CORS whitelist with subdomain support
 * - Health/status/features endpoints
 * - Swagger + status monitor
 * - Passport OAuth with safe initialization
 * - Graceful shutdown
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

import routes from "./routes/index.js";               // router aggregator
import { seedDatabase } from "./utils/seedDatabase.js"; // database seeding
import { setupSwagger } from "./config/swagger.js";    // swagger config
import healthRoutes from './routes/health.js';
app.use('/api/v1/health', healthRoutes);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== Environment ==========
const app = express();
app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || "production";
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com';
const BACKEND_URL = process.env.BACKEND_URL || `https://assesslyplatform-t49h.onrender.com`;
const MONGODB_URI = process.env.MONGODB_URI;
const AUTO_SEED = process.env.AUTO_SEED === "true";
const isProd = NODE_ENV === "production";

if (!MONGODB_URI) {
  console.error(chalk.red("❌ MONGODB_URI is required in environment variables."));
  process.exit(1);
}

// ========== CORS ==========
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : [
      FRONTEND_URL, 
      "https://assessly-gedp.onrender.com",
      "http://localhost:5173", 
      "http://localhost:3000",
      "http://localhost:8080"
    ];

const UNIQUE_ORIGINS = [...new Set(ALLOWED_ORIGINS)];
console.log(chalk.cyan("🔒 Allowed Origins:"), UNIQUE_ORIGINS);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (UNIQUE_ORIGINS.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Check for subdomain matches
    try {
      const originHostname = new URL(origin).hostname;
      const isAllowed = UNIQUE_ORIGINS.some(allowedOrigin => {
        try {
          return new URL(allowedOrigin).hostname === originHostname;
        } catch {
          return allowedOrigin === origin;
        }
      });
      
      if (isAllowed) {
        return callback(null, true);
      }
    } catch (err) {
      // Invalid URL format
      console.warn(chalk.yellow(`⚠️ Invalid origin format: ${origin}`));
    }
    
    console.warn(chalk.yellow(`🚫 CORS blocked: ${origin}`));
    callback(new Error(`Not allowed by CORS. Origin ${origin} not in whitelist.`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie", "X-API-Key", "Accept"],
  exposedHeaders: ["Content-Range", "X-Total-Count", "X-Auth-Token"],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ========== Security & Parsers ==========
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false 
}));
app.use(xss());
app.use(mongoSanitize());
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());

// Morgan logging
app.use(morgan(isProd ? "combined" : "dev"));

// Status monitor
app.use(statusMonitor({ 
  title: "Assessly Server Monitor", 
  path: "/api/monitor",
  healthChecks: [
    {
      protocol: 'https',
      host: 'assesslyplatform-t49h.onrender.com',
      path: '/api/health',
      port: '443'
    }
  ]
}));

// ========== Initialize Passport Safely ==========
let passport;
try {
  passport = (await import("passport")).default;
  const passportConfig = await import("./config/passport.js");
  app.use(passport.initialize());
  console.log(chalk.green("✅ Passport initialized successfully"));
} catch (error) {
  console.warn(chalk.yellow("⚠️ Passport not configured - OAuth routes will be disabled"));
  console.warn(chalk.yellow("   If you need OAuth, check your passport configuration and environment variables"));
}

// ========== Rate limiting ==========
const authLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 10 : 100, // stricter in production
  message: { 
    success: false,
    error: "Too many authentication attempts. Please try again later." 
  },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 100 : 1000, // limit each IP
  message: {
    success: false,
    error: "Too many requests from this IP. Please try again later."
  }
});

app.use("/api/v1/auth", authLimiter);
app.use("/api/v1", apiLimiter);

// ========== Root & Health ==========
app.get("/", (req, res) => res.json({
  success: true,
  message: "🚀 Assessly Backend API",
  environment: NODE_ENV,
  version: process.env.npm_package_version || "1.0.0",
  docs: `${BACKEND_URL}/api/docs`,
  monitor: `${BACKEND_URL}/api/monitor`,
  status: "operational",
  timestamp: new Date().toISOString()
}));

app.get(["/api/health", "/api/v1/health"], (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  
  res.json({ 
    success: true,
    status: "ok", 
    uptime: process.uptime(), 
    environment: NODE_ENV, 
    database: dbStatus,
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    features: {
      oauth: !!passport,
      monitoring: true,
      rateLimiting: true,
      compression: true
    }
  });
});

// ========== Feature Status Endpoint ==========
app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    service: "Assessly Backend API",
    status: "operational",
    version: process.env.npm_package_version || "1.0.0",
    environment: NODE_ENV,
    features: {
      authentication: true,
      oauth: !!passport,
      database: mongoose.connection.readyState === 1,
      monitoring: true,
      rateLimiting: true,
      cors: true,
      compression: true
    },
    endpoints: {
      docs: `${BACKEND_URL}/api/docs`,
      monitor: `${BACKEND_URL}/api/monitor`,
      health: `${BACKEND_URL}/api/health`,
      api: `${BACKEND_URL}/api/v1`
    },
    timestamp: new Date().toISOString()
  });
});

// ========== Swagger & App Routes ==========
setupSwagger(app);
app.use("/api/v1", routes);

// ========== 404 & Error Handling ==========
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: "Endpoint not found", 
    method: req.method, 
    path: req.originalUrl, 
    suggestion: "Visit /api/docs for available endpoints",
    documentation: `${BACKEND_URL}/api/docs`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(chalk.red("❌ Server Error:"), err);
  
  // CORS errors
  if (err && /cors/i.test(err.message || "")) {
    return res.status(403).json({ 
      success: false,
      error: "CORS Error", 
      message: "Request blocked by CORS policy",
      origin: req.headers.origin || null
    });
  }
  
  // Database errors
  if (err && (err.name === "MongoNetworkError" || err.name === "MongoError")) {
    return res.status(503).json({ 
      success: false,
      error: "Database Error", 
      message: "Service temporarily unavailable" 
    });
  }
  
  // Validation errors
  if (err && err.name === "ValidationError") {
    return res.status(400).json({ 
      success: false,
      error: "Validation Error", 
      message: err.message, 
      details: err.errors 
    });
  }
  
  // JWT errors
  if (err && err.name === "JsonWebTokenError") {
    return res.status(401).json({ 
      success: false,
      error: "Authentication Error", 
      message: "Invalid token" 
    });
  }
  
  // Default error
  const status = err?.status || err?.statusCode || 500;
  res.status(status).json({
    success: false,
    error: "Internal Server Error",
    message: isProd ? "Something went wrong" : err?.message || "Unknown error",
    ...(isProd ? {} : { stack: err?.stack })
  });
});

// ========== Start Server ==========
async function startServer() {
  console.log(chalk.cyan("\n🚀 Starting Assessly Backend...\n"));
  console.log(chalk.blue("📋 Configuration:"));
  console.log(chalk.blue(`   Environment: ${NODE_ENV}`));
  console.log(chalk.blue(`   Port: ${PORT}`));
  console.log(chalk.blue(`   Frontend URL: ${FRONTEND_URL}`));
  console.log(chalk.blue(`   Backend URL: ${BACKEND_URL}`));
  console.log(chalk.blue(`   Auto Seed: ${AUTO_SEED}`));
  
  try {
    const conn = await mongoose.connect(MONGODB_URI, { 
      serverSelectionTimeoutMS: 10000, 
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log(chalk.green("\n✅ MongoDB connected:"), conn.connection.name);
    console.log(chalk.magenta(`🌍 Environment: ${NODE_ENV}`));
    console.log(chalk.cyan(`🔒 Allowed Origins: ${UNIQUE_ORIGINS.join(", ")}`));

    if (AUTO_SEED) {
      console.log(chalk.yellow("🌱 Auto-seeding database..."));
      await seedDatabase();
    }

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(chalk.green(`\n📡 Server listening on port ${PORT}`));
      console.log(chalk.blue(`📚 API Documentation: ${BACKEND_URL}/api/docs`));
      console.log(chalk.magenta(`📊 Server Monitor: ${BACKEND_URL}/api/monitor`));
      console.log(chalk.cyan(`🔧 API Health: ${BACKEND_URL}/api/health`));
      console.log(chalk.green("✅ Assessly Backend Ready for Production! 🚀\n"));
    });

    // Store server instance for graceful shutdown
    app.locals.server = server;
    
  } catch (err) {
    console.error(chalk.red("❌ Server startup failed:"), err);
    process.exit(1);
  }
}

// ========== Graceful Shutdown ==========
const shutdown = async (signal) => {
  console.log(chalk.yellow(`\n🛑 ${signal} received — shutting down gracefully...`));
  
  try { 
    if (app.locals.server) {
      app.locals.server.close(() => {
        console.log(chalk.green("✅ HTTP server closed."));
      });
    }
    
    await mongoose.connection.close(false); 
    console.log(chalk.green("✅ MongoDB connection closed.")); 
  } catch (err) { 
    console.error(chalk.red("❌ Error during shutdown:"), err); 
  } finally { 
    process.exit(0); 
  }
};

// Signal handlers
["SIGINT", "SIGTERM", "SIGUSR2"].forEach(sig => {
  process.on(sig, () => shutdown(sig));
});

// Unhandled rejection and exception handlers
process.on("unhandledRejection", (reason, promise) => {
  console.error(chalk.red("❌ Unhandled Rejection at:"), promise, chalk.red("reason:"), reason);
});

process.on("uncaughtException", (err) => { 
  console.error(chalk.red("❌ Uncaught Exception:"), err); 
  process.exit(1); 
});

// Start the server
startServer();
