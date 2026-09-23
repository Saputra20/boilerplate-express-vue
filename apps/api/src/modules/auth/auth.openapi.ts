import type { OpenApiContribution } from '../../config/openapi/openapi.js';

export const authOpenApi: OpenApiContribution = {
  tags: [{ name: 'Auth' }],
  schemas: {
    LoginRequest: {
      type: 'object',
      required: ['email', 'password'],
      additionalProperties: false,
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', format: 'password' },
      },
    },
    RefreshRequest: {
      type: 'object',
      required: ['refreshToken'],
      additionalProperties: false,
      properties: {
        refreshToken: { type: 'string' },
      },
    },
    AuthTokens: {
      type: 'object',
      required: ['accessToken', 'refreshToken', 'tokenType', 'expiresIn'],
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        tokenType: { type: 'string', enum: ['Bearer'] },
        expiresIn: { type: 'integer', minimum: 0 },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Authenticated session',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthTokens' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          413: { $ref: '#/components/responses/PayloadTooLarge' },
          429: { $ref: '#/components/responses/TooManyRequests' },
          500: { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        operationId: 'refresh',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Rotated session tokens',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthTokens' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          413: { $ref: '#/components/responses/PayloadTooLarge' },
          429: { $ref: '#/components/responses/TooManyRequests' },
          500: { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        operationId: 'logoutCurrentSession',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Current session revoked' },
          401: { $ref: '#/components/responses/Unauthorized' },
          413: { $ref: '#/components/responses/PayloadTooLarge' },
          429: { $ref: '#/components/responses/TooManyRequests' },
          500: { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/auth/logout-all': {
      post: {
        tags: ['Auth'],
        operationId: 'logoutAllSessions',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'All user sessions revoked' },
          401: { $ref: '#/components/responses/Unauthorized' },
          413: { $ref: '#/components/responses/PayloadTooLarge' },
          429: { $ref: '#/components/responses/TooManyRequests' },
          500: { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
  },
};
