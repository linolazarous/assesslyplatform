import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { seedDatabase } from './api/utils/seedDatabase.js';
import routes from './api/routes/index.js'; // Adjust as per your project

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
const AUTO_SEED = process.env.AUTO_SEED === 'true';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];

// Validate essential environment variables
if (!MONGO_URI) {
  console.error(chalk.red('❌ Missing required environment variable: MONGO_URI'));
  process.exit(1);
}

// ─────────────────────────────────────────────
// Middleware setup
// ─────────────────────────────────────────────
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : '*',
    credentials: true,
  })
);
app.use(morgan('dev'));

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
app.use('/api', routes);

app.get('/', (req, res) => {
  res.status(200).send('🚀 Assessly Backend Running');
});

// ─────────────────────────────────────────────
// Database connection and initialization
// ─────────────────────────────────────────────
async function startServer() {
  console.log(chalk.cyan('\n🚀 Starting Assessly Backend Server...\n'));

  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(chalk.green('✅ MongoDB connected successfully'));
    console.log(chalk.gray(`📡 Host: ${conn.connection.host}\n`));

    if (AUTO_SEED) {
      console.log(chalk.yellow('🌱 Auto-seeding enabled'));
      await seedDatabase();
    } else {
      console.log(chalk.gray('🌱 Auto-seeding disabled'));
    }

    app.listen(PORT, () => {
      console.log(chalk.green(`📍 Port: ${PORT}`));
      console.log(chalk.blue(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`));
      console.log(chalk.magenta(`📊 Health: https://assesslyplatform.onrender.com/api/health`));
      console.log(chalk.magenta(`🔍 Debug: https://assesslyplatform.onrender.com/api/debug\n`));
      console.log(chalk.green('✅ Server started successfully\n'));
    });
  } catch (err) {
    console.error(chalk.red('❌ Failed to connect to MongoDB:'), err.message);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🛑 Gracefully shutting down...'));
  await mongoose.connection.close();
  console.log(chalk.green('✅ MongoDB connection closed.'));
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n🛑 Termination signal received.'));
  await mongoose.connection.close();
  console.log(chalk.green('✅ MongoDB connection closed.'));
  process.exit(0);
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────
startServer();
