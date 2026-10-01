import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';
import { z } from 'zod';
import {
  loginRequestSchema,
  refreshRequestSchema,
  loginTokenResponseSchema,
  refreshTokenResponseSchema,
  authenticatedContextSchema,
  updateCurrentProfileRequestSchema,
  type AuthenticatedContext,
  type UpdateCurrentProfileRequest,
  type LoginRequest,
  passwordRecoveryRequestSchema,
  passwordRecoveryResponseSchema,
  emailVerificationTokenRequestSchema,
  emailVerificationResponseSchema,
  passwordResetConfirmRequestSchema,
  changePasswordRequestSchema,
  type PasswordRecoveryRequest,
  type EmailVerificationTokenRequest,
  type PasswordResetConfirmRequest,
  type ChangePasswordRequest,
  selfServicePasswordChangeRequestSchema,
  type SelfServicePasswordChangeRequest,
  type RefreshRequest,
  type TokenResponse,
  type LoginTokenResponse,
  categoryListResponseSchema,
  createCategoryRequestSchema,
  updateCategoryRequestSchema,
  type Category,
  type CategoryListResponse,
  type CreateCategoryRequest,
  type UpdateCategoryRequest,
  roleListResponseSchema,
  permissionCatalogSchema,
  createRoleRequestSchema,
  updateRoleRequestSchema,
  type Role,
  type RoleListResponse,
  type PermissionCatalogItem,
  type CreateRoleRequest,
  type UpdateRoleRequest,
  userListResponseSchema,
  createUserRequestSchema,
  updateUserRequestSchema,
  type ManagedUser,
  type UserListResponse,
  type CreateUserRequest,
  type UpdateUserRequest,
  dashboardSummarySchema,
  type DashboardSummary,
} from './types';

export const API_TIMEOUT_MS = 10_000;

const errorResponseSchema = z.object({ message: z.string().min(1), code: z.string().optional() });

export type ApiErrorKind = 'http' | 'timeout' | 'network' | 'invalid-response' | 'unknown';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type AccessTokenProvider = () => string | undefined;

export type ApiRequestConfig = Omit<AxiosRequestConfig, 'headers'> & {
  accessToken?: string;
  headers?: AxiosRequestConfig['headers'];
};

export type ApiTransport = Pick<AxiosInstance, 'request'>;

export type ApiClient = {
  request<T>(config: ApiRequestConfig): Promise<T>;
  login(input: LoginRequest): Promise<LoginTokenResponse>;
  requestPasswordReset(input: PasswordRecoveryRequest): Promise<void>;
  verifyEmail(input: EmailVerificationTokenRequest): Promise<void>;
  confirmPasswordReset(input: PasswordResetConfirmRequest): Promise<void>;
  changePassword(input: ChangePasswordRequest, accessToken?: string): Promise<void>;
  changeCurrentUserPassword(
    input: SelfServicePasswordChangeRequest,
    accessToken?: string,
  ): Promise<void>;
  refresh(input: RefreshRequest): Promise<TokenResponse>;
  me(accessToken?: string): Promise<AuthenticatedContext>;
  updateCurrentUserProfile(
    input: UpdateCurrentProfileRequest,
    accessToken?: string,
  ): Promise<AuthenticatedContext>;
  logout(accessToken?: string): Promise<void>;
  logoutAll(accessToken?: string): Promise<void>;
  listCategories(input: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sort?: 'name.asc' | 'name.desc' | 'createdAt.asc' | 'createdAt.desc';
  }): Promise<CategoryListResponse>;
  createCategory(input: CreateCategoryRequest): Promise<Category>;
  updateCategory(id: string, input: UpdateCategoryRequest): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  listRoles(input: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: 'name.asc' | 'name.desc' | 'createdAt.asc' | 'createdAt.desc';
  }): Promise<RoleListResponse>;
  getRole(id: string): Promise<Role>;
  createRole(input: CreateRoleRequest): Promise<Role>;
  updateRole(id: string, input: UpdateRoleRequest): Promise<Role>;
  deleteRole(id: string): Promise<void>;
  listPermissionCatalog(): Promise<PermissionCatalogItem[]>;
  listUsers(input: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'disabled';
    sort?: 'email.asc' | 'email.desc' | 'createdAt.asc' | 'createdAt.desc';
  }): Promise<UserListResponse>;
  getUser(id: string): Promise<ManagedUser>;
  createUser(input: CreateUserRequest): Promise<ManagedUser>;
  updateUser(id: string, input: UpdateUserRequest): Promise<ManagedUser>;
  deleteUser(id: string): Promise<void>;
  getDashboardSummary(): Promise<DashboardSummary>;
};

