import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { UserRole } from '@/interfaces/Auth'
import type { AccountTier } from '@/stores/AccountPlanStore'
import { TIER_RANK, useAccountPlanStore } from '@/stores/AccountPlanStore'
import { useAuthStore } from '@/stores/AuthStore'
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
  /** صورة العمل (dataURL مصغّرة) — تحل محل التدرّج اللوني المشتق */
  image?: string
}

/** رابط مخصص لأي منصة خارج القائمة الجاهزة */
export interface CustomLink {
  id: number
  label: string
  url: string
}

/** توصية واردة — لا تظهر علنًا إلا بتفعيل صاحب الملف لها */
export interface Testimonial {
  id: number
  author: string
  authorRole: string
  initial: string
  excerpt: string
  visible: boolean
  /** إعجابات الزوار بالتوصية */
  likes: number
  visitorLiked: boolean
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

// ===== المظهر: ثيمات الصفحة والحالة المهنية =====
// «جمالية تأسر العين، وسهولة تأسر القلب» — الثيم هوية بصرية كاملة لا مجرد لون.

export type ProfileThemeKey = 'platform' | 'smart' | 'professional' | 'tech' | 'creative' | 'innovator' | 'serene' | 'dark' | 'light' | 'custom'
export type AvatarShape = 'circle' | 'rounded' | 'square'
export type AvailabilityStatus = 'available' | 'busy' | 'unavailable'

export interface ProfileThemePalette {
  label: string
  hint: string
  bg: string
  surface: string
  text: string
  muted: string
  accent: string
  onAccent: string
  heroFrom: string
  heroTo: string
}

/** الثيمات الجاهزة — كل ثيم شخصية مهنية (platform = يتبع ثيم المنصة، custom = من لون المستخدم) */
export const PROFILE_THEMES: Record<Exclude<ProfileThemeKey, 'platform' | 'smart' | 'custom'>, ProfileThemePalette> = {
  professional: { label: 'الاحترافي', hint: 'أزرق داكن هادئ — مستشارون ومدراء', bg: '#F4F7FB', surface: '#FFFFFF', text: '#1A2433', muted: '#5A6B7F', accent: '#1A365D', onAccent: '#FFFFFF', heroFrom: '#1A365D', heroTo: '#2C5282' },
  tech: { label: 'التقني', hint: 'أزرق كهربائي على داكن — مطورون ومهندسون', bg: '#0D1B2A', surface: '#152638', text: '#E3F2FA', muted: '#8FA9BC', accent: '#00B4D8', onAccent: '#04222D', heroFrom: '#0D1B2A', heroTo: '#0A3552' },
  creative: { label: 'الإبداعي', hint: 'أرجواني ووردي — مصممون وفنانون', bg: '#FBF7FF', surface: '#FFFFFF', text: '#2A1B3D', muted: '#7B6B8F', accent: '#7B2FBE', onAccent: '#FFFFFF', heroFrom: '#7B2FBE', heroTo: '#FF6B6B' },
  innovator: { label: 'المبتكر', hint: 'ذهبي على أسود — روّاد أعمال', bg: '#141414', surface: '#1F1F1F', text: '#F5EFDC', muted: '#A79E85', accent: '#FFD700', onAccent: '#1A1A1A', heroFrom: '#1A1A1A', heroTo: '#4A3B00' },
  serene: { label: 'الهادئ', hint: 'أخضر زيتي وبيج — مدربون ومستشارون', bg: '#F5F5DC', surface: '#FFFFFF', text: '#2B3A2C', muted: '#6E7B67', accent: '#2E7D32', onAccent: '#FFFFFF', heroFrom: '#2E7D32', heroTo: '#557C46' },
  dark: { label: 'الداكن', hint: 'أسود متدرج — عشاق الوضع الليلي', bg: '#121212', surface: '#1E1E1E', text: '#EDEDED', muted: '#9A9A9A', accent: '#90CAF9', onAccent: '#0B1620', heroFrom: '#161616', heroTo: '#2A2A2A' },
  light: { label: 'الفاتح', hint: 'أبيض وأزرق خفيف — الخيار الكلاسيكي', bg: '#F7FAFC', surface: '#FFFFFF', text: '#2D3748', muted: '#718096', accent: '#3182CE', onAccent: '#FFFFFF', heroFrom: '#2B6CB0', heroTo: '#4299E1' },
}

/** نص داكن أم فاتح فوق لون معيّن؟ (استدلال إضاءة بسيط) */
function readableOn(hex: string): string {
  const n = hex.replace('#', '')
  if (n.length !== 6)
    return '#FFFFFF'
  const lum = 0.299 * parseInt(n.slice(0, 2), 16) + 0.587 * parseInt(n.slice(2, 4), 16) + 0.114 * parseInt(n.slice(4, 6), 16)
  return lum > 150 ? '#101418' : '#FFFFFF'
}

function customPalette(a: ProfileAppearance): ProfileThemePalette {
  return {
    label: 'المخصص',
    hint: 'لونك أنت',
    bg: a.customBg,
    surface: a.customSurface,
    text: a.customText,
    muted: `${a.customText}99`,
    accent: a.customColor,
    onAccent: readableOn(a.customColor),
    heroFrom: a.customBg,
    heroTo: `${a.customColor}59`,
  }
}

/**
 * الثيم الذكي (6.3): القاعدة (فاتح/داكن) تتبع جهاز الزائر،
 * واللكنة تتبع وقت اليوم — دافئة مساءً وباردة نهارًا.
 */
export function smartPalette(dark: boolean, hour: number): ProfileThemePalette {
  const evening = hour >= 17 || hour < 6
  const accent = evening ? '#F59E0B' : '#38BDF8'
  const heroDeep = evening ? '#B45309' : '#0369A1'
  const base = dark
    ? { bg: '#12161C', surface: '#1B222B', text: '#ECEFF3', muted: '#9AA6B2', heroFrom: '#141A22', heroTo: heroDeep }
    : { bg: '#F6F8FA', surface: '#FFFFFF', text: '#22303C', muted: '#64748B', heroFrom: heroDeep, heroTo: accent }
  return { label: 'الذكي', hint: 'يتبع جهاز الزائر ووقت اليوم', accent, onAccent: readableOn(accent), ...base }
}

export const AVAILABILITY_META: Record<AvailabilityStatus, { label: string, color: string }> = {
  available: { label: 'متاح للعمل', color: 'success' },
  busy: { label: 'مشغول بمشروع', color: 'warning' },
  unavailable: { label: 'غير متاح حاليًا', color: 'error' },
}

/** خطوط الصفحة — تُحمَّل من Google Fonts عند الاختيار */
export const PROFILE_FONTS = {
  default: { label: 'خط المنصة', family: '' },
  tajawal: { label: 'Tajawal — عصري', family: 'Tajawal' },
  cairo: { label: 'Cairo — واضح', family: 'Cairo' },
  almarai: { label: 'Almarai — ناعم', family: 'Almarai' },
  amiri: { label: 'Amiri — كلاسيكي', family: 'Amiri' },
} as const
export type ProfileFont = keyof typeof PROFILE_FONTS

export interface ProfileAppearance {
  theme: ProfileThemeKey
  /** ألوان الثيم المخصص (hex): اللكنة والخلفية والبطاقات والنص */
  customColor: string
  customBg: string
  customSurface: string
  customText: string
  /** خط الصفحة — مستقل عن الثيم */
  font: ProfileFont
  avatarShape: AvatarShape
  /** إطار ملون حول الصورة الشخصية بلون اللكنة */
  avatarRing: boolean
  /** تأثيرات الحركة (تلاشي/نبض/عدّاد تصاعدي) — قابلة للإيقاف */
  motion: boolean
  /** نمط عرض الخبرات: محور زمني تفاعلي أو قائمة سردية */
  experienceView: 'timeline' | 'list'
}

/** قالب ثيم محفوظ من المستخدم (ميزة الاحترافية مع الثيم المخصص) */
export interface SavedTheme {
  id: number
  name: string
  accent: string
  bg: string
  surface: string
  text: string
}

export interface Availability {
  status: AvailabilityStatus
  /** رسالة مخصصة تظهر بجانب الحالة */
  message: string
}

/** أقسام العمود الرئيسي القابلة لإعادة الترتيب من الإعدادات */
export const ORDERABLE_SECTIONS = ['story', 'achievements', 'experience', 'portfolio'] as const
export type OrderableSection = typeof ORDERABLE_SECTIONS[number]

// ===== التمكين حسب باقة الحساب الموحّدة (AccountPlanStore) =====
// «لا فرق بين الحسابات ولا الأدوار — الباقة وحدها تحدد التمكين»
export type ProfileTier = AccountTier

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
  /** منطقة زمنية للعمل عن بُعد (اختياري) */
  timezone: string
  /** الصورة الشخصية الحقيقية (dataURL مصغّرة) — null = الحرف الأول */
  avatarImage: string | null
  /** السرد الممتد — قصة المستخدم بلغة النتائج لا لغة البيانات */
  story: string
  /** النبذة المختصرة — جملتان تظهران قبل «اقرأ المزيد» */
  bioShort: string
  /** كلمات مفتاحية تظهر كهاشتاغات أسفل النبذة */
  keywords: string[]
  /** العبارة المؤثرة — جملة قصيرة تلخّص الرسالة («أبني حلولًا تترك أثرًا») */
  tagline: string
  availability: Availability
  appearance: ProfileAppearance
  /** قوالب ثيمات حفظها المستخدم */
  savedThemes: SavedTheme[]
  /** ترتيب أقسام العمود الرئيسي كما يظهر للزوار */
  sectionOrder: OrderableSection[]
  /** المهارات الرئيسية «نقاط القوة» — حتى 5 مهارات تُبرز في أعلى المهارات */
  featuredSkillIds: number[]
  contactEnabled: boolean
  /** روابط مخصصة لمنصات خارج القائمة الجاهزة */
  customLinks: CustomLink[]
  /** زر «جدولة مقابلة» على الصفحة العامة */
  schedulingEnabled: boolean
  /** عدّاد طلبات المواعيد الواردة من الصفحة */
  meetings: number
  links: ContactLinks
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
  timezone: 'GMT+3',
  avatarImage: null,
  story: 'أبني واجهات ويب سريعة وقابلة للتوسّع منذ خمس سنوات. أؤمن أن أفضل واجهة هي التي لا يلاحظها المستخدم — تعمل فحسب. عملت على منتجات وصلت لآلاف المستخدمين، وأبحث اليوم عن فريق يصنع منتجًا رقميًا مؤثرًا أنمو معه وأضيف إليه.',
  bioShort: 'مطوّر واجهات يحوّل الأفكار إلى منتجات يستخدمها الآلاف — خمس سنوات من البناء بلا توقف.',
  keywords: ['تطوير_ويب', 'Vue', 'قيادة_تقنية'],
  tagline: 'أبني حلولًا تقنية تترك أثرًا',
  availability: { status: 'available', message: 'منفتح على فرص Vue/TypeScript — عن بُعد أو في الرياض' },
  appearance: { theme: 'platform', customColor: '#7B2FBE', customBg: '#101418', customSurface: '#1A2027', customText: '#ECEFF3', font: 'default', avatarShape: 'circle', avatarRing: true, motion: true, experienceView: 'timeline' },
  savedThemes: [],
  sectionOrder: ['story', 'achievements', 'experience', 'portfolio'],
  featuredSkillIds: [1, 2],
  contactEnabled: true,
  customLinks: [{ id: 1, label: 'مدونتي التقنية', url: 'https://dev.to/ahmed-almansour' }],
  schedulingEnabled: true,
  meetings: 1,
  links: {
    linkedin: 'https://linkedin.com/in/ahmed-almansour',
    github: 'https://github.com/ahmed-almansour',
    twitter: 'https://x.com/ahmed_dev',
  },
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
    { id: 1, author: 'خالد العتيبي', authorRole: 'مدير هندسة سابق', initial: 'خ', excerpt: 'من أكثر المطورين الذين عملت معهم انضباطًا بالتسليم — يحوّل الغموض إلى خطة والخطة إلى منتج.', visible: true, likes: 4, visitorLiked: false },
    { id: 2, author: 'سارة الشمري', authorRole: 'زميلة عمل', initial: 'س', excerpt: 'مراجعاته للكود دروس مصغّرة؛ رفع مستوى الفريق كله خلال أشهر.', visible: true, likes: 2, visitorLiked: false },
    { id: 3, author: 'م. خالد الشمري', authorRole: 'مقيّم تقني معتمد', initial: 'خ', excerpt: 'اجتاز تقييمًا تقنيًا معمّقًا بأداء يضعه في أعلى 10% من المرشحين الذين قابلتهم.', visible: false, likes: 0, visitorLiked: false },
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
    // ترتيب الأقسام: نحافظ على ترتيب المستخدم ونُلحق أي أقسام جديدة لم يعرفها تخزينه القديم
    const storedOrder: string[] = Array.isArray(stored.sectionOrder) ? stored.sectionOrder : []
    const sectionOrder = [
      ...storedOrder.filter((k): k is OrderableSection => (ORDERABLE_SECTIONS as readonly string[]).includes(k)),
      ...ORDERABLE_SECTIONS.filter(k => !storedOrder.includes(k)),
    ]
    // التوصيات المخزنة قديمًا لا تعرف حقلي الإعجاب — تُطبَّع بأصفار
    const testimonials = ((stored.testimonials ?? base.testimonials) as Testimonial[])
      .map(t => ({ ...t, likes: t.likes ?? 0, visitorLiked: t.visitorLiked ?? false }))
    return {
      ...base,
      ...stored,
      links: { ...base.links, ...(stored.links ?? {}) },
      sections: { ...base.sections, ...(stored.sections ?? {}) },
      availability: { ...base.availability, ...(stored.availability ?? {}) },
      appearance: { ...base.appearance, ...(stored.appearance ?? {}) },
      sectionOrder,
      testimonials,
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

  // ===== المظهر والحالة =====
  const availabilityMeta = computed(() => AVAILABILITY_META[state.value.availability.status])

  // —— مدخلات الثيم الذكي: وضع جهاز الزائر ووقت اليوم ——
  const systemDark = ref(true)
  const hourOfDay = ref(new Date().getHours())
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = mq.matches
    mq.addEventListener('change', e => (systemDark.value = e.matches))
  }
  catch { /* بيئات بلا matchMedia (اختبارات) — يبقى الافتراضي داكنًا */ }

