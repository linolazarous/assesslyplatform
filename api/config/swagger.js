// api/config/swagger.js - FIXED VERSION WITH PATHS
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const BACKEND_URL = process.env.BACKEND_URL || 'https://assesslyplatform-t49h.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com';
const API_VERSION = process.env.API_VERSION || '1.0.0';
const PLATFORM_NAME = process.env.PLATFORM_NAME || 'Assessly Platform';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: `${PLATFORM_NAME} API`,
      version: API_VERSION,
      description: `# ${PLATFORM_NAME} API Documentation\n\nComplete API documentation for the ${PLATFORM_NAME} multi-tenant assessment platform.`,
      contact: {
        name: `${PLATFORM_NAME} Support`,
        email: 'assesslyinc@gmail.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `${BACKEND_URL}/api/v1`,
        description: isProduction ? 'Production Server' : 'Development Server'
      },
      {
        url: 'http://localhost:10000/api/v1',
        description: 'Local Development Server'
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User registration, login, and token management'
      },
      {
        name: 'Users',
        description: 'User management and profiles'
      },
      {
        name: 'Organizations',
        description: 'Multi-tenant organization management'
      },
      {
        name: 'Assessments',
        description: 'Assessment creation and management'
      },
      {
        name: 'Health',
        description: 'API health and monitoring'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme'
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
        }
      }
    },
    // ✅ CRITICAL: Added example paths - Your routes will be added by swagger-jsdoc
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'API Health Check',
          description: 'Check if API is running and healthy',
          responses: {
            200: {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      status: { type: 'string', example: 'healthy' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  // This scans your route files for JSDoc comments
  apis: [
    './routes/*.js',
    './routes/**/*.js',
    './api/routes/*.js',
    './api/routes/**/*.js'
  ]
};

// Generate Swagger specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger documentation middleware
 */
export default function setupSwagger(app) {
  try {
    console.log('📚 Setting up API documentation...');
    
    // Swagger UI
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: `${PLATFORM_NAME} API Documentation`,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true
      }
    }));
    
    // JSON endpoint
    app.get('/api/docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
    
    console.log(`✅ Swagger docs available at ${BACKEND_URL}/api/docs`);
    console.log(`📊 Total endpoints documented: ${Object.keys(swaggerSpec.paths || {}).length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Swagger setup failed:', error.message);
    
    // Fallback
    app.get('/api/docs', (req, res) => {
      res.json({
        success: true,
        message: 'Assessly Platform API Documentation',
        note: 'Swagger documentation is being generated',
        requestId: req.id
      });
    });
    return false;
  }
}
