import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { ai } from '@/services/ai'
import { syncPrivateDoc } from '@/services/cloudSync'
import { useWalletStore } from '@/stores/WalletStore'

export type InterviewerType = 'technical' | 'leadership' | 'behavioral' | 'specialist'
export type MarketInterviewKind = 'skills' | 'level' | 'leadership' | 'behavioral' | 'comprehensive'
export type BookingStatus = 'requested' | 'scheduled' | 'completed' | 'cancelled'

export interface EvaluationReport {
  level: string
  overall: number // 0-100
  competencies: { name: string, score: number }[]
  strengths: string[]
  improvements: string[]
  recommendation: string
  trustGain: number
}

// Custom evaluation element an interviewer offers on top of the base interview
export interface CustomEvalElement {
  id: number
  name: string
  description: string
  price: number // SAR, added on top of the base price
}

// Pre-interview material the candidate sends to the interviewer
export interface Attachment {
  id: number
  kind: 'file' | 'link'
  name: string
  fileType?: string // mime/extension for files
  size?: number // bytes
  url?: string // for links
}

// Platform commission taken from each paid service (disclosed transparently)
export const PLATFORM_COMMISSION = { min: 20, max: 30 } as const
export const COMMISSION_NOTE = 'تتلقى المنصة نسبة تتراوح بين 20% إلى 30% من قيمة هذه الخدمة كعمولة لتغطية التكاليف التشغيلية والبنية التحتية والتسويق والدعم الفني.'

export interface Interviewer {
  id: number
  name: string
  initial: string
  type: InterviewerType
  title: string
  bio: string
  specialties: string[]
  field: string
  rating: number // 0-5
  reviewsCount: number
  sessionsCount: number
  priceMin: number
  priceMax: number
  availability: string[]
  languages: string[]
  verified: boolean
  evalElements: CustomEvalElement[]
}

export interface Booking {
  id: number
  interviewerId: number
  interviewerName: string
  kind: MarketInterviewKind
  datetime: string
  price: number
  status: BookingStatus
  report?: EvaluationReport
  ratingGiven?: number
  elements?: string[] // names of extra evaluation elements chosen
  attachments?: Attachment[]
}

// Interviewer-side view: sessions the logged-in interviewer must conduct
export interface AgendaItem {
  id: number
  candidateName: string
  candidateInitial: string
  candidateField: string
  kind: MarketInterviewKind
  datetime: string
  price: number
  status: 'requested' | 'scheduled' | 'completed'
  rating?: number
  report?: EvaluationReport
  attachments?: Attachment[]
}

export const INTERVIEWER_TYPE_META: Record<InterviewerType, { label: string, icon: string, color: string }> = {
  technical: { label: 'خبير تقني', icon: 'mdi-code-tags', color: 'primary' },
  leadership: { label: 'خبير قيادي/إداري', icon: 'mdi-account-tie', color: 'accent' },
  behavioral: { label: 'خبير نفسي/سلوكي', icon: 'mdi-brain', color: 'secondary' },
  specialist: { label: 'خبير مجال محدد', icon: 'mdi-star-circle-outline', color: 'info' },
}

export const KIND_META: Record<MarketInterviewKind, { label: string, desc: string, minutes: string }> = {
  skills: { label: 'تقييم مهارات تقنية', desc: 'اختبار عملي ونظري في مجال محدد', minutes: '45–60 د' },
  level: { label: 'تحديد المستوى', desc: 'تقييم شامل لتحديد مستواك', minutes: '30–45 د' },
  leadership: { label: 'مقابلة قيادية', desc: 'دراسات حالة وسيناريوهات قيادية', minutes: '60–90 د' },
  behavioral: { label: 'مقابلة شخصية/سلوكية', desc: 'تحليل الشخصية والذكاء العاطفي', minutes: '30–45 د' },
  comprehensive: { label: 'مقابلة شاملة', desc: 'حزمة تقنية + سلوكية + قيادية', minutes: '90–120 د' },
}

