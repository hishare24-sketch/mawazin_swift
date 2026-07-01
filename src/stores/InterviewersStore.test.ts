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

  it('manages custom evaluation elements (add/remove) and books with elements', () => {
    const store = useInterviewersStore()
    const before = store.myEvalElements.length
    store.addEvalElement({ name: 'عنصر تجريبي', description: 'وصف', price: 70 })
    expect(store.myEvalElements.length).toBe(before + 1)
    const added = store.myEvalElements[store.myEvalElements.length - 1]
    store.removeEvalElement(added.id)
    expect(store.myEvalElements.length).toBe(before)

    const iv = store.interviewers[0]
    expect(iv.evalElements.length).toBeGreaterThan(0)
    store.book(iv, 'skills', 'الأحد · 18:00', 280, ['التقييم المتقدم'])
    expect(store.bookings[0].elements).toEqual(['التقييم المتقدم'])
  })

  it('attaches pre-interview materials to a booking', () => {
    const store = useInterviewersStore()
    const iv = store.interviewers[0]
    const id = store.book(iv, 'skills', 'الأحد · 18:00', 180)
    store.addAttachment(id, { kind: 'link', name: 'مشروعي', url: 'https://github.com/x/y' })
    store.addAttachment(id, { kind: 'file', name: 'cv.pdf', fileType: 'application/pdf', size: 1000 })
    const b = store.bookings.find(x => x.id === id)
    expect(b?.attachments?.length).toBe(2)
    expect(b?.attachments?.[0].kind).toBe('link')
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
