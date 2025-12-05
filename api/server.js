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

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
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
