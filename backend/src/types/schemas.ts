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
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50 })),
  genre: t.Optional(t.String({ maxLength: 60 })),
  platform: t.Optional(t.String({ maxLength: 60 })),
});

export const PopularGamesQuerySchema = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 60 })),
  genre: t.Optional(t.String({ maxLength: 60 })),
  platform: t.Optional(t.String({ maxLength: 60 })),
});

export const GetGamesQuerySchema = t.Object({
  status: t.Optional(GameStatusSchema),
  genre: t.Optional(t.String({ maxLength: 60 })),
  platform: t.Optional(t.String({ maxLength: 60 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 500 })),
  offset: t.Optional(t.Numeric({ minimum: 0 })),
});

export const GameIdParamSchema = t.Object({
  id: t.Numeric({ minimum: 1, maximum: 2147483647, error: 'Valid numerical game ID is required' }),
});

export const RegisterUserSchema = t.Object({
  name: t.String({ minLength: 2, maxLength: 80, error: 'El nombre debe tener entre 2 y 80 caracteres' }),
  email: t.String({ format: 'email', error: 'Email inválido' }),
  password: t.String({ minLength: 8, maxLength: 100, error: 'La contraseña debe tener al menos 8 caracteres' }),
});

export const LoginUserSchema = t.Object({
  email: t.String({ format: 'email', error: 'Email inválido' }),
  password: t.String({ minLength: 1, maxLength: 100, error: 'La contraseña es requerida' }),
  rememberMe: t.Optional(t.Boolean()),
});

export const OnboardingGameItemSchema = t.Object({
  id: t.Numeric({ minimum: 1, maximum: 2147483647 }),
  title: t.String({ minLength: 1, maxLength: 150 }),
  slug: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
  cover_url: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
  release_year: t.Optional(t.Nullable(t.Numeric({ minimum: 1950, maximum: 2100 }))),
  summary: t.Optional(t.Nullable(t.String({ maxLength: 3000 }))),
  genres: t.Optional(t.Nullable(t.Union([t.Array(t.String({ maxLength: 60 })), t.String()]))),
  platforms: t.Optional(t.Nullable(t.Union([t.Array(t.String({ maxLength: 60 })), t.String()]))),
  rating: t.Optional(t.Nullable(t.Numeric({ minimum: 0, maximum: 100 }))),
  game_modes: t.Optional(t.Nullable(t.Union([t.Array(t.String({ maxLength: 60 })), t.String()]))),
  status: t.Optional(GameStatusSchema),
});

export const OnboardingSchema = t.Object({
  games: t.Array(OnboardingGameItemSchema, { minItems: 3, error: 'Debes seleccionar al menos 3 videojuegos favoritos' }),
});
