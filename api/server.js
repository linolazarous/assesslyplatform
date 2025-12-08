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

if (!MONGODB_URI) {
  console.error(chalk.red("❌ MONGODB_URI missing!"));
  process.exit(1);
}

// ======== FIXED CORS with Cookies Support ========
const corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ======== Security ========
app.use(helmet({ contentSecurityPolicy: false }));
app.use(xss());
app.use(mongoSanitize());
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());
app.use(morgan("dev"));

// ======== FIXED CORS with Cookies Support ========
const corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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
    links: {
      frontend: "https://assessly-gedp.onrender.com",
      apiDocumentation: "/api/docs",
      apiSpecification: "/api/docs.json",
      healthCheck: "/health",
      apiStatus: "/api",
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
  res.json({
    success: true,
    status: "healthy",
    service: "Assessly Platform API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    memory: {
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
    },
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
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

// ======== EXISTING HEALTH ROUTE (KEEP THIS) ========
// Health - Keep this for API health checks
app.get("/api/health", (req, res) => res.json({ success: true, status: "ok" }));

// ======== JWT Refresh Token Endpoint (NEW) ========
// ... rest of your existing code ...
// Health
app.get("/api/health", (req, res) => res.json({ success: true, status: "ok" }));

// ======== JWT Refresh Token Endpoint (NEW) ========
app.get("/api/v1/auth/refresh", (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid refresh token" });

    const accessToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({ accessToken });
  });
});

// ======== Swagger & Routes ========
setupSwagger(app);
app.use("/api/v1", routes);

// 404 handler with helpful suggestions
app.use((req, res) => {
  // Don't handle API routes here - they're handled by the routes/index.js
  if (req.path.startsWith("/api/v1")) {
    return res.status(404).json({
      success: false,
      error: "API route not found",
      path: req.path,
      method: req.method,
      availableEndpoints: {
        docs: "/api/docs",
        v1: "/api/v1",
        health: "/health",
        apiHealth: "/api/health"
      },
      suggestion: "This is an API server. For the web application, visit: " + FRONTEND_URL
    });
  }
  
  // For non-API routes
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
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
    await mongoose.connect(MONGODB_URI);
    console.log(chalk.green("🎯 MongoDB Connected"));

    app.listen(PORT, "0.0.0.0", () => {
      console.log(chalk.green(`🚀 Server Ready: ${BACKEND_URL}`));
    });
  } catch (err) {
    console.error("Startup Failed", err);
    process.exit(1);
  }
}

startServer();
