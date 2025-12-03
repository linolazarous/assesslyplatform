// api/db.js
import mongoose from 'mongoose';
import { asyncHandler } from './middleware/asyncHandler.js';

// Database connection statistics for multi-tenant monitoring
const dbStats = {
  totalConnections: 0,
  failedConnections: 0,
  lastConnectionAttempt: null,
  lastSuccessfulConnection: null,
  connectionLatency: 0,
  organizations: new Map(), // Track organization-specific connections
  tenantConnections: 0
};

// Connection state management for multi-tenant architecture
const connectionState = {
  isConnected: false,
  isConnecting: false,
  lastError: null,
  retryCount: 0,
  tenants: new Map(), // Active tenant connections
  superAdminConnected: false
};

// Enhanced connection configuration for B2B SaaS
const DB_CONFIG = {
  // Multi-tenant optimized connection pooling
  autoIndex: process.env.NODE_ENV === 'development', // Auto-index only in development
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '100', 10), // Increased for multi-tenant
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '20', 10),
  maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME_MS || '30000', 10), // Lower for SaaS
  serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || '15000', 10),
  socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS || '60000', 10), // Increased for complex queries
  connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS || '15000', 10),
  family: 4, // Use IPv4, skip IPv6
  
  // Write concerns for data integrity in B2B environment
  writeConcern: {
    w: 'majority',
    j: true, // Journaling for data safety
    wtimeout: 10000 // Increased for multi-document operations
  },
  
  // Read preferences optimized for assessment platform
  readPreference: 'primaryPreferred',
  
  // Retry configuration for high availability
  retryWrites: true,
  retryReads: true,
  
  // Compression for performance
  compressors: ['snappy', 'zlib'],
  
  // Multi-tenant connection flags
  directConnection: false,
  
  // Monitoring for SaaS operations
  monitorCommands: process.env.NODE_ENV === 'development',
  
  // Connection string options for Atlas
  appName: 'AssesslyPlatform',
  retryConnection: true,
  
  // Authentication source
  authSource: 'admin'
};

/**
 * Enhanced MongoDB connection with multi-tenant support and comprehensive error handling
 */
const connectDB = async () => {
  const startTime = Date.now();
  connectionState.lastConnectionAttempt = new Date();
  connectionState.isConnecting = true;

  try {
    const uri = process.env.MONGODB_URI;
    
    // Validate MongoDB URI for production SaaS
    if (!uri) {
      const error = new Error('❌ MONGODB_URI environment variable is not configured');
      error.code = 'DB_CONFIG_ERROR';
      error.severity = 'critical';
      throw error;
    }

    // Validate URI format
    if (!uri.startsWith('mongodb') && !uri.startsWith('mongodb+srv')) {
      const error = new Error('❌ Invalid MongoDB URI format');
      error.code = 'DB_URI_INVALID';
      error.severity = 'critical';
      throw error;
    }

    console.log('🚀 Initializing MongoDB connection for Assessly Platform...', {
      environment: process.env.NODE_ENV,
      platform: 'Assessly B2B SaaS',
      architecture: 'Multi-tenant',
      poolSize: `${DB_CONFIG.minPoolSize}-${DB_CONFIG.maxPoolSize}`,
      timeout: DB_CONFIG.serverSelectionTimeoutMS,
      autoIndex: DB_CONFIG.autoIndex,
      tenantSupport: true
    });

    // Establish connection with enhanced error handling
    const conn = await mongoose.connect(uri, DB_CONFIG);
    const connectionTime = Date.now() - startTime;

    // Update connection state for multi-tenant tracking
    connectionState.isConnected = true;
    connectionState.isConnecting = false;
    connectionState.lastError = null;
    connectionState.retryCount = 0;
    connectionState.superAdminConnected = true;
    
    // Update statistics
    dbStats.totalConnections++;
    dbStats.lastSuccessfulConnection = new Date();
    dbStats.connectionLatency = connectionTime;

    console.log(`✅ MongoDB Connected Successfully for Assessly Platform:`, {
      host: conn.connection.host,
      database: conn.connection.name,
      port: conn.connection.port,
      connectionTime: `${connectionTime}ms`,
      poolSize: conn.connection.maxPoolSize,
      readyState: getReadyStateDescription(conn.connection.readyState),
      tenants: connectionState.tenants.size,
      architecture: 'Multi-tenant B2B SaaS'
    });

    // Log connection details (without credentials)
    const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`🔗 Connection URI: ${safeUri}`);

    // Initialize tenant tracking
    initializeTenantTracking();

    return conn;

  } catch (error) {
    const connectionTime = Date.now() - startTime;
    
    // Update error state with tenant context
    connectionState.isConnected = false;
    connectionState.isConnecting = false;
    connectionState.lastError = error.message;
    connectionState.retryCount++;
    dbStats.failedConnections++;

    console.error('❌ MongoDB Connection Failed for Assessly Platform:', {
      error: error.message,
      code: error.code,
      severity: error.severity || 'high',
      connectionTime: `${connectionTime}ms`,
      retryCount: connectionState.retryCount,
      timestamp: new Date().toISOString(),
      platform: 'Assessly B2B SaaS'
    });

    // Enhanced error handling with B2B SaaS recommendations
    handleConnectionError(error);

    // SaaS-specific retry logic with exponential backoff
    if (process.env.NODE_ENV === 'production' && connectionState.retryCount < 5) {
      const retryDelay = Math.min(1000 * Math.pow(2, connectionState.retryCount), 30000);
      console.log(`🔄 SaaS Platform will retry connection in ${retryDelay}ms (attempt ${connectionState.retryCount + 1})...`);
      setTimeout(connectDB, retryDelay);
      return null;
    }

    // Critical failure for B2B SaaS - notify admin
    notifyAdminDatabaseFailure(error);
    process.exit(1);
  }
};

