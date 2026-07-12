import { describe, expect, it } from 'vitest'
import { matchScore } from './matching'
import { dominantSector, opportunityMatchProfile, requestMatchProfile, seekerMatchProfile } from './matchProfile'

describe('matchProfile builders', () => {
  it('derives the dominant sector from a skill list', () => {
    expect(dominantSector(['Vue.js', 'TypeScript', 'Node.js'])).toBe('S01')
    expect(dominantSector(['Figma', 'Sketch'])).toBe('S11')
    expect(dominantSector(['كلمة غير معروفة'])).toBeUndefined()
  })

  it('tolerates undefined/empty skill entries (real-API shapes) without throwing', () => {
    // مهارات آتية من الباك-إند قد تحوي أسماء غائبة — يجب ألّا تُسقِط الحساب
    expect(() => dominantSector([undefined as unknown as string, '', 'Vue.js'])).not.toThrow()
    expect(dominantSector([undefined as unknown as string, 'Vue.js', 'TypeScript'])).toBe('S01')
  })

  it('builds a seeker profile with sector inferred from skills', () => {
    const p = seekerMatchProfile({ skills: ['Vue.js', 'TypeScript'], city: 'الرياض', opportunityType: 'full_time' })
    expect(p.sector).toBe('S01')
    expect(p.city).toBe('الرياض')
    expect(p.opportunityType).toBe('full_time')
  })

  it('honors an explicit seeker sector (slug) over inference', () => {
    const p = seekerMatchProfile({ skills: ['Vue.js'], sector: 'design' })
    expect(p.sector).toBe('S11')
  })

  it('builds an opportunity profile resolving department → sector and remote flag', () => {
    const o = opportunityMatchProfile({ department: 'التقنية', skills: ['Vue.js'], city: 'عن بُعد', type: 'remote' })
    expect(o.sector).toBe('S01')
    expect(o.remote).toBe(true)
    expect(o.opportunityType).toBe('remote')
  })

  it('builds a request profile resolving field → sector', () => {
    const r = requestMatchProfile({ field: 'تطوير الويب', skills: ['Vue.js'], remote: true })
    expect(r.sector).toBe('S01')
  })

  it('produces a strong live score for a matching seeker/opportunity', () => {
    const seeker = seekerMatchProfile({ skills: ['Vue.js', 'TypeScript'], city: 'الرياض', opportunityType: 'full_time' })
    const opp = opportunityMatchProfile({ department: 'التقنية', skills: ['Vue.js', 'TypeScript', 'REST API'], city: 'الرياض', type: 'full_time' })
    const { score } = matchScore(seeker, opp)
    expect(score).toBeGreaterThanOrEqual(70)
  })

  it('produces a low score across a sector/skill mismatch', () => {
    const seeker = seekerMatchProfile({ skills: ['Vue.js', 'TypeScript'], city: 'الرياض', opportunityType: 'full_time' })
    const opp = opportunityMatchProfile({ department: 'الصحة', skills: ['التمريض السريري'], city: 'جدة', type: 'part_time' })
    const { score } = matchScore(seeker, opp)
    expect(score).toBeLessThan(30)
  })
})
