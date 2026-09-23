import type { AccessPrincipal } from './access-auth-service.js';

export type LogoutRepository = {
  logoutCurrent(input: { principal: AccessPrincipal; requestId: string }): Promise<void>;
  logoutAll(input: { principal: AccessPrincipal; requestId: string }): Promise<void>;
  recordFailure(input: {
    principal: AccessPrincipal;
    requestId: string;
    scope: 'current' | 'all';
  }): Promise<void>;
};

export type LogoutService = {
  logoutCurrent(input: { principal: AccessPrincipal; requestId: string }): Promise<void>;
  logoutAll(input: { principal: AccessPrincipal; requestId: string }): Promise<void>;
  recordFailure(input: {
    principal: AccessPrincipal;
    requestId: string;
    scope: 'current' | 'all';
  }): Promise<void>;
};

export function createLogoutService(repository: LogoutRepository): LogoutService {
  return {
    logoutCurrent: (input) => repository.logoutCurrent(input),
    logoutAll: (input) => repository.logoutAll(input),
    recordFailure: (input) => repository.recordFailure(input),
  };
}
