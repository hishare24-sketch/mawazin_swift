import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

// Public dual-rating system: candidate ⇄ interviewer.
// A review targets a "subject" — an interviewer (id as string) or the current
// candidate ('me'). The reviewed party may reply ONCE per review.

export type ReviewDirection = 'toInterviewer' | 'toCandidate'

export interface ReviewReply {
  text: string
  date: string
}

export interface Review {
  id: number
  direction: ReviewDirection
  subjectId: string // interviewer id (stringified) or 'me'
  authorName: string
  authorInitial: string
  authorRole: 'seeker' | 'interviewer'
  stars: number // 1-5
  comment: string
  kindLabel?: string // interview type label
  date: string // display date (YYYY-MM-DD)
  reply?: ReviewReply
}

const STORAGE_KEY = 'reviewsData'

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const SEED: Review[] = [
  // — Reviews about interviewers (candidate → interviewer) —
  { id: 1, direction: 'toInterviewer', subjectId: '1', authorName: 'سارة الزهراني', authorInitial: 'س', authorRole: 'seeker', stars: 5, comment: 'مقابلة دقيقة واحترافية، أسئلة عملية جدًا وملاحظات واضحة ساعدتني كثيرًا.', kindLabel: 'تقييم مهارات تقنية', date: '2026-06-24', reply: { text: 'شكرًا سارة، سعدت بتقييمك وأتمنى لك التوفيق!', date: '2026-06-25' } },
  { id: 2, direction: 'toInterviewer', subjectId: '1', authorName: 'محمد القرني', authorInitial: 'م', authorRole: 'seeker', stars: 5, comment: 'خبير حقيقي في الواجهات، شرح راقٍ وصبور. أنصح به بشدة.', kindLabel: 'تحديد المستوى', date: '2026-06-18' },
  { id: 3, direction: 'toInterviewer', subjectId: '1', authorName: 'ليان الحربي', authorInitial: 'ل', authorRole: 'seeker', stars: 4, comment: 'مقابلة ممتازة لكن الوقت كان ضيقًا قليلًا على عمق الأسئلة.', kindLabel: 'تقييم مهارات تقنية', date: '2026-06-10' },
  { id: 4, direction: 'toInterviewer', subjectId: '2', authorName: 'عبدالله المالكي', authorInitial: 'ع', authorRole: 'seeker', stars: 5, comment: 'رؤية قيادية عميقة وأسئلة استراتيجية رفعت من إدراكي لدوري القادم.', kindLabel: 'مقابلة قيادية', date: '2026-06-20' },
  { id: 5, direction: 'toInterviewer', subjectId: '3', authorName: 'نوف السبيعي', authorInitial: 'ن', authorRole: 'seeker', stars: 5, comment: 'تحليل سلوكي مذهل وواضح، شعرت بالراحة طوال المقابلة.', kindLabel: 'مقابلة شخصية/سلوكية', date: '2026-06-15' },

  // — Reviews about the current candidate (interviewer → candidate) —
  { id: 20, direction: 'toCandidate', subjectId: 'me', authorName: 'أ. سلمى العنزي', authorInitial: 'س', authorRole: 'interviewer', stars: 5, comment: 'مرشح متوازن سلوكيًا، تواصل واضح ووعي ذاتي عالٍ. جاهز لأدوار تعاونية.', kindLabel: 'مقابلة شخصية/سلوكية', date: '2026-06-20' },
  { id: 21, direction: 'toCandidate', subjectId: 'me', authorName: 'م. خالد الشمري', authorInitial: 'خ', authorRole: 'interviewer', stars: 4, comment: 'حلول تقنية منظّمة وإلمام جيد بأنماط التصميم، ينقصه تحسين تغطية الاختبارات.', kindLabel: 'تقييم مهارات تقنية', date: '2026-05-30' },
]

function load(): Review[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return SEED.map(r => ({ ...r }))
  try {
    return JSON.parse(raw) as Review[]
  }
  catch {
    return SEED.map(r => ({ ...r }))
  }
}

let nextId = 900

export const useReviewsStore = defineStore('reviews', () => {
  const reviews = ref<Review[]>(load())

  watch(reviews, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

  function forSubject(direction: ReviewDirection, subjectId: string) {
    return reviews.value
      .filter(r => r.direction === direction && r.subjectId === subjectId)
      .sort((a, b) => b.date.localeCompare(a.date))
  }
  function averageFor(direction: ReviewDirection, subjectId: string) {
    const list = forSubject(direction, subjectId)
    if (!list.length)
      return 0
    return Math.round((list.reduce((s, r) => s + r.stars, 0) / list.length) * 10) / 10
  }
  function countFor(direction: ReviewDirection, subjectId: string) {
    return forSubject(direction, subjectId).length
  }

  function addReview(payload: Omit<Review, 'id' | 'date' | 'reply'>) {
    reviews.value.unshift({ ...payload, id: nextId++, date: today() })
  }
  function addReply(id: number, text: string) {
    const r = reviews.value.find(x => x.id === id)
    if (r && !r.reply)
      r.reply = { text: text.trim(), date: today() }
  }

  return { reviews, forSubject, averageFor, countFor, addReview, addReply }
})
