import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { syncPrivateDoc } from '@/services/cloudSync'

export interface EndorsementRequest {
  id: number
  name: string
  relation: string
  date: string
}

export interface GivenEndorsement {
  id: number
  name: string
  date: string
  type: string
  views: number
}

const STORAGE_KEY = 'endorserData'

const seedRequests: EndorsementRequest[] = [
  { id: 1, name: 'أحمد المنصور', relation: 'زميل سابق', date: 'قبل يومين' },
  { id: 2, name: 'سارة العتيبي', relation: 'عملنا في نفس الفريق', date: 'قبل 4 أيام' },
  { id: 3, name: 'محمد الشمري', relation: 'مدير مشروع سابق', date: 'قبل أسبوع' },
]

const seedGiven: GivenEndorsement[] = [
  { id: 101, name: 'خالد الحربي', date: '2026-06-10', type: 'فيديو', views: 24 },
  { id: 102, name: 'نورة القحطاني', date: '2026-05-22', type: 'نص', views: 15 },
]

function load(): { requests: EndorsementRequest[], given: GivenEndorsement[] } {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return { requests: seedRequests.map(r => ({ ...r })), given: seedGiven.map(g => ({ ...g })) }
  try {
    return JSON.parse(raw)
  }
  catch {
    return { requests: seedRequests.map(r => ({ ...r })), given: seedGiven.map(g => ({ ...g })) }
  }
}

let nextId = 500

export const useEndorserStore = defineStore('endorser', () => {
  const initial = load()
  const requests = ref<EndorsementRequest[]>(initial.requests)
  const given = ref<GivenEndorsement[]>(initial.given)

  watch([requests, given], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ requests: requests.value, given: given.value }))
  }, { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'endorser',
    snapshot: () => ({ requests: requests.value, given: given.value }),
    apply: (incoming) => {
      const d = incoming as { requests?: EndorsementRequest[], given?: GivenEndorsement[] }
      if (Array.isArray(d.requests))
        requests.value = d.requests
      if (Array.isArray(d.given))
        given.value = d.given
    },
    source: [requests, given],
  })

  const pendingCount = computed(() => requests.value.length)
  const givenCount = computed(() => given.value.length)
  const totalViews = computed(() => given.value.reduce((sum, g) => sum + g.views, 0))

  function getRequest(id: number) {
    return requests.value.find(r => r.id === id)
  }

  // Submit an endorsement: move the request to "given"
  function submit(requestId: number | null, type: string) {
    const req = requestId != null ? requests.value.find(r => r.id === requestId) : requests.value[0]
    const name = req?.name ?? 'مرشح'
    given.value.unshift({ id: nextId++, name, date: 'الآن', type, views: 0 })
    if (req)
      requests.value = requests.value.filter(r => r.id !== req.id)
  }

  return { requests, given, syncStatus, pendingCount, givenCount, totalViews, getRequest, submit }
})
