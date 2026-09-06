/**
 * Games Catalog and Local SQLite Persistence Service.
 * 
 * Source: Bun SQLite Transactions and Queries
 * https://bun.sh/docs/api/sqlite#transactions
 */

import { Database } from 'bun:sqlite';
import { getDatabase } from '../db/index';

export type GameStatus = 'BACKLOG' | 'PLAYING' | 'COMPLETED' | 'WISHLIST';

export interface UserGameRecord {
  id: number;
  title: string;
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
  id: number;
  title: string;
  cover_url: string | null;
  release_year: number | null;
  summary: string | null;
  genres: string | null;
  platforms: string | null;
  rating: number | null;
  game_modes: string | null;
  status: GameStatus;
  created_at: string;
  updated_at: string;
}

export interface UpsertGameInput {
  id: number;
  title: string;
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
  private static parseJsonArray(value: string | null): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      return value.split(',').map((s) => s.trim());
    }
  }

  private static formatRecord(raw: RawSqlUserGame): UserGameRecord {
    return {
      ...raw,
      genres: this.parseJsonArray(raw.genres),
      platforms: this.parseJsonArray(raw.platforms),
      game_modes: this.parseJsonArray(raw.game_modes),
    };
  }

  /**
   * Retrieves all games in the user's catalog, optionally filtered by status, genre or platform.
   */
  public static getAll(
    filters?: { status?: GameStatus; genre?: string; platform?: string },
    customDb?: Database
  ): UserGameRecord[] {
    const db: Database = customDb || getDatabase();

    let sql = `
      SELECT 
        g.id, 
        g.title, 
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
      WHERE 1=1
    `;

    const params: (string | number)[] = [];

    if (filters?.status) {
      sql += ' AND ug.status = ?';
      params.push(filters.status);
    }

    if (filters?.genre) {
      sql += ' AND g.genres LIKE ?';
      params.push(`%${filters.genre}%`);
    }

    if (filters?.platform) {
      sql += ' AND g.platforms LIKE ?';
      params.push(`%${filters.platform}%`);
    }

    sql += ' ORDER BY ug.updated_at DESC;';

    const rawRecords = db.query<RawSqlUserGame, (string | number)[]>(sql).all(...params);
    return rawRecords.map((r) => this.formatRecord(r));
  }

  /**
   * Upserts a game into the local database and user catalog within a single transaction.
   */
  public static upsertGame(input: UpsertGameInput, customDb?: Database): UserGameRecord {
    const db: Database = customDb || getDatabase();

    const serializeField = (val: string[] | string | null | undefined): string | null => {
      if (!val) return null;
      if (Array.isArray(val)) return JSON.stringify(val);
      return val.startsWith('[') ? val : JSON.stringify([val]);
    };

    const upsertTransaction = db.transaction((item: UpsertGameInput) => {
      // Check library capacity before adding new unique games
      const existing = db.query<{ count: number }, [number]>('SELECT COUNT(*) as count FROM user_games WHERE game_id = ?;').get(item.id);
      if (!existing || existing.count === 0) {
        const totalCount = db.query<{ count: number }, []>('SELECT COUNT(*) as count FROM user_games;').get();
        if (totalCount && totalCount.count >= 500) {
          throw new Error('La biblioteca ha alcanzado su capacidad máxima permitida (500 videojuegos). Elimina algunos para agregar nuevos.');
        }
      }

      // 1. Insert or update master game record
      db.run(
        `
        INSERT INTO games (id, title, cover_url, release_year, summary, genres, platforms, rating, game_modes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          cover_url = excluded.cover_url,
          release_year = excluded.release_year,
          summary = excluded.summary,
          genres = excluded.genres,
          platforms = excluded.platforms,
          rating = excluded.rating,
          game_modes = excluded.game_modes;
      `,
        [
          item.id,
          item.title,
          item.cover_url ?? null,
          item.release_year ?? null,
          item.summary ?? null,
          serializeField(item.genres),
          serializeField(item.platforms),
          item.rating ?? null,
          serializeField(item.game_modes),
        ]
      );

      // 2. Insert or update user catalog relation
      db.run(
        `
        INSERT INTO user_games (game_id, status, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(game_id) DO UPDATE SET
          status = excluded.status,
          updated_at = CURRENT_TIMESTAMP;
      `,
        [item.id, item.status]
      );
    });

    upsertTransaction(input);

    const raw = db
      .query<RawSqlUserGame, [number]>(`
        SELECT 
          g.id, 
          g.title, 
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
        WHERE g.id = ?;
      `)
      .get(input.id);

    if (!raw) {
      throw new Error(`Failed to retrieve saved game with ID ${input.id}`);
    }

    return this.formatRecord(raw);
  }

  /**
   * Deletes a game from the user's catalog.
   */
  public static deleteGame(id: number, customDb?: Database): { success: boolean; deleted_id: number } {
    const db: Database = customDb || getDatabase();
    db.run('DELETE FROM user_games WHERE game_id = ?;', [id]);
    return { success: true, deleted_id: id };
  }
}
