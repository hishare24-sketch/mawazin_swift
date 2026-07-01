import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export type WishStatus = 'new' | 'pending' | 'accepted' | 'rejected'

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

  return { wishes, total, pendingCount, acceptedCount, rejectedCount, setStatus }
})
