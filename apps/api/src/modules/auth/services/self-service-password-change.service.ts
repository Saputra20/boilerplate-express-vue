import { hashPassword, isValidPassword, verifyPassword } from '../../../helpers/password.helper.js';

export type SelfServicePasswordChangeResult =
  | 'changed'
  | 'invalid_current_password'
  | 'invalid_authentication'
  | 'password_change_required'
  | 'password_unchanged';

export type SelfServicePasswordChangeRepository = {
  change(input: {
    userId: string;
    sessionId: string;
    currentPassword: string;
    now: Date;
    requestId: string;
    ipAddress: string | null;
    userAgent: string | null;
    verifyAndHash(
      currentHash: string,
    ): Promise<{ status: 'invalid' | 'unchanged' } | { status: 'valid'; passwordHash: string }>;
  }): Promise<SelfServicePasswordChangeResult>;
  recordInvalidCurrentPassword(input: {
    userId: string;
    sessionId: string;
    requestId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void>;
};

export type SelfServicePasswordChangeService = {
  change(input: {
    userId: string;
    sessionId: string;
    currentPassword: string;
    newPassword: string;
    requestId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<SelfServicePasswordChangeResult | 'password_policy_violation'>;
};

export function createSelfServicePasswordChangeService(
  repository: SelfServicePasswordChangeRepository,
  now: () => Date = () => new Date(),
): SelfServicePasswordChangeService {
  return {
    async change(input) {
      if (!isValidPassword(input.newPassword)) return 'password_policy_violation';

      const result = await repository.change({
        ...input,
        now: now(),
        async verifyAndHash(currentHash) {
          if (!(await verifyPassword(currentHash, input.currentPassword)))
            return { status: 'invalid' };
          if (input.currentPassword === input.newPassword) return { status: 'unchanged' };
          return { status: 'valid', passwordHash: await hashPassword(input.newPassword) };
        },
      });

      if (result === 'invalid_current_password') {
        try {
          await repository.recordInvalidCurrentPassword({
            userId: input.userId,
            sessionId: input.sessionId,
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
          });
        } catch {
          // Failed-attempt audit is best-effort and must not change the password response.
        }
      }
      return result;
    },
  };
}
