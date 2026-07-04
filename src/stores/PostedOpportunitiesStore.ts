import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { syncPrivateDoc } from '@/services/cloudSync'

export interface PostedOpportunity {
  id: number
  title: string
  department: string
  location: string
  type: string
  status: 'published' | 'draft'
  applicants: number
  postedAt: string
  salaryRange: string
}

const STORAGE_KEY = 'postedOpportunities'

const seed: PostedOpportunity[] = [
  { id: 1, title: 'مطوّر واجهات أمامية (Vue.js)', department: 'التقنية', location: 'الرياض', type: 'دوام كامل', status: 'published', applicants: 28, postedAt: 'قبل يومين', salaryRange: '12,000 - 18,000 ريال' },
  { id: 2, title: 'مهندس DevOps', department: 'التقنية', location: 'عن بُعد', type: 'عن بُعد', status: 'published', applicants: 19, postedAt: 'قبل يومين', salaryRange: '18,000 - 26,000 ريال' },
  { id: 3, title: 'مصمم UI/UX', department: 'التصميم', location: 'جدة', type: 'دوام جزئي', status: 'draft', applicants: 0, postedAt: 'مسودة', salaryRange: '8,000 - 12,000 ريال' },
]

function load(): PostedOpportunity[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return seed.map(o => ({ ...o }))
  try {
    return JSON.parse(raw) as PostedOpportunity[]
  }
  catch {
    return seed.map(o => ({ ...o }))
  }
}

let nextId = 700

export const usePostedOpportunitiesStore = defineStore('postedOpportunities', () => {
  const opportunities = ref<PostedOpportunity[]>(load())

  watch(opportunities, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'postedOpportunities',
    snapshot: () => opportunities.value,
    apply: (incoming) => {
      if (Array.isArray(incoming))
        opportunities.value = incoming as PostedOpportunity[]
    },
    source: opportunities,
  })

  const publishedCount = computed(() => opportunities.value.filter(o => o.status === 'published').length)
  const draftCount = computed(() => opportunities.value.filter(o => o.status === 'draft').length)
  const totalApplicants = computed(() => opportunities.value.reduce((s, o) => s + o.applicants, 0))

  function add(op: Omit<PostedOpportunity, 'id' | 'applicants' | 'postedAt'>) {
    opportunities.value.unshift({
      id: nextId++,
      applicants: 0,
      postedAt: op.status === 'published' ? 'الآن' : 'مسودة',
      ...op,
    })
  }

  function remove(id: number) {
    opportunities.value = opportunities.value.filter(o => o.id !== id)
  }

  function publish(id: number) {
    const o = opportunities.value.find(x => x.id === id)
    if (o) {
      o.status = 'published'
      o.postedAt = 'الآن'
    }
  }

  return { opportunities, syncStatus, publishedCount, draftCount, totalApplicants, add, remove, publish }
})
