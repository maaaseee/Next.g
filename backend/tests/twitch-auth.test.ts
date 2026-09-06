/**
 * Unit Tests for Twitch OAuth2 Service.
 * 
 * Source: Bun Test & Mock documentation
 * https://bun.sh/docs/cli/test#mocking
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { TwitchAuthService } from '../src/services/twitch-auth.service';
import { ENV } from '../src/config/env';

describe('TwitchAuthService', () => {
  beforeEach(() => {
    TwitchAuthService.clearCache();
    ENV.TWITCH_CLIENT_ID = 'test_client_id';
    ENV.TWITCH_CLIENT_SECRET = 'test_client_secret';
  });

  it('should throw an error if credentials are missing', async () => {
    ENV.TWITCH_CLIENT_ID = '';
    ENV.TWITCH_CLIENT_SECRET = '';

    expect(TwitchAuthService.getAccessToken()).rejects.toThrow(
      /Missing Twitch credentials/
    );
  });
});