/**
 * Initialize tenant tracking for multi-tenant architecture
 */
function initializeTenantTracking() {
  // Track organization connections
  mongoose.connection.on('tenantConnected', (tenantId) => {
    connectionState.tenants.set(tenantId, {
      connectedAt: new Date(),
      lastActivity: new Date(),
      connectionCount: (connectionState.tenants.get(tenantId)?.connectionCount || 0) + 1
    });
    dbStats.tenantConnections++;
    
    console.log(`🏢 Tenant connection established: ${tenantId}`, {
      totalTenants: connectionState.tenants.size,
      timestamp: new Date().toISOString()
    });
  });

  // Track tenant activity
  mongoose.connection.on('tenantActivity', (tenantId) => {
    const tenant = connectionState.tenants.get(tenantId);
    if (tenant) {
      tenant.lastActivity = new Date();
    }
  });
}

/**
 * Enhanced connection event handlers with multi-tenant monitoring
 */

// Connection established
mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB connection established for multi-tenant platform');
  connectionState.isConnected = true;
  
  // Log connection details with tenant context
  const conn = mongoose.connection;
  console.log('📊 Multi-tenant Connection Details:', {
    db: conn.db?.databaseName || 'unknown',
    host: conn.host,
    port: conn.port,
    readyState: getReadyStateDescription(conn.readyState),
    activeTenants: connectionState.tenants.size,
    architecture: 'Super Admin + Organization Isolation'
  });
});

// Connection error with tenant context
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error for SaaS platform:', {
    message: err.message,
    name: err.name,
    code: err.code,
    severity: 'high',
    timestamp: new Date().toISOString(),
    activeTenants: connectionState.tenants.size,
    affectedTenants: Array.from(connectionState.tenants.keys())
  });
  
  connectionState.isConnected = false;
  connectionState.lastError = err.message;

  // Notify affected tenants of connection issues
  notifyTenantsOfConnectionIssue(err);

  // Implement retry logic for B2B environment
  if (shouldRetryConnection(err)) {
    scheduleReconnection();
  }
});

// Connection disconnected with tenant impact assessment
mongoose.connection.on('disconnected', () => {
  console.warn('🔌 MongoDB connection disconnected - affecting all tenants');
  connectionState.isConnected = false;
  
  // Log impact on tenants
  const activeTenants = Array.from(connectionState.tenants.keys());
  console.warn(`⚠️  Affecting ${activeTenants.length} active tenants:`, activeTenants);
  
  // Attempt reconnection with tenant awareness
  if (process.env.NODE_ENV === 'production') {
    scheduleReconnection();
  }
});

