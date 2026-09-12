/**
 * Controller for User Games Library CRUD operations.
 * 
 * Source: Elysia Controllers and TypeBox validation
 * https://elysiajs.com/essential/validation.html
 */

import { Elysia } from 'elysia';
import { GamesService } from '../services/games.service';
import {
  GameIdParamSchema,
  GetGamesQuerySchema,
  UpsertGameSchema,
} from '../types/schemas';
import { rateLimiterHook } from '../middleware/rate-limiter';

export const gamesController = new Elysia({ prefix: '/api/games' })
  // GET /api/games (?status=BACKLOG&genre=RPG&platform=Switch)
  .get(
    '/',
    async ({ query }) => {
      return await GamesService.getAll({
        status: query.status,
        genre: query.genre,
        platform: query.platform,
      });
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
        // POST /api/games
        .post(
          '/',
          async ({ body, set }) => {
            const savedGame = await GamesService.upsertGame({
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
            });
            set.status = 200;
            return savedGame;
          },
          {
            body: UpsertGameSchema,
          }
        )
        // DELETE /api/games/:id
        .delete(
          '/:id',
          async ({ params: { id } }) => {
            return await GamesService.deleteGame(Number(id));
          },
          {
            params: GameIdParamSchema,
          }
        )
  );

