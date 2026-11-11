/**
 * Unit Tests for IGDB Game Normalization, Queries, and Error Handling.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { IgdbAdapter, IgdbApiError, type IgdbRawGame } from '../src/providers/igdb.adapter';
import { ENV } from '../src/config/env';

describe('IgdbAdapter', () => {
  let adapter: IgdbAdapter;

  beforeEach(() => {
    adapter = new IgdbAdapter();
  });

  it('should normalize IGDB raw game results with expanded fields including slug', () => {
    const rawGames: IgdbRawGame[] = [
      {
        id: 1020,
        name: 'Grand Theft Auto V',
        slug: 'grand-theft-auto-v',
        cover: {
          id: 1234,
          image_id: 'co1r7h',
        },
        first_release_date: 1379376000,
        summary: 'Los Santos is a city of bright lights.',
        genres: [{ id: 1, name: 'Action' }],
        platforms: [{ id: 6, name: 'PC' }],
        rating: 95.24,
        game_modes: [{ id: 1, name: 'Single player' }],
      },
    ];

    const normalized = adapter.normalizeGames(rawGames);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual({
      id: 1020,
      title: 'Grand Theft Auto V',
      slug: 'grand-theft-auto-v',
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg',
      release_year: 2013,
      summary: 'Los Santos is a city of bright lights.',
      genres: ['Action'],
      platforms: ['PC'],
      rating: 95.2,
      game_modes: ['Single player'],
    });
  });

  it('should handle missing or empty fields gracefully during normalization', () => {
    const rawGames: IgdbRawGame[] = [
      {
        id: 9999,
        name: 'Indie Game Without Cover',
      },
    ];

    const normalized = adapter.normalizeGames(rawGames);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual({
      id: 9999,
      title: 'Indie Game Without Cover',
      slug: null,
      cover_url: null,
      release_year: null,
      summary: null,
      genres: [],
      platforms: [],
      rating: null,
      game_modes: [],
    });
  });

  it('should throw an IgdbApiError if credentials are missing on searchGames', async () => {
    const origId = ENV.TWITCH_CLIENT_ID;
    const origSecret = ENV.TWITCH_CLIENT_SECRET;
    ENV.TWITCH_CLIENT_ID = '';
    ENV.TWITCH_CLIENT_SECRET = '';

    expect(adapter.searchGames('portal')).rejects.toBeInstanceOf(IgdbApiError);

    ENV.TWITCH_CLIENT_ID = origId;
    ENV.TWITCH_CLIENT_SECRET = origSecret;
  });

  it('should throw an IgdbApiError if credentials are missing on getPopularGames', async () => {
    const origId = ENV.TWITCH_CLIENT_ID;
    const origSecret = ENV.TWITCH_CLIENT_SECRET;
    ENV.TWITCH_CLIENT_ID = '';
    ENV.TWITCH_CLIENT_SECRET = '';

    expect(adapter.getPopularGames(10)).rejects.toBeInstanceOf(IgdbApiError);

    ENV.TWITCH_CLIENT_ID = origId;
    ENV.TWITCH_CLIENT_SECRET = origSecret;
  });
});
