import { z } from 'zod';

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export const passwordRecoveryRequestSchema = z.object({ email: z.email() }).strict();
export const passwordRecoveryResponseSchema = z.object({ message: z.string().min(1) });
export const emailVerificationTokenRequestSchema = z
  .object({ token: z.string().min(1).max(128) })
  .strict();
export const emailVerificationResponseSchema = z
  .object({ message: z.literal('Email verified') })
  .strict();
export const passwordResetConfirmRequestSchema = z
  .object({ token: z.string(), password: z.string() })
  .strict();

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

const baseTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().nonnegative(),
});

export const loginTokenResponseSchema = baseTokenResponseSchema.extend({
  mustChangePassword: z.literal(true).optional(),
});
export const refreshTokenResponseSchema = baseTokenResponseSchema;

export const changePasswordRequestSchema = z
  .object({ currentPassword: z.string(), newPassword: z.string() })
  .strict();
export const selfServicePasswordChangeRequestSchema = changePasswordRequestSchema;

export const authenticatedContextSchema = z.object({
  user: z.object({
    id: z.uuid(),
    email: z.email(),
    displayName: z.string().nullable(),
    mustChangePassword: z.boolean(),
  }),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});

const displayNameSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => {
    const length = Array.from(value).length;
    return length >= 1 && length <= 80;
  }, 'Use between 1 and 80 characters.');

export const updateCurrentProfileRequestSchema = z
  .object({ displayName: displayNameSchema })
  .strict();

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type PasswordRecoveryRequest = z.infer<typeof passwordRecoveryRequestSchema>;
export type EmailVerificationTokenRequest = z.infer<typeof emailVerificationTokenRequestSchema>;
export type PasswordResetConfirmRequest = z.infer<typeof passwordResetConfirmRequestSchema>;
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type LoginTokenResponse = z.infer<typeof loginTokenResponseSchema>;
export type TokenResponse = z.infer<typeof refreshTokenResponseSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
export type SelfServicePasswordChangeRequest = z.infer<
  typeof selfServicePasswordChangeRequestSchema
>;
export type AuthenticatedContext = z.infer<typeof authenticatedContextSchema>;
export type UpdateCurrentProfileRequest = z.input<typeof updateCurrentProfileRequestSchema>;

const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export const categoryListResponseSchema = z.object({
  items: z.array(categorySchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const createCategoryRequestSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateCategoryRequestSchema = createCategoryRequestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export type Category = z.infer<typeof categorySchema>;
export type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;
export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>;

const roleSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  permissionCodes: z.array(z.string()),
});

export const roleListResponseSchema = z.object({
  items: z.array(roleSchema),
  pagination: categoryListResponseSchema.shape.pagination,
});
export const permissionCatalogSchema = z.array(
  z.object({ id: z.uuid(), code: z.string(), description: z.string().nullable() }),
);
export const createRoleRequestSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  permissionCodes: z.array(z.string()),
});
export const updateRoleRequestSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    permissionCodes: z.array(z.string()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);
export type Role = z.infer<typeof roleSchema>;
export type RoleListResponse = z.infer<typeof roleListResponseSchema>;
export type PermissionCatalogItem = z.infer<typeof permissionCatalogSchema>[number];
export type CreateRoleRequest = z.infer<typeof createRoleRequestSchema>;
export type UpdateRoleRequest = z.infer<typeof updateRoleRequestSchema>;

const userRoleSchema = z.object({ id: z.uuid(), code: z.string(), name: z.string() });
const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  status: z.enum(['active', 'disabled']),
  emailVerifiedAt: z.coerce.date().nullable(),
  lastLoginAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
  role: userRoleSchema.nullable(),
  mustChangePassword: z.boolean(),
});
export const userListResponseSchema = z.object({
  items: z.array(userSchema),
  pagination: categoryListResponseSchema.shape.pagination,
});
export const createUserRequestSchema = z.object({ email: z.email(), roleId: z.uuid() });
export const updateUserRequestSchema = z
  .object({
    email: z.email().optional(),
    roleId: z.uuid().nullable().optional(),
    status: z.enum(['active', 'disabled']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);
export type ManagedUser = z.infer<typeof userSchema>;
export type UserListResponse = z.infer<typeof userListResponseSchema>;
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

export const dashboardSummarySchema = z.object({
  users: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    disabled: z.number().int().nonnegative(),
  }),
  roles: z.object({ total: z.number().int().nonnegative() }),
  categories: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
  }),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export const auditEventTypeSchema = z.enum([
  'category.created',
  'category.updated',
  'category.deleted',
  'role.created',
  'role.updated',
  'role.deleted',
  'user.created',
  'user.updated',
  'user.deleted',
  'user.profile_updated',
  'audit.exported',
]);
export type AuditEventType = z.infer<typeof auditEventTypeSchema>;

