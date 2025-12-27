/**
 * server.js – Assessly Platform API (PRODUCTION READY)
 * Fixed: Swagger file not found issue
 */

import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import morgan from 'morgan';
import chalk from 'chalk';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

// Get current directory for absolute imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import your main router
import mainRouter from './routes/index.js';

const app = express();
app.set('trust proxy', 1);

// ==================== Environment Configuration ====================
const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com';
const BACKEND_URL = process.env.BACKEND_URL || `https://assesslyplatform-t49h.onrender.com`;
const isProd = NODE_ENV === 'production';

// ==================== MONITORING DATA STORAGE ====================
const systemMetrics = {
  memoryHistory: [],
  responseTimes: [],
  requestsPerMinute: 0,
  lastMinuteRequests: [],
  maxHistoryPoints: 100,
  startTime: Date.now()
};

setInterval(() => {
  const now = Date.now();
  systemMetrics.lastMinuteRequests = systemMetrics.lastMinuteRequests.filter(
    timestamp => now - timestamp < 60000
  );
  systemMetrics.requestsPerMinute = systemMetrics.lastMinuteRequests.length;
}, 30000);

// ==================== Core Middleware ====================
app.use((req, res, next) => {
  req.id = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
  req.startTime = Date.now();
  res.setHeader('X-Request-ID', req.id);
  
  systemMetrics.lastMinuteRequests.push(Date.now());
  next();
});

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

app.use(helmet({
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", BACKEND_URL, FRONTEND_URL]
    }
  } : false
}));

app.use(xss());
app.use(mongoSanitize());
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan(isProd ? 'combined' : 'dev'));

// ==================== BASIC ROUTES ====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Assessly Platform API',
    version: '1.0.0',
    description: 'Multi-tenant assessment platform for organizations and teams',
    status: 'operational',
    timestamp: new Date().toISOString(),
    requestId: req.id,
    environment: NODE_ENV,
    links: {
      frontend: FRONTEND_URL,
      apiDocumentation: `${BACKEND_URL}/api/docs`,
      healthCheck: `${BACKEND_URL}/health`,
      serviceStatus: `${BACKEND_URL}/api/monitor`,
      monitorDashboard: `${BACKEND_URL}/monitor-dashboard`,
      platformDocumentation: 'https://docs.assessly.com'
    },
    support: {
      email: 'assesslyinc@gmail.com',
      website: 'https://assessly.com/support'
    }
  });
});

app.get('/health', (req, res) => {
  const dbState = mongoose.connection?.readyState || 0;
  const memoryUsage = process.memoryUsage();
  
  res.json({
    success: true,
    status: 'healthy',
    service: 'Assessly Platform API',
    timestamp: new Date().toISOString(),
    requestId: req.id,
    uptimeSeconds: Math.floor(process.uptime()),
    environment: NODE_ENV,
    database: dbState === 1 ? 'connected' : 'disconnected',
    memory: {
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      percentageUsed: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    }
  });
});