// Connection opened
mongoose.connection.on('open', () => {
  console.log('✅ MongoDB connection opened and ready for B2B operations');
});

// Connection closed with cleanup
mongoose.connection.on('close', () => {
  console.log('🔒 MongoDB connection closed - cleaning up tenant sessions');
  
  // Clean up tenant tracking
  connectionState.tenants.clear();
  dbStats.tenantConnections = 0;
});

// Command monitoring for SaaS performance analysis
if (process.env.NODE_ENV === 'development') {
  mongoose.connection.on('commandStarted', (event) => {
    const tenantId = event.command?.tenantId || 'system';
    console.log('📝 MongoDB Command Started:', {
      command: event.commandName,
      database: event.databaseName,
      tenant: tenantId,
      timestamp: new Date().toISOString()
    });
  });

  mongoose.connection.on('commandSucceeded', (event) => {
    const tenantId = event.command?.tenantId || 'system';
    console.log('✅ MongoDB Command Succeeded:', {
      command: event.commandName,
      duration: event.duration,
      database: event.databaseName,
      tenant: tenantId,
      performance: event.duration < 100 ? 'good' : event.duration < 500 ? 'acceptable' : 'slow'
    });
  });

  mongoose.connection.on('commandFailed', (event) => {
    const tenantId = event.command?.tenantId || 'system';
    console.error('❌ MongoDB Command Failed:', {
      command: event.commandName,
      failure: event.failure,
      duration: event.duration,
      database: event.databaseName,
      tenant: tenantId,
      severity: 'high'
    });
  });
}

/**
 * Enhanced graceful shutdown handler for multi-tenant SaaS
 */
const gracefulClose = async (signal) => {
  console.log(`\n⚠️ Received ${signal}. Closing MongoDB connection for SaaS platform...`);
  console.log(`🏢 Active tenants: ${connectionState.tenants.size}`);
  
  try {
    // Notify tenants of impending shutdown
    notifyTenantsOfShutdown();
    
    // Close connection with timeout
    const closePromise = mongoose.connection.close();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection close timeout')), 15000);
    });

    await Promise.race([closePromise, timeoutPromise]);
    
    console.log(`✅ MongoDB connection closed gracefully through ${signal}`);
    console.log(`🏢 Tenant sessions cleaned up successfully`);
    process.exit(0);
    
  } catch (error) {
    console.error(`❌ Failed to close MongoDB connection gracefully:`, error.message);
    process.exit(1);
  }
};

/**
 * Health check for database connection with tenant awareness
 */
export const checkDatabaseHealth = asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Basic connection check
    const readyState = mongoose.connection.readyState;
    const isConnected = readyState === 1; // 1 = connected
    
    // Run a simple query to verify database responsiveness
    let dbResponseTime = 0;
    let tenantsHealthy = 0;
    
    if (isConnected) {
      const queryStart = Date.now();
      await mongoose.connection.db.admin().ping();
      dbResponseTime = Date.now() - queryStart;
      
      // Check tenant connections
      tenantsHealthy = Array.from(connectionState.tenants.entries())
        .filter(([tenantId, tenant]) => {
          const timeSinceActivity = Date.now() - tenant.lastActivity.getTime();
          return timeSinceActivity < 300000; // Active in last 5 minutes
        }).length;
    }

    const healthStatus = {
      status: isConnected ? 'healthy' : 'unhealthy',
      platform: 'Assessly B2B SaaS',
      architecture: 'Multi-tenant',
      database: {
        connected: isConnected,
        readyState,
        readyStateDescription: getReadyStateDescription(readyState),
        responseTime: dbResponseTime,
        performance: dbResponseTime < 100 ? 'excellent' : dbResponseTime < 500 ? 'good' : 'needs_attention',
        totalConnections: dbStats.totalConnections,
        failedConnections: dbStats.failedConnections,
        lastSuccessfulConnection: dbStats.lastSuccessfulConnection,
        connectionLatency: dbStats.connectionLatency
      },
      tenants: {
        total: connectionState.tenants.size,
        healthy: tenantsHealthy,
        unhealthy: connectionState.tenants.size - tenantsHealthy,
        activeOrganizations: Array.from(connectionState.tenants.keys())
      },
      connectionState: {
        ...connectionState,
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString(),
      checkDuration: Date.now() - startTime,
      recommendations: isConnected ? [] : [
        'Check MongoDB Atlas connection',
        'Verify network connectivity',
        'Review connection pool settings'
      ]
    };

    const statusCode = isConnected ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      platform: 'Assessly B2B SaaS',
      error: error.message,
      timestamp: new Date().toISOString(),
      checkDuration: Date.now() - startTime,
      severity: 'critical'
    });
  }
});

