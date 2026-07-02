import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './AuthStore'
import type { User } from '@/interfaces/Auth'
import { ROLE_PERMISSIONS, defaultRoleEntries } from '@/services/roles'

function mockUser(overrides: Partial<User> = {}): User {
  const role = overrides.role ?? 'seeker'
  return {
    id: 1,
    uuid: 'u-1',
    name: 'اختبار',
    email: 'test@site.com',
    token: 't',
    role,
    roles: overrides.roles ?? defaultRoleEntries(role),
    permissions: ROLE_PERMISSIONS[role],
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('authStore multi-role core', () => {
  it('activates seeker only for a plain seeker', () => {
    const s = useAuthStore()
    s.setAuthUser(mockUser())
    expect(s.activeRoles).toEqual(['seeker'])
    expect(s.hasRole('seeker')).toBe(true)
    expect(s.hasRole('interviewer')).toBe(false)
  })

  it('grants seeker alongside a professional primary role (company/interviewer)', () => {
    const s = useAuthStore()
    s.setAuthUser(mockUser({ role: 'interviewer', roles: undefined as never }))
    expect(s.activeRoles).toContain('seeker')
    expect(s.activeRoles).toContain('interviewer')
  })

  it('keeps admin and endorser as single-role accounts', () => {
    expect(defaultRoleEntries('admin').map(e => e.role)).toEqual(['admin'])
    expect(defaultRoleEntries('endorser').map(e => e.role)).toEqual(['endorser'])
  })
})

describe('authStore.switchRole', () => {
  it('switches the active role and its permissions, and persists', () => {
    const s = useAuthStore()
    s.setAuthUser(mockUser({ role: 'company', roles: undefined as never }))
    expect(s.role).toBe('company')
    expect(s.switchRole('seeker')).toBe(true)
    expect(s.role).toBe('seeker')
    expect(s.hasPermission('manage_resume')).toBe(true)
    expect(s.hasPermission('create_opportunity')).toBe(false)
    const stored = JSON.parse(localStorage.getItem('authUser')!)
    expect(stored.role).toBe('seeker')
  })

  it('refuses switching to a role the user does not own or that is pending', () => {
    const s = useAuthStore()
    s.setAuthUser(mockUser())
    expect(s.switchRole('company')).toBe(false)
    s.requestRole('interviewer') // pending — not switchable yet
    expect(s.switchRole('interviewer')).toBe(false)
    expect(s.role).toBe('seeker')
  })
})

describe('authStore.requestRole / activateRole', () => {
  it('activates instant roles (company) immediately', () => {
    const s = useAuthStore()
    s.setAuthUser(mockUser())
    const entry = s.requestRole('company')
    expect(entry?.status).toBe('active')
    expect(s.hasRole('company')).toBe(true)
  })

  it('keeps approval roles (interviewer) pending until activation', () => {
    const s = useAuthStore()
    s.setAuthUser(mockUser())
    const entry = s.requestRole('interviewer')
    expect(entry?.status).toBe('pending')
    expect(s.hasRole('interviewer')).toBe(false)
    expect(s.ownsRole('interviewer')).toBe(true)
    s.activateRole('interviewer')
    expect(s.hasRole('interviewer')).toBe(true)
    expect(s.roleStatus('interviewer')).toBe('active')
    expect(s.switchRole('interviewer')).toBe(true)
  })

  it('does not duplicate an already-owned role', () => {
    const s = useAuthStore()
    s.setAuthUser(mockUser())
    s.requestRole('company')
    s.requestRole('company')
    expect(s.roleEntries.filter(e => e.role === 'company').length).toBe(1)
  })
})

describe('authStore legacy migration', () => {
  it('synthesizes role entries for a stored single-role session', () => {
    // A pre-multi-role session: no `roles` array in localStorage
    const legacy = { id: 9, uuid: 'u-9', name: 'قديم', email: 'old@site.com', token: 't', role: 'company', permissions: [] }
    localStorage.setItem('authUser', JSON.stringify(legacy))
    setActivePinia(createPinia())
    const s = useAuthStore()
    expect(s.isAuthUser).toBe(true)
    expect(s.activeRoles).toContain('company')
    expect(s.activeRoles).toContain('seeker')
    expect(s.role).toBe('company')
  })
})
