/**
 * TypeBox Validation Schemas for Elysia Controllers and Models.
 * 
 * Source: Elysia Validation and TypeBox documentation
 * https://elysiajs.com/essential/validation.html
 * https://elysiajs.com/patterns/typebox.html
 */

import { t } from 'elysia';

export const GameStatusSchema = t.Union([
  t.Literal('BACKLOG'),
  t.Literal('PLAYING'),
  t.Literal('COMPLETED'),
  t.Literal('WISHLIST'),
]);

export const UpsertGameSchema = t.Object({
  id: t.Numeric({ minimum: 1, maximum: 2147483647, error: 'Valid game ID is required' }),
  title: t.String({ minLength: 1, maxLength: 150, error: 'Game title must be between 1 and 150 characters' }),
  slug: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
  cover_url: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
  release_year: t.Optional(t.Nullable(t.Numeric({ minimum: 1950, maximum: 2100 }))),
  summary: t.Optional(t.Nullable(t.String({ maxLength: 3000 }))),
  genres: t.Optional(t.Nullable(t.Union([t.Array(t.String({ maxLength: 60 }), { maxItems: 20 }), t.String({ maxLength: 500 })]))),
  platforms: t.Optional(t.Nullable(t.Union([t.Array(t.String({ maxLength: 60 }), { maxItems: 20 }), t.String({ maxLength: 500 })]))),
  rating: t.Optional(t.Nullable(t.Numeric({ minimum: 0, maximum: 100 }))),
  game_modes: t.Optional(t.Nullable(t.Union([t.Array(t.String({ maxLength: 60 }), { maxItems: 15 }), t.String({ maxLength: 500 })]))),
  status: GameStatusSchema,
});

export const SearchQuerySchema = t.Object({
  q: t.String({ minLength: 1, maxLength: 80, error: 'Search query parameter "q" must be between 1 and 80 characters' }),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 30 })),
});

export const GetGamesQuerySchema = t.Object({
  status: t.Optional(GameStatusSchema),
  genre: t.Optional(t.String({ maxLength: 60 })),
  platform: t.Optional(t.String({ maxLength: 60 })),
});

export const GameIdParamSchema = t.Object({
  id: t.Numeric({ minimum: 1, maximum: 2147483647, error: 'Valid numerical game ID is required' }),
});