// Accreditation tiers — derived from sessions + rating, so promotion is automatic
export type InterviewerTier = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export const INTERVIEWER_TIER_META: Record<InterviewerTier, { label: string, icon: string, color: string, req: string, perk: string }> = {
  beginner: { label: 'مقيّم مبتدئ', icon: 'mdi-seed-outline', color: 'blue-grey', req: '3+ سنوات · 3 تزكيات · اجتياز مقابلة تقييمية', perk: 'تقييم مهارات أساسية · سعر مقترح من المنصة' },
  intermediate: { label: 'مقيّم متوسط', icon: 'mdi-chevron-double-up', color: 'info', req: '10+ مقابلات بتقييم عالٍ', perk: 'جميع أنواع المقابلات · تحديد السعر الذاتي' },
  advanced: { label: 'مقيّم متقدّم', icon: 'mdi-star-circle-outline', color: 'accent', req: '25+ مقابلة بتقييم عالٍ جدًا', perk: 'ظهور مميّز · استشارات إضافية' },
  expert: { label: 'خبير معتمد', icon: 'mdi-crown-outline', color: 'warning', req: '50+ مقابلة بتقييم ممتاز', perk: 'كل المزايا · تدريب مقيّمين جدد · شراكات استراتيجية' },
}
export const INTERVIEWER_TIERS: InterviewerTier[] = ['beginner', 'intermediate', 'advanced', 'expert']
export function interviewerTier(iv: { sessionsCount: number, rating: number }): InterviewerTier {
  if (iv.sessionsCount >= 50 && iv.rating >= 4.8)
    return 'expert'
  if (iv.sessionsCount >= 25 && iv.rating >= 4.6)
    return 'advanced'
  if (iv.sessionsCount >= 10 && iv.rating >= 4.3)
    return 'intermediate'
  return 'beginner'
}

export const BOOKING_STATUS_META: Record<BookingStatus, { label: string, color: string }> = {
  requested: { label: 'بانتظار القبول', color: 'warning' },
  scheduled: { label: 'مجدولة', color: 'info' },
  completed: { label: 'منفّذة', color: 'success' },
  cancelled: { label: 'ملغاة', color: 'medium-emphasis' },
}

