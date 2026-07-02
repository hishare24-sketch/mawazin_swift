import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRoleRequestsStore } from './RoleRequestsStore'
import { useAuthStore } from './AuthStore'
import { ROLE_META, ROLE_PERMISSIONS, defaultRoleEntries } from '@/services/roles'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('role approval pipeline', () => {
  it('marks the ecosystem roles as approval-gated', () => {
    for (const r of ['coach', 'trainer', 'consultant', 'interviewer'] as const)
      expect(ROLE_META[r].activation).toBe('approval')
  })

  it('queues my request pending and activates my role on admin approval', () => {
    const auth = useAuthStore()
    auth.setAuthUser({ id: 1, uuid: 'u', name: 'أنا', email: 'x@x.com', token: 't', role: 'seeker', roles: defaultRoleEntries('seeker'), permissions: ROLE_PERMISSIONS.seeker })
    auth.requestRole('coach') // approval → pending
    expect(auth.hasRole('coach')).toBe(false)

    const q = useRoleRequestsStore()
    const req = q.add('coach', 'اختبار', true)
    expect(q.pending.some(r => r.id === req.id)).toBe(true)
    q.decide(req.id, true)
    expect(q.pending.some(r => r.id === req.id)).toBe(false)
    expect(auth.hasRole('coach')).toBe(true) // الاعتماد فعّل الدور
  })

  it('rejection keeps the role inactive', () => {
    const auth = useAuthStore()
    auth.setAuthUser({ id: 1, uuid: 'u', name: 'أنا', email: 'x@x.com', token: 't', role: 'seeker', roles: defaultRoleEntries('seeker'), permissions: ROLE_PERMISSIONS.seeker })
    auth.requestRole('trainer')
    const q = useRoleRequestsStore()
    const req = q.add('trainer', 'اختبار', true)
    q.decide(req.id, false)
    expect(auth.hasRole('trainer')).toBe(false)
    expect(auth.ownsRole('trainer')).toBe(true) // يبقى معلقًا قابلًا لإعادة الطلب
  })

  it('simulated platform review approves after the delay', () => {
    const auth = useAuthStore()
    auth.setAuthUser({ id: 1, uuid: 'u', name: 'أنا', email: 'x@x.com', token: 't', role: 'seeker', roles: defaultRoleEntries('seeker'), permissions: ROLE_PERMISSIONS.seeker })
    auth.requestRole('consultant')
    const q = useRoleRequestsStore()
    const req = q.add('consultant', 'اختبار', true)
    q.simulatePlatformReview(req.id)
    vi.advanceTimersByTime(11000)
    expect(auth.hasRole('consultant')).toBe(true)
  })
})