export const auditEventLabels: Record<AuditEventType, string> = {
  'category.created': 'Category created',
  'category.updated': 'Category updated',
  'category.deleted': 'Category deleted',
  'role.created': 'Role created',
  'role.updated': 'Role updated',
  'role.deleted': 'Role deleted',
  'user.created': 'User created',
  'user.updated': 'User updated',
  'user.deleted': 'User deleted',
  'user.profile_updated': 'Profile updated',
  'audit.exported': 'Audit trail exported',
};

const auditActorSchema = z.object({
  type: z.enum(['user', 'system']),
  available: z.boolean(),
  id: z.uuid().nullable(),
  displayName: z.string().nullable(),
  email: z.email().nullable(),
});
const auditResourceSchema = z.object({
  type: z.string().nullable(),
  id: z.string().nullable(),
});
const auditItemSchema = z.object({
  id: z.uuid(),
  eventType: auditEventTypeSchema,
  label: z.string(),
  actor: auditActorSchema,
  resource: auditResourceSchema,
  outcome: z.enum(['success', 'failure']),
  createdAt: z.coerce.date(),
});
const auditChangesSchema = z.object({
  available: z.boolean(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
});
const auditExportSummarySchema = z.object({
  rowCount: z.number().int().min(0).max(10_000),
  from: z.coerce.date(),
  to: z.coerce.date(),
  filters: z.object({
    action: auditEventTypeSchema.nullable(),
    actorId: z.uuid().nullable(),
    resourceType: z.string().nullable(),
    resourceId: z.string().nullable(),
    outcome: z.enum(['success', 'failure']).nullable(),
  }),
  searchApplied: z.boolean(),
});

export const auditListResponseSchema = z.object({
  items: z.array(auditItemSchema),
  pagination: z.object({
    limit: z.union([z.literal(10), z.literal(20), z.literal(50), z.literal(100)]),
    nextCursor: z.string().nullable(),
  }),
});
export const auditDetailSchema = auditItemSchema.extend({
  requestId: z.uuid().nullable(),
  changes: auditChangesSchema.optional(),
  exportSummary: auditExportSummarySchema.optional(),
});

export type AuditListItem = z.infer<typeof auditItemSchema>;
export type AuditListResponse = z.infer<typeof auditListResponseSchema>;
export type AuditDetail = z.infer<typeof auditDetailSchema>;
export type AuditEventQuery = {
  from?: string;
  to?: string;
  actorId?: string;
  action?: AuditEventType;
  resourceType?: string;
  resourceId?: string;
  outcome?: 'success' | 'failure';
  q?: string;
  limit?: 10 | 20 | 50 | 100;
  cursor?: string;
};

export const auditEventQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  actorId: z.uuid().optional(),
  action: auditEventTypeSchema.optional(),
  resourceType: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/)
    .max(64)
    .optional(),
  resourceId: z.string().min(1).max(255).optional(),
  outcome: z.enum(['success', 'failure']).optional(),
  q: z.string().trim().min(2).max(120).optional(),
  limit: z.union([z.literal(10), z.literal(20), z.literal(50), z.literal(100)]).optional(),
  cursor: z.string().min(1).max(512).optional(),
});

export const auditEventExportQuerySchema = auditEventQuerySchema.omit({
  limit: true,
  cursor: true,
});
export type AuditEventExportQuery = Omit<AuditEventQuery, 'limit' | 'cursor'>;
