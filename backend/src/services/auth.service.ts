/**
 * Authentication and User Account Management Service.
 * 
 * Handles:
 * - Local registration and login with Bun native password hashing (argon2id/bcrypt)
 * - OAuth integration with Google & GitHub
 * - User onboarding (favorite games selection)
 */

import { getDatabase, type SqlClient } from '../db/index';
import { ENV } from '../config/env';
import { generateLocalTestCatalog } from '../db/seed-data';
import { GamesService, type UpsertGameInput } from './games.service';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  provider: 'local' | 'google' | 'github';
  onboarded: boolean;
  token_version?: number;
  created_at?: string;
  updated_at?: string;
}

export class AuthError extends Error {
  public status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

interface UserRow extends UserProfile {
  password_hash?: string | null;
}

export class AuthService {
  /**
   * Checks whether a username / GamerTag is already in use.
   */
  public static async isUsernameAvailable(
    username: string,
    customSql?: SqlClient
  ): Promise<boolean> {
    const sql = customSql || getDatabase();
    const clean = username.trim().toLowerCase();
    const [existing] = await sql`
      SELECT id FROM users 
      WHERE LOWER(name) = ${clean}
      LIMIT 1;
    `;
    return !existing;
  }

  /**
   * Checks whether an email is already in use.
   */
  public static async isEmailAvailable(
    email: string,
    customSql?: SqlClient
  ): Promise<boolean> {
    const sql = customSql || getDatabase();
    const clean = email.trim().toLowerCase();
    const [existing] = await sql`
      SELECT id FROM users 
      WHERE LOWER(email) = ${clean}
      LIMIT 1;
    `;
    return !existing;
  }

  /**
   * Registers a new user with standard email and password.
   */
  public static async register(
    input: { email: string; password: string; name: string },
    customSql?: SqlClient
  ): Promise<UserProfile> {
    const sql = customSql || getDatabase();
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.name.trim();

    // 1. Check if user already exists or reserved
    if (cleanEmail === 'test@nextg.local') {
      throw new AuthError('Este correo electrónico está reservado para el entorno de desarrollo local.', 400);
    }

    const [existing] = await sql`SELECT id FROM users WHERE email = ${cleanEmail};`;
    if (existing) {
      throw new AuthError('El correo electrónico ya está registrado.', 409);
    }

    // 2. Validate password security requirements (min 8 chars, letter with ñ/accents, uppercase, number)
    const hasMinLength = input.password.length >= 8;
    const hasLetter = /[\p{L}]/u.test(input.password);
    const hasUppercase = /[\p{Lu}]/u.test(input.password);
    const hasDigit = /\d/.test(input.password);

    if (!hasMinLength || !hasLetter || !hasUppercase || !hasDigit) {
      throw new AuthError(
        'La contraseña debe tener al menos 8 caracteres, incluir al menos una letra, una mayúscula y un número.',
        400
      );
    }

    // 3. Hash password using Bun's native high-performance hasher
    const passwordHash = await Bun.password.hash(input.password, {
      algorithm: 'argon2id',
      memoryCost: 65536,
      timeCost: 2,
    });

    // 4. Insert new user
    const [user] = await sql<UserProfile[]>`
      INSERT INTO users (email, password_hash, name, provider, onboarded, token_version)
      VALUES (${cleanEmail}, ${passwordHash}, ${cleanName}, 'local', false, 1)
      RETURNING id, email, name, avatar_url, provider, onboarded, token_version, created_at, updated_at;
    `;

    return user;
  }

