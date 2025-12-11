/**
 * server.js – Assessly Platform API v1.0.0
 * Production-ready multi-tenant assessment platform API
 * Implements complete API documentation as specified
 */

import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import morgan from 'morgan';
import chalk from 'chalk';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import statusMonitor from 'express-status-monitor';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Import route modules
import authRoutes from './api/routes/auth.js';
import userRoutes from './api/routes/users.js';
import organizationRoutes from './api/routes/organizations.js';
import assessmentRoutes from './api/routes/assessments.js';
import responseRoutes from './api/routes/responses.js';
import subscriptionRoutes from './api/routes/subscriptions.js';
import analyticsRoutes from './api/routes/analytics.js';
import monitoringRoutes from './api/routes/monitoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

// Environment
const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com';
const BACKEND_URL = process.env.BACKEND_URL || `https://assesslyplatform-t49h.onrender.com`;
const MONGODB_URI = process.env.MONGODB_URI;
const isProd = NODE_ENV === 'production';

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
for (const name of requiredEnvVars) {
  if (!process.env[name]) {
    console.error(chalk.red(`❌ Missing required environment variable: ${name}`));
    process.exit(1);
  }
}

// ======== Request ID Middleware ========
app.use((req, res, next) => {
  try {
    req.id = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
  } catch (err) {
    req.id = crypto.randomBytes(16).toString('hex');
  }
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ======== Response Time Header Middleware ========
app.use((req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    try {
      const duration = Date.now() - start;
      if (!res.headersSent) {
        res.setHeader('X-Response-Time', `${duration}ms`);
      } else {
        try { res.setHeader('X-Response-Time', `${duration}ms`); } catch (e) { /* ignore */ }
      }

      if (duration > 1000) {
        console.log(chalk.yellow(`⚠️  Slow request detected: ${req.method} ${req.originalUrl} - ${duration}ms - Request ID: ${req.id}`));
      }
    } catch (err) {
      console.error(chalk.red('Error while setting X-Response-Time header:'), err);
    }
    return originalEnd.apply(this, args);
  };

  next();
});

// ======== Rate Limiting Configuration ========
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute for auth
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    requestId: req.id
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by organization if available, otherwise by IP
    const orgId = req.headers['x-organization-id'] || req.user?.organization || req.ip;
    return `${req.ip}-${orgId}`;
  },
  message: {
    success: false,
    error: 'Too many requests from this organization, please try again later.',
    requestId: req.id
  }
});

const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 uploads per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.id || req.ip;
    return `${req.ip}-${userId}`;
  },
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.',
    requestId: req.id
  }
});

// ======== Morgan Logging ========
morgan.token('request-id', (req) => req.id || '-');
morgan.token('x-response-time', (req, res) => res.getHeader('X-Response-Time') || '-');

const morganFormat = isProd
  ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :x-response-time - reqid=:request-id'
  : ':method :url :status :res[content-length] - :x-response-time - reqid=:request-id';

app.use(morgan(morganFormat));

// ======== CORS Configuration ========
const corsOptions = {
  origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-Organization-ID'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'X-Request-ID', 'X-Response-Time']
};
app.use(cors(corsOptions));

// ======== Security Middleware ========
app.use(helmet({
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", BACKEND_URL, FRONTEND_URL]
    }
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(xss());
app.use(mongoSanitize());
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ======== Status Monitor (dev only) ========
if (!isProd) {
  app.use(statusMonitor());
}

// ======== Root & Health Endpoints ========
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Assessly Platform API v1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    requestId: req.id,
    links: {
      frontend: FRONTEND_URL,
      apiDocumentation: `${BACKEND_URL}/api/docs`,
      healthCheck: `${BACKEND_URL}/health`,
      serviceStatus: `${BACKEND_URL}/api/v1/health/status`,
      platformDocumentation: 'https://docs.assessly.com'
    },
    support: {
      email: 'assesslyinc@gmail.com',
      website: 'https://assessly.com/support'
    },
    terms: 'https://assessly.com/terms',
    license: 'MIT'
  });
});