/**
 * Get database statistics and metrics with tenant breakdown
 */
export const getDatabaseStats = asyncHandler(async (req, res) => {
  // Check if user is Super Admin
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin privileges required.',
      code: 'ACCESS_DENIED'
    });
  }

  if (!mongoose.connection.readyState === 1) {
    return res.status(503).json({
      success: false,
      message: 'Database not connected'
    });
  }

  try {
    const adminDb = mongoose.connection.db.admin();
    const serverStatus = await adminDb.serverStatus();
    const dbStatsResult = await mongoose.connection.db.stats();

    // Extract relevant metrics for SaaS monitoring
    const metrics = {
      connections: serverStatus.connections,
      network: serverStatus.network,
      opcounters: serverStatus.opcounters,
      memory: serverStatus.mem,
      storage: {
        dataSize: dbStatsResult.dataSize,
        storageSize: dbStatsResult.storageSize,
        indexSize: dbStatsResult.indexSize
      },
      collections: dbStatsResult.collections,
      objects: dbStatsResult.objects,
      indexes: dbStatsResult.indexes,
      tenants: {
        count: connectionState.tenants.size,
        active: Array.from(connectionState.tenants.entries())
          .map(([tenantId, tenant]) => ({
            tenantId,
            connectedAt: tenant.connectedAt,
            lastActivity: tenant.lastActivity,
            connectionCount: tenant.connectionCount
          }))
      }
    };

    res.json({
      success: true,
      platform: 'Assessly B2B SaaS',
      metrics,
      timestamp: new Date().toISOString(),
      recommendations: generatePerformanceRecommendations(metrics)
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
 * Get tenant-specific database metrics
 */
export const getTenantDatabaseMetrics = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  
  // Verify user has access to this tenant
  if (!canAccessTenant(req.user, tenantId)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to tenant metrics',
      code: 'TENANT_ACCESS_DENIED'
    });
  }

  try {
    const tenant = connectionState.tenants.get(tenantId);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found in active connections'
      });
    }

    res.json({
      success: true,
      tenantId,
      metrics: {
        connectedAt: tenant.connectedAt,
        lastActivity: tenant.lastActivity,
        connectionCount: tenant.connectionCount,
        uptime: Date.now() - tenant.connectedAt.getTime(),
        isActive: Date.now() - tenant.lastActivity.getTime() < 300000 // 5 minutes
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Failed to get tenant metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tenant metrics'
    });
  }
});

