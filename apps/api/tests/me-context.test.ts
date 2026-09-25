import express from 'express';
import request from 'supertest';
import { createAccessAuthMiddleware } from '../src/middleware/authentication.middleware.js';
import type { AccessAuthService } from '../src/modules/auth/services/access-auth.service.js';
import { createMeController } from '../src/modules/auth/v1/controllers/me.controller.js';
import type {
  AuthenticatedContext,
  AuthenticatedContextService,
} from '../src/modules/auth/services/context.service.js';

function createAuthService(): AccessAuthService {
  return {
    authenticate: async (token) => {
      if (token === 'valid-token') {
        return {
          sub: 'user-id',
          sid: 'session-id',
          jti: 'jti-id',
          exp: Math.floor(Date.now() / 1000) + 900,
          revoked: false,
        };
      }
      throw new Error('Invalid authentication');
    },
  };
}

function createContextService(context: AuthenticatedContext | null): AuthenticatedContextService {
  return { getContext: async () => context };
}

function createApp(
  context: AuthenticatedContext | null = {
    user: { id: 'user-id', email: 'user@example.com' },
    roles: ['editor', 'viewer'],
    permissions: ['content.read', 'content.write'],
  },
) {
  const app = express();
  app.get(
    '/api/v1/me',
    createAccessAuthMiddleware(createAuthService()),
    createMeController(createContextService(context)),
  );
  return app;
}

describe('GET /api/v1/me', () => {
  it('returns frontend-safe identity, roles, and effective permissions', async () => {
    const response = await request(createApp())
      .get('/api/v1/me')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: { id: 'user-id', email: 'user@example.com' },
      roles: ['editor', 'viewer'],
      permissions: ['content.read', 'content.write'],
    });
  });

  it('rejects missing authentication without invoking context hydration', async () => {
    const contextService: AuthenticatedContextService = {
      getContext: async () => {
        throw new Error('must not hydrate');
      },
    };
    const app = express();
    app.get(
      '/api/v1/me',
      createAccessAuthMiddleware(createAuthService()),
      createMeController(contextService),
    );

    const response = await request(app).get('/api/v1/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid authentication' });
  });

  it('returns generic authentication failure when active user context is absent', async () => {
    const response = await request(createApp(null))
      .get('/api/v1/me')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid authentication' });
  });
});
