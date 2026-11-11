/**
 * Type-Safe End-to-End API Client powered by @elysiajs/eden.
 * Connects the Vue 3 frontend with the ElysiaJS backend using HttpOnly Cookies for authentication.
 */

import { treaty } from '@elysiajs/eden';
import { APP_CONFIG } from '../config/api.config';

const targetUrl =
  APP_CONFIG.apiUrl ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

/**
 * Eden Treaty client instance.
 * Automatically sends and receives HttpOnly authentication cookies (`credentials: 'include'`) on every request.
 */
export const eden = treaty<any>(targetUrl, {
  fetch: {
    credentials: 'include',
  },
});