const INTERVIEWERS_SEED: Interviewer[] = [
  {
    id: 1, name: 'م. خالد الشمري', initial: 'خ', type: 'technical', title: 'مهندس برمجيات أول · خبير Frontend',
    bio: 'خبرة 11 سنة في هندسة الواجهات وأنظمة قابلة للتوسّع. أجريت أكثر من 200 مقابلة تقييمية.',
    specialties: ['Vue.js', 'TypeScript', 'Architecture', 'تطوير الويب'], field: 'تطوير الويب',
    rating: 4.9, reviewsCount: 128, sessionsCount: 214, priceMin: 120, priceMax: 300,
    availability: ['الأحد', 'الثلاثاء', 'الخميس'], languages: ['العربية', 'English'], verified: true,
    evalElements: [
      { id: 1, name: 'التقييم المتقدم (تحليل معمّق)', description: 'تحليل معمّق للمشاريع السابقة والكود المرفوع', price: 100 },
      { id: 2, name: 'تقرير مفصّل مع توصيات', description: 'تقرير مكتوب شامل مع خطة تطوير مهني مخصّصة', price: 60 },
    ],
  },
  {
    id: 2, name: 'د. ريم القحطاني', initial: 'ر', type: 'leadership', title: 'مستشارة قيادة وموارد بشرية · PMP',
    bio: 'خبيرة قيادة وتطوير مؤسسي بخبرة 14 سنة في شركات كبرى، متخصصة في تقييم الكفاءات القيادية.',
    specialties: ['القيادة', 'الإدارة', 'التخطيط الاستراتيجي'], field: 'الإدارة',
    rating: 4.8, reviewsCount: 96, sessionsCount: 150, priceMin: 200, priceMax: 500,
    availability: ['الإثنين', 'الأربعاء'], languages: ['العربية', 'English'], verified: true,
    evalElements: [
      { id: 1, name: 'التقييم القيادي', description: 'تقييم المهارات القيادية والإدارية عبر سيناريوهات عملية', price: 150 },
      { id: 2, name: 'التقييم السلوكي الشامل', description: 'تحليل الشخصية والذكاء العاطفي والتوافق الثقافي', price: 80 },
    ],
  },
  {
    id: 3, name: 'أ. سلمى العنزي', initial: 'س', type: 'behavioral', title: 'أخصائية تقييم نفسي وذكاء عاطفي',
    bio: 'مرخّصة في التقييم النفسي المهني، متخصصة في تحليل الشخصية والتوافق الثقافي للفرق.',
    specialties: ['الذكاء العاطفي', 'تحليل الشخصية', 'التواصل'], field: 'السلوكي',
    rating: 4.7, reviewsCount: 74, sessionsCount: 110, priceMin: 60, priceMax: 200,
    availability: ['الأحد', 'الأربعاء', 'الخميس'], languages: ['العربية'], verified: true,
    evalElements: [
      { id: 1, name: 'التقييم السلوكي الشامل', description: 'تحليل الشخصية والذكاء العاطفي والتوافق الثقافي', price: 80 },
    ],
  },
  {
    id: 4, name: 'م. فهد الدوسري', initial: 'ف', type: 'technical', title: 'مهندس DevOps وأمن سيبراني',
    bio: 'خبرة 8 سنوات في البنية التحتية والأمن السيبراني، أجري مقابلات تقنية معمّقة.',
    specialties: ['DevOps', 'الأمن السيبراني', 'Cloud'], field: 'البنية التحتية',
    rating: 4.6, reviewsCount: 51, sessionsCount: 68, priceMin: 100, priceMax: 280,
    availability: ['الثلاثاء', 'الخميس'], languages: ['العربية', 'English'], verified: true,
    evalElements: [
      { id: 1, name: 'مراجعة أمنية معمّقة', description: 'فحص ثغرات وممارسات الأمان في مشروعك', price: 120 },
    ],
  },
  {
    id: 5, name: 'أ. نورة المطيري', initial: 'ن', type: 'specialist', title: 'خبيرة تسويق رقمي ونمو',
    bio: 'متخصصة في التسويق الرقمي والنمو بخبرة 9 سنوات وحملات لعلامات كبرى.',
    specialties: ['التسويق الرقمي', 'النمو', 'المحتوى'], field: 'التسويق',
    rating: 4.8, reviewsCount: 63, sessionsCount: 89, priceMin: 80, priceMax: 260,
    availability: ['الأحد', 'الإثنين', 'الأربعاء'], languages: ['العربية', 'English'], verified: true,
    evalElements: [
      { id: 1, name: 'تدقيق حملة نمو', description: 'مراجعة استراتيجية نمو أو حملة تسويقية مع توصيات', price: 90 },
    ],
  },
  {
    id: 6, name: 'أ. عبدالله الغامدي', initial: 'ع', type: 'specialist', title: 'محلل مالي معتمد (CFA) · تمويل شركات',
    bio: 'خبرة 10 سنوات في التحليل المالي ونمذجة الاستثمار، أجريت مقابلات تقييم للأدوار المالية في بنوك وصناديق.',
    specialties: ['التحليل المالي', 'النمذجة المالية', 'التقييم'], field: 'المالية',
    rating: 4.7, reviewsCount: 44, sessionsCount: 72, priceMin: 130, priceMax: 320,
    availability: ['الأحد', 'الثلاثاء'], languages: ['العربية', 'English'], verified: true,
    evalElements: [
      { id: 1, name: 'تقييم مالي تطبيقي', description: 'حالة عملية في النمذجة والتحليل مع تقرير', price: 110 },
    ],
  },
  {
    id: 7, name: 'م. ريم الحربي', initial: 'ر', type: 'technical', title: 'مهندسة مدنية · إدارة مشاريع إنشائية',
    bio: 'مهندسة مدنية بخبرة 12 سنة في مشاريع البنية التحتية والمباني، متخصصة في تقييم كفاءات الهندسة والتخطيط.',
    specialties: ['إدارة المشاريع', 'الإشراف الهندسي', 'AutoCAD'], field: 'الهندسة والمقاولات والبناء',
    rating: 4.6, reviewsCount: 38, sessionsCount: 55, priceMin: 110, priceMax: 260,
    availability: ['الإثنين', 'الأربعاء'], languages: ['العربية'], verified: true,
    evalElements: [
      { id: 1, name: 'تقييم كفاءة هندسية', description: 'مراجعة خبرة إدارة المشاريع عبر سيناريو موقعي', price: 90 },
    ],
  },
  {
    id: 8, name: 'د. سارة الزهراني', initial: 'س', type: 'specialist', title: 'استشارية جودة رعاية صحية',
    bio: 'استشارية في تحسين جودة الخدمات الصحية بخبرة 13 سنة، تُقيّم كفاءات الأدوار الطبية والإدارية في القطاع الصحي.',
    specialties: ['جودة الرعاية', 'تجربة المريض', 'تحسين العمليات'], field: 'الصحة والرعاية الطبية',
    rating: 4.9, reviewsCount: 57, sessionsCount: 81, priceMin: 150, priceMax: 340,
    availability: ['الأحد', 'الخميس'], languages: ['العربية', 'English'], verified: true,
    evalElements: [
      { id: 1, name: 'تقييم كفاءات صحية', description: 'سيناريوهات جودة وسلامة المرضى مع توصيات', price: 120 },
    ],
  },
  {
    id: 9, name: 'أ. ليان القحطاني', initial: 'ل', type: 'specialist', title: 'مديرة تصميم منتج · UX',
    bio: 'قائدة تصميم بخبرة 9 سنوات في منتجات رقمية، أقيّم مهارات التصميم والتفكير التصميمي عبر ملفات الأعمال.',
    specialties: ['UX', 'أنظمة التصميم', 'أبحاث المستخدم'], field: 'التصميم',
    rating: 4.8, reviewsCount: 49, sessionsCount: 66, priceMin: 90, priceMax: 240,
    availability: ['الثلاثاء', 'الخميس'], languages: ['العربية', 'English'], verified: true,
    evalElements: [
      { id: 1, name: 'مراجعة ملف أعمال تصميم', description: 'نقد ملف الأعمال وتقييم التفكير التصميمي', price: 85 },
    ],
  },
  {
    id: 10, name: 'أ. ماجد العتيبي', initial: 'م', type: 'leadership', title: 'مدير موارد بشرية · اكتساب المواهب',
    bio: 'قائد موارد بشرية بخبرة 15 سنة في اكتساب المواهب وتطوير المؤسسات، متخصص في تقييم التوافق القيادي والثقافي.',
    specialties: ['التوظيف', 'إدارة الأداء', 'تطوير المؤسسات'], field: 'الموارد البشرية',
    rating: 4.5, reviewsCount: 61, sessionsCount: 94, priceMin: 100, priceMax: 250,
    availability: ['الأحد', 'الإثنين', 'الأربعاء'], languages: ['العربية', 'English'], verified: false,
    evalElements: [
      { id: 1, name: 'تقييم توافق قيادي', description: 'مقابلة سلوكية موجّهة مع تقرير توافق', price: 95 },
    ],
  },
]

