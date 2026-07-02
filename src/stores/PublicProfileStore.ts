import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { UserRole } from '@/interfaces/Auth'
import { useAuthStore } from '@/stores/AuthStore'
import { useWalletStore } from '@/stores/WalletStore'
import { useExpertRolesStore } from '@/stores/ExpertRolesStore'
import { useInterviewersStore } from '@/stores/InterviewersStore'
import { useInterviewsStore } from '@/stores/InterviewsStore'
import { useMessagesStore } from '@/stores/MessagesStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { usePostedOpportunitiesStore } from '@/stores/PostedOpportunitiesStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { useRoleProfilesStore } from '@/stores/RoleProfilesStore'
import { useTrustStore } from '@/stores/TrustStore'

// ===== الصفحة التعريفية العامة — هوية المستخدم أمام العالم (لكل الأدوار بلا استثناء) =====
// الدستور: الملف الخاص بياناتي (لوحة قياس)، والصفحة العامة سردية تسويقية بمحتوى يختاره صاحبها.

/** إنجاز في الصفحة العامة: ما يكتبه المستخدم «مُصرَّح ذاتيًا»، وما تشتقه المنصة «موثّق» */
export interface PublicAchievement {
  id: number
  text: string
  kind: 'self' | 'verified'
}

export interface PortfolioItem {
  id: number
  title: string
  desc: string
  link?: string
  tag: string
}

/** توصية واردة — لا تظهر علنًا إلا بتفعيل صاحب الملف لها */
export interface Testimonial {
  id: number
  author: string
  authorRole: string
  initial: string
  excerpt: string
  visible: boolean
}

export interface ContactLinks {
  linkedin?: string
  github?: string
  twitter?: string
  website?: string
  instagram?: string
  youtube?: string
  behance?: string
}

export interface PublicSections {
  stats: boolean
  story: boolean
  achievements: boolean
  testimonials: boolean
  skills: boolean
  experience: boolean
  portfolio: boolean
  roles: boolean
  followers: boolean
  ratings: boolean
  comments: boolean
}

/** تعليق زائر على الصفحة — صاحبها يشرف عليه (إخفاء/حذف) */
export interface PageComment {
  id: number
  author: string
  initial: string
  text: string
  date: string
  hidden: boolean
}

// ===== باقات الاشتراك — الباقة تحدد أقسام الصفحة المتاحة للإظهار =====
export type ProfileTier = 'free' | 'pro' | 'elite'

export const TIER_META: Record<ProfileTier, { label: string, price: number, color: string, icon: string, pitch: string }> = {
  free: { label: 'الأساسية', price: 0, color: 'surface-variant', icon: 'mdi-account-outline', pitch: 'هويتك الأساسية: القصة والمهارات والمصداقية' },
  pro: { label: 'الاحترافية', price: 49, color: 'primary', icon: 'mdi-briefcase-outline', pitch: 'أضف الإنجازات والخبرات ومعرض الأعمال والتوصيات وشارات الأدوار' },
  elite: { label: 'النخبة', price: 99, color: 'accent', icon: 'mdi-crown-outline', pitch: 'التفاعل الكامل: متابعون وتقييم الزوار وتعليقاتهم' },
}

const TIER_RANK: Record<ProfileTier, number> = { free: 0, pro: 1, elite: 2 }

/** الحد الأدنى من الباقة لكل قسم */
export const SECTION_TIER: Record<keyof PublicSections, ProfileTier> = {
  stats: 'free',
  story: 'free',
  skills: 'free',
  achievements: 'pro',
  testimonials: 'pro',
  experience: 'pro',
  portfolio: 'pro',
  roles: 'pro',
  followers: 'elite',
  ratings: 'elite',
  comments: 'elite',
}

