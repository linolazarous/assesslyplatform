// api/db.js
import mongoose from 'mongoose';
import { asyncHandler } from './middleware/asyncHandler.js';

// Database connection statistics
const dbStats = {
  totalConnections: 0,
  failedConnections: 0,
  lastConnectionAttempt: null,
  lastSuccessfulConnection: null,
  connectionLatency: 0
};

// Connection state management
const connectionState = {
  isConnected: false,
  isConnecting: false,
  lastError: null,
  retryCount: 0
};

// Enhanced connection configuration
const DB_CONFIG = {
  // Connection options
  autoIndex: process.env.NODE_ENV === 'development', // Auto-index only in development
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '50', 10),
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '10', 10),
  maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME_MS || '60000', 10),
  serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || '10000', 10),
  socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS || '45000', 10),
  connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS || '10000', 10),
  family: 4, // Use IPv4, skip IPv6
  
  // Write concerns
  writeConcern: {
    w: 'majority',
    j: true, // Journaling
    wtimeout: 5000
  },
  
  // Read preferences
  readPreference: 'primaryPreferred',
  
  // Retry configuration
  retryWrites: true,
  retryReads: true,
  
  // Compression
  compressors: ['snappy', 'zlib'],
  
  // Monitoring
  monitorCommands: process.env.NODE_ENV === 'development'
};

/**
 * Enhanced MongoDB connection with comprehensive error handling and monitoring
 */
const connectDB = async () => {
  const startTime = Date.now();
  connectionState.lastConnectionAttempt = new Date();
  connectionState.isConnecting = true;

  try {
    const uri = process.env.MONGODB_URI;
    
    // Validate MongoDB URI
    if (!uri) {
      const error = new Error('❌ MONGODB_URI environment variable is not configured');
      error.code = 'DB_CONFIG_ERROR';
      throw error;
    }

    // Validate URI format
    if (!uri.startsWith('mongodb') && !uri.startsWith('mongodb+srv')) {
      const error = new Error('❌ Invalid MongoDB URI format');
      error.code = 'DB_URI_INVALID';
      throw error;
    }

    console.log('🚀 Initializing MongoDB connection...', {
      environment: process.env.NODE_ENV,
      poolSize: `${DB_CONFIG.minPoolSize}-${DB_CONFIG.maxPoolSize}`,
      timeout: DB_CONFIG.serverSelectionTimeoutMS,
      autoIndex: DB_CONFIG.autoIndex
    });

    // Establish connection
    const conn = await mongoose.connect(uri, DB_CONFIG);
    const connectionTime = Date.now() - startTime;

    // Update connection state
    connectionState.isConnected = true;
    connectionState.isConnecting = false;
    connectionState.lastError = null;
    connectionState.retryCount = 0;
    
    // Update statistics
    dbStats.totalConnections++;
    dbStats.lastSuccessfulConnection = new Date();
    dbStats.connectionLatency = connectionTime;

    console.log(`✅ MongoDB Connected Successfully:`, {
      host: conn.connection.host,
      database: conn.connection.name,
      port: conn.connection.port,
      connectionTime: `${connectionTime}ms`,
      poolSize: conn.connection.maxPoolSize,
      readyState: getReadyStateDescription(conn.connection.readyState)
    });

    // Log connection details (without credentials)
    const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`🔗 Connection URI: ${safeUri}`);

    return conn;

  } catch (error) {
    const connectionTime = Date.now() - startTime;
    
    // Update error state
    connectionState.isConnected = false;
    connectionState.isConnecting = false;
    connectionState.lastError = error.message;
    connectionState.retryCount++;
    dbStats.failedConnections++;

    console.error('❌ MongoDB Connection Failed:', {
      error: error.message,
      code: error.code,
      connectionTime: `${connectionTime}ms`,
      retryCount: connectionState.retryCount,
      timestamp: new Date().toISOString()
    });

    // Enhanced error handling with specific recommendations
    handleConnectionError(error);

    // Don't exit immediately in production - allow for retry mechanisms
    if (process.env.NODE_ENV === 'production' && connectionState.retryCount < 3) {
      console.log(`🔄 Will retry connection (attempt ${connectionState.retryCount + 1})...`);
      return null;
    }

    process.exit(1);
  }
};

