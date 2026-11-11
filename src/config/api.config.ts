/**
 * Frontend Environment and API Configuration.
 * Fully agnostic to deployment target (local Vite proxy, Docker, Vercel, Render).
 */

export interface AppConfig {
  readonly apiUrl: string;
  readonly isDev: boolean;
  readonly isProd: boolean;
  readonly isTest: boolean;
  readonly appVersion: string;
}

/**
 * Resolves the API base URL based on environment variables and runtime context.
 */
function resolveApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();

  if (envUrl) {
    try {
      if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
        const parsed = new URL(envUrl);
        return parsed.origin;
      }
    } catch {
      // Fallback to trailing slash cleanup
    }
    return envUrl.replace(/\/+$/, '');
  }

  // In test environments (Vitest/Node.js), Node's fetch requires an absolute URL
  if (import.meta.env.MODE === 'test') {
    return 'http://localhost:3000';
  }

  // In browser runtime (local dev with Vite proxy or production same-origin),
  // an empty string allows clean relative paths like `/api/games`.
  return '';
}

export const APP_CONFIG: AppConfig = {
  apiUrl: resolveApiBaseUrl(),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  isTest: import.meta.env.MODE === 'test',
  appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0',
};

/**
 * Builds a standardized API endpoint URL from a relative path.
 * 
 * @param endpoint The API route path (e.g., '/api/games' or 'api/games')
 * @returns Fully qualified URL or relative proxy path depending on environment
 * 
 * Examples:
 * - Local dev (proxy enabled): getApiUrl('/api/games') -> '/api/games'
 * - Local dev (explicit VITE_API_URL): getApiUrl('/api/games') -> 'http://localhost:3000/api/games'
 * - Production (VITE_API_URL set): getApiUrl('/api/games') -> 'https://nextg-backend.onrender.com/api/games'
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (!APP_CONFIG.apiUrl) {
    return cleanEndpoint;
  }

  return `${APP_CONFIG.apiUrl}${cleanEndpoint}`;
}
