/**
 * Twitch OAuth2 Authentication Service with in-memory caching.
 * 
 * Source: Twitch OAuth2 Client Credentials Grant Flow Documentation
 * https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow
 */

import { ENV } from '../config/env';
import { CONSTANTS } from '../config/constants';

export interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class TwitchAuthService {
  private static cachedToken: string | null = null;
  private static expiresAt: number = 0;

  /**
   * Retrieves a valid Twitch OAuth2 access token, reusing the cached token if not expired.
   */
  public static async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (
      this.cachedToken &&
      now < this.expiresAt - CONSTANTS.TOKEN_EXPIRY_BUFFER_MS
    ) {
      return this.cachedToken;
    }

    if (!ENV.TWITCH_CLIENT_ID || !ENV.TWITCH_CLIENT_SECRET) {
      throw new Error(
        'Missing Twitch credentials. Please set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in your .env file.'
      );
    }

    const params = new URLSearchParams({
      client_id: ENV.TWITCH_CLIENT_ID,
      client_secret: ENV.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    });

    const response = await fetch(`${CONSTANTS.TWITCH_OAUTH_URL}?${params.toString()}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to obtain Twitch OAuth token: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as TwitchTokenResponse;
    this.cachedToken = data.access_token;
    this.expiresAt = now + data.expires_in * 1000;

    return this.cachedToken;
  }

  /**
   * Clears the in-memory cached token (useful for testing or error recovery).
   */
  public static clearCache(): void {
    this.cachedToken = null;
    this.expiresAt = 0;
  }
}
