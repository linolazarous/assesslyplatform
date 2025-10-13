// api/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ✅ Configure allowed origins
const allowedOrigins = [
  "http://localhost:5173", // local dev
  "http://localhost:3000",
  "https://assessly-frontend.onrender.com" // your Render static frontend URL
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy violation"), false);
      }
    },
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================================================
// ===== MOCK API ROUTES (Backend only, no static serving) ===
// =========================================================

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Assessly backend running successfully 🚀",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ✅ Auth Routes
app.post("/api/auth/register", (req, res) => {
  res.status(200).json({ message: "Account created. Please login." });
});

app.post("/api/auth/login", (req, res) => {
  const mockToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbi0xMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3OTIyMDAwMDB9.i8XlY5h7O-D6p4t9UqL0p7m4E1j3v0q3tJ4g7k9R6_p2G9mXhI";
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

// ✅ Organization & Assessment APIs
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

// ✅ Assessments
app.get("/api/assessments", (req, res) => {
  const mockAssessments = [
    { id: "a-1", title: "Quarterly Review", status: "active" },
    { id: "a-2", title: "Onboarding Quiz", status: "in_progress" },
    { id: "a-3", title: "Final Exam", status: "completed" },
  ];
  const { status } = req.query;
  res.status(200).json({
    assessments: status
      ? mockAssessments.filter((a) => a.status === status)
      : mockAssessments,
  });
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

// ✅ AI scoring mock
app.post("/api/assessments/ai-score", (req, res) => {
  res.status(200).json({
    score: 92,
    feedback: ["Strong understanding of concepts.", "Minor mistakes noted."],
    confidence: 0.95,
  });
});

// ✅ Billing/Admin
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

// ✅ Catch-all for unknown routes
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ✅ Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Assessly backend running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
});
