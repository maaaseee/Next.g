/**
 * Constants and external service endpoints for NEXT.g Backend.
 * 
 * Sources:
 * - IGDB API v4 Documentation: https://api-docs.igdb.com/
 * - Twitch OAuth2 Token Endpoint: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow
 */

export const CONSTANTS = {
  // RAWG Video Games Database API
  // Source: https://rawg.io/apidocs
  RAWG_API_URL: 'https://api.rawg.io/api/games',

  // Legacy IGDB / Twitch endpoints (fallback support)
  TWITCH_OAUTH_URL: 'https://id.twitch.tv/oauth2/token',
  IGDB_API_URL: 'https://api.igdb.com/v4/games',
  IGDB_IMAGE_BASE_URL: 'https://images.igdb.com/igdb/image/upload',
  IGDB_DEFAULT_COVER_SIZE: 't_cover_big',

  // Margin of safety before token expiry (60 seconds)
  TOKEN_EXPIRY_BUFFER_MS: 60 * 1000,
  
  // Default search limit for games
  DEFAULT_SEARCH_LIMIT: 20,

  // Persistent SQLite search cache TTL: 45 days (30 to 60 days recommended)
  SEARCH_CACHE_TTL_MS: 45 * 24 * 60 * 60 * 1000,
} as const;