/**
 * Enhanced connection event handlers with monitoring
 */

// Connection established
mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB connection established');
  connectionState.isConnected = true;
  
  // Log connection details
  const conn = mongoose.connection;
  console.log('📊 Connection Details:', {
    db: conn.db?.databaseName || 'unknown',
    host: conn.host,
    port: conn.port,
    readyState: getReadyStateDescription(conn.readyState)
  });
});

// Connection error
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', {
    message: err.message,
    name: err.name,
    code: err.code,
    timestamp: new Date().toISOString()
  });
  
  connectionState.isConnected = false;
  connectionState.lastError = err.message;

  // Implement retry logic for transient errors
  if (shouldRetryConnection(err)) {
    scheduleReconnection();
  }
});

// Connection disconnected
mongoose.connection.on('disconnected', () => {
  console.warn('🔌 MongoDB connection disconnected');
  connectionState.isConnected = false;
  
  // Attempt reconnection for unexpected disconnections
  if (process.env.NODE_ENV === 'production') {
    scheduleReconnection();
  }
});

// Connection opened
mongoose.connection.on('open', () => {
  console.log('✅ MongoDB connection opened and ready for use');
});

// Connection closed
mongoose.connection.on('close', () => {
  console.log('🔒 MongoDB connection closed');
});

// Command monitoring (development only)
if (process.env.NODE_ENV === 'development') {
  mongoose.connection.on('commandStarted', (event) => {
    console.log('📝 MongoDB Command Started:', {
      command: event.commandName,
      database: event.databaseName,
      // Don't log full command data for security
    });
  });

  mongoose.connection.on('commandSucceeded', (event) => {
    console.log('✅ MongoDB Command Succeeded:', {
      command: event.commandName,
      duration: event.duration,
      database: event.databaseName
    });
  });

  mongoose.connection.on('commandFailed', (event) => {
    console.error('❌ MongoDB Command Failed:', {
      command: event.commandName,
      failure: event.failure,
      duration: event.duration,
      database: event.databaseName
    });
  });
}

/**
 * Enhanced graceful shutdown handler
 */
const gracefulClose = async (signal) => {
  console.log(`\n⚠️ Received ${signal}. Closing MongoDB connection gracefully...`);
  
  try {
    // Close connection with timeout
    const closePromise = mongoose.connection.close();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection close timeout')), 10000);
    });

    await Promise.race([closePromise, timeoutPromise]);
    
    console.log(`✅ MongoDB connection closed gracefully through ${signal}`);
    process.exit(0);
    
  } catch (error) {
    console.error(`❌ Failed to close MongoDB connection gracefully:`, error.message);
    process.exit(1);
  }
};

/**
 * Health check for database connection
 */
export const checkDatabaseHealth = asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Basic connection check
    const readyState = mongoose.connection.readyState;
    const isConnected = readyState === 1; // 1 = connected
    
    // Optional: Run a simple query to verify database responsiveness
    let dbResponseTime = 0;
    if (isConnected) {
      const queryStart = Date.now();
      await mongoose.connection.db.admin().ping();
      dbResponseTime = Date.now() - queryStart;
    }

    const healthStatus = {
      status: isConnected ? 'healthy' : 'unhealthy',
      database: {
        connected: isConnected,
        readyState,
        readyStateDescription: getReadyStateDescription(readyState),
        responseTime: dbResponseTime,
        totalConnections: dbStats.totalConnections,
        failedConnections: dbStats.failedConnections,
        lastSuccessfulConnection: dbStats.lastSuccessfulConnection,
        connectionLatency: dbStats.connectionLatency
      },
      connectionState: {
        ...connectionState,
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString(),
      checkDuration: Date.now() - startTime
    };

    const statusCode = isConnected ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      checkDuration: Date.now() - startTime
    });
  }
});

