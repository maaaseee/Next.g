/**
 * Security Headers Middleware for ElysiaJS.
 * 
 * Injects OWASP defense-in-depth headers on all API responses.
 */

import { Elysia } from 'elysia';

export const securityHeaders = new Elysia({ name: 'security-headers' })
  .onRequest(({ request, set }) => {
    // 1. Prevent MIME-sniffing
    set.headers['X-Content-Type-Options'] = 'nosniff';

    // 2. Prevent clickjacking / embedding
    set.headers['X-Frame-Options'] = 'DENY';

    // 3. Enable browser XSS filtering
    set.headers['X-XSS-Protection'] = '1; mode=block';

    // 4. Control referrer information leakage
    set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';

    // 5. Restrict dangerous browser features
    set.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()';

    // 6. Content-Security-Policy: strict for API endpoints, permissive for interactive Swagger UI docs
    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith('/docs')) {
      set.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:;";
    } else {
      set.headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none';";
    }
  });
