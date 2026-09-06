import { GameProvider } from './game-provider.interface';
import { NormalizedGame } from '../types/games';
import { TwitchAuthService } from '../services/twitch-auth.service';
import { ENV } from '../config/env';
import { CONSTANTS } from '../config/constants';
import { logger } from '../utils/logger';

export interface IgdbRawGame {
  id: number;
  name: string;
  cover?: { image_id: string };
  first_release_date?: number;
  summary?: string;
  rating?: number;
  genres?: Array<{ id: number; name: string }>;
  platforms?: Array<{ id: number; name: string }>;
  game_modes?: Array<{ id: number; name: string }>;
}

export class IgdbAdapter implements GameProvider {
  public async searchGames(query: string, limit: number): Promise<NormalizedGame[]> {
    if (!ENV.TWITCH_CLIENT_ID || !ENV.TWITCH_CLIENT_SECRET) {
      logger.error('[IGDB Adapter] Twitch credentials are missing. Cannot fetch from IGDB.', { query });
      throw new Error('[IGDB Adapter] Twitch credentials are missing. Cannot fetch from IGDB.');
    }

    const token = await TwitchAuthService.getAccessToken();

    const body = `
      search "${query.replace(/"/g, '')}";
      fields name, cover.image_id, first_release_date, summary, rating, genres.name, platforms.name, game_modes.name;
      limit ${limit};
    `;

    logger.info('[IGDB Adapter] Initiating API request', { provider: 'IGDB', query, limit });

    const response = await fetch(`${CONSTANTS.IGDB_API_URL}/games`, {
      method: 'POST',
      headers: {
        'Client-ID': ENV.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      logger.error(`[IGDB Adapter] Network error: HTTP ${response.status}`, { provider: 'IGDB', query, status: response.status });
      throw new Error(`[IGDB Adapter] Network error: HTTP ${response.status}`);
    }

    const rawGames = (await response.json()) as IgdbRawGame[];
    logger.info('[IGDB Adapter] API request successful', { provider: 'IGDB', query, resultsCount: rawGames.length });
    return this.normalizeGames(rawGames);
  }

  private normalizeGames(rawGames: IgdbRawGame[]): NormalizedGame[] {
    return rawGames.map((game) => {
      // 1. Cover URL resolution
      const cover_url = game.cover?.image_id 
        ? `${CONSTANTS.IGDB_IMAGE_BASE_URL}/${CONSTANTS.IGDB_DEFAULT_COVER_SIZE}/${game.cover.image_id}.jpg`
        : null;

      // 2. Release Year resolution
      let release_year: number | null = null;
      if (game.first_release_date) {
        const parsedDate = new Date(game.first_release_date * 1000).getUTCFullYear();
        if (!isNaN(parsedDate)) {
          release_year = parsedDate;
        }
      }

      // 3. Extract platforms
      const platforms: string[] = [];
      if (Array.isArray(game.platforms)) {
        for (const item of game.platforms) {
          if (item?.name) platforms.push(item.name);
        }
      }

      // 4. Extract genres
      const genres: string[] = [];
      if (Array.isArray(game.genres)) {
        for (const g of game.genres) {
          if (g?.name) genres.push(g.name);
        }
      }

      // 5. Extract game modes
      const game_modes: string[] = [];
      if (Array.isArray(game.game_modes)) {
        for (const m of game.game_modes) {
          if (m?.name) game_modes.push(m.name);
        }
      }

      return {
        id: game.id,
        title: game.name,
        cover_url,
        release_year,
        summary: game.summary || null,
        genres,
        platforms,
        rating: game.rating ? Math.round(game.rating * 10) / 10 : null,
        game_modes,
      };
    });
  }
}
