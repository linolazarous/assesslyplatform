// api/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ----------------------------
// 1. CORS
// ----------------------------
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://assessly-frontend.onrender.com",
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

// ----------------------------
// 2. Security + Logging + Middleware
// ----------------------------
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ----------------------------
// 3. API Routes
// ----------------------------
// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Assessly backend running 🚀" });
});

// Auth routes
app.post("/api/auth/register", (req, res) => {
  res.status(200).json({ message: "Account created. Please login." });
});

app.post("/api/auth/login", (req, res) => {
  res.status(200).json({ token: "mock-jwt-token", message: "Login successful" });
});

// Example user route
app.get("/api/user/profile", (req, res) => {
  res.status(200).json({ user: { id: "admin-123", name: "Admin User" } });
});

// Add your other API routes here…

// ----------------------------
// 4. 404 for non-API routes
// ----------------------------
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ----------------------------
// 5. Global Error Handling
// ----------------------------
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ----------------------------
// 6. Start Server
// ----------------------------
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Backend running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
});
