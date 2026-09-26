import { defineStore } from 'pinia';
import { ref } from 'vue';
import { z } from 'zod';
import { loadEnv } from '../env';
import { createApiClient, type ApiClient } from '../api/client';
import type { AuthenticatedContext, LoginRequest } from '../api/types';

export const REFRESH_TOKEN_STORAGE_KEY = 'cms.refreshToken';

const authStorageErrorMessage = 'Unable to persist authentication session';

export type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated';

export type AuthIdentity = {
  userId: string;
  email: string;
  roles: readonly string[];
  effectivePermissions: readonly string[];
};

export function createAuthStore(apiClient: ApiClient) {
  return defineStore('auth', () => {
    const status = ref<AuthStatus>('restoring');
    const accessToken = ref<string | null>(null);
    const identity = ref<AuthIdentity | null>(null);
    let restorationPromise: Promise<boolean> | null = null;
    let restorationComplete = false;
    let refreshPromise: Promise<boolean> | null = null;
    let sessionGeneration = 0;

    function readRefreshToken(): string | null {
      try {
        return sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      } catch {
        return null;
      }
    }

    function clearStoredRefreshToken(): void {
      try {
        sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      } catch {
        return;
      }
    }

    function storeRefreshToken(token: string): void {
      try {
        sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
      } catch {
        clearSession();
        throw new Error(authStorageErrorMessage);
      }
    }

    function clearSession(): void {
      sessionGeneration += 1;
      accessToken.value = null;
      identity.value = null;
      status.value = 'unauthenticated';
      clearStoredRefreshToken();
    }

    function applyTokenResponse(
      response: { accessToken: string; refreshToken: string },
      generation = sessionGeneration,
    ): boolean {
      if (generation !== sessionGeneration) return false;
      storeRefreshToken(response.refreshToken);
      accessToken.value = response.accessToken;
      identity.value = null;
      status.value = 'authenticated';
      return true;
    }

    function applyContext(context: AuthenticatedContext): void {
      identity.value = {
        userId: context.user.id,
        email: context.user.email,
        roles: context.roles,
        effectivePermissions: context.permissions,
      };
    }

    async function hydrateIdentity(): Promise<void> {
      applyContext(await apiClient.me(accessToken.value ?? undefined));
    }

    async function refreshSession(): Promise<boolean> {
      if (refreshPromise) return refreshPromise;

      const refreshToken = readRefreshToken();
      if (!refreshToken) {
        clearSession();
        return false;
      }

      const generation = sessionGeneration;
      refreshPromise = apiClient
        .refresh({ refreshToken })
        .then((response) => applyTokenResponse(response, generation))
        .catch((error: unknown) => {
          clearSession();
          throw error;
        })
        .finally(() => {
          refreshPromise = null;
        });

      return refreshPromise;
    }

    async function restore(): Promise<boolean> {
      if (restorationComplete) return status.value === 'authenticated';
      if (restorationPromise) return restorationPromise;

      status.value = 'restoring';
      restorationPromise = refreshSession()
        .then(async (restored) => {
          if (!restored) return false;
          try {
            await hydrateIdentity();
            return true;
          } catch (error) {
            clearSession();
            throw error;
          }
        })
        .catch(() => false)
        .finally(() => {
          restorationComplete = true;
          restorationPromise = null;
        });
      return restorationPromise;
    }

    async function login(input: LoginRequest): Promise<boolean> {
      const response = await apiClient.login(input);
      if (!applyTokenResponse(response)) return false;
      try {
        await hydrateIdentity();
        return true;
      } catch (error) {
        clearSession();
        throw error;
      }
    }

    async function logout(): Promise<void> {
      const token = accessToken.value;
      try {
        if (token) await apiClient.logout(token);
      } finally {
        clearSession();
      }
    }

    async function logoutAll(): Promise<void> {
      const token = accessToken.value;
      try {
        if (token) await apiClient.logoutAll(token);
      } finally {
        clearSession();
      }
    }

    return {
      status,
      accessToken,
      identity,
      can: (permission: string) =>
        status.value === 'authenticated' &&
        identity.value?.effectivePermissions.includes(permission) === true,
      isRestoring: () => status.value === 'restoring',
      isAuthenticated: () => status.value === 'authenticated' && accessToken.value !== null,
      login,
      restore,
      refreshSession,
      logout,
      logoutAll,
      clearSession,
    };
  });
}

type AuthStoreDefinition = ReturnType<typeof createAuthStore>;
type AuthStoreInstance = ReturnType<AuthStoreDefinition>;

let authStoreInstance: AuthStoreInstance | undefined;

export const cmsApiClient = createApiClient(
  loadEnv().VITE_API_BASE_URL,
  () => authStoreInstance?.accessToken ?? undefined,
);

const useAuthStoreDefinition = createAuthStore(cmsApiClient);

export function useAuthStore(...args: Parameters<AuthStoreDefinition>): AuthStoreInstance {
  authStoreInstance = useAuthStoreDefinition(...args);
  return authStoreInstance;
}

export const authIdentitySchema = z.object({
  userId: z.string().uuid(),
  email: z.email(),
  roles: z.array(z.string()),
  effectivePermissions: z.array(z.string()),
});
