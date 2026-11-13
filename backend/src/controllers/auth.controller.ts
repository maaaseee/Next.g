/**
 * Controller for Authentication, Social OAuth, and User Onboarding.
 * 
 * Supports:
 * - Local registration and login with JWT issuance
 * - Google OAuth 2.0 Web Flow
 * - GitHub OAuth Web Flow
 * - Favorite games onboarding (Netflix-style selection)
 */

import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { bearer } from '@elysiajs/bearer';
import { ENV } from '../config/env';
import { AuthService } from '../services/auth.service';
import type { UpsertGameInput } from '../services/games.service';
import {
  RegisterUserSchema,
  LoginUserSchema,
  OnboardingSchema,
} from '../types/schemas';
import { rateLimiterHook } from '../middleware/rate-limiter';
import { logger } from '../utils/logger';

interface HttpError extends Error {
  status?: number;
}

export const AUTH_COOKIE_NAME = 'nextg_token';

function getAuthCookieOptions(rememberMe = true) {
  return {
    httpOnly: true,
    secure: ENV.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 } : {}),
  };
}

/**
 * Strips sensitive fields (such as email, password_hash, token_version) before sending to client.
 */
function sanitizeUser<T extends { email?: string; password_hash?: unknown; token_version?: unknown }>(user: T) {
  const { email: _email, password_hash: _password_hash, token_version: _token_version, ...rest } = user;
  return rest;
}

