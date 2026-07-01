import { describe, expect, it } from 'vitest'
import { mockAi } from './mockAi'

describe('mockAi.skillLevel', () => {
  it('maps proof score to level by thresholds', () => {
    expect(mockAi.skillLevel(0).level).toBe('entry')
    expect(mockAi.skillLevel(30).level).toBe('mid')
    expect(mockAi.skillLevel(55).level).toBe('advanced')
    expect(mockAi.skillLevel(80).level).toBe('expert')
  })
  it('clamps confidence to 0-100 and returns a rationale', () => {
    const r = mockAi.skillLevel(140)
    expect(r.confidence).toBe(100)
    expect(r.rationale.length).toBeGreaterThan(0)
  })
})

describe('mockAi.trustAnalysis', () => {
  it('suggests tips for weak factors', () => {
    const tips = mockAi.trustAnalysis([{ key: 'endorsements', label: 'التوصيات', value: 40 }])
    expect(tips.length).toBeGreaterThan(0)
    expect(tips[0].gain).toBeGreaterThan(0)
  })
  it('returns a positive message when everything is strong', () => {
    const strong = ['endorsements', 'assessments', 'skills', 'interviews', 'completeness']
      .map(key => ({ key, label: key, value: 100 }))
    const tips = mockAi.trustAnalysis(strong)
    expect(tips).toHaveLength(1)
    expect(tips[0].gain).toBe(0)
  })
})

describe('mockAi.interviewerEligibility', () => {
  it('recommends acceptance for strong qualifications', () => {
    const r = mockAi.interviewerEligibility({ years: 10, certs: 3, endorsements: 3, hasLicense: true })
    expect(r.score).toBeGreaterThanOrEqual(70)
    expect(r.recommendation).toBe('accept')
    expect(r.strengths.length).toBeGreaterThan(0)
  })
  it('rejects weak qualifications and lists gaps', () => {
    const r = mockAi.interviewerEligibility({ years: 0, certs: 0, endorsements: 0 })
    expect(r.recommendation).toBe('reject')
    expect(r.gaps.length).toBeGreaterThan(0)
  })
})

describe('mockAi.suggestInterviewerPricing', () => {
  it('returns a min < max range within the kind band', () => {
    const p = mockAi.suggestInterviewerPricing('leadership', 8)
    expect(p.min).toBeLessThan(p.max)
    expect(p.min).toBeGreaterThan(0)
  })
})

describe('mockAi.interviewerMatch + recommendInterviewers', () => {
  const candidate = { field: 'تطوير الويب', skills: ['Vue.js', 'TypeScript'] }
  it('scores higher when specialties overlap skills', () => {
    const overlap = mockAi.interviewerMatch(candidate, { type: 'technical', specialties: ['Vue.js', 'TypeScript'] })
    const none = mockAi.interviewerMatch(candidate, { type: 'behavioral', specialties: ['التواصل'] })
    expect(overlap).toBeGreaterThan(none)
    expect(overlap).toBeLessThanOrEqual(98)
  })
  it('returns at most 3 ranked interviewers, sorted desc', () => {
    const ranked = mockAi.recommendInterviewers(candidate, [
      { id: 1, type: 'technical', specialties: ['Vue.js', 'TypeScript'] },
      { id: 2, type: 'behavioral', specialties: ['التواصل'] },
      { id: 3, type: 'technical', specialties: ['Vue.js'] },
      { id: 4, type: 'specialist', specialties: ['التسويق'] },
    ])
    expect(ranked.length).toBeLessThanOrEqual(3)
    expect(ranked[0].match).toBeGreaterThanOrEqual(ranked[ranked.length - 1].match)
  })
})

describe('mockAi.suggestEvaluationQuestions', () => {
  it('returns questions for a known kind and falls back gracefully', () => {
    expect(mockAi.suggestEvaluationQuestions('leadership').length).toBeGreaterThan(0)
    expect(mockAi.suggestEvaluationQuestions('unknown-kind').length).toBeGreaterThan(0)
  })
})

describe('mockAi.trustMotivation', () => {
  it('varies message by delta sign', () => {
    expect(mockAi.trustMotivation(5, 80)).toContain('ارتفعت')
    expect(mockAi.trustMotivation(-5, 60)).toContain('انخفضت')
    expect(mockAi.trustMotivation(0, 70)).toContain('70')
  })
})
