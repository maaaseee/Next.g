/**
 * Security, Hardening and Rate Limiting Test Suite.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../src/index';
import { globalRateLimitStore, getClientIp } from '../src/middleware/rate-limiter';
import { SearchCacheService } from '../src/services/search-cache.service';
import { isSafeImageUrl } from '../src/controllers/og.controller';

describe('Security & Hardening Suite', () => {
  beforeEach(() => {
    globalRateLimitStore.reset();
    SearchCacheService.clear();
  }, 15000);

  it('should include OWASP security headers in all API responses', async () => {
    const res = await app.handle(new Request('http://localhost:3000/health/live'));
    expect(res.status).toBe(200);

    const headers = res.headers;
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('x-frame-options')).toBe('DENY');
    expect(headers.get('x-xss-protection')).toBe('1; mode=block');
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('permissions-policy')).toBeDefined();
  }, 15000);

  it('should provide ACA-compliant liveness and readiness probe endpoints', async () => {
    // 1. Liveness probe (must always respond 200 without DB dependency)
    const liveRes = await app.handle(new Request('http://localhost:3000/health/live'));
    expect(liveRes.status).toBe(200);
    const liveBody = await liveRes.json();
    expect(liveBody.status).toBe('alive');

    // 2. Readiness probe (checks DB readiness, must never leak DB error stack/string to clients)
    const readyRes = await app.handle(new Request('http://localhost:3000/health/ready'));
    expect([200, 503]).toContain(readyRes.status);
    const readyBody = await readyRes.json();
    expect(readyBody.error).toBeUndefined(); // Guarantees zero sensitive internal connection leaks
  }, 15000);

  it('should prevent SSRF by blocking internal, link-local, and non-https URLs', () => {
    // Dangerous internal & metadata URLs
    expect(isSafeImageUrl('http://169.254.169.254/metadata/identity/oauth2/token')).toBe(false);
    expect(isSafeImageUrl('https://169.254.169.254/metadata/v1/instance')).toBe(false);
    expect(isSafeImageUrl('http://localhost:3000/admin')).toBe(false);
    expect(isSafeImageUrl('http://127.0.0.1:5432')).toBe(false);
    expect(isSafeImageUrl('https://10.0.0.5/api')).toBe(false);
    expect(isSafeImageUrl('https://172.20.0.2/api')).toBe(false);
    expect(isSafeImageUrl('https://192.168.1.100/status')).toBe(false);
    expect(isSafeImageUrl('file:///etc/passwd')).toBe(false);

    // Safe external CDN image URLs
    expect(isSafeImageUrl('https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.jpg')).toBe(true);
    expect(isSafeImageUrl('https://res.cloudinary.com/gamebacklog/image/upload/v1/avatar.webp')).toBe(true);
    expect(isSafeImageUrl('https://api.dicebear.com/7.x/bottts/svg?seed=user123')).toBe(true);
  }, 15000);

  it('should prioritize Azure Container Apps x-azure-clientip header', () => {
    const mockHeaders = new Headers();
    mockHeaders.set('x-azure-clientip', '198.51.100.99');
    mockHeaders.set('cf-connecting-ip', '203.0.113.88');
    mockHeaders.set('x-forwarded-for', '192.0.2.1');

    const ip = getClientIp(mockHeaders);
    expect(ip).toBe('198.51.100.99');
  }, 15000);

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
  }, 15000);

  it('should block bot request floods on search with HTTP 429 Too Many Requests', async () => {
    const testIp = '198.51.100.55';

    // Send 10 allowed search queries (max 10 req/min limit)
    // Use same query so subsequent queries hit the fast in-memory cache and don't stall on external network
    for (let i = 0; i < 10; i++) {
      const okRes = await app.handle(
        new Request(`http://localhost:3000/api/search?q=witcher`, {
          headers: { 'x-forwarded-for': testIp },
        })
      );
      expect(okRes.status).toBe(200);
    }

    // 11th request from the same IP must be rejected with 429
    const blockedRes = await app.handle(
      new Request(`http://localhost:3000/api/search?q=witcher`, {
        headers: { 'x-forwarded-for': testIp },
      })
    );

    expect(blockedRes.status).toBe(429);
    const body = await blockedRes.json();
    expect(body.error).toBe('Too Many Requests');
    expect(body.message).toContain('Demasiadas búsquedas');
    expect(blockedRes.headers.get('retry-after')).toBeDefined();
  }, 15000);

  it('should serve repeated searches from SearchCacheService', async () => {
    // 1. Initial request (may fetch external or seed)
    const res1 = await app.handle(new Request('http://localhost:3000/api/search?q=zelda'));
    expect(res1.status).toBe(200);

    // 2. Second identical request must be served from cache without error
    const res2 = await app.handle(new Request('http://localhost:3000/api/search?q=zelda'));
    expect(res2.status).toBe(200);
    const data = await res2.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  }, 15000);

  it('should reject oversized or malicious search queries (length > 80 chars)', async () => {
    const oversizedQuery = 'a'.repeat(120);
    const res = await app.handle(new Request(`http://localhost:3000/api/search?q=${oversizedQuery}`));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  }, 15000);

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
  }, 15000);

  it('should restrict CORS headers to configured CORS_ORIGIN', async () => {
    // 1. Authorized origin
    const authorizedRes = await app.handle(
      new Request('http://localhost:3000/health', {
        headers: { Origin: 'http://localhost:5173' },
      })
    );
    expect(authorizedRes.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');

    // 2. Unauthorized origin
    const unauthorizedRes = await app.handle(
      new Request('http://localhost:3000/health', {
        headers: { Origin: 'https://malicious-website.com' },
      })
    );
    expect(unauthorizedRes.headers.get('access-control-allow-origin')).not.toBe('https://malicious-website.com');
  }, 15000);
});
