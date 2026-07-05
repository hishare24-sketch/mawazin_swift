import { describe, expect, it } from 'vitest'
import { fetchMyMessages, markThreadRead, resolveProfileOwner, sendDirectMessage, subscribeInbound } from './directMessages'

// في بيئة الاختبار المفتاح مطفأ (USE_REAL_API=false) — كل الدوال محايدة،
// فيبقى سلوك المحاكاة المحلي في MessagesStore دون أي شبكة أو Socket.
describe('directMessages (mock mode — flag off)', () => {
  it('sendDirectMessage يعيد null بلا شبكة', async () => {
    const row = await sendDirectMessage({ senderId: 'A', senderName: 'أحمد', recipientId: 'B', recipientName: 'سارة', body: 'مرحبًا' })
    expect(row).toBeNull()
  })

  it('fetchMyMessages يعيد مصفوفة فارغة', async () => {
    expect(await fetchMyMessages('A')).toEqual([])
  })

  it('resolveProfileOwner يعيد null', async () => {
    expect(await resolveProfileOwner('khaled')).toBeNull()
  })

  it('markThreadRead لا ينهار', async () => {
    await expect(markThreadRead('A', 'B')).resolves.toBeUndefined()
  })

  it('subscribeInbound يعيد دالة إلغاء محايدة (بلا Socket)', () => {
    const detach = subscribeInbound('B', () => {})
    expect(typeof detach).toBe('function')
    expect(() => detach()).not.toThrow()
  })
})
