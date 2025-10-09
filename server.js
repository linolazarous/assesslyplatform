import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { connectDB } from "./api/db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

connectDB();

// Import API routes
import createUser from './api/auth/create-user.js';
import register from './api/auth/register.js';
import login from './api/auth/login.js';
import search from './api/search.js';
import assessments from './api/admin/assessments.js';
import stats from './api/admin/stats.js';
import userActivity from './api/admin/user-activity.js';
import checkoutSession from './api/billing/checkout-session.js';
import webhook from './api/billing/webhook.js';
import expiringSubscriptions from './api/cron/expiring-subscriptions.js';
import organizations from './api/organizations/organizations.js'; // Updated import

// Import middleware
import { authenticateToken, requireRole } from './api/middleware/auth.js';

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
app.post('/api/billing/webhook', webhook); // Webhooks typically don't require auth

// ===== CRON ROUTES =====
app.get('/api/cron/expiring-subscriptions', expiringSubscriptions);

// ===== ORGANIZATIONS ROUTES =====
app.get('/api/organizations/:orgId', authenticateToken, organizations);

// ===== PROTECTED USER ROUTES =====
app.get('/api/user/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Serve frontend
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server running successfully" });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Assessly running on port ${PORT}`)
);
