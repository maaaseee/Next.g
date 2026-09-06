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
import { ENV } from './config/env';
import { initDatabase, getDatabase } from './db/index';
import { runSeed } from './db/seed';
import { searchController } from './controllers/search.controller';
import { gamesController } from './controllers/games.controller';
import { securityHeaders } from './middleware/security-headers';
import { rateLimiter, rateLimiterHook } from './middleware/rate-limiter';

// Initialize SQLite database
const db = initDatabase();

// Auto-seed initial catalog if library is empty
try {
  const count = db.query<{ count: number }, []>('SELECT COUNT(*) as count FROM games;').get();
  if (!count || count.count === 0) {
    console.log('📦 Empty database detected. Auto-seeding 50 starter games...');
    runSeed(db, true);
  }
} catch (err) {
  console.warn('⚠️ Auto-seed check skipped:', err);
}

export const app = new Elysia()
  // 1. Injects OWASP defense-in-depth security headers
  .use(securityHeaders)
  // 2. Global CORS configuration
  .use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
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
  // Healthcheck endpoint
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nextg-backend',
  }))
  // Manual seed endpoint (Strictly rate-limited to 2 per 10 minutes)
  .post(
    '/api/seed',
    () => {
      const result = runSeed(getDatabase(), true);
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
  .use(searchController)
  .use(gamesController)
  .listen(ENV.PORT);

console.log(`🎮 NEXT.g Backend is running at http://localhost:${ENV.PORT}`);

// Export App type for full End-to-End TypeScript safety with Eden Treaty in Vue 3
export type App = typeof app;
