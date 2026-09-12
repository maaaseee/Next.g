import { GameProvider } from './game-provider.interface';
import { NormalizedGame } from '../types/games';
import { ENV } from '../config/env';
import { CONSTANTS } from '../config/constants';
import { logger } from '../utils/logger';

export interface RawgRawGame {
  id: number;
  name: string;
  slug?: string | null;
  background_image?: string | null;
  released?: string | null;
  description_raw?: string | null;
  rating?: number | null;
  genres?: Array<{ id: number; name: string; slug?: string }>;
  platforms?: Array<{ platform: { id: number; name: string; slug?: string } }>;
  tags?: Array<{ id: number; name: string; slug: string }>;
}

export class RawgAdapter implements GameProvider {
  public async searchGames(query: string, limit: number): Promise<NormalizedGame[]> {
    if (!ENV.RAWG_API_KEY) {
      logger.error('[RAWG Adapter] API key is missing. Cannot fetch from RAWG.', { query });
      throw new Error('[RAWG Adapter] API key is missing. Cannot fetch from RAWG.');
    }

    const endpoint = `${CONSTANTS.RAWG_API_URL}?key=${ENV.RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=${limit}`;
    
    logger.info('[RAWG Adapter] Initiating API request', { provider: 'RAWG', query, limit });
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      logger.error(`[RAWG Adapter] Network error: HTTP ${response.status}`, { provider: 'RAWG', query, status: response.status });
      throw new Error(`[RAWG Adapter] Network error: HTTP ${response.status}`);
    }

    const data = (await response.json()) as { results?: RawgRawGame[] };
    const rawGames = data.results || [];
    logger.info('[RAWG Adapter] API request successful', { provider: 'RAWG', query, resultsCount: rawGames.length });
    return this.normalizeGames(rawGames);
  }

  /**
   * Fetches top popular games ordered by user adds/popularity (-added).
   */
  public async getPopularGames(limit: number = 50): Promise<NormalizedGame[]> {
    if (!ENV.RAWG_API_KEY) {
      logger.error('[RAWG Adapter] API key is missing. Cannot fetch popular games.');
      throw new Error('[RAWG Adapter] API key is missing. Cannot fetch from RAWG.');
    }

    const endpoint = `${CONSTANTS.RAWG_API_URL}?key=${ENV.RAWG_API_KEY}&ordering=-added&page_size=${limit}`;
    
    logger.info('[RAWG Adapter] Fetching popular games', { limit });

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      logger.error(`[RAWG Adapter] Network error fetching popular games: HTTP ${response.status}`);
      throw new Error(`[RAWG Adapter] Network error: HTTP ${response.status}`);
    }

    const data = (await response.json()) as { results?: RawgRawGame[] };
    const rawGames = data.results || [];
    logger.info('[RAWG Adapter] Popular games fetched successfully', { count: rawGames.length });
    return this.normalizeGames(rawGames);
  }

  public normalizeGames(rawGames: RawgRawGame[]): NormalizedGame[] {
    return rawGames.map((game) => {
      // 1. Cover URL resolution
      const cover_url = game.background_image || null;

      // 2. Release Year resolution
      let release_year: number | null = null;
      if (game.released) {
        const parsedYear = new Date(game.released).getUTCFullYear();
        if (!isNaN(parsedYear)) {
          release_year = parsedYear;
        }
      }

      // 3. Extract platforms
      const platforms: string[] = [];
      if (Array.isArray(game.platforms)) {
        for (const item of game.platforms) {
          if (item?.platform?.name) {
            platforms.push(item.platform.name);
          }
        }
      }

      // 4. Extract genres
      const genres: string[] = [];
      if (Array.isArray(game.genres)) {
        for (const g of game.genres) {
          if (g?.name) {
            genres.push(g.name);
          }
        }
      }

      // 5. Extract game modes
      const game_modes: string[] = [];
      if (Array.isArray(game.tags)) {
        const modeKeywords = ['singleplayer', 'multiplayer', 'co-op', 'cooperative', 'split screen', 'mmo'];
        for (const tag of game.tags) {
          const slug = tag.slug?.toLowerCase() || '';
          if (modeKeywords.some((keyword) => slug.includes(keyword))) {
            game_modes.push(tag.name);
          }
        }
      }

      return {
        id: game.id,
        title: game.name,
        slug: game.slug || null,
        cover_url,
        release_year,
        summary: game.description_raw || null,
        genres,
        platforms,
        rating: game.rating ? Math.round(game.rating * 10) / 10 : null,
        game_modes,
      };
    });
  }
}
