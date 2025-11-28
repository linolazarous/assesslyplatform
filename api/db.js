// api/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI is not set');
      process.exit(1);
    }

    const opts = {
      // performance & reliability
      autoIndex: false,
      maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '20', 10),
      minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '5', 10),
      serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || '5000', 10),
      socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS || '45000', 10),
      // retryWrites and TLS are usually managed in the connection string for Atlas
      // keepAlive options are driver-specific; latest drivers handle keepAlive automatically
    };

    const conn = await mongoose.connect(uri, opts);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📡 DB: ${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
};

// events + graceful shutdown (keep the improved version you already have)
mongoose.connection.on('connected', () => console.log('🔗 MongoDB connected'));
mongoose.connection.on('error', (err) => console.error('❌ MongoDB connection error:', err));
mongoose.connection.on('disconnected', () => console.warn('🔌 MongoDB disconnected'));

const gracefulClose = async (signal) => {
  await mongoose.connection.close(false);
  console.log(`⚠️ MongoDB connection closed through ${signal}`);
  process.exit(0);
};

process.on('SIGINT', () => gracefulClose('SIGINT'));
process.on('SIGTERM', () => gracefulClose('SIGTERM'));
process.on('SIGUSR2', () => gracefulClose('SIGUSR2'));

export default connectDB;
