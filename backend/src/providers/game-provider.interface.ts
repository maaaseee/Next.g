import { NormalizedGame } from '../types/games';

export interface GameProvider {
  /**
   * Fetches games from the external API and normalizes them into the standard format.
   * Only handles external network calls and normalization, not local caching.
   * 
   * @param query The search term
   * @param limit The maximum number of results to fetch
   * @returns A promise that resolves to an array of NormalizedGame
   */
  searchGames(query: string, limit: number): Promise<NormalizedGame[]>;
}