app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  res.json({
    success: true,
    status: 'healthy',
    service: 'Assessly Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    requestId: req.id,
    uptimeSeconds: Math.floor(process.uptime()),
    environment: NODE_ENV,
    memoryMB: {
      rss: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(2)),
      heapTotal: Number((process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)),
      heapUsed: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2))
    },
    database: dbStatus
  });
});

// ======== Error Logging Endpoint (for client-side errors) ========
app.post('/errors/log', (req, res) => {
  try {
    const errorData = req.body;
    const requestId = req.id;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    console.warn(chalk.yellow('📝 Client Error Report:'), {
      requestId,
      ip,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ...errorData
    });
    
    return res.status(200).json({
      success: true,
      message: 'Error logged successfully',
      requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(chalk.red('❌ Error logging endpoint error:'), error);
    return res.status(500).json({
      success: false,
      error: 'Failed to log error',
      requestId: req.id
    });
  }
});

// ======== Authentication Middleware ========
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        requestId: req.id
      });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          success: false,
          error: 'Invalid or expired token',
          requestId: req.id
        });
      }
      
      req.user = user;
      next();
    });
  } catch (error) {
    console.error(chalk.red(`❌ Authentication error [${req.id}]:`), error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      requestId: req.id
    });
  }
};

// ======== JWT Refresh Endpoint ========
async function handleRefresh(req, res) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided',
        requestId: req.id
      });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, payload) => {
      if (err || !payload) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired refresh token',
          requestId: req.id
        });
      }

      const accessToken = jwt.sign(
        {
          id: payload.id,
          email: payload.email,
          role: payload.role,
          organization: payload.organization
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      return res.json({
        success: true,
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 900,
        requestId: req.id
      });
    });
  } catch (err) {
    console.error(chalk.red(`❌ Refresh token handler error [${req.id}]:`), err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      requestId: req.id
    });
  }
}

// Expose both GET and POST for refresh endpoint
app.get('/api/v1/auth/refresh', handleRefresh);
app.post('/api/v1/auth/refresh', handleRefresh);

// ======== API Routes ========
const apiRouter = express.Router();

// Apply rate limiters to specific routes
apiRouter.post('/auth/register', authLimiter);
apiRouter.post('/auth/login', authLimiter);
apiRouter.post('/auth/forgot-password', authLimiter);
apiRouter.post('/auth/reset-password', authLimiter);

// Apply API limiter to all other routes
apiRouter.use(apiLimiter);

// Protected routes (require authentication)
apiRouter.use('/users', authenticateToken, userRoutes);
apiRouter.use('/organizations', authenticateToken, organizationRoutes);
apiRouter.use('/assessments', authenticateToken, assessmentRoutes);
apiRouter.use('/responses', authenticateToken, responseRoutes);
apiRouter.use('/subscriptions', authenticateToken, subscriptionRoutes);
apiRouter.use('/analytics', authenticateToken, analyticsRoutes);

// Public routes (no authentication required)
apiRouter.use('/auth', authRoutes);
apiRouter.use('/health', monitoringRoutes);

// Apply upload limiter to file upload routes
apiRouter.post('/assessments/:id/upload', authenticateToken, uploadLimiter);
apiRouter.post('/users/:id/avatar', authenticateToken, uploadLimiter);

// Health check endpoint
apiRouter.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    service: 'Assessly API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    requestId: req.id
  });
});

// Register API router
app.use('/api/v1', apiRouter);

