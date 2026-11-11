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
    expect(results.some((r: { title: string }) => r.title.includes('Cyberpunk'))).toBe(true);
    expect(results[0].rating).toBeDefined();
  }, { timeout: 15000 });

  it('GET /api/search/details/:id should return full game details', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/search/details/119171')
    );

    expect(res.status).toBe(200);
    const details = await res.json();
    expect(details.id).toBe(119171);
    expect(details.title).toBeDefined();
  }, { timeout: 15000 });

  it('POST /api/games and GET /api/games should store and retrieve rich metadata', async () => {
    // 0. Register a user to get an auth token
    const regRes = await app.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Gamer API Tester',
          email: `api_test_${Date.now()}@nextg.test`,
          password: 'Password123!',
        }),
      })
    );
    expect(regRes.status).toBe(201);
    const { token, user } = await regRes.json();

    // 1. Add game to catalog
    const postRes = await app.handle(
      new Request('http://localhost:3000/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      new Request('http://localhost:3000/api/games?status=BACKLOG', {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(getRes.status).toBe(200);
    const games = await getRes.json();
    expect(Array.isArray(games)).toBe(true);
    const found = games.find((g: { id: number }) => g.id === 5001);
    expect(found).toBeDefined();

    // 3. Delete game
    const delRes = await app.handle(
      new Request('http://localhost:3000/api/games/5001', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(delRes.status).toBe(200);

    // 4. Test public user profile API
    const userRes = await app.handle(new Request(`http://localhost:3000/api/users/${user.id}`));
    expect(userRes.status).toBe(200);
    const profile = await userRes.json();
    expect(profile.user.id).toBe(user.id);
    expect(profile.user.name).toBe('Gamer API Tester');
  });

  it('GET /docs/json should generate valid OpenAPI 3.0 specification from TypeBox schemas', async () => {
    const res = await app.handle(new Request('http://localhost:3000/docs/json'));
    expect(res.status).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toBe('NEXT.g Game Backlog API');
    expect(spec.paths['/health']).toBeDefined();
    expect(spec.paths['/api/games/']).toBeDefined();
    expect(spec.paths['/api/auth/register']).toBeDefined();
    expect(spec.paths['/api/search/']).toBeDefined();
  });
});
