/**
 * =======================================================
 * Assessly Backend - Production Server (Render Optimized)
 * =======================================================
 * ✅ Fixed CORS for frontend login/signup
 * ✅ Improved error resilience & structured logs
 * ✅ Auto MongoDB recovery & clean shutdown
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

let passport, googlePassport, googleAuthRoutes, githubAuthRoutes;
try {
  passport = (await import("passport")).default;
  googlePassport = (await import("./config/passport.js")).default;
  googleAuthRoutes = (await import("./routes/auth/google.js")).default;
  githubAuthRoutes = (await import("./routes/auth/github.js")).default;
} catch {
  console.warn(chalk.yellow("⚠️ OAuth routes not found — skipping Google/GitHub auth setup."));
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
// CORS Configuration (Fixed for Render)
// =====================
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [
        "https://assessly-gedp.onrender.com",
        "https://assessly-qedp.onrender.com",
        "https://assesslv-qedp.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
      ]
);

const UNIQUE_ORIGINS = [...new Set(ALLOWED_ORIGINS)];

console.log(chalk.cyan("🔒 Allowed Origins:"), UNIQUE_ORIGINS);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || UNIQUE_ORIGINS.includes(origin)) return callback(null, true);

    try {
      const originUrl = new URL(origin);
      const isSubdomain = UNIQUE_ORIGINS.some((allowed) => {
        const allowedUrl = new URL(allowed);
        return originUrl.hostname === allowedUrl.hostname;
      });
      if (isSubdomain) return callback(null, true);
    } catch {
      // Invalid origin, ignore
    }

    console.warn(chalk.yellow(`🚫 CORS blocked origin: ${origin}`));
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie", "X-API-Key", "Accept"],
  exposedHeaders: ["Content-Range", "X-Total-Count"],
  maxAge: 86400, // cache preflight for 24h
};

// Apply global CORS
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// =====================
// Middleware
// =====================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
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

if (passport) app.use(passport.initialize());

// =====================
// Rate Limiting (Auth)
// =====================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many authentication attempts, please try again later." },
});
app.use("/api/v1/auth", authLimiter);

// =====================
// Health & Root Routes
// =====================
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Assessly Backend Running!",
    environment: NODE_ENV,
    version: "1.0.0",
    docs: `${BACKEND_URL}/api/docs`,
    monitor: `${BACKEND_URL}/api/monitor`,
    timestamp: new Date().toISOString(),
  });
});

app.get(["/api/health", "/api/v1/health"], (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    environment: NODE_ENV,
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api", (req, res) => {
  res.json({
    api: "Assessly API Gateway",
    version: "v1",
    documentation: "/api/docs",
    basePath: "/api/v1",
    endpoints: ["/auth", "/users", "/assessments", "/organizations", "/health", "/status"],
  });
});

// =====================
// Swagger & Routes
// =====================
setupSwagger(app);
app.use("/api/v1", routes);
if (googleAuthRoutes) app.use("/api/v1/auth", googleAuthRoutes);
if (githubAuthRoutes) app.use("/api/v1/auth", githubAuthRoutes);

// =====================
// 404 Handler
// =====================
app.use((req, res) =>
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
    suggestion: "Visit /api/docs for valid endpoints",
  })
);

// =====================
// Central Error Handler
// =====================
app.use((err, req, res, next) => {
  if (err.message?.includes("CORS")) {
    return res.status(403).json({
      error: "CORS Error",
      message: "Request blocked by CORS policy",
      origin: req.headers.origin,
      allowedOrigins: UNIQUE_ORIGINS,
    });
  }

  if (err.name === "MongoNetworkError" || err.name === "MongoError") {
    return res.status(503).json({
      error: "Database Error",
      message: "Database temporarily unavailable",
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      details: err.errors,
    });
  }

  console.error(chalk.red("❌ Server Error:"), err);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: isProd ? "Something went wrong" : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
});

// =====================
// Database & Server Start
// =====================
async function startServer() {
  console.log(chalk.cyan("\n🚀 Launching Assessly Backend...\n"));
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(chalk.green(`✅ MongoDB Connected: ${conn.connection.name}`));
    console.log(chalk.magenta(`🌍 Environment: ${NODE_ENV}`));
    console.log(chalk.cyan(`🔒 Allowed Origins: ${UNIQUE_ORIGINS.length}`));

    if (AUTO_SEED) {
      console.log(chalk.yellow("🌱 Auto-seeding database..."));
      await seedDatabase();
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(chalk.green(`📡 Server listening on port ${PORT}`));
      console.log(chalk.blue(`📚 Docs: ${BACKEND_URL}/api/docs`));
      console.log(chalk.green("✅ Server Ready for Production.\n"));
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

["SIGINT", "SIGTERM"].forEach((sig) => process.on(sig, () => shutdown(sig)));

process.on("unhandledRejection", (reason) => {
  console.error(chalk.red("❌ Unhandled Rejection:"), reason);
});
process.on("uncaughtException", (err) => {
  console.error(chalk.red("❌ Uncaught Exception:"), err);
  process.exit(1);
});

startServer();