const BOOKINGS_STORAGE = 'interviewerBookings'

const BOOKINGS_SEED: Booking[] = [
  {
    id: 1, interviewerId: 3, interviewerName: 'أ. سلمى العنزي', kind: 'behavioral',
    datetime: '2026-06-20 · 18:00', price: 120, status: 'completed', ratingGiven: 5,
    report: {
      level: 'متقدم', overall: 84,
      competencies: [{ name: 'التواصل', score: 88 }, { name: 'الذكاء العاطفي', score: 82 }, { name: 'حل النزاعات', score: 80 }],
      strengths: ['تواصل واضح ومنظّم', 'وعي ذاتي عالٍ'],
      improvements: ['تعزيز الحزم في المواقف الصعبة'],
      recommendation: 'مرشح متوازن سلوكيًا — مناسب لأدوار تتطلب تعاونًا عاليًا.',
      trustGain: 8,
    },
  },
  {
    id: 2, interviewerId: 1, interviewerName: 'م. خالد الشمري', kind: 'skills',
    datetime: '2026-07-03 · 20:00', price: 180, status: 'scheduled',
  },
]

function loadBookings(): Booking[] {
  const raw = localStorage.getItem(BOOKINGS_STORAGE)
  if (!raw)
    return BOOKINGS_SEED.map(b => ({ ...b }))
  try {
    return JSON.parse(raw) as Booking[]
  }
  catch {
    return BOOKINGS_SEED.map(b => ({ ...b }))
  }
}