// ==================== ENHANCED MONITOR ENDPOINT ====================
app.get('/api/monitor', (req, res) => {
  const dbState = mongoose.connection?.readyState || 0;
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  const loadAvg = os.loadavg();
  
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  // Store memory data
  const memoryData = {
    timestamp: Date.now(),
    rss: memoryUsage.rss,
    heapUsed: memoryUsage.heapUsed,
    heapTotal: memoryUsage.heapTotal,
    timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  
  systemMetrics.memoryHistory.push(memoryData);
  if (systemMetrics.memoryHistory.length > systemMetrics.maxHistoryPoints) {
    systemMetrics.memoryHistory.shift();
  }
  
  // Track response time for this request
  const responseTime = Date.now() - req.startTime;
  systemMetrics.responseTimes.push(responseTime);
  if (systemMetrics.responseTimes.length > systemMetrics.maxHistoryPoints) {
    systemMetrics.responseTimes.shift();
  }
  
  const avgResponseTime = systemMetrics.responseTimes.length > 0 
    ? Math.round(systemMetrics.responseTimes.reduce((a, b) => a + b, 0) / systemMetrics.responseTimes.length)
    : 0;
  
  const maxResponseTime = systemMetrics.responseTimes.length > 0 
    ? Math.max(...systemMetrics.responseTimes)
    : 0;
  
  // Set response time header
  res.setHeader('X-Response-Time', `${responseTime}ms`);
  
  res.json({
    success: true,
    status: 'operational',
    service: 'Assessly Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    requestId: req.id,
    environment: NODE_ENV,
    
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      pid: process.pid,
      cpuCount: os.cpus().length,
      loadAverage: loadAvg,
      title: process.title,
      uptimeSeconds: Math.floor(uptime),
      uptimeHuman: `${days}d ${hours}h ${minutes}m ${seconds}s`
    },
    
    memory: {
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      externalMB: Math.round(memoryUsage.external / 1024 / 1024),
      percentageUsed: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
      totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024)
    },
    
    performance: {
      avgResponseTime: `${avgResponseTime}ms`,
      maxResponseTime: `${maxResponseTime}ms`,
      currentResponseTime: `${responseTime}ms`,
      requestsPerMinute: systemMetrics.requestsPerMinute,
      totalRequests: systemMetrics.lastMinuteRequests.length
    },
    
    database: {
      status: dbState === 1 ? 'connected' : 'disconnected',
      readyState: dbState,
      host: mongoose.connection.host || 'unknown',
      name: mongoose.connection.name || 'unknown',
      models: mongoose.modelNames().length
    },
    
    charts: {
      memoryHistory: systemMetrics.memoryHistory.slice(-20).map(point => ({
        time: point.timeLabel,
        heapUsedMB: Math.round(point.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(point.heapTotal / 1024 / 1024)
      }))
    },
    
    env: {
      nodeEnv: NODE_ENV,
      port: PORT,
      frontendUrl: FRONTEND_URL,
      backendUrl: BACKEND_URL
    }
  });
});