interface PublicProfileState {
  slug: string
  displayName: string
  publicHeadline: string
  location: string
  /** السرد الممتد — قصة المستخدم بلغة النتائج لا لغة البيانات */
  story: string
  contactEnabled: boolean
  links: ContactLinks
  tier: ProfileTier
  sections: PublicSections
  /** المهارات المختارة للعرض العام (قد تكون مجموعة جزئية من مهارات الملف الخاص) */
  selectedSkillIds: number[]
  achievements: PublicAchievement[]
  portfolio: PortfolioItem[]
  testimonials: Testimonial[]
  views: number
  shares: number
  contacts: number
  // —— التفاعل الاجتماعي ——
  followersCount: number
  /** حالة زائر هذا المتصفح (محاكاة الطرف الآخر في العرض) */
  visitorFollows: boolean
  ratingSum: number
  ratingCount: number
  visitorRating: number
  comments: PageComment[]
}

const STORAGE_KEY = 'publicProfile'

const seed: PublicProfileState = {
  slug: 'ahmed-almansour',
  displayName: 'أحمد المنصور',
  publicHeadline: 'مطوّر واجهات أمامية أول — Vue.js / TypeScript',
  location: 'الرياض، السعودية',
  story: 'أبني واجهات ويب سريعة وقابلة للتوسّع منذ خمس سنوات. أؤمن أن أفضل واجهة هي التي لا يلاحظها المستخدم — تعمل فحسب. عملت على منتجات وصلت لآلاف المستخدمين، وأبحث اليوم عن فريق يصنع منتجًا رقميًا مؤثرًا أنمو معه وأضيف إليه.',
  contactEnabled: true,
  links: {
    linkedin: 'https://linkedin.com/in/ahmed-almansour',
    github: 'https://github.com/ahmed-almansour',
    twitter: 'https://x.com/ahmed_dev',
  },
  tier: 'elite',
  sections: { stats: true, story: true, achievements: true, testimonials: true, skills: true, experience: true, portfolio: true, roles: true, followers: true, ratings: true, comments: true },
  selectedSkillIds: [1, 2, 3],
  achievements: [
    { id: 1, text: 'خفّضت زمن تحميل لوحة تحكم رئيسية بنسبة 40% بإعادة هيكلة تحميل الحزم', kind: 'self' },
    { id: 2, text: 'قدت فريقًا من 4 مطورين لإطلاق تطبيق حجوزات خلال 3 أشهر', kind: 'self' },
  ],
  portfolio: [
    { id: 1, title: 'لوحة تحكم تحليلات فورية', desc: 'واجهة Vue 3 تعرض ملايين النقاط لحظيًا عبر WebSocket مع رسوم تفاعلية.', link: 'https://github.com/ahmed-almansour/live-analytics', tag: 'Vue 3' },
    { id: 2, title: 'نظام تصميم مفتوح المصدر', desc: 'مكتبة مكوّنات RTL موثّقة بالكامل تستخدمها ثلاث شركات ناشئة.', tag: 'Design System' },
  ],
  testimonials: [
    { id: 1, author: 'خالد العتيبي', authorRole: 'مدير هندسة سابق', initial: 'خ', excerpt: 'من أكثر المطورين الذين عملت معهم انضباطًا بالتسليم — يحوّل الغموض إلى خطة والخطة إلى منتج.', visible: true },
    { id: 2, author: 'سارة الشمري', authorRole: 'زميلة عمل', initial: 'س', excerpt: 'مراجعاته للكود دروس مصغّرة؛ رفع مستوى الفريق كله خلال أشهر.', visible: true },
    { id: 3, author: 'م. خالد الشمري', authorRole: 'مقيّم تقني معتمد', initial: 'خ', excerpt: 'اجتاز تقييمًا تقنيًا معمّقًا بأداء يضعه في أعلى 10% من المرشحين الذين قابلتهم.', visible: false },
  ],
  views: 128,
  shares: 9,
  contacts: 4,
  followersCount: 214,
  visitorFollows: false,
  ratingSum: 173,
  ratingCount: 37,
  visitorRating: 0,
  comments: [
    { id: 1, author: 'نورة القحطاني', initial: 'ن', text: 'تعاملت معه في مشروع سابق — احترافية والتزام يستحقان الإشادة.', date: '2026-06-27', hidden: false },
    { id: 2, author: 'فهد العنزي', initial: 'ف', text: 'معرض أعماله يتحدث عنه. بالتوفيق!', date: '2026-06-24', hidden: false },
  ],
}

