// api/config/swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Assessly Platform API',
      version: '1.0.0',
      description:
        'This is the official API documentation for the Assessly Platform. ' +
        'You can explore all endpoints, test requests, and view schemas here.',
      contact: {
        name: 'Assessly Dev Team',
        url: 'https://assessly-gedp.onrender.com',
        email: 'support@assessly.com'
      },
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:10000',
        description: 'Production Server',
      },
      {
        url: 'http://localhost:10000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/**/*.js'], // scans all route files for @swagger comments
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'Assessly API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  }));

  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

components: {
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  },
},
security: [{ bearerAuth: [] }],
