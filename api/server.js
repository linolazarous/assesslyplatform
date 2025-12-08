/**
 * api/server.js – PRODUCTION-READY
 * - Fixed: crypto import for request-id
 * - Fixed: rate limit handler includes requestId
 * - Refresh endpoint supports GET + POST and returns access token
 * - Graceful shutdown + robust error handling
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

import routes from './routes/index.js';
import { seedDatabase } from './utils/seedDatabase.js';
import { setupSwagger } from './config/swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

// Environment
const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com';
const BACKEND_URL = process.env.BACKEND_URL || `https://localhost:${PORT}`;
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
    // Node's built-in crypto.randomUUID() is available in modern Node versions
    req.id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
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
      // attach response time header
      if (!res.headersSent) {
        res.setHeader('X-Response-Time', `${duration}ms`);
      } else {
        // ensure header still set if headers already sent (some frameworks send early)
        try { res.setHeader('X-Response-Time', `${duration}ms`); } catch (e) { /* ignore */ }
      }

      if (duration > 1000) {
        console.log(chalk.yellow(`⚠️  Slow request detected: ${req.method} ${req.originalUrl} - ${duration}ms - Request ID: ${req.id}`));
      }
    } catch (err) {
      // swallow timing errors — shouldn't break response
      console.error(chalk.red('Error while setting X-Response-Time header:'), err);
    }
    return originalEnd.apply(this, args);
  };

  next();
});

// ======== Rate Limiting (with handler that returns requestId) ========
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}-${req.id || ''}`,
  handler: (req, res /*, next */) => {
    const payload = {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      requestId: req.id || null
    };
    res.status(429).json(payload);
  }
});
app.use(limiter);

// ======== Morgan Logging with Request ID ========
morgan.token('request-id', (req) => req.id || '-');
morgan.token('x-response-time', (req, res) => res.getHeader('X-Response-Time') || '-');

const morganFormat = isProd
  ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :x-response-time - reqid=:request-id'
  : ':method :url :status :res[content-length] - :x-response-time - reqid=:request-id';

app.use(morgan(morganFormat));

// ======== CORS (with credentials) ========
const corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'X-Request-ID', 'X-Response-Time']
};
app.use(cors(corsOptions));

// ======== Security & Parsing Middleware ========
app.use(helmet({
  contentSecurityPolicy: isProd ? undefined : false,
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
      apiDocumentation: `${BACKEND_URL.replace(/\/$/, '')}/api/docs`,
      healthCheck: `${BACKEND_URL.replace(/\/$/, '')}/health`
    }
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

app.get('/api', (req, res) => {
  res.json({
    success: true,
    name: 'Assessly Platform API',
    version: '1.0.0',
    basePath: '/api/v1',
    documentation: `${BACKEND_URL.replace(/\/$/, '')}/api/docs`,
    status: 'operational',
    requestId: req.id
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    requestId: req.id,
    service: 'Assessly API'
  });
});

// ======== JWT Refresh Endpoint (GET and POST) ========
async function handleRefresh(req, res) {
  try {
    const refreshToken = req.cookies?.refreshToken;
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

      // Build a new access token (short lived)
      const accessToken = jwt.sign(
        {
          id: payload.id,
          email: payload.email,
          role: payload.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      return res.json({
        success: true,
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 900, // seconds
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

// Expose both GET and POST for convenience (same semantics)
app.get('/api/v1/auth/refresh', handleRefresh);
app.post('/api/v1/auth/refresh', handleRefresh);

// ======== Register Swagger & App Routes ========
try {
  await setupSwagger(app); // if this is async; if not, it's still safe
} catch (err) {
  // non-fatal; log and continue
  console.warn(chalk.yellow('⚠️ Swagger setup warning:'), err?.message || err);
}
app.use('/api/v1', routes);

// ======== 404 Handler for API & Web ========
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
        apiHealth: '/api/health'
      },
      suggestion: `This is an API server. For the web application, visit: ${FRONTEND_URL}`
    });
  }

  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    requestId: req.id,
    suggestion: `Check API docs: ${BACKEND_URL.replace(/\/$/, '')}/api/docs`
  });
});

// ======== Global Error Handler ========
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(chalk.red(`❌ Error [${req.id}]: ${err?.message || err}`));
  if (err?.stack) console.error(err.stack);

  const statusCode = err?.statusCode || 500;
  const payload = {
    success: false,
    error: err?.message || 'Internal Server Error',
    requestId: req.id
  };
  if (!isProd) payload.stack = err?.stack;
  res.status(statusCode).json(payload);
});

// ======== Server Start & Graceful Shutdown ========
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

    if (process.env.SEED_DATABASE === 'true') {
      console.log(chalk.yellow('🌱 Seeding database...'));
      await seedDatabase();
      console.log(chalk.green('✅ Database seeded successfully'));
    }

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(chalk.green(`🚀 Server running on port ${PORT}`));
      console.log(chalk.cyan(`🌐 Backend URL: ${BACKEND_URL}`));
      console.log(chalk.cyan(`🌍 Frontend URL: ${FRONTEND_URL}`));
      console.log(chalk.yellow(`📚 API Documentation: ${BACKEND_URL.replace(/\/$/, '')}/api/docs`));
      console.log(chalk.magenta(`⚡ Environment: ${NODE_ENV}`));
      console.log(chalk.blue(`🔑 Request ID tracking: Enabled`));
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      try {
        console.log(chalk.yellow(`⚠️  ${signal || 'SIGTERM'} received. Shutting down gracefully...`));
        // stop accepting new connections
        if (server) {
          await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
          console.log(chalk.green('✅ HTTP server closed'));
        }

        // close DB connection
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
      // attempt graceful shutdown, then exit
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
      // log only; do not crash
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
