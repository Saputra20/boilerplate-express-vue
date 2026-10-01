import express from 'express';
import request from 'supertest';
import { createAccessAuthMiddleware } from '../src/middleware/authentication.middleware.js';
import type { AccessAuthService } from '../src/modules/auth/services/access-auth.service.js';
import {
  createMeController,
  createUpdateMeController,
} from '../src/modules/auth/v1/controllers/me.controller.js';
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
          mustChangePassword: true,
        };
      }
      throw new Error('Invalid authentication');
    },
  };
}

function createContextService(context: AuthenticatedContext | null): AuthenticatedContextService {
  return { getContext: async () => context, updateDisplayName: async () => 'updated' };
}

function createApp(
  context: AuthenticatedContext | null = {
    user: { id: 'user-id', email: 'user@example.com', displayName: null, mustChangePassword: true },
    roles: ['editor', 'viewer'],
    permissions: ['content.read', 'content.write'],
  },
) {
  const app = express();
  app.get(
    '/api/v1/me',
    createAccessAuthMiddleware(createAuthService(), { allowMustChangePassword: true }),
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
      user: {
        id: 'user-id',
        email: 'user@example.com',
        displayName: null,
        mustChangePassword: true,
      },
      roles: ['editor', 'viewer'],
      permissions: ['content.read', 'content.write'],
    });
  });

  it('rejects missing authentication without invoking context hydration', async () => {
    const contextService: AuthenticatedContextService = {
      getContext: async () => {
        throw new Error('must not hydrate');
      },
      updateDisplayName: async () => 'updated',
    };
    const app = express();
    app.get(
      '/api/v1/me',
      createAccessAuthMiddleware(createAuthService(), { allowMustChangePassword: true }),
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

describe('PATCH /api/v1/me', () => {
  it('uses the authenticated subject, validates the exact body, and returns refreshed context', async () => {
    let received: unknown;
    const app = express();
    const access: AccessAuthService = {
      authenticate: async () => ({
        sub: 'user-id',
        sid: 'session-id',
        jti: 'jti-id',
        exp: Math.floor(Date.now() / 1000) + 900,
        revoked: false,
        mustChangePassword: false,
      }),
    };
    const context: AuthenticatedContextService = {
      getContext: async () => ({
        user: {
          id: 'user-id',
          email: 'user@example.com',
          displayName: 'Ada Lovelace',
          mustChangePassword: false,
        },
        roles: [],
        permissions: [],
      }),
      updateDisplayName: async (input) => {
        received = input;
        return 'updated';
      },
    };
    app.use(express.json());
    app.patch('/api/v1/me', createAccessAuthMiddleware(access), createUpdateMeController(context));

    const response = await request(app)
      .patch('/api/v1/me')
      .set('Authorization', 'Bearer valid-token')
      .send({ displayName: '  Ada Lovelace  ' });

    expect(response.status).toBe(200);
    expect(response.body.user.displayName).toBe('Ada Lovelace');
    expect(received).toMatchObject({
      userId: 'user-id',
      sessionId: 'session-id',
      displayName: 'Ada Lovelace',
    });
  });

  it('rejects extra fields and blocks the mandatory password-change state', async () => {
    const access: AccessAuthService = {
      authenticate: async () => ({
        sub: 'user-id',
        sid: 'session-id',
        jti: 'jti-id',
        exp: Math.floor(Date.now() / 1000) + 900,
        revoked: false,
        mustChangePassword: true,
      }),
    };
    const context: AuthenticatedContextService = {
      getContext: async () => null,
      updateDisplayName: async () => 'updated',
    };
    const app = express();
    app.use(express.json());
    app.patch('/api/v1/me', createAccessAuthMiddleware(access), createUpdateMeController(context));
    const auth = { Authorization: 'Bearer valid-token' };

    const unsupported = await request(app)
      .patch('/api/v1/me')
      .set(auth)
      .send({ displayName: 'Ada', role: 'admin' });
    const blocked = await request(app).patch('/api/v1/me').set(auth).send({ displayName: 'Ada' });

    expect(unsupported.status).toBe(400);
    expect(unsupported.body).toEqual({ message: 'Bad request' });
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('password_change_required');
  });
});
