// api/config/swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

dotenv.config();

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';
const BACKEND_URL = process.env.BACKEND_URL || 'https://assesslyplatform-t49h.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://assessly-gedp.onrender.com';
const API_VERSION = process.env.API_VERSION || '1.0.0';

// Common responses for reuse
const commonResponses = {
  400: {
    description: 'Bad Request - Validation error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'object' }
          }
        }
      }
    }
  },
  401: {
    description: 'Unauthorized - Invalid or missing token',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Invalid or expired token' }
          }
        }
      }
    }
  },
  403: {
    description: 'Forbidden - Insufficient permissions',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Access denied: insufficient permissions' }
          }
        }
      }
    }
  },
  404: {
    description: 'Not Found - Resource not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Resource not found' }
          }
        }
      }
    }
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Internal server error' },
            error: { type: 'string' }
          }
        }
      }
    }
  }
};

const options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Assessly Platform API',
      version: API_VERSION,
      description: `
# Assessly Platform API Documentation

Welcome to the Assessly Platform API! This documentation provides comprehensive information about all available endpoints, request/response formats, and authentication requirements.

## 🔐 Authentication
Most endpoints require JWT authentication. Include your token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## 📚 Getting Started
1. **Register** a new user account using \`POST /api/v1/auth/register\`
2. **Login** to get your access token using \`POST /api/v1/auth/login\`
3. **Authorize** in the Swagger UI by clicking the "Authorize" button and entering your token

## 🏗️ API Structure
- Base URL: \`${BACKEND_URL}/api/v1\`
- All dates are in ISO 8601 format
- All responses include a \`success\` boolean field
- Error responses include meaningful messages and codes

## 🚦 Rate Limiting
- Authentication endpoints: 10 requests per minute
- Other endpoints: 100 requests per minute

## 🔗 Useful Links
- [Frontend Application](${FRONTEND_URL})
- [API Health Check](${BACKEND_URL}/api/v1/health)
- [Service Status](${BACKEND_URL}/api/v1/status)
      `,
      termsOfService: `${FRONTEND_URL}/terms`,
      contact: {
        name: 'Assessly Platform Support',
        url: FRONTEND_URL,
        email: 'support@assessly.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    externalDocs: {
      description: 'Assessly Platform Documentation',
      url: `${FRONTEND_URL}/docs`
    },
    servers: [
      {
        url: `${BACKEND_URL}/api/v1`,
        description: isProduction ? 'Production Server' : 'Development Server',
        variables: {
          basePath: {
            default: '/api/v1',
            description: 'API base path'
          }
        }
      },
      {
        url: 'http://localhost:10000/api/v1',
        description: 'Local Development',
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User registration, login, and token management'
      },
      {
        name: 'Users',
        description: 'User management and profile operations'
      },
      {
        name: 'Assessments',
        description: 'Assessment creation, management, and delivery'
      },
      {
        name: 'Assessment Responses',
        description: 'Candidate responses and result management'
      },
      {
        name: 'Organizations',
        description: 'Organization and team management'
      },
      {
        name: 'Subscriptions',
        description: 'Billing and subscription management'
      },
      {
        name: 'Contact',
        description: 'Contact form and message management'
      },
      {
        name: 'User Activities',
        description: 'Activity tracking and audit logs'
      },
      {
        name: 'Health',
        description: 'Service health and status monitoring'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint'
        }
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            code: { type: 'string' },
            errors: { type: 'object' },
            stack: { type: 'string' }
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
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            pages: { type: 'integer', example: 5 }
          }
        },
        
        // Auth schemas
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string', enum: ['admin', 'assessor', 'candidate'] }
              }
            }
          }
        },
        
        // User schemas
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'assessor', 'candidate'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      },
      responses: commonResponses,
      parameters: {
        pageParam: {
          in: 'query',
          name: 'page',
          schema: { type: 'integer', minimum: 1, default: 1 },
          description: 'Page number for pagination'
        },
        limitParam: {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          description: 'Number of items per page'
        },
        sortParam: {
          in: 'query',
          name: 'sort',
          schema: { type: 'string', default: '-createdAt' },
          description: 'Sort field and direction (prefix with - for descending)'
        },
        userIdParam: {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
          description: 'User ID (MongoDB ObjectId)'
        }
      }
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    // Scan all route files for JSDoc comments
    './api/routes/*.js',
    './api/routes/**/*.js',
    './api/models/*.js' // Include models for schema definitions
  ],
};