  /**
   * Authenticates an existing user with email and password.
   */
  public static async login(
    input: { email: string; password: string },
    customSql?: SqlClient
  ): Promise<UserProfile> {
    const sql = customSql || getDatabase();
    const cleanEmail = input.email.trim().toLowerCase();

    if (cleanEmail === 'test@nextg.local') {
      if (ENV.NODE_ENV === 'production') {
        throw new AuthError('La cuenta de prueba local está deshabilitada en producción.', 403);
      }
      await this.ensureLocalTestAccount(sql);
    }

    const [user] = await sql<(UserRow & { token_version?: number })[]>`
      SELECT id, email, password_hash, name, avatar_url, provider, onboarded, token_version, created_at, updated_at
      FROM users
      WHERE email = ${cleanEmail};
    `;

    if (!user) {
      throw new AuthError('Credenciales inválidas. Verifica tu correo y contraseña.', 401);
    }

    if (!user.password_hash) {
      throw new AuthError(
        'Esta cuenta no posee contraseña directa. Por favor inicia sesión mediante acceso social.',
        400
      );
    }

    const isValid = await Bun.password.verify(input.password, user.password_hash);
    if (!isValid) {
      throw new AuthError('Credenciales inválidas. Verifica tu correo y contraseña.', 401);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      provider: user.provider,
      onboarded: Boolean(user.onboarded),
      token_version: Number(user.token_version ?? 1),
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  /**
   * Retrieves user by UUID identifier.
   */
  public static async getUserById(id: string, customSql?: SqlClient): Promise<UserProfile | null> {
    const sql = customSql || getDatabase();
    const [user] = await sql<UserProfile[]>`
      SELECT id, email, name, avatar_url, provider, onboarded, token_version, created_at, updated_at
      FROM users
      WHERE id = ${id}::uuid;
    `;
    return user || null;
  }

  /**
   * Revokes all active JWT tokens for a user by incrementing their token_version in PostgreSQL.
   */
  public static async revokeAllSessions(userId: string, customSql?: SqlClient): Promise<number> {
    const sql = customSql || getDatabase();
    const [updated] = await sql<{ token_version: number }[]>`
      UPDATE users
      SET token_version = COALESCE(token_version, 1) + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}::uuid
      RETURNING token_version;
    `;
    return updated ? Number(updated.token_version) : 1;
  }

  /**
   * Upserts a user coming from an OAuth provider (Google or GitHub).
   */
  public static async findOrCreateOAuthUser(
    profile: {
      email: string;
      name: string;
      avatarUrl?: string | null;
      provider: 'google' | 'github';
      providerId: string;
    },
    customSql?: SqlClient
  ): Promise<UserProfile & { isNewUser: boolean }> {
    const sql = customSql || getDatabase();
    const cleanEmail = profile.email.trim().toLowerCase();

    // Check if user exists by email or provider_id
    const [existing] = await sql<UserProfile[]>`
      SELECT id, email, name, avatar_url, provider, onboarded, token_version
      FROM users
      WHERE email = ${cleanEmail} OR (provider = ${profile.provider} AND provider_id = ${profile.providerId});
    `;

    if (existing) {
      // Update missing fields if needed
      const [updated] = await sql<UserProfile[]>`
        UPDATE users
        SET 
          avatar_url = COALESCE(users.avatar_url, ${profile.avatarUrl ?? null}),
          provider_id = COALESCE(users.provider_id, ${profile.providerId}),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing.id}::uuid
        RETURNING id, email, name, avatar_url, provider, onboarded, token_version, created_at, updated_at;
      `;
      return { ...updated, isNewUser: false };
    }

    // Generate initial candidate name avoiding conflicts
    let candidateName = profile.name.trim() || 'Gamer';
    const [taken] = await sql`
      SELECT id FROM users WHERE LOWER(name) = LOWER(${candidateName}) LIMIT 1;
    `;
    if (taken) {
      candidateName = `${candidateName}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Create new OAuth user with onboarded = false so they must choose their gamertag/nickname
    const [created] = await sql<UserProfile[]>`
      INSERT INTO users (email, name, avatar_url, provider, provider_id, onboarded, token_version)
      VALUES (${cleanEmail}, ${candidateName}, ${profile.avatarUrl ?? null}, ${profile.provider}, ${profile.providerId}, false, 1)
      RETURNING id, email, name, avatar_url, provider, onboarded, token_version, created_at, updated_at;
    `;

    return { ...created, isNewUser: true };
  }

  /**
   * Completes onboarding by saving user's initial favorite games and marking onboarded = true.
   */
  public static async completeOnboarding(
    userId: string,
    games: UpsertGameInput[],
    customSql?: SqlClient
  ): Promise<UserProfile> {
    const sql = customSql || getDatabase();

    if (!games || games.length < 3) {
      throw new AuthError('Debes seleccionar al menos 3 videojuegos favoritos.', 400);
    }

    // 1. Upsert each game into user's library with status 'PLAYING' (or status requested)
    for (const g of games) {
      await GamesService.upsertGame(
        {
          id: Number(g.id),
          title: g.title,
          slug: g.slug ?? null,
          cover_url: g.cover_url ?? null,
          release_year: g.release_year ? Number(g.release_year) : null,
          summary: g.summary ?? null,
          genres: g.genres ?? [],
          platforms: g.platforms ?? [],
          rating: g.rating ? Number(g.rating) : null,
          game_modes: g.game_modes ?? [],
          status: g.status || 'PLAYING',
        },
        userId,
        sql
      );
    }

    // 2. Mark user as onboarded
    const [updatedUser] = await sql<UserProfile[]>`
      UPDATE users
      SET onboarded = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}::uuid
      RETURNING id, email, name, avatar_url, provider, onboarded, created_at, updated_at;
    `;

    return updatedUser;
  }

  /**
   * Completes initial experience onboarding/setup without requiring favorite games selection.
   */
  public static async completeSetup(
    userId: string,
    customSql?: SqlClient
  ): Promise<UserProfile> {
    const sql = customSql || getDatabase();
    const [updatedUser] = await sql<UserProfile[]>`
      UPDATE users
      SET onboarded = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}::uuid
      RETURNING id, email, name, avatar_url, provider, onboarded, created_at, updated_at;
    `;

    return updatedUser;
  }

  /**
   * Ensures the local-only test account (test@nextg.local) exists and is populated
   * with 135 games (105 in BACKLOG, 12 in COMPLETED, 10 in PLAYING, 8 in WISHLIST).
   * Strictly disabled in production.
   */
  public static async ensureLocalTestAccount(customSql?: SqlClient): Promise<UserProfile> {
    if (ENV.NODE_ENV === 'production') {
      throw new AuthError('La cuenta de pruebas local no está permitida en producción.', 403);
    }

    const sql = customSql || getDatabase();
    const testEmail = 'test@nextg.local';
    const testName = 'TesterLocal';

    let [user] = await sql<UserProfile[]>`
      SELECT id, email, name, avatar_url, provider, onboarded, token_version, created_at, updated_at
      FROM users
      WHERE email = ${testEmail}
      LIMIT 1;
    `;

    if (!user) {
      const passwordHash = await Bun.password.hash('Test1234', {
        algorithm: 'argon2id',
        memoryCost: 65536,
        timeCost: 2,
      });

      const [created] = await sql<UserProfile[]>`
        INSERT INTO users (email, password_hash, name, provider, onboarded, token_version)
        VALUES (${testEmail}, ${passwordHash}, ${testName}, 'local', true, 1)
        ON CONFLICT (email) DO UPDATE SET onboarded = true
        RETURNING id, email, name, avatar_url, provider, onboarded, token_version, created_at, updated_at;
      `;
      user = created;
    }

    // Check how many games the test user currently has in BACKLOG
    const [countRow] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int as count
      FROM user_games
      WHERE user_id = ${user.id}::uuid AND status = 'BACKLOG';
    `;

    if (!countRow || countRow.count < 100) {
      const catalog = generateLocalTestCatalog();
      await sql.begin(async (tx) => {
        for (const game of catalog) {
          await tx`
            INSERT INTO games (id, title, slug, cover_url, release_year, summary, genres, platforms, rating, game_modes)
            VALUES (
              ${game.id},
              ${game.title},
              ${game.slug},
              ${game.cover_url},
              ${game.release_year},
              ${game.summary},
              ${JSON.stringify(game.genres)}::jsonb,
              ${JSON.stringify(game.platforms)}::jsonb,
              ${game.rating},
              ${JSON.stringify(game.game_modes)}::jsonb
            )
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              slug = COALESCE(EXCLUDED.slug, games.slug),
              cover_url = EXCLUDED.cover_url;
          `;

          await tx`
            INSERT INTO user_games (user_id, game_id, status, updated_at)
            VALUES (${user.id}::uuid, ${game.id}, ${game.defaultStatus || 'BACKLOG'}, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, game_id) DO NOTHING;
          `;
        }
      });
    }

    return user;
  }
}
