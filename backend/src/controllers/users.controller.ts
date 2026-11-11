/**
 * Controller for Public and Private User Profiles, Avatars, and Community Showcase.
 * Allows exploring registered users, their public libraries, and managing personal profiles.
 */

import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { bearer } from '@elysiajs/bearer';
import { ENV } from '../config/env';
import { getDatabase } from '../db/index';
import { AvatarService } from '../services/avatar.service';
import { AUTH_COOKIE_NAME } from './auth.controller';
import { rateLimiterHook } from '../middleware/rate-limiter';

export const usersController = new Elysia({ prefix: '/api/users' })
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
      return { currentUserId: null };
    }
    try {
      const payload = await jwt.verify(token);
      if (!payload?.id) return { currentUserId: null };

      const sql = getDatabase();
      const [user] = await sql<{ token_version: number }[]>`
        SELECT token_version FROM users WHERE id = ${payload.id}::uuid;
      `;
      if (!user) return { currentUserId: null };

      const userTokenVersion = user.token_version ?? 1;
      const payloadTokenVersion = payload.tokenVersion !== undefined ? Number(payload.tokenVersion) : 1;
      if (payloadTokenVersion !== userTokenVersion) {
        return { currentUserId: null };
      }

      return { currentUserId: String(payload.id) };
    } catch {
      return { currentUserId: null };
    }
  })

  // GET /api/users/me - Get current authenticated user profile
  .get('/me', async ({ currentUserId, set }) => {
    if (!currentUserId) {
      set.status = 401;
      return { error: 'Unauthorized', message: 'Debes iniciar sesión para consultar tu perfil.' };
    }

    const sql = getDatabase();
    const [user] = await sql`
      SELECT id, name, avatar_url, provider, onboarded, created_at, updated_at
      FROM users
      WHERE id = ${currentUserId}::uuid;
    `;

    if (!user) {
      set.status = 404;
      return { error: 'NotFound', message: 'Usuario no encontrado.' };
    }

    return { user };
  })

  // PATCH /api/users/me - Update user profile information (e.g. display name)
  .patch(
    '/me',
    async ({ body, currentUserId, set }) => {
      if (!currentUserId) {
        set.status = 401;
        return { error: 'Unauthorized', message: 'Debes iniciar sesión para editar tu perfil.' };
      }

      const sql = getDatabase();
      const cleanName = body.name ? body.name.trim() : null;

      if (!cleanName) {
        set.status = 400;
        return { error: 'BadRequest', message: 'El nombre no puede estar vacío.' };
      }

      // Check if username is already taken by another user
      const [taken] = await sql`
        SELECT id FROM users
        WHERE LOWER(name) = LOWER(${cleanName}) AND id != ${currentUserId}::uuid
        LIMIT 1;
      `;

      if (taken) {
        set.status = 409;
        return {
          error: 'Conflict',
          message: 'Este nombre de usuario ya está ocupado por otra persona. Elige otro.',
        };
      }

      const [updated] = await sql`
        UPDATE users
        SET name = ${cleanName}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${currentUserId}::uuid
        RETURNING id, name, avatar_url, provider, onboarded, created_at, updated_at;
      `;

      return {
        success: true,
        user: updated,
        message: 'Perfil actualizado exitosamente.',
      };
    },
    {
      body: t.Object({
        name: t.String({
          minLength: 2,
          maxLength: 50,
          error: 'El nombre debe tener entre 2 y 50 caracteres.',
        }),
      }),
    }
  )

  // PUT /api/users/me/avatar - Upload & optimize user profile image to Cloudinary
  .put(
    '/me/avatar',
    async ({ body, currentUserId, set }) => {
      if (!currentUserId) {
        set.status = 401;
        return { error: 'Unauthorized', message: 'Debes iniciar sesión para actualizar tu avatar.' };
      }

      try {
        const file = body.file;
        if (!file || !(file instanceof Blob)) {
          set.status = 400;
          return { error: 'BadRequest', message: 'No se envió un archivo de imagen válido.' };
        }

        // 1. Upload to Cloudinary with smart facial-crop and WebP conversion
        const avatarUrl = await AvatarService.uploadAvatar(currentUserId, file);

        // 2. Persist new avatar URL in PostgreSQL
        const sql = getDatabase();
        await sql`
          UPDATE users
          SET avatar_url = ${avatarUrl}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${currentUserId}::uuid;
        `;

        return {
          success: true,
          avatar_url: avatarUrl,
          message: 'Avatar actualizado exitosamente.',
        };
      } catch (err: unknown) {
        set.status = 500;
        return {
          error: 'AvatarUploadError',
          message: err instanceof Error ? err.message : 'Error al procesar la imagen de perfil.',
        };
      }
    },
    {
      body: t.Object({
        file: t.File({
          type: 'image',
          maxSize: '2m',
          error: 'El archivo debe ser una imagen válida y no superar los 2MB.',
        }),
      }),
      beforeHandle: rateLimiterHook({
        name: 'avatar-upload',
        max: 10,
        windowMs: 60 * 1000,
        message: 'Has realizado demasiados intentos de subida de avatar. Espera un momento.',
      }),
    }
  )

  // DELETE /api/users/me/avatar - Remove custom avatar and reset to null
  .delete('/me/avatar', async ({ currentUserId, set }) => {
    if (!currentUserId) {
      set.status = 401;
      return { error: 'Unauthorized', message: 'Debes iniciar sesión para eliminar tu avatar.' };
    }

    await AvatarService.deleteAvatar(currentUserId);

    const sql = getDatabase();
    await sql`
      UPDATE users
      SET avatar_url = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${currentUserId}::uuid;
    `;

    return {
      success: true,
      message: 'Avatar eliminado exitosamente.',
    };
  })

  // GET /api/users - List public user profiles with optional search and library statistics
  .get('/', async ({ query }) => {
    const sql = getDatabase();
    const q = query.q ? `%${query.q.trim()}%` : null;
    const limit = query.limit ? Math.min(Number(query.limit), 50) : 24;

    const users = await sql`
      SELECT 
        u.id, 
        u.name, 
        u.avatar_url, 
        u.provider, 
        u.created_at,
        COUNT(ug.id)::int as games_count,
        COUNT(CASE WHEN ug.status = 'COMPLETED' THEN 1 END)::int as completed_count,
        COUNT(CASE WHEN ug.status = 'PLAYING' THEN 1 END)::int as playing_count,
        COUNT(CASE WHEN ug.status = 'BACKLOG' THEN 1 END)::int as backlog_count
      FROM users u
      LEFT JOIN user_games ug ON u.id = ug.user_id
      WHERE (${q}::text IS NULL OR u.name ILIKE ${q})
      GROUP BY u.id, u.name, u.avatar_url, u.provider, u.created_at
      ORDER BY games_count DESC, u.created_at DESC
      LIMIT ${limit};
    `;

    return users.map((u) => ({
      id: String(u.id),
      name: u.name,
      avatar_url: u.avatar_url,
      provider: u.provider,
      created_at: u.created_at instanceof Date ? u.created_at.toISOString() : String(u.created_at),
      stats: {
        total: Number(u.games_count),
        completed: Number(u.completed_count),
        playing: Number(u.playing_count),
        backlog: Number(u.backlog_count),
      },
    }));
  })

  // GET /api/users/:id - Public user profile details & public game library (by nickname or UUID)
  .get(
    '/:id',
    async ({ params: { id }, set }) => {
      const sql = getDatabase();
      const decodedIdentifier = decodeURIComponent(id).trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedIdentifier);

      // 1. Fetch user profile by nickname (case-insensitive) or UUID
      const [user] = isUuid
        ? await sql`
            SELECT id, name, avatar_url, provider, created_at
            FROM users
            WHERE id = ${decodedIdentifier}::uuid
            LIMIT 1;
          `
        : await sql`
            SELECT id, name, avatar_url, provider, created_at
            FROM users
            WHERE LOWER(name) = LOWER(${decodedIdentifier})
            ORDER BY created_at DESC
            LIMIT 1;
          `;

      if (!user) {
        set.status = 404;
        return {
          error: 'NotFound',
          message: 'El perfil de usuario solicitado no existe.',
        };
      }

      const targetUserId = String(user.id);

      // 2. Fetch user's public games library
      const games = await sql`
        SELECT 
          g.id, 
          g.title, 
          g.slug,
          g.cover_url, 
          g.release_year, 
          g.summary,
          g.genres,
          g.platforms,
          g.rating,
          g.game_modes,
          ug.status, 
          ug.created_at, 
          ug.updated_at
        FROM user_games ug
        JOIN games g ON ug.game_id = g.id
        WHERE ug.user_id = ${targetUserId}::uuid
        ORDER BY ug.updated_at DESC;
      `;

      const parseJsonArray = (val: unknown): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(String);
        try {
          const parsed = typeof val === 'string' ? JSON.parse(val) : val;
          return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
        } catch {
          return typeof val === 'string' ? val.split(',').map((s) => s.trim()) : [];
        }
      };

      const formattedGames = games.map((g) => ({
        id: Number(g.id),
        title: g.title,
        slug: g.slug ?? null,
        cover_url: g.cover_url,
        release_year: g.release_year ? Number(g.release_year) : null,
        summary: g.summary,
        genres: parseJsonArray(g.genres),
        platforms: parseJsonArray(g.platforms),
        rating: g.rating !== null ? Number(g.rating) : null,
        game_modes: parseJsonArray(g.game_modes),
        status: g.status,
        created_at: g.created_at instanceof Date ? g.created_at.toISOString() : String(g.created_at),
        updated_at: g.updated_at instanceof Date ? g.updated_at.toISOString() : String(g.updated_at),
      }));

      const stats = {
        total: formattedGames.length,
        completed: formattedGames.filter((g) => g.status === 'COMPLETED').length,
        playing: formattedGames.filter((g) => g.status === 'PLAYING').length,
        backlog: formattedGames.filter((g) => g.status === 'BACKLOG').length,
        wishlist: formattedGames.filter((g) => g.status === 'WISHLIST').length,
      };

      return {
        user: {
          id: String(user.id),
          name: user.name,
          avatar_url: user.avatar_url,
          provider: user.provider,
          created_at: user.created_at instanceof Date ? user.created_at.toISOString() : String(user.created_at),
          stats,
        },
        games: formattedGames,
      };
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1, maxLength: 100, error: 'Nombre de usuario o identificador requerido' }),
      }),
    }
  );
