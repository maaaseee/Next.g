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
  }
> = {
  BACKLOG: {
    label: 'Backlog',
    description: 'Juegos pendientes por comenzar',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    color: '#f59e0b',
  },
  PLAYING: {
    label: 'Jugando',
    description: 'En progreso actualmente',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    color: '#10b981',
  },
  COMPLETED: {
    label: 'Completados',
    description: 'Juegos terminados o platinados',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    color: '#0ea5e9',
  },
  WISHLIST: {
    label: 'Deseados',
    description: 'Próximos lanzamientos o compras',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    color: '#a855f7',
  },
};
