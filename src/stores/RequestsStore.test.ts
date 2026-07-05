import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { STATE_META, opportunityTypeOf, useRequestsStore } from './RequestsStore'
import { OPPORTUNITY_TYPE_IDS } from '@/services/sectors'

describe('RequestsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('seeds requests with org rating, state and sort order', () => {
    const store = useRequestsStore()
    expect(store.requests.length).toBeGreaterThan(0)
    for (const r of store.requests) {
      expect(r.orgRating).toBeGreaterThan(0)
      expect(r.orgReviews).toBeGreaterThanOrEqual(0)
      expect(STATE_META[r.state]).toBeTruthy()
      expect(typeof r.postedOrder).toBe('number')
    }
  })

  it('applies to a request once and tracks it in mine', () => {
    const store = useRequestsStore()
    const req = store.requests[0]
    const before = store.mine.length
    store.apply(req)
    expect(store.hasApplied(req.id)).toBe(true)
    store.apply(req) // no duplicate
    expect(store.mine.length).toBe(before + 1)
  })

  it('bridges every request kind to a canonical opportunity type', () => {
    const valid = new Set(OPPORTUNITY_TYPE_IDS)
    for (const kind of ['job', 'project', 'consultation', 'task'] as const)
      expect(valid.has(opportunityTypeOf(kind))).toBe(true)
    expect(opportunityTypeOf('job')).toBe('full_time')
    expect(opportunityTypeOf('project')).toBe('freelance')
  })
})
