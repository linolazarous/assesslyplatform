/**
 * server.js – Assessly Platform API (Production Ready)
 * Final version perfectly integrated with your existing repo structure
 * Connects all your models, routes, and controllers
 * Now with API documentation and monitoring endpoints
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
import fs from 'fs';

// Import your main router that consolidates all routes
import mainRouter from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

// ==================== Environment Configuration ====================
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

// ==================== Core Middleware Setup ====================

// 1. Request ID Middleware
app.use((req, res, next) => {
  try {
    req.id = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
  } catch (err) {
    req.id = crypto.randomBytes(16).toString('hex');
  }
  res.setHeader('X-Request-ID', req.id);
  next();
});

// 2. Response Time Tracking
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
        console.log(chalk.yellow(`⚠️  Slow request: ${req.method} ${req.originalUrl} - ${duration}ms - ReqID: ${req.id}`));
      }
    } catch (err) {
      console.error(chalk.red('Error setting response time header:'), err);
    }
    return originalEnd.apply(this, args);
  };

  next();
});

// ==================== Rate Limiting Configuration ====================

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      requestId: req.id,
      retryAfter: '1 minute'
    });
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
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this organization, please try again later.',
      requestId: req.id,
      retryAfter: '15 minutes'
    });
  }
});

// ==================== Logging Configuration ====================
morgan.token('request-id', (req) => req.id || '-');
morgan.token('x-response-time', (req, res) => res.getHeader('X-Response-Time') || '-');

const morganFormat = isProd
  ? ':remote-addr - :method :url :status :res[content-length] - :response-time ms - reqid=:request-id'
  : ':method :url :status :res[content-length] - :response-time ms - reqid=:request-id';

app.use(morgan(morganFormat));

// ==================== Security Middleware ====================
const corsOptions = {
  origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-Organization-ID'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'X-Request-ID', 'X-Response-Time']
};
app.use(cors(corsOptions));

// Security headers
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

// ==================== Development Tools ====================
if (!isProd) {
  app.use(statusMonitor());
  console.log(chalk.yellow('🔧 Development mode: Status monitor enabled'));
}

// ==================== Service Endpoints (Before API Routes) ====================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Assessly Platform API',
    version: '1.0.0',
    description: 'Multitenant assessment platform for organizations and teams',
    status: 'operational',
    timestamp: new Date().toISOString(),
    requestId: req.id,
    environment: NODE_ENV,
    links: {
      frontend: FRONTEND_URL,
      apiDocumentation: `${BACKEND_URL}/api/docs`,
      healthCheck: `${BACKEND_URL}/health`,
      apiHealth: `${BACKEND_URL}/api/v1/health`,
      serviceStatus: `${BACKEND_URL}/api/v1/status`,
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

// Global health check (outside API versioning)
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

// ==================== API Monitoring Endpoint ====================
app.get('/api/monitor', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  // Calculate uptime in human readable format
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  res.json({
    success: true,
    status: 'healthy',
    service: 'Assessly Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    requestId: req.id,
    environment: NODE_ENV,
    
    // System information
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      pid: process.pid,
      cpuUsage: process.cpuUsage(),
      title: process.title,
      argv: process.argv.slice(0, 3) // Show first 3 args only
    },
    
    // Uptime information
    uptime: {
      seconds: Math.floor(uptime),
      humanReadable: `${days}d ${hours}h ${minutes}m ${seconds}s`,
      startedAt: new Date(Date.now() - uptime * 1000).toISOString()
    },
    
    // Memory usage
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
      arrayBuffers: `${Math.round(memoryUsage.arrayBuffers / 1024 / 1024)} MB`,
      percentageUsed: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    },
    
    // Database status
    database: {
      status: dbState === 1 ? 'connected' : 'disconnected',
      readyState: dbState,
      host: mongoose.connection.host || 'unknown',
      name: mongoose.connection.name || 'unknown',
      models: mongoose.modelNames().length
    },
    
    // Active connections
    connections: {
      max: process.env.maxConnections || 'unlimited',
      current: 'dynamic' // You can add connection pool metrics here
    },
    
    // Environment
    env: {
      nodeEnv: NODE_ENV,
      port: PORT,
      frontendUrl: FRONTEND_URL,
      backendUrl: BACKEND_URL
    },
    
    // Service metrics
    metrics: {
      totalRequests: 'tracked_in_logs', // You can implement request counting
      averageResponseTime: 'tracked_in_x-response-time_header',
      errorRate: 'tracked_in_error_logs'
    }
  });
});

// Client error logging endpoint (from your frontend issue)
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

// ==================== JWT Refresh Endpoint (BEFORE auth rate limiting) ====================
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

// Refresh endpoint (explicit, outside main router)
app.get('/api/v1/auth/refresh', handleRefresh);
app.post('/api/v1/auth/refresh', handleRefresh);

// ==================== Apply Rate Limiters ====================

// Apply auth limiter to specific endpoints
app.post('/api/v1/auth/login', authLimiter);
app.post('/api/v1/auth/register', authLimiter);
app.post('/api/v1/auth/forgot-password', authLimiter);
app.post('/api/v1/auth/reset-password', authLimiter);

// Apply general API limiter to all other API routes
app.use('/api/v1', apiLimiter);

// ==================== Mount Your Main Router ====================
// This connects ALL your routes from index.js
app.use('/api/v1', mainRouter);

// ==================== API Documentation (Swagger) ====================
// Initialize Swagger documentation
async function setupSwagger() {
  try {
    // Check if we're in production and docs are disabled
    if (isProd && process.env.ENABLE_API_DOCS !== 'true') {
      console.log(chalk.yellow('📚 API documentation is disabled in production'));
      
      // Still provide a basic docs endpoint with info
      app.get('/api/docs', (req, res) => {
        res.json({
          success: true,
          message: 'API Documentation',
          note: 'API documentation is disabled in production for security. Enable with ENABLE_API_DOCS=true',
          endpoints: {
            authentication: '/api/v1/auth/*',
            users: '/api/v1/users/*',
            organizations: '/api/v1/organizations/*',
            assessments: '/api/v1/assessments/*',
            subscriptions: '/api/v1/subscriptions/*',
            contact: '/api/v1/contact/*',
            monitoring: '/api/monitor',
            health: '/health'
          },
          requestId: req.id,
          timestamp: new Date().toISOString()
        });
      });
      return;
    }

    // Try to load swagger dependencies
    let swaggerJsdoc, swaggerUi;
    try {
      const swaggerModule = await import('swagger-jsdoc');
      swaggerJsdoc = swaggerModule.default;
    } catch (err) {
      console.warn(chalk.yellow('⚠️ swagger-jsdoc not installed. Installing recommended...'));
      console.log(chalk.blue('💡 Run: npm install swagger-jsdoc swagger-ui-express'));
      
      // Provide fallback docs endpoint
      app.get('/api/docs', (req, res) => {
        res.json({
          success: true,
          message: 'API Documentation',
          note: 'Install swagger dependencies for full documentation: npm install swagger-jsdoc swagger-ui-express',
          endpoints: getAvailableEndpoints(),
          requestId: req.id
        });
      });
      return;
    }

    try {
      const swaggerUiModule = await import('swagger-ui-express');
      swaggerUi = swaggerUiModule.default;
    } catch (err) {
      console.warn(chalk.yellow('⚠️ swagger-ui-express not installed'));
      return;
    }

    // Swagger configuration
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Assessly Platform API',
          version: '1.0.0',
          description: 'Comprehensive multi-tenant assessment platform API for organizations, teams, and assessments',
          termsOfService: 'https://assessly.com/terms',
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
          },
          {
            url: 'http://localhost:10000/api/v1',
            description: 'Local Development Server'
          }
        ],
        components: {
          securitySchemes: {
            BearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
            },
            ApiKeyAuth: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key',
              description: 'API key for external services'
            }
          },
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                role: { type: 'string', enum: ['admin', 'manager', 'member', 'viewer'] },
                organization: { type: 'string' }
              }
            },
            Error: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: { type: 'string' },
                requestId: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        security: [{
          BearerAuth: []
        }],
        externalDocs: {
          description: 'Assessly Platform Documentation',
          url: 'https://docs.assessly.com'
        }
      },
      apis: [
        './routes/*.js',
        './routes/**/*.js',
        './api/routes/*.js',
        './api/controllers/*.js'
      ]
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    
    // Custom Swagger UI options
    const swaggerUiOptions = {
      explorer: true,
      customSiteTitle: 'Assessly Platform API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true
      }
    };

    // Serve Swagger UI
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
    
    // Serve raw JSON spec
    app.get('/api/docs/json', (req, res) => {
      res.json(swaggerSpec);
    });

    console.log(chalk.green(`📚 Swagger docs available at ${BACKEND_URL}/api/docs`));
    console.log(chalk.blue(`📋 API Spec available at ${BACKEND_URL}/api/docs/json`));

  } catch (err) {
    console.error(chalk.red('❌ Swagger setup error:'), err.message || err);
    
    // Fallback docs endpoint
    app.get('/api/docs', (req, res) => {
      res.json({
        success: true,
        message: 'Assessly Platform API Documentation',
        note: 'Swagger documentation is currently unavailable',
        availableEndpoints: getAvailableEndpoints(),
        quickStart: {
          authentication: 'POST /api/v1/auth/login with {email, password}',
          protectedRoute: 'Use "Authorization: Bearer {token}" header',
          rateLimits: '100 requests per 15 minutes per organization'
        },
        requestId: req.id,
        support: 'assesslyinc@gmail.com'
      });
    });
  }
}

