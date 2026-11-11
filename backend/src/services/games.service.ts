/**
 * Games Catalog and PostgreSQL Persistence Service.
 * 
 * Source: postgres (porsager) tagged template literals and transactions
 * https://github.com/porsager/postgres#transactions
 */

import { getDatabase, type SqlClient } from '../db/index';

export type GameStatus = 'BACKLOG' | 'PLAYING' | 'COMPLETED' | 'WISHLIST';

export interface UserGameRecord {
  id: number;
  title: string;
  slug: string | null;
  cover_url: string | null;
  release_year: number | null;
  summary: string | null;
  genres: string[];
  platforms: string[];
  rating: number | null;
  game_modes: string[];
  status: GameStatus;
  created_at: string;
  updated_at: string;
}

interface RawSqlUserGame {
  id: number | string;
  title: string;
  slug?: string | null;
  cover_url: string | null;
  release_year: number | null;
  summary: string | null;
  genres: unknown;
  platforms: unknown;
  rating: number | null;
  game_modes: unknown;
  status: GameStatus;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface UpsertGameInput {
  id: number;
  title: string;
  slug?: string | null;
  cover_url?: string | null;
  release_year?: number | null;
  summary?: string | null;
  genres?: string[] | string | null;
  platforms?: string[] | string | null;
  rating?: number | null;
  game_modes?: string[] | string | null;
  status: GameStatus;
}

export interface GetGamesFilters {
  status?: GameStatus;
  genre?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}

export class GamesService {
  private static isSqlClient(val: unknown): val is SqlClient {
    return typeof val === 'function' || (Boolean(val) && typeof (val as Record<string, unknown>).unsafe === 'function');
  }