// ======== Swagger Documentation ========
if (!isProd) {
  try {
    const swaggerJsdoc = await import('swagger-jsdoc');
    const swaggerUi = await import('swagger-ui-express');
    
    const swaggerOptions = {
      definition: {
        openapi: '3.1.0',
        info: {
          title: 'Assessly Platform API',
          version: '1.0.0',
          description: 'Comprehensive multi-tenant assessment platform API',
          contact: {
            name: 'Assessly Platform Support',
            email: 'assesslyinc@gmail.com',
            url: 'https://assessly.com/support'
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
          }
        },
        servers: [
          {
            url: `${BACKEND_URL}/api/v1`,
            description: 'Production Server'
          }
        ],
        components: {
          securitySchemes: {
            BearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            OAuth2: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  authorizationUrl: `${BACKEND_URL}/api/v1/auth/google`,
                  tokenUrl: `${BACKEND_URL}/api/v1/auth/google/callback`,
                  scopes: {
                    'profile': 'Access user profile',
                    'email': 'Access user email'
                  }
                }
              }
            }
          },
          schemas: {
            Error: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string' },
                code: { type: 'string' },
                errors: { type: 'object' },
                stack: { type: 'string' }
              }
            },
            SuccessResponse: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string' },
                data: { type: 'object' }
              }
            },
            AuthResponse: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                token: { type: 'string' },
                refreshToken: { type: 'string' },
                user: { $ref: '#/components/schemas/User' }
              }
            },
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string' },
                isActive: { type: 'boolean' },
                emailVerified: { type: 'boolean' },
                organization: { type: 'string' },
                profile: { type: 'object' },
                preferences: { type: 'object' },
                lastLogin: { type: 'string', format: 'date-time' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            Organization: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' },
                description: { type: 'string' },
                industry: { type: 'string' },
                size: { type: 'string' },
                contact: { type: 'object' },
                settings: { type: 'object' },
                subscription: { type: 'object' },
                metadata: { type: 'object' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            Assessment: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                slug: { type: 'string' },
                questions: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Question' }
                },
                settings: { $ref: '#/components/schemas/AssessmentSettings' },
                status: { type: 'string' },
                category: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                totalPoints: { type: 'integer' },
                passingScore: { type: 'integer' },
                access: { type: 'string' },
                isTemplate: { type: 'boolean' },
                createdBy: { type: 'string' },
                organization: { type: 'string' },
                schedule: { type: 'object' },
                metadata: { type: 'object' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            Question: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'coding'] },
                question: { type: 'string' },
                description: { type: 'string' },
                points: { type: 'integer' },
                options: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/QuestionOption' }
                },
                correctAnswer: { type: 'string' },
                explanation: { type: 'string' },
                metadata: { type: 'object' }
              }
            },
            QuestionOption: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
                isCorrect: { type: 'boolean' }
              }
            },
            AssessmentSettings: {
              type: 'object',
              properties: {
                duration: { type: 'integer' },
                attempts: { type: 'integer' },
                shuffleQuestions: { type: 'boolean' },
                shuffleOptions: { type: 'boolean' },
                showResults: { type: 'boolean' },
                allowBacktracking: { type: 'boolean' },
                requireFullScreen: { type: 'boolean' },
                webcamMonitoring: { type: 'boolean' },
                disableCopyPaste: { type: 'boolean' }
              }
            },
            Subscription: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                organization: { type: 'string' },
                plan: { type: 'string' },
                status: { type: 'string' },
                billingCycle: { type: 'string' },
                price: { type: 'object' },
                features: { type: 'object' },
                period: { type: 'object' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            },
            Pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', minimum: 1 },
                limit: { type: 'integer', minimum: 1, maximum: 100 },
                total: { type: 'integer' },
                pages: { type: 'integer' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' }
              }
            }
          }
        },
        security: [{
          BearerAuth: []
        }]
      },
      apis: ['./api/routes/*.js']
    };

    const swaggerSpec = swaggerJsdoc.default(swaggerOptions);
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Assessly Platform API Documentation'
    }));

    console.log(chalk.cyan(`📚 Swagger docs available at ${BACKEND_URL}/api/docs`));
  } catch (err) {
    console.warn(chalk.yellow('⚠️ Swagger setup warning:'), err?.message || err);
  }
}

