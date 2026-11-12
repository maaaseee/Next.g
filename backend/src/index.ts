/**
 * NEXT.g Backend Main Server Entrypoint.
 * 
 * Sources:
 * - Elysia Quick Start: https://elysiajs.com/quick-start.html
 * - Elysia CORS Plugin: https://elysiajs.com/plugins/cors.html
 * - Elysia Error Handling: https://elysiajs.com/patterns/error-handling.html
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { cron } from '@elysiajs/cron';
import { ENV } from './config/env';
import { initDatabase, getDatabase, closeDatabase } from './db/index';
import { runSeed } from './db/seed';
import { searchController } from './controllers/search.controller';
import { gamesController } from './controllers/games.controller';
import { authController } from './controllers/auth.controller';
import { usersController } from './controllers/users.controller';
import { ogController } from './controllers/og.controller';
import { securityHeaders } from './middleware/security-headers';
import { rateLimiter, rateLimiterHook } from './middleware/rate-limiter';
import { logger } from './utils/logger';

// Async database startup initializer
export async function setupDatabase() {
  try {
    const sql = await initDatabase();
    console.log('✅ Database connected and schema ready');
    // Seeder on startup has been removed as requested.
    // Games are fetched dynamically on first demand from IGDB API.
    // If explicitly forced via AUTO_SEED=true, seed can run manually.
    if (ENV.AUTO_SEED) {
      console.log('📦 Explicit AUTO_SEED flag detected: seeding initial catalog...');
      await runSeed(sql, false);
    }
  } catch (err) {
    console.warn('⚠️ Database connection or startup error:', err instanceof Error ? err.message : err);
  }
}

// Ensure database schema is initialized on startup
setupDatabase();

// Parse CORS origins from environment variable (supports single origin or comma-separated list)
// Automatically strips trailing slashes to prevent common configuration errors
const configuredOrigins = (ENV.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

/**
 * Strict, secure origin validation.
 * Defends against CORS misconfiguration attacks (CWE-942):
 * - Does NOT allow generic wildcards across all of vercel.app.
 * - Allows exact matches configured in CORS_ORIGIN.
 * - Allows preview deployments ONLY if they strictly match the user's specific project prefix.
 * - Allows localhost only during local development/testing.
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  const clean = origin.trim().replace(/\/+$/, '');

  // 1. Matches explicitly configured origins
  if (configuredOrigins.includes(clean)) return true;

  // 2. Matches preview branches ONLY if they match your specific project prefix from CORS_ORIGIN
  // e.g. If CORS_ORIGIN has https://nextg-backlog.vercel.app, only allow https://nextg-backlog-*.vercel.app
  for (const conf of configuredOrigins) {
    const vercelMatch = conf.match(/^https:\/\/([a-zA-Z0-9_-]+)\.vercel\.app$/);
    if (vercelMatch) {
      const projectName = vercelMatch[1];
      // Must start with exact projectName followed by a dash for preview branches
      if (clean.startsWith(`https://${projectName}-`) && clean.endsWith('.vercel.app')) {
        return true;
      }
    }
  }

  // 3. Local development ports allowed only in non-production or if explicitly listed
  if (ENV.NODE_ENV !== 'production') {
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean)) return true;
  }

  return false;
}

export const app = new Elysia()
  // 1. Injects OWASP defense-in-depth security headers
  .use(securityHeaders)
  // 2. Interactive OpenAPI / Swagger Documentation UI at /docs
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'NEXT.g Game Backlog API',
          description: 'Production-ready REST API for personal video game library management, IGDB search, and Gamer Passports.',
          version: '1.0.0',
        },
        tags: [
          { name: 'Auth', description: 'Authentication, registration, sessions, and OAuth' },
          { name: 'Games', description: 'Personal backlog and game library CRUD operations' },
          { name: 'Search', description: 'Video game search and discovery proxy with IGDB' },
          { name: 'Users', description: 'User profiles, avatars, and community catalog' },
          { name: 'OpenGraph', description: 'Dynamic SVG image generation for social cards' },
          { name: 'Health', description: 'Liveness and Readiness probes for container management' },
        ],
      },
    })
  )
  // 3. Automated background maintenance: purges search_cache records older than 7 days every 6 hours
  .use(
    cron({
      name: 'cleanup-search-cache',
      pattern: '0 */6 * * *',
      async run() {
        try {
          const sql = getDatabase();
          const result = await sql`
            DELETE FROM search_cache 
            WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '7 days';
          `;
          logger.info('[Cron] Expired search_cache records cleaned up', { count: result.count });
        } catch (err) {
          logger.warn('[Cron] Failed to run search_cache cleanup:', { error: err });
        }
      },
    })
  )
  // 4. Global CORS configuration (strictly bounded by CORS_ORIGIN env parameter)
  .use(
    cors({
      origin: (request: Request) => {
        const origin = request.headers.get('origin');
        return isAllowedOrigin(origin);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
      exposeHeaders: ['Content-Type', 'X-Total-Count', 'X-Has-More', 'Retry-After'],
      credentials: true,
    })
  )
  // 3. Global API Rate Limiter (Max 120 requests/minute per IP across all endpoints)
  .use(
    rateLimiter({
      name: 'global-api',
      max: 120,
      windowMs: 60 * 1000,
      message: 'Límite de solicitudes globales excedido. Por favor espera antes de continuar.',
    })
  )
  // 4. Global Error Handling & Safe Logging
  .onError(({ code, error, set }) => {
    console.error(`[Security Log] [${code}]:`, error instanceof Error ? error.message : error);

    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        error: 'Validation failed',
        message: 'Los datos enviados no cumplen con el formato o longitud permitida.',
        details: error.message,
      };
    }

    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        error: 'Route not found',
        message: 'El recurso solicitado no existe.',
      };
    }

    set.status = 500;
    // Don't leak internal database paths or stack traces in 500 responses
    return {
      error: 'Internal Server Error',
      message: error instanceof Error && error.message.includes('capacidad máxima')
        ? error.message
        : 'Ocurrió un error inesperado en el servidor.',
    };
  })
  // Healthcheck endpoints for Azure Container Apps (ACA) / Kubernetes
  // 1. General compatibility health endpoint
  .get('/health', async ({ set }) => {
    try {
      const sql = getDatabase();
      await sql`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        service: 'nextg-backend',
      };
    } catch (err) {
      logger.error('[HealthCheck] Database ping failed', { error: err instanceof Error ? err.message : err });
      set.status = 503;
      return {
        status: 'degraded',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        service: 'nextg-backend',
      };
    }
  })
  // 2. Liveness Probe (ACA): Verifies process and web server responsiveness without triggering on DB hiccups
  .get('/health/live', () => ({
    status: 'alive',
    timestamp: new Date().toISOString(),
    service: 'nextg-backend',
  }))
  // 3. Readiness Probe (ACA): Verifies if container is ready to accept incoming traffic (including DB connection)
  .get('/health/ready', async ({ set }) => {
    try {
      const sql = getDatabase();
      await sql`SELECT 1`;
      return {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      logger.warn('[ReadinessProbe] Database not ready', { error: err instanceof Error ? err.message : err });
      set.status = 503;
      return {
        status: 'not_ready',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  })
  // Manual seed endpoint (Disabled in production unless authenticated via X-Admin-Key)
  .post(
    '/api/seed',
    async ({ request, set }) => {
      if (ENV.NODE_ENV === 'production') {
        const adminKey = request.headers.get('x-admin-key');
        if (!ENV.ADMIN_SEED_SECRET || adminKey !== ENV.ADMIN_SEED_SECRET) {
          set.status = 403;
          return {
            error: 'Forbidden',
            message: 'El endpoint de inicialización está deshabilitado en producción.',
          };
        }
      }
      const result = await runSeed(getDatabase(), false);
      return { message: 'Database successfully seeded', ...result };
    },
    {
      beforeHandle: rateLimiterHook({
        name: 'seed-endpoint',
        max: 2,
        windowMs: 10 * 60 * 1000,
        message: 'El endpoint de inicialización está limitado a 2 ejecuciones cada 10 minutos.',
      }),
    }
  )
  // Route controllers
  .use(authController)
  .use(usersController)
  .use(ogController)
  .use(searchController)
  .use(gamesController);

// Graceful shutdown handling for Azure Container Apps revisions & autoscaling
const handleShutdown = async (signal: string) => {
  logger.info(`[Shutdown] Received ${signal}. Starting graceful shutdown...`);
  try {
    await closeDatabase();
    logger.info('[Shutdown] PostgreSQL connection pool closed cleanly.');
  } catch (err) {
    logger.error('[Shutdown] Error closing database during shutdown:', { error: err });
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Only listen on port when running standalone (Docker or local Bun), not in Vercel Serverless
if (!process.env.VERCEL) {
  app.listen({
    port: ENV.PORT,
    hostname: '0.0.0.0',
  });
  console.log(`🎮 NEXT.g Backend is running at http://0.0.0.0:${ENV.PORT}`);
}

// Export App type for full End-to-End TypeScript safety with Eden Treaty in Vue 3
export type App = typeof app;
export default app;
