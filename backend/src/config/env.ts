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
  const PORT = Number(process.env.PORT || Bun.env.PORT || 3000);
  const DATABASE_URL = process.env.DATABASE_URL || Bun.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/nextg_db';
  const RAWG_API_KEY = process.env.RAWG_API_KEY || Bun.env.RAWG_API_KEY || '';
  const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || Bun.env.TWITCH_CLIENT_ID || '';
  const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || Bun.env.TWITCH_CLIENT_SECRET || '';
  const CORS_ORIGIN = process.env.CORS_ORIGIN || Bun.env.CORS_ORIGIN || 'http://localhost:5173';
  const NODE_ENV = process.env.NODE_ENV || Bun.env.NODE_ENV || 'development';
  const AUTO_SEED = (process.env.AUTO_SEED ?? Bun.env.AUTO_SEED ?? 'false').toLowerCase() === 'true';

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
