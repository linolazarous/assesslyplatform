// api/db.js
import mongoose from "mongoose";

class Database {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log("✅ Using existing MongoDB connection");
        return this.connection;
      }

      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 5, // Maintain at least 5 socket connections
        maxIdleTimeMS: 30000, // Close idle connections after 30s
      };

      this.connection = await mongoose.connect(process.env.MONGO_URI, options);
      this.isConnected = true;

      // Connection event handlers
      mongoose.connection.on('connected', () => {
        console.log("✅ MongoDB Connected");
      });

      mongoose.connection.on('error', (err) => {
        console.error("❌ MongoDB Connection Error:", err.message);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log("⚠️ MongoDB Disconnected");
        this.isConnected = false;
      });

      // Handle application termination
      process.on('SIGINT', this.gracefulShutdown.bind(this));
      process.on('SIGTERM', this.gracefulShutdown.bind(this));

      return this.connection;
    } catch (err) {
      console.error("❌ MongoDB Connection Failed:", err.message);
      
      // Implement retry logic for production
      if (process.env.NODE_ENV === 'production') {
        console.log("🔄 Retrying connection in 5 seconds...");
        setTimeout(() => this.connect(), 5000);
      } else {
        process.exit(1);
      }
    }
  }

  async gracefulShutdown() {
    console.log("🛑 Closing MongoDB connection...");
    
    try {
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed gracefully");
      process.exit(0);
    } catch (err) {
      console.error("❌ Error during MongoDB shutdown:", err.message);
      process.exit(1);
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }
}

// Create singleton instance
const database = new Database();

// Export both the instance and class
export { database as connectDB, Database };
export default database;