// Generate Swagger specification
const swaggerSpec = swaggerJsdoc(options);

// Custom Swagger UI options
const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: 'Assessly Platform API Documentation',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info hgroup.main h2 { color: #1e88e5 }
    .swagger-ui .btn.authorize { background-color: #1e88e5; border-color: #1e88e5 }
    .swagger-ui .btn.authorize svg { fill: white }
    .swagger-ui .scheme-container { background-color: #f5f5f5 }
    .model-box-control:focus, .models-control:focus { border-color: #1e88e5 }
    .swagger-ui .opblock-tag { font-size: 24px; border-bottom: 2px solid #1e88e5 }
    .swagger-ui .opblock { border: 1px solid #e0e0e0; border-radius: 8px }
    .swagger-ui .opblock .opblock-summary { border-radius: 8px 8px 0 0 }
  `,
  customJs: `
    // Custom JavaScript for enhanced Swagger UI
    window.onload = function() {
      // Add API version badge
      const title = document.querySelector('.info h2');
      if (title) {
        const badge = document.createElement('span');
        badge.style.cssText = 'background: #1e88e5; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px; margin-left: 10px;';
        badge.textContent = 'v${API_VERSION}';
        title.appendChild(badge);
      }
      
      // Add environment indicator
      const environment = document.createElement('div');
      environment.style.cssText = 'background: ${isProduction ? '#4caf50' : '#ff9800'}; color: white; padding: 8px; text-align: center; font-weight: bold;';
      environment.textContent = '${isProduction ? 'PRODUCTION ENVIRONMENT' : 'DEVELOPMENT ENVIRONMENT'}';
      document.querySelector('.swagger-ui').insertBefore(environment, document.querySelector('.swagger-ui .information-container'));
      
      console.log('🚀 Assessly API Documentation loaded successfully');
      console.log('📡 API Base URL: ${BACKEND_URL}/api/v1');
      console.log('🔗 Frontend: ${FRONTEND_URL}');
    }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    docExpansion: 'list',
    deepLinking: true,
    tryItOutEnabled: true,
    requestSnippetsEnabled: true,
    validatorUrl: null // Disable Swagger validator for offline use
  }
};

/**
 * Setup Swagger documentation middleware
 * @param {Object} app - Express application instance
 */
export function setupSwagger(app) {
  // Serve Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // Serve raw Swagger JSON specification
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation configured:');
  console.log('   📄 API Docs:', `${BACKEND_URL}/api/docs`);
  console.log('   🔗 JSON Spec:', `${BACKEND_URL}/api/docs.json`);
  console.log('   🚀 Base URL:', `${BACKEND_URL}/api/v1`);
  console.log('   🌍 Frontend:', FRONTEND_URL);
}

/**
 * Get Swagger specification for programmatic use
 * @returns {Object} Swagger specification object
 */
export function getSwaggerSpec() {
  return swaggerSpec;
}

/**
 * Validate if all expected routes are documented
 * @returns {Object} Validation results
 */
export function validateDocumentation() {
  const expectedTags = [
    'Authentication',
    'Users', 
    'Assessments',
    'Assessment Responses',
    'Organizations',
    'Subscriptions',
    'Contact',
    'User Activities',
    'Health'
  ];

  const documentedTags = swaggerSpec.tags?.map(tag => tag.name) || [];
  const missingTags = expectedTags.filter(tag => !documentedTags.includes(tag));

  return {
    isValid: missingTags.length === 0,
    documentedTags,
    missingTags,
    totalEndpoints: Object.keys(swaggerSpec.paths || {}).length,
    baseUrl: BACKEND_URL
  };
}

export default setupSwagger;