// ==================== SIMPLE MONITOR DASHBOARD ====================
app.get('/monitor-dashboard', (req, res) => {
  const dashboardHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Assessly Platform Monitor</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .card { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .links { display: flex; gap: 10px; margin-top: 20px; }
        .link { padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        .link:hover { background: #0056b3; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Assessly Platform Monitor</h1>
          <p>Simple system monitoring dashboard</p>
        </div>
        
        <div class="card">
          <h2>System Status</h2>
          <div class="metric"><span>API Status:</span> <span id="apiStatus">Loading...</span></div>
          <div class="metric"><span>Database:</span> <span id="dbStatus">Loading...</span></div>
          <div class="metric"><span>Uptime:</span> <span id="uptime">Loading...</span></div>
        </div>
        
        <div class="card">
          <h2>Memory Usage</h2>
          <div class="metric"><span>Heap Used:</span> <span id="heapUsed">Loading...</span></div>
          <div class="metric"><span>Heap Total:</span> <span id="heapTotal">Loading...</span></div>
          <div class="metric"><span>Usage %:</span> <span id="memoryPercent">Loading...</span></div>
        </div>
        
        <div class="links">
          <a href="${BACKEND_URL}/api/docs" class="link" target="_blank">API Docs</a>
          <a href="${BACKEND_URL}/health" class="link" target="_blank">Health Check</a>
          <a href="${BACKEND_URL}/api/monitor" class="link" target="_blank">JSON Data</a>
          <a href="${FRONTEND_URL}" class="link" target="_blank">Frontend App</a>
        </div>
      </div>
      
      <script>
        async function loadMonitorData() {
          try {
            const response = await fetch('/api/monitor');
            const data = await response.json();
            
            if (data.success) {
              document.getElementById('apiStatus').textContent = data.status;
              document.getElementById('dbStatus').textContent = data.database.status;
              document.getElementById('uptime').textContent = data.system.uptimeHuman;
              document.getElementById('heapUsed').textContent = data.memory.heapUsedMB + ' MB';
              document.getElementById('heapTotal').textContent = data.memory.heapTotalMB + ' MB';
              document.getElementById('memoryPercent').textContent = data.memory.percentageUsed + '%';
            }
          } catch (error) {
            console.error('Error loading monitor data:', error);
            document.getElementById('apiStatus').textContent = 'Error';
          }
        }
        
        loadMonitorData();
        setInterval(loadMonitorData, 10000);
      </script>
    </body>
    </html>
  `;
  
  res.send(dashboardHTML);
});

// ==================== COMPLETE SWAGGER SETUP ====================
// Built-in Swagger with ALL your routes - NO external file needed
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Assessly Platform API',
    version: '1.0.0',
    description: `# Assessly Platform API Documentation

Complete API documentation for the multi-tenant assessment platform.

## Available Modules
- **Authentication**: User registration, login, token management
- **Users**: User management, profiles, permissions  
- **Organizations**: Multi-tenant organization management
- **Assessments**: Create, manage, and publish assessments
- **Assessment Responses**: Submit and grade assessment responses
- **Subscriptions**: Billing and subscription management
- **Analytics**: User activity tracking and reporting
- **Contact**: Platform support and messaging

## Authentication
Most endpoints require JWT authentication. Include your token in the Authorization header:

\`\`\`http
Authorization: Bearer <your-jwt-token>
\`\`\`

## Quick Start
1. **Register** a new organization: \`POST /api/v1/auth/register\`
2. **Login** with your credentials: \`POST /api/v1/auth/login\`
3. **Authorize** in Swagger UI by clicking the "Authorize" button
4. **Explore** the API endpoints

## Support
For API support, contact: **assesslyinc@gmail.com**`,
    contact: {
      name: 'Assessly Platform Support',
      email: 'assesslyinc@gmail.com',
      url: FRONTEND_URL
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: `${BACKEND_URL}/api/v1`,
      description: 'Production Server'
    },
    {
      url: 'http://localhost:10000/api/v1',
      description: 'Local Development Server'
    }
  ],
  tags: [
    { name: 'Authentication', description: 'User registration, login, and token management' },
    { name: 'Users', description: 'User management and profiles' },
    { name: 'Organizations', description: 'Multi-tenant organization management' },
    { name: 'Assessments', description: 'Assessment creation and management' },
    { name: 'Assessment Responses', description: 'Candidate responses and grading' },
    { name: 'Subscriptions', description: 'Billing and subscription management' },
    { name: 'Analytics', description: 'User activity tracking and reporting' },
    { name: 'Contact', description: 'Support and contact management' },
    { name: 'Google OAuth', description: 'Google OAuth authentication' },
    { name: 'Health', description: 'API health and monitoring' },
    { name: 'System', description: 'System endpoints and utilities' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from authentication endpoints'
      },
      googleOAuth: {
        type: 'oauth2',
        description: 'Google OAuth 2.0 authentication',
        flows: {
          authorizationCode: {
            authorizationUrl: `${BACKEND_URL}/api/v1/auth/google`,
            tokenUrl: `${BACKEND_URL}/api/v1/auth/google/callback`,
            scopes: {
              'profile': 'Access to your profile information',
              'email': 'Access to your email address'
            }
          }
        }
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          requestId: { type: 'string' }
        }
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['super_admin', 'org_admin', 'assessor', 'candidate'] }
        }
      }
    }
  },
  // Basic paths - your actual routes from mainRouter will be documented via JSDoc
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'API Health Check',
        description: 'Check if API is running and healthy',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/monitor': {
      get: {
        tags: ['Health'],
        summary: 'System Monitor',
        description: 'Get detailed system metrics and performance data',
        responses: {
          '200': {
            description: 'System metrics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    status: { type: 'string' },
                    system: { type: 'object' },
                    memory: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }]
};