const AGENDA_STORAGE = 'interviewerAgenda'
const PRICING_STORAGE = 'interviewerPricing'
const MY_ELEMENTS_STORAGE = 'interviewerMyElements'

const MY_ELEMENTS_SEED: CustomEvalElement[] = [
  { id: 1, name: 'التقييم المتقدم (تحليل معمّق)', description: 'تحليل معمّق للمشاريع السابقة والكود المرفوع', price: 100 },
  { id: 2, name: 'تقرير مفصّل مع توصيات', description: 'تقرير مكتوب شامل مع خطة تطوير مهني مخصّصة', price: 60 },
]

function loadMyElements(): CustomEvalElement[] {
  const raw = localStorage.getItem(MY_ELEMENTS_STORAGE)
  if (!raw)
    return MY_ELEMENTS_SEED.map(e => ({ ...e }))
  try {
    return JSON.parse(raw) as CustomEvalElement[]
  }
  catch {
    return MY_ELEMENTS_SEED.map(e => ({ ...e }))
  }
}

const AGENDA_SEED: AgendaItem[] = [
  { id: 1, candidateName: 'أحمد العلي', candidateInitial: 'أ', candidateField: 'تطوير الويب', kind: 'skills', datetime: 'الخميس 2026-07-02 · 20:00', price: 180, status: 'requested' },
  { id: 2, candidateName: 'سارة الزهراني', candidateInitial: 'س', candidateField: 'تطوير الويب', kind: 'level', datetime: 'الأحد 2026-07-05 · 18:00', price: 90, status: 'requested' },
  {
    id: 3, candidateName: 'محمد القرني', candidateInitial: 'م', candidateField: 'البنية التحتية', kind: 'comprehensive', datetime: 'الثلاثاء 2026-06-30 · 19:00', price: 280, status: 'scheduled',
    attachments: [
      { id: 1, kind: 'link', name: 'مشروع GitHub — منصة microservices', url: 'https://github.com/example/platform' },
      { id: 2, kind: 'file', name: 'السيرة_الذاتية.pdf', fileType: 'application/pdf', size: 240000 },
      { id: 3, kind: 'file', name: 'مخطط_المعمارية.png', fileType: 'image/png', size: 512000 },
    ],
  },
  {
    id: 4, candidateName: 'ليان الحربي', candidateInitial: 'ل', candidateField: 'تطوير الويب', kind: 'skills', datetime: '2026-06-22 · 17:00', price: 180, status: 'completed', rating: 5,
    report: {
      level: 'متقدم', overall: 88,
      competencies: [{ name: 'حل المشكلات', score: 90 }, { name: 'المعرفة التقنية', score: 88 }, { name: 'التواصل', score: 85 }],
      strengths: ['حلول منظّمة وواضحة', 'إلمام عميق بأنماط التصميم'],
      improvements: ['تحسين تغطية الاختبارات'],
      recommendation: 'مرشح تقني قوي جاهز لأدوار متقدمة.',
      trustGain: 12,
    },
  },
]

