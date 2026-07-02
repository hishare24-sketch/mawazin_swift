import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { RoleEntry, RoleStatus, User, UserRole } from '@/interfaces/Auth'
import { ROLE_META, ROLE_PERMISSIONS, defaultRoleEntries } from '@/services/roles'

const STORAGE_KEY = 'authUser'

function loadUser(): User | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return null
  try {
    const user = JSON.parse(raw) as User
    // Migration: sessions stored before multi-role support carry a single `role`
    if (!Array.isArray(user.roles) || user.roles.length === 0)
      user.roles = defaultRoleEntries(user.role)
    return user
  }
  catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  // #region State
  const authUser = ref<User | null>(loadUser())
  // #endregion

  // #region Getters
  const isAuthUser = computed(() => !!authUser.value)
  const getToken = computed(() => authUser.value?.token)
  /** الدور النشط حاليًا (current_role) */
  const role = computed<UserRole | undefined>(() => authUser.value?.role)
  /** كل الأدوار المملوكة بحالاتها */
  const roleEntries = computed<RoleEntry[]>(() => authUser.value?.roles ?? [])
  /** الأدوار المفعّلة القابلة للتبديل إليها */
  const activeRoles = computed<UserRole[]>(() =>
    roleEntries.value.filter(r => r.status === 'active').map(r => r.role),
  )

  /** هل يملك المستخدم هذا الدور مفعّلًا؟ */
  function hasRole(r: UserRole): boolean {
    return activeRoles.value.includes(r)
  }

  /** هل يملك المستخدم هذا الدور بأي حالة (بما فيها pending)؟ */
  function ownsRole(r: UserRole): boolean {
    return roleEntries.value.some(e => e.role === r)
  }

  function roleStatus(r: UserRole): RoleStatus | undefined {
    return roleEntries.value.find(e => e.role === r)?.status
  }

  function hasPermission(permission: string): boolean {
    return authUser.value?.permissions?.includes(permission) ?? false
  }

  function hasPermissions(permissions: string[]): boolean {
    return permissions.every(p => hasPermission(p))
  }

  function hasAtLeastOnePermission(permissions: string[]): boolean {
    return permissions.some(p => hasPermission(p))
  }
  // #endregion

  // #region Actions
  function persist() {
    if (authUser.value)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser.value))
  }

  function setAuthUser(user: User) {
    if (!Array.isArray(user.roles) || user.roles.length === 0)
      user.roles = defaultRoleEntries(user.role)
    authUser.value = user
    persist()
  }

  function clearAuthUser() {
    authUser.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function setUserPermissions(permissions: string[]) {
    if (!authUser.value)
      return
    authUser.value.permissions = permissions
    persist()
  }

  /** التبديل إلى دور مفعّل — يحدّث الدور النشط وصلاحياته. يعيد false إن لم يكن الدور مفعّلًا. */
  function switchRole(r: UserRole): boolean {
    if (!authUser.value || !hasRole(r))
      return false
    if (authUser.value.role !== r) {
      authUser.value.role = r
      authUser.value.permissions = ROLE_PERMISSIONS[r]
      persist()
    }
    return true
  }

  /**
   * طلب دور جديد. الأدوار الفورية (seeker/company) تُفعَّل مباشرة،
   * وأدوار الموافقة (interviewer) تبقى pending حتى activateRole.
   */
  function requestRole(r: UserRole): RoleEntry | null {
    if (!authUser.value)
      return null
    const existing = roleEntries.value.find(e => e.role === r)
    if (existing)
      return existing
    const now = new Date().toISOString()
    const instant = ROLE_META[r].activation === 'instant'
    const entry: RoleEntry = {
      role: r,
      status: instant ? 'active' : 'pending',
      created_at: now,
      activated_at: instant ? now : undefined,
    }
    authUser.value.roles = [...roleEntries.value, entry]
    persist()
    return entry
  }

  /** تفعيل دور معلّق (بعد قبول الأهلية/الموافقة). يضيفه إن لم يكن مطلوبًا من قبل. */
  function activateRole(r: UserRole): boolean {
    if (!authUser.value)
      return false
    const entry = roleEntries.value.find(e => e.role === r)
    if (!entry) {
      const now = new Date().toISOString()
      authUser.value.roles = [...roleEntries.value, { role: r, status: 'active', created_at: now, activated_at: now }]
    }
    else if (entry.status !== 'active') {
      entry.status = 'active'
      entry.activated_at = new Date().toISOString()
    }
    persist()
    return true
  }
  // #endregion

  return {
    authUser,
    isAuthUser,
    getToken,
    role,
    roleEntries,
    activeRoles,
    hasRole,
    ownsRole,
    roleStatus,
    hasPermission,
    hasPermissions,
    hasAtLeastOnePermission,
    setAuthUser,
    clearAuthUser,
    setUserPermissions,
    switchRole,
    requestRole,
    activateRole,
  }
})
