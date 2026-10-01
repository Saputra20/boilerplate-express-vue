import { z } from 'zod';

export const PASSWORD_POLICY_MESSAGE = 'Password must be 12 to 128 Unicode code points.';

export const passwordPolicySchema = z.string().superRefine((value, context) => {
  const codePointLength = Array.from(value).length;
  if (codePointLength < 12 || codePointLength > 128) {
    context.addIssue({
      code: 'custom',
      message: PASSWORD_POLICY_MESSAGE,
    });
  }
});