/**
 * Get database statistics and metrics
 */
export const getDatabaseStats = asyncHandler(async (req, res) => {
  if (!mongoose.connection.readyState === 1) {
    return res.status(503).json({
      success: false,
      message: 'Database not connected'
    });
  }

  try {
    const adminDb = mongoose.connection.db.admin();
    const serverStatus = await adminDb.serverStatus();
    const dbStats = await mongoose.connection.db.stats();

    // Extract relevant metrics
    const metrics = {
      connections: serverStatus.connections,
      network: serverStatus.network,
      opcounters: serverStatus.opcounters,
      memory: serverStatus.mem,
      storage: {
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexSize: dbStats.indexSize
      },
      collections: dbStats.collections,
      objects: dbStats.objects,
      indexes: dbStats.indexes
    };

    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Failed to get database stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database statistics'
    });
  }
});

/**
 * Helper functions
 */

function getReadyStateDescription(readyState) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[readyState] || 'unknown';
}

function handleConnectionError(error) {
  const errorHandlers = {
    'MongoNetworkError': () => {
      console.error('🌐 Network Error: Check your connection string and network connectivity');
      console.error('💡 Tip: Verify MongoDB Atlas whitelist or VPN configuration');
    },
    'MongoTimeoutError': () => {
      console.error('⏰ Timeout Error: Increase connection timeout or check server load');
      console.error('💡 Tip: Check MONGO_SERVER_SELECTION_TIMEOUT_MS setting');
    },
    'MongoServerSelectionError': () => {
      console.error('🔍 Server Selection Error: No available servers match your criteria');
      console.error('💡 Tip: Check replica set configuration and network partitions');
    },
    'MongoAuthenticationError': () => {
      console.error('🔐 Authentication Error: Invalid credentials or database user permissions');
      console.error('💡 Tip: Verify username, password, and authentication database');
    }
  };

  const handler = errorHandlers[error.name];
  if (handler) {
    handler();
  } else {
    console.error('❌ Unknown connection error - check MongoDB logs and configuration');
  }
}

function shouldRetryConnection(error) {
  const retryableErrors = [
    'MongoNetworkError',
    'MongoTimeoutError',
    'MongoServerSelectionError'
  ];
  
  return retryableErrors.includes(error.name) && connectionState.retryCount < 5;
}

function scheduleReconnection() {
  const delay = Math.min(1000 * Math.pow(2, connectionState.retryCount), 30000); // Exponential backoff, max 30s
  
  console.log(`🔄 Scheduling reconnection in ${delay}ms (attempt ${connectionState.retryCount + 1})`);
  
  setTimeout(() => {
    if (!connectionState.isConnected && !connectionState.isConnecting) {
      connectDB().catch(err => {
        console.error('❌ Reconnection attempt failed:', err.message);
      });
    }
  }, delay);
}

/**
 * Connection pool monitoring
 */
export const monitorConnectionPool = () => {
  setInterval(() => {
    if (mongoose.connection.readyState === 1) {
      const pool = mongoose.connection.getClient().s.options;
      console.log('📊 Connection Pool Status:', {
        total: pool.maxPoolSize,
        current: mongoose.connection.readyState,
        min: pool.minPoolSize,
        max: pool.maxPoolSize
      });
    }
  }, 60000); // Log every minute
};

// Initialize connection pool monitoring in production
if (process.env.NODE_ENV === 'production') {
  setTimeout(monitorConnectionPool, 30000); // Start after 30 seconds
}

// Process signal handlers for graceful shutdown
process.on('SIGINT', () => gracefulClose('SIGINT'));
process.on('SIGTERM', () => gracefulClose('SIGTERM'));
process.on('SIGUSR2', () => gracefulClose('SIGUSR2')); // For nodemon

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulClose('UNCAUGHT_EXCEPTION');
});

// Export connection state for monitoring
export { connectionState, dbStats };

export default connectDB;
