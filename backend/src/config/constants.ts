/**
 * Constants and external service endpoints for NEXT.g Backend.
 * 
 * Sources:
 * - IGDB API v4 Documentation: https://api-docs.igdb.com/
 * - Twitch OAuth2 Token Endpoint: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow
 */

export const CONSTANTS = {
  // Twitch OAuth2 Authentication
  TWITCH_OAUTH_URL: 'https://id.twitch.tv/oauth2/token',

  // IGDB API v4 Endpoints
  IGDB_API_BASE_URL: 'https://api.igdb.com/v4',
  IGDB_GAMES_URL: 'https://api.igdb.com/v4/games',
  IGDB_IMAGE_BASE_URL: 'https://images.igdb.com/igdb/image/upload',
  IGDB_DEFAULT_COVER_SIZE: 't_cover_big',
  IGDB_HD_COVER_SIZE: 't_1080p',

  // Margin of safety before token expiry (60 seconds)
  TOKEN_EXPIRY_BUFFER_MS: 60 * 1000,
  
  // Default search limit for games
  DEFAULT_SEARCH_LIMIT: 20,

  // Persistent PostgreSQL search cache TTL: 45 days (30 to 60 days recommended)
  SEARCH_CACHE_TTL_MS: 45 * 24 * 60 * 60 * 1000,
} as const;