  /**
   * متغيرات CSS للثيم المختار — null يعني «اتبع ثيم المنصة» (السلوك الافتراضي القديم).
   * تُحقن في جذر الصفحة العامة فتصبغ الخلفية والبطاقات والألوان دون المساس بثيم التطبيق.
   */
  const themeStyles = computed<Record<string, string> | null>(() => {
    const a = state.value.appearance
    if (a.theme === 'platform')
      return null
    const p = a.theme === 'custom'
      ? customPalette(a)
      : a.theme === 'smart'
        ? smartPalette(systemDark.value, hourOfDay.value)
        : PROFILE_THEMES[a.theme]
    return {
      '--pp-bg': p.bg,
      '--pp-surface': p.surface,
      '--pp-text': p.text,
      '--pp-muted': p.muted,
      '--pp-accent': p.accent,
      '--pp-on-accent': p.onAccent,
      '--pp-hero-from': p.heroFrom,
      '--pp-hero-to': p.heroTo,
    }
  })

  /** الثيمات الجاهزة للجميع؛ الثيم المخصص ميزة «الاحترافية» فأعلى */
  function setTheme(key: ProfileThemeKey): boolean {
    if (key === 'custom' && !useAccountPlanStore().atLeast('pro'))
      return false
    state.value.appearance.theme = key
    return true
  }

