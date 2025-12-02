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
const PLATFORM_NAME = process.env.PLATFORM_NAME || 'Assessly Platform';

// Security schemes
const securitySchemes = {
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
};

// Common API responses
const commonResponses = {
  200: {
    description: 'Success',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/SuccessResponse'
        }
      }
    }
  },
  201: {
    description: 'Created',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/SuccessResponse'
        }
      }
    }
  },
  400: {
    description: 'Bad Request - Validation error',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/Error'
        }
      }
    }
  },
  401: {
    description: 'Unauthorized - Invalid or missing authentication',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/Error'
        }
      }
    }
  },
  403: {
    description: 'Forbidden - Insufficient permissions',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/Error'
        }
      }
    }
  },
  404: {
    description: 'Not Found - Resource not found',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/Error'
        }
      }
    }
  },
  409: {
    description: 'Conflict - Resource already exists',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/Error'
        }
      }
    }
  },
  422: {
    description: 'Unprocessable Entity - Business logic error',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/Error'
        }
      }
    }
  },
  429: {
    description: 'Too Many Requests - Rate limit exceeded',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/Error'
        }
      }
    }
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/Error'
        }
      }
    }
  },
  503: {
    description: 'Service Unavailable - Maintenance or overload',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/Error'
        }
      }
    }
  }
};

