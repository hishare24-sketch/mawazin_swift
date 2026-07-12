import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { i18n } from './plugins/i18n'
import { initObserver, vueErrorHandler } from './services/observer'
import '@/plugins/axios'
import '@/styles/tailwind.css'
import '@/styles/main.scss'

const app = createApp(App)

// رصد أخطاء وقت-التشغيل (ف3) — يُلتقَط خطأ Vue ثمّ الملتقطات العالميّة
app.config.errorHandler = vueErrorHandler

app.use(createPinia())
app.use(router)
app.use(vuetify)
app.use(i18n)

app.mount('#app')
initObserver()

// Auto-refresh after deploys: GitHub Pages serves index.html from cache for
// up to ~10 minutes, so users kept seeing the previous bundle. Compare the
// baked-in build id with the freshly deployed version.json and reload once
// (guarded per build id so it can never loop).
if (import.meta.env.PROD) {
  fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then((v: { buildId?: string } | null) => {
      if (!v?.buildId || v.buildId === __BUILD_ID__)
        return
      const key = `reloaded-for-${v.buildId}`
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
      }
    })
    .catch(() => { /* offline or first deploy — ignore */ })
}
