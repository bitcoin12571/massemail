import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Email Dashboard API',
      version: '1.0.0',
      description: 'REST API for email campaign management and automation'
    },
    servers: [
      {
        url: '/api',
        description: 'API Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        CsrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'string' } }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user'] },
            active: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Contact: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['active', 'inactive', 'bounced', 'unsubscribed'] },
            verified: { type: 'boolean' }
          }
        },
        Campaign: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            subject: { type: 'string' },
            htmlContent: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'scheduled', 'sending', 'sent', 'paused'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
