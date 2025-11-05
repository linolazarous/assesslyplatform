/**
 * api/server.js
 * Assessly Backend - Production Server (Render-optimized)
 *
 * - Mounts API at /api/v1
 * - CORS whitelist with subdomain support
 * - Health/status/features endpoints
 * - Swagger + status monitor
 * - Optional Passport OAuth (safe if not installed)
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
import passportConfig from "./config/passport.js";     // optional Passport config

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optional Passport & OAuth setup
let passport;
let googleAuthRoutes;
let githubAuthRoutes;

try {
  passport = (await import("passport")).default;

  // initialize passport strategies (if any)
  if (passportConfig) await import("./config/passport.js");

  const modG = await import("./routes/auth/google.js").catch(() => ({}));
  const modGh = await import("./routes/auth/github.js").catch(() => ({}));
  googleAuthRoutes = modG.default || null;
  githubAuthRoutes = modGh.default || null;

  console.log(chalk.green("✅ Passport initialized (optional)."));
} catch (err) {
  console.warn(chalk.yellow("⚠️ Passport not installed or misconfigured — skipping OAuth setup."));
}

// ========== Environment ==========
const app = express();
app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || "production";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://assessly-gedp.onrender.com";
const BACKEND_URL = process.env.BACKEND_URL || `https://localhost:${PORT}`;
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
  : [FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"];

const UNIQUE_ORIGINS = [...new Set(ALLOWED_ORIGINS)];
console.log(chalk.cyan("🔒 Allowed Origins:"), UNIQUE_ORIGINS);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (UNIQUE_ORIGINS.includes(origin)) return callback(null, true);
    try {
      const originHostname = new URL(origin).hostname;
      const allowed = UNIQUE_ORIGINS.some((o) => {
        try { return new URL(o).hostname === originHostname; } 
        catch { return o === origin; }
      });
      if (allowed) return callback(null, true);
    } catch {}
    console.warn(chalk.yellow(`🚫 CORS blocked: ${origin}`));
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie", "X-API-Key", "Accept"],
  exposedHeaders: ["Content-Range", "X-Total-Count"],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ========== Security & Parsers ==========
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
app.use(xss());
app.use(mongoSanitize());
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());
app.use(morgan(isProd ? "combined" : "dev"));

app.use(statusMonitor({ title: "Assessly Server Monitor", path: "/api/monitor" }));

if (passport) app.use(passport.initialize());

// ========== Rate limiting ==========
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: "Too many authentication attempts. Try again later." } });
app.use("/api/v1/auth", authLimiter);

// ========== Root & Health ==========
app.get("/", (req, res) => res.json({
  message: "🚀 Assessly Backend API",
  environment: NODE_ENV,
  version: process.env.npm_package_version || "1.0.0",
  docs: `${BACKEND_URL}/api/docs`,
  monitor: `${BACKEND_URL}/api/monitor`,
  timestamp: new Date().toISOString()
}));

app.get(["/api/health", "/api/v1/health"], (req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), environment: NODE_ENV, database: mongoose.connection.readyState === 1 ? "connected" : "disconnected", timestamp: new Date().toISOString() })
);

// ========== Swagger & App Routes ==========
setupSwagger(app);
app.use("/api/v1", routes);

if (googleAuthRoutes) app.use("/api/v1/auth", googleAuthRoutes);
if (githubAuthRoutes) app.use("/api/v1/auth", githubAuthRoutes);

// ========== 404 & Error Handling ==========
app.use((req, res) => res.status(404).json({ error: "Endpoint not found", method: req.method, path: req.originalUrl, suggestion: "Visit /api/docs", documentation: "/api/docs" }));

app.use((err, req, res, next) => {
  if (err && /cors/i.test(err.message || "")) return res.status(403).json({ error: "CORS Error", message: "Request blocked", origin: req.headers.origin || null, allowedOrigins: UNIQUE_ORIGINS });
  if (err && (err.name === "MongoNetworkError" || err.name === "MongoError")) return res.status(503).json({ error: "Database Error", message: "Service temporarily unavailable" });
  if (err && err.name === "ValidationError") return res.status(400).json({ error: "Validation Error", message: err.message, details: err.errors });
  const status = err?.status || 500;
  res.status(status).json({ error: "Internal Server Error", message: isProd ? "Something went wrong" : err?.message || "Unknown error", ...(isProd ? {} : { stack: err?.stack }) });
});

// ========== Start Server ==========
async function startServer() {
  console.log(chalk.cyan("\n🚀 Starting Assessly Backend...\n"));
  try {
    const conn = await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 45000 });
    console.log(chalk.green("✅ MongoDB connected:"), conn.connection.name);
    console.log(chalk.magenta(`🌍 Environment: ${NODE_ENV}`));
    console.log(chalk.cyan(`🔒 Allowed Origins: ${UNIQUE_ORIGINS.join(", ")}`));

    if (AUTO_SEED) {
      console.log(chalk.yellow("🌱 Auto-seeding database..."));
      await seedDatabase();
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(chalk.green(`📡 Server listening on port ${PORT}`));
      console.log(chalk.blue(`📚 Swagger: ${BACKEND_URL}/api/docs`));
      console.log(chalk.magenta(`📊 Monitor: ${BACKEND_URL}/api/monitor`));
      console.log(chalk.green("✅ Server Ready for Production.\n"));
    });
  } catch (err) {
    console.error(chalk.red("❌ Server startup failed:"), err);
    process.exit(1);
  }
}

// ========== Graceful Shutdown ==========
const shutdown = async (signal) => {
  console.log(chalk.yellow(`\n🛑 ${signal} received — shutting down gracefully...`));
  try { await mongoose.connection.close(false); console.log(chalk.green("✅ MongoDB connection closed.")); } 
  catch (err) { console.error(chalk.red("❌ Error while closing MongoDB:"), err); }
  finally { process.exit(0); }
};
["SIGINT", "SIGTERM"].forEach(sig => process.on(sig, () => shutdown(sig)));
process.on("unhandledRejection", reason => console.error(chalk.red("❌ Unhandled Rejection:"), reason));
process.on("uncaughtException", err => { console.error(chalk.red("❌ Uncaught Exception:"), err); process.exit(1); });

startServer();
