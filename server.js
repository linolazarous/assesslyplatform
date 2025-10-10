import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files from root directory
app.use(express.static(__dirname));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server running successfully",
    timestamp: new Date().toISOString()
  });
});

// ===== BASIC API ROUTES =====

// Auth routes
app.post('/api/auth/register', (req, res) => {
  res.json({ message: "Register endpoint - implement later" });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ message: "Login endpoint - implement later" });
});

// User profile route
app.get('/api/user/profile', (req, res) => {
  res.json({ 
    user: { 
      id: "1", 
      name: "Test User", 
      email: "test@example.com",
      role: "user"
    } 
  });
});

// Search route
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  res.json({ 
    results: [],
    query: q,
    message: "Search functionality - implement later"
  });
});

// Organizations route
app.get('/api/organizations/:orgId', (req, res) => {
  res.json({ 
    organization: {
      id: req.params.orgId,
      name: "Test Organization"
    }
  });
});

// ===== PROTECTED ROUTES =====

// Admin routes
app.get('/api/admin/assessments', (req, res) => {
  res.json({ assessments: [], message: "Admin assessments - add auth later" });
});

app.get('/api/admin/stats', (req, res) => {
  res.json({ stats: {}, message: "Admin stats - add auth later" });
});

app.get('/api/admin/user-activity', (req, res) => {
  res.json({ activity: [], message: "User activity - add auth later" });
});

// Billing routes
app.post('/api/billing/checkout-session', (req, res) => {
  res.json({ session: null, message: "Billing - implement later" });
});

app.post('/api/billing/webhook', (req, res) => {
  res.json({ received: true });
});

// Cron route
app.get('/api/cron/expiring-subscriptions', (req, res) => {
  res.json({ message: "Cron job endpoint" });
});

// Serve index.html for all other routes (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

app.listen(port, () => {
  console.log(`🚀 Assessly running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`🌐 Frontend: http://localhost:${port}/`);
});
