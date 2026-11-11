import type { NormalizedGame } from '../types/games';

/**
 * Universal contract for External Game Data Providers.
 * Decouples the backend core from specific external API specifications (IGDB).
 */
export interface GameProvider {
  /**
   * Fetches games from the external API matching a search query.
   * Only handles external network calls and normalization, not local caching.
   * 
   * @param query The search term
   * @param limit The maximum number of results to fetch (default: 20)
   * @returns A promise that resolves to an array of NormalizedGame
   */
  searchGames(query: string, limit?: number): Promise<NormalizedGame[]>;

  /**
   * Fetches top popular/trending games from the external API for database seeding or explore view.
   *
   * @param limit The maximum number of games to fetch
   * @returns A promise that resolves to an array of NormalizedGame
   */
  getPopularGames(limit?: number): Promise<NormalizedGame[]>;
}
