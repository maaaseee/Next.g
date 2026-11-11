import type { GameProvider } from './game-provider.interface';
import type { NormalizedGame, DetailedGame, GameWebsite, GameVideo, SimilarGameSummary } from '../types/games';
import { TwitchAuthService } from '../services/twitch-auth.service';
import { ENV } from '../config/env';
import { CONSTANTS } from '../config/constants';
import { logger } from '../utils/logger';

/**
 * Raw IGDB API Cover Object.
 */
export interface IgdbCover {
  id: number;
  image_id: string;
  url?: string;
}

/**
 * Common shape for IGDB named entities (genres, platforms, game modes, themes, perspectives).
 */
export interface IgdbNamedEntity {
  id: number;
  name: string;
  slug?: string;
}

export interface IgdbScreenshot {
  id: number;
  image_id: string;
}

export interface IgdbInvolvedCompany {
  id: number;
  company?: {
    id: number;
    name: string;
  };
  developer?: boolean;
  publisher?: boolean;
}

export interface IgdbWebsite {
  id: number;
  category: number;
  url: string;
}

export interface IgdbVideo {
  id: number;
  name?: string;
  video_id: string;
}

export interface IgdbSimilarGame {
  id: number;
  name: string;
  slug?: string;
  cover?: {
    id: number;
    image_id: string;
  };
  rating?: number;
}

export interface IgdbLanguageSupport {
  id?: number;
  language?: { id?: number; name?: string; native_name?: string };
  language_support_type?: { id?: number; name?: string };
}

/**
 * Raw IGDB Game entity as returned by IGDB API v4 /games endpoint.
 */
export interface IgdbRawGame {
  id: number;
  name: string;
  slug?: string;
  cover?: IgdbCover;
  first_release_date?: number; // UNIX epoch timestamp in seconds
  summary?: string;
  storyline?: string;
  rating?: number; // 0 to 100 rating
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  total_rating?: number;
  total_rating_count?: number;
  rating_count?: number;
  genres?: IgdbNamedEntity[];
  platforms?: IgdbNamedEntity[];
  game_modes?: IgdbNamedEntity[];
  themes?: IgdbNamedEntity[];
  player_perspectives?: IgdbNamedEntity[];
  screenshots?: IgdbScreenshot[];
  artworks?: IgdbScreenshot[];
  involved_companies?: IgdbInvolvedCompany[];
  videos?: IgdbVideo[];
  websites?: IgdbWebsite[];
  similar_games?: IgdbSimilarGame[];
  language_supports?: IgdbLanguageSupport[];
  hypes?: number;
}

/**
 * Custom error class for IGDB API failures.
 */
export class IgdbApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'IgdbApiError';
  }
}

/**
 * Official IGDB (Twitch) Adapter implementing the GameProvider interface.
 * Connects to IGDB API v4 using Twitch OAuth2 Bearer token authentication.
 *
 * Source: IGDB API v4 Documentation
 * https://api-docs.igdb.com/
 */
export class IgdbAdapter implements GameProvider {
  /**
   * Executes an Apicalypse query against the IGDB /games endpoint.
   * Automatically handles 401 Unauthorized errors by refreshing the Twitch OAuth2 token once.
   */
  private async executeQuery(body: string, actionName: string): Promise<IgdbRawGame[]> {
    if (!ENV.TWITCH_CLIENT_ID || !ENV.TWITCH_CLIENT_SECRET) {
      logger.error(`[IGDB Adapter] Twitch credentials are missing. Cannot perform ${actionName}.`);
      throw new IgdbApiError(
        'Twitch credentials missing. Please set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env.'
      );
    }

    const executeRequest = async (token: string): Promise<Response> => {
      return await fetch(CONSTANTS.IGDB_GAMES_URL, {
        method: 'POST',
        headers: {
          'Client-ID': ENV.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'text/plain',
        },
        body: body.trim(),
      });
    };

    let token = await TwitchAuthService.getAccessToken();
    let response = await executeRequest(token);

    // If token expired or was invalidated, clear cache and retry once
    if (response.status === 401) {
      logger.warn('[IGDB Adapter] Received 401 Unauthorized. Refreshing Twitch token and retrying...');
      TwitchAuthService.clearCache();
      token = await TwitchAuthService.getAccessToken();
      response = await executeRequest(token);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      logger.error(`[IGDB Adapter] Network error during ${actionName}: HTTP ${response.status}`, {
        status: response.status,
        error: errorText,
      });
      throw new IgdbApiError(
        `[IGDB Adapter] Failed to fetch data: HTTP ${response.status} - ${errorText}`,
        response.status,
        errorText
      );
    }

    const data = (await response.json()) as IgdbRawGame[];
    return Array.isArray(data) ? data : [];
  }

