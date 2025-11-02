// api/server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import chalk from 'chalk';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import routes from './routes/index.js';
import { seedDatabase } from './utils/seedDatabase.js';
import { securityHeaders } from './middleware/auth.js';

dotenv.config();

/* ─────────────────────────────────────────────
   🚀 Server Configuration
───────────────────────────────────────────── */
const app = express();
app.set('trust proxy', 1); // Required behind proxies like Render

const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;
const AUTO_SEED = process.env.AUTO_SEED === 'true';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com';
const BACKEND_URL = process.env.BACKEND_URL || 'https://assesslyplatform-t49h.onrender.com';
const NODE_ENV = process.env.NODE_ENV || 'production';
const isProduction = NODE_ENV === 'production';

/* ─────────────────────────────────────────────
   🌍 Allowed Origins (CORS)
───────────────────────────────────────────── */
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : isProduction
  ? [
      'https://assessly-gedp.onrender.com',
      FRONTEND_URL
    ]
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

if (!MONGODB_URI) {
  console.error(chalk.red('❌ Missing required environment variable: MONGODB_URI'));
  process.exit(1);
}

/* ─────────────────────────────────────────────
   🧩 Middleware Setup
───────────────────────────────────────────── */

// CORS MUST BE FIRST MIDDLEWARE
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (ALLOWED_ORIGINS.some(allowedOrigin => origin === allowedOrigin)) {
      return callback(null, true);
    } else {
      console.log(chalk.yellow(`⚠️  CORS blocked: ${origin}`));
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
}));

// Handle preflight requests
app.options('*', cors());

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Additional security headers
app.use(securityHeaders);

// Morgan logging
app.use(morgan(isProduction ? 'combined' : 'dev'));

/* ─────────────────────────────────────────────
   🔐 Rate limiting for auth endpoints
───────────────────────────────────────────── */
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' },
});

// Apply auth limiter to auth routes before mounting /api routes
app.use('/api/auth', authLimiter);

/* ─────────────────────────────────────────────
   🩺 Health & Debug Routes
───────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    environment: NODE_ENV,
    frontend: FRONTEND_URL,
    backend: BACKEND_URL,
    service: 'Assessly Backend API',
    cors: {
      allowedOrigins: ALLOWED_ORIGINS,
      credentials: true
    }
  });
});

app.get('/api/debug', (req, res) => {
  res.json({
    environment: NODE_ENV,
    allowedOrigins: ALLOWED_ORIGINS,
    corsEnabled: true,
    autoSeed: AUTO_SEED,
    frontendUrl: FRONTEND_URL,
    headers: req.headers,
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Assessly Platform API Server',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/health',
    environment: NODE_ENV,
    cors: 'enabled'
  });
});

/* ─────────────────────────────────────────────
   🧭 API Routes
───────────────────────────────────────────── */
app.use('/api', routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(chalk.red('❌ Error:'), err);
  
  // CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      message: 'CORS Error: Request blocked',
      allowedOrigins: ALLOWED_ORIGINS
    });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: NODE_ENV === 'production' ? undefined : err.stack,
  });
});

/* ─────────────────────────────────────────────
   ⚙️ Database Connection & Server Start
───────────────────────────────────────────── */
async function startServer() {
  console.log(chalk.cyan('\n🚀 Starting Assessly Backend Server...\n'));

  try {
    const conn = await mongoose.connect(MONGODB_URI);

    console.log(chalk.green('✅ MongoDB connected successfully'));
    console.log(chalk.gray(`📡 Database: ${conn.connection.name}`));
    console.log(chalk.gray(`🏠 Host: ${conn.connection.host}`));
    console.log(chalk.blue(`🌍 Environment: ${NODE_ENV}`));
    console.log(chalk.magenta(`🎯 Frontend URL: ${FRONTEND_URL}`));
    console.log(chalk.cyan(`🔒 CORS enabled for: ${ALLOWED_ORIGINS.join(', ')}`));
    console.log(chalk.yellow(`🌱 Auto-seed: ${AUTO_SEED}`));

    if (AUTO_SEED) {
      console.log(chalk.yellow('🌱 Auto-seeding database...'));
      await seedDatabase();
    }

    app.listen(PORT, () => {
      console.log(chalk.green(`📍 Server running on port: ${PORT}`));
      console.log(chalk.magenta(`📊 Health: ${BACKEND_URL}/api/health`));
      console.log(chalk.green('✅ Server started successfully\n'));
    });
  } catch (err) {
    console.error(chalk.red('❌ Failed to start server:'), err.message);
    process.exit(1);
  }
}

/* ─────────────────────────────────────────────
   🛑 Graceful Shutdown
───────────────────────────────────────────── */
const gracefulShutdown = async (signal) => {
  console.log(chalk.yellow(`\n🛑 ${signal} received. Shutting down gracefully...`));
  await mongoose.connection.close();
  console.log(chalk.green('✅ MongoDB connection closed.'));
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/* ─────────────────────────────────────────────
   🚦 Start Server
───────────────────────────────────────────── */
startServer();
