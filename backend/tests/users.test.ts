import { describe, it, expect, beforeAll } from 'bun:test';
import { app } from '../src/index';

describe('Users & Avatar Management Suite', () => {
  let authToken = '';
  let userId = '';
  const testEmail = `user_avatar_test_${Date.now()}@example.com`;

  beforeAll(async () => {
    // 1. Register a user to obtain a valid Bearer JWT
    const registerRes = await app.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'Password123!',
          name: 'Avatar Tester',
        }),
      })
    );

    const data = await registerRes.json();
    authToken = data.token;
    userId = data.user.id;
  });

  it('GET /api/users/me should return current user profile with token', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/users/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.id).toBe(userId);
    expect(data.user.email).toBeUndefined();
  });

  it('GET /api/users/me should reject request without token (401 Unauthorized)', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/users/me')
    );
    expect(res.status).toBe(401);
  });

  const updatedGamertag = `Gamertag_${Date.now()}`;

  it('PATCH /api/users/me should update profile display name', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/users/me', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: updatedGamertag }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.name).toBe(updatedGamertag);
  });

  it('PUT /api/users/me/avatar should accept image upload and return avatar URL', async () => {
    // Generate a minimal 1x1 transparent PNG blob for testing
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const binary = Buffer.from(pngBase64, 'base64');
    const formData = new FormData();
    formData.append('file', new Blob([binary], { type: 'image/png' }), 'test-avatar.png');

    const res = await app.handle(
      new Request('http://localhost:3000/api/users/me/avatar', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.avatar_url).toBeDefined();
    expect(typeof data.avatar_url).toBe('string');
  });

  it('DELETE /api/users/me/avatar should remove avatar URL', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/users/me/avatar', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify avatar_url is now null in profile
    const profileRes = await app.handle(
      new Request('http://localhost:3000/api/users/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
    );
    const profileData = await profileRes.json();
    expect(profileData.user.avatar_url).toBeNull();
  });

  it('GET /api/users/:nickname should return public user profile by nickname', async () => {
    const res = await app.handle(
      new Request(`http://localhost:3000/api/users/${encodeURIComponent(updatedGamertag)}`)
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.name).toBe(updatedGamertag);
    expect(Array.isArray(data.games)).toBe(true);
  });
});
