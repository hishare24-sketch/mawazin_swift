import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMessagesStore } from './MessagesStore'
import { useNotificationsStore } from './NotificationsStore'
import { usePublicProfileStore } from './PublicProfileStore'
import { useWalletStore } from './WalletStore'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('publicProfileStore', () => {
  it('tracks reach counters and persists them', async () => {
    const p = usePublicProfileStore()
    const v = p.state.views
    p.recordView()
    p.recordShare()
    expect(p.state.views).toBe(v + 1)
    await Promise.resolve()
    await Promise.resolve()
    expect(JSON.parse(localStorage.getItem('publicProfile')!).views).toBe(v + 1)
  })

  it('shows only consented testimonials publicly', () => {
    const p = usePublicProfileStore()
    const hidden = p.state.testimonials.find(t => !t.visible)!
    expect(p.visibleTestimonials.some(t => t.id === hidden.id)).toBe(false)
    p.toggleTestimonial(hidden.id)
    expect(p.visibleTestimonials.some(t => t.id === hidden.id)).toBe(true)
  })

  it('manages achievements and portfolio', () => {
    const p = usePublicProfileStore()
    p.addAchievement('رفعت التغطية الاختبارية من 40% إلى 90%')
    const a = p.state.achievements[p.state.achievements.length - 1]
    expect(a.kind).toBe('self') // ما يكتبه المستخدم مُصرَّح ذاتيًا دائمًا
    p.removeAchievement(a.id)
    expect(p.state.achievements.some(x => x.id === a.id)).toBe(false)

    p.addPortfolio({ title: 'مشروع', desc: 'وصف', tag: 'Vue' })
    const w = p.state.portfolio[p.state.portfolio.length - 1]
    expect(w.id).toBeGreaterThan(0)
    p.removePortfolio(w.id)
    expect(p.state.portfolio.some(x => x.id === w.id)).toBe(false)
  })

  it('routes visitor contact into the owner inbox with a notification', () => {
    const p = usePublicProfileStore()
    const messages = useMessagesStore()
    const notifications = useNotificationsStore()
    const convCount = messages.conversations.length
    const contacts = p.state.contacts

    expect(p.contact('زائر مهتم', 'أود مناقشة فرصة تعاون')).toBe(true)
    expect(messages.conversations.length).toBe(convCount + 1)
    expect(messages.conversations[0].messages[0].from).toBe('them')
    expect(notifications.notifications[0].actionTo).toBe('/messages')
    expect(p.state.contacts).toBe(contacts + 1)

    p.state.contactEnabled = false
    expect(p.contact('زائر آخر', 'مرحبا')).toBe(false)
    expect(messages.conversations.length).toBe(convCount + 1)
  })

  it('computes page strength with the next actionable tip', () => {
    const p = usePublicProfileStore()
    // الحالة الأولية: قصة + رابطان + مهارات + توصيتان + تواصل مفعّل، وإنجازان وعملان
    expect(p.strength.score).toBeGreaterThan(0)
    expect(p.strength.score).toBeLessThanOrEqual(100)
    // إنجازان فقط في الـ seed → النصيحة التالية عن الإنجازات
    expect(p.strength.nextTip).toContain('إنجازات')
    p.addAchievement('إنجاز ثالث ملموس')
    expect(p.strength.nextTip ?? '').not.toContain('إنجازات')
  })

  it('gates sections by subscription tier and owner toggle together', () => {
    const p = usePublicProfileStore()
    p.state.tier = 'free'
    expect(p.canShow('story')).toBe(true)
    expect(p.canShow('portfolio')).toBe(false) // يتطلب الاحترافية
    expect(p.canShow('comments')).toBe(false) // يتطلب النخبة
    p.state.tier = 'pro'
    expect(p.canShow('portfolio')).toBe(true)
    expect(p.canShow('comments')).toBe(false)
    p.state.tier = 'elite'
    expect(p.canShow('comments')).toBe(true)
    p.state.sections.comments = false // مفتاح صاحب الملف يتغلب على الباقة
    expect(p.canShow('comments')).toBe(false)
  })

  it('charges the wallet on upgrade and blocks it when balance is low', () => {
    const p = usePublicProfileStore()
    const wallet = useWalletStore()
    p.state.tier = 'free'
    const before = wallet.available
    expect(p.setTier('pro')).toBe(true)
    expect(wallet.available).toBe(before - 49)
    // تخفيض بلا رسوم
    expect(p.setTier('free')).toBe(true)
    expect(wallet.available).toBe(before - 49)
    // ترقية أكبر من الرصيد تُرفض
    wallet.pay(wallet.available, 'تصفير الرصيد للاختبار')
    expect(p.setTier('elite')).toBe(false)
    expect(p.state.tier).toBe('free')
  })

  it('follows, rates without double counting, and moderates comments', () => {
    const p = usePublicProfileStore()
    const followers = p.state.followersCount
    p.toggleFollow()
    expect(p.state.followersCount).toBe(followers + 1)
    p.toggleFollow()
    expect(p.state.followersCount).toBe(followers)

    const count = p.state.ratingCount
    p.rate(5)
    expect(p.state.ratingCount).toBe(count + 1)
    p.rate(3) // تعديل تقييم الزائر نفسه لا يضيف عدّادًا جديدًا
    expect(p.state.ratingCount).toBe(count + 1)
    expect(p.state.visitorRating).toBe(3)
    expect(p.avgRating).toBeGreaterThan(0)

    const c = p.addComment('زائر', 'تعليق تجريبي')
    expect(p.visibleComments.some(x => x.id === c.id)).toBe(true)
    p.setCommentHidden(c.id, true)
    expect(p.visibleComments.some(x => x.id === c.id)).toBe(false)
    p.removeComment(c.id)
    expect(p.state.comments.some(x => x.id === c.id)).toBe(false)
  })

  it('exposes public url and skill selection subset', () => {
    const p = usePublicProfileStore()
    expect(p.publicPath).toBe(`u/${p.state.slug}`)
    const first = p.publicSkills.length
    p.toggleSkill(p.state.selectedSkillIds[0])
    expect(p.publicSkills.length).toBe(first - 1)
  })
})