export const authController = new Elysia({ prefix: '/api/auth' })
  .use(bearer())
  .use(
    jwt({
      name: 'jwt',
      secret: ENV.JWT_SECRET,
      exp: '30d',
    })
  )
  // Helper to extract authenticated user payload from HttpOnly Cookie or Bearer header
  .derive(async ({ bearer, cookie, jwt }) => {
    const rawCookie = cookie[AUTH_COOKIE_NAME]?.value;
    const token = (typeof rawCookie === 'string' && rawCookie ? rawCookie : null) || bearer;
    if (!token) {
      return { currentUser: null };
    }
    try {
      const payload = await jwt.verify(token);
      if (!payload || !payload.id) return { currentUser: null };

      // Instant JWT invalidation verification using token_version
      const user = await AuthService.getUserById(String(payload.id));
      if (!user) return { currentUser: null };

      const userTokenVersion = user.token_version ?? 1;
      const payloadTokenVersion = payload.tokenVersion !== undefined ? Number(payload.tokenVersion) : 1;

      if (payloadTokenVersion !== userTokenVersion) {
        return { currentUser: null };
      }

      return { currentUser: { id: String(payload.id), email: String(payload.email) } };
    } catch {
      return { currentUser: null };
    }
  })

  // GET /api/auth/check-username?username=pedro
  .get(
    '/check-username',
    async ({ query, set }) => {
      const raw = String(query.username || query.name || '').trim();
      if (!raw || raw.length < 2) {
        set.status = 400;
        return {
          available: false,
          error: 'ValidationError',
          message: 'El nombre de usuario debe tener al menos 2 caracteres.',
        };
      }

      if (raw.length > 80) {
        set.status = 400;
        return {
          available: false,
          error: 'ValidationError',
          message: 'El nombre de usuario no puede exceder los 80 caracteres.',
        };
      }

      const available = await AuthService.isUsernameAvailable(raw);
      return {
        available,
        username: raw,
        message: available
          ? 'Nombre de usuario disponible.'
          : 'Este nombre de usuario ya está ocupado por otra persona.',
      };
    },
    {
      query: t.Object({
        username: t.Optional(t.String()),
        name: t.Optional(t.String()),
      }),
      beforeHandle: rateLimiterHook({
        name: 'auth-check-username',
        max: 60,
        windowMs: 60 * 1000,
        message: 'Demasiadas comprobaciones de usuario. Por favor espera un momento.',
      }),
    }
  )

  // GET /api/auth/check-email?email=test@example.com
  .get(
    '/check-email',
    async ({ query, set }) => {
      const email = String(query.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        set.status = 400;
        return {
          available: false,
          error: 'ValidationError',
          message: 'Ingresa un correo electrónico válido.',
        };
      }

      const available = await AuthService.isEmailAvailable(email);
      return {
        available,
        email,
        message: available
          ? 'Correo electrónico disponible.'
          : 'Este correo electrónico ya está registrado.',
      };
    },
    {
      query: t.Object({
        email: t.String(),
      }),
      beforeHandle: rateLimiterHook({
        name: 'auth-check-email',
        max: 60,
        windowMs: 60 * 1000,
        message: 'Demasiadas comprobaciones de correo. Por favor espera un momento.',
      }),
    }
  )

  // POST /api/auth/register
  .post(
    '/register',
    async ({ body, jwt, cookie, set }) => {
      try {
        const user = await AuthService.register({
          email: body.email,
          password: body.password,
          name: body.name,
        });

        const token = await jwt.sign({
          id: user.id,
          email: user.email,
          tokenVersion: user.token_version ?? 1,
        });

        cookie[AUTH_COOKIE_NAME]?.set({
          value: token,
          ...getAuthCookieOptions(true),
        });

        set.status = 201;
        return {
          token,
          user: sanitizeUser(user),
          message: 'Cuenta creada exitosamente.',
        };
      } catch (err: unknown) {
        const httpErr = err as HttpError;
        set.status = httpErr.status || 400;
        return {
          error: 'RegistrationError',
          message: httpErr.message || 'Error al registrar el usuario.',
        };
      }
    },
    {
      body: RegisterUserSchema,
      beforeHandle: rateLimiterHook({
        name: 'auth-register',
        max: 15,
        windowMs: 60 * 1000,
        message: 'Demasiadas solicitudes de registro. Por favor espera un momento.',
      }),
    }
  )

  // POST /api/auth/login
  .post(
    '/login',
    async ({ body, jwt, cookie, set }) => {
      try {
        const user = await AuthService.login({
          email: body.email,
          password: body.password,
        });

        const token = await jwt.sign({
          id: user.id,
          email: user.email,
          tokenVersion: user.token_version ?? 1,
        });

        cookie[AUTH_COOKIE_NAME]?.set({
          value: token,
          ...getAuthCookieOptions(body.rememberMe !== false),
        });

        return {
          token,
          user: sanitizeUser(user),
          message: 'Sesión iniciada con éxito.',
        };
      } catch (err: unknown) {
        const httpErr = err as HttpError;
        set.status = httpErr.status || 401;
        return {
          error: 'LoginError',
          message: httpErr.message || 'Credenciales inválidas.',
        };
      }
    },
    {
      body: LoginUserSchema,
      beforeHandle: rateLimiterHook({
        name: 'auth-login',
        max: 20,
        windowMs: 60 * 1000,
        message: 'Demasiados intentos de inicio de sesión. Por favor espera un minuto.',
      }),
    }
  )

  // POST /api/auth/dev-test-login (Local Development Only)
  .post('/dev-test-login', async ({ jwt, cookie, set, request }) => {
    const isProduction = ENV.NODE_ENV === 'production';
    const host = request.headers.get('host') || '';
    const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');

    if (isProduction || !isLocalHost) {
      set.status = 403;
      return {
        error: 'Forbidden',
        message: 'La cuenta de prueba local está deshabilitada en producción.',
      };
    }

    try {
      const user = await AuthService.ensureLocalTestAccount();
      const token = await jwt.sign({
        id: user.id,
        email: user.email,
        tokenVersion: user.token_version ?? 1,
      });

      cookie[AUTH_COOKIE_NAME]?.set({
        value: token,
        ...getAuthCookieOptions(true),
      });

      return {
        token,
        user: sanitizeUser(user),
        message: 'Sesión de prueba local iniciada (135 juegos cargados).',
      };
    } catch (err: unknown) {
      const httpErr = err as HttpError;
      set.status = httpErr.status || 500;
      return {
        error: 'DevLoginError',
        message: httpErr.message || 'No se pudo inicializar la cuenta de prueba local.',
      };
    }
  })

  // GET /api/auth/me
  .get('/me', async ({ currentUser, set }) => {
    if (!currentUser) {
      set.status = 401;
      return {
        error: 'Unauthorized',
        message: 'No has iniciado sesión o tu sesión ha expirado.',
      };
    }

    const user = await AuthService.getUserById(currentUser.id);
    if (!user) {
      set.status = 404;
      return {
        error: 'NotFound',
        message: 'Usuario no encontrado.',
      };
    }

    return { user: sanitizeUser(user) };
  })

  // POST /api/auth/logout - Revokes all active JWT tokens for user & clears HttpOnly cookie
  .post('/logout', async ({ currentUser, cookie, set }) => {
    cookie[AUTH_COOKIE_NAME]?.remove();

    if (!currentUser) {
      set.status = 401;
      return {
        error: 'Unauthorized',
        message: 'No hay una sesión activa para cerrar.',
      };
    }

    await AuthService.revokeAllSessions(currentUser.id);
    return {
      success: true,
      message: 'Sesión cerrada exitosamente. Todos los tokens activos han sido invalidados.',
    };
  })

  // POST /api/auth/onboarding (Netflix-style favorite games selection)
  .post(
    '/onboarding',
    async ({ body, currentUser, set }) => {
      if (!currentUser) {
        set.status = 401;
        return {
          error: 'Unauthorized',
          message: 'Debes iniciar sesión para completar la configuración de tus juegos favoritos.',
        };
      }

      try {
        const updatedUser = await AuthService.completeOnboarding(
          currentUser.id,
          body.games as unknown as UpsertGameInput[]
        );

        return {
          success: true,
          user: sanitizeUser(updatedUser),
          message: '¡Tus juegos favoritos han sido añadidos a tu biblioteca!',
        };
      } catch (err: unknown) {
        const httpErr = err as HttpError;
        set.status = httpErr.status || 400;
        return {
          error: 'OnboardingError',
          message: httpErr.message || 'Error al guardar tus juegos favoritos.',
        };
      }
    },
    {
      body: OnboardingSchema,
    }
  )

  // POST /api/auth/complete-setup (Completes UX setup / marks onboarded)
  .post('/complete-setup', async ({ currentUser, set }) => {
    if (!currentUser) {
      set.status = 401;
      return {
        error: 'Unauthorized',
        message: 'Debes iniciar sesión para completar la configuración.',
      };
    }

    try {
      const updatedUser = await AuthService.completeSetup(currentUser.id);
      return {
        success: true,
        user: updatedUser,
      };
    } catch (err: unknown) {
      const httpErr = err as HttpError;
      set.status = httpErr.status || 500;
      return {
        error: 'SetupError',
        message: httpErr.message || 'Error al completar la configuración.',
      };
    }
  })

  // ==========================================
  // GOOGLE OAUTH
  // ==========================================
  .get('/google', ({ cookie: { oauth_state_google }, redirect }) => {
    if (!ENV.GOOGLE_CLIENT_ID || !ENV.GOOGLE_CLIENT_SECRET) {
      return redirect(
        `${ENV.FRONTEND_URL}/#auth_error=${encodeURIComponent(
          'Google OAuth no está configurado en el servidor. Consulta docs/guides/oauth-google.md para habilitarlo.'
        )}`
      );
    }

    const state = crypto.randomUUID();
    oauth_state_google.set({
      value: state,
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes TTL
      path: '/',
    });

    const redirectUri = `${ENV.BACKEND_URL}/api/auth/google/callback`;
    const googleAuthUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      new URLSearchParams({
        client_id: ENV.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account',
        state,
      }).toString();

    return redirect(googleAuthUrl);
  })

  .get('/google/callback', async ({ query, cookie, jwt, redirect }) => {
    const code = query.code;
    const errorParam = query.error;
    const receivedState = query.state;
    const expectedState = cookie.oauth_state_google?.value;

    cookie.oauth_state_google?.remove();

    if (errorParam || !code) {
      return redirect(
        `${ENV.FRONTEND_URL}/#auth_error=${encodeURIComponent(
          'Autenticación con Google cancelada o fallida.'
        )}`
      );
    }

    // CSRF Protection: Verify OAuth state
    if (!receivedState || !expectedState || receivedState !== expectedState) {
      logger.warn('[OAuth CSRF] State mismatch in Google OAuth callback', {
        receivedState,
        expectedState,
      });
      return redirect(
        `${ENV.FRONTEND_URL}/#auth_error=${encodeURIComponent(
          'Error de seguridad CSRF: el parámetro de estado de OAuth no coincide o ha expirado.'
        )}`
      );
    }

    try {
      const redirectUri = `${ENV.BACKEND_URL}/api/auth/google/callback`;

      // 1. Exchange authorization code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: ENV.GOOGLE_CLIENT_ID,
          client_secret: ENV.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || 'Fallo al obtener token de Google');
      }

      // 2. Fetch Google User Profile
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await userRes.json();

      if (!profile.email) {
        throw new Error('Google no devolvió un correo electrónico válido');
      }

      // 3. Upsert user in database
      const candidateName = profile.given_name || profile.name?.split(' ')[0] || 'Gamer';
      const user = await AuthService.findOrCreateOAuthUser({
        email: profile.email,
        name: candidateName,
        avatarUrl: profile.picture || null,
        provider: 'google',
        providerId: profile.sub,
      });

      // 4. Sign JWT & set HttpOnly cookie
      const token = await jwt.sign({
        id: user.id,
        email: user.email,
        tokenVersion: user.token_version ?? 1,
      });

      cookie[AUTH_COOKIE_NAME]?.set({
        value: token,
        ...getAuthCookieOptions(true),
      });

      // 5. Redirect back to frontend. If newly registered, redirect to choose-nickname step, otherwise /library
      const targetPath = user.isNewUser || !user.onboarded ? '/choose-nickname' : '/library';
      return redirect(`${ENV.FRONTEND_URL}${targetPath}#auth_token=${token}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error durante la autenticación con Google.';
      logger.error('Google OAuth callback error', { error: errorMsg });
      return redirect(
        `${ENV.FRONTEND_URL}/#auth_error=${encodeURIComponent(errorMsg)}`
      );
    }
  })

  // ==========================================
  // GITHUB OAUTH
  // ==========================================
  .get('/github', ({ cookie: { oauth_state_github }, redirect }) => {
    if (!ENV.GITHUB_CLIENT_ID || !ENV.GITHUB_CLIENT_SECRET) {
      return redirect(
        `${ENV.FRONTEND_URL}/#auth_error=${encodeURIComponent(
          'GitHub OAuth no está configurado en el servidor. Consulta docs/guides/oauth-github.md para habilitarlo.'
        )}`
      );
    }

    const state = crypto.randomUUID();
    oauth_state_github.set({
      value: state,
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes TTL
      path: '/',
    });

    const redirectUri = `${ENV.BACKEND_URL}/api/auth/github/callback`;
    const githubAuthUrl =
      'https://github.com/login/oauth/authorize?' +
      new URLSearchParams({
        client_id: ENV.GITHUB_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'user:email read:user',
        state,
      }).toString();

    return redirect(githubAuthUrl);
  })

  .get('/github/callback', async ({ query, cookie, jwt, redirect }) => {
    const code = query.code;
    const errorParam = query.error;
    const receivedState = query.state;
    const expectedState = cookie.oauth_state_github?.value;

    cookie.oauth_state_github?.remove();

    if (errorParam || !code) {
      return redirect(
        `${ENV.FRONTEND_URL}/#auth_error=${encodeURIComponent(
          'Autenticación con GitHub cancelada o fallida.'
        )}`
      );
    }

    // CSRF Protection: Verify OAuth state
    if (!receivedState || !expectedState || receivedState !== expectedState) {
      logger.warn('[OAuth CSRF] State mismatch in GitHub OAuth callback', {
        receivedState,
        expectedState,
      });
      return redirect(
        `${ENV.FRONTEND_URL}/#auth_error=${encodeURIComponent(
          'Error de seguridad CSRF: el parámetro de estado de OAuth no coincide o ha expirado.'
        )}`
      );
    }

    try {
      const redirectUri = `${ENV.BACKEND_URL}/api/auth/github/callback`;

      // 1. Exchange code for access token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: ENV.GITHUB_CLIENT_ID,
          client_secret: ENV.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || 'Fallo al obtener token de GitHub');
      }

      // 2. Fetch GitHub User Profile
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'NEXTg-App',
        },
      });
      const profile = await userRes.json();

      let email = profile.email;
      if (!email) {
        // Fetch emails endpoint if primary email is private
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'NEXTg-App',
          },
        });
        const emails: unknown = await emailsRes.json();
        if (Array.isArray(emails)) {
          const emailList = emails as { email: string; primary?: boolean; verified?: boolean }[];
          const primary = emailList.find((e) => e.primary && e.verified) || emailList[0];
          if (primary) email = primary.email;
        }
      }

      if (!email) {
        email = `${profile.id}+${profile.login}@users.noreply.github.com`;
      }

      // 3. Upsert user in database
      const candidateName = profile.login || profile.name || 'Gamer';
      const user = await AuthService.findOrCreateOAuthUser({
        email,
        name: candidateName,
        avatarUrl: profile.avatar_url || null,
        provider: 'github',
        providerId: String(profile.id),
      });

      // 4. Sign JWT & set HttpOnly cookie
      const token = await jwt.sign({
        id: user.id,
        email: user.email,
        tokenVersion: user.token_version ?? 1,
      });

      cookie[AUTH_COOKIE_NAME]?.set({
        value: token,
        ...getAuthCookieOptions(true),
      });

      // 5. Redirect back to frontend. If newly registered, redirect to choose-nickname step, otherwise /library
      const targetPath = user.isNewUser || !user.onboarded ? '/choose-nickname' : '/library';
      return redirect(`${ENV.FRONTEND_URL}${targetPath}#auth_token=${token}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error durante la autenticación con GitHub.';
      logger.error('GitHub OAuth callback error', { error: errorMsg });
      return redirect(
        `${ENV.FRONTEND_URL}/#auth_error=${encodeURIComponent(errorMsg)}`
      );
    }
  });
