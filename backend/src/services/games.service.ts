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
  genres: any;
  platforms: any;
  rating: number | null;
  game_modes: any;
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

export class GamesService {
  private static parseJsonArray(value: any): string[] {
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
   * Retrieves all games in the user's catalog, optionally filtered by status, genre or platform.
   */
  public static async getAll(
    filters?: { status?: GameStatus; genre?: string; platform?: string },
    customSql?: SqlClient
  ): Promise<UserGameRecord[]> {
    const sql = customSql || getDatabase();

    const statusFilter = filters?.status || null;
    const genreFilter = filters?.genre ? `%${filters.genre}%` : null;
    const platformFilter = filters?.platform ? `%${filters.platform}%` : null;

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
        (${statusFilter}::text IS NULL OR ug.status = ${statusFilter})
        AND (${genreFilter}::text IS NULL OR g.genres::text ILIKE ${genreFilter})
        AND (${platformFilter}::text IS NULL OR g.platforms::text ILIKE ${platformFilter})
      ORDER BY ug.updated_at DESC;
    `;

    return rawRecords.map((r) => this.formatRecord(r));
  }

  /**
   * Upserts a game into the PostgreSQL database and user catalog within a transaction.
   */
  public static async upsertGame(input: UpsertGameInput, customSql?: SqlClient): Promise<UserGameRecord> {
    const sql = customSql || getDatabase();

    const serializeJson = (val: string[] | string | null | undefined): string => {
      if (!val) return '[]';
      if (Array.isArray(val)) return JSON.stringify(val);
      return val.startsWith('[') ? val : JSON.stringify([val]);
    };

    const genresJson = serializeJson(input.genres);
    const platformsJson = serializeJson(input.platforms);
    const gameModesJson = serializeJson(input.game_modes);

    await sql.begin(async (tx) => {
      // 1. Check capacity limit (500 games)
      const [existing] = await tx`SELECT count(*)::int as count FROM user_games WHERE game_id = ${input.id};`;
      if (!existing || existing.count === 0) {
        const [total] = await tx`SELECT count(*)::int as count FROM user_games;`;
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

      // 3. Upsert user_games catalog link
      await tx`
        INSERT INTO user_games (game_id, status, updated_at)
        VALUES (${input.id}, ${input.status}, CURRENT_TIMESTAMP)
        ON CONFLICT(game_id) DO UPDATE SET
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
      WHERE g.id = ${input.id};
    `;

    if (!raw) {
      throw new Error(`Failed to retrieve saved game with ID ${input.id}`);
    }

    return this.formatRecord(raw);
  }

  /**
   * Deletes a game from the user's catalog.
   */
  public static async deleteGame(id: number, customSql?: SqlClient): Promise<{ success: boolean; deleted_id: number }> {
    const sql = customSql || getDatabase();
    await sql`DELETE FROM user_games WHERE game_id = ${id};`;
    return { success: true, deleted_id: id };
  }
}