// Helper function to get available endpoints
function getAvailableEndpoints() {
  return {
    authentication: {
      login: 'POST /api/v1/auth/login',
      register: 'POST /api/v1/auth/register',
      logout: 'POST /api/v1/auth/logout',
      refresh: 'POST /api/v1/auth/refresh',
      forgotPassword: 'POST /api/v1/auth/forgot-password',
      resetPassword: 'POST /api/v1/auth/reset-password',
      verifyEmail: 'POST /api/v1/auth/verify-email'
    },
    users: {
      getProfile: 'GET /api/v1/users/profile',
      updateProfile: 'PUT /api/v1/users/profile',
      listUsers: 'GET /api/v1/users',
      getUser: 'GET /api/v1/users/:id',
      updateUser: 'PUT /api/v1/users/:id',
      deleteUser: 'DELETE /api/v1/users/:id'
    },
    organizations: {
      create: 'POST /api/v1/organizations',
      list: 'GET /api/v1/organizations',
      get: 'GET /api/v1/organizations/:id',
      update: 'PUT /api/v1/organizations/:id',
      delete: 'DELETE /api/v1/organizations/:id',
      invite: 'POST /api/v1/organizations/:id/invite',
      members: 'GET /api/v1/organizations/:id/members'
    },
    assessments: {
      create: 'POST /api/v1/assessments',
      list: 'GET /api/v1/assessments',
      get: 'GET /api/v1/assessments/:id',
      update: 'PUT /api/v1/assessments/:id',
      delete: 'DELETE /api/v1/assessments/:id',
      publish: 'POST /api/v1/assessments/:id/publish',
      responses: 'GET /api/v1/assessments/:id/responses'
    },
    subscriptions: {
      plans: 'GET /api/v1/subscriptions/plans',
      subscribe: 'POST /api/v1/subscriptions/subscribe',
      current: 'GET /api/v1/subscriptions/current',
      invoices: 'GET /api/v1/subscriptions/invoices'
    },
    system: {
      health: 'GET /health',
      monitor: 'GET /api/monitor',
      apiHealth: 'GET /api/v1/health',
      status: 'GET /api/v1/status',
      features: 'GET /api/v1/features'
    },
    contact: {
      sendMessage: 'POST /api/v1/contact',
      listMessages: 'GET /api/v1/contact (admin only)'
    }
  };
}

