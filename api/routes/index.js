import express from 'express';
import usersRouter from './users.js';
import organizationsRouter from './organizations.js';
import assessmentsRouter from './assessments.js';
import assessmentResponsesRouter from './assessmentResponses.js';
import subscriptionsRouter from './subscriptions.js';
import userActivitiesRouter from './userActivities.js';

const router = express.Router();

// Mount all your existing routes
router.use('/users', usersRouter);
router.use('/organizations', organizationsRouter);
router.use('/assessments', assessmentsRouter);
router.use('/assessment-responses', assessmentResponsesRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/user-activities', userActivitiesRouter);

// ✅ ADD THESE HEALTH AND DEBUG ROUTES
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'production',
    frontend: process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com',
    service: 'Assessly Backend API'
  });
});

router.get('/debug', (req, res) => {
  res.json({ 
    env: process.env.NODE_ENV || 'production',
    allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://assessly-gedp.onrender.com'],
    corsEnabled: true,
    autoSeed: process.env.AUTO_SEED === 'true',
    frontendUrl: process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com'
  });
});

// ✅ ADD A SIMPLE AUTH ROUTE FOR TESTING
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Simple validation
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // For testing - accept any credentials and return a token
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwicm9sZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBhc3Nlc3NseS5jb20iLCJpYXQiOjE3MzAzODQ3MTIsImV4cCI6MTczMDk4OTUxMn0.test-token-for-development-only';
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: '1',
        email: email,
        role: 'admin',
        name: 'Admin User'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
});

router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, role = 'assessor', name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        message: 'Email, password, and name are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Return success with test token
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyIiwicm9sZSI6ImFzc2Vzc29yIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzMwMzg0NzEyLCJleHAiOjE3MzA5ODk1MTJ9.test-token-for-development-only';

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: '2',
        email: email,
        role: role,
        name: name
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
});

export default router;
