/**
 * Security, Hardening and Rate Limiting Test Suite.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../src/index';
import { globalRateLimitStore } from '../src/middleware/rate-limiter';
import { SearchCacheService } from '../src/services/search-cache.service';

describe('Security & Hardening Suite', () => {
  beforeEach(() => {
    globalRateLimitStore.reset();
    SearchCacheService.clear();
  });

  it('should include OWASP security headers in all API responses', async () => {
    const res = await app.handle(new Request('http://localhost:3000/health'));
    expect(res.status).toBe(200);

    const headers = res.headers;
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('x-frame-options')).toBe('DENY');
    expect(headers.get('x-xss-protection')).toBe('1; mode=block');
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('permissions-policy')).toBeDefined();
  });

  it('should include rate limit telemetry headers', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/games', {
        headers: { 'x-forwarded-for': '203.0.113.1' },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('x-ratelimit-limit')).toBeDefined();
    expect(res.headers.get('x-ratelimit-remaining')).toBeDefined();
    expect(res.headers.get('x-ratelimit-reset')).toBeDefined();
  });

  it('should block bot request floods on search with HTTP 429 Too Many Requests', async () => {
    const testIp = '198.51.100.55';

    // Send 10 allowed search queries (max 10 req/min limit)
    for (let i = 0; i < 10; i++) {
      const okRes = await app.handle(
        new Request(`http://localhost:3000/api/search?q=test${i}`, {
          headers: { 'x-forwarded-for': testIp },
        })
      );
      expect(okRes.status).toBe(200);
    }

    // The 11th request must be blocked
    const blockedRes = await app.handle(
      new Request('http://localhost:3000/api/search?q=flood', {
        headers: { 'x-forwarded-for': testIp },
      })
    );

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get('retry-after')).toBeDefined();

    const body = await blockedRes.json();
    expect(body.error).toBe('Too Many Requests');
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('should serve repeated searches from SearchCacheService', async () => {
    expect(SearchCacheService.size()).toBe(0);

    // First search: caches results
    const res1 = await app.handle(new Request('http://localhost:3000/api/search?q=cyberpunk'));
    expect(res1.status).toBe(200);
    expect(SearchCacheService.size()).toBe(1);

    // Second search: served from cache
    const res2 = await app.handle(new Request('http://localhost:3000/api/search?q=cyberpunk'));
    expect(res2.status).toBe(200);
    const data = await res2.json();
    expect(data[0].title).toBe('Cyberpunk 2077');
  });

  it('should reject oversized or malicious search queries (length > 80 chars)', async () => {
    const oversizedQuery = 'a'.repeat(120);
    const res = await app.handle(new Request(`http://localhost:3000/api/search?q=${oversizedQuery}`));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('should reject malformed or oversized payload in POST /api/games', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: -99, // Invalid ID
          title: '', // Empty title
          status: 'INVALID_STATUS', // Invalid status enum
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });
});
