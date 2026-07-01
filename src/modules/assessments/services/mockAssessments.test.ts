import { describe, expect, it } from 'vitest'
import { QUESTION_TYPE_META, buildQuestions, getAssessmentById, scoreAnswer } from './mockAssessments'
import type { AssessmentQuestion } from './mockAssessments'

describe('assessment helpers', () => {
  it('defines all 10 question types', () => {
    expect(Object.keys(QUESTION_TYPE_META).length).toBe(10)
  })

  it('builds a unique set of the requested size with sequential ids', () => {
    const a = getAssessmentById(1)!
    const qs = buildQuestions(a.pool, 25)
    expect(qs.length).toBe(25)
    expect(qs[0].id).toBe(1)
    expect(qs[24].id).toBe(25)
  })

  it('scores objective question types against the key', () => {
    const mcq: AssessmentQuestion = { id: 1, type: 'mcq', text: '', options: ['a', 'b'], correctIndex: 1 }
    expect(scoreAnswer(mcq, 1)).toBe(true)
    expect(scoreAnswer(mcq, 0)).toBe(false)

    const seq: AssessmentQuestion = { id: 2, type: 'sequencing', text: '', items: ['x', 'y', 'z'], correctOrder: [0, 1, 2] }
    expect(scoreAnswer(seq, [0, 1, 2])).toBe(true)
    expect(scoreAnswer(seq, [2, 1, 0])).toBe(false)

    const match: AssessmentQuestion = { id: 3, type: 'matching', text: '', pairs: [{ left: 'a', right: 'A' }, { left: 'b', right: 'B' }] }
    expect(scoreAnswer(match, { 0: 0, 1: 1 })).toBe(true)
    expect(scoreAnswer(match, { 0: 1, 1: 0 })).toBe(false)
  })

  it('gives credit to subjective types for a genuine answer', () => {
    const open: AssessmentQuestion = { id: 4, type: 'open', text: '' }
    expect(scoreAnswer(open, 'إجابة تحليلية')).toBe(true)
    expect(scoreAnswer(open, '')).toBe(false)
    const rank: AssessmentQuestion = { id: 5, type: 'rank', text: '', items: ['a', 'b'] }
    expect(scoreAnswer(rank, [1, 0])).toBe(true)
    expect(scoreAnswer(rank, [])).toBe(false)
  })
})
