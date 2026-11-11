/**
 * Controller for Video Games Search Proxy endpoint with Persistent Caching & Rate Limiting.
 * 
 * Source: Elysia Route and Handler Documentation
 * https://elysiajs.com/essential/route.html
 */

import { Elysia } from 'elysia';
import { GameSearchService } from '../services/game-search.service';
import { SearchQuerySchema, PopularGamesQuerySchema } from '../types/schemas';
import { rateLimiterHook } from '../middleware/rate-limiter';

export const searchController = new Elysia({ prefix: '/api/search' })
  .get(
    '/details/:id',
    async ({ params: { id }, set }) => {
      const rawId = String(id || '').trim();
      if (!rawId) {
        set.status = 400;
        return { error: 'Invalid game identifier' };
      }
      set.headers['Cache-Control'] = 'public, max-age=86400, stale-while-revalidate=604800';
      const game = await GameSearchService.getGameDetails(rawId);
      if (!game) {
        set.status = 404;
        return { error: 'Game not found' };
      }
      return game;
    }
  )
  .get(
    '/popular',
    async ({ query, set }) => {
      const limit = query.limit ? Number(query.limit) : 36;
      const genre = query.genre ? String(query.genre).trim() : undefined;
      const platform = query.platform ? String(query.platform).trim() : undefined;
      set.headers['Cache-Control'] = 'public, max-age=3600, stale-while-revalidate=86400';
      return await GameSearchService.getPopularGames(limit, { genre, platform });
    },
    {
      query: PopularGamesQuerySchema,
    }
  )
  .get(
    '/anticipated',
    async ({ query, set }) => {
      const limit = query.limit ? Number(query.limit) : 6;
      set.headers['Cache-Control'] = 'public, max-age=3600, stale-while-revalidate=86400';
      return await GameSearchService.getAnticipatedGames(limit);
    }
  )
  .get(
    '/',
    async ({ query }) => {
      const q = query.q;
      const limit = query.limit ?? 30;
      const genre = query.genre ? String(query.genre).trim() : undefined;
      const platform = query.platform ? String(query.platform).trim() : undefined;

      const results = await GameSearchService.searchGames(q, limit, { genre, platform });
      return results;
    },
    {
      query: SearchQuerySchema,
      beforeHandle: rateLimiterHook({
        name: 'search',
        max: 10, // Max 10 requests per minute as specified in docs/architecture/api-changelog.md
        windowMs: 60 * 1000,
        message: 'Demasiadas búsquedas en poco tiempo. Por favor espera unos segundos antes de intentar nuevamente.',
      }),
    }
  );


