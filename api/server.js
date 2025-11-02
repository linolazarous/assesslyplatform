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
app.set('trust proxy', 1);

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

/* ─────────────────────────────────────────────
   🌍 CORS Configuration
───────────────────────────────────────────── */
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'https://assessly-gedp.onrender.com',
      FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
    ];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      console.warn(chalk.yellow(`⚠️  CORS blocked: ${origin}`));
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.options('*', cors());

/* ─────────────────────────────────────────────
   🧩 Middleware
───────────────────────────────────────────── */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(securityHeaders);
app.use(morgan(isProduction ? 'combined' : 'dev'));

/* ─────────────────────────────────────────────
   🔐 Rate Limiting
───────────────────────────────────────────── */
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'Too many requests from this IP. Please try again later.' },
});
app.use('/api/auth', authLimiter);

/* ─────────────────────────────────────────────
   🩺 Health & Debug
───────────────────────────────────────────── */
app.get('/api/health', (_, res) =>
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    frontend: FRONTEND_URL,
    backend: BACKEND_URL,
    allowedOrigins: ALLOWED_ORIGINS,
  })
);

app.get('/api/debug', (req, res) =>
  res.json({
    env: NODE_ENV,
    frontend: FRONTEND_URL,
    backend: BACKEND_URL,
    headers: req.headers,
  })
);

app.get('/', (_, res) =>
  res.json({
    message: 'Assessly Platform API Server',
    version: '1.0.0',
    status: 'running',
    docs: '/api/health',
  })
);

/* ─────────────────────────────────────────────
   🧭 Routes & Errors
───────────────────────────────────────────── */
app.use('/api', routes);
app.use((_, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, _, res, __) => {
  console.error(chalk.red('❌ Error:'), err);
  const status = err.message.includes('CORS') ? 403 : err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    allowedOrigins: ALLOWED_ORIGINS,
  });
});

/* ─────────────────────────────────────────────
   ⚙️ Start Server
───────────────────────────────────────────── */
async function startServer() {
  console.log(chalk.cyan('\n🚀 Starting Assessly Backend Server...\n'));
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(chalk.green('✅ MongoDB connected:'), conn.connection.name);
    console.log(chalk.blue(`🌍 Env: ${NODE_ENV}`));
    console.log(chalk.magenta(`🎯 Frontend: ${FRONTEND_URL}`));

    if (AUTO_SEED) {
      console.log(chalk.yellow('🌱 Auto-seeding database...'));
      await seedDatabase();
    }

    app.listen(PORT, () =>
      console.log(chalk.green(`📍 Server running on port ${PORT}`))
    );
  } catch (err) {
    console.error(chalk.red('❌ Failed to start server:'), err.message);
    process.exit(1);
  }
}

['SIGINT', 'SIGTERM'].forEach(sig =>
  process.on(sig, async () => {
    console.log(chalk.yellow(`\n🛑 ${sig} received. Shutting down...`));
    await mongoose.connection.close();
    console.log(chalk.green('✅ MongoDB connection closed.'));
    process.exit(0);
  })
);

startServer();