  private static parseJsonArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
    } catch {
      return typeof value === 'string' ? value.split(',').map((s) => s.trim()) : [];
    }
  }

  private static formatRecord(raw: RawSqlUserGame): UserGameRecord {
    return {
      id: Number(raw.id),
      title: raw.title,
      slug: raw.slug ?? null,
      cover_url: raw.cover_url,
      release_year: raw.release_year ? Number(raw.release_year) : null,
      summary: raw.summary,
      genres: this.parseJsonArray(raw.genres),
      platforms: this.parseJsonArray(raw.platforms),
      rating: raw.rating !== null ? Number(raw.rating) : null,
      game_modes: this.parseJsonArray(raw.game_modes),
      status: raw.status,
      created_at: raw.created_at instanceof Date ? raw.created_at.toISOString() : String(raw.created_at),
      updated_at: raw.updated_at instanceof Date ? raw.updated_at.toISOString() : String(raw.updated_at),
    };
  }

  /**
   * Retrieves games in the user's catalog, optionally filtered by status, genre, platform and paginated.
   */
  public static async getAll(
    filters?: GetGamesFilters,
    userIdOrSql?: string | SqlClient | null,
    customSql?: SqlClient
  ): Promise<UserGameRecord[] & { total?: number; hasMore?: boolean }> {
    let sql = customSql || getDatabase();
    let uid: string | null = null;

    if (this.isSqlClient(userIdOrSql)) {
      sql = userIdOrSql;
    } else if (typeof userIdOrSql === 'string') {
      uid = userIdOrSql;
    }

    const statusFilter = filters?.status || null;
    const rawGenre = filters?.genre || null;
    const rawPlatform = filters?.platform || null;
    const genreFilter = filters?.genre ? `%${filters.genre}%` : null;
    const platformFilter = filters?.platform ? `%${filters.platform}%` : null;
    const limit = filters?.limit ? Math.min(Math.max(Number(filters.limit), 1), 500) : null;
    const offset = filters?.offset ? Math.max(Number(filters.offset), 0) : null;

    let totalCount: number | undefined = undefined;

    // Execute total count query when limit is explicitly provided for pagination
    if (limit !== null) {
      const [countRow] = await sql<{ count: string | number }[]>`
        SELECT COUNT(ug.id)::int as count
        FROM user_games ug
        JOIN games g ON ug.game_id = g.id
        WHERE 
          (${uid}::text IS NULL OR ug.user_id = ${uid}::uuid)
          AND (${statusFilter}::text IS NULL OR ug.status = ${statusFilter})
          AND (${genreFilter}::text IS NULL OR g.genres ? ${rawGenre} OR g.genres::text ILIKE ${genreFilter})
          AND (${platformFilter}::text IS NULL OR g.platforms ? ${rawPlatform} OR g.platforms::text ILIKE ${platformFilter});
      `;
      totalCount = Number(countRow?.count || 0);
    }

    const rawRecords = await sql<RawSqlUserGame[]>`
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
      WHERE 
        (${uid}::text IS NULL OR ug.user_id = ${uid}::uuid)
        AND (${statusFilter}::text IS NULL OR ug.status = ${statusFilter})
        AND (${genreFilter}::text IS NULL OR g.genres ? ${rawGenre} OR g.genres::text ILIKE ${genreFilter})
        AND (${platformFilter}::text IS NULL OR g.platforms ? ${rawPlatform} OR g.platforms::text ILIKE ${platformFilter})
      ORDER BY ug.updated_at DESC
      ${limit ? sql`LIMIT ${limit}` : sql``}
      ${offset ? sql`OFFSET ${offset}` : sql``};
    `;

    const records = rawRecords.map((r) => this.formatRecord(r)) as UserGameRecord[] & {
      total?: number;
      hasMore?: boolean;
    };

    if (totalCount !== undefined) {
      records.total = totalCount;
      records.hasMore = (offset || 0) + records.length < totalCount;
    }

    return records;
  }

  /**
   * Upserts a game into the PostgreSQL database and user catalog within a transaction.
   */
  public static async upsertGame(
    input: UpsertGameInput,
    userIdOrSql?: string | SqlClient | null,
    customSql?: SqlClient
  ): Promise<UserGameRecord> {
    let sql = customSql || getDatabase();
    let uid: string | null = null;

    if (this.isSqlClient(userIdOrSql)) {
      sql = userIdOrSql;
    } else if (typeof userIdOrSql === 'string') {
      uid = userIdOrSql;
    }

    const serializeJson = (val: string[] | string | null | undefined): string => {
      if (!val) return '[]';
      if (Array.isArray(val)) return JSON.stringify(val);
      return val.startsWith('[') ? val : JSON.stringify([val]);
    };

    const genresJson = serializeJson(input.genres);
    const platformsJson = serializeJson(input.platforms);
    const gameModesJson = serializeJson(input.game_modes);

    await sql.begin(async (tx) => {
      // 1. Check capacity limit (500 games per user/session)
      const [existing] = await tx`
        SELECT count(*)::int as count 
        FROM user_games 
        WHERE game_id = ${input.id} 
          AND (${uid}::text IS NULL OR user_id = ${uid}::uuid);
      `;
      if (!existing || existing.count === 0) {
        const [total] = await tx`
          SELECT count(*)::int as count 
          FROM user_games
          WHERE (${uid}::text IS NULL OR user_id = ${uid}::uuid);
        `;
        if (total && total.count >= 500) {
          throw new Error('La biblioteca ha alcanzado su capacidad máxima permitida (500 videojuegos). Elimina algunos para agregar nuevos.');
        }
      }

      // 2. Upsert games master record
      await tx`
        INSERT INTO games (id, title, slug, cover_url, release_year, summary, genres, platforms, rating, game_modes)
        VALUES (
          ${input.id}, 
          ${input.title}, 
          ${input.slug ?? null},
          ${input.cover_url ?? null}, 
          ${input.release_year ?? null}, 
          ${input.summary ?? null}, 
          ${genresJson}::jsonb, 
          ${platformsJson}::jsonb, 
          ${input.rating ?? null}, 
          ${gameModesJson}::jsonb
        )
        ON CONFLICT(id) DO UPDATE SET
          title = EXCLUDED.title,
          slug = COALESCE(EXCLUDED.slug, games.slug),
          cover_url = EXCLUDED.cover_url,
          release_year = EXCLUDED.release_year,
          summary = EXCLUDED.summary,
          genres = EXCLUDED.genres,
          platforms = EXCLUDED.platforms,
          rating = EXCLUDED.rating,
          game_modes = EXCLUDED.game_modes;
      `;

      // 3. Upsert user_games catalog link (supports both authenticated user and fallback guest mode)
      await tx`
        INSERT INTO user_games (user_id, game_id, status, updated_at)
        VALUES (${uid ? tx`${uid}::uuid` : null}, ${input.id}, ${input.status}, CURRENT_TIMESTAMP)
        ON CONFLICT (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), game_id) DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP;
      `;
    });

    const [raw] = await sql<RawSqlUserGame[]>`
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
      WHERE g.id = ${input.id}
        AND (${uid}::text IS NULL OR ug.user_id = ${uid}::uuid)
      LIMIT 1;
    `;

    if (!raw) {
      throw new Error(`Failed to retrieve saved game with ID ${input.id}`);
    }

    return this.formatRecord(raw);
  }

  /**
   * Deletes a game from the user's catalog.
   */
  public static async deleteGame(
    id: number,
    userIdOrSql?: string | SqlClient | null,
    customSql?: SqlClient
  ): Promise<{ success: boolean; deleted_id: number }> {
    let sql = customSql || getDatabase();
    let uid: string | null = null;

    if (this.isSqlClient(userIdOrSql)) {
      sql = userIdOrSql;
    } else if (typeof userIdOrSql === 'string') {
      uid = userIdOrSql;
    }

    const result = await sql`
      DELETE FROM user_games 
      WHERE game_id = ${id}
        AND (${uid}::text IS NULL OR user_id = ${uid}::uuid);
    `;

    return { success: result.count > 0, deleted_id: id };
  }
}