const DEFAULT_PRICING: Record<MarketInterviewKind, number> = { skills: 180, level: 90, leadership: 300, behavioral: 120, comprehensive: 280 }

function loadAgenda(): AgendaItem[] {
  const raw = localStorage.getItem(AGENDA_STORAGE)
  if (!raw)
    return AGENDA_SEED.map(a => ({ ...a }))
  try {
    return JSON.parse(raw) as AgendaItem[]
  }
  catch {
    return AGENDA_SEED.map(a => ({ ...a }))
  }
}
function loadPricing(): Record<MarketInterviewKind, number> {
  const raw = localStorage.getItem(PRICING_STORAGE)
  if (!raw)
    return { ...DEFAULT_PRICING }
  try {
    return { ...DEFAULT_PRICING, ...JSON.parse(raw) }
  }
  catch {
    return { ...DEFAULT_PRICING }
  }
}

let nextBookingId = 700

export const useInterviewersStore = defineStore('interviewers', () => {
  const interviewers = ref<Interviewer[]>(INTERVIEWERS_SEED.map(i => ({ ...i })))
  const bookings = ref<Booking[]>(loadBookings())
  const agenda = ref<AgendaItem[]>(loadAgenda())
  const pricing = ref<Record<MarketInterviewKind, number>>(loadPricing())
  const myEvalElements = ref<CustomEvalElement[]>(loadMyElements())

  watch(bookings, val => localStorage.setItem(BOOKINGS_STORAGE, JSON.stringify(val)), { deep: true })
  watch(agenda, val => localStorage.setItem(AGENDA_STORAGE, JSON.stringify(val)), { deep: true })
  watch(pricing, val => localStorage.setItem(PRICING_STORAGE, JSON.stringify(val)), { deep: true })
  watch(myEvalElements, val => localStorage.setItem(MY_ELEMENTS_STORAGE, JSON.stringify(val)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'interviewerWorkspace',
    snapshot: () => ({ bookings: bookings.value, agenda: agenda.value, pricing: pricing.value, myEvalElements: myEvalElements.value }),
    apply: (incoming) => {
      const d = incoming as { bookings?: Booking[], agenda?: AgendaItem[], pricing?: Record<MarketInterviewKind, number>, myEvalElements?: CustomEvalElement[] }
      if (Array.isArray(d.bookings))
        bookings.value = d.bookings
      if (Array.isArray(d.agenda))
        agenda.value = d.agenda
      if (d.pricing && typeof d.pricing === 'object')
        pricing.value = d.pricing
      if (Array.isArray(d.myEvalElements))
        myEvalElements.value = d.myEvalElements
    },
    source: [bookings, agenda, pricing, myEvalElements],
  })

  const fields = computed(() => [...new Set(interviewers.value.map(i => i.field))])

  function getById(id: number) {
    return interviewers.value.find(i => i.id === id)
  }

  // AI-ranked top interviewers for a candidate profile
  function recommendedFor(candidate: { field: string, skills: string[] }) {
    const ranked = ai.recommendInterviewers(
      candidate,
      interviewers.value.map(i => ({ id: i.id, type: i.type, specialties: i.specialties })),
    )
    return ranked
      .map(r => ({ interviewer: getById(r.id)!, match: r.match, reason: r.reason }))
      .filter(x => x.interviewer)
  }
  function matchFor(candidate: { field: string, skills: string[] }, id: number) {
    const iv = getById(id)
    if (!iv)
      return 0
    return ai.interviewerMatch(candidate, { type: iv.type, specialties: iv.specialties })
  }

  function book(interviewer: Interviewer, kind: MarketInterviewKind, datetime: string, price: number, elements?: string[]): number {
    const id = nextBookingId++
    bookings.value.unshift({
      id, interviewerId: interviewer.id, interviewerName: interviewer.name,
      kind, datetime, price, status: 'requested',
      ...(elements && elements.length ? { elements } : {}),
    })
    return id
  }

  // — Custom evaluation elements (logged-in interviewer) —
  let nextElementId = 100
  function addEvalElement(el: Omit<CustomEvalElement, 'id'>) {
    myEvalElements.value.push({ ...el, id: nextElementId++ })
  }
  function removeEvalElement(id: number) {
    myEvalElements.value = myEvalElements.value.filter(e => e.id !== id)
  }
  function rateBooking(id: number, stars: number) {
    const b = bookings.value.find(x => x.id === id)
    if (b)
      b.ratingGiven = stars
  }
  // Reschedule a booking to a new datetime (keeps it scheduled)
  function reschedule(id: number, datetime: string) {
    const b = bookings.value.find(x => x.id === id)
    if (b && b.status !== 'completed' && b.status !== 'cancelled') {
      b.datetime = datetime
      b.status = 'scheduled'
    }
  }

  // Pre-interview attachments (candidate → interviewer)
  let nextAttachmentId = 500
  function addAttachment(bookingId: number, att: Omit<Attachment, 'id'>) {
    const b = bookings.value.find(x => x.id === bookingId)
    if (b) {
      if (!b.attachments)
        b.attachments = []
      b.attachments.push({ ...att, id: nextAttachmentId++ })
    }
  }

  const completedReports = computed(() => bookings.value.filter(b => b.status === 'completed' && b.report))

  // Trust contribution from certified-interviewer reports (0-100)
  const trustValue = computed(() => {
    const reports = completedReports.value
    if (!reports.length)
      return 0
    return Math.round(reports.reduce((s, b) => s + (b.report?.overall ?? 0), 0) / reports.length)
  })

  // — Interviewer side (agenda / stats / pricing) —
  function getAgendaItem(id: number) {
    return agenda.value.find(a => a.id === id)
  }
  function acceptRequest(id: number) {
    const item = getAgendaItem(id)
    if (item && item.status === 'requested')
      item.status = 'scheduled'
  }
  function declineRequest(id: number) {
    agenda.value = agenda.value.filter(a => a.id !== id)
  }
  function completeSession(id: number, report: EvaluationReport) {
    const item = getAgendaItem(id)
    if (item) {
      item.status = 'completed'
      item.report = report
      // صافي الأرباح (بعد متوسط عمولة المنصة) يدخل المحفظة معلقًا حتى التسوية
      const commission = (PLATFORM_COMMISSION.min + PLATFORM_COMMISSION.max) / 200
      const net = Math.round(item.price * (1 - commission))
      useWalletStore().credit(net, `أرباح جلسة تقييم — ${item.candidateName}`, { pending: true })
    }
  }
  function setPrice(kind: MarketInterviewKind, value: number) {
    pricing.value[kind] = value
  }

  const agendaRequests = computed(() => agenda.value.filter(a => a.status === 'requested'))
  const agendaUpcoming = computed(() => agenda.value.filter(a => a.status === 'scheduled'))
  const agendaCompleted = computed(() => agenda.value.filter(a => a.status === 'completed'))

  const interviewerStats = computed(() => {
    const done = agendaCompleted.value
    const earnings = done.reduce((s, a) => s + a.price, 0)
    const rated = done.filter(a => a.rating)
    const avgRating = rated.length ? Math.round((rated.reduce((s, a) => s + (a.rating ?? 0), 0) / rated.length) * 10) / 10 : 0
    return {
      sessions: done.length,
      earnings,
      avgRating,
      pending: agendaRequests.value.length,
      upcoming: agendaUpcoming.value.length,
    }
  })

  return {
    interviewers, bookings, agenda, pricing, myEvalElements, syncStatus, fields,
    getById, recommendedFor, matchFor, book, rateBooking, reschedule, addAttachment,
    completedReports, trustValue,
    getAgendaItem, acceptRequest, declineRequest, completeSession, setPrice,
    addEvalElement, removeEvalElement,
    agendaRequests, agendaUpcoming, agendaCompleted, interviewerStats,
  }
})
