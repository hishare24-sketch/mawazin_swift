import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useGamificationStore } from '@/stores/GamificationStore'

// A unified peer-to-peer request: any user asks any other user for one of these services
export type PeerRequestType
  = 'recommendation' // توصية
    | 'endorsement' // تزكية موثّقة
    | 'evaluation' // تقييم مهارات
    | 'level' // تحديد مستوى
    | 'interview' // مقابلة
    | 'consultation' // استشارة
    | 'training' // تدريب

export type PeerRequestStatus = 'pending' | 'accepted' | 'in_progress' | 'done' | 'rejected'

export interface PeerRequest {
  id: number
  type: PeerRequestType
  personName: string // the other party (recipient for outgoing, sender for incoming)
  personRole: string
  reason: string
  skills: string[]
  attachments: string[]
  status: PeerRequestStatus
  date: string
}

export const PEER_TYPE_META: Record<PeerRequestType, { label: string, icon: string, color: string, desc: string }> = {
  recommendation: { label: 'توصية', icon: 'mdi-comment-quote-outline', color: 'primary', desc: 'توصية نصية/صوتية/فيديو تؤكد تعاونك السابق' },
  endorsement: { label: 'تزكية موثّقة', icon: 'mdi-shield-check-outline', color: 'secondary', desc: 'تزكية موثّقة من مستخدم معتمد تؤكد مهاراتك' },
  evaluation: { label: 'تقييم مهارات', icon: 'mdi-clipboard-check-outline', color: 'accent', desc: 'تقييم مهاراتك من مقيّم معتمد' },
  level: { label: 'تحديد مستوى', icon: 'mdi-stairs-up', color: 'info', desc: 'تحديد مستواك المهني (مبتدئ/متوسط/متقدم/خبير)' },
  interview: { label: 'مقابلة', icon: 'mdi-account-tie-voice-outline', color: 'success', desc: 'إجراء مقابلة تقييمية أو وظيفية' },
  consultation: { label: 'استشارة', icon: 'mdi-lightbulb-on-outline', color: 'warning', desc: 'استشارة مهنية أو فنية من خبير' },
  training: { label: 'تدريب', icon: 'mdi-school-outline', color: 'teal', desc: 'جلسة تدريبية في مجال محدد' },
}

export const PEER_STATUS_META: Record<PeerRequestStatus, { label: string, color: string }> = {
  pending: { label: 'قيد الانتظار', color: 'warning' },
  accepted: { label: 'مقبول', color: 'info' },
  in_progress: { label: 'قيد التنفيذ', color: 'primary' },
  done: { label: 'مكتمل', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
}

// People a user can direct a request to (mock directory)
export const PEER_DIRECTORY = [
  { name: 'خالد العتيبي', role: 'مدير سابق · موثّق' },
  { name: 'سارة الشمري', role: 'زميلة عمل' },
  { name: 'م. خالد الشمري', role: 'مقيّم تقني معتمد' },
  { name: 'د. ريم القحطاني', role: 'مستشارة قيادة' },
  { name: 'نورة المطيري', role: 'خبيرة تسويق' },
]

const INCOMING_STORAGE = 'peerRequestsIncoming'
const OUTGOING_STORAGE = 'peerRequestsOutgoing'

const INCOMING_SEED: PeerRequest[] = [
  { id: 1, type: 'recommendation', personName: 'سارة علي', personRole: 'زميلة سابقة', reason: 'أرغب بتوصية تؤكد تعاوننا في مشروع لوحة التحكم.', skills: ['العمل الجماعي', 'Vue.js'], attachments: [], status: 'pending', date: '2026-06-29' },
  { id: 2, type: 'evaluation', personName: 'محمد الحارثي', personRole: 'باحث عن عمل', reason: 'أحتاج تقييمًا لمستواي في تطوير الواجهات قبل التقديم على وظيفة.', skills: ['React', 'TypeScript'], attachments: ['portfolio.pdf'], status: 'accepted', date: '2026-06-27' },
]

const OUTGOING_SEED: PeerRequest[] = [
  { id: 101, type: 'endorsement', personName: 'خالد العتيبي', personRole: 'مدير سابق · موثّق', reason: 'أرجو تزكية مهاراتي في إدارة المشاريع.', skills: ['إدارة المشاريع', 'القيادة'], attachments: [], status: 'pending', date: '2026-06-28' },
  { id: 102, type: 'level', personName: 'م. خالد الشمري', personRole: 'مقيّم تقني معتمد', reason: 'طلب تحديد مستواي المهني في تطوير الويب.', skills: ['Vue.js', 'Architecture'], attachments: [], status: 'done', date: '2026-06-20' },
]

function load(key: string, seed: PeerRequest[]): PeerRequest[] {
  const raw = localStorage.getItem(key)
  if (!raw)
    return seed.map(r => ({ ...r }))
  try {
    return JSON.parse(raw) as PeerRequest[]
  }
  catch {
    return seed.map(r => ({ ...r }))
  }
}

let nextId = 500

export const usePeerRequestsStore = defineStore('peerRequests', () => {
  const incoming = ref<PeerRequest[]>(load(INCOMING_STORAGE, INCOMING_SEED))
  const outgoing = ref<PeerRequest[]>(load(OUTGOING_STORAGE, OUTGOING_SEED))

  watch(incoming, v => localStorage.setItem(INCOMING_STORAGE, JSON.stringify(v)), { deep: true })
  watch(outgoing, v => localStorage.setItem(OUTGOING_STORAGE, JSON.stringify(v)), { deep: true })

  const pendingIncoming = computed(() => incoming.value.filter(r => r.status === 'pending').length)

  function create(req: Omit<PeerRequest, 'id' | 'status' | 'date'>) {
    outgoing.value.unshift({
      ...req,
      id: nextId++,
      status: 'pending',
      date: new Date().toISOString().slice(0, 10),
    })
    useGamificationStore().record('peerRequest', 'أرسلت طلبًا')
  }

  function findIncoming(id: number) {
    return incoming.value.find(r => r.id === id)
  }
  function accept(id: number) {
    const r = findIncoming(id)
    if (r)
      r.status = 'accepted'
  }
  function reject(id: number) {
    const r = findIncoming(id)
    if (r)
      r.status = 'rejected'
  }
  function startWork(id: number) {
    const r = findIncoming(id)
    if (r)
      r.status = 'in_progress'
  }
  function complete(id: number) {
    const r = findIncoming(id)
    if (r)
      r.status = 'done'
  }
  function cancelOutgoing(id: number) {
    outgoing.value = outgoing.value.filter(r => r.id !== id)
  }

  return {
    incoming, outgoing, pendingIncoming,
    create, accept, reject, startWork, complete, cancelOutgoing,
  }
})
