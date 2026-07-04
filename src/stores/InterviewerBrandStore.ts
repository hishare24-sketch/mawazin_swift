import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { syncPrivateDoc } from '@/services/cloudSync'
import { useGamificationStore } from '@/stores/GamificationStore'
import { useInterviewersStore } from '@/stores/InterviewersStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

// ===== العلامة الشخصية للمقيّم — الملف العام التسويقي وأدوات النمو =====
// (المقيّم المسجّل في العرض = المقيّم رقم 1 وفق اصطلاح ReviewsStore)

export const MY_INTERVIEWER_ID = 1

export interface Promo {
  id: number
  title: string
  kind: 'discount' | 'free_intro'
  pct?: number // نسبة الخصم
  active: boolean
}

export interface Article {
  id: number
  title: string
  body: string
  status: 'review' | 'published'
  date: string
}

/** توصية زميل مهنة (مقيّم ↔ مقيّم) — تُعرض في الملف العام وتدعم التبادل */
export interface PeerEndorsement {
  id: number
  peerName: string
  peerTitle: string
  peerInitial: string
  text: string
  date: string
  status: 'pending' | 'received'
  /** رددتَ التوصية للزميل نفسه — تظهر شارة «متبادلة» */
  reciprocated: boolean
}

/** قصة نجاح لا تُنشر إلا بموافقة صاحبها الصريحة */
export interface SuccessStory {
  id: number
  candidateName: string
  candidateInitial: string
  headline: string
  story: string
  status: 'awaiting_consent' | 'approved' | 'declined'
  date: string
}

interface BrandState {
  slug: string
  views: number
  shares: number
  favorites: number
  referrals: number
  referralCode: string
  featuredReviewIds: number[]
  promos: Promo[]
  articles: Article[]
  peerEndorsements: PeerEndorsement[]
  successStories: SuccessStory[]
}

const STORAGE_KEY = 'interviewerBrand'

const seed: BrandState = {
  slug: 'khalid-alshamri',
  views: 342,
  shares: 18,
  favorites: 27,
  referrals: 3,
  referralCode: 'KHALID-REF',
  featuredReviewIds: [1, 2], // من تقييمات المرشحين الموثقة
  promos: [
    { id: 1, title: 'جلسة تعارف مجانية (15 دقيقة) للتقييم المبدئي', kind: 'free_intro', active: true },
  ],
  articles: [
    { id: 1, title: 'خمسة أخطاء تُسقط المرشح التقني في أول 10 دقائق', body: 'أكثر ما يفشل المرشحون فيه ليس الأسئلة الصعبة، بل الأساسيات: شرح القرار قبل الكود، وقراءة المتطلب مرتين، والسؤال عند الغموض بدل الافتراض...', status: 'published', date: '2026-06-18' },
  ],
  peerEndorsements: [
    { id: 1, peerName: 'د. ريم القحطاني', peerTitle: 'مستشارة قيادة وموارد بشرية · PMP', peerInitial: 'ر', text: 'من أدق المقيّمين التقنيين الذين عملت معهم — تقاريره مرجع يعتمد عليه فريقنا في قرارات التطوير.', date: '2026-06-22', status: 'received', reciprocated: true },
    { id: 2, peerName: 'م. عمر باوزير', peerTitle: 'مهندس بيانات أول · مقيّم معتمد', peerInitial: 'ع', text: 'حضرت معه جلسات تقييم مشتركة؛ أسئلته تصل لجوهر مستوى المرشح بسرعة وبأسلوب محترم.', date: '2026-06-10', status: 'received', reciprocated: false },
  ],
  successStories: [
    { id: 1, candidateName: 'محمد الحارثي', candidateInitial: 'م', headline: 'من رفضين متتاليين إلى عرض عمل خلال شهر', story: 'بعد جلسة تقييم شاملة وخطة تطوير من ثلاث نقاط، عالج محمد فجوة الاختبارات لديه وعاد ليجتاز مقابلته التالية بثقة.', status: 'approved', date: '2026-06-15' },
  ],
}

