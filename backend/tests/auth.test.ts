/**
 * Integration and Unit Tests for Authentication and Onboarding.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../src/index';
import { initDatabase, type SqlClient } from '../src/db/index';

describe('Auth & Onboarding Endpoints', () => {
  let sql: SqlClient;
  const testEmail = `test_${Date.now()}@nextg.test`;
  const testPassword = 'Password123!';
  const testName = 'Gamer Tester';
  let authToken = '';

  beforeEach(async () => {
    sql = await initDatabase();
  });

  it('should register a new user successfully', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: testName,
          email: testEmail,
          password: testPassword,
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBeUndefined();
    expect(body.user.name).toBe(testName);
    expect(body.user.onboarded).toBe(false);

    authToken = body.token;
  });

  it('should reject registration with duplicate email (409 Conflict)', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Another Name',
          email: testEmail,
          password: testPassword,
        }),
      })
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('RegistrationError');
  });

  it('should reject registration if password is shorter than 8 characters', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Short Pass User',
          email: `short_${Date.now()}@nextg.test`,
          password: 'Pass1',
        }),
      })
    );

    expect(res.status >= 400 && res.status < 500).toBe(true);
  });

  it('should reject registration if password has no uppercase letter', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'No Upper User',
          email: `noupper_${Date.now()}@nextg.test`,
          password: 'password123',
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('mayúscula');
  });

  it('should reject registration if password has no number', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'No Digit User',
          email: `nodigit_${Date.now()}@nextg.test`,
          password: 'PasswordWithoutDigit',
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('número');
  });

  it('should register successfully with password containing "ñ" and "Ñ"', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Eñe User',
          email: `ene_${Date.now()}@nextg.test`,
          password: 'Contraseña99!',
        }),
      })
    );

    expect(res.status).toBe(201);
  });

  it('should login an existing user with correct credentials', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.user.email).toBeUndefined();
    const setCookieHeader = res.headers.get('set-cookie');
    expect(setCookieHeader).toContain('nextg_token=');
    expect(setCookieHeader?.toLowerCase()).toContain('httponly');
    authToken = body.token;
  });

  it('should return user profile on GET /api/auth/me with HttpOnly Cookie', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/me', {
        headers: {
          Cookie: `nextg_token=${authToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBeUndefined();
  });

  it('should reject login with wrong password (401 Unauthorized)', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword999!',
        }),
      })
    );

    expect(res.status).toBe(401);
  });

  it('should return user profile on GET /api/auth/me with Bearer token', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBeUndefined();
    expect(body.user.name).toBe(testName);
    expect(body.user.onboarded).toBe(false);
  });

  it('should reject GET /api/auth/me without token (401 Unauthorized)', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/auth/me'));
    expect(res.status).toBe(401);
  });

  it('should reject onboarding if fewer than 3 games are provided', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          games: [
            { id: 101, title: 'Game 1', status: 'PLAYING' },
            { id: 102, title: 'Game 2', status: 'PLAYING' },
          ],
        }),
      })
    );

    expect(res.status).toBe(400);
  });

  it('should complete Netflix-style onboarding with 3 games and set onboarded = true', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          games: [
            { id: 801, title: 'Chrono Trigger', genres: ['RPG'], status: 'PLAYING' },
            { id: 802, title: 'Hollow Knight', genres: ['Metroidvania'], status: 'PLAYING' },
            { id: 803, title: 'Super Mario Odyssey', genres: ['Platformer'], status: 'PLAYING' },
          ],
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.onboarded).toBe(true);

    // Verify games are in user's library
    const libraryRes = await app.handle(
      new Request('http://localhost:3000/api/games', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
    );
    expect(libraryRes.status).toBe(200);
    const userLibrary = await libraryRes.json();
    expect(userLibrary.length).toBeGreaterThanOrEqual(3);
    expect(userLibrary.some((g: { id: number }) => g.id === 801)).toBe(true);
    expect(userLibrary.some((g: { id: number }) => g.id === 802)).toBe(true);
    expect(userLibrary.some((g: { id: number }) => g.id === 803)).toBe(true);
  });

  it('should invalidate active token after POST /api/auth/logout', async () => {
    // 1. Verify token works currently
    const beforeRes = await app.handle(
      new Request('http://localhost:3000/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );
    expect(beforeRes.status).toBe(200);

    // 2. Call logout endpoint
    const logoutRes = await app.handle(
      new Request('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );
    expect(logoutRes.status).toBe(200);
    const logoutBody = await logoutRes.json();
    expect(logoutBody.success).toBe(true);

    // 3. Old token should now be rejected across all protected endpoints
    const afterRes = await app.handle(
      new Request('http://localhost:3000/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );
    expect(afterRes.status).toBe(401);

    // 4. Logging in again issues a new token with updated token_version
    const loginRes = await app.handle(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      })
    );
    expect(loginRes.status).toBe(200);
    const newBody = await loginRes.json();
    const newToken = newBody.token;

    const newMeRes = await app.handle(
      new Request('http://localhost:3000/api/auth/me', {
        headers: { Authorization: `Bearer ${newToken}` },
      })
    );
    expect(newMeRes.status).toBe(200);
  });
});
