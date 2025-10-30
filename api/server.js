import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import chalk from 'chalk';
import dotenv from 'dotenv';
import routes from './routes/index.js'; // Fixed path
import { seedDatabase } from './utils/seedDatabase.js'; // Fixed path

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
const AUTO_SEED = process.env.AUTO_SEED === 'true';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];

// ─────────────────────────────────────────────
// Validate essential environment variables
// ─────────────────────────────────────────────
if (!MONGO_URI) {
  console.error(chalk.red('❌ Missing required environment variable: MONGO_URI'));
  process.exit(1);
}

// ─────────────────────────────────────────────
// Middleware setup
// ─────────────────────────────────────────────
app.use(helmet()); // Security headers
app.use(express.json({ limit: '10mb' })); // Parse JSON with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(
  cors({
    origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : '*',
    credentials: true,
  })
);
app.use(morgan('combined')); // Production logging format

// ─────────────────────────────────────────────
// Health & Debug Endpoints
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.get('/api/debug', (req, res) => res.json({ env: process.env.NODE_ENV || 'production' }));

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
    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(chalk.green('✅ MongoDB connected successfully'));
    console.log(chalk.gray(`📡 Host: ${conn.connection.host}`));

    if (AUTO_SEED) {
      console.log(chalk.yellow('🌱 Auto-seeding enabled'));
      await seedDatabase();
    }

    app.listen(PORT, () => {
      console.log(chalk.green(`📍 Server running on port: ${PORT}`));
      console.log(chalk.blue(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`));
      console.log(chalk.magenta(`📊 Health: /api/health`));
      console.log(chalk.green('✅ Server started successfully\n'));
    });
  } catch (err) {
    console.error(chalk.red('❌ Failed to start server:'), err.message);
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
