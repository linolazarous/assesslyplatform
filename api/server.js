// api/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ==============================
// 1. CORS Configuration
// ==============================
const allowedOrigins = [
  "http://localhost:5173",               // local dev
  "http://localhost:3000",               // local dev
  "https://assessly-frontend.onrender.com", // production frontend
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error("❌ Blocked by CORS:", origin);
        callback(new Error("CORS policy violation"), false);
      }
    },
    credentials: true,
  })
);

// ==============================
// 2. Security + Logging + Body Parsing
// ==============================
app.use(helmet());
app.use(morgan("combined")); // production logging
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ==============================
// 3. API Routes
// ==============================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Assessly backend running 🚀",
    environment: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString(),
  });
});

// Auth
app.post("/api/auth/register", (req, res) => {
  res.status(200).json({ message: "Account created. Please login." });
});

app.post("/api/auth/login", (req, res) => {
  res.status(200).json({
    token: "mock-jwt-token",
    message: "Login successful",
  });
});

// User profile example
app.get("/api/user/profile", (req, res) => {
  res.status(200).json({
    user: { id: "admin-123", name: "Admin User", email: "test@example.com", role: "admin" },
  });
});

// Example: Organizations
app.get("/api/organizations", (req, res) => {
  res.status(200).json([
    { id: "org-1", name: "Assessly Corp" },
    { id: "org-2", name: "Client Services Inc" },
  ]);
});

app.get("/api/organizations/:id", (req, res) => {
  res.status(200).json({
    id: req.params.id,
    name: "Test Organization",
    subscription: { status: "active", plan: "Professional", currentPeriodEnd: Date.now() + 30*24*60*60*1000 },
  });
});

// Add other API routes here (Assessments, Billing, Admin, etc.)

// ==============================
// 4. 404 Handler for unknown API routes
// ==============================
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// ==============================
// 5. Global Error Handler
// ==============================
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ==============================
// 6. Start Server
// ==============================
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Backend running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
});
