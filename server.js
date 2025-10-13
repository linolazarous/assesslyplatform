import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

// Load environment variables
dotenv.config();

// Determine file paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;

// --- Security and Middleware ---

// Configure CORS to allow communication from the frontend's official URL
const allowedOrigins = [
  'http://localhost:5173', // Vite default development port
  'http://localhost:3000',
  'https://assesslyplatform.onrender.com' // Official deployment URL
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests) or if the origin is allowed
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Check if built files exist (standard convention: 'dist' folder)
const distPath = path.join(__dirname, "dist");
const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, "index.html"));

// --- File Serving ---

if (hasDist) {
  // Production: Serve built assets from the 'dist' directory
  console.log('✅ Serving built React app from dist/');
  app.use(express.static(distPath));
} else {
  // Development: Serve development assets from the root directory
  console.log('⚠️ No built files found, serving source files from root directory.');
  app.use(express.static(__dirname));
  app.use('/src', express.static(path.join(__dirname, 'src')));
}

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// =========================================================
// ===== MOCK API ROUTES (Must match frontend calls) =====
// =========================================================

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server running successfully",
    mode: hasDist ? "production" : "development",
    timestamp: new Date().toISOString()
  });
});

// --- Auth Routes ---
app.post('/api/auth/register', (req, res) => {
  res.status(200).json({ message: "Account created. Please login." });
});

app.post('/api/auth/login', (req, res) => {
  // Mock JWT token (EXPIRATION: Oct 2026 - to prevent immediate expiry errors)
  const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbi0xMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3OTIyMDAwMDB9.i8XlY5h7O-D6p4t9UqL0p7m4E1j3v0q3tJ4g7k9R6_p2G9mXhI";
  res.status(200).json({ 
    token: mockToken, 
    message: "Login successful" 
  });
});

app.get('/api/user/profile', (req, res) => {
  res.status(200).json({ 
    user: { id: "admin-123", name: "Admin User", email: "test@example.com", role: "admin" } 
  });
});

// --- Organization & Selector Routes ---
app.get('/api/organizations', (req, res) => {
  res.status(200).json([
    { id: "org-1", name: "Assessly Corp" },
    { id: "org-2", name: "Client Services Inc" }
  ]);
});

app.get('/api/organizations/:orgId', (req, res) => {
  res.status(200).json({ 
    id: req.params.orgId,
    name: "Test Organization Name",
    subscription: {
        status: 'active',
        plan: 'Professional',
        currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000)
    }
  });
});

// --- Assessment Routes ---
app.get('/api/assessments', (req, res) => {
  const { status } = req.query;
  const mockAssessments = [
      { id: "a-1", title: "Quarterly Review", createdAt: Date.now(), status: "active", dueDate: Date.now() + 86400000 },
      { id: "a-2", title: "Onboarding Quiz", createdAt: Date.now(), status: "in_progress", dueDate: null },
      { id: "a-3", title: "Final Exam", createdAt: Date.now(), status: "completed", dueDate: Date.now() - 86400000 },
  ];
  res.status(200).json({
    assessments: status ? mockAssessments.filter(a => a.status === status) : mockAssessments
  });
});

app.get('/api/assessments/:id', (req, res) => {
    res.status(200).json({
        id: req.params.id,
        title: `Mock Assessment ${req.params.id}`,
        description: "This is a mock description for the assessment.",
        timeLimitMinutes: 30,
        startedAt: Date.now(),
        questions: [
            { id: 1, text: "What is 2 + 2?", type: "multiple_choice", required: true, options: ["3", "4", "5"], correctAnswer: "4" },
            { id: 2, text: "Explain React hooks.", type: "text", required: true },
        ]
    });
});

app.post('/api/assessments/:id/start', (req, res) => {
    res.status(200).json({ message: "Assessment status set to in_progress" });
});

app.post('/api/assessments/:id/submit', (req, res) => {
    res.status(200).json({ message: "Assessment submitted successfully" });
});

app.post('/api/assessments/create', (req, res) => {
    res.status(201).json({ message: "Assessment created" });
});

// --- AI Scoring Endpoint (Matches frontend utility call) ---
app.post('/api/assessments/ai-score', (req, res) => {
  // Simple mock response to satisfy the frontend's AI scoring utility
  res.status(200).json({
    score: 85,
    feedback: ["AI Mock: Excellent job integrating key concepts."],
    confidence: 0.9
  });
});


// --- Admin/Search/Billing Mock Routes (Consolidated) ---
app.get('/api/admin/stats', (req, res) => { res.status(200).json({ assessments: 15, activeUsers: 8, organizations: 2, completions: 12 }); });
app.get('/api/admin/assessments', (req, res) => { res.status(200).json([]); });
app.post('/api/search', (req, res) => { res.status(200).json({ results: [] }); });
app.post('/api/billing/portal-link', (req, res) => { res.status(200).json({ url: "https://mock-stripe-portal.com/billing" }); });
app.post('/api/billing/checkout-session', (req, res) => { res.status(200).json({ url: "https://mock-stripe-checkout.com/pay" }); });
app.get('/api/billing/invoices', (req, res) => {
    res.status(200).json({
        invoices: [
            { id: 'inv-1', created: Date.now() / 1000 - 86400 * 30, total: 10000, status: 'paid', invoice_pdf: 'http://example.com/invoice.pdf' },
            { id: 'inv-2', created: Date.now() / 1000 - 86400 * 60, total: 5000, status: 'paid', invoice_pdf: null },
        ]
    });
});

// --- Frontend Serving (Must be last for SPA routing) ---

// Serve index.html for all other GET requests (SPA routing)
app.get("*", (req, res) => {
  if (hasDist) {
    res.sendFile(path.join(distPath, "index.html"));
  } else {
    // Serve index.html from the root directory during development
    res.sendFile(path.join(__dirname, "index.html"));
  }
});

app.listen(port, () => {
  console.log(`🚀 Assessly running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`🌐 Frontend: https://assesslyplatform.onrender.com (or http://localhost:${port}/)`);
  if (!hasDist) {
    console.log(`⚠️ Running in development mode - build the app with 'npm run build' for production`);
  }
});
