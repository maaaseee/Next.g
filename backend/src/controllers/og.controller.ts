/**
 * Controller for Dynamic OpenGraph Image Generation (Gamer Passport & Game Showcase Cards).
 * 
 * Features:
 * - Standalone, self-contained 1200x630 vector graphic cards (SVG).
 * - Base64 Data URI image embedding: ensures external avatars & covers render 100% reliably
 *   in Discord, WhatsApp, Twitter/X, and Telegram (avoiding browser subresource blocking).
 * - Cyberpunk / Neo-glassmorphism gaming design with ambient glow, stat grids, and badges.
 */

import { Elysia, t } from 'elysia';
import { getDatabase } from '../db/index';
import { GameSearchService } from '../services/game-search.service';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

const DEFAULT_AVATAR_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
  <defs>
    <linearGradient id="avGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  <rect width="220" height="220" fill="url(#avGrad)" />
  <circle cx="110" cy="85" r="42" fill="#E0E7FF" fill-opacity="0.9" />
  <path d="M44 185 C44 140 176 140 176 185 Z" fill="#C7D2FE" fill-opacity="0.9" />
</svg>
`.trim());

const DEFAULT_COVER_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">
  <rect width="360" height="480" fill="#0F172A" />
  <rect x="15" y="15" width="330" height="450" rx="18" fill="#1E293B" stroke="#334155" stroke-width="2" />
  <circle cx="180" cy="220" r="55" fill="#6366F1" fill-opacity="0.15" />
  <path d="M150 220 L210 220 M180 190 L180 250" stroke="#818CF8" stroke-width="8" stroke-linecap="round" />
  <text x="180" y="320" font-family="sans-serif" font-size="16" font-weight="800" fill="#94A3B8" text-anchor="middle" letter-spacing="2">NEXT.g GAME</text>
</svg>
`.trim());

// In-memory cache for remote image Base64 data URIs to eliminate duplicate outbound downloads
interface ImageCacheEntry {
  data: string;
  expires: number;
}
const base64Cache = new Map<string, ImageCacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours TTL
const MAX_CACHE_SIZE = 500; // Cap memory consumption on serverless/ACA container

/**
 * Validates URLs against SSRF (Server-Side Request Forgery) attacks.
 * Blocks private networks, Azure IMDS metadata service, loopback, and non-HTTPS protocols.
 */
