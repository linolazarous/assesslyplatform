/**
 * ============================================
 * Assessly Backend - Production Server (Render)
 * ============================================
 * Features:
 * ✅ Render & proxy ready
 * ✅ Dual health endpoints (/api/health, /api/v1/health)
 * ✅ Safe imports (handles missing passport modules)
 * ✅ CORS diagnostics + origin whitelisting
 * ✅ Helmet, hpp, XSS-clean, Mongo sanitize
 * ✅ Cookie-based sessions
 * ✅ Express Status Monitor (/api/monitor)
 * ✅ Swagger UI (/api/docs)
 * ✅ Rate limiting (auth endpoints)
 * ✅ Graceful shutdown
 * ✅ Auto-seeding (optional)
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
import routes from "./routes/index.js";
import { seedDatabase } from "./utils/seedDatabase.js";
import { setupSwagger } from "./config/swagger.js";

dotenv.config();

// Optional imports (passport-based OAuth)
let passport, googlePassport, googleAuthRoutes, githubAuthRoutes;
try {
  passport = (await import("passport")).default;
  googlePassport = (await import("./config/passport.js")).default;
  googleAuthRoutes = (await import("./routes/auth/google.js")).default;
  githubAuthRoutes = (await import("./routes/auth/github.js")).default;
} catch (err) {
  console.warn(chalk.yellow("⚠️ Passport or OAuth routes not found — skipping Google/GitHub auth."));
}

// =====================
// Environment Setup
// =====================
const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || "production";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://assessly-gedp.onrender.com";
const BACKEND_URL = process.env.BACKEND_URL || "https://assesslyplatform-t49h.onrender.com";
const MONGODB_URI = process.env.MONGODB_URI;
const AUTO_SEED = process.env.AUTO_SEED === "true";
const isProd = NODE_ENV === "production";

if (!MONGODB_URI) {
  console.error(chalk.red("❌ Missing MONGODB_URI in environment."));
  process.exit(1);
}

// =====================
// Allowed Origins
// =====================
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [
        FRONTEND_URL,
        "https://assessly-gedp.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
      ]
);

const logCorsBlocked = (origin) => {
  console.groupCollapsed(chalk.yellow("⚠️  CORS BLOCKED REQUEST"));
  console.log(chalk.blue("Origin:"), origin);
  console.log(chalk.green("Allowed origins:"), ALLOWED_ORIGINS);
  console.groupEnd();
};

// =====================
// Middleware
// =====================
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Allow Postman/curl
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      try {
        const parsed = new URL(origin);
        if (parsed.hostname === new URL(BACKEND_URL).hostname) return callback(null, true);
      } catch {}
      logCorsBlocked(origin);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie"],
  })
);
app.options("*", cors());

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // for Swagger & Google SDK
  })
);
app.use(xss());
app.use(mongoSanitize());
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());
app.use(morgan(isProd ? "combined" : "dev"));

app.use(
  statusMonitor({
    title: "Assessly Server Monitor",
    path: "/api/monitor",
    spans: [
      { interval: 1, retention: 60 },
      { interval: 5, retention: 60 },
      { interval: 15, retention: 60 },
    ],
  })
);

// Initialize Passport (if loaded)
if (passport) app.use(passport.initialize());

// =====================
// Rate Limiting (Auth endpoints)
// =====================
app.use(
  "/api/v1/auth",
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts. Try again later." },
  })
);

// =====================
// Root Endpoints
// =====================
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Assessly API running successfully!",
    service: "Assessly Backend API",
    environment: NODE_ENV,
    version: "1.0.0",
    docs: `${BACKEND_URL}/api/docs`,
    monitor: `${BACKEND_URL}/api/monitor`,
    health: `${BACKEND_URL}/api/v1/health`,
    timestamp: new Date().toISOString(),
  });
});

app.get(["/api/health", "/api/v1/health"], (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

app.get("/api", (req, res) => {
  res.json({
    api: "Assessly API Gateway",
    version: "v1",
    basePath: "/api/v1",
    documentation: "/api/docs",
    availableEndpoints: [
      "/auth",
      "/users",
      "/assessments",
      "/organizations",
      "/health",
      "/status",
    ],
  });
});

// =====================
// Swagger Docs
// =====================
setupSwagger(app);

// =====================
// Versioned API
// =====================
app.use("/api/v1", routes);
if (googleAuthRoutes) app.use("/api/v1/auth", googleAuthRoutes);
if (githubAuthRoutes) app.use("/api/v1/auth", githubAuthRoutes);

// =====================
// 404 Handler
// =====================
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    method: req.method,
    path: req.originalUrl,
    suggestion: "Refer to /api/docs for available endpoints",
  });
});

// =====================
// Error Handler
// =====================
app.use((err, req, res, next) => {
  if (/cors/i.test(err.message)) {
    return res.status(403).json({
      message: "CORS Error: Request blocked",
      origin: req.headers.origin,
      allowedOrigins: ALLOWED_ORIGINS,
    });
  }

  console.error(chalk.red("❌ Error:"), err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    code: err.code || "SERVER_ERROR",
    ...(isProd ? {} : { stack: err.stack }),
  });
});

// =====================
// Database & Server Start
// =====================
async function startServer() {
  console.log(chalk.cyan("\n🚀 Starting Assessly Backend...\n"));
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(chalk.green("✅ MongoDB Connected:"), conn.connection.name);
    console.log(chalk.magenta(`🌍 Environment: ${NODE_ENV}`));
    console.log(chalk.cyan(`🔒 Allowed Origins:`), ALLOWED_ORIGINS.join(", "));

    if (AUTO_SEED) {
      console.log(chalk.yellow("🌱 Auto-seeding database..."));
      await seedDatabase();
    }

    app.listen(PORT, () => {
      console.log(chalk.green(`📡 Server listening on port ${PORT}`));
      console.log(chalk.magenta(`📊 Health: ${BACKEND_URL}/api/v1/health`));
      console.log(chalk.blue(`📚 Docs: ${BACKEND_URL}/api/docs`));
      console.log(chalk.green("✅ Ready for production.\n"));
    });
  } catch (error) {
    console.error(chalk.red("❌ Server startup failed:"), error);
    process.exit(1);
  }
}

// =====================
// Graceful Shutdown
// =====================
const shutdown = async (signal) => {
  console.log(chalk.yellow(`\n🛑 ${signal} received — shutting down gracefully...`));
  await mongoose.connection.close(false);
  console.log(chalk.green("✅ MongoDB connection closed."));
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error(chalk.red("❌ Unhandled Rejection:"), reason);
});
process.on("uncaughtException", (err) => {
  console.error(chalk.red("❌ Uncaught Exception:"), err);
  process.exit(1);
});

startServer();
