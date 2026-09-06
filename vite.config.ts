import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version)
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
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
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
