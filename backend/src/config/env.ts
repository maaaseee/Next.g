/**
 * Environment configuration loader and validator for NEXT.g Backend.
 * 
 * Source: Bun environment variables documentation
 * https://bun.sh/docs/runtime/env
 */

export interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  CORS_ORIGIN: string;
  NODE_ENV: string;
  AUTO_SEED: boolean;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  FRONTEND_URL: string;
  BACKEND_URL: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLOUDINARY_FOLDER: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  ADMIN_SEED_SECRET?: string;
}

export function loadEnv(): EnvConfig {
  const getEnv = (key: string): string | undefined => {
    const bunEnv = typeof globalThis !== 'undefined'
      ? (globalThis as unknown as { Bun?: { env?: Record<string, string | undefined> } }).Bun?.env?.[key]
      : undefined;
    return process.env[key] ?? bunEnv;
  };

  const PORT = Number(getEnv('PORT') || 3000);
  const DATABASE_URL = getEnv('DATABASE_URL') || 'postgres://postgres:postgres@localhost:5432/nextg_db';
  const TWITCH_CLIENT_ID = getEnv('TWITCH_CLIENT_ID') || '';
  const TWITCH_CLIENT_SECRET = getEnv('TWITCH_CLIENT_SECRET') || '';
  const CORS_ORIGIN = getEnv('CORS_ORIGIN') || 'http://localhost:5173';
  const NODE_ENV = getEnv('NODE_ENV') || 'development';
  const AUTO_SEED = (getEnv('AUTO_SEED') ?? 'false').toLowerCase() === 'true';
  const RAW_JWT_SECRET = getEnv('JWT_SECRET');
  const JWT_SECRET = RAW_JWT_SECRET || 'nextg-secret-jwt-key-2026';
  const ADMIN_SEED_SECRET = getEnv('ADMIN_SEED_SECRET');

  // Security Gate: Disallow default or missing JWT_SECRET in production container deployments
  if (NODE_ENV === 'production') {
    if (!RAW_JWT_SECRET || RAW_JWT_SECRET === 'nextg-secret-jwt-key-2026' || RAW_JWT_SECRET.includes('change-in-production')) {
      throw new Error(
        '🚨 [Security Error] Insecure JWT_SECRET detected in production. ' +
        'You must configure a strong, unique secret key via environment variables or Azure Key Vault.'
      );
    }
  }
  const GOOGLE_CLIENT_ID = getEnv('GOOGLE_CLIENT_ID') || '';
  const GOOGLE_CLIENT_SECRET = getEnv('GOOGLE_CLIENT_SECRET') || '';
  const GITHUB_CLIENT_ID = getEnv('GITHUB_CLIENT_ID') || '';
  const GITHUB_CLIENT_SECRET = getEnv('GITHUB_CLIENT_SECRET') || '';
  const FRONTEND_URL = getEnv('FRONTEND_URL') || 'http://localhost:5173';
  const BACKEND_URL = getEnv('BACKEND_URL') || `http://localhost:${PORT}`;
  const CLOUDINARY_CLOUD_NAME = getEnv('CLOUDINARY_CLOUD_NAME') || '';
  const CLOUDINARY_API_KEY = getEnv('CLOUDINARY_API_KEY') || '';
  const CLOUDINARY_API_SECRET = getEnv('CLOUDINARY_API_SECRET') || '';
  const CLOUDINARY_FOLDER = getEnv('CLOUDINARY_FOLDER') || 'gamebacklog-avatars';
  const UPSTASH_REDIS_REST_URL = getEnv('UPSTASH_REDIS_REST_URL') || '';
  const UPSTASH_REDIS_REST_TOKEN = getEnv('UPSTASH_REDIS_REST_TOKEN') || '';

  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    if (NODE_ENV !== 'test') {
      console.warn(
        '\n[WARN] Twitch / IGDB credentials are not configured (TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is missing).\n' +
        '       External search will fall back to the local database and seed catalog.\n' +
        '       Register your app at Twitch Developer Portal: https://dev.twitch.tv/console/apps\n'
      );
    }
  }

  return {
    PORT,
    DATABASE_URL,
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    CORS_ORIGIN,
    NODE_ENV,
    AUTO_SEED,
    JWT_SECRET,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    FRONTEND_URL,
    BACKEND_URL,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_FOLDER,
    UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN,
    ADMIN_SEED_SECRET,
  };
}

export const ENV = loadEnv();
