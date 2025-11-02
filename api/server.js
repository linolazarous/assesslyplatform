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

const app = express();
app.set('trust proxy', 1); // required when behind Render or other proxies

const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;
const AUTO_SEED = process.env.AUTO_SEED === 'true';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com';
const BACKEND_URL = process.env.BACKEND_URL || 'https://assesslyplatform-t49h.onrender.com';
const NODE_ENV = process.env.NODE_ENV || 'production';
const isProduction = NODE_ENV === 'production';

if (!MONGODB_URI) {
  console.error(chalk.red('❌ Missing required environment variable: MONGODB_URI'));
  process.exit(1);
}

/**
 * CORS configuration — whitelist origins exactly to avoid accidental blocks.
 * If your frontend uses subpaths or multiple domains, add them to ALLOWED_ORIGINS env.
 */
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [
      FRONTEND_URL,
      'https://assessly-gedp.onrender.com',
      'http://localhost:5173',
      'http://localhost:3000'
    ];

/* -------------- Middleware -------------- */
app.use(cors({
  origin(origin, callback) {
    // allow server-side requests with no origin (curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(chalk.yellow(`⚠️ CORS blocked request from: ${origin}`));
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Cookie']
}));

app.options('*', cors());

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(securityHeaders);
app.use(morgan(isProduction ? 'combined' : 'dev'));

// rate limit for auth endpoints to mitigate brute-force (lightweight)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/auth', authLimiter);

/* -------------- Health & Debug -------------- */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    frontend: FRONTEND_URL,
    backend: BACKEND_URL,
    cors: { allowedOrigins: ALLOWED_ORIGINS }
  });
});

app.get('/api/debug', (req, res) => {
  res.json({
    environment: NODE_ENV,
    allowedOrigins: ALLOWED_ORIGINS,
    headers: req.headers,
    autoSeed: AUTO_SEED
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Assessly Platform API Server',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    docs: '/api/health',
  });
});

/* -------------- Mount API Routes -------------- */
app.use('/api', routes);

/* -------------- 404 & Global Error Handler -------------- */
app.use((req, res) => res.status(404).json({ message: 'Route not found', path: req.originalUrl }));

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(chalk.red('❌ Server error:'), err);
  if (err.message && err.message.toLowerCase().includes('cors')) {
    return res.status(403).json({ message: 'CORS Error: Request blocked', allowedOrigins: ALLOWED_ORIGINS });
  }
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: NODE_ENV === 'production' ? undefined : err.stack
  });
});

/* -------------- Start Server -------------- */
async function startServer() {
  console.log(chalk.cyan('\n🚀 Starting Assessly Backend Server...\n'));
  try {
    const conn = await mongoose.connect(MONGODB_URI, { autoIndex: true }); // autoIndex only for dev; ok here because indexes already defined
    console.log(chalk.green('✅ MongoDB connected:'), conn.connection.name);
    console.log(chalk.blue(`🌍 Environment: ${NODE_ENV}`));
    console.log(chalk.magenta(`🎯 Frontend URL: ${FRONTEND_URL}`));
    console.log(chalk.cyan(`🔒 CORS enabled for: ${ALLOWED_ORIGINS.join(', ')}`));

    if (AUTO_SEED) {
      console.log(chalk.yellow('🌱 Auto-seeding enabled'));
      await seedDatabase();
    }

    app.listen(PORT, () => {
      console.log(chalk.green(`📍 Server running on port: ${PORT}`));
      console.log(chalk.magenta(`📊 Health: ${BACKEND_URL}/api/health`));
    });
  } catch (err) {
    console.error(chalk.red('❌ Failed to start server:'), err.message);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🛑 SIGINT received — shutting down gracefully...'));
  await mongoose.connection.close();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n🛑 SIGTERM received — shutting down gracefully...'));
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
