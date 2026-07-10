import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import type { UserRole } from '@/interfaces/Auth'
import { landingFor, roleHome } from '@/services/roles'
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

  // Send logged-in users away from auth/landing pages — multi-role owners land
  // on the unified hub, single-role users go straight to their board
  if (authStore.isAuthUser && (to.name === 'login' || to.name === 'register' || to.name === 'home')) {
    return { name: landingFor(authStore.role, authStore.activeRoles.length) }
  }

  // Role-owned routes: switch the active role automatically when the user owns
  // the required role (the doc's "/interviewer/schedule loads the proper role"
  // behavior — without prefixing every path with /:role).
  const required = to.meta.roles as UserRole[] | undefined
  if (required && authStore.isAuthUser && authStore.role && !required.includes(authStore.role)) {
    const owned = required.find(r => authStore.hasRole(r))
    if (owned) {
      authStore.switchRole(owned)
      return true
    }
    return { name: roleHome(authStore.role) }
  }

  // بوّابة صلاحيّة دقيقة (مسارات الأدمن) — نقص الصلاحية يعيد للنظرة العامّة (لا حلقة)
  const perm = to.meta.permission as string | undefined
  if (perm && authStore.isAuthUser && !authStore.hasPermission(perm) && to.name !== 'admin-overview') {
    return { name: 'admin-overview' }
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
