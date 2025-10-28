import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// 1. CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://assesslyplatform.onrender.com",
  "https://assessly-frontend.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) =>
      !origin || allowedOrigins.includes(origin)
        ? callback(null, true)
        : callback(new Error("CORS policy violation"), false),
    credentials: true,
  })
);

// 2. Security & Middleware
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 3. Serve React Frontend (ensure ../dist exists)
const frontendDist = path.join(__dirname, "../dist");
app.use(express.static(frontendDist));

// 4. API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// --- Add all other /api/... routes here ---
// e.g., /auth, /organizations, /assessments, /billing, etc.

// 5. SPA Fallback (React Router)
app.get("*", (req, res, next) => {
  if (req.originalUrl.startsWith("/api")) return next();
  res.sendFile(path.join(frontendDist, "index.html"));
});

// 6. Global Error Handling
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.message || err);
  res.status(500).json({ error: "Internal server error" });
});

// 7. Start Server
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Backend running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
});
