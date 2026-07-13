import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useCandidatesStore } from './CandidatesStore'

// ST-CAND: متجر المرشّحين — البذرة، تجاوز الحالة والاستمرار، العدّادات، تلف JSON

describe('CandidatesStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('exposes seeded candidates with statuses', () => {
    const store = useCandidatesStore()
    expect(store.candidates.length).toBeGreaterThan(0)
    expect(store.getById(store.candidates[0].id)).toBeTruthy()
  })

  it('setStatus overrides one candidate and updates counters', () => {
    const store = useCandidatesStore()
    const target = store.candidates.find(c => c.status !== 'interview')!
    const before = store.interviewCount

    store.setStatus(target.id, 'interview')

    expect(store.getById(target.id)!.status).toBe('interview')
    expect(store.interviewCount).toBe(before + 1)
  })

  it('persists only the overrides map to localStorage', async () => {
    const store = useCandidatesStore()
    const target = store.candidates[0]
    store.setStatus(target.id, 'rejected')
    await nextTick() // watch يكتب في الدورة التالية

    const raw = JSON.parse(localStorage.getItem('candidateStatuses') ?? '{}')
    expect(raw[String(target.id)]).toBe('rejected') // خريطة تجاوزات لا مجموعة كاملة
    expect(Array.isArray(raw)).toBe(false)
  })

  it('falls back to empty overrides when stored JSON is corrupt', () => {
    localStorage.setItem('candidateStatuses', 'not-json{{{')
    setActivePinia(createPinia())
    const store = useCandidatesStore()
    expect(store.candidates.length).toBeGreaterThan(0) // البذرة سليمة بلا تجاوزات
  })
})
