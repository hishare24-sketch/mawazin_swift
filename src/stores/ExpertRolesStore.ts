import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { useWalletStore } from '@/stores/WalletStore'

// ===== أدوار توسعة النظام البيئي: المرشد المهني + المدرب التقني + المستشار المهني =====
// (وثيقة «شريك النجاح» — الأدوار 7-9 من خارطة الطريق)

// —— المرشد المهني (Career Coach) ——
export interface CoachProgram {
  id: number
  name: string
  duration: string // شهري / ربع سنوي...
  price: number // شهريًا
  seats: number
  enrolled: number
}
export interface CoachClient {
  id: number
  name: string
  initial: string
  goal: string
  program: string
  progress: number // 0-100
  nextSession: string
}

// —— المدرب التقني (Tech Trainer) ——
export interface Course {
  id: number
  title: string
  skill: string
  kind: 'دورة مكثفة' | 'ورشة عمل'
  price: number
  seats: number
  enrolled: number
  status: 'open' | 'running' | 'done'
}
export interface TraineeReferral {
  id: number
  name: string
  initial: string
  gap: string // الفجوة المكتشفة من نتائج التقييم
  source: string // من رشّحه
  status: 'new' | 'enrolled' | 'declined'
}

// —— المستشار المهني (Industry Consultant) ——
export interface ConsultingRequest {
  id: number
  company: string
  topic: string
  scope: 'بالساعة' | 'مشروع'
  budget: string
  status: 'new' | 'accepted' | 'in_progress' | 'done' | 'declined'
  date: string
}

// —— جانب الطلب: دليل الخبراء في السوق الموحّد ——
export type MarketExpertRole = 'coach' | 'trainer' | 'consultant'

export interface MarketExpert {
  id: number
  name: string
  initial: string
  role: MarketExpertRole
  title: string
  specialty: string
  rating: number
  clients: number
  priceFrom: number
  priceUnit: string
  verified: boolean
}

export const MARKET_ROLE_META: Record<MarketExpertRole, { label: string, icon: string, color: string, service: string }> = {
  coach: { label: 'مرشد مهني', icon: 'mdi-compass-outline', color: 'primary', service: 'برنامج إرشاد دوري' },
  trainer: { label: 'مدرب تقني', icon: 'mdi-school-outline', color: 'teal', service: 'دورة أو ورشة تدريبية' },
  consultant: { label: 'مستشار مهني', icon: 'mdi-lightbulb-on-outline', color: 'warning', service: 'استشارة متخصصة' },
}

export const MARKET_EXPERTS: MarketExpert[] = [
  { id: 1, name: 'أ. هند الزهراني', initial: 'ه', role: 'coach', title: 'مرشدة مسارات تقنية', specialty: 'التحول الوظيفي إلى التقنية', rating: 4.9, clients: 46, priceFrom: 450, priceUnit: 'شهريًا', verified: true },
  { id: 2, name: 'م. فهد الدوسري', initial: 'ف', role: 'coach', title: 'مرشد خريجين ومبتدئين', specialty: 'أول وظيفة تقنية', rating: 4.7, clients: 120, priceFrom: 300, priceUnit: 'شهريًا', verified: true },
  { id: 3, name: 'م. نوف الشهري', initial: 'ن', role: 'trainer', title: 'مدربة TypeScript معتمدة', specialty: 'TypeScript وأنماط Vue المتقدمة', rating: 4.8, clients: 210, priceFrom: 180, priceUnit: 'للورشة', verified: true },
  { id: 4, name: 'م. سلطان العمري', initial: 'س', role: 'trainer', title: 'مدرب اختبارات وجودة', specialty: 'Vitest وتغطية الاختبارات', rating: 4.6, clients: 95, priceFrom: 220, priceUnit: 'للدورة', verified: false },
  { id: 5, name: 'د. ريم القحطاني', initial: 'ر', role: 'consultant', title: 'مستشارة قيادة وموارد بشرية', specialty: 'هيكلة الفرق ورواتب السوق', rating: 4.8, clients: 38, priceFrom: 600, priceUnit: 'للساعة', verified: true },
  { id: 6, name: 'م. عمر باوزير', initial: 'ع', role: 'consultant', title: 'مستشار هندسة بيانات', specialty: 'اتجاهات سوق البيانات والرواتب', rating: 4.5, clients: 22, priceFrom: 500, priceUnit: 'للساعة', verified: true },
]

interface ExpertState {
  coachPrograms: CoachProgram[]
  coachClients: CoachClient[]
  courses: Course[]
  trainees: TraineeReferral[]
  consulting: ConsultingRequest[]
}

const STORAGE_KEY = 'expertRoles'

