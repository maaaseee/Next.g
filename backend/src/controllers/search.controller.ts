/**
 * Controller for Video Games Search Proxy endpoint with Persistent Caching & Rate Limiting.
 * 
 * Source: Elysia Route and Handler Documentation
 * https://elysiajs.com/essential/route.html
 */

import { Elysia } from 'elysia';
import { GameSearchService } from '../services/game-search.service';
import { SearchQuerySchema } from '../types/schemas';
import { rateLimiterHook } from '../middleware/rate-limiter';

export const searchController = new Elysia({ prefix: '/api/search' })
  .get(
    '/',
    async ({ query }) => {
      const q = query.q;
      const limit = query.limit ?? 20;

      const results = await GameSearchService.searchGames(q, limit);
      return results;
    },
    {
      query: SearchQuerySchema,
      beforeHandle: rateLimiterHook({
        name: 'search',
        max: 10, // Max 10 requests per minute as specified in docs/api-change.md
        windowMs: 60 * 1000,
        message: 'Demasiadas búsquedas en poco tiempo. Por favor espera unos segundos antes de intentar nuevamente.',
      }),
    }
  );


