import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/env';

describe('loadEnv', () => {
  it('loads a valid API base URL', () => {
    expect(loadEnv({ VITE_API_BASE_URL: 'http://localhost:3000' })).toEqual({
      VITE_API_BASE_URL: 'http://localhost:3000',
    });
  });

  it('rejects a missing API base URL', () => {
    expect(() => loadEnv({})).toThrow('Invalid environment');
  });

  it('rejects a malformed API base URL without exposing its value', () => {
    const invalidValue = 'not-a-url-secret';

    expect(() => loadEnv({ VITE_API_BASE_URL: invalidValue })).toThrow('Invalid environment');
    expect(() => loadEnv({ VITE_API_BASE_URL: invalidValue })).not.toThrow(invalidValue);
  });
});
