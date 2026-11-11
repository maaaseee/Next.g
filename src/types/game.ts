export type GameStatus = 'BACKLOG' | 'PLAYING' | 'COMPLETED' | 'WISHLIST';

export interface Game {
  id: number;
  title: string;
  cover_url: string | null;
  banner_url?: string | null;
  release_year: number | null;
  summary: string | null;
  genres: string[];
  platforms: string[];
  rating: number | null;
  game_modes: string[];
  slug?: string | null;
  hypes?: number | null;
  first_release_date?: number | null;
}

export interface AnticipatedGame extends Game {
  release_date?: string | null;
  target_timestamp?: number | null;
}

export interface UserGame extends Game {
  status: GameStatus;
  created_at?: string;
  updated_at?: string;
}

export interface GameWebsite {
  category: number;
  category_name?: string;
  url: string;
}

export interface GameVideo {
  video_id: string;
  name?: string;
  thumbnail_url?: string;
}

export interface SimilarGameSummary {
  id: number;
  title: string;
  slug?: string | null;
  cover_url: string | null;
  rating: number | null;
}

export interface GameLanguageSupport {
  language: string;
  interface: boolean;
  audio: boolean;
  subtitles: boolean;
}

export interface DetailedGame extends Game {
  storyline?: string | null;
  screenshots?: string[];
  artworks?: string[];
  developers?: string[];
  publishers?: string[];
  themes?: string[];
  player_perspectives?: string[];
  aggregated_rating?: number | null;
  aggregated_rating_count?: number | null;
  videos?: GameVideo[];
  similar_games?: SimilarGameSummary[];
  websites?: GameWebsite[];
  language_supports?: GameLanguageSupport[];
}

export const GAME_STATUS_CONFIG: Record<
  GameStatus,
  {
    label: string;
    description: string;
    badgeClass: string;
    color: string;
    bgClass: string;
    textClass: string;
    activeBgClass: string;
    activeBorderClass: string;
    badgeBgClass: string;
  }
> = {
  BACKLOG: {
    label: 'Backlog',
    description: 'Juegos pendientes por comenzar',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    color: '#f59e0b',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-400',
    activeBgClass: 'bg-amber-500/15',
    activeBorderClass: 'border-amber-500/60',
    badgeBgClass: 'bg-amber-500/30',
  },
  PLAYING: {
    label: 'Jugando',
    description: 'En progreso actualmente',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    color: '#10b981',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
    activeBgClass: 'bg-emerald-500/15',
    activeBorderClass: 'border-emerald-500/60',
    badgeBgClass: 'bg-emerald-500/30',
  },
  COMPLETED: {
    label: 'Completados',
    description: 'Juegos terminados o platinados',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    color: '#0ea5e9',
    bgClass: 'bg-sky-500',
    textClass: 'text-sky-400',
    activeBgClass: 'bg-sky-500/15',
    activeBorderClass: 'border-sky-500/60',
    badgeBgClass: 'bg-sky-500/30',
  },
  WISHLIST: {
    label: 'Deseados',
    description: 'Próximos lanzamientos o compras',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    color: '#a855f7',
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-400',
    activeBgClass: 'bg-purple-500/15',
    activeBorderClass: 'border-purple-500/60',
    badgeBgClass: 'bg-purple-500/30',
  },
};

/**
 * Normalizes game rating to a 5-star scale (0.0 to 5.0).
 * IGDB ratings are on a 0-100 scale, so ratings > 5 are normalized by dividing by 20.
 */
export function formatGameRating(rating: number | null | undefined): string | null {
  if (rating === null || rating === undefined || isNaN(rating)) return null;
  const normalized = rating > 5 ? rating / 20 : rating;
  return normalized.toFixed(1);
}

/**
 * Generates official IGDB game page URL using the game's slug or title.
 * Example: https://www.igdb.com/games/the-witcher-3-wild-hunt
 */
export function getIgdbGameUrl(
  game: { id?: number | string; title?: string; slug?: string | null } | number | string
): string {
  if (typeof game === 'object' && game !== null) {
    if (game.slug && game.slug.trim()) {
      return `https://www.igdb.com/games/${encodeURIComponent(game.slug.trim())}`;
    }
    if (game.title && game.title.trim()) {
      const slug = game.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return `https://www.igdb.com/games/${slug}`;
    }
  }

  if (typeof game === 'string' && game.trim()) {
    const slug = game
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `https://www.igdb.com/games/${slug}`;
  }

  return 'https://www.igdb.com';
}

/**
 * @deprecated Use getIgdbGameUrl instead. Migrated from RAWG to IGDB.
 */
export const getRawgGameUrl = getIgdbGameUrl;

