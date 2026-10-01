import { updateProfileSchema } from '../src/modules/auth/v1/validation/profile.validation.js';

describe('self-profile displayName validation', () => {
  it('trims outer whitespace and preserves internal whitespace', () => {
    expect(updateProfileSchema.parse({ displayName: '  Ada  Lovelace  ' })).toEqual({
      displayName: 'Ada  Lovelace',
    });
  });

  it('counts Unicode code points for both boundaries', () => {
    expect(updateProfileSchema.safeParse({ displayName: '😀'.repeat(80) }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ displayName: '😀'.repeat(81) }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ displayName: ' ' }).success).toBe(false);
  });

  it.each([undefined, null, 1, {}, { displayName: 'Ada', email: 'other@example.test' }])(
    'rejects unsupported input %p',
    (input) => {
      expect(updateProfileSchema.safeParse(input).success).toBe(false);
    },
  );
});
