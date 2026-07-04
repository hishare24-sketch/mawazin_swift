import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { syncPrivateDoc } from '@/services/cloudSync'

export type RequestKind = 'job' | 'project' | 'consultation' | 'task'
export type RequestStatus = 'reviewing' | 'accepted' | 'rejected' | 'done' | 'cancelled'
export type RequestState = 'new' | 'reviewing' | 'accepted' | 'closed'

export interface RequestBreakdown { skills: number, experience: number, location: number, duration: number }

export interface MarketRequest {
  id: number
  title: string
  org: string
  orgInitial: string
  orgRating: number // 0-5 organization reputation
  orgReviews: number
  kind: RequestKind
  state: RequestState // openness state shown as a colored icon
  field: string
  city: string
  remote: boolean
  duration: string // e.g. "شهر" / "3 أشهر"
  durationWeeks: number
  budget: string // display
  budgetValue: number // for filtering/sorting
  matchRate: number
  breakdown: RequestBreakdown
  applicants: number
  postedAt: string
  postedOrder: number // higher = newer (for sorting)
  isNew?: boolean
  description: string
  deliverables: string[]
  skills: string[]
  avgResponseDays: number
}

export interface MyRequest {
  id: number
  requestId: number
  title: string
  org: string
  kind: RequestKind
  status: RequestStatus
  appliedAt: string
  rated?: number
}

export const KIND_META: Record<RequestKind, { label: string, icon: string, color: string }> = {
  job: { label: 'وظيفة', icon: 'mdi-briefcase-outline', color: 'primary' },
  project: { label: 'مشروع', icon: 'mdi-rocket-launch-outline', color: 'accent' },
  consultation: { label: 'استشارة', icon: 'mdi-lightbulb-on-outline', color: 'secondary' },
  task: { label: 'مهمة', icon: 'mdi-checkbox-marked-circle-outline', color: 'success' },
}

