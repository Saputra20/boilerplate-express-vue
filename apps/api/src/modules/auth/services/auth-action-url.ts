export type AuthActionRoute = 'verify-email' | 'reset-password';

export function buildAuthActionUrl(baseUrl: URL, route: AuthActionRoute, token: string): string {
  const base = new URL(baseUrl.toString());
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  const target = new URL(route, base);
  target.searchParams.set('token', token);
  return target.toString();
}
