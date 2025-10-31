import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import chalk from 'chalk';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { seedDatabase } from './utils/seedDatabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;
const AUTO_SEED = process.env.AUTO_SEED === 'true';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com';
const NODE_ENV = process.env.NODE_ENV || 'production';

// ─────────────────────────────────────────────
// CORS Configuration
// ─────────────────────────────────────────────
const isProduction = NODE_ENV === 'production';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : isProduction 
    ? [FRONTEND_URL]
    : ['http://localhost:3000', 'http://localhost:5173'];

// ─────────────────────────────────────────────
// Validate essential environment variables
// ─────────────────────────────────────────────
if (!MONGODB_URI) {
  console.error(chalk.red('❌ Missing required environment variable: MONGODB_URI'));
  process.exit(1);
}

// ─────────────────────────────────────────────
// Middleware setup
// ─────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(chalk.yellow(`⚠️  Blocked by CORS: ${origin}`));
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);
app.use(morgan('combined'));

// ─────────────────────────────────────────────
// Health & Debug Endpoints
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ 
  status: 'ok', 
  timestamp: new Date(),
  environment: NODE_ENV,
  frontend: FRONTEND_URL,
  service: 'Assessly Backend API'
}));

app.get('/api/debug', (req, res) => res.json({ 
  env: NODE_ENV,
  allowedOrigins: ALLOWED_ORIGINS,
  corsEnabled: true,
  autoSeed: AUTO_SEED,
  frontendUrl: FRONTEND_URL
}));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Assessly Platform API Server',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/health',
    environment: NODE_ENV
  });
});

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────
app.use('/api', routes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(chalk.red('❌ Error:'), err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// ─────────────────────────────────────────────
// Database connection and server start
// ─────────────────────────────────────────────
async function startServer() {
  console.log(chalk.cyan('\n🚀 Starting Assessly Backend Server...\n'));

  try {
    // Modern MongoDB connection
    const conn = await mongoose.connect(MONGODB_URI);
    
    console.log(chalk.green('✅ MongoDB connected successfully'));
    console.log(chalk.gray(`📡 Database: ${conn.connection.name}`));
    console.log(chalk.gray(`🏠 Host: ${conn.connection.host}`));
    console.log(chalk.blue(`🌍 Environment: ${NODE_ENV}`));
    console.log(chalk.magenta(`🎯 Frontend URL: ${FRONTEND_URL}`));
    console.log(chalk.cyan(`🔒 CORS enabled for: ${ALLOWED_ORIGINS.join(', ')}`));
    console.log(chalk.yellow(`🌱 Auto-seed: ${AUTO_SEED}`));

    if (AUTO_SEED) {
      console.log(chalk.yellow('🌱 Auto-seeding enabled'));
      await seedDatabase();
    }

    app.listen(PORT, () => {
      console.log(chalk.green(`📍 Server running on port: ${PORT}`));
      console.log(chalk.magenta(`📊 Health: https://assesslyplatform.onrender.com/api/health`));
      console.log(chalk.green('✅ Server started successfully\n'));
    });
  } catch (err) {
    console.error(chalk.red('❌ Failed to start server:'), err.message);
    console.log(chalk.yellow('🔧 Troubleshooting tips:'));
    console.log(chalk.yellow('   1. Check if MONGODB_URI environment variable is set correctly'));
    console.log(chalk.yellow('   2. Verify MongoDB Atlas network access (IP whitelist)'));
    console.log(chalk.yellow('   3. Check if MongoDB Atlas cluster is running'));
    process.exit(1);
  }
}

// ─────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(chalk.yellow(`\n🛑 ${signal} received. Shutting down gracefully...`));
  await mongoose.connection.close();
  console.log(chalk.green('✅ MongoDB connection closed.'));
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ─────────────────────────────────────────────
// Start the server
// ─────────────────────────────────────────────
startServer();