function load(): PublicProfileState {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    const base = structuredClone(seed)
    // دمج عميق للكائنات المتداخلة كي تكتسب الجلسات القديمة المفاتيح الجديدة
    return {
      ...base,
      ...stored,
      links: { ...base.links, ...(stored.links ?? {}) },
      sections: { ...base.sections, ...(stored.sections ?? {}) },
    }
  }
  catch {
    return structuredClone(seed)
  }
}

let nextId = 800

export const usePublicProfileStore = defineStore('publicProfile', () => {
  const state = ref<PublicProfileState>(load())
  watch(state, v => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

  const auth = useAuthStore()
  const profile = useProfileStore()
  const trust = useTrustStore()
  const interviews = useInterviewsStore()

  /** اسم العرض: اسم الحساب إن وُجد وإلا الاسم المحفوظ في الصفحة */
  const displayName = computed(() => auth.authUser?.name ?? state.value.displayName)

  // —— حقائق موثّقة من المنصة (لا يحررها المستخدم) ——
  const verifiedFacts = computed(() => {
    const proofsCount = profile.skills.reduce((s, sk) => s + sk.proofs.length, 0)
    return [
      { label: 'مصداقية الملف', value: `${trust.score}%`, icon: 'mdi-shield-check-outline' },
      { label: 'إثباتات موثّقة', value: proofsCount, icon: 'mdi-check-decagram-outline' },
      { label: 'مقابلات تقييمية', value: interviews.completed.length, icon: 'mdi-account-tie-voice-outline' },
      { label: 'توصيات معلنة', value: visibleTestimonials.value.length, icon: 'mdi-comment-quote-outline' },
    ]
  })

  /** المهارات المختارة للعرض العام مع عدد إثباتات كل مهارة */
  const publicSkills = computed(() =>
    profile.skills.filter(s => state.value.selectedSkillIds.includes(s.id)),
  )

  const visibleTestimonials = computed(() => state.value.testimonials.filter(t => t.visible))

  /**
   * فسيفساء الأدوار: شارة لكل دور نشط بحقائق عامة آمنة —
   * تظهر فقط إذا فعّل المستخدم «ربط أدواري علنًا» (نفس مفتاح RoleProfilesStore)
   */
  const roleBadges = computed(() => {
    const roleProfiles = useRoleProfilesStore()
    if (!roleProfiles.linkRolesPublicly || !canShow('roles'))
      return []
    const badges: { role: UserRole, fact: string }[] = []
    if (auth.ownsRole('interviewer')) {
      const s = useInterviewersStore().interviewerStats
      badges.push({ role: 'interviewer', fact: `مقيّم معتمد · ${s.sessions + 103} جلسة · ${s.avgRating} ★` })
    }
    if (auth.ownsRole('company'))
      badges.push({ role: 'company', fact: `جهة توظيف · ${usePostedOpportunitiesStore().publishedCount} فرصة منشورة` })
    if (auth.ownsRole('coach'))
      badges.push({ role: 'coach', fact: `مرشد مهني · ${useExpertRolesStore().coachStats.clients} عملاء` })
    if (auth.ownsRole('trainer'))
      badges.push({ role: 'trainer', fact: `مدرب تقني · ${useExpertRolesStore().trainerStats.trainees} متدربًا` })
    if (auth.ownsRole('consultant'))
      badges.push({ role: 'consultant', fact: `مستشار مهني · ${useExpertRolesStore().consultantStats.done} استشارة منجزة` })
    return badges
  })

  // —— عدّادات الجذب ——
  function recordView() {
    state.value.views++
  }
  function recordShare() {
    state.value.shares++
  }

  // —— إدارة المحتوى ——
  function addAchievement(text: string) {
    state.value.achievements.push({ id: nextId++, text, kind: 'self' })
  }
  function removeAchievement(id: number) {
    state.value.achievements = state.value.achievements.filter(a => a.id !== id)
  }
  function addPortfolio(item: Omit<PortfolioItem, 'id'>) {
    state.value.portfolio.push({ ...item, id: nextId++ })
  }
  function removePortfolio(id: number) {
    state.value.portfolio = state.value.portfolio.filter(p => p.id !== id)
  }
  function toggleTestimonial(id: number) {
    const t = state.value.testimonials.find(x => x.id === id)
    if (t)
      t.visible = !t.visible
  }
  function toggleSkill(skillId: number) {
    const list = state.value.selectedSkillIds
    state.value.selectedSkillIds = list.includes(skillId)
      ? list.filter(x => x !== skillId)
      : [...list, skillId]
  }

  // ===== الباقة والبوابات =====
  /** هل يسمح مستوى الباقة بإظهار هذا القسم؟ (بمعزل عن مفتاح الإظهار) */
  function tierAllows(key: keyof PublicSections): boolean {
    return TIER_RANK[state.value.tier] >= TIER_RANK[SECTION_TIER[key]]
  }
  /** القسم يظهر للزوار فقط إذا سمحت الباقة وفعّله صاحب الملف */
  function canShow(key: keyof PublicSections): boolean {
    return tierAllows(key) && state.value.sections[key]
  }
  /** ترقية/تخفيض الباقة — الترقية مدفوعة من المحفظة (محاكاة اشتراك شهري) */
  function setTier(tier: ProfileTier): boolean {
    if (tier === state.value.tier)
      return true
    const upgrade = TIER_RANK[tier] > TIER_RANK[state.value.tier]
    if (upgrade) {
      const paid = useWalletStore().pay(TIER_META[tier].price, `اشتراك باقة «${TIER_META[tier].label}» — الصفحة التعريفية`)
      if (!paid)
        return false
    }
    state.value.tier = tier
    useNotificationsStore().push({
      icon: TIER_META[tier].icon,
      color: upgrade ? 'success' : 'info',
      title: upgrade ? `ترقّيت إلى باقة «${TIER_META[tier].label}»` : `انتقلت إلى باقة «${TIER_META[tier].label}»`,
      body: TIER_META[tier].pitch,
      category: 'system',
      actionTo: '/my-public-profile',
      actionLabel: 'إدارة صفحتي',
    })
    return true
  }

  // ===== التفاعل الاجتماعي (جانب الزائر) =====
  function toggleFollow() {
    state.value.visitorFollows = !state.value.visitorFollows
    state.value.followersCount += state.value.visitorFollows ? 1 : -1
    if (state.value.visitorFollows) {
      useNotificationsStore().push({
        icon: 'mdi-account-heart-outline',
        color: 'accent',
        title: 'متابع جديد لصفحتك',
        body: 'انضم متابع جديد إلى جمهور صفحتك التعريفية.',
        category: 'system',
        actionTo: '/my-public-profile',
        actionLabel: 'مؤشرات صفحتي',
      })
    }
  }

  const avgRating = computed(() =>
    state.value.ratingCount ? Math.round((state.value.ratingSum / state.value.ratingCount) * 10) / 10 : 0,
  )
  /** تقييم الزائر للصفحة — تعديل تقييمه السابق لا يضاعف العدّاد */
  function rate(stars: number) {
    if (stars < 1 || stars > 5)
      return
    if (state.value.visitorRating) {
      state.value.ratingSum += stars - state.value.visitorRating
    }
    else {
      state.value.ratingSum += stars
      state.value.ratingCount++
    }
    state.value.visitorRating = stars
  }

  const visibleComments = computed(() => state.value.comments.filter(c => !c.hidden))
  function addComment(author: string, text: string) {
    const c: PageComment = {
      id: nextId++,
      author,
      initial: author.trim().charAt(0),
      text: text.trim(),
      date: new Date().toISOString().slice(0, 10),
      hidden: false,
    }
    state.value.comments.unshift(c)
    useNotificationsStore().push({
      icon: 'mdi-comment-account-outline',
      color: 'info',
      title: 'تعليق جديد على صفحتك',
      body: `${author}: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`,
      category: 'system',
      actionTo: '/my-public-profile',
      actionLabel: 'إدارة التعليقات',
    })
    return c
  }
  function setCommentHidden(id: number, hidden: boolean) {
    const c = state.value.comments.find(x => x.id === id)
    if (c)
      c.hidden = hidden
  }
  function removeComment(id: number) {
    state.value.comments = state.value.comments.filter(c => c.id !== id)
  }

  /** «تواصل معي»: رسالة من زائر تدخل صندوق رسائل صاحب الملف مباشرة */
  function contact(visitorName: string, text: string) {
    if (!state.value.contactEnabled)
      return false
    useMessagesStore().startConversation(visitorName, 'زائر عبر صفحتك التعريفية', text)
    state.value.contacts++
    useNotificationsStore().push({
      icon: 'mdi-account-arrow-left-outline',
      color: 'accent',
      title: 'رسالة من صفحتك التعريفية',
      body: `${visitorName}: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`,
      category: 'message',
      actionTo: '/messages',
      actionLabel: 'فتح المحادثة',
    })
    return true
  }

  /** قوة الصفحة العامة (0-100) + نصيحة التحسين التالية — يحوّل التحسين لعبة مستمرة */
  const strength = computed(() => {
    const checks: { ok: boolean, tip: string, pts: number }[] = [
      { ok: state.value.story.length >= 80, tip: 'اكتب قصتك المهنية بلغة النتائج (80 حرفًا فأكثر)', pts: 20 },
      { ok: state.value.achievements.length >= 3, tip: 'أضف 3 إنجازات ملموسة بصيغة أرقام («خفّضت… بنسبة…»)', pts: 20 },
      { ok: state.value.portfolio.length >= 2, tip: 'أضف عملين على الأقل لمعرض أعمالك', pts: 15 },
      { ok: visibleTestimonials.value.length >= 2, tip: 'فعّل ظهور توصيتين على الأقل — الدليل الاجتماعي أقوى حجة', pts: 15 },
      { ok: !!(state.value.links.linkedin || state.value.links.github || state.value.links.website), tip: 'أضف رابط تواصل خارجيًا واحدًا على الأقل (LinkedIn/GitHub)', pts: 10 },
      { ok: publicSkills.value.length >= 3, tip: 'أظهر 3 مهارات على الأقل في صفحتك', pts: 10 },
      { ok: state.value.contactEnabled, tip: 'فعّل زر «تواصل معي» ليصل إليك المهتمون مباشرة', pts: 10 },
    ]
    const score = checks.filter(c => c.ok).reduce((s, c) => s + c.pts, 0)
    const nextTip = checks.find(c => !c.ok)?.tip
    return { score, nextTip }
  })

  const publicPath = computed(() => `u/${state.value.slug}`)
  const publicUrl = computed(() => `${window.location.origin}${import.meta.env.BASE_URL}${publicPath.value}`)
  function shareOnLinkedIn() {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl.value)}`, '_blank', 'noopener')
    recordShare()
  }

  return {
    state, displayName,
    verifiedFacts, publicSkills, visibleTestimonials, roleBadges,
    recordView, recordShare,
    addAchievement, removeAchievement,
    addPortfolio, removePortfolio,
    toggleTestimonial, toggleSkill,
    contact, strength,
    tierAllows, canShow, setTier,
    toggleFollow, avgRating, rate,
    visibleComments, addComment, setCommentHidden, removeComment,
    publicPath, publicUrl, shareOnLinkedIn,
  }
})
