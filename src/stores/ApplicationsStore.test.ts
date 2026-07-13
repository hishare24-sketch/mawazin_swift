import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useApplicationsStore } from './ApplicationsStore'
import type { Opportunity } from '@/modules/opportunities/interfaces/Opportunity'

// ST-APP: متجر التقديمات — البذرة، apply بلا تكرار، السحب، الفلترة، تلف JSON

const opp = (id: number): Opportunity => ({
  id, title: `فرصة ${id}`, company: 'شركة', companyInitial: 'ش',
} as unknown as Opportunity)

describe('ApplicationsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('seeds applications with valid statuses', () => {
    const store = useApplicationsStore()
    expect(store.applications.length).toBeGreaterThan(0)
    expect(store.count).toBe(store.applications.length)
    for (const a of store.applications)
      expect(['submitted', 'reviewing', 'interview', 'rejected', 'accepted']).toContain(a.status)
  })

  it('applies once per opportunity and tracks hasApplied', () => {
    const store = useApplicationsStore()
    const before = store.count
    store.apply(opp(999), 'سيرة تقنية')
    expect(store.hasApplied(999)).toBe(true)
    expect(store.applications[0].status).toBe('submitted') // يُدرج في المقدّمة
    store.apply(opp(999), 'سيرة تقنية') // لا تكرار
    expect(store.count).toBe(before + 1)
  })

  it('withdraw removes the application', () => {
    const store = useApplicationsStore()
    store.apply(opp(555), 'سيرة')
    const id = store.applications[0].id
    store.withdraw(id)
    expect(store.hasApplied(555)).toBe(false)
  })

  it('byStatus filters applications', () => {
    const store = useApplicationsStore()
    const submitted = store.byStatus('submitted')
    for (const a of submitted)
      expect(a.status).toBe('submitted')
  })

  it('falls back to seed when stored JSON is corrupt', () => {
    localStorage.setItem('applications', '{corrupt json![')
    setActivePinia(createPinia())
    const store = useApplicationsStore()
    expect(store.applications.length).toBeGreaterThan(0) // بذرة لا انهيار
  })
})