export const STATUS_META: Record<RequestStatus, { label: string, color: string }> = {
  reviewing: { label: 'قيد المراجعة', color: 'warning' },
  accepted: { label: 'مقبول', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
  done: { label: 'منفّذ', color: 'primary' },
  cancelled: { label: 'ملغي', color: 'medium-emphasis' },
}

// Request openness state (colored icon on the feed card)
export const STATE_META: Record<RequestState, { label: string, color: string, icon: string }> = {
  new: { label: 'جديد', color: 'success', icon: 'mdi-new-box' },
  reviewing: { label: 'قيد المراجعة', color: 'warning', icon: 'mdi-progress-clock' },
  accepted: { label: 'يستقبل عروضًا', color: 'info', icon: 'mdi-account-check-outline' },
  closed: { label: 'مغلق', color: 'medium-emphasis', icon: 'mdi-lock-outline' },
}

const REQUESTS_SEED: MarketRequest[] = [
  {
    id: 1, title: 'تطوير لوحة تحكم Vue 3 لمنصة SaaS', org: 'شركة تقنية المستقبل', orgInitial: 'ت', orgRating: 4.8, orgReviews: 42, state: 'new', postedOrder: 5,
    kind: 'project', field: 'تطوير الويب', city: 'الرياض', remote: true, duration: '3 أشهر', durationWeeks: 12,
    budget: '18,000 - 28,000 ريال', budgetValue: 28000, matchRate: 94,
    breakdown: { skills: 96, experience: 88, location: 100, duration: 82 }, applicants: 12, postedAt: 'قبل يومين', isNew: true,
    description: 'نبحث عن مطوّر واجهات أمامية لبناء لوحة تحكم تفاعلية باستخدام Vue 3 و Vuetify مع تكامل REST API.',
    deliverables: ['لوحة تحكم كاملة متجاوبة', 'تكامل مع 6 نقاط API', 'اختبارات وحدة أساسية'],
    skills: ['Vue.js', 'TypeScript', 'Vuetify', 'REST API'], avgResponseDays: 2,
  },
  {
    id: 2, title: 'استشارة معمارية Frontend لتطبيق موجود', org: 'استوديو رؤية', orgInitial: 'ر', orgRating: 4.5, orgReviews: 28, state: 'reviewing', postedOrder: 4,
    kind: 'consultation', field: 'العمارة التقنية', city: 'جدة', remote: true, duration: 'أسبوعان', durationWeeks: 2,
    budget: '5,000 ريال', budgetValue: 5000, matchRate: 81,
    breakdown: { skills: 85, experience: 90, location: 70, duration: 78 }, applicants: 5, postedAt: 'قبل 4 أيام',
    description: 'مراجعة بنية تطبيق Vue حالي وتقديم خطة تحسين للأداء وقابلية الصيانة.',
    deliverables: ['تقرير مراجعة معماري', 'خطة تحسين ذات أولويات', 'جلسة عرض للفريق'],
    skills: ['Vue.js', 'Architecture', 'Performance'], avgResponseDays: 1,
  },
  {
    id: 3, title: 'مطوّر واجهات أمامية أول (دوام كامل)', org: 'منصة عطاء', orgInitial: 'ع', orgRating: 4.7, orgReviews: 63, state: 'accepted', postedOrder: 3,
    kind: 'job', field: 'تطوير الويب', city: 'الرياض', remote: false, duration: 'دائم', durationWeeks: 0,
    budget: '14,000 - 20,000 ريال/شهر', budgetValue: 20000, matchRate: 88,
    breakdown: { skills: 90, experience: 85, location: 100, duration: 75 }, applicants: 34, postedAt: 'قبل أسبوع',
    description: 'انضم لفريق المنتج لبناء تجارب مستخدم حديثة وقيادة معايير جودة الواجهة.',
    deliverables: ['قيادة تطوير الواجهة', 'مراجعة أكواد الفريق', 'رفع معايير الأداء'],
    skills: ['Vue.js', 'TypeScript', 'UI/UX', 'Testing'], avgResponseDays: 3,
  },
  {
    id: 4, title: 'مهمة: تحويل تصميم Figma إلى مكوّنات', org: 'وكالة إبداع', orgInitial: 'إ', orgRating: 4.2, orgReviews: 15, state: 'new', postedOrder: 2,
    kind: 'task', field: 'واجهات المستخدم', city: 'عن بُعد', remote: true, duration: 'أسبوع', durationWeeks: 1,
    budget: '2,500 ريال', budgetValue: 2500, matchRate: 76,
    breakdown: { skills: 80, experience: 72, location: 100, duration: 90 }, applicants: 8, postedAt: 'أمس', isNew: true,
    description: 'تحويل 8 شاشات من Figma إلى مكوّنات Vue قابلة لإعادة الاستخدام مطابقة للتصميم.',
    deliverables: ['8 مكوّنات متجاوبة', 'مطابقة بكسل للتصميم', 'توثيق الاستخدام'],
    skills: ['Vue.js', 'CSS', 'Figma'], avgResponseDays: 1,
  },
  {
    id: 5, title: 'بناء نظام تصميم (Design System) موحّد', org: 'بنك المستقبل الرقمي', orgInitial: 'ب', orgRating: 4.9, orgReviews: 88, state: 'reviewing', postedOrder: 1,
    kind: 'project', field: 'أنظمة التصميم', city: 'الرياض', remote: true, duration: '4 أشهر', durationWeeks: 16,
    budget: '35,000 - 50,000 ريال', budgetValue: 50000, matchRate: 72,
    breakdown: { skills: 78, experience: 68, location: 100, duration: 60 }, applicants: 19, postedAt: 'قبل 3 أيام',
    description: 'تأسيس نظام تصميم موحّد يشمل مكتبة مكوّنات، رموز تصميم، ودليل استخدام.',
    deliverables: ['مكتبة مكوّنات موثّقة', 'رموز تصميم (tokens)', 'دليل استخدام تفاعلي'],
    skills: ['Design System', 'Vue.js', 'Storybook', 'Accessibility'], avgResponseDays: 4,
  },
]

const MINE_STORAGE = 'myRequests'

const MINE_SEED: MyRequest[] = [
  { id: 1, requestId: 3, title: 'مطوّر واجهات أمامية أول', org: 'منصة عطاء', kind: 'job', status: 'reviewing', appliedAt: 'قبل يومين' },
  { id: 2, requestId: 2, title: 'استشارة معمارية Frontend', org: 'استوديو رؤية', kind: 'consultation', status: 'accepted', appliedAt: 'قبل أسبوع' },
  { id: 3, requestId: 4, title: 'تحويل تصميم Figma إلى مكوّنات', org: 'وكالة إبداع', kind: 'task', status: 'done', appliedAt: 'قبل أسبوعين', rated: 5 },
  { id: 4, requestId: 5, title: 'نظام تصميم موحّد', org: 'بنك المستقبل الرقمي', kind: 'project', status: 'rejected', appliedAt: 'قبل 3 أسابيع' },
]

function loadMine(): MyRequest[] {
  const raw = localStorage.getItem(MINE_STORAGE)
  if (!raw)
    return MINE_SEED.map(m => ({ ...m }))
  try {
    return JSON.parse(raw) as MyRequest[]
  }
  catch {
    return MINE_SEED.map(m => ({ ...m }))
  }
}

let nextMineId = 500

export const useRequestsStore = defineStore('requests', () => {
  const requests = ref<MarketRequest[]>(REQUESTS_SEED.map(r => ({ ...r })))
  const mine = ref<MyRequest[]>(loadMine())

  watch(mine, val => localStorage.setItem(MINE_STORAGE, JSON.stringify(val)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'requests',
    snapshot: () => mine.value,
    apply: (incoming) => {
      if (Array.isArray(incoming))
        mine.value = incoming as MyRequest[]
    },
    source: mine,
  })

  const fields = computed(() => [...new Set(requests.value.map(r => r.field))])

  function getById(id: number) {
    return requests.value.find(r => r.id === id)
  }
  function similar(id: number) {
    const req = getById(id)
    if (!req)
      return []
    return requests.value.filter(r => r.id !== id && r.field === req.field).slice(0, 3)
  }
  function hasApplied(requestId: number) {
    return mine.value.some(m => m.requestId === requestId)
  }
  function apply(req: MarketRequest) {
    if (hasApplied(req.id))
      return
    mine.value.unshift({
      id: nextMineId++, requestId: req.id, title: req.title, org: req.org,
      kind: req.kind, status: 'reviewing', appliedAt: 'الآن',
    })
  }
  function rateOrg(myId: number, stars: number) {
    const m = mine.value.find(x => x.id === myId)
    if (m)
      m.rated = stars
  }

  // Performance stats grouped by request kind (for AI insight)
  const perfStats = computed(() => {
    const kinds = [...new Set(mine.value.map(m => m.kind))]
    return kinds.map((k) => {
      const items = mine.value.filter(m => m.kind === k)
      return {
        category: KIND_META[k].label,
        applied: items.length,
        accepted: items.filter(m => m.status === 'accepted' || m.status === 'done').length,
      }
    })
  })

  const counts = computed(() => ({
    total: mine.value.length,
    accepted: mine.value.filter(m => m.status === 'accepted' || m.status === 'done').length,
    reviewing: mine.value.filter(m => m.status === 'reviewing').length,
    rejected: mine.value.filter(m => m.status === 'rejected').length,
  }))

  return { requests, mine, syncStatus, fields, getById, similar, hasApplied, apply, rateOrg, perfStats, counts }
})
