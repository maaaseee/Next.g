import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import packageJson from './package.json' with { type: 'json' }

const siteUrl = (
  process.env.VITE_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  ''
).replace(/\/+$/, '')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    {
      name: 'html-transform-og',
      transformIndexHtml(html) {
        const ogImageUrl = siteUrl ? `${siteUrl}/og-image.png` : '/og-image.png'
        return html.replace(/__OG_IMAGE_URL__/g, ogImageUrl)
      },
    },
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      ignored: [
        '**/backend/**',
        '**/data/**',
        '**/*.db',
        '**/*.db-wal',
        '**/*.db-shm',
        '**/*.sqlite',
        '**/*.sqlite-wal',
        '**/*.sqlite-shm',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