  /** خط الصفحة المختار (اسم عائلة Google Fonts) — null يعني خط المنصة */
  const fontFamily = computed(() => PROFILE_FONTS[state.value.appearance.font].family || null)

  // —— قوالب الثيم المحفوظة (مع الثيم المخصص — احترافية فأعلى) ——
  function saveThemeTemplate(name: string): boolean {
    if (!useAccountPlanStore().atLeast('pro'))
      return false
    const a = state.value.appearance
    state.value.savedThemes.push({
      id: nextId++,
      name: name.trim() || `قالبي ${state.value.savedThemes.length + 1}`,
      accent: a.customColor,
      bg: a.customBg,
      surface: a.customSurface,
      text: a.customText,
    })
    return true
  }
  function applyThemeTemplate(id: number): boolean {
    const t = state.value.savedThemes.find(x => x.id === id)
    if (!t || !setTheme('custom'))
      return false
    Object.assign(state.value.appearance, { customColor: t.accent, customBg: t.bg, customSurface: t.surface, customText: t.text })
    return true
  }
  function removeThemeTemplate(id: number) {
    state.value.savedThemes = state.value.savedThemes.filter(t => t.id !== id)
  }

  /** نقاط القوة: المهارات الرئيسية المميّزة من بين المهارات المعروضة علنًا */
  const featuredSkills = computed(() =>
    publicSkills.value.filter(s => state.value.featuredSkillIds.includes(s.id)),
  )