  /**
   * Translates common platform names into IGDB Apicalypse where clauses.
   */
  public mapPlatformClause(platform?: string): string | null {
    if (!platform) return null;
    const p = platform.trim().toLowerCase();
    if (p.includes('switch') || p.includes('nintendo')) return 'platforms.name = "Nintendo Switch"';
    if (p.includes('playstation 5') || p === 'ps5') return 'platforms.name = "PlayStation 5"';
    if (p.includes('playstation 4') || p === 'ps4') return 'platforms.name = "PlayStation 4"';
    if (p.includes('pc') || p.includes('windows')) return 'platforms.name = "PC (Microsoft Windows)"';
    if (p.includes('xbox series') || p.includes('series x')) return 'platforms.name = "Xbox Series X|S"';
    if (p.includes('xbox one')) return 'platforms.name = "Xbox One"';
    const sanitized = platform.replace(/["\\;{}]/g, '').trim();
    return sanitized ? `platforms.name ~ *"${sanitized}"*` : null;
  }

  /**
   * Translates common genre names into IGDB Apicalypse where clauses.
   */
  public mapGenreClause(genre?: string): string | null {
    if (!genre) return null;
    const g = genre.trim().toLowerCase();
    if (g.includes('rpg') || g.includes('rol')) return 'genres.name = "Role-playing (RPG)"';
    if (g.includes('aventura') || g.includes('adventure')) return 'genres.name = "Adventure"';
    if (g.includes('shooter') || g.includes('disparos')) return 'genres.name = "Shooter"';
    if (g.includes('indie')) return 'genres.name = "Indie"';
    if (g.includes('estrategia') || g.includes('strategy')) return '(genres.name = "Strategy" | genres.name = "Real Time Strategy (RTS)" | genres.name = "Turn-based strategy (TBS)")';
    if (g.includes('carrera') || g.includes('racing')) return 'genres.name = "Racing"';
    if (g.includes('plataforma') || g.includes('platform')) return 'genres.name = "Platform"';
    if (g.includes('acción') || g.includes('accion') || g.includes('action')) return '(genres.name = "Shooter" | genres.name = "Fighting" | genres.name = "Hack and slash/Beat \'em up")';
    const sanitized = genre.replace(/["\\;{}]/g, '').trim();
    return sanitized ? `genres.name ~ *"${sanitized}"*` : null;
  }

  /**
   * Searches for games in the IGDB database using Apicalypse text search syntax with optional filters.
   */
  public async searchGames(
    query: string,
    limit: number = CONSTANTS.DEFAULT_SEARCH_LIMIT,
    filters?: { genre?: string; platform?: string }
  ): Promise<NormalizedGame[]> {
    const cleanQuery = query.replace(/["\\]/g, '').trim();
    if (!cleanQuery) {
      return [];
    }

    const whereConditions: string[] = [];
    const platformClause = this.mapPlatformClause(filters?.platform);
    if (platformClause) whereConditions.push(platformClause);
    const genreClause = this.mapGenreClause(filters?.genre);
    if (genreClause) whereConditions.push(genreClause);

    const whereClause = whereConditions.length > 0 ? `where ${whereConditions.join(' & ')};` : '';

    // IGDB Apicalypse search query
    const body = `
      search "${cleanQuery}";
      fields name, slug, cover.image_id, first_release_date, summary, rating, genres.name, platforms.name, game_modes.name;
      ${whereClause}
      limit ${limit};
    `;

    logger.info('[IGDB Adapter] Initiating search query', { provider: 'IGDB', query: cleanQuery, limit, filters });

    const rawGames = await this.executeQuery(body, `searchGames("${cleanQuery}")`);
    logger.info('[IGDB Adapter] Search request successful', {
      provider: 'IGDB',
      query: cleanQuery,
      resultsCount: rawGames.length,
    });

    return this.normalizeGames(rawGames);
  }

  /**
   * Fetches top-rated popular games with covers for seeding or catalog exploration with optional platform and genre filters.
   */
  public async getPopularGames(
    limit: number = 40,
    filters?: { genre?: string; platform?: string }
  ): Promise<NormalizedGame[]> {
    const whereConditions: string[] = ['cover != null'];

    const platformClause = this.mapPlatformClause(filters?.platform);
    if (platformClause) {
      whereConditions.push(platformClause);
    }

    const genreClause = this.mapGenreClause(filters?.genre);
    if (genreClause) {
      whereConditions.push(genreClause);
    }

    // Adapt minimum rating count threshold: when filtered, be more lenient so catalog is rich and populated
    const minRatings = (platformClause || genreClause) ? 5 : 80;
    whereConditions.push(`total_rating_count > ${minRatings}`);

    // Apicalypse query to get acclaimed popular games with covers and ratings
    const body = `
      fields name, slug, cover.image_id, first_release_date, summary, rating, genres.name, platforms.name, game_modes.name, total_rating_count;
      where ${whereConditions.join(' & ')};
      sort total_rating_count desc;
      limit ${limit};
    `;

    logger.info('[IGDB Adapter] Fetching popular games', { provider: 'IGDB', limit, filters });

    const rawGames = await this.executeQuery(body, 'getPopularGames');
    logger.info('[IGDB Adapter] Popular games fetched successfully', {
      provider: 'IGDB',
      count: rawGames.length,
    });

    return this.normalizeGames(rawGames);
  }

  /**
   * Fetches the most anticipated upcoming games with countdown dates and hypes.
   */
  public async getAnticipatedGames(limit: number = 8): Promise<NormalizedGame[]> {
    const nowEpoch = Math.floor(Date.now() / 1000);
    const body = `
      fields name, slug, cover.image_id, artworks.image_id, screenshots.image_id, first_release_date, summary, rating, hypes, genres.name, platforms.name, game_modes.name;
      where first_release_date > ${nowEpoch} & hypes > 2;
      sort hypes desc;
      limit ${limit};
    `;

    logger.info('[IGDB Adapter] Fetching anticipated games', { provider: 'IGDB', limit });

    const rawGames = await this.executeQuery(body, 'getAnticipatedGames');
    logger.info('[IGDB Adapter] Anticipated games fetched successfully', {
      provider: 'IGDB',
      count: rawGames.length,
    });

    return this.normalizeAnticipatedGames(rawGames);
  }

  public normalizeAnticipatedGames(rawGames: IgdbRawGame[]): NormalizedGame[] {
    return rawGames.map((game) => {
      const base = this.normalizeGames([game])[0];
      const target_timestamp = typeof game.first_release_date === 'number' ? game.first_release_date * 1000 : null;
      const release_date = target_timestamp ? new Date(target_timestamp).toISOString().split('T')[0] : null;

      // Prioritize horizontal widescreen banner artworks
      const artworkId = game.artworks?.[0]?.image_id || game.screenshots?.[0]?.image_id;
      const banner_url = artworkId
        ? `${CONSTANTS.IGDB_IMAGE_BASE_URL}/t_1080p/${artworkId}.jpg`
        : base.cover_url;

      return {
        ...base,
        cover_url: banner_url || base.cover_url,
        banner_url: banner_url || base.cover_url,
        hypes: typeof game.hypes === 'number' ? game.hypes : null,
        first_release_date: typeof game.first_release_date === 'number' ? game.first_release_date : null,
        target_timestamp,
        release_date,
      };
    });
  }

  /**
   * Normalizes raw IGDB API payloads into the standard NormalizedGame domain model.
   */
  public normalizeGames(rawGames: IgdbRawGame[]): NormalizedGame[] {
    return rawGames.map((game) => {
      // 1. Cover URL resolution using IGDB Cloudinary CDN
      const cover_url = game.cover?.image_id
        ? `${CONSTANTS.IGDB_IMAGE_BASE_URL}/${CONSTANTS.IGDB_DEFAULT_COVER_SIZE}/${game.cover.image_id}.jpg`
        : null;

      // 2. Release Year resolution from UNIX epoch seconds
      let release_year: number | null = null;
      if (typeof game.first_release_date === 'number' && game.first_release_date > 0) {
        const parsedDate = new Date(game.first_release_date * 1000).getUTCFullYear();
        if (!isNaN(parsedDate)) {
          release_year = parsedDate;
        }
      }

      // 3. Extract platforms
      const platforms: string[] = [];
      if (Array.isArray(game.platforms)) {
        for (const item of game.platforms) {
          if (item?.name?.trim()) platforms.push(item.name.trim());
        }
      }

      // 4. Extract genres
      const genres: string[] = [];
      if (Array.isArray(game.genres)) {
        for (const g of game.genres) {
          if (g?.name?.trim()) genres.push(g.name.trim());
        }
      }

      // 5. Extract game modes
      const game_modes: string[] = [];
      if (Array.isArray(game.game_modes)) {
        for (const m of game.game_modes) {
          if (m?.name?.trim()) game_modes.push(m.name.trim());
        }
      }

      return {
        id: game.id,
        title: game.name,
        slug: game.slug || null,
        cover_url,
        release_year,
        summary: game.summary ? game.summary.trim() : null,
        genres,
        platforms,
        rating: typeof game.rating === 'number' && !isNaN(game.rating) ? Math.round(game.rating * 10) / 10 : null,
        game_modes,
      };
    });
  }

  /**
   * Fetches full rich game details by ID from IGDB.
   */
  public async getGameById(id: number): Promise<DetailedGame | null> {
    const body = `
      fields name, slug, cover.image_id, first_release_date, summary, storyline, rating,
        aggregated_rating, aggregated_rating_count,
        genres.name, platforms.name, game_modes.name, themes.name, player_perspectives.name,
        screenshots.image_id, artworks.image_id,
        involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
        videos.video_id, videos.name,
        websites.url, websites.category,
        similar_games.id, similar_games.name, similar_games.cover.image_id, similar_games.rating, similar_games.slug,
        language_supports.language.name, language_supports.language_support_type.name;
      where id = ${id};
      limit 1;
    `;

    logger.info('[IGDB Adapter] Fetching game by ID', { provider: 'IGDB', id });
    const rawGames = await this.executeQuery(body, `getGameById(${id})`);
    if (!rawGames || rawGames.length === 0) {
      return null;
    }

    return this.normalizeDetailedGame(rawGames[0]!);
  }

  /**
   * Fetches full rich game details by URL-friendly slug from IGDB.
   */
  public async getGameBySlug(slug: string): Promise<DetailedGame | null> {
    const cleanSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '').trim();
    if (!cleanSlug) return null;

    const body = `
      fields name, slug, cover.image_id, first_release_date, summary, storyline, rating,
        aggregated_rating, aggregated_rating_count,
        genres.name, platforms.name, game_modes.name, themes.name, player_perspectives.name,
        screenshots.image_id, artworks.image_id,
        involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
        videos.video_id, videos.name,
        websites.url, websites.category,
        similar_games.id, similar_games.name, similar_games.cover.image_id, similar_games.rating, similar_games.slug,
        language_supports.language.name, language_supports.language_support_type.name;
      where slug = "${cleanSlug}";
      limit 1;
    `;

    logger.info('[IGDB Adapter] Fetching game by slug', { provider: 'IGDB', slug: cleanSlug });
    const rawGames = await this.executeQuery(body, `getGameBySlug(${cleanSlug})`);
    if (!rawGames || rawGames.length === 0) {
      return null;
    }

    return this.normalizeDetailedGame(rawGames[0]!);
  }

  /**
   * Normalizes raw IGDB API payload into a rich DetailedGame domain model.
   */
  public normalizeDetailedGame(game: IgdbRawGame): DetailedGame {
    const base = this.normalizeGames([game])[0]!;

    const screenshots: string[] = [];
    if (Array.isArray(game.screenshots)) {
      for (const s of game.screenshots) {
        if (s?.image_id) {
          screenshots.push(`${CONSTANTS.IGDB_IMAGE_BASE_URL}/t_screenshot_big/${s.image_id}.jpg`);
        }
      }
    }

    const artworks: string[] = [];
    if (Array.isArray(game.artworks)) {
      for (const a of game.artworks) {
        if (a?.image_id) {
          artworks.push(`${CONSTANTS.IGDB_IMAGE_BASE_URL}/t_1080p/${a.image_id}.jpg`);
        }
      }
    }

    const developers: string[] = [];
    const publishers: string[] = [];
    if (Array.isArray(game.involved_companies)) {
      for (const comp of game.involved_companies) {
        const name = comp?.company?.name?.trim();
        if (name) {
          if (comp.developer && !developers.includes(name)) developers.push(name);
          if (comp.publisher && !publishers.includes(name)) publishers.push(name);
        }
      }
    }

    const themes: string[] = [];
    if (Array.isArray(game.themes)) {
      for (const t of game.themes) {
        if (t?.name?.trim()) themes.push(t.name.trim());
      }
    }

    const player_perspectives: string[] = [];
    if (Array.isArray(game.player_perspectives)) {
      for (const p of game.player_perspectives) {
        if (p?.name?.trim()) player_perspectives.push(p.name.trim());
      }
    }

    const videos: GameVideo[] = [];
    if (Array.isArray(game.videos)) {
      for (const v of game.videos) {
        if (v?.video_id) {
          videos.push({
            video_id: v.video_id,
            name: v.name || undefined,
            thumbnail_url: `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`,
          });
        }
      }
    }

    const websites: GameWebsite[] = [];
    if (Array.isArray(game.websites)) {
      for (const w of game.websites) {
        if (w?.url) {
          websites.push({
            category: w.category ?? 0,
            category_name: this.getWebsiteCategoryName(w.url, w.category),
            url: w.url,
          });
        }
      }
    }

    const similar_games: SimilarGameSummary[] = [];
    if (Array.isArray(game.similar_games)) {
      for (const sim of game.similar_games) {
        if (sim?.id && sim?.name) {
          similar_games.push({
            id: sim.id,
            title: sim.name,
            cover_url: sim.cover?.image_id
              ? `${CONSTANTS.IGDB_IMAGE_BASE_URL}/${CONSTANTS.IGDB_DEFAULT_COVER_SIZE}/${sim.cover.image_id}.jpg`
              : null,
            slug: sim.slug || null,
            rating: typeof sim.rating === 'number' ? Math.round(sim.rating * 10) / 10 : null,
          });
        }
      }
    }

    const languageMap = new Map<string, { language: string; interface: boolean; audio: boolean; subtitles: boolean }>();
    if (Array.isArray(game.language_supports)) {
      for (const ls of game.language_supports) {
        const langName = ls?.language?.name?.trim();
        const typeName = ls?.language_support_type?.name?.trim().toLowerCase();
        if (langName) {
          if (!languageMap.has(langName)) {
            languageMap.set(langName, {
              language: langName,
              interface: false,
              audio: false,
              subtitles: false,
            });
          }
          const entry = languageMap.get(langName)!;
          if (typeName === 'audio' || ls?.language_support_type?.id === 1) entry.audio = true;
          if (typeName === 'subtitles' || ls?.language_support_type?.id === 2) entry.subtitles = true;
          if (typeName === 'interface' || ls?.language_support_type?.id === 3) entry.interface = true;
        }
      }
    }
    const language_supports = Array.from(languageMap.values());

    return {
      ...base,
      first_release_date: typeof game.first_release_date === 'number' ? game.first_release_date : base.first_release_date || null,
      storyline: game.storyline?.trim() || null,
      screenshots,
      artworks,
      developers,
      publishers,
      themes,
      player_perspectives,
      aggregated_rating: typeof game.aggregated_rating === 'number' ? Math.round(game.aggregated_rating * 10) / 10 : null,
      aggregated_rating_count: game.aggregated_rating_count || null,
      videos,
      websites,
      similar_games,
      language_supports,
    };
  }

  private getWebsiteCategoryName(url: string, category?: number): string {
    const lower = url.toLowerCase();
    if (lower.includes('steampowered.com') || lower.includes('steamcommunity.com')) return 'Steam';
    if (lower.includes('discord')) return 'Discord';
    if (lower.includes('twitter.com') || lower.includes('x.com')) return 'Twitter / X';
    if (lower.includes('reddit.com')) return 'Reddit';
    if (lower.includes('wikipedia.org')) return 'Wikipedia';
    if (lower.includes('wiki')) return 'Wiki';
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube';
    if (lower.includes('twitch.tv')) return 'Twitch';
    if (lower.includes('playstation.com')) return 'PlayStation Store';
    if (lower.includes('xbox.com')) return 'Xbox Store';
    if (lower.includes('nintendo.com')) return 'Nintendo eShop';
    if (lower.includes('epicgames.com')) return 'Epic Games';
    if (lower.includes('gog.com')) return 'GOG';
    if (lower.includes('itch.io')) return 'itch.io';
    if (category === 1) return 'Sitio Oficial';
    return 'Sitio Oficial';
  }
}