// API components and schemas
const components = {
  securitySchemes,
  schemas: {
    // Base schemas
    Error: {
      type: 'object',
      required: ['success', 'message'],
      properties: {
        success: { 
          type: 'boolean', 
          example: false 
        },
        message: { 
          type: 'string',
          example: 'Error description'
        },
        code: { 
          type: 'string',
          example: 'VALIDATION_ERROR'
        },
        errors: { 
          type: 'object',
          description: 'Field-specific validation errors'
        },
        stack: { 
          type: 'string',
          description: 'Error stack trace (development only)'
        }
      }
    },
    SuccessResponse: {
      type: 'object',
      required: ['success'],
      properties: {
        success: { 
          type: 'boolean', 
          example: true 
        },
        message: { 
          type: 'string',
          example: 'Operation completed successfully'
        },
        data: { 
          type: 'object',
          description: 'Response data'
        }
      }
    },
    Pagination: {
      type: 'object',
      properties: {
        page: { 
          type: 'integer', 
          example: 1,
          minimum: 1
        },
        limit: { 
          type: 'integer', 
          example: 20,
          minimum: 1,
          maximum: 100
        },
        total: { 
          type: 'integer', 
          example: 100 
        },
        pages: { 
          type: 'integer', 
          example: 5 
        },
        hasNext: {
          type: 'boolean',
          example: true
        },
        hasPrev: {
          type: 'boolean',
          example: false
        }
      }
    },

    // Authentication schemas
    AuthResponse: {
      type: 'object',
      required: ['success', 'token', 'user'],
      properties: {
        success: { 
          type: 'boolean', 
          example: true 
        },
        message: { 
          type: 'string',
          example: 'Authentication successful'
        },
        token: { 
          type: 'string',
          description: 'JWT access token'
        },
        refreshToken: {
          type: 'string',
          description: 'JWT refresh token'
        },
        user: {
          $ref: '#/components/schemas/User'
        }
      }
    },

    // User schemas
    User: {
      type: 'object',
      required: ['id', 'name', 'email', 'role'],
      properties: {
        id: { 
          type: 'string',
          example: '507f1f77bcf86cd799439011'
        },
        name: { 
          type: 'string',
          example: 'John Doe'
        },
        email: { 
          type: 'string',
          format: 'email',
          example: 'john@example.com'
        },
        role: { 
          type: 'string', 
          enum: ['super_admin', 'org_admin', 'assessor', 'candidate'],
          example: 'org_admin'
        },
        isActive: { 
          type: 'boolean',
          example: true
        },
        emailVerified: {
          type: 'boolean',
          example: false
        },
        organization: {
          type: 'string',
          description: 'Organization ID'
        },
        profile: {
          type: 'object',
          properties: {
            avatar: { type: 'string' },
            bio: { type: 'string' },
            company: { type: 'string' },
            position: { type: 'string' },
            timezone: { type: 'string' }
          }
        },
        preferences: {
          type: 'object',
          properties: {
            notifications: {
              type: 'object',
              properties: {
                email: { type: 'boolean' },
                push: { type: 'boolean' }
              }
            },
            language: { type: 'string' },
            theme: { type: 'string' }
          }
        },
        lastLogin: {
          type: 'string',
          format: 'date-time'
        },
        createdAt: { 
          type: 'string', 
          format: 'date-time' 
        },
        updatedAt: { 
          type: 'string', 
          format: 'date-time' 
        }
      }
    },

    // Organization schemas
    Organization: {
      type: 'object',
      required: ['id', 'name', 'slug'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        description: { type: 'string' },
        industry: { type: 'string' },
        size: { type: 'string' },
        contact: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            phone: { type: 'string' },
            website: { type: 'string' }
          }
        },
        settings: {
          type: 'object',
          properties: {
            isPublic: { type: 'boolean' },
            allowSelfRegistration: { type: 'boolean' },
            requireApproval: { type: 'boolean' },
            allowGoogleOAuth: { type: 'boolean' },
            allowEmailPassword: { type: 'boolean' }
          }
        },
        subscription: {
          $ref: '#/components/schemas/Subscription'
        },
        metadata: {
          type: 'object',
          properties: {
            totalMembers: { type: 'integer' },
            totalAssessments: { type: 'integer' },
            totalResponses: { type: 'integer' }
          }
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    },

    // Subscription schemas
    Subscription: {
      type: 'object',
      required: ['plan', 'status'],
      properties: {
        id: { type: 'string' },
        organization: { type: 'string' },
        plan: { 
          type: 'string',
          enum: ['free', 'professional', 'enterprise']
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'suspended', 'canceled']
        },
        billingCycle: {
          type: 'string',
          enum: ['monthly', 'yearly']
        },
        price: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            currency: { type: 'string' }
          }
        },
        features: {
          type: 'object',
          properties: {
            maxUsers: { type: 'integer' },
            maxAssessments: { type: 'integer' },
            maxStorage: { type: 'integer' },
            advancedAnalytics: { type: 'boolean' },
            customBranding: { type: 'boolean' },
            apiAccess: { type: 'boolean' },
            prioritySupport: { type: 'boolean' },
            ssoIntegration: { type: 'boolean' }
          }
        },
        period: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' }
          }
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    },

    // Assessment schemas
    Assessment: {
      type: 'object',
      required: ['title', 'slug', 'status'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        slug: { type: 'string' },
        questions: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/Question'
          }
        },
        settings: {
          $ref: '#/components/schemas/AssessmentSettings'
        },
        status: {
          type: 'string',
          enum: ['draft', 'active', 'paused', 'archived']
        },
        category: { type: 'string' },
        tags: {
          type: 'array',
          items: { type: 'string' }
        },
        totalPoints: { type: 'integer' },
        passingScore: { type: 'integer' },
        access: {
          type: 'string',
          enum: ['public', 'private', 'organization']
        },
        isTemplate: { type: 'boolean' },
        createdBy: { type: 'string' },
        organization: { type: 'string' },
        schedule: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            timezone: { type: 'string' }
          }
        },
        metadata: {
          type: 'object',
          properties: {
            views: { type: 'integer' },
            completions: { type: 'integer' },
            averageScore: { type: 'number' },
            averageTime: { type: 'number' }
          }
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    },

    Question: {
      type: 'object',
      required: ['type', 'question', 'points'],
      properties: {
        type: {
          type: 'string',
          enum: ['multiple-choice', 'single-choice', 'short-answer', 'essay', 'code']
        },
        question: { type: 'string' },
        description: { type: 'string' },
        points: { type: 'integer' },
        options: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/QuestionOption'
          }
        },
        correctAnswer: { type: 'string' },
        explanation: { type: 'string' },
        metadata: {
          type: 'object',
          properties: {
            difficulty: {
              type: 'string',
              enum: ['easy', 'medium', 'hard']
            },
            tags: {
              type: 'array',
              items: { type: 'string' }
            },
            timeLimit: { type: 'integer' }
          }
        }
      }
    },

    QuestionOption: {
      type: 'object',
      required: ['id', 'text'],
      properties: {
        id: { type: 'string' },
        text: { type: 'string' },
        isCorrect: { type: 'boolean' }
      }
    },

    AssessmentSettings: {
      type: 'object',
      properties: {
        duration: { type: 'integer' },
        attempts: { type: 'integer' },
        shuffleQuestions: { type: 'boolean' },
        shuffleOptions: { type: 'boolean' },
        showResults: { type: 'boolean' },
        allowBacktracking: { type: 'boolean' },
        requireFullScreen: { type: 'boolean' },
        webcamMonitoring: { type: 'boolean' },
        disableCopyPaste: { type: 'boolean' }
      }
    }
  },
  responses: commonResponses,
  parameters: {
    // Pagination parameters
    pageParam: {
      in: 'query',
      name: 'page',
      schema: { 
        type: 'integer', 
        minimum: 1, 
        default: 1 
      },
      description: 'Page number for pagination'
    },
    limitParam: {
      in: 'query',
      name: 'limit',
      schema: { 
        type: 'integer', 
        minimum: 1, 
        maximum: 100, 
        default: 20 
      },
      description: 'Number of items per page'
    },
    sortParam: {
      in: 'query',
      name: 'sort',
      schema: { 
        type: 'string', 
        default: '-createdAt' 
      },
      description: 'Sort field and direction (prefix with - for descending)'
    },
    searchParam: {
      in: 'query',
      name: 'search',
      schema: { type: 'string' },
      description: 'Search query for filtering results'
    },
    
    // ID parameters
    userIdParam: {
      in: 'path',
      name: 'userId',
      required: true,
      schema: { 
        type: 'string', 
        pattern: '^[a-fA-F0-9]{24}$' 
      },
      description: 'User ID (MongoDB ObjectId)'
    },
    orgIdParam: {
      in: 'path',
      name: 'orgId',
      required: true,
      schema: { 
        type: 'string', 
        pattern: '^[a-fA-F0-9]{24}$' 
      },
      description: 'Organization ID (MongoDB ObjectId)'
    },
    assessmentIdParam: {
      in: 'path',
      name: 'assessmentId',
      required: true,
      schema: { 
        type: 'string', 
        pattern: '^[a-fA-F0-9]{24}$' 
      },
      description: 'Assessment ID (MongoDB ObjectId)'
    }
  },
  headers: {
    RateLimitLimit: {
      description: 'Request limit per time window',
      schema: { type: 'integer' }
    },
    RateLimitRemaining: {
      description: 'Number of requests left in current time window',
      schema: { type: 'integer' }
    },
    RateLimitReset: {
      description: 'Unix timestamp when rate limit resets',
      schema: { type: 'integer' }
    }
  }
};

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: `${PLATFORM_NAME} API`,
      version: API_VERSION,
      description: `
# ${PLATFORM_NAME} API Documentation

Welcome to the ${PLATFORM_NAME} API! This is a comprehensive multi-tenant assessment platform that supports multiple organizations with their own users, assessments, and subscriptions.

## 🚀 Quick Start

1. **Register** a new organization and user using \`POST /api/v1/auth/register\`
2. **Authenticate** using email/password or Google OAuth
3. **Authorize** in Swagger UI by clicking the "Authorize" button and entering your JWT token
4. **Explore** the API endpoints for your organization

## 🔐 Authentication

The API supports multiple authentication methods:

### JWT Bearer Token
Most endpoints require JWT authentication. Include your token in the Authorization header:
\`\`\`http
Authorization: Bearer <your-jwt-token>
\`\`\`

### Google OAuth 2.0
For OAuth authentication, use the Google OAuth flow:
1. Redirect users to \`/api/v1/auth/google\`
2. Handle callback at \`/api/v1/auth/google/callback\`
3. Receive JWT token for API access

## 🏗️ Multi-Tenant Architecture

- Each organization operates in complete isolation
- Users belong to specific organizations
- Assessments and data are scoped to organizations
- Subscription plans determine feature availability

## 📊 Rate Limiting

- **Authentication endpoints**: 10 requests per minute per IP
- **API endpoints**: 100 requests per minute per organization
- **File uploads**: 5 requests per minute per user

## 🔗 Useful Links

- [Frontend Application](${FRONTEND_URL})
- [API Health Check](${BACKEND_URL}/api/v1/health)
- [Service Status](${BACKEND_URL}/api/v1/status)
- [Platform Documentation](${FRONTEND_URL}/docs)

## 📝 Support

For API support, contact: **support@assessly.com**
      `,
      termsOfService: `${FRONTEND_URL}/terms`,
      contact: {
        name: `${PLATFORM_NAME} Support`,
        url: FRONTEND_URL,
        email: 'support@assessly.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    externalDocs: {
      description: 'Platform Documentation',
      url: `${FRONTEND_URL}/docs`
    },
    servers: [
      {
        url: `${BACKEND_URL}/api/v1`,
        description: isProduction ? 'Production Server' : 'Development Server'
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User registration, login, OAuth, and token management'
      },
      {
        name: 'Users',
        description: 'User management, profiles, and preferences'
      },
      {
        name: 'Organizations',
        description: 'Multi-tenant organization management'
      },
      {
        name: 'Assessments',
        description: 'Assessment creation, management, and templates'
      },
      {
        name: 'Assessment Responses',
        description: 'Candidate responses, grading, and analytics'
      },
      {
        name: 'Subscriptions',
        description: 'Billing, plans, and subscription management'
      },
      {
        name: 'Analytics',
        description: 'Platform analytics and reporting'
      },
      {
        name: 'Health',
        description: 'Service health monitoring and status'
      }
    ],
    components,
    security: [{ bearerAuth: [] }]
  },
  apis: [
    // Scan all route files for JSDoc comments
    './api/routes/*.js',
    './api/routes/**/*.js',
    './api/models/*.js',
    './api/middleware/*.js'
  ],
};

