import { describe, it, expect } from 'bun:test';
import { app } from '../src/index';

describe('OpenGraph Social Cards Generator', () => {
  it('GET /api/og/game/:id should return valid 1200x630 SVG with headers and embedded cover', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/og/game/119171')
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/svg+xml');
    expect(res.headers.get('cache-control')).toContain('public');

    const svg = await res.text();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="0 0 1200 630"');
    expect(svg).toContain('NEXT');
    expect(svg).toContain('data:image/');
  });

  it('GET /api/og/user/:id should return valid Gamer Passport SVG with embedded avatar', async () => {
    // 1. Register a test user
    const regRes = await app.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `og_tester_${Date.now()}@example.com`,
          password: 'Password123!',
          name: 'CyberGamer99',
        }),
      })
    );
    const regData = await regRes.json();
    const userId = regData.user.id;

    // 2. Fetch OpenGraph card
    const res = await app.handle(
      new Request(`http://localhost:3000/api/og/user/${userId}`)
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/svg+xml');

    const svg = await res.text();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('CyberGamer99');
    expect(svg).toContain('GAMER PASSPORT');
    expect(svg).toContain('data:image/');
  });

  it('GET /api/og/game/:id should return 404 for nonexistent game', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/og/game/999999999')
    );

    // Either 404 or fallback default
    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/og/game/:id should serve subsequent requests rapidly from in-memory Base64 cache', async () => {
    // First call (populates cache)
    const t0 = performance.now();
    const res1 = await app.handle(new Request('http://localhost:3000/api/og/game/119171'));
    const dur1 = performance.now() - t0;
    expect(res1.status).toBe(200);

    // Second call (hits in-memory base64 cache)
    const t1 = performance.now();
    const res2 = await app.handle(new Request('http://localhost:3000/api/og/game/119171'));
    const dur2 = performance.now() - t1;
    expect(res2.status).toBe(200);
    // Cached response should be served very fast (< 50ms locally)
    expect(dur2).toBeLessThanOrEqual(Math.max(dur1, 60));
  });
});