// Initialize Swagger
setupSwagger();

// ==================== 404 Handler ====================
app.use((req, res) => {
  if (req.path.startsWith('/api/v1')) {
    return res.status(404).json({
      success: false,
      error: 'API route not found',
      path: req.path,
      method: req.method,
      requestId: req.id,
      apiVersion: 'v1',
      availableEndpoints: getAvailableEndpoints(),
      suggestion: `Check API docs: ${BACKEND_URL}/api/docs or visit ${FRONTEND_URL} for web application`
    });
  }

  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    requestId: req.id,
    suggestion: `This is an API server. Web application is available at: ${FRONTEND_URL}`,
    apiDocumentation: `${BACKEND_URL}/api/docs`,
    apiHealth: `${BACKEND_URL}/health`,
    apiMonitor: `${BACKEND_URL}/api/monitor`
  });
});

// ==================== Global Error Handler ====================
app.use((err, req, res, next) => {
  console.error(chalk.red(`❌ Global Error [${req.id}]:`), err.message);
  if (!isProd && err.stack) {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || err.status || 500;
  
  const errorResponse = {
    success: false,
    error: err.message || 'Internal Server Error',
    requestId: req.id,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  };

  // Add validation errors if present
  if (err.name === 'ValidationError') {
    errorResponse.errors = err.errors;
    errorResponse.code = 'VALIDATION_ERROR';
  }

  // Add stack trace in development only
  if (!isProd && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
});

// ==================== Database Connection & Server Start ====================
async function startServer() {
  let server;
  
  try {
    console.log(chalk.blue('🔗 Connecting to MongoDB...'));

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      family: 4
    });

    console.log(chalk.green('✅ MongoDB Connected Successfully'));
    
    // Display connected models
    const modelNames = mongoose.modelNames();
    if (modelNames.length > 0) {
      console.log(chalk.blue('📦 Loaded Models:'), modelNames.join(', '));
    }

    // Seed database if needed
    if (process.env.SEED_DATABASE === 'true') {
      try {
        console.log(chalk.yellow('🌱 Seeding database...'));
        // Import and run your seed function if it exists
        const { seedDatabase } = await import('./api/utils/seedDatabase.js');
        await seedDatabase();
        console.log(chalk.green('✅ Database seeded successfully'));
      } catch (seedError) {
        console.warn(chalk.yellow('⚠️ Database seeding skipped:'), seedError.message);
      }
    }

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(chalk.green(`\n🚀 Assessly Platform API Server Running`));
      console.log(chalk.cyan('══════════════════════════════════════════'));
      console.log(chalk.white(`   Port:          ${PORT}`));
      console.log(chalk.white(`   Environment:   ${NODE_ENV}`));
      console.log(chalk.white(`   Backend URL:   ${BACKEND_URL}`));
      console.log(chalk.white(`   Frontend URL:  ${FRONTEND_URL}`));
      console.log(chalk.white(`   API Base:      ${BACKEND_URL}/api/v1`));
      console.log(chalk.white(`   API Docs:      ${BACKEND_URL}/api/docs`));
      console.log(chalk.white(`   Health Check:  ${BACKEND_URL}/health`));
      console.log(chalk.white(`   API Monitor:   ${BACKEND_URL}/api/monitor`));
      console.log(chalk.cyan('══════════════════════════════════════════'));
      console.log(chalk.blue(`\n🔐 Authentication: JWT Bearer & Google OAuth`));
      console.log(chalk.blue(`🏢 Multi-tenant:   Enabled (${modelNames.length} models)`));
      console.log(chalk.blue(`📊 Rate limiting:  Enabled (tiered)`));
      console.log(chalk.blue(`📝 Error logging:  Enabled (/errors/log)`));
      console.log(chalk.blue(`📚 API Docs:       ${process.env.ENABLE_API_DOCS === 'true' ? 'Enabled' : 'Basic info only'}`));
      console.log(chalk.green('\n✅ Server is ready to handle requests\n'));
    });

    // ==================== Graceful Shutdown ====================
    const gracefulShutdown = async (signal) => {
      try {
        console.log(chalk.yellow(`\n⚠️  ${signal || 'SIGTERM'} received. Shutting down gracefully...`));
        
        // Stop accepting new connections
        if (server) {
          await new Promise((resolve, reject) => 
            server.close((err) => (err ? reject(err) : resolve()))
          );
          console.log(chalk.green('✅ HTTP server closed'));
        }

        // Close database connections
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

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error(chalk.red('❌ Uncaught Exception:'), error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
    });

  } catch (err) {
    console.error(chalk.red('❌ Server startup failed:'), err);
    if (server && server.close) {
      try { server.close(); } catch (e) { /* ignore */ }
    }
    process.exit(1);
  }
}

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