// Generate Swagger specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI configuration
const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: `${PLATFORM_NAME} API Documentation`,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info hgroup.main h2 { 
      color: #1e88e5; 
      font-size: 2em; 
      margin-bottom: 10px;
    }
    .swagger-ui .btn.authorize { 
      background-color: #1e88e5; 
      border-color: #1e88e5; 
    }
    .swagger-ui .btn.authorize svg { fill: white }
    .swagger-ui .scheme-container { 
      background-color: #f8f9fa; 
      border-bottom: 1px solid #dee2e6;
    }
    .swagger-ui .opblock-tag { 
      font-size: 1.5em; 
      border-bottom: 2px solid #1e88e5;
      padding-bottom: 5px;
    }
    .swagger-ui .opblock { 
      border: 1px solid #e9ecef; 
      border-radius: 8px;
      margin-bottom: 15px;
    }
    .swagger-ui .opblock .opblock-summary { 
      border-radius: 8px 8px 0 0;
      padding: 10px;
    }
    .environment-banner {
      background: ${isProduction ? '#4caf50' : '#ff9800'};
      color: white;
      padding: 12px;
      text-align: center;
      font-weight: bold;
      font-size: 14px;
      border-bottom: 1px solid #dee2e6;
    }
    .api-info-bar {
      background: #e3f2fd;
      padding: 10px 15px;
      border-bottom: 1px solid #bbdefb;
      font-size: 13px;
    }
    .api-info-bar a {
      color: #1e88e5;
      text-decoration: none;
      margin: 0 10px;
    }
    .api-info-bar a:hover {
      text-decoration: underline;
    }
  `,
  customJs: `
    window.onload = function() {
      // Add environment banner
      const banner = document.createElement('div');
      banner.className = 'environment-banner';
      banner.innerHTML = '${isProduction ? '🚀 PRODUCTION ENVIRONMENT' : '🔧 DEVELOPMENT ENVIRONMENT'} - ${PLATFORM_NAME} API v${API_VERSION}';
      document.querySelector('.swagger-ui').insertBefore(banner, document.querySelector('.swagger-ui .information-container'));
      
      // Add API info bar
      const infoBar = document.createElement('div');
      infoBar.className = 'api-info-bar';
      infoBar.innerHTML = \`
        <strong>Quick Links:</strong>
        <a href="${FRONTEND_URL}" target="_blank">🌐 Frontend App</a> |
        <a href="${BACKEND_URL}/api/v1/health" target="_blank">💚 Health Check</a> |
        <a href="${FRONTEND_URL}/docs" target="_blank">📚 Documentation</a> |
        <a href="mailto:support@assessly.com">📧 Support</a>
      \`;
      document.querySelector('.swagger-ui').insertBefore(infoBar, document.querySelector('.swagger-ui .scheme-container'));
      
      console.log(\`📚 ${PLATFORM_NAME} API Documentation loaded\`);
      console.log(\`🏷️  Version: v${API_VERSION}\`);
      console.log(\`🔗 Base URL: ${BACKEND_URL}/api/v1\`);
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
    validatorUrl: null,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    displayOperationId: false
  }
};

/**
 * Setup Swagger documentation middleware
 */
export function setupSwagger(app) {
  // Serve Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // Serve raw Swagger JSON specification
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve OpenAPI specification (standard format)
  app.get('/api/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger Documentation:');
  console.log(`   📄 Interactive Docs: ${BACKEND_URL}/api/docs`);
  console.log(`   🔗 JSON Spec: ${BACKEND_URL}/api/docs.json`);
  console.log(`   🌐 OpenAPI Spec: ${BACKEND_URL}/api/openapi.json`);
  console.log(`   🏷️  API Version: v${API_VERSION}`);
  console.log('   🔐 Auth: JWT Bearer + Google OAuth');
}

/**
 * Get Swagger specification
 */
export function getSwaggerSpec() {
  return swaggerSpec;
}

/**
 * Validate API documentation coverage
 */
export function validateDocumentation() {
  const paths = Object.keys(swaggerSpec.paths || {});
  const schemas = Object.keys(swaggerSpec.components?.schemas || {});
  
  const coverage = {
    totalEndpoints: paths.length,
    totalSchemas: schemas.length,
    securitySchemes: Object.keys(swaggerSpec.components?.securitySchemes || {}),
    tags: swaggerSpec.tags?.map(tag => tag.name) || [],
    missingComponents: []
  };

  return coverage;
}

export default setupSwagger;
