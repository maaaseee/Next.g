import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../stores/authStore';

describe('useAuthStore (Cookie-based Auth)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('initializes with unauthenticated state', () => {
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(auth.token).toBeNull();
    expect(auth.authHeader).toEqual({});
  });

  it('manages onboarding modal open/close states', () => {
    const auth = useAuthStore();

    expect(auth.isOnboardingModalOpen).toBe(false);
    auth.openOnboardingModal();
    expect(auth.isOnboardingModalOpen).toBe(true);
    auth.closeOnboardingModal();
    expect(auth.isOnboardingModalOpen).toBe(false);
  });

  it('does not expose JWT tokens in authHeader (relies on HttpOnly cookies)', () => {
    const auth = useAuthStore();
    auth.token = 'mock-jwt-token-123';
    expect(auth.authHeader).toEqual({});
  });

  it('clears state on logout', async () => {
    const auth = useAuthStore();
    auth.isLocalOfflineMode = true;
    auth.user = {
      id: 'user-1',
      name: 'Mario',
      email: 'mario@mushroom.kingdom',
      avatar_url: null,
      provider: 'local',
      onboarded: true,
    };

    expect(auth.isAuthenticated).toBe(true);

    await auth.logout(false);

    expect(auth.isAuthenticated).toBe(false);
    expect(auth.token).toBeNull();
    expect(auth.user).toBeNull();
    expect(localStorage.getItem('nextg_auth_token')).toBeNull();
  });
});
