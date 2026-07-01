import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { useAuthStore } from '@/stores/AuthStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  const isPublic = to.meta.public === true

  // Block authenticated layouts when not logged in
  if (!isPublic && !authStore.isAuthUser) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Send logged-in users away from auth/landing pages to their dashboard
  if (authStore.isAuthUser && (to.name === 'login' || to.name === 'register' || to.name === 'home')) {
    const homeByRole: Record<string, string> = {
      endorser: 'endorser-home',
      admin: 'admin-dashboard',
      interviewer: 'interviewer-dashboard',
    }
    return { name: homeByRole[authStore.role ?? ''] ?? 'dashboard' }
  }

  return true
})

// After a new deploy, a mid-session user's cached page may point at lazy-loaded
// route chunks that no longer exist. Detect that failure and reload once to pull
// the fresh index + chunks (guarded so it can never loop).
router.onError((err) => {
  const msg = String(err?.message ?? '')
  const isChunkError = /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically imported/i.test(msg)
  if (isChunkError && !sessionStorage.getItem('chunk-reloaded')) {
    sessionStorage.setItem('chunk-reloaded', '1')
    window.location.reload()
  }
})
router.afterEach(() => {
  // A successful navigation means chunks loaded fine — clear the guard.
  sessionStorage.removeItem('chunk-reloaded')
})

export default router
