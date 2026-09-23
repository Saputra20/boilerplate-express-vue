import type { OpenApiContribution } from '../openapi/index.js';

export const healthOpenApi: OpenApiContribution = {
  tags: [{ name: 'Health' }],
  schemas: {
    HealthStatus: {
      type: 'object',
      required: ['status'],
      additionalProperties: false,
      properties: {
        status: { type: 'string', enum: ['ok'] },
      },
    },
    ReadinessStatus: {
      type: 'object',
      required: ['status'],
      additionalProperties: false,
      properties: {
        status: { type: 'string', enum: ['ready', 'not_ready'] },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        operationId: 'getHealth',
        responses: {
          200: {
            description: 'Process is alive',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthStatus' },
              },
            },
          },
        },
      },
    },
    '/ready': {
      get: {
        tags: ['Health'],
        operationId: 'getReadiness',
        responses: {
          200: {
            description: 'Required dependencies are ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReadinessStatus' },
              },
            },
          },
          503: {
            description: 'Required dependency is not ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReadinessStatus' },
              },
            },
          },
        },
      },
    },
  },
};