  const FEATURED_CAP = 5
  function toggleFeaturedSkill(skillId: number): boolean {
    const list = state.value.featuredSkillIds
    if (list.includes(skillId)) {
      state.value.featuredSkillIds = list.filter(x => x !== skillId)
      return true
    }
    // لا تمييز لمهارة غير معروضة علنًا، ولا أكثر من 5 نقاط قوة
    if (!state.value.selectedSkillIds.includes(skillId) || list.length >= FEATURED_CAP)
      return false
    state.value.featuredSkillIds = [...list, skillId]
    return true
  }

  /** تحريك قسم في العمود الرئيسي خطوة أعلى/أسفل */
  function moveSection(key: OrderableSection, dir: -1 | 1) {
    const order = state.value.sectionOrder
    const i = order.indexOf(key)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length)
      return
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  /** نقل قسم من موضع إلى موضع (السحب والإفلات) */
  function reorderSection(fromIdx: number, toIdx: number) {
    const order = state.value.sectionOrder
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= order.length || toIdx >= order.length)
      return
    const [item] = order.splice(fromIdx, 1)
    order.splice(toIdx, 0, item)
  }

  /** الصورة الشخصية الحقيقية — dataURL مصغّرة أو null للعودة للحرف الأول */
  function setAvatarImage(dataUrl: string | null) {
    state.value.avatarImage = dataUrl
  }

  // —— روابط مخصصة لأي منصة ——
  function addCustomLink(label: string, url: string): boolean {
    if (!label.trim() || !url.trim())
      return false
    state.value.customLinks.push({ id: nextId++, label: label.trim(), url: url.trim() })
    return true
  }
  function removeCustomLink(id: number) {
    state.value.customLinks = state.value.customLinks.filter(l => l.id !== id)
  }

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
  /** إعجاب زائر بتوصية — تبديل لا يضاعف العدّاد */
  function toggleTestimonialLike(id: number) {
    const t = state.value.testimonials.find(x => x.id === id)
    if (!t)
      return
    t.visitorLiked = !t.visitorLiked
    t.likes += t.visitorLiked ? 1 : -1
  }
  /** زائر يكتب توصية — تدخل مخفية حتى يوافق صاحب الصفحة (نفس دستور «بموافقتي») */
  function submitTestimonial(author: string, authorRole: string, excerpt: string): Testimonial {
    const tm: Testimonial = {
      id: nextId++,
      author: author.trim(),
      authorRole: authorRole.trim() || 'زائر',
      initial: author.trim().charAt(0),
      excerpt: excerpt.trim(),
      visible: false,
      likes: 0,
      visitorLiked: false,
    }
    state.value.testimonials.push(tm)
    useNotificationsStore().push({
      icon: 'mdi-comment-quote-outline',
      color: 'warning',
      title: 'توصية جديدة بانتظار موافقتك',
      body: `${tm.author}: ${tm.excerpt.slice(0, 60)}${tm.excerpt.length > 60 ? '…' : ''}`,
      category: 'endorsement',
      actionTo: '/settings?tab=publicProfile',
      actionLabel: 'مراجعة التوصية',
    })
    return tm
  }
  function toggleSkill(skillId: number) {
    const list = state.value.selectedSkillIds
    state.value.selectedSkillIds = list.includes(skillId)
      ? list.filter(x => x !== skillId)
      : [...list, skillId]
  }

  // ===== البوابات — مصدر الحقيقة باقة الحساب الموحّدة =====
  /** هل تسمح باقة الحساب بإظهار هذا القسم؟ (بمعزل عن مفتاح الإظهار) */
  function tierAllows(key: keyof PublicSections): boolean {
    return TIER_RANK[useAccountPlanStore().tier] >= TIER_RANK[SECTION_TIER[key]]
  }
  /** القسم يظهر للزوار فقط إذا سمحت الباقة وفعّله صاحب الملف */
  function canShow(key: keyof PublicSections): boolean {
    return tierAllows(key) && state.value.sections[key]
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

  /** زائر يطلب إثبات مهارة — يصبّ في طلبات الإثبات المعلّقة بملف صاحب الصفحة */
  function requestSkillProof(skillName: string, visitorName: string, relation: string): boolean {
    profile.addProofRequest(visitorName, relation, skillName)
    useNotificationsStore().push({
      icon: 'mdi-check-decagram-outline',
      color: 'warning',
      title: 'طلب إثبات مهارة من صفحتك',
      body: `${visitorName} (${relation}) يطلب إثبات مهارة «${skillName}»`,
      category: 'endorsement',
      actionTo: '/profile',
      actionLabel: 'مراجعة الطلب',
    })
    return true
  }

  /** «جدولة مقابلة»: اقتراح موعد من زائر يدخل رسائل صاحب الصفحة وإشعاراته */
  function scheduleMeeting(visitorName: string, day: string, slot: string, topic: string): boolean {
    if (!state.value.schedulingEnabled)
      return false
    useMessagesStore().startConversation(
      visitorName,
      'طلب جدولة مقابلة عبر صفحتك التعريفية',
      `أقترح مقابلة ${day} الساعة ${slot}${topic ? ` — ${topic}` : ''}`,
    )
    state.value.meetings++
    useNotificationsStore().push({
      icon: 'mdi-calendar-clock-outline',
      color: 'secondary',
      title: 'طلب جدولة مقابلة',
      body: `${visitorName} يقترح موعدًا: ${day} · ${slot}`,
      category: 'interview',
      actionTo: '/messages',
      actionLabel: 'مراجعة الطلب',
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
    availabilityMeta, themeStyles, setTheme, fontFamily,
    saveThemeTemplate, applyThemeTemplate, removeThemeTemplate,
    featuredSkills, toggleFeaturedSkill, moveSection, reorderSection,
    setAvatarImage, addCustomLink, removeCustomLink,
    toggleTestimonialLike, submitTestimonial,
    recordView, recordShare,
    addAchievement, removeAchievement,
    addPortfolio, removePortfolio,
    toggleTestimonial, toggleSkill,
    contact, strength,
    requestSkillProof, scheduleMeeting,
    tierAllows, canShow,
    toggleFollow, avgRating, rate,
    visibleComments, addComment, setCommentHidden, removeComment,
    publicPath, publicUrl, shareOnLinkedIn,
  }
})
