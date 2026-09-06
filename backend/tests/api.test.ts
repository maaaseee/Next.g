/**
 * Integration Tests for Elysia API Endpoints.
 * 
 * Source: Elysia Unit Testing documentation
 * https://elysiajs.com/patterns/unit-test.html
 */

import { describe, it, expect } from 'bun:test';
import { app } from '../src/index';

describe('Elysia API Integration', () => {
  it('GET /health should return 200 OK and service status', async () => {
    const response = await app.handle(
      new Request('http://localhost:3000/health')
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('nextg-backend');
  });

  it('GET /api/search should return matching games from offline seed database', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/search?q=cyberpunk')
    );

    expect(res.status).toBe(200);
    const results = await res.json();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toBe('Cyberpunk 2077');
    expect(results[0].rating).toBeDefined();
  });

  it('POST /api/games and GET /api/games should store and retrieve rich metadata', async () => {
    // 1. Add game to catalog
    const postRes = await app.handle(
      new Request('http://localhost:3000/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 5001,
          title: 'Hollow Knight',
          cover_url: 'https://example.com/hk.jpg',
          release_year: 2017,
          summary: 'Explore a vast ruined kingdom.',
          genres: ['Metroidvania', 'Indie'],
          platforms: ['PC', 'Nintendo Switch'],
          rating: 92.0,
          game_modes: ['Single player'],
          status: 'BACKLOG',
        }),
      })
    );

    expect(postRes.status).toBe(200);
    const saved = await postRes.json();
    expect(saved.id).toBe(5001);
    expect(saved.genres).toContain('Metroidvania');
    expect(saved.status).toBe('BACKLOG');

    // 2. Fetch catalog filtered by status
    const getRes = await app.handle(
      new Request('http://localhost:3000/api/games?status=BACKLOG')
    );
    expect(getRes.status).toBe(200);
    const games = await getRes.json();
    expect(Array.isArray(games)).toBe(true);
    const found = games.find((g: any) => g.id === 5001);
    expect(found).toBeDefined();

    // 3. Delete game
    const delRes = await app.handle(
      new Request('http://localhost:3000/api/games/5001', {
        method: 'DELETE',
      })
    );
    expect(delRes.status).toBe(200);
  });
});
