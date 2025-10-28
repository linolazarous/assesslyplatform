// api/server.js
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

// ======================================================
// ✅ 1. CORS Configuration — Restrict to Trusted Origins
// ======================================================
const allowedOrigins = [
  "http://localhost:5173", // local frontend dev
  "http://localhost:3000",
  "https://assesslyplatform.onrender.com", // backend
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
    credentials: true, // allow cookies and headers
  })
);

// ======================================================
// ✅ 2. Security, Logging, and Middleware
// ======================================================
app.use(helmet()); // adds secure HTTP headers
app.use(morgan("dev")); // logs API requests
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ======================================================
// ✅ 3. Serve React Frontend
// ======================================================
app.use(express.static(path.join(__dirname, "../dist"))); // serve static files

// ======================================================
// ✅ 4. API Routes
// ======================================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Assessly backend running successfully 🚀",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// --- Auth Routes ---
app.post("/api/auth/register", (req, res) => {
  res.status(200).json({ message: "Account created. Please login." });
});

app.post("/api/auth/login", (req, res) => {
  const mockToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." +
    "i8XlY5h7O-D6p4t9UqL0p7m4E1j3v0q3tJ4g7k9R6_p2G9mXhI";
  res.status(200).json({
    token: mockToken,
    message: "Login successful",
  });
});

app.get("/api/user/profile", (req, res) => {
  res.status(200).json({
    user: {
      id: "admin-123",
      name: "Admin User",
      email: "test@example.com",
      role: "admin",
    },
  });
});

// --- Organization Routes ---
app.get("/api/organizations", (req, res) => {
  res.status(200).json([
    { id: "org-1", name: "Assessly Corp" },
    { id: "org-2", name: "Client Services Inc" },
  ]);
});

app.get("/api/organizations/:orgId", (req, res) => {
  res.status(200).json({
    id: req.params.orgId,
    name: "Test Organization",
    subscription: {
      status: "active",
      plan: "Professional",
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
    },
  });
});

// --- Assessment Routes ---
app.get("/api/assessments", (req, res) => {
  const mockAssessments = [
    { id: "a-1", title: "Quarterly Review", status: "active" },
    { id: "a-2", title: "Onboarding Quiz", status: "in_progress" },
    { id: "a-3", title: "Final Exam", status: "completed" },
  ];
  const { status } = req.query;
  const filtered = status
    ? mockAssessments.filter((a) => a.status === status)
    : mockAssessments;
  res.status(200).json({ assessments: filtered });
});

app.get("/api/assessments/:id", (req, res) => {
  res.status(200).json({
    id: req.params.id,
    title: `Mock Assessment ${req.params.id}`,
    description: "Mock assessment description",
    timeLimitMinutes: 30,
    questions: [
      {
        id: 1,
        text: "What is 2 + 2?",
        type: "multiple_choice",
        options: ["3", "4", "5"],
        correctAnswer: "4",
      },
    ],
  });
});

app.post("/api/assessments/create", (req, res) => {
  res.status(201).json({ message: "Assessment created" });
});

app.post("/api/assessments/:id/start", (req, res) => {
  res.status(200).json({ message: "Assessment started" });
});

app.post("/api/assessments/:id/submit", (req, res) => {
  res.status(200).json({ message: "Assessment submitted successfully" });
});

app.post("/api/assessments/ai-score", (req, res) => {
  res.status(200).json({
    score: 92,
    feedback: ["Strong understanding of concepts.", "Minor mistakes noted."],
    confidence: 0.95,
  });
});

// --- Billing & Admin Routes ---
app.get("/api/admin/stats", (req, res) => {
  res.status(200).json({
    assessments: 15,
    activeUsers: 8,
    organizations: 2,
    completions: 12,
  });
});

app.post("/api/search", (req, res) => {
  res.status(200).json({ results: [] });
});

app.post("/api/billing/checkout-session", (req, res) => {
  res.status(200).json({ url: "https://mock-stripe-checkout.com/pay" });
});

app.post("/api/billing/portal-link", (req, res) => {
  res.status(200).json({ url: "https://mock-stripe-portal.com/billing" });
});

app.get("/api/billing/invoices", (req, res) => {
  res.status(200).json({
    invoices: [
      {
        id: "inv-1",
        total: 10000,
        status: "paid",
        invoice_pdf: "https://example.com/invoice.pdf",
      },
    ],
  });
});

// ======================================================
// ✅ 5. React Router Fallback for SPA (After API routes)
// ======================================================
app.get("*", (req, res, next) => {
  if (req.originalUrl.startsWith("/api")) return next(); // skip API routes
  res.sendFile(path.join(__dirname, "../dist", "index.html"));
});

// ======================================================
// ✅ 6. Global Error Handling
// ======================================================
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ======================================================
// ✅ 7. Start Server
// ======================================================
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Assessly backend running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
});
