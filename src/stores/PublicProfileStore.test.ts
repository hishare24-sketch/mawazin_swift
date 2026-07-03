import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAccountPlanStore } from './AccountPlanStore'
import { useMessagesStore } from './MessagesStore'
import { useNotificationsStore } from './NotificationsStore'
import { useProfileStore } from './ProfileStore'
import { PROFILE_THEMES, smartPalette, usePublicProfileStore } from './PublicProfileStore'

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

  it('gates sections by the unified account plan and owner toggle together', () => {
    const p = usePublicProfileStore()
    const plan = useAccountPlanStore()
    plan.tier = 'free'
    expect(p.canShow('story')).toBe(true)
    expect(p.canShow('portfolio')).toBe(false) // يتطلب الاحترافية
    expect(p.canShow('comments')).toBe(false) // يتطلب النخبة
    plan.tier = 'pro'
    expect(p.canShow('portfolio')).toBe(true)
    expect(p.canShow('comments')).toBe(false)
    plan.tier = 'elite'
    expect(p.canShow('comments')).toBe(true)
    p.state.sections.comments = false // مفتاح صاحب الملف يتغلب على الباقة
    expect(p.canShow('comments')).toBe(false)
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

  it('applies preset themes for everyone and gates the custom theme by plan', () => {
    const p = usePublicProfileStore()
    const plan = useAccountPlanStore()
    plan.tier = 'free'
    expect(p.themeStyles).toBeNull() // «ثيم المنصة» = لا حقن CSS
    expect(p.setTheme('tech')).toBe(true) // الثيمات الجاهزة متاحة للجميع
    expect(p.themeStyles!['--pp-accent']).toBe(PROFILE_THEMES.tech.accent)
    expect(p.setTheme('custom')).toBe(false) // المخصص يتطلب الاحترافية
    expect(p.state.appearance.theme).toBe('tech')
    plan.tier = 'pro'
    expect(p.setTheme('custom')).toBe(true)
    expect(p.themeStyles!['--pp-accent']).toBe(p.state.appearance.customColor)
    p.setTheme('platform')
    expect(p.themeStyles).toBeNull()
  })

  it('smart theme adapts to device mode and time of day', () => {
    // اللكنة تتبع الوقت: باردة نهارًا ودافئة مساءً
    expect(smartPalette(true, 11).accent).toBe('#38BDF8')
    expect(smartPalette(true, 20).accent).toBe('#F59E0B')
    expect(smartPalette(true, 3).accent).toBe('#F59E0B') // ما قبل الفجر مساءٌ حكمًا
    // القاعدة تتبع جهاز الزائر: خلفية داكنة أو فاتحة
    expect(smartPalette(true, 11).bg).not.toBe(smartPalette(false, 11).bg)
    const p = usePublicProfileStore()
    expect(p.setTheme('smart')).toBe(true) // متاح للجميع كالثيمات الجاهزة
    expect(p.themeStyles).not.toBeNull()
    expect(p.themeStyles!['--pp-accent']).toMatch(/^#(38BDF8|F59E0B)$/)
  })

  it('routes a visitor skill-proof request into the owner pending requests', () => {
    const p = usePublicProfileStore()
    const profile = useProfileStore()
    const notifications = useNotificationsStore()
    const before = profile.pendingProofRequests.length
    expect(p.requestSkillProof('Vue.js', 'ليلى الحربي', 'زميلة سابقة')).toBe(true)
    expect(profile.pendingProofRequests.length).toBe(before + 1)
    expect(profile.pendingProofRequests[0].skill).toBe('Vue.js')
    expect(profile.pendingProofRequests[0].from).toBe('ليلى الحربي')
    expect(notifications.notifications[0].actionTo).toBe('/profile')
  })

  it('schedules a meeting into messages and respects the owner toggle', () => {
    const p = usePublicProfileStore()
    const messages = useMessagesStore()
    const convCount = messages.conversations.length
    const meetings = p.state.meetings
    expect(p.scheduleMeeting('جهة مهتمة', 'الأحد 5 يوليو', '16:00', 'مناقشة تعاون')).toBe(true)
    expect(messages.conversations.length).toBe(convCount + 1)
    expect(messages.conversations[0].messages[0].text).toContain('16:00')
    expect(p.state.meetings).toBe(meetings + 1)
    expect(useNotificationsStore().notifications[0].category).toBe('interview')

    p.state.schedulingEnabled = false // مفتاح صاحب الصفحة يوقف الجدولة
    expect(p.scheduleMeeting('زائر آخر', 'الاثنين', '10:00', '')).toBe(false)
    expect(messages.conversations.length).toBe(convCount + 1)
  })

  it('exposes the professional availability status with its meta', () => {
    const p = usePublicProfileStore()
    expect(p.availabilityMeta.color).toBe('success') // seed: متاح للعمل
    p.state.availability = { status: 'busy', message: 'أُنهي مشروعًا حتى نهاية الشهر' }
    expect(p.availabilityMeta.label).toContain('مشغول')
    expect(p.availabilityMeta.color).toBe('warning')
  })

  it('caps featured skills at five and keeps them within public skills', () => {
    const p = usePublicProfileStore()
    p.state.selectedSkillIds = [1, 2, 3, 4, 5, 6]
    p.state.featuredSkillIds = []
    expect(p.toggleFeaturedSkill(99)).toBe(false) // ليست ضمن المعروض علنًا
    ;[1, 2, 3, 4, 5].forEach(id => expect(p.toggleFeaturedSkill(id)).toBe(true))
    expect(p.toggleFeaturedSkill(6)).toBe(false) // السقف 5 نقاط قوة
    expect(p.state.featuredSkillIds).toHaveLength(5)
    expect(p.toggleFeaturedSkill(1)).toBe(true) // إلغاء التمييز متاح دائمًا
    expect(p.state.featuredSkillIds).not.toContain(1)
  })

  it('migrates old stored sessions to gain new appearance keys', () => {
    // جلسة قديمة اختارت ثيمًا وتوصياتها لا تعرف حقلي الإعجاب
    localStorage.setItem('publicProfile', JSON.stringify({
      appearance: { theme: 'tech' },
      testimonials: [{ id: 9, author: 'قديم', authorRole: 'زميل', initial: 'ق', excerpt: 'نص قديم', visible: true }],
    }))
    setActivePinia(createPinia())
    const p = usePublicProfileStore()
    expect(p.state.appearance.theme).toBe('tech') // اختيار المستخدم محفوظ
    expect(p.state.appearance.experienceView).toBe('timeline') // والجديد يُلحق من الافتراضي
    expect(p.state.appearance.font).toBe('default')
    expect(p.state.appearance.motion).toBe(true)
    expect(p.state.schedulingEnabled).toBe(true)
    expect(p.state.testimonials[0].likes).toBe(0) // تطبيع الإعجابات
    expect(p.state.testimonials[0].visitorLiked).toBe(false)
  })

  it('extends the custom theme with separate colors and saved templates', () => {
    const p = usePublicProfileStore()
    const plan = useAccountPlanStore()
    plan.tier = 'free'
    expect(p.saveThemeTemplate('قالبي')).toBe(false) // القوالب مع المخصص — احترافية فأعلى
    plan.tier = 'pro'
    p.setTheme('custom')
    p.state.appearance.customBg = '#222222'
    p.state.appearance.customText = '#FAFAFA'
    expect(p.themeStyles!['--pp-bg']).toBe('#222222') // الألوان المنفصلة تصل للمتغيرات
    expect(p.themeStyles!['--pp-text']).toBe('#FAFAFA')
    expect(p.saveThemeTemplate('غروب')).toBe(true)
    const t = p.state.savedThemes[0]
    p.state.appearance.customBg = '#000000'
    expect(p.applyThemeTemplate(t.id)).toBe(true) // التطبيق يسترجع ألوان القالب
    expect(p.state.appearance.customBg).toBe('#222222')
    p.removeThemeTemplate(t.id)
    expect(p.state.savedThemes).toHaveLength(0)
  })

  it('lets visitors like and submit testimonials pending owner approval', () => {
    const p = usePublicProfileStore()
    const first = p.state.testimonials[0]
    const likes = first.likes
    p.toggleTestimonialLike(first.id)
    expect(first.likes).toBe(likes + 1)
    p.toggleTestimonialLike(first.id) // التبديل لا يضاعف العدّاد
    expect(first.likes).toBe(likes)

    const tm = p.submitTestimonial('عميل سابق', 'شريك مشروع', 'تعامل راقٍ والتزام كامل بالمواعيد.')
    expect(tm.visible).toBe(false) // لا تظهر قبل موافقة صاحب الصفحة
    expect(p.visibleTestimonials.some(x => x.id === tm.id)).toBe(false)
    p.toggleTestimonial(tm.id)
    expect(p.visibleTestimonials.some(x => x.id === tm.id)).toBe(true)
    expect(useNotificationsStore().notifications[0].title).toContain('توصية')
  })

  it('reorders main sections within bounds and persists the order', async () => {
    const p = usePublicProfileStore()
    expect(p.state.sectionOrder[0]).toBe('story')
    p.moveSection('story', -1) // عند الحد الأعلى لا يتحرك
    expect(p.state.sectionOrder[0]).toBe('story')
    p.moveSection('story', 1)
    expect(p.state.sectionOrder.indexOf('story')).toBe(1)
    await Promise.resolve()
    await Promise.resolve()
    expect(JSON.parse(localStorage.getItem('publicProfile')!).sectionOrder[1]).toBe('story')
  })

  it('supports drag-reorder, real avatar image, and custom links', () => {
    const p = usePublicProfileStore()
    // نقل بالسحب من موضع لموضع (لا مجرد تبديل جيران)
    expect(p.state.sectionOrder.join(',')).toBe('story,achievements,experience,portfolio')
    p.reorderSection(0, 2)
    expect(p.state.sectionOrder.join(',')).toBe('achievements,experience,story,portfolio')
    p.reorderSection(9, 0) // خارج الحدود — لا تغيير
    expect(p.state.sectionOrder).toHaveLength(4)

    p.setAvatarImage('data:image/jpeg;base64,abc')
    expect(p.state.avatarImage).toContain('data:image')
    p.setAvatarImage(null) // العودة للحرف الأول
    expect(p.state.avatarImage).toBeNull()

    const n = p.state.customLinks.length
    expect(p.addCustomLink('مدونة', 'https://blog.example')).toBe(true)
    expect(p.addCustomLink('', 'https://x.example')).toBe(false) // تسمية فارغة تُرفض
    expect(p.state.customLinks).toHaveLength(n + 1)
    p.removeCustomLink(p.state.customLinks[p.state.customLinks.length - 1].id)
    expect(p.state.customLinks).toHaveLength(n)
  })

  it('exposes public url and skill selection subset', () => {
    const p = usePublicProfileStore()
    expect(p.publicPath).toBe(`u/${p.state.slug}`)
    const first = p.publicSkills.length
    p.toggleSkill(p.state.selectedSkillIds[0])
    expect(p.publicSkills.length).toBe(first - 1)
  })
})
