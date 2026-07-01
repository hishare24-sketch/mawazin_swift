import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

// https://vite.dev/config/
// In production (GitHub Pages project site) assets live under /smart-recruitment-system/.
// Dev keeps the root base so localhost URLs stay clean.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/smart-recruitment-system/' : '/',
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
      '@images': fileURLToPath(new URL('./src/assets/images', import.meta.url)),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
  },
}))
