import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { User } from '@/interfaces/Auth'
import { useAuthStore } from './AuthStore'
import { useDelegationStore } from './DelegationStore'

function login(): User {
  const auth = useAuthStore()
  const now = new Date().toISOString()
  const user = {
    id: 1,
    uuid: 'u-1',
    name: 'خالد الشمري',
    email: 'khalid@demo.sa',
    role: 'interviewer',
    roles: [
      { role: 'seeker', status: 'active', created_at: now, activated_at: now },
      { role: 'interviewer', status: 'active', created_at: now, activated_at: now },
    ],
    token: 't',
    permissions: [],
  } as unknown as User
  auth.setAuthUser(user)
  return user
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('delegationStore', () => {
  it('enters a delegated account, swaps the session identity, and restores it on exit', () => {
    const original = login()
    const auth = useAuthStore()
    const d = useDelegationStore()

    expect(d.isDelegating).toBe(false)
    expect(d.enterAccount(d.accounts[0].id)).toBe(true)
    expect(d.isDelegating).toBe(true)
    expect(auth.authUser?.name).toBe(d.accounts[0].name)
    expect(auth.role).toBe(d.accounts[0].role)
    // الهوية الأصلية محفوظة ومثبتة في localStorage (تنجو من إعادة التحميل)
    expect(d.originalUser?.email).toBe(original.email)
    expect(JSON.parse(localStorage.getItem('delegationOriginalUser')!).email).toBe(original.email)

    expect(d.exitDelegation()).toBe(true)
    expect(d.isDelegating).toBe(false)
    expect(auth.authUser?.email).toBe(original.email)
    expect(auth.role).toBe('interviewer')
    expect(localStorage.getItem('delegationOriginalUser')).toBeNull()
  })

  it('blocks nested delegation and no-ops exit when not delegating', () => {
    login()
    const d = useDelegationStore()
    expect(d.exitDelegation()).toBe(false)
    expect(d.enterAccount(d.accounts[0].id)).toBe(true)
    // لا تفويض داخل تفويض — اخرج أولًا
    expect(d.enterAccount(d.accounts[1].id)).toBe(false)
    expect(d.activeAccount?.id).toBe(d.accounts[0].id)
  })

  it('survives a reload mid-delegation (fresh pinia keeps the original identity)', () => {
    login()
    const d = useDelegationStore()
    d.enterAccount(d.accounts[1].id)
    // «إعادة تحميل»: pinia جديدة تقرأ من localStorage
    setActivePinia(createPinia())
    const d2 = useDelegationStore()
    const auth2 = useAuthStore()
    expect(d2.isDelegating).toBe(true)
    expect(d2.activeAccount?.id).toBe(d2.accounts[1].id)
    expect(auth2.authUser?.name).toBe(d2.accounts[1].name)
    expect(d2.exitDelegation()).toBe(true)
    expect(auth2.authUser?.name).toBe('خالد الشمري')
  })
})
