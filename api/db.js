// api/db.js
import mongoose from "mongoose";

class DatabaseManager {
  constructor() {
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGO_URI;
      
      if (!mongoUri) {
        throw new Error("MONGO_URI environment variable is required");
      }

      // Prevent multiple connection attempts
      if (this.isConnected) {
        console.log('ℹ️  Using existing database connection');
        return;
      }

      console.log(`🔗 Connecting to MongoDB... (Attempt ${this.retryCount + 1})`);

      const connectionOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(mongoUri, connectionOptions);
      
      this.isConnected = true;
      this.retryCount = 0;
      
      console.log("✅ MongoDB Connected Successfully");

      this.setupEventHandlers();
      
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      await this.handleConnectionError(error);
    }
  }

  setupEventHandlers() {
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      this.isConnected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
  }

  async handleConnectionError(error) {
    this.retryCount++;
    
    if (this.retryCount <= this.maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000); // Exponential backoff
      console.log(`🔄 Retrying connection in ${delay}ms...`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('💥 Maximum connection retries reached. Exiting...');
      process.exit(1);
    }
  }

  async gracefulShutdown() {
    console.log('🛑 Received shutdown signal. Closing database connection...');
    
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed gracefully');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during MongoDB shutdown:', err.message);
      process.exit(1);
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      retryCount: this.retryCount
    };
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

export default databaseManager;