// ======== 404 Handler ========
app.use((req, res) => {
  if (req.path.startsWith('/api/v1')) {
    return res.status(404).json({
      success: false,
      error: 'API route not found',
      path: req.path,
      method: req.method,
      requestId: req.id,
      availableEndpoints: {
        docs: '/api/docs',
        v1: '/api/v1',
        health: '/health',
        apiHealth: '/api/v1/health'
      },
      suggestion: `This is an API server. For the web application, visit: ${FRONTEND_URL}`
    });
  }

  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    requestId: req.id,
    suggestion: `Check API docs: ${BACKEND_URL}/api/docs`
  });
});

// ======== Global Error Handler ========
app.use((err, req, res, next) => {
  console.error(chalk.red(`❌ Error [${req.id}]: ${err?.message || err}`));
  if (err?.stack && !isProd) console.error(err.stack);

  const statusCode = err?.statusCode || 500;
  const payload = {
    success: false,
    error: err?.message || 'Internal Server Error',
    requestId: req.id
  };
  
  // Add validation errors if present
  if (err.name === 'ValidationError') {
    payload.errors = err.errors;
    payload.code = 'VALIDATION_ERROR';
  }
  
  // Add stack trace in development
  if (!isProd && err?.stack) {
    payload.stack = err.stack;
  }
  
  res.status(statusCode).json(payload);
});

// ======== Database Connection & Server Start ========
async function startServer() {
  let server;
  try {
    console.log(chalk.blue('🔗 Connecting to MongoDB...'));

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      family: 4
    });

    console.log(chalk.green('✅ MongoDB Connected Successfully'));

    // Seed database if needed
    if (process.env.SEED_DATABASE === 'true') {
      try {
        const { seedDatabase } = await import('./api/utils/seedDatabase.js');
        console.log(chalk.yellow('🌱 Seeding database...'));
        await seedDatabase();
        console.log(chalk.green('✅ Database seeded successfully'));
      } catch (seedError) {
        console.warn(chalk.yellow('⚠️ Database seeding skipped:'), seedError.message);
      }
    }

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(chalk.green(`🚀 Server running on port ${PORT}`));
      console.log(chalk.cyan(`🌐 Backend URL: ${BACKEND_URL}`));
      console.log(chalk.cyan(`🌍 Frontend URL: ${FRONTEND_URL}`));
      console.log(chalk.yellow(`📚 API Documentation: ${BACKEND_URL}/api/docs`));
      console.log(chalk.magenta(`⚡ Environment: ${NODE_ENV}`));
      console.log(chalk.blue(`🔑 Authentication: JWT Bearer & Google OAuth`));
      console.log(chalk.blue(`🏢 Multi-tenant: Enabled`));
      console.log(chalk.blue(`⏱️  Rate limiting: Enabled`));
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      try {
        console.log(chalk.yellow(`⚠️  ${signal || 'SIGTERM'} received. Shutting down gracefully...`));
        
        if (server) {
          await new Promise((resolve, reject) => 
            server.close((err) => (err ? reject(err) : resolve()))
          );
          console.log(chalk.green('✅ HTTP server closed'));
        }

        try {
          await mongoose.connection.close(false);
          console.log(chalk.green('✅ MongoDB connection closed'));
        } catch (e) {
          console.warn(chalk.yellow('⚠️ Error closing MongoDB connection:'), e);
        }

        console.log(chalk.green('✅ Graceful shutdown complete'));
        process.exit(0);
      } catch (e) {
        console.error(chalk.red('❌ Graceful shutdown failed:'), e);
        setTimeout(() => {
          console.error(chalk.red('❌ Forcefully exiting'));
          process.exit(1);
        }, 10000);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      console.error(chalk.red('❌ Uncaught Exception:'), error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
    });

  } catch (err) {
    console.error(chalk.red('❌ Startup Failed:'), err);
    if (server && server.close) {
      try { server.close(); } catch (e) { /* ignore */ }
    }
    process.exit(1);
  }
}

startServer();

export default app;
