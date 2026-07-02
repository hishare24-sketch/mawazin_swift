import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useExpertRolesStore } from './ExpertRolesStore'
import { useWalletStore } from './WalletStore'
import { SWITCHABLE_ROLES, ROLE_META } from '@/services/roles'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('ecosystem roles core', () => {
  it('registers coach/trainer/consultant as switchable instant roles with homes', () => {
    for (const r of ['coach', 'trainer', 'consultant'] as const) {
      expect(SWITCHABLE_ROLES).toContain(r)
      expect(ROLE_META[r].requestable).toBe(true)
      expect(ROLE_META[r].activation).toBe('instant')
      expect(ROLE_META[r].home).toContain(r)
    }
  })
})

describe('expertRolesStore', () => {
  it('coach: adds programs and advances client journeys', () => {
    const s = useExpertRolesStore()
    s.addProgram({ name: 'برنامج تجريبي', duration: 'شهري', price: 300, seats: 6 })
    expect(s.state.coachPrograms.some(p => p.name === 'برنامج تجريبي')).toBe(true)
    const c = s.state.coachClients[0]
    const before = c.progress
    s.bumpClientProgress(c.id)
    expect(c.progress).toBe(Math.min(100, before + 10))
    expect(s.coachStats.monthlyRecurring).toBeGreaterThan(0)
  })

  it('trainer: enrolling a referred trainee fills a seat and credits the wallet (pending)', () => {
    const s = useExpertRolesStore()
    const w = useWalletStore()
    const pendingBefore = w.pending
    const course = s.state.courses.find(c => c.status === 'open')!
    const seatsBefore = course.enrolled
    const trainee = s.state.trainees.find(t => t.status === 'new')!
    expect(s.enrollTrainee(trainee.id, course.id)).toBe(true)
    expect(course.enrolled).toBe(seatsBefore + 1)
    expect(trainee.status).toBe('enrolled')
    expect(w.pending).toBe(pendingBefore + course.price)
    expect(s.enrollTrainee(trainee.id, course.id)).toBe(false) // لم يعد جديدًا؟ المقعد يزيد فقط للجدد
  })

  it('consultant: accepts, declines and completes requests with wallet fees', () => {
    const s = useExpertRolesStore()
    const w = useWalletStore()
    const req = s.state.consulting.find(r => r.status === 'new')!
    s.respondConsulting(req.id, true)
    expect(req.status).toBe('accepted')
    const pendingBefore = w.pending
    s.completeConsulting(req.id, 7000)
    expect(req.status).toBe('done')
    expect(w.pending).toBe(pendingBefore + 7000)
  })
})
