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
  // Production: Serve from dist directory
  console.log('✅ Serving built React app from dist/');
  app.use(express.static(distPath));
  app.use('/assets', express.static(path.join(distPath, 'assets')));
} else {
  // Development: Serve from root and src directory
  console.log('⚠️ No built files found, serving source files');
  app.use(express.static(__dirname));
  app.use('/src', express.static(path.join(__dirname, 'src')));
  app.use('/public', express.static(path.join(__dirname, 'public')));
}

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server running successfully",
    mode: hasDist ? "production" : "development",
    timestamp: new Date().toISOString()
  });
});

// ===== BASIC API ROUTES =====
app.post('/api/auth/register', (req, res) => {
  res.json({ message: "Register endpoint" });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ message: "Login endpoint" });
});

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

app.get('/api/search', (req, res) => {
  const { q } = req.query;
  res.json({ 
    results: [],
    query: q,
    message: "Search functionality"
  });
});

app.get('/api/organizations/:orgId', (req, res) => {
  res.json({ 
    organization: {
      id: req.params.orgId,
      name: "Test Organization"
    }
  });
});

// Admin routes
app.get('/api/admin/assessments', (req, res) => {
  res.json({ assessments: [] });
});

app.get('/api/admin/stats', (req, res) => {
  res.json({ stats: {} });
});

app.get('/api/admin/user-activity', (req, res) => {
  res.json({ activity: [] });
});

// Billing routes
app.post('/api/billing/checkout-session', (req, res) => {
  res.json({ session: null });
});

app.post('/api/billing/webhook', (req, res) => {
  res.json({ received: true });
});

app.get('/api/cron/expiring-subscriptions', (req, res) => {
  res.json({ message: "Cron job" });
});

// Serve appropriate file
app.get("*", (req, res) => {
  if (hasDist) {
    res.sendFile(path.join(distPath, "index.html"));
  } else {
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
