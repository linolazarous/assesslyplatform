// api/server.js
/**
 * Assessly - Production-ready Express server (Render tuned)
 * - CORS diagnostics & grouped logging
 * - Helmet, hpp, xss-clean, express-mongo-sanitize
 * - Compression, morgan logging
 * - Rate limiting on auth endpoints
 * - Swagger UI at /api/docs
 * - Express-status-monitor at /api/monitor
 * - Graceful shutdown for Render
 * - Mounts API under /api/v1
 */

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
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import statusMonitor from 'express-status-monitor';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import routes from './routes/index.js';
import { seedDatabase } from './utils/seedDatabase.js';
import { securityHeaders } from './middleware/auth.js';

dotenv.config();

// =====================
// Basic config & flags
// =====================
const app = express();
app.set('trust proxy', 1); // Render / proxies
const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || 'production';
const isProd = NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com';
const BACKEND_URL = process.env.BACKEND_URL || 'https://assesslyplatform-t49h.onrender.com';
const MONGODB_URI = process.env.MONGODB_URI;
const AUTO_SEED = process.env.AUTO_SEED === 'true';

// =====================
// Required check
// =====================
if (!MONGODB_URI) {
  console.error(chalk.red('❌ MONGODB_URI is required in environment variables.'));
  process.exit(1);
}

// =====================
// Allowed origins (CORS)
// =====================
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [FRONTEND_URL, 'https://assessly-gedp.onrender.com', 'http://localhost:5173', 'http://localhost:3000']);

// Helper to log CORS diagnostics grouped
const logCorsBlocked = (origin) => {
  console.groupCollapsed(chalk.yellow('⚠️ CORS blocked request'));
  console.log(chalk.blue('Origin:'), origin);
  console.log(chalk.green('Allowed origins:'), ALLOWED_ORIGINS);
  console.groupEnd();
};

// =====================
// Swagger (OpenAPI) setup
// =====================
const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Assessly API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Assessly - API documentation (auto-generated)',
    },
    servers: [
      { url: `${BACKEND_URL}/api/v1`, description: 'Production server' },
      { url: 'http://localhost:10000/api/v1', description: 'Local dev' },
    ],
  },
  // Scan routes for JSDoc comments (adjust paths if needed)
  apis: ['./routes/*.js', './controllers/*.js', './models/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// =====================
// Middleware
// =====================
// CORS with diagnostics
app.use(cors({
  origin: function (origin, callback) {
    // allow tools (curl, Postman) with no origin
    if (!origin) return callback(null, true);
    // allow exact matches
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // allow same-host (for some Render internal requests)
    try {
      const parsed = new URL(origin);
      if (parsed.hostname === new URL(BACKEND_URL).hostname) return callback(null, true);
    } catch (err) {
      // ignore
    }
    logCorsBlocked(origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Cookie']
}));

app.options('*', cors());

// Security & parsing
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(xss());
app.use(mongoSanitize());
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(securityHeaders);

// Logging (dev vs prod)
app.use(morgan(isProd ? 'combined' : 'dev'));

// Express status monitor
app.use(statusMonitor({
  title: 'Assessly - Status',
  path: '/api/monitor',
  spans: [{interval: 1, retention: 60}, {interval: 5, retention: 60}, {interval: 15, retention: 60}]
}));

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests - try again later.' }
});
app.use('/api/v1/auth', authLimiter);

// =====================
// Health & Debug routes
// =====================
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    frontend: FRONTEND_URL,
    backend: BACKEND_URL,
    allowedOrigins: ALLOWED_ORIGINS
  });
});

app.get('/api/v1/debug', (req, res) => {
  res.json({
    environment: NODE_ENV,
    allowedOrigins: ALLOWED_ORIGINS,
    headers: req.headers,
    node: process.version,
    autoSeed: AUTO_SEED
  });
});

// =====================
// Swagger UI route
// =====================
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// =====================
// Mount versioned API
// =====================
// Important: routes/index.js should export routers (we mount under /api/v1)
app.use('/api/v1', routes);

// =====================
// 404 handler (structured)
//// =====================
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    method: req.method,
    path: req.originalUrl,
    suggestion: 'Check the API documentation at /api/docs'
  });
});

// =====================
// Error handler (centralized & structured)
//// =====================
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  // If CORS error, handle specifically
  if (err && err.message && /cors/i.test(err.message)) {
    console.groupCollapsed(chalk.yellow('⚠️ CORS ERROR'));
    console.error(err.message);
    console.groupEnd();
    return res.status(403).json({
      message: 'CORS Error: Request blocked',
      origin: req.headers.origin || null,
      allowedOrigins: ALLOWED_ORIGINS
    });
  }

  console.groupCollapsed(chalk.red('❌ SERVER ERROR'));
  console.error(err);
  console.groupEnd();

  const status = err.status || 500;
  const payload = {
    message: err.message || 'Internal Server Error',
    code: err.code || 'SERVER_ERROR',
  };

  if (!isProd) payload.stack = err.stack;
  res.status(status).json(payload);
});

// =====================
// DB connection + server start
// =====================
async function start() {
  console.log(chalk.cyan('\n🚀 Starting Assessly Backend (Render-optimized)...\n'));
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // autoIndex: isProd ? false : true, // can toggle as needed
    });
    console.log(chalk.green('✅ MongoDB connected:'), conn.connection.name);
    console.log(chalk.blue(`🌍 Environment: ${NODE_ENV}`));
    console.log(chalk.magenta(`🎯 Frontend URL: ${FRONTEND_URL}`));
    console.log(chalk.cyan(`🔒 Allowed Origins: ${ALLOWED_ORIGINS.join(', ')}`));

    if (AUTO_SEED) {
      console.log(chalk.yellow('🌱 Auto-seeding database...'));
      await seedDatabase();
    }

    app.listen(PORT, () => {
      console.log(chalk.green(`📍 Server listening on port ${PORT}`));
      console.log(chalk.magenta(`📊 Health: ${BACKEND_URL}/api/v1/health`));
      console.log(chalk.green('✅ Server ready.'));
    });
  } catch (err) {
    console.error(chalk.red('❌ Failed to start server:'), err);
    process.exit(1);
  }
}

// =====================
// Graceful shutdown for Render
// =====================
const shutdown = async (signal) => {
  try {
    console.log(chalk.yellow(`\n🛑 ${signal} received — graceful shutdown started...`));
    await mongoose.connection.close(false);
    console.log(chalk.green('✅ MongoDB connection closed.'));
    process.exit(0);
  } catch (err) {
    console.error(chalk.red('❌ Error during shutdown:'), err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Catch unhandled errors (log and exit)
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error(chalk.red('❌ Uncaught Exception:'), err);
  // In production you may want to restart process manager or exit
  process.exit(1);
});

start();