/**
 * Helper functions for multi-tenant SaaS
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
      console.error('💡 SaaS Tip: Verify MongoDB Atlas whitelist for all tenant regions');
    },
    'MongoTimeoutError': () => {
      console.error('⏰ Timeout Error: Increase connection timeout for multi-tenant operations');
      console.error('💡 SaaS Tip: Check MONGO_SERVER_SELECTION_TIMEOUT_MS setting for global deployment');
    },
    'MongoServerSelectionError': () => {
      console.error('🔍 Server Selection Error: No available servers match your criteria');
      console.error('💡 SaaS Tip: Consider geo-distributed deployment for global tenants');
    },
    'MongoAuthenticationError': () => {
      console.error('🔐 Authentication Error: Invalid credentials or database user permissions');
      console.error('💡 SaaS Tip: Use separate database users per tenant for isolation');
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
  console.log(`🏢 Notifying ${connectionState.tenants.size} tenants of reconnection attempt`);
  
  setTimeout(() => {
    if (!connectionState.isConnected && !connectionState.isConnecting) {
      connectDB().catch(err => {
        console.error('❌ Reconnection attempt failed:', err.message);
      });
    }
  }, delay);
}

function notifyAdminDatabaseFailure(error) {
  // In production, this would trigger alerts to platform admins
  console.error('🚨 CRITICAL: Database connection failure for Assessly Platform', {
    error: error.message,
    timestamp: new Date().toISOString(),
    severity: 'critical',
    actionRequired: 'immediate'
  });
  
  // Here you would integrate with your alerting system (PagerDuty, Slack, etc.)
  // sendAlertToAdmin({
  //   title: 'Assessly Platform Database Failure',
  //   message: `Database connection failed: ${error.message}`,
  //   severity: 'critical'
  // });
}

function notifyTenantsOfConnectionIssue(error) {
  // Notify tenants through their dashboard or notifications
  console.warn(`📢 Notifying ${connectionState.tenants.size} tenants of connection issue`);
  
  // In a real implementation, you would:
  // 1. Update tenant dashboards
  // 2. Send in-app notifications
  // 3. Log to tenant-specific logs
}

function notifyTenantsOfShutdown() {
  console.log(`📢 Notifying ${connectionState.tenants.size} tenants of scheduled maintenance`);
  
  // In production:
  // 1. Update all tenant dashboards
  // 2. Send maintenance notifications
  // 3. Gracefully handle ongoing assessments
}

function canAccessTenant(user, tenantId) {
  // Super Admin can access all tenants
  if (user.role === 'super_admin') return true;
  
  // Organization Admin can access their own organization
  if (user.role === 'org_admin' && user.organization === tenantId) return true;
  
  return false;
}

function generatePerformanceRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.connections.current > metrics.connections.available * 0.8) {
    recommendations.push('Consider increasing connection pool size');
  }
  
  if (metrics.storage.indexSize > metrics.storage.dataSize * 0.5) {
    recommendations.push('Review index usage - high index to data ratio');
  }
  
  if (metrics.tenants.count > 50 && metrics.memory.resident < 1000) {
    recommendations.push('Consider increasing MongoDB memory allocation for multi-tenant load');
  }
  
  return recommendations;
}

/**
 * Connection pool monitoring for SaaS optimization
 */
export const monitorConnectionPool = () => {
  setInterval(() => {
    if (mongoose.connection.readyState === 1) {
      const pool = mongoose.connection.getClient().s.options;
      const tenantSummary = Array.from(connectionState.tenants.entries())
        .slice(0, 5) // Show top 5 tenants
        .map(([tenantId, tenant]) => ({
          tenantId,
          lastActivity: tenant.lastActivity
        }));
      
      console.log('📊 SaaS Connection Pool Status:', {
        total: pool.maxPoolSize,
        current: mongoose.connection.readyState,
        min: pool.minPoolSize,
        max: pool.maxPoolSize,
        activeTenants: connectionState.tenants.size,
        sampleTenants: tenantSummary
      });
    }
  }, 60000); // Log every minute
};

// Register tenant connection event
export const registerTenantConnection = (tenantId) => {
  mongoose.connection.emit('tenantConnected', tenantId);
};

// Register tenant activity event
export const registerTenantActivity = (tenantId) => {
  mongoose.connection.emit('tenantActivity', tenantId);
};

// Initialize connection pool monitoring in production
if (process.env.NODE_ENV === 'production') {
  setTimeout(monitorConnectionPool, 30000); // Start after 30 seconds
}

// Process signal handlers for graceful shutdown
process.on('SIGINT', () => gracefulClose('SIGINT'));
process.on('SIGTERM', () => gracefulClose('SIGTERM'));
process.on('SIGUSR2', () => gracefulClose('SIGUSR2')); // For nodemon

// Handle uncaught exceptions for SaaS reliability
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception in SaaS Platform:', error);
  gracefulClose('UNCAUGHT_EXCEPTION');
});

// Export connection state for multi-tenant monitoring
export { connectionState, dbStats };

export default connectDB;