function load(): BrandState {
  try {
    return { ...structuredClone(seed), ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  }
  catch {
    return structuredClone(seed)
  }
}

let nextId = 500

export const useInterviewerBrandStore = defineStore('interviewerBrand', () => {
  const state = ref<BrandState>(load())
  watch(state, v => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'interviewerBrand',
    snapshot: () => state.value,
    apply: (incoming) => {
      if (incoming && typeof incoming === 'object')
        state.value = { ...state.value, ...(incoming as Partial<BrandState>) }
    },
    source: state,
  })

  const interviewersStore = useInterviewersStore()
  const me = computed(() => interviewersStore.getById(MY_INTERVIEWER_ID))

  // ===== مؤشرات لوحة التسويق الشخصي =====
  const marketingStats = computed(() => ({
    views: state.value.views,
    shares: state.value.shares,
    favorites: state.value.favorites,
    referrals: state.value.referrals,
  }))

  function recordView() {
    state.value.views++
  }
  function recordShare() {
    state.value.shares++
  }

  /** نسبة تحسّن المرشحين: مشتقة من تقارير الجلسات المكتملة (لا ندّعي توظيفًا خارجيًا) */
  const candidateImprovement = computed(() => {
    const done = interviewersStore.agendaCompleted.filter(a => a.report)
    if (!done.length)
      return 78 // قيمة السجل التاريخي للعرض
    const good = done.filter(a => (a.report?.overall ?? 0) >= 70).length
    return Math.round((good / done.length) * 100)
  })

  /** إنجازات مشتقة من الأداء الحقيقي — تتحول شارات وشهادات قابلة للمشاركة */
  const achievements = computed(() => {
    const stats = interviewersStore.interviewerStats
    const sessions = stats.sessions + 103 // سجل تاريخي قبل المنصة الحالية (mock)
    const list: { id: string, label: string, icon: string, earned: boolean }[] = [
      { id: 's10', label: 'أول 10 مقابلات', icon: 'mdi-flag-checkered', earned: sessions >= 10 },
      { id: 's100', label: 'خبير معتمد — 100 مقابلة', icon: 'mdi-medal-outline', earned: sessions >= 100 },
      { id: 'top_rated', label: 'تقييم 4.8+ لهذا الربع', icon: 'mdi-star-circle-outline', earned: stats.avgRating >= 4.8 },
      { id: 'fast_reply', label: 'استجابة خلال ساعة', icon: 'mdi-lightning-bolt-outline', earned: true },
    ]
    return list
  })

  /** سفير المنصة: أفضل المقيّمين أداءً وتقييمًا */
  const isAmbassador = computed(() =>
    interviewersStore.interviewerStats.avgRating >= 4.5 && achievements.value.find(a => a.id === 's100')?.earned === true,
  )

  // ===== التقييمات المميزة (يختارها المقيّم لملفه العام) =====
  function toggleFeaturedReview(id: number) {
    const list = state.value.featuredReviewIds
    if (list.includes(id))
      state.value.featuredReviewIds = list.filter(x => x !== id)
    else if (list.length < 5)
      state.value.featuredReviewIds = [...list, id]
  }

  // ===== العروض والحزم الترويجية =====
  function addPromo(p: Omit<Promo, 'id' | 'active'>) {
    state.value.promos.push({ ...p, id: nextId++, active: true })
  }
  function togglePromo(id: number) {
    const p = state.value.promos.find(x => x.id === id)
    if (p)
      p.active = !p.active
  }
  function removePromo(id: number) {
    state.value.promos = state.value.promos.filter(p => p.id !== id)
  }
  const activePromos = computed(() => state.value.promos.filter(p => p.active))

  // ===== المقالات (بمراجعة المنصة) =====
  function submitArticle(title: string, body: string) {
    const a: Article = { id: nextId++, title, body, status: 'review', date: new Date().toISOString().slice(0, 10) }
    state.value.articles.unshift(a)
    // محاكاة مراجعة المنصة ثم النشر
    setTimeout(() => {
      const art = state.value.articles.find(x => x.id === a.id)
      if (art && art.status === 'review') {
        art.status = 'published'
        useNotificationsStore().push({
          icon: 'mdi-post-outline',
          color: 'success',
          title: 'نُشر مقالك بعد المراجعة',
          body: `«${art.title}» أصبح ظاهرًا في ملفك العام`,
          category: 'system',
        })
      }
    }, 8000)
    return a
  }
  const publishedArticles = computed(() => state.value.articles.filter(a => a.status === 'published'))

  // ===== برنامج الدعوة (Referral) =====
  const referralLink = computed(() =>
    `${window.location.origin}${import.meta.env.BASE_URL}register?ref=${state.value.referralCode}`,
  )
  /** يُستدعى عند تسجيل مستخدم عبر رابط الدعوة */
  function creditReferral() {
    state.value.referrals++
    useGamificationStore().award(50, 'انضم مرشح جديد عبر رابط دعوتك')
    useNotificationsStore().push({
      icon: 'mdi-account-plus-outline',
      color: 'success',
      title: 'إحالة ناجحة! +50 نقطة',
      body: 'انضم مرشح جديد عبر رابط دعوتك — شكرًا لكونك شريك نمو.',
      category: 'system',
    })
  }

  // ===== توصيات الزملاء المتبادلة (مقيّم ↔ مقيّم) =====
  const receivedPeerEndorsements = computed(() =>
    state.value.peerEndorsements.filter(e => e.status === 'received'),
  )
  /** طلب توصية من زميل مقيّم — يرد الزميل بعد مهلة (محاكاة) وتُعرض في الملف العام */
  function requestPeerEndorsement(peerName: string, peerTitle: string, peerInitial: string) {
    const e: PeerEndorsement = {
      id: nextId++,
      peerName,
      peerTitle,
      peerInitial,
      text: '',
      date: new Date().toISOString().slice(0, 10),
      status: 'pending',
      reciprocated: false,
    }
    state.value.peerEndorsements.unshift(e)
    setTimeout(() => {
      const cur = state.value.peerEndorsements.find(x => x.id === e.id)
      if (!cur || cur.status !== 'pending')
        return
      cur.status = 'received'
      cur.text = 'عملنا معًا في جلسات تقييم مشتركة — خبرة عميقة وتقارير تستحق الثقة.'
      useNotificationsStore().push({
        icon: 'mdi-account-heart-outline',
        color: 'success',
        title: 'وصلتك توصية زميل',
        body: `${peerName} أضاف توصية مهنية لملفك العام — ردّ الجميل بتوصية متبادلة.`,
        category: 'endorsement',
        actionTo: '/interviewer',
        actionLabel: 'عرض التوصية',
      })
    }, 10000)
    return e
  }
  /** ردّ التوصية للزميل — تُعلَّم «متبادلة» وترفع مصداقية الطرفين */
  function reciprocatePeerEndorsement(id: number) {
    const e = state.value.peerEndorsements.find(x => x.id === id)
    if (!e || e.status !== 'received' || e.reciprocated)
      return
    e.reciprocated = true
    useGamificationStore().award(20, `أوصيت بزميلك ${e.peerName} — توصية متبادلة`)
  }

  // ===== قصص النجاح (لا تُنشر إلا بموافقة صاحبها) =====
  const approvedStories = computed(() =>
    state.value.successStories.filter(s => s.status === 'approved'),
  )
  /** إضافة قصة نجاح — تُرسل لصاحبها للموافقة قبل أي ظهور علني (محاكاة رد المرشح) */
  function addSuccessStory(candidateName: string, headline: string, story: string) {
    const s: SuccessStory = {
      id: nextId++,
      candidateName,
      candidateInitial: candidateName.trim().charAt(0),
      headline,
      story,
      status: 'awaiting_consent',
      date: new Date().toISOString().slice(0, 10),
    }
    state.value.successStories.unshift(s)
    setTimeout(() => {
      const cur = state.value.successStories.find(x => x.id === s.id)
      if (!cur || cur.status !== 'awaiting_consent')
        return
      cur.status = 'approved'
      useNotificationsStore().push({
        icon: 'mdi-check-decagram-outline',
        color: 'success',
        title: 'وافق المرشح على نشر قصته',
        body: `«${s.headline}» أصبحت ظاهرة في ملفك العام.`,
        category: 'system',
        actionTo: '/interviewer',
        actionLabel: 'عرض قصص النجاح',
      })
    }, 10000)
    return s
  }
  function removeSuccessStory(id: number) {
    state.value.successStories = state.value.successStories.filter(s => s.id !== id)
  }

  const publicPath = computed(() => `expert/${state.value.slug}`)
  const publicUrl = computed(() => `${window.location.origin}${import.meta.env.BASE_URL}${publicPath.value}`)

  /** رابط مشاركة LinkedIn للملف العام أو لشهادة/إنجاز محدد */
  function linkedInShareUrl() {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl.value)}`
  }
  function shareOnLinkedIn() {
    window.open(linkedInShareUrl(), '_blank', 'noopener')
    recordShare()
  }

  return {
    state, syncStatus, me,
    marketingStats, recordView, recordShare,
    candidateImprovement, achievements, isAmbassador,
    toggleFeaturedReview,
    addPromo, togglePromo, removePromo, activePromos,
    submitArticle, publishedArticles,
    referralLink, creditReferral,
    receivedPeerEndorsements, requestPeerEndorsement, reciprocatePeerEndorsement,
    approvedStories, addSuccessStory, removeSuccessStory,
    publicPath, publicUrl, linkedInShareUrl, shareOnLinkedIn,
  }
})
