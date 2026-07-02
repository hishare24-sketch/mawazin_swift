import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useNotificationsStore } from '@/stores/NotificationsStore'

export type WishStatus = 'new' | 'pending' | 'accepted' | 'rejected'

// ===== Company side: wishes sent to candidates + offers received from them =====

export type SentWishStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export interface SentWish {
  id: number
  candidateId?: number
  candidateName: string
  role: string
  amount: string
  duration: string
  reason: string
  status: SentWishStatus
  date: string
}

export type OfferStatus = 'new' | 'negotiating' | 'accepted' | 'declined'

export interface ReceivedOffer {
  id: number
  candidateName: string
  candidateInitial: string
  service: string
  amount: string
  note: string
  status: OfferStatus
  date: string
}

export const SENT_STATUS_META: Record<SentWishStatus, { label: string, color: string }> = {
  pending: { label: 'معلّق', color: 'warning' },
  accepted: { label: 'مقبول', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
  withdrawn: { label: 'مسحوب', color: 'surface-variant' },
}

export const OFFER_STATUS_META: Record<OfferStatus, { label: string, color: string }> = {
  new: { label: 'جديد', color: 'accent' },
  negotiating: { label: 'قيد التفاوض', color: 'info' },
  accepted: { label: 'مقبول', color: 'success' },
  declined: { label: 'معتذَر عنه', color: 'error' },
}

export interface Wish {
  id: number
  company: string
  companyInitial: string
  role: string
  amount: string
  duration: string
  reason: string
  matchRate: number
  status: WishStatus
  reputation: string
}

const STORAGE_KEY = 'incomingWishes'
const SENT_KEY = 'companySentWishes'
const RECEIVED_KEY = 'companyReceivedWishes'

const sentSeed: SentWish[] = [
  { id: 1, candidateId: 1, candidateName: 'أحمد المنصور', role: 'مطوّر واجهات أمامية', amount: '16,000 ريال', duration: 'دائم', reason: 'مهاراتك في Vue تطابق احتياجنا.', status: 'pending', date: 'قبل يومين' },
  { id: 2, candidateId: 2, candidateName: 'سارة العتيبي', role: 'مهندسة برمجيات', amount: '18,000 ريال', duration: 'سنة', reason: 'خبرتك المتكاملة مطلوبة لمشروعنا الجديد.', status: 'accepted', date: 'قبل 5 أيام' },
  { id: 3, candidateId: 3, candidateName: 'خالد الحربي', role: 'مطوّر ويب', amount: '12,000 ريال', duration: '6 أشهر', reason: 'نبحث عن مطوّر أداء بخبرتك.', status: 'rejected', date: 'قبل أسبوع' },
]

const receivedSeed: ReceivedOffer[] = [
  { id: 1, candidateName: 'نورة القحطاني', candidateInitial: 'ن', service: 'استشارة تصميم واجهات', amount: '3,500 ريال', note: 'متاحة للبدء خلال أسبوع — عرض ذاتي مفعّل.', status: 'new', date: 'قبل يوم' },
  { id: 2, candidateName: 'فهد العنزي', candidateInitial: 'ف', service: 'تطوير لوحة تحكم Vue', amount: '9,000 ريال', note: 'أعمل عن بُعد وأسلّم خلال 4 أسابيع.', status: 'new', date: 'قبل 3 أيام' },
]

function loadList<T>(key: string, seed: T[]): T[] {
  const raw = localStorage.getItem(key)
  if (!raw)
    return seed.map(x => ({ ...x }))
  try {
    return JSON.parse(raw) as T[]
  }
  catch {
    return seed.map(x => ({ ...x }))
  }
}

const seed: Wish[] = [
  { id: 1, company: 'شركة الحلول الذكية', companyInitial: 'ح', role: 'مطوّر واجهات أول', amount: '16,000 ريال', duration: '6 أشهر', reason: 'مهاراتك في Vue تطابق احتياجنا تماماً ونودّ ضمّك لفريقنا.', matchRate: 95, status: 'new', reputation: 'ممتازة' },
  { id: 2, company: 'مؤسسة البناء الرقمي', companyInitial: 'ب', role: 'قائد فريق الواجهات', amount: '22,000 ريال', duration: 'دائم', reason: 'نبحث عن مطوّر بخبرتك لقيادة فريق الواجهات الأمامية.', matchRate: 88, status: 'new', reputation: 'جيدة جداً' },
  { id: 3, company: 'وكالة الإبداع', companyInitial: 'و', role: 'مصمم واجهات', amount: '4,500 ريال', duration: 'مهمة', reason: 'مشروع قصير المدة يناسب خبرتك في التصميم والتطوير.', matchRate: 79, status: 'pending', reputation: 'جيدة' },
  { id: 4, company: 'تطبيقات المدن الذكية', companyInitial: 'ت', role: 'مطوّر Flutter', amount: '15,000 ريال', duration: 'سنة', reason: 'خبرتك في تطوير الجوال مطلوبة لمشروعنا الجديد.', matchRate: 82, status: 'new', reputation: 'ممتازة' },
]

function load(): Wish[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return seed.map(w => ({ ...w }))
  try {
    return JSON.parse(raw) as Wish[]
  }
  catch {
    return seed.map(w => ({ ...w }))
  }
}

export const useWishesStore = defineStore('wishes', () => {
  const wishes = ref<Wish[]>(load())

  watch(wishes, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

  const total = computed(() => wishes.value.length)
  const pendingCount = computed(() => wishes.value.filter(w => w.status === 'new' || w.status === 'pending').length)
  const acceptedCount = computed(() => wishes.value.filter(w => w.status === 'accepted').length)
  const rejectedCount = computed(() => wishes.value.filter(w => w.status === 'rejected').length)

  function setStatus(id: number, status: WishStatus) {
    const w = wishes.value.find(x => x.id === id)
    if (w)
      w.status = status
  }

  // ===== Company side =====
  const sent = ref<SentWish[]>(loadList(SENT_KEY, sentSeed))
  const received = ref<ReceivedOffer[]>(loadList(RECEIVED_KEY, receivedSeed))
  watch(sent, v => localStorage.setItem(SENT_KEY, JSON.stringify(v)), { deep: true })
  watch(received, v => localStorage.setItem(RECEIVED_KEY, JSON.stringify(v)), { deep: true })

  let nextSentId = Math.max(0, ...sentSeed.map(s => s.id)) + 100
  const sentActive = computed(() => sent.value.filter(s => s.status !== 'withdrawn'))
  const sentAccepted = computed(() => sent.value.filter(s => s.status === 'accepted').length)
  const sentPending = computed(() => sent.value.filter(s => s.status === 'pending').length)
  const acceptanceRate = computed(() => {
    const resolved = sent.value.filter(s => s.status === 'accepted' || s.status === 'rejected').length
    return resolved ? Math.round((sentAccepted.value / resolved) * 100) : 0
  })
  const newOffersCount = computed(() => received.value.filter(o => o.status === 'new').length)

  // Simulated candidate reply — keeps the demo loop alive (mock automation)
  function simulateCandidateReply(id: number) {
    setTimeout(() => {
      const w = sent.value.find(x => x.id === id)
      if (!w || w.status !== 'pending')
        return
      const accepted = w.id % 3 !== 0 // deterministic-ish: most wishes succeed
      w.status = accepted ? 'accepted' : 'rejected'
      useNotificationsStore().push({
        icon: accepted ? 'mdi-hand-heart' : 'mdi-hand-back-left-off-outline',
        color: accepted ? 'success' : 'error',
        title: accepted ? 'قبل المرشح رغبتك' : 'اعتذر المرشح عن رغبتك',
        body: `${w.candidateName} — ${w.role} (${w.amount})`,
        category: 'wish',
        actionTo: '/company/wishes',
        actionLabel: 'متابعة الرغبة',
      })
    }, 6000)
  }

  function sendWish(payload: Omit<SentWish, 'id' | 'status' | 'date'>): SentWish {
    const w: SentWish = { ...payload, id: nextSentId++, status: 'pending', date: 'الآن' }
    sent.value.unshift(w)
    useNotificationsStore().push({
      icon: 'mdi-send-check-outline',
      color: 'primary',
      title: 'أُرسلت رغبتك للمرشح',
      body: `${w.candidateName} — ${w.role}`,
      category: 'wish',
    })
    simulateCandidateReply(w.id)
    return w
  }

  function updateWish(id: number, patch: Partial<Pick<SentWish, 'role' | 'amount' | 'duration' | 'reason'>>) {
    const w = sent.value.find(x => x.id === id)
    if (w)
      Object.assign(w, patch)
  }

  function withdrawWish(id: number) {
    const w = sent.value.find(x => x.id === id)
    if (w)
      w.status = 'withdrawn'
  }

  /** إعادة إرسال رغبة مسحوبة/مرفوضة — تعود معلّقة وتُحاكى استجابة المرشح */
  function resendWish(id: number) {
    const w = sent.value.find(x => x.id === id)
    if (!w)
      return
    w.status = 'pending'
    w.date = 'الآن'
    simulateCandidateReply(id)
  }

  function respondOffer(id: number, status: 'accepted' | 'declined') {
    const o = received.value.find(x => x.id === id)
    if (!o)
      return
    o.status = status
    useNotificationsStore().push({
      icon: status === 'accepted' ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline',
      color: status === 'accepted' ? 'success' : 'error',
      title: status === 'accepted' ? 'قبلت عرض المرشح' : 'اعتذرت عن عرض المرشح',
      body: `${o.candidateName} — ${o.service}`,
      category: 'wish',
    })
  }

  /** تفاوض على عرض وارد بمقابل مضاد — يقبل المرشح المقابل الجديد بعد مهلة (محاكاة) */
  function negotiateOffer(id: number, counterAmount: string) {
    const o = received.value.find(x => x.id === id)
    if (!o)
      return
    o.status = 'negotiating'
    o.amount = counterAmount
    setTimeout(() => {
      const offer = received.value.find(x => x.id === id)
      if (!offer || offer.status !== 'negotiating')
        return
      offer.status = 'accepted'
      useNotificationsStore().push({
        icon: 'mdi-handshake-outline',
        color: 'success',
        title: 'وافق المرشح على المقابل الجديد',
        body: `${offer.candidateName} — ${offer.service} (${counterAmount})`,
        category: 'wish',
      })
    }, 5000)
  }

  return {
    wishes, total, pendingCount, acceptedCount, rejectedCount, setStatus,
    sent, received, sentActive, sentAccepted, sentPending, acceptanceRate, newOffersCount,
    sendWish, updateWish, withdrawWish, resendWish, respondOffer, negotiateOffer,
  }
})
