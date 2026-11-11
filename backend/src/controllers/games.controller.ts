/**
 * Controller for User Games Library CRUD operations.
 * 
 * Source: Elysia Controllers and TypeBox validation
 * https://elysiajs.com/essential/validation.html
 */

import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { bearer } from '@elysiajs/bearer';
import { ENV } from '../config/env';
import { getDatabase } from '../db/index';
import { GamesService } from '../services/games.service';
import { AUTH_COOKIE_NAME } from './auth.controller';
import {
  GameIdParamSchema,
  GetGamesQuerySchema,
  UpsertGameSchema,
} from '../types/schemas';
import { rateLimiterHook } from '../middleware/rate-limiter';

export const gamesController = new Elysia({ prefix: '/api/games' })
  .use(bearer())
  .use(
    jwt({
      name: 'jwt',
      secret: ENV.JWT_SECRET,
    })
  )
  .derive(async ({ bearer, cookie, jwt }) => {
    const rawCookie = cookie[AUTH_COOKIE_NAME]?.value;
    const token = (typeof rawCookie === 'string' && rawCookie ? rawCookie : null) || bearer;
    if (!token) {
      return { userId: null };
    }
    try {
      const payload = await jwt.verify(token);
      if (!payload?.id) return { userId: null };

      const sql = getDatabase();
      const [user] = await sql<{ token_version: number }[]>`
        SELECT token_version FROM users WHERE id = ${payload.id}::uuid;
      `;
      if (!user) return { userId: null };

      const userTokenVersion = user.token_version ?? 1;
      const payloadTokenVersion = payload.tokenVersion !== undefined ? Number(payload.tokenVersion) : 1;
      if (payloadTokenVersion !== userTokenVersion) {
        return { userId: null };
      }

      return { userId: String(payload.id) };
    } catch {
      return { userId: null };
    }
  })
  // GET /api/games (?status=BACKLOG&genre=RPG&platform=Switch&limit=24&offset=0)
  .get(
    '/',
    async ({ query, userId, set }) => {
      // Unauthenticated visitors do not have an active personal backlog
      if (!userId) {
        return [];
      }
      const records = await GamesService.getAll(
        {
          status: query.status,
          genre: query.genre,
          platform: query.platform,
          limit: query.limit !== undefined ? Number(query.limit) : undefined,
          offset: query.offset !== undefined ? Number(query.offset) : undefined,
        },
        userId
      );

      if (records.total !== undefined) {
        set.headers['x-total-count'] = String(records.total);
        set.headers['x-has-more'] = String(records.hasMore ?? false);
      }

      return records;
    },
    {
      query: GetGamesQuerySchema,
    }
  )
  // Guard write operations (POST/DELETE) with max 40 mutations per minute per IP
  .guard(
    {
      beforeHandle: [
        rateLimiterHook({
          name: 'games-mutations',
          max: 40,
          windowMs: 60 * 1000,
          message: 'Demasiadas operaciones de escritura. Por favor espera unos momentos.',
        }),
      ],
    },
    (app) =>
      app
        // POST /api/games - Strictly requires authenticated user
        .post(
          '/',
          async ({ body, userId, set }) => {
            if (!userId) {
              set.status = 401;
              return {
                error: 'Unauthorized',
                message: 'Debes iniciar sesión para agregar o modificar juegos en tu biblioteca.',
              };
            }

            const savedGame = await GamesService.upsertGame(
              {
                id: Number(body.id),
                title: body.title,
                slug: body.slug ?? null,
                cover_url: body.cover_url,
                release_year: body.release_year ? Number(body.release_year) : null,
                summary: body.summary,
                genres: body.genres,
                platforms: body.platforms,
                rating: body.rating ? Number(body.rating) : null,
                game_modes: body.game_modes,
                status: body.status,
              },
              userId
            );
            set.status = 200;
            return savedGame;
          },
          {
            body: UpsertGameSchema,
          }
        )
        // DELETE /api/games/:id - Strictly requires authenticated user
        .delete(
          '/:id',
          async ({ params: { id }, userId, set }) => {
            if (!userId) {
              set.status = 401;
              return {
                error: 'Unauthorized',
                message: 'Debes iniciar sesión para eliminar juegos de tu biblioteca.',
              };
            }
            return await GamesService.deleteGame(Number(id), userId);
          },
          {
            params: GameIdParamSchema,
          }
        )
  );

