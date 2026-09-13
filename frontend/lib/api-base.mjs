/**
 * Resolves the base URL for API requests.
 *
 * Rules:
 * 1. In production browser environments, default to relative same-origin ('')
 *    so all /api and /api/auth requests pass through the Next.js rewrite proxy.
 *    This avoids cross-origin third-party cookie blocking and eliminates the need for SameSite=None.
 * 2. In local development browser environments, respect NEXT_PUBLIC_API_URL if explicitly set,
 *    or default to '' (leveraging Next.js dev server rewrite proxy to http://localhost:5000).
 * 3. In non-browser / SSR / Node test environments (typeof window === 'undefined'):
 *    Respect NEXT_PUBLIC_API_URL if configured; otherwise fall back to localhost in dev/test
 *    so Node's fetch receives an absolute URL.
 */
export function resolveApiBaseUrl({
  nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL,
  nodeEnv = process.env.NODE_ENV,
  isBrowser = typeof window !== 'undefined',
} = {}) {
  // Browser in production: MUST be relative same-origin to route through Next.js proxy
  if (isBrowser && nodeEnv === 'production') {
    return '';
  }

  // Browser in local development: allow explicit NEXT_PUBLIC_API_URL override if present,
  // otherwise default to '' so Next.js dev server rewrite proxy handles /api
  if (isBrowser) {
    return (nextPublicApiUrl || '').replace(/\/$/, '');
  }

  // Non-browser / SSR / Node.js test environment (typeof window === 'undefined'):
  if (nextPublicApiUrl) {
    return nextPublicApiUrl.replace(/\/$/, '');
  }

  return nodeEnv === 'production' ? '' : 'http://localhost:5000';
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl();
}

/**
 * Builds Next.js rewrite configuration for proxying browser-facing /api requests.
 *
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {Array<{ source: string, destination: string }>}
 */
export function buildRewrites(env = process.env) {
  const backendOrigin = (
    env.BACKEND_ORIGIN ||
    (env.NODE_ENV === 'production' ? '' : 'http://localhost:5000')
  ).trim().replace(/\/$/, '');

  if (!backendOrigin) {
    return [];
  }

  return [
    {
      source: '/api/:path*',
      destination: `${backendOrigin}/api/:path*`,
    },
  ];
}
