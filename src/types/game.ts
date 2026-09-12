export type GameStatus = 'BACKLOG' | 'PLAYING' | 'COMPLETED' | 'WISHLIST';

export interface Game {
  id: number;
  title: string;
  cover_url: string | null;
  release_year: number | null;
  summary: string | null;
  genres: string[];
  platforms: string[];
  rating: number | null;
  game_modes: string[];
  slug?: string | null;
}

export interface UserGame extends Game {
  status: GameStatus;
  created_at?: string;
  updated_at?: string;
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
 * Handles legacy IGDB ratings (0-100) by dividing by 20.
 */
export function formatGameRating(rating: number | null | undefined): string | null {
  if (rating === null || rating === undefined || isNaN(rating)) return null;
  const normalized = rating > 5 ? rating / 20 : rating;
  return normalized.toFixed(1);
}

/**
 * Generates official RAWG.io specific game page URL using the game's RAWG ID.
 * Example: https://rawg.io/games/<id> (e.g., https://rawg.io/games/422859)
 * RAWG redirects or resolves IDs directly to their game page.
 */
export function getRawgGameUrl(game: { id?: number | string; title?: string; slug?: string | null } | number | string): string {
  if (typeof game === 'number') {
    return `https://rawg.io/games/${game}`;
  }

  if (typeof game === 'object' && game !== null) {
    if (game.id !== undefined && game.id !== null && !isNaN(Number(game.id))) {
      return `https://rawg.io/games/${game.id}`;
    }
    if (game.slug && game.slug.trim()) {
      return `https://rawg.io/games/${game.slug.trim()}`;
    }
    if (game.title) {
      const slug = game.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return `https://rawg.io/games/${slug}`;
    }
  }

  if (typeof game === 'string' && !isNaN(Number(game.trim()))) {
    return `https://rawg.io/games/${game.trim()}`;
  }

  return 'https://rawg.io';
}

