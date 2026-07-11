import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

// GitHub Pages caches index.html for ~10 minutes, so mid-session users kept
// seeing stale bundles after each deploy. The app compares its baked-in build
// id against dist/version.json (fetched with no-store) and reloads once.
const BUILD_ID = String(Date.now())
function versionFile(): Plugin {
  return {
    name: 'emit-version-json',
    apply: 'build',
    writeBundle(options) {
      const dir = options.dir ?? 'dist'
      mkdirSync(dir, { recursive: true })
      writeFileSync(`${dir}/version.json`, JSON.stringify({ buildId: BUILD_ID }))
    },
  }
}

// https://vite.dev/config/
// Base path differs per deploy target:
//  - GitHub Pages project site serves under /smart-recruitment-system/
//  - Netlify / Vercel (and dev) serve from the root, so assets live at /
// Netlify sets NETLIFY=true and Vercel sets VERCEL=1 during their builds.
const isRootHost = !!process.env.NETLIFY || !!process.env.VERCEL
export default defineConfig(({ command }) => ({
  base: command === 'build' && !isRootHost ? '/smart-recruitment-system/' : '/',
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    versionFile(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
      '@images': fileURLToPath(new URL('./src/assets/images', import.meta.url)),
    },
  },
  server: {
    // منفذ ثابت مخصّص للواجهة (Docker/Sail يحجز 5173، فكان Vite ينحرف لمنفذ عشوائيّ
    // كلّ تشغيل ويكسر الرابط). strictPort يفشل بوضوح بدل الانحراف — الرابط ثابت دائمًا.
    port: Number(process.env.PORT) || 5273,
    strictPort: true,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Split large vendors into their own chunks for better caching
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
          vuetify: ['vuetify'],
        },
      },
    },
  },
}))
