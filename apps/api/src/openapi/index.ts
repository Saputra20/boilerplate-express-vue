import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';
import { authOpenApi } from '../auth/openapi.js';
import { healthOpenApi } from '../health/openapi.js';

export const OPENAPI_DOCUMENT_PATH = '/openapi.json';
export const OPENAPI_UI_PATH = '/docs';
export const OPENAPI_VERSION = '3.0.3';
export const OPENAPI_INFO_VERSION = '0.1.0';

export type OpenApiContribution = {
  tags: swaggerJsdoc.Tag[];
  schemas: Record<string, swaggerJsdoc.Schema>;
  paths: swaggerJsdoc.Paths;
};

export type OpenApiDocument = Record<string, unknown> & {
  openapi: string;
  info: { title: string; version: string };
  servers: Array<{ url: string }>;
  paths: Record<string, unknown>;
  components: {
    securitySchemes: Record<string, unknown>;
  };
};

const contributions = [authOpenApi, healthOpenApi];

export function installOpenApiRoutes(app: Express): void {
  const document = createOpenApiDocument();

  app.get(OPENAPI_DOCUMENT_PATH, (_request, response) => {
    response.type('application/json').send(document);
  });
  app.get(
    OPENAPI_UI_PATH,
    swaggerUi.setup(document, { swaggerOptions: { persistAuthorization: false } }),
  );
  app.use(OPENAPI_UI_PATH, swaggerUi.serve);
}

export function createOpenApiDocument(): OpenApiDocument {
  const contributionPaths = collectPaths(contributions);
  const documentedPaths = [
    OPENAPI_UI_PATH,
    OPENAPI_DOCUMENT_PATH,
    ...Object.keys(contributionPaths),
  ];
  const document = swaggerJsdoc({
    definition: {
      openapi: OPENAPI_VERSION,
      info: {
        title: 'API',
        version: OPENAPI_INFO_VERSION,
      },
      servers: [{ url: '/' }],
      tags: [{ name: 'Documentation' }, ...contributions.flatMap(({ tags }) => tags)],
      paths: {
        [OPENAPI_UI_PATH]: {
          get: {
            tags: ['Documentation'],
            operationId: 'getDocumentation',
            responses: {
              200: { description: 'Swagger UI HTML and assets' },
            },
          },
        },
        [OPENAPI_DOCUMENT_PATH]: {
          get: {
            tags: ['Documentation'],
            operationId: 'getOpenApiDocument',
            responses: {
              200: {
                description: 'OpenAPI JSON document',
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                  },
                },
              },
            },
          },
        },
        ...contributionPaths,
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            required: ['message'],
            properties: {
              message: { type: 'string' },
            },
          },
          ...collectSchemas(contributions),
        },
        responses: {
          BadRequest: errorResponse('Bad request'),
          Unauthorized: errorResponse('Unauthorized'),
          Forbidden: errorResponse('Forbidden'),
          PayloadTooLarge: errorResponse('Payload too large'),
          TooManyRequests: errorResponse('Too many requests'),
          InternalServerError: errorResponse('Internal server error'),
        },
      },
    },
    apis: [],
  });

  if (!isOpenApiDocument(document)) throw new Error('OpenAPI document is invalid');
  validateOpenApiDocument(document, documentedPaths);
  return document;
}

function collectPaths(contributionsToRegister: readonly OpenApiContribution[]): swaggerJsdoc.Paths {
  const paths: swaggerJsdoc.Paths = {};

  for (const contribution of contributionsToRegister) {
    for (const [path, pathItem] of Object.entries(contribution.paths)) {
      if (paths[path] !== undefined) throw new Error(`Duplicate OpenAPI path: ${path}`);
      paths[path] = pathItem;
    }
  }

  return paths;
}

function collectSchemas(
  contributionsToRegister: readonly OpenApiContribution[],
): Record<string, swaggerJsdoc.Schema> {
  const schemas: Record<string, swaggerJsdoc.Schema> = {};

  for (const contribution of contributionsToRegister) {
    for (const [name, schema] of Object.entries(contribution.schemas)) {
      if (schemas[name] !== undefined) throw new Error(`Duplicate OpenAPI schema: ${name}`);
      schemas[name] = schema;
    }
  }

  return schemas;
}

function errorResponse(description: string): swaggerJsdoc.Response {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
      },
    },
  };
}

function isOpenApiDocument(value: unknown): value is OpenApiDocument {
  if (typeof value !== 'object' || value === null) return false;

  const document = value as Record<string, unknown>;
  return (
    typeof document.openapi === 'string' &&
    isObject(document.info) &&
    typeof document.info.title === 'string' &&
    typeof document.info.version === 'string' &&
    Array.isArray(document.servers) &&
    isObject(document.paths) &&
    isObject(document.components) &&
    isObject(document.components.securitySchemes)
  );
}

function validateOpenApiDocument(
  document: OpenApiDocument,
  expectedPaths: readonly string[],
): void {
  if (document.openapi !== OPENAPI_VERSION) throw new Error('OpenAPI version is invalid');
  if (document.info.version !== OPENAPI_INFO_VERSION)
    throw new Error('OpenAPI info version is invalid');
  if (document.servers.length !== 1 || document.servers[0]?.url !== '/') {
    throw new Error('OpenAPI server URL is invalid');
  }
  const bearerAuth = document.components.securitySchemes.bearerAuth;
  if (
    !isObject(bearerAuth) ||
    bearerAuth.type !== 'http' ||
    bearerAuth.scheme !== 'bearer' ||
    bearerAuth.bearerFormat !== 'JWT'
  ) {
    throw new Error('OpenAPI bearer security scheme is missing');
  }
  if (!samePaths(Object.keys(document.paths), expectedPaths)) {
    throw new Error('OpenAPI paths are invalid');
  }
  if ('/ops/queues' in document.paths)
    throw new Error('Operational queue monitor must not be documented');
}

function samePaths(actualPaths: readonly string[], expectedPaths: readonly string[]): boolean {
  return (
    actualPaths.length === expectedPaths.length &&
    actualPaths.every((path) => expectedPaths.includes(path))
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
