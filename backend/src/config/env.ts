/**
 * Environment configuration loader and validator.
 * 
 * Source: Bun environment variables documentation
 * https://bun.sh/docs/runtime/env
 */

export interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  RAWG_API_KEY: string;
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  CORS_ORIGIN: string;
  NODE_ENV: string;
  AUTO_SEED: boolean;
}

export function loadEnv(): EnvConfig {
  const getEnv = (key: string): string | undefined => {
    return process.env[key] ?? (typeof globalThis !== 'undefined' && (globalThis as any).Bun?.env?.[key]);
  };

  const PORT = Number(getEnv('PORT') || 3000);
  const DATABASE_URL = getEnv('DATABASE_URL') || 'postgres://postgres:postgres@localhost:5432/nextg_db';
  const RAWG_API_KEY = getEnv('RAWG_API_KEY') || '';
  const TWITCH_CLIENT_ID = getEnv('TWITCH_CLIENT_ID') || '';
  const TWITCH_CLIENT_SECRET = getEnv('TWITCH_CLIENT_SECRET') || '';
  const CORS_ORIGIN = getEnv('CORS_ORIGIN') || 'http://localhost:5173';
  const NODE_ENV = getEnv('NODE_ENV') || 'development';
  const AUTO_SEED = (getEnv('AUTO_SEED') ?? 'false').toLowerCase() === 'true';

  if (!RAWG_API_KEY && !TWITCH_CLIENT_ID) {
    if (NODE_ENV !== 'test') {
      console.warn(
        '\n[WARN] RAWG_API_KEY is not configured.\n' +
        '       External search will fall back to the local database and seed catalog.\n' +
        '       Get a free API key at: https://rawg.io/apidocs\n'
      );
    }
  }

  return {
    PORT,
    DATABASE_URL,
    RAWG_API_KEY,
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    CORS_ORIGIN,
    NODE_ENV,
    AUTO_SEED,
  };
}

export const ENV = loadEnv();
