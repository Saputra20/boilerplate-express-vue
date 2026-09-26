import SwaggerParser from '@apidevtools/swagger-parser';
import { readFileSync } from 'node:fs';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';
import type { Express } from 'express';

export const OPENAPI_DOCUMENT_PATH = '/openapi/v1.json';
export const OPENAPI_REDIRECT_PATH = '/docs';
export const OPENAPI_UI_PATH = '/docs/v1';
export const OPENAPI_VERSION = '3.0.3';
export const OPENAPI_INFO_VERSION = '0.1.0';

type OpenApiModuleDocument = {
  tags: Array<{ name: string }>;
  schemas: Record<string, unknown>;
  paths: Record<string, unknown>;
};

export type OpenApiDocument = Record<string, unknown> & {
  openapi: string;
  info: { title: string; version: string };
  servers: Array<{ url: string }>;
  paths: Record<string, unknown>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
    responses: Record<string, unknown>;
  };
};

const authSpecUrl = new URL('../../modules/auth/v1/auth.openapi.yaml', import.meta.url);
const meSpecUrl = new URL('../../modules/me/v1/me.openapi.yaml', import.meta.url);
const healthSpecUrl = new URL('../../modules/health/health.openapi.yaml', import.meta.url);
const categorySpecUrl = new URL('../../modules/category/v1/category.openapi.yaml', import.meta.url);
const roleSpecUrl = new URL('../../modules/role/v1/role.openapi.yaml', import.meta.url);
const userSpecUrl = new URL('../../modules/user/v1/user.openapi.yaml', import.meta.url);
const dashboardSpecUrl = new URL(
  '../../modules/dashboard/v1/dashboard.openapi.yaml',
  import.meta.url,
);
const permissionCatalogSpecUrl = new URL(
  '../../modules/rbac/permission-catalog.openapi.yaml',
  import.meta.url,
);

export const OPENAPI_V1_DOCUMENT = await loadOpenApiDocument();

export function installOpenApiRoutes(app: Express): void {
  app.get(OPENAPI_REDIRECT_PATH, (_request, response) => {
    response.redirect(302, OPENAPI_UI_PATH);
  });
  app.get(OPENAPI_DOCUMENT_PATH, (_request, response) => {
    response.type('application/json').send(OPENAPI_V1_DOCUMENT);
  });
  app.get(OPENAPI_UI_PATH, (request, response, next) => {
    const requestPath = request.originalUrl.split('?')[0];
    if (requestPath === OPENAPI_UI_PATH) {
      response.redirect(302, `${OPENAPI_UI_PATH}/`);
      return;
    }
    next();
  });
  app.get(
    `${OPENAPI_UI_PATH}/`,
    swaggerUi.setup(OPENAPI_V1_DOCUMENT, {
      swaggerOptions: {
        persistAuthorization: false,
        tryItOutEnabled: true,
      },
    }),
  );
  app.use(OPENAPI_UI_PATH, swaggerUi.serve);
}

export function createOpenApiDocument(): OpenApiDocument {
  return OPENAPI_V1_DOCUMENT;
}

async function loadOpenApiDocument(): Promise<OpenApiDocument> {
  const auth = loadModuleDocument(authSpecUrl);
  const me = loadModuleDocument(meSpecUrl);
  const health = loadModuleDocument(healthSpecUrl);
  const category = loadModuleDocument(categorySpecUrl);
  const role = loadModuleDocument(roleSpecUrl);
  const user = loadModuleDocument(userSpecUrl);
  const dashboard = loadModuleDocument(dashboardSpecUrl);
  const permissionCatalog = loadModuleDocument(permissionCatalogSpecUrl);
  const document = {
    openapi: OPENAPI_VERSION,
    info: {
      title: 'API',
      version: OPENAPI_INFO_VERSION,
    },
    servers: [{ url: '/' }],
    tags: [
      { name: 'Documentation' },
      ...auth.tags,
      ...me.tags,
      ...health.tags,
      ...category.tags,
      ...role.tags,
      ...user.tags,
      ...dashboard.tags,
      ...permissionCatalog.tags,
    ],
    paths: {
      [OPENAPI_REDIRECT_PATH]: {
        get: {
          tags: ['Documentation'],
          operationId: 'redirectToOpenApiV1Documentation',
          responses: {
            '302': { description: 'Redirect to v1 Swagger UI' },
          },
        },
      },
      [OPENAPI_UI_PATH]: {
        get: {
          tags: ['Documentation'],
          operationId: 'getOpenApiV1Documentation',
          responses: {
            '200': { description: 'v1 Swagger UI HTML and assets' },
          },
        },
      },
      [OPENAPI_DOCUMENT_PATH]: {
        get: {
          tags: ['Documentation'],
          operationId: 'getOpenApiV1Document',
          responses: {
            '200': {
              description: 'v1 OpenAPI JSON document',
              content: {
                'application/json': {
                  schema: { type: 'object' },
                },
              },
            },
          },
        },
      },
      ...auth.paths,
      ...me.paths,
      ...health.paths,
      ...category.paths,
      ...role.paths,
      ...user.paths,
      ...dashboard.paths,
      ...permissionCatalog.paths,
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
        ...auth.schemas,
        ...me.schemas,
        ...health.schemas,
        ...category.schemas,
        ...role.schemas,
        ...user.schemas,
        ...dashboard.schemas,
        ...permissionCatalog.schemas,
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
  } satisfies OpenApiDocument;

  await SwaggerParser.validate(document as unknown as Parameters<typeof SwaggerParser.validate>[0]);
  validateOpenApiDocument(document);
  return document;
}

function loadModuleDocument(url: URL): OpenApiModuleDocument {
  const document = parse(readFileSync(url, 'utf8'));
  if (!isObject(document)) throw new Error(`OpenAPI YAML document is invalid: ${url.pathname}`);

  const tags = document.tags;
  const schemas = document.schemas;
  const paths = document.paths;
  if (!Array.isArray(tags) || !tags.every(isTag) || !isObject(schemas) || !isObject(paths)) {
    throw new Error(`OpenAPI module YAML shape is invalid: ${url.pathname}`);
  }

  return { tags, schemas, paths };
}

function errorResponse(description: string): Record<string, unknown> {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
      },
    },
  };
}

function validateOpenApiDocument(document: OpenApiDocument): void {
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

  const expectedPaths = [
    OPENAPI_REDIRECT_PATH,
    OPENAPI_UI_PATH,
    OPENAPI_DOCUMENT_PATH,
    '/api/v1/auth/login',
    '/api/v1/auth/refresh',
    '/api/v1/auth/logout',
    '/api/v1/auth/logout-all',
    '/api/v1/me',
    '/health',
    '/ready',
    '/api/v1/categories',
    '/api/v1/categories/{id}',
    '/api/v1/roles',
    '/api/v1/roles/{id}',
    '/api/v1/users',
    '/api/v1/users/{id}',
    '/api/v1/dashboard/summary',
    '/api/v1/misc/permissions',
  ];
  if (!samePaths(Object.keys(document.paths), expectedPaths)) {
    throw new Error('OpenAPI paths are invalid');
  }
  if ('/ops/queues' in document.paths) {
    throw new Error('Operational queue monitor must not be documented');
  }
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

function isTag(value: unknown): value is { name: string } {
  return isObject(value) && typeof value.name === 'string';
}
