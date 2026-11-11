/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL for Backend API requests.
   * If unset or empty, the frontend uses relative `/api` paths with Vite proxy (local dev)
   * or same-origin / reverse proxy (production).
   */
  readonly VITE_API_URL?: string;

  /**
   * Application Title.
   */
  readonly VITE_APP_TITLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
