import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useInterviewersStore } from './InterviewersStore'

describe('InterviewersStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('seeds interviewers and exposes their fields', () => {
    const store = useInterviewersStore()
    expect(store.interviewers.length).toBeGreaterThan(0)
    expect(store.fields.length).toBeGreaterThan(0)
    expect(store.getById(store.interviewers[0].id)).toBeTruthy()
  })

  it('books an interviewer and records a pending booking', () => {
    const store = useInterviewersStore()
    const before = store.bookings.length
    const iv = store.interviewers[0]
    store.book(iv, 'skills', 'الأحد · 18:00', 180)
    expect(store.bookings.length).toBe(before + 1)
    expect(store.bookings[0].status).toBe('requested')
    expect(store.bookings[0].interviewerId).toBe(iv.id)
  })

  it('recommends at most 3 interviewers ranked by match', () => {
    const store = useInterviewersStore()
    const recs = store.recommendedFor({ field: 'تطوير الويب', skills: ['Vue.js', 'TypeScript'] })
    expect(recs.length).toBeLessThanOrEqual(3)
    for (let i = 1; i < recs.length; i++)
      expect(recs[i - 1].match).toBeGreaterThanOrEqual(recs[i].match)
  })

  it('derives a trust value from completed evaluation reports', () => {
    const store = useInterviewersStore()
    // seed includes one completed booking with an 84% report
    expect(store.trustValue).toBeGreaterThan(0)
    expect(store.trustValue).toBeLessThanOrEqual(100)
  })

  it('accepts an agenda request and completes a session', () => {
    const store = useInterviewersStore()
    const req = store.agendaRequests[0]
    expect(req).toBeTruthy()
    store.acceptRequest(req.id)
    expect(store.getAgendaItem(req.id)?.status).toBe('scheduled')

    store.completeSession(req.id, {
      level: 'متقدم', overall: 90, competencies: [], strengths: [], improvements: [], recommendation: 'جيد', trustGain: 12,
    })
    expect(store.getAgendaItem(req.id)?.status).toBe('completed')
    expect(store.interviewerStats.sessions).toBeGreaterThan(0)
  })
})
