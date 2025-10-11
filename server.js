import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Check if we have built files
const distPath = path.join(__dirname, "dist");
const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, "index.html"));

if (hasDist) {
  // Production: Serve built assets from the 'dist' directory
  console.log('✅ Serving built React app from dist/');
  app.use(express.static(distPath));
} else {
  // Development: Serve development assets from the root directory
  console.log('⚠️ No built files found, serving source files from root directory.');
  // Serves everything directly from the project root (where index.html is)
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
  // Mock successful registration
  res.status(200).json({ message: "Account created. Please login." });
});

app.post('/api/auth/login', (req, res) => {
  // Mock JWT token (e.g., for user role 'admin', user ID '123')
  const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbi0xMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE5MTk5MDMyMDB9.xWlP3yQ5nE_g8t7t2p8z2F0q3tJ4g7k9R6_p2G9mXhI";
  res.status(200).json({ 
    token: mockToken, 
    message: "Login successful" 
  });
});

app.get('/api/user/profile', (req, res) => {
  res.status(200).json({ 
    user: { 
      id: "admin-123", 
      name: "Admin User", 
      email: "test@example.com",
      role: "admin"
    } 
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
        currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days out
    }
  });
});

// --- Assessment Routes ---
app.get('/api/assessments', (req, res) => {
  const { status } = req.query;
  res.status(200).json({
    assessments: [
      { id: "a-1", title: "Quarterly Review", createdAt: Date.now(), status: "active", dueDate: Date.now() + 86400000 },
      { id: "a-2", title: "Onboarding Quiz", createdAt: Date.now(), status: "in_progress", dueDate: null },
      { id: "a-3", title: "Final Exam", createdAt: Date.now(), status: "completed", dueDate: Date.now() - 86400000 },
    ].filter(a => a.status === status)
  });
});

app.get('/api/assessments/:id', (req, res) => {
    // Mock detailed assessment data
    res.status(200).json({
        id: req.params.id,
        title: `Mock Assessment ${req.params.id}`,
        description: "This is a mock description for the assessment.",
        timeLimitMinutes: 30,
        startedAt: Date.now(),
        questions: [
            { id: 1, text: "What is 2 + 2?", type: "multiple_choice", required: true, options: ["3", "4", "5"] },
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

// --- Admin/Search/Billing Mock Routes ---
app.get('/api/admin/stats', (req, res) => { res.status(200).json({ assessments: 15, activeUsers: 8, organizations: 2, completions: 12 }); });
app.get('/api/admin/assessments', (req, res) => { res.status(200).json([]); });

app.post('/api/search', (req, res) => {
  res.status(200).json({ results: [] });
});

app.post('/api/billing/portal-link', (req, res) => {
  res.status(200).json({ url: "https://mock-stripe-portal.com/billing" });
});

app.post('/api/billing/checkout-session', (req, res) => {
  res.status(200).json({ url: "https://mock-stripe-checkout.com/pay" });
});

app.get('/api/billing/invoices', (req, res) => {
    res.status(200).json({
        invoices: [
            { id: 'inv-1', created: Date.now() / 1000 - 86400 * 30, total: 10000, status: 'paid', invoice_pdf: 'http://example.com/invoice.pdf' },
            { id: 'inv-2', created: Date.now() / 1000 - 86400 * 60, total: 5000, status: 'paid', invoice_pdf: null },
        ]
    });
});

// =========================================================
// --- Frontend Serving (Must be last) ---
// =========================================================

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
  console.log(`🌐 Frontend: http://localhost:${port}/`);
  if (!hasDist) {
    console.log(`⚠️ Running in development mode - build the app with 'npm run build' for production`);
  }
});
