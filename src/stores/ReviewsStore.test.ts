import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useReviewsStore } from './ReviewsStore'
import { ai } from '@/services/ai'

describe('ReviewsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('seeds reviews for interviewers and the candidate', () => {
    const store = useReviewsStore()
    expect(store.forSubject('toInterviewer', '1').length).toBeGreaterThan(0)
    expect(store.forSubject('toCandidate', 'me').length).toBeGreaterThan(0)
  })

  it('sorts reviews newest-first and computes an average', () => {
    const store = useReviewsStore()
    const list = store.forSubject('toInterviewer', '1')
    for (let i = 1; i < list.length; i++)
      expect(list[i - 1].date.localeCompare(list[i].date)).toBeGreaterThanOrEqual(0)
    const avg = store.averageFor('toInterviewer', '1')
    expect(avg).toBeGreaterThan(0)
    expect(avg).toBeLessThanOrEqual(5)
  })

  it('adds a review and increments the count', () => {
    const store = useReviewsStore()
    const before = store.countFor('toInterviewer', '2')
    store.addReview({
      direction: 'toInterviewer', subjectId: '2', authorName: 'أحمد', authorInitial: 'أ',
      authorRole: 'seeker', stars: 5, comment: 'ممتاز ودقيق',
    })
    expect(store.countFor('toInterviewer', '2')).toBe(before + 1)
    expect(store.forSubject('toInterviewer', '2')[0].comment).toBe('ممتاز ودقيق')
  })

  it('allows replying only once per review', () => {
    const store = useReviewsStore()
    const target = store.forSubject('toCandidate', 'me').find(r => !r.reply)!
    store.addReply(target.id, 'شكرًا على تقييمك')
    expect(store.reviews.find(r => r.id === target.id)?.reply?.text).toBe('شكرًا على تقييمك')
    store.addReply(target.id, 'محاولة ثانية')
    expect(store.reviews.find(r => r.id === target.id)?.reply?.text).toBe('شكرًا على تقييمك')
  })
})

describe('ai reviews helpers', () => {
  it('extracts frequent traits and summarizes review comments', () => {
    const digest = ai.reviewsDigest(['شرح واضح ودقيق', 'احترافي ودقيق جدًا', 'عملي وواضح'])
    expect(digest.traits.length).toBeGreaterThan(0)
    expect(digest.summary.length).toBeGreaterThan(0)
  })

  it('returns an empty digest for no comments', () => {
    const digest = ai.reviewsDigest([])
    expect(digest.traits).toEqual([])
  })

  it('suggests a warmer reply for high stars than for low', () => {
    const high = ai.suggestReviewReply(5, 'رائع')
    const low = ai.suggestReviewReply(1, 'سيئ')
    expect(high).not.toBe(low)
    expect(high.length).toBeGreaterThan(0)
    expect(low.length).toBeGreaterThan(0)
  })
})