const seed: ExpertState = {
  coachPrograms: [
    { id: 1, name: 'مسار الانطلاق المهني', duration: 'شهري', price: 450, seats: 10, enrolled: 6 },
    { id: 2, name: 'برنامج التحول الوظيفي الشامل', duration: 'ربع سنوي', price: 1100, seats: 5, enrolled: 3 },
  ],
  coachClients: [
    { id: 1, name: 'نورة المطيري', initial: 'ن', goal: 'الانتقال من الدعم الفني إلى تحليل البيانات', program: 'برنامج التحول الوظيفي الشامل', progress: 62, nextSession: 'الخميس 20:00' },
    { id: 2, name: 'عبدالله المالكي', initial: 'ع', goal: 'أول وظيفة بعد التخرج في تطوير الويب', program: 'مسار الانطلاق المهني', progress: 35, nextSession: 'السبت 18:30' },
  ],
  courses: [
    { id: 1, title: 'أساسيات اختبار الواجهات بـ Vitest', skill: 'الاختبارات', kind: 'ورشة عمل', price: 180, seats: 20, enrolled: 14, status: 'open' },
    { id: 2, title: 'TypeScript المتقدم لمطوري Vue', skill: 'TypeScript', kind: 'دورة مكثفة', price: 650, seats: 12, enrolled: 12, status: 'running' },
  ],
  trainees: [
    { id: 1, name: 'خالد الحربي', initial: 'خ', gap: 'ضعف في تغطية الاختبارات (من تقرير مقيّم)', source: 'ترشيح مقيّم معتمد', status: 'new' },
    { id: 2, name: 'سارة العتيبي', initial: 'س', gap: 'أنماط TypeScript المتقدمة (نتيجة اختبار 58%)', source: 'مركز التقييم', status: 'new' },
  ],
  consulting: [
    { id: 1, company: 'شركة تقنية المستقبل', topic: 'هيكلة فريق الواجهات لعام 2027', scope: 'مشروع', budget: '18,000 ر.س', status: 'new', date: 'قبل يومين' },
    { id: 2, company: 'مؤسسة البناء الرقمي', topic: 'اتجاهات رواتب مطوري البيانات', scope: 'بالساعة', budget: '600 ر.س/ساعة', status: 'in_progress', date: 'قبل أسبوع' },
  ],
}

function load(): ExpertState {
  try {
    return { ...structuredClone(seed), ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  }
  catch {
    return structuredClone(seed)
  }
}

let nextId = 700

export const useExpertRolesStore = defineStore('expertRoles', () => {
  const state = ref<ExpertState>(load())
  watch(state, v => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

  const notifications = useNotificationsStore()

  // —— المرشد ——
  const coachStats = computed(() => ({
    clients: state.value.coachClients.length,
    monthlyRecurring: state.value.coachPrograms.reduce((s, p) => s + p.price * p.enrolled, 0),
    avgProgress: state.value.coachClients.length
      ? Math.round(state.value.coachClients.reduce((s, c) => s + c.progress, 0) / state.value.coachClients.length)
      : 0,
  }))
  function addProgram(p: Omit<CoachProgram, 'id' | 'enrolled'>) {
    state.value.coachPrograms.push({ ...p, id: nextId++, enrolled: 0 })
  }
  function bumpClientProgress(id: number, delta = 10) {
    const c = state.value.coachClients.find(x => x.id === id)
    if (c)
      c.progress = Math.min(100, c.progress + delta)
  }

  // —— المدرب ——
  const trainerStats = computed(() => ({
    courses: state.value.courses.length,
    trainees: state.value.courses.reduce((s, c) => s + c.enrolled, 0),
    revenue: state.value.courses.reduce((s, c) => s + c.price * c.enrolled, 0),
    newReferrals: state.value.trainees.filter(t => t.status === 'new').length,
  }))
  function addCourse(c: Omit<Course, 'id' | 'enrolled' | 'status'>) {
    state.value.courses.push({ ...c, id: nextId++, enrolled: 0, status: 'open' })
  }
  /** قبول مرشح مُحال من نتائج التقييم إلى دورة — حلقة تقييم→تدريب→توظيف */
  function enrollTrainee(traineeId: number, courseId: number) {
    const t = state.value.trainees.find(x => x.id === traineeId)
    const c = state.value.courses.find(x => x.id === courseId)
    if (!t || t.status !== 'new' || !c || c.enrolled >= c.seats)
      return false
    t.status = 'enrolled'
    c.enrolled++
    useWalletStore().credit(c.price, `تسجيل ${t.name} في «${c.title}»`, { pending: true })
    notifications.push({ icon: 'mdi-school-outline', color: 'success', title: 'متدرب جديد', body: `${t.name} انضم إلى «${c.title}»`, category: 'system' })
    return true
  }

  // —— المستشار ——
  const consultantStats = computed(() => ({
    active: state.value.consulting.filter(c => c.status === 'in_progress' || c.status === 'accepted').length,
    newRequests: state.value.consulting.filter(c => c.status === 'new').length,
    done: state.value.consulting.filter(c => c.status === 'done').length,
  }))
  function respondConsulting(id: number, accept: boolean) {
    const r = state.value.consulting.find(x => x.id === id)
    if (!r)
      return
    r.status = accept ? 'accepted' : 'declined'
    notifications.push({
      icon: accept ? 'mdi-handshake-outline' : 'mdi-close-circle-outline',
      color: accept ? 'success' : 'error',
      title: accept ? 'قبلت طلب استشارة' : 'اعتذرت عن طلب استشارة',
      body: `${r.company} — ${r.topic}`,
      category: 'system',
    })
  }
  function completeConsulting(id: number, fee: number) {
    const r = state.value.consulting.find(x => x.id === id)
    if (!r)
      return
    r.status = 'done'
    useWalletStore().credit(fee, `أتعاب استشارة — ${r.company}`, { pending: true })
  }

  return {
    state,
    coachStats, addProgram, bumpClientProgress,
    trainerStats, addCourse, enrollTrainee,
    consultantStats, respondConsulting, completeConsulting,
  }
})