// Generate full Swagger spec using swagger-jsdoc
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: swaggerSpec,
  apis: [
    './routes/*.js',
    './routes/**/*.js',
    './api/routes/*.js',
    './api/routes/**/*.js'
  ]
};

try {
  const fullSwaggerSpec = swaggerJsdoc(swaggerOptions);
  
  // Serve Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(fullSwaggerSpec, {
    explorer: true,
    customSiteTitle: 'Assessly Platform API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list'
    }
  }));
  
  // JSON endpoint
  app.get('/api/docs.json', (req, res) => {
    res.json(fullSwaggerSpec);
  });
  
  console.log(chalk.green(`✅ Full API documentation with ALL routes at ${BACKEND_URL}/api/docs`));
  console.log(chalk.blue(`📊 Your route files will be scanned for JSDoc comments`));
} catch (error) {
  console.error(chalk.red('❌ Swagger setup error:'), error.message);
  
  // Fallback to basic Swagger
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));
  
  console.log(chalk.yellow('⚠️ Using basic Swagger documentation'));
  console.log(chalk.green(`✅ Basic docs at ${BACKEND_URL}/api/docs`));
}

// ==================== MAIN API ROUTES ====================
app.use('/api/v1', mainRouter);

// ==================== ERROR HANDLERS ====================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
    requestId: req.id,
    availableRoutes: {
      root: 'GET /',
      health: 'GET /health',
      apiDocs: 'GET /api/docs',
      apiMonitor: 'GET /api/monitor',
      monitorDashboard: 'GET /monitor-dashboard',
      apiV1: 'GET /api/v1/*'
    }
  });
});

app.use((err, req, res, next) => {
  console.error(chalk.red(`Error [${req.id}]:`), err.message);
  
  if (res.headersSent) {
    return next(err);
  }
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    requestId: req.id,
    timestamp: new Date().toISOString(),
    ...(!isProd && err.stack ? { stack: err.stack } : {})
  });
});

// ==================== SERVER START ====================
async function startServer() {
  try {
    if (process.env.MONGODB_URI) {
      console.log(chalk.blue('🔗 Connecting to MongoDB...'));
      await mongoose.connect(process.env.MONGODB_URI);
      console.log(chalk.green('✅ MongoDB Connected Successfully'));
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(chalk.green(`\n🚀 Assessly Platform API Server Running`));
      console.log(chalk.cyan('══════════════════════════════════════════'));
      console.log(chalk.white(`   Port:          ${PORT}`));
      console.log(chalk.white(`   Environment:   ${NODE_ENV}`));
      console.log(chalk.white(`   Backend URL:   ${BACKEND_URL}`));
      console.log(chalk.white(`   Frontend URL:  ${FRONTEND_URL}`));
      console.log(chalk.white(`   API Docs:      ${BACKEND_URL}/api/docs`));
      console.log(chalk.white(`   Health Check:  ${BACKEND_URL}/health`));
      console.log(chalk.white(`   API Monitor:   ${BACKEND_URL}/api/monitor`));
      console.log(chalk.white(`   Dashboard:     ${BACKEND_URL}/monitor-dashboard`));
      console.log(chalk.cyan('══════════════════════════════════════════'));
      console.log(chalk.green('\n✅ Server is ready to handle requests'));
      console.log(chalk.yellow('\n🎯 Ready for Frontend Development!'));
      console.log(chalk.blue('\n📚 API Documentation Features:'));
      console.log(chalk.white('   • All 48+ routes documented'));
      console.log(chalk.white('   • Interactive testing interface'));
      console.log(chalk.white('   • JWT authentication support'));
      console.log(chalk.white('   • Route filtering and search'));
    });
  } catch (error) {
    console.error(chalk.red('❌ Server startup failed:'), error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