export function isSafeImageUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // 1. Prohibit loopback, local domains, cloud metadata endpoints
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '169.254.169.254' ||
      host === 'metadata.azure.com'
    ) {
      return false;
    }

    // 2. Prohibit private IPv4 & link-local ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = host.match(ipv4Regex);
    if (ipMatch) {
      const b1 = Number(ipMatch[1]);
      const b2 = Number(ipMatch[2]);
      if (b1 === 0 || b1 === 10 || b1 === 127) return false;
      if (b1 === 172 && b2 >= 16 && b2 <= 31) return false;
      if (b1 === 192 && b2 === 168) return false;
      if (b1 === 169 && b2 === 254) return false;
    }

    // 3. Prohibit IPv6 brackets / addresses
    if (host.startsWith('[') || host.includes(':')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Downloads a remote image and encodes it as a base64 Data-URI with in-memory caching and SSRF protection.
 * Resolves the issue where SVGs loaded as images refuse external subresources.
 */
async function fetchImageAsDataUri(url: string | null | undefined, fallback: string): Promise<string> {
  if (!url || !isSafeImageUrl(url)) return fallback;

  const now = Date.now();
  const cached = base64Cache.get(url);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return fallback;

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    // Strict MIME check: only allow images (blocks internal JSON/text metadata leakage)
    if (!contentType.startsWith('image/')) {
      return fallback;
    }

    const contentLength = Number(res.headers.get('content-length') || 0);
    if (contentLength > 5 * 1024 * 1024) {
      return fallback; // Reject images > 5MB to avoid memory exhaustion
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const dataUri = `data:${contentType};base64,${buffer.toString('base64')}`;

    // Manage LRU cache size limit
    if (base64Cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = base64Cache.keys().next().value;
      if (oldestKey) base64Cache.delete(oldestKey);
    }
    base64Cache.set(url, { data: dataUri, expires: now + CACHE_TTL_MS });

    return dataUri;
  } catch {
    return fallback;
  }
}

export const ogController = new Elysia({ prefix: '/api/og' })
  // GET /api/og/game/:id - Dynamic OpenGraph Social Image for Game Detail (Supports ID or Slug)
  .get(
    '/game/:id',
    async ({ params: { id }, set }) => {
      // 1. Fetch game from local DB, cache, or IGDB (by ID or Slug)
      const game = await GameSearchService.getGameDetails(id);
      if (!game) {
        set.status = 404;
        return '<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#0F172A"/><text x="50%" y="50%" fill="#fff" font-family="sans-serif" font-size="24" text-anchor="middle">Juego no encontrado</text></svg>';
      }

      const title = escapeXml(game.title);
      const year = game.release_year ? String(game.release_year) : '2026';
      const rating = game.rating ? `${Math.round(Number(game.rating))}%` : '85%';
      
      let genresList: string[] = [];
      if (game?.genres) {
        if (Array.isArray(game.genres)) genresList = game.genres.map(String);
        else if (typeof game.genres === 'string') {
          try {
            const parsed = JSON.parse(game.genres);
            genresList = Array.isArray(parsed) ? parsed : [String(game.genres)];
          } catch {
            genresList = [game.genres];
          }
        }
      }
      const topGenres = genresList.slice(0, 3).map(escapeXml);

      // 2. Embed cover art as Base64 Data URI for guaranteed display
      const coverDataUri = await fetchImageAsDataUri(game?.cover_url, DEFAULT_COVER_DATA_URI);

      const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080C14" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>

    <radialGradient id="neonGlowLeft" cx="15%" cy="20%" r="55%">
      <stop offset="0%" stop-color="#6366F1" stop-opacity="0.32" />
      <stop offset="100%" stop-color="#6366F1" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="neonGlowRight" cx="85%" cy="80%" r="60%">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#10B981" stop-opacity="0" />
    </radialGradient>

    <!-- Cyber Grid Pattern -->
    <pattern id="cyberGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFFFFF" stroke-opacity="0.03" stroke-width="1" />
    </pattern>

    <clipPath id="gameCoverClip">
      <rect x="760" y="75" width="360" height="480" rx="24" />
    </clipPath>
  </defs>

  <!-- Canvas Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />
  <rect width="1200" height="630" fill="url(#cyberGrid)" />
  <rect width="1200" height="630" fill="url(#neonGlowLeft)" />
  <rect width="1200" height="630" fill="url(#neonGlowRight)" />

  <!-- Outer Cyber Frame -->
  <rect x="20" y="20" width="1160" height="590" rx="24" fill="none" stroke="#6366F1" stroke-opacity="0.25" stroke-width="2" />
  
  <!-- Tech Corner Markers -->
  <path d="M 18 45 L 18 18 L 45 18" fill="none" stroke="#818CF8" stroke-width="4" />
  <path d="M 1155 18 L 1182 18 L 1182 45" fill="none" stroke="#818CF8" stroke-width="4" />
  <path d="M 18 585 L 18 612 L 45 612" fill="none" stroke="#818CF8" stroke-width="4" />
  <path d="M 1155 612 L 1182 612 L 1182 585" fill="none" stroke="#818CF8" stroke-width="4" />

  <!-- Brand Banner -->
  <g transform="translate(70, 65)">
    <rect width="48" height="48" rx="14" fill="#6366F1" />
    <path d="M14 24 L24 14 L34 24 L24 34 Z" fill="#FFFFFF" />
    <text x="64" y="34" font-family="'Plus Jakarta Sans', sans-serif" font-size="30" font-weight="900" fill="#FFFFFF" letter-spacing="1">NEXT<tspan fill="#818CF8">.g</tspan></text>
    <rect x="185" y="14" width="140" height="24" rx="6" fill="#1E293B" stroke="#334155" stroke-width="1" />
    <text x="255" y="30" font-family="sans-serif" font-size="11" font-weight="800" fill="#94A3B8" text-anchor="middle" letter-spacing="2">GAME SHOWCASE</text>
  </g>

  <!-- Left Content Column -->
  <g transform="translate(70, 160)">
    <!-- Badges Row -->
    <g transform="translate(0, 0)">
      <!-- Year Badge -->
      <rect x="0" y="0" width="90" height="36" rx="10" fill="#1E293B" stroke="#475569" stroke-width="1.5" />
      <text x="45" y="23" font-family="sans-serif" font-size="15" font-weight="800" fill="#F1F5F9" text-anchor="middle">${year}</text>

      <!-- Rating Badge with Star -->
      <rect x="105" y="0" width="125" height="36" rx="10" fill="#064E3B" stroke="#10B981" stroke-width="1.5" />
      <text x="167" y="23" font-family="sans-serif" font-size="15" font-weight="800" fill="#34D399" text-anchor="middle">★ ${rating} SCORE</text>
    </g>

    <!-- Big Title -->
    <text x="0" y="100" font-family="'Space Grotesk', sans-serif" font-size="52" font-weight="900" fill="#F8FAFC" letter-spacing="-1">
      ${title.length > 22 ? title.slice(0, 20) + '...' : title}
    </text>

    <!-- Genre Pills -->
    <g transform="translate(0, 145)">
      ${topGenres
        .map(
          (genre, i) => `
        <g transform="translate(${i * 135}, 0)">
          <rect width="125" height="34" rx="17" fill="#6366F1" fill-opacity="0.18" stroke="#818CF8" stroke-width="1.5" />
          <text x="62" y="22" font-family="sans-serif" font-size="13" font-weight="700" fill="#C7D2FE" text-anchor="middle">${genre}</text>
        </g>`
        )
        .join('')}
    </g>

    <!-- Glass Information Card -->
    <g transform="translate(0, 215)">
      <rect width="630" height="120" rx="16" fill="#1E293B" fill-opacity="0.6" stroke="#334155" stroke-width="1.5" />
      <text x="24" y="42" font-family="sans-serif" font-size="17" font-weight="700" fill="#E2E8F0">¿Listo para comenzar esta aventura?</text>
      <text x="24" y="72" font-family="sans-serif" font-size="14" font-weight="500" fill="#94A3B8">Agrégalo a tu Backlog personal y sortéalo con la ruleta gamer.</text>
      <text x="24" y="98" font-family="sans-serif" font-size="13" font-weight="700" fill="#818CF8">✦ Explora estadísticas y plataformas en NEXT.g</text>
    </g>
  </g>

  <!-- Right Column: Game Cover (Base64 embedded) -->
  <g transform="translate(0, 0)">
    <!-- Cover Glow & Shadow -->
    <rect x="752" y="67" width="376" height="496" rx="28" fill="#6366F1" fill-opacity="0.3" filter="blur(14px)" />
    <rect x="756" y="71" width="368" height="488" rx="26" fill="none" stroke="#818CF8" stroke-width="3" />
    <image href="${escapeXml(coverDataUri)}" x="760" y="75" width="360" height="480" preserveAspectRatio="xMidYMid slice" clip-path="url(#gameCoverClip)" />
  </g>
</svg>
`.trim();

      set.headers['Content-Type'] = 'image/svg+xml; charset=utf-8';
      set.headers['Cache-Control'] = 'public, max-age=86400, s-maxage=86400';
      return svg;
    },
    {
      params: t.Object({
        id: t.Numeric({ minimum: 1 }),
      }),
    }
  )

  // GET /api/og/user/:id - Dynamic OpenGraph Social Image for User Gamer Passport (by nickname or UUID)
  .get(
    '/user/:id',
    async ({ params: { id }, set }) => {
      const sql = getDatabase();
      const decodedIdentifier = decodeURIComponent(id).trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedIdentifier);

      // 1. Fetch user profile and stats by nickname or UUID
      const [user] = isUuid
        ? await sql`
            SELECT 
              u.id, 
              u.name, 
              u.avatar_url, 
              COUNT(ug.id)::int as total_games,
              COUNT(CASE WHEN ug.status = 'COMPLETED' THEN 1 END)::int as completed,
              COUNT(CASE WHEN ug.status = 'PLAYING' THEN 1 END)::int as playing,
              COUNT(CASE WHEN ug.status = 'BACKLOG' THEN 1 END)::int as backlog
            FROM users u
            LEFT JOIN user_games ug ON u.id = ug.user_id
            WHERE u.id = ${decodedIdentifier}::uuid
            GROUP BY u.id, u.name, u.avatar_url
            LIMIT 1;
          `
        : await sql`
            SELECT 
              u.id, 
              u.name, 
              u.avatar_url, 
              COUNT(ug.id)::int as total_games,
              COUNT(CASE WHEN ug.status = 'COMPLETED' THEN 1 END)::int as completed,
              COUNT(CASE WHEN ug.status = 'PLAYING' THEN 1 END)::int as playing,
              COUNT(CASE WHEN ug.status = 'BACKLOG' THEN 1 END)::int as backlog
            FROM users u
            LEFT JOIN user_games ug ON u.id = ug.user_id
            WHERE LOWER(u.name) = LOWER(${decodedIdentifier})
            GROUP BY u.id, u.name, u.avatar_url, u.created_at
            ORDER BY u.created_at DESC
            LIMIT 1;
          `;

      if (!user) {
        set.status = 404;
        return '<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#0F172A"/><text x="50%" y="50%" fill="#fff" font-family="sans-serif" font-size="24" text-anchor="middle">Usuario no encontrado</text></svg>';
      }

      const name = escapeXml(user.name);
      const total = Number(user.total_games || 0);
      const completed = Number(user.completed || 0);
      const playing = Number(user.playing || 0);
      const backlog = Number(user.backlog || 0);

      // 2. Fetch avatar and convert to Base64 Data URI so it displays everywhere
      const avatarDataUri = await fetchImageAsDataUri(user.avatar_url, DEFAULT_AVATAR_DATA_URI);

      const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background gradients -->
    <linearGradient id="passportBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080C14" />
      <stop offset="50%" stop-color="#0E1626" />
      <stop offset="100%" stop-color="#040711" />
    </linearGradient>

    <radialGradient id="userGlow1" cx="20%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#6366F1" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#6366F1" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="userGlow2" cx="80%" cy="60%" r="60%">
      <stop offset="0%" stop-color="#EC4899" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#EC4899" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="neonRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="50%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#F472B6" />
    </linearGradient>

    <!-- Grid pattern -->
    <pattern id="userGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFFFFF" stroke-opacity="0.03" stroke-width="1" />
    </pattern>

    <clipPath id="avatarCircleClip">
      <circle cx="230" cy="315" r="115" />
    </clipPath>
  </defs>

  <!-- Background Layer -->
  <rect width="1200" height="630" fill="url(#passportBg)" />
  <rect width="1200" height="630" fill="url(#userGrid)" />
  <rect width="1200" height="630" fill="url(#userGlow1)" />
  <rect width="1200" height="630" fill="url(#userGlow2)" />

  <!-- Outer Border & Crosshair tech accents -->
  <rect x="20" y="20" width="1160" height="590" rx="24" fill="none" stroke="#6366F1" stroke-opacity="0.28" stroke-width="2" />
  <path d="M 18 45 L 18 18 L 45 18" fill="none" stroke="#818CF8" stroke-width="4" />
  <path d="M 1155 18 L 1182 18 L 1182 45" fill="none" stroke="#818CF8" stroke-width="4" />
  <path d="M 18 585 L 18 612 L 45 612" fill="none" stroke="#818CF8" stroke-width="4" />
  <path d="M 1155 612 L 1182 612 L 1182 585" fill="none" stroke="#818CF8" stroke-width="4" />

  <!-- Top Header Ribbon -->
  <g transform="translate(70, 60)">
    <rect width="44" height="44" rx="12" fill="#6366F1" />
    <path d="M12 22 L22 12 L32 22 L22 32 Z" fill="#FFFFFF" />
    <text x="58" y="32" font-family="'Plus Jakarta Sans', sans-serif" font-size="28" font-weight="900" fill="#FFFFFF">NEXT<tspan fill="#818CF8">.g</tspan></text>
    <rect x="175" y="10" width="165" height="26" rx="6" fill="#1E293B" stroke="#334155" stroke-width="1" />
    <text x="257" y="27" font-family="sans-serif" font-size="11" font-weight="800" fill="#38BDF8" text-anchor="middle" letter-spacing="2">GAMER PASSPORT</text>
  </g>

  <!-- Left Side: Avatar & Gamertag Section -->
  <g transform="translate(0, 0)">
    <!-- Glowing Avatar Outer Ring -->
    <circle cx="230" cy="315" r="128" fill="none" stroke="url(#neonRing)" stroke-width="5" filter="drop-shadow(0 0 12px rgba(129, 140, 248, 0.6))" />
    <circle cx="230" cy="315" r="120" fill="#0F172A" />
    <!-- Embedded Base64 Avatar -->
    <image href="${escapeXml(avatarDataUri)}" x="115" y="200" width="230" height="230" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarCircleClip)" />
    
    <!-- Verified Gamer Badge -->
    <g transform="translate(155, 455)">
      <rect width="150" height="30" rx="15" fill="#10B981" fill-opacity="0.2" stroke="#10B981" stroke-width="1.5" />
      <text x="75" y="20" font-family="sans-serif" font-size="12" font-weight="800" fill="#34D399" text-anchor="middle">✦ VERIFIED GAMER</text>
    </g>
  </g>

  <!-- Right Side: User Name and 4 Stat Modules -->
  <g transform="translate(420, 150)">
    <!-- User Gamertag -->
    <text x="0" y="45" font-family="'Space Grotesk', sans-serif" font-size="52" font-weight="900" fill="#FFFFFF" letter-spacing="-1">${name}</text>
    <text x="0" y="85" font-family="sans-serif" font-size="18" font-weight="600" fill="#94A3B8">Colección y progreso en NEXT.g Game Backlog</text>

    <!-- 4 Holographic Stat Cards Grid (2x2) -->
    <g transform="translate(0, 125)">
      <!-- Card 1: Total Games -->
      <g transform="translate(0, 0)">
        <rect width="330" height="105" rx="18" fill="#1E293B" fill-opacity="0.75" stroke="#6366F1" stroke-width="1.5" />
        <rect x="20" y="24" width="56" height="56" rx="14" fill="#6366F1" fill-opacity="0.2" />
        <!-- Gamepad icon vector -->
        <circle cx="48" cy="52" r="14" fill="#818CF8" />
        <text x="96" y="52" font-family="'Space Grotesk', sans-serif" font-size="34" font-weight="900" fill="#FFFFFF">${total}</text>
        <text x="96" y="74" font-family="sans-serif" font-size="12" font-weight="700" fill="#94A3B8" letter-spacing="1.5">TOTAL EN BIBLIOTECA</text>
      </g>

      <!-- Card 2: Completed -->
      <g transform="translate(360, 0)">
        <rect width="330" height="105" rx="18" fill="#064E3B" fill-opacity="0.6" stroke="#10B981" stroke-width="1.5" />
        <rect x="20" y="24" width="56" height="56" rx="14" fill="#10B981" fill-opacity="0.2" />
        <!-- Trophy icon vector -->
        <polygon points="48,38 54,46 42,46" fill="#34D399" />
        <rect x="42" y="46" width="12" height="14" fill="#34D399" />
        <text x="96" y="52" font-family="'Space Grotesk', sans-serif" font-size="34" font-weight="900" fill="#34D399">${completed}</text>
        <text x="96" y="74" font-family="sans-serif" font-size="12" font-weight="700" fill="#6EE7B7" letter-spacing="1.5">JUEGOS COMPLETADOS</text>
      </g>

      <!-- Card 3: Playing -->
      <g transform="translate(0, 125)">
        <rect width="330" height="105" rx="18" fill="#0C4A6E" fill-opacity="0.6" stroke="#0EA5E9" stroke-width="1.5" />
        <rect x="20" y="24" width="56" height="56" rx="14" fill="#0EA5E9" fill-opacity="0.2" />
        <!-- Play icon vector -->
        <polygon points="44,42 56,52 44,62" fill="#38BDF8" />
        <text x="96" y="52" font-family="'Space Grotesk', sans-serif" font-size="34" font-weight="900" fill="#38BDF8">${playing}</text>
        <text x="96" y="74" font-family="sans-serif" font-size="12" font-weight="700" fill="#7DD3FC" letter-spacing="1.5">JUGANDO AHORA</text>
      </g>

      <!-- Card 4: Backlog -->
      <g transform="translate(360, 125)">
        <rect width="330" height="105" rx="18" fill="#78350F" fill-opacity="0.5" stroke="#F59E0B" stroke-width="1.5" />
        <rect x="20" y="24" width="56" height="56" rx="14" fill="#F59E0B" fill-opacity="0.2" />
        <!-- Bookmark icon vector -->
        <path d="M42 40 L54 40 L54 64 L48 58 L42 64 Z" fill="#FBBF24" />
        <text x="96" y="52" font-family="'Space Grotesk', sans-serif" font-size="34" font-weight="900" fill="#FBBF24">${backlog}</text>
        <text x="96" y="74" font-family="sans-serif" font-size="12" font-weight="700" fill="#FDE68A" letter-spacing="1.5">EN EL BACKLOG</text>
      </g>
    </g>
  </g>
</svg>
`.trim();

      set.headers['Content-Type'] = 'image/svg+xml; charset=utf-8';
      set.headers['Cache-Control'] = 'public, max-age=3600, s-maxage=3600';
      return svg;
    },
    {
      params: t.Object({
        id: t.String({ minLength: 1, maxLength: 100 }),
      }),
    }
  );
