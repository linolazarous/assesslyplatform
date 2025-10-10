import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import and initialize DB with error handling
let dbConnected = false;
try {
  const { connectDB } = await import('./api/db.js');
  await connectDB();
  dbConnected = true;
  console.log('✅ Database connected successfully');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server running successfully",
    database: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// Import API routes with error handling
const setupRoutes = async () => {
  try {
    // Import routes
    const { default: createUser } = await import('./api/auth/create-user.js');
    const { default: register } = await import('./api/auth/register.js');
    const { default: login } = await import('./api/auth/login.js');
    const { default: search } = await import('./api/search.js');
    const { default: assessments } = await import('./api/admin/assessments.js');
    const { default: stats } = await import('./api/admin/stats.js');
    const { default: userActivity } = await import('./api/admin/user-activity.js');
    const { default: checkoutSession } = await import('./api/billing/checkout-session.js');
    const { default: webhook } = await import('./api/billing/webhook.js');
    const { default: expiringSubscriptions } = await import('./api/cron/expiring-subscriptions.js');
    const { default: organizations } = await import('./api/organizations/organizations.js');
    const { authenticateToken, requireRole } = await import('./api/middleware/auth.js');

    // ===== AUTH ROUTES =====
    app.post('/api/auth/create-user', createUser);
    app.post('/api/auth/register', register);
    app.post('/api/auth/login', login);

    // ===== SEARCH ROUTE =====
    app.get('/api/search', search);

    // ===== ADMIN ROUTES (Protected) =====
    app.get('/api/admin/assessments', authenticateToken, requireRole(['admin']), assessments);
    app.get('/api/admin/stats', authenticateToken, requireRole(['admin']), stats);
    app.get('/api/admin/user-activity', authenticateToken, requireRole(['admin']), userActivity);

    // ===== BILLING ROUTES =====
    app.post('/api/billing/checkout-session', authenticateToken, checkoutSession);
    app.post('/api/billing/webhook', webhook);

    // ===== CRON ROUTES =====
    app.get('/api/cron/expiring-subscriptions', expiringSubscriptions);

    // ===== ORGANIZATIONS ROUTES =====
    app.get('/api/organizations/:orgId', authenticateToken, organizations);

    // ===== PROTECTED USER ROUTES =====
    app.get('/api/user/profile', authenticateToken, (req, res) => {
      res.json({ user: req.user });
    });

    console.log('✅ All routes loaded successfully');
  } catch (error) {
    console.error('❌ Error loading routes:', error);
  }
};

await setupRoutes();

// Serve frontend - static files
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// SPA fallback - must be last
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Assessly running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
