// api/routes/index.js
import express from 'express';
import mongoose from 'mongoose';
import usersRoutes from './users.routes.js';
import organizationsRoutes from './organizations.routes.js';
import assessmentsRoutes from './assessments.routes.js';
import responsesRoutes from './responses.routes.js';
import subscriptionsRoutes from './subscriptions.routes.js';
import activitiesRoutes from './activities.routes.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Route modules
router.use('/users', usersRoutes);
router.use('/organizations', organizationsRoutes);
router.use('/assessments', assessmentsRoutes);
router.use('/responses', responsesRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/activities', activitiesRoutes);

// 404 fallback
router.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

export default router;
