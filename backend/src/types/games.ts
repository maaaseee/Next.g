export interface NormalizedGame {
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
