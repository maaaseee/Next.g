export interface NormalizedGame {
  id: number;
  title: string;
  slug?: string | null;
  cover_url: string | null;
  release_year: number | null;
  summary: string | null;
  genres: string[];
  platforms: string[];
  rating: number | null;
  game_modes: string[];
  hypes?: number | null;
  first_release_date?: number | null;
}

export interface AnticipatedGame extends NormalizedGame {
  release_date?: string | null;
  target_timestamp?: number | null;
  banner_url?: string | null;
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

export interface DetailedGame extends NormalizedGame {
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