export function createApiClient(
  baseURL: string,
  accessTokenProvider?: AccessTokenProvider,
  transport: ApiTransport = axios.create({ baseURL, timeout: API_TIMEOUT_MS }),
): ApiClient {
  async function request<T>(config: ApiRequestConfig): Promise<T> {
    const headers = new AxiosHeaders();
    if (config.headers instanceof AxiosHeaders) {
      headers.set(config.headers);
    } else if (config.headers) {
      Object.entries(config.headers).forEach(([name, value]) => {
        if (value !== undefined) headers.set(name, value);
      });
    }
    const accessToken = config.accessToken ?? accessTokenProvider?.();
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

    const requestConfig = { ...config };
    delete requestConfig.accessToken;

    try {
      const response = await transport.request<T>({
        ...requestConfig,
        baseURL,
        timeout: API_TIMEOUT_MS,
        headers,
      });
      return response.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  }

  return {
    request,
    async login(input) {
      const response = await request<unknown>({
        method: 'POST',
        url: '/api/v1/auth/login',
        data: loginRequestSchema.parse(input),
      });
      return parseTokenResponse(response, loginTokenResponseSchema);
    },
    async requestPasswordReset(input) {
      const response = await request<unknown>({
        method: 'POST',
        url: '/api/v1/auth/password-reset/request',
        data: passwordRecoveryRequestSchema.parse(input),
        accessToken: '',
      });
      const result = passwordRecoveryResponseSchema.safeParse(response);
      if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
    },
    async verifyEmail(input) {
      const response = await request<unknown>({
        method: 'POST',
        url: '/api/v1/auth/email-verification/verify',
        data: emailVerificationTokenRequestSchema.parse(input),
        accessToken: '',
      });
      const result = emailVerificationResponseSchema.safeParse(response);
      if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
    },
    async confirmPasswordReset(input) {
      await request<void>({
        method: 'POST',
        url: '/api/v1/auth/password-reset/confirm',
        data: passwordResetConfirmRequestSchema.parse(input),
        accessToken: '',
      });
    },
    async changePassword(input, accessToken) {
      await request<void>({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        data: changePasswordRequestSchema.parse(input),
        accessToken,
      });
    },
    async changeCurrentUserPassword(input, accessToken) {
      await request<void>({
        method: 'POST',
        url: '/api/v1/auth/change-password/self-service',
        data: selfServicePasswordChangeRequestSchema.parse(input),
        accessToken,
      });
    },
    async refresh(input) {
      const response = await request<unknown>({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        data: refreshRequestSchema.parse(input),
      });
      return parseTokenResponse(response, refreshTokenResponseSchema);
    },
    async me(accessToken) {
      const response = await request<unknown>({
        method: 'GET',
        url: '/api/v1/me',
        accessToken,
      });
      const result = authenticatedContextSchema.safeParse(response);
      if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
      return result.data;
    },
    async updateCurrentUserProfile(input, accessToken) {
      const response = await request<unknown>({
        method: 'PATCH',
        url: '/api/v1/me',
        data: updateCurrentProfileRequestSchema.parse(input),
        accessToken,
      });
      const result = authenticatedContextSchema.safeParse(response);
      if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
      return result.data;
    },
    async logout(accessToken) {
      await request<void>({ method: 'POST', url: '/api/v1/auth/logout', accessToken });
    },
    async logoutAll(accessToken) {
      await request<void>({ method: 'POST', url: '/api/v1/auth/logout-all', accessToken });
    },
    async listCategories(input) {
      const response = await request<unknown>({
        method: 'GET',
        url: '/api/v1/categories',
        params: input,
      });
      const result = categoryListResponseSchema.safeParse(response);
      if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
      return result.data;
    },
    async createCategory(input) {
      const response = await request<unknown>({
        method: 'POST',
        url: '/api/v1/categories',
        data: createCategoryRequestSchema.parse(input),
      });
      return parseCategory(response);
    },
    async updateCategory(id, input) {
      const response = await request<unknown>({
        method: 'PATCH',
        url: `/api/v1/categories/${id}`,
        data: updateCategoryRequestSchema.parse(input),
      });
      return parseCategory(response);
    },
    async deleteCategory(id) {
      await request<void>({ method: 'DELETE', url: `/api/v1/categories/${id}` });
    },
    async listRoles(input) {
      const result = roleListResponseSchema.safeParse(
        await request<unknown>({ method: 'GET', url: '/api/v1/roles', params: input }),
      );
      if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
      return result.data;
    },
    async getRole(id) {
      return parseRole(await request<unknown>({ method: 'GET', url: `/api/v1/roles/${id}` }));
    },
    async createRole(input) {
      return parseRole(
        await request<unknown>({
          method: 'POST',
          url: '/api/v1/roles',
          data: createRoleRequestSchema.parse(input),
        }),
      );
    },
    async updateRole(id, input) {
      return parseRole(
        await request<unknown>({
          method: 'PATCH',
          url: `/api/v1/roles/${id}`,
          data: updateRoleRequestSchema.parse(input),
        }),
      );
    },
    async deleteRole(id) {
      await request<void>({ method: 'DELETE', url: `/api/v1/roles/${id}` });
    },
    async listPermissionCatalog() {
      const result = permissionCatalogSchema.safeParse(
        await request<unknown>({ method: 'GET', url: '/api/v1/misc/permissions' }),
      );
      if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
      return result.data;
    },
    async listUsers(input) {
      const result = userListResponseSchema.safeParse(
        await request<unknown>({ method: 'GET', url: '/api/v1/users', params: input }),
      );
      if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
      return result.data;
    },
    async getUser(id) {
      const result = userListResponseSchema.shape.items.element.safeParse(
        await request<unknown>({ method: 'GET', url: `/api/v1/users/${id}` }),
      );
      if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
      return result.data;
    },
    async createUser(input) {
      const result = userListResponseSchema.shape.items.element.safeParse(
        await request<unknown>({
          method: 'POST',
          url: '/api/v1/users',
          data: createUserRequestSchema.parse(input),
        }),
      );
      if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
      return result.data;
    },
    async updateUser(id, input) {
      const result = userListResponseSchema.shape.items.element.safeParse(
        await request<unknown>({
          method: 'PUT',
          url: `/api/v1/users/${id}`,
          data: updateUserRequestSchema.parse(input),
        }),
      );
      if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
      return result.data;
    },
    async deleteUser(id) {
      await request<void>({ method: 'DELETE', url: `/api/v1/users/${id}` });
    },
    async getDashboardSummary() {
      const result = dashboardSummarySchema.safeParse(
        await request<unknown>({ method: 'GET', url: '/api/v1/dashboard/summary' }),
      );
      if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
      return result.data;
    },
  };
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('Request timed out', 'timeout');
    }

    if (!error.response) return new ApiError('Network request failed', 'network');

    const status = error.response.status;
    const parsed = errorResponseSchema.safeParse(error.response.data);
    return new ApiError(
      parsed.success ? parsed.data.message : safeStatusMessage(status),
      'http',
      status,
      parsed.success ? parsed.data.code : undefined,
    );
  }

  return new ApiError('Unexpected API error', 'unknown');
}

function parseTokenResponse<T extends TokenResponse | LoginTokenResponse>(
  response: unknown,
  schema: z.ZodType<T>,
): T {
  const result = schema.safeParse(response);
  if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
  return result.data;
}

function parseCategory(response: unknown): Category {
  const result = categoryListResponseSchema.shape.items.element.safeParse(response);
  if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
  return result.data;
}

function parseRole(response: unknown): Role {
  const result = roleListResponseSchema.shape.items.element.safeParse(response);
  if (!result.success) throw new ApiError('Invalid API response', 'invalid-response');
  return result.data;
}

function safeStatusMessage(status: number): string {
  if (status === 400) return 'Bad request';
  if (status === 401) return 'Unauthorized';
  if (status === 403) return 'Forbidden';
  if (status === 413) return 'Payload too large';
  if (status === 429) return 'Too many requests';
  if (status >= 500) return 'Internal server error';
  return 'Request failed';
}
