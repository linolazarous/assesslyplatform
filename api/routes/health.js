// api/routes/health.js
import express from 'express';
import { dbHealth } from '../controllers/healthController.js';

const router = express.Router();

/**
 * @route   GET /api/health/db
 * @desc    Check database connection health
 * @access  Public
 */
router.get('/db', dbHealth);

/**
 * @route   GET /api/health
 * @desc    General API health check
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;
