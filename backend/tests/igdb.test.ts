/**
 * Unit Tests for IGDB Game Normalization.
 */

import { describe, it, expect } from 'bun:test';
import { IgdbAdapter, type IgdbRawGame } from '../src/providers/igdb.adapter';

describe('IgdbAdapter', () => {
  it('should normalize IGDB raw game results with expanded fields', () => {
    const rawGames: IgdbRawGame[] = [
      {
        id: 1020,
        name: 'Grand Theft Auto V',
        cover: {
          image_id: 'co1r7h',
        },
        first_release_date: 1379376000,
        summary: 'Los Santos is a city of bright lights.',
        genres: [{ id: 1, name: 'Action' }],
        platforms: [{ id: 6, name: 'PC' }],
        rating: 95.2,
        game_modes: [{ id: 1, name: 'Single player' }],
      },
    ];

    const adapter = new IgdbAdapter();
    const normalized = (adapter as any).normalizeGames(rawGames);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual({
      id: 1020,
      title: 'Grand Theft Auto V',
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg',
      release_year: 2013,
      summary: 'Los Santos is a city of bright lights.',
      genres: ['Action'],
      platforms: ['PC'],
      rating: 95.2,
      game_modes: ['Single player'],
    });
  });
});
