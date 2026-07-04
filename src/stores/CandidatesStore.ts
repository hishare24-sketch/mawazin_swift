import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { CandidateStatus } from '@/modules/candidates/interfaces/Candidate'
import { mockCandidates } from '@/modules/candidates/services/mockCandidates'
import { syncPrivateDoc } from '@/services/cloudSync'

const STORAGE_KEY = 'candidateStatuses'

// Persist only the status overrides (keyed by candidate id), not the whole dataset
function loadOverrides(): Record<number, CandidateStatus> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return {}
  try {
    return JSON.parse(raw) as Record<number, CandidateStatus>
  }
  catch {
    return {}
  }
}

export const useCandidatesStore = defineStore('candidates', () => {
  const overrides = ref<Record<number, CandidateStatus>>(loadOverrides())

  watch(overrides, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'candidates',
    snapshot: () => overrides.value,
    apply: (incoming) => {
      if (incoming && typeof incoming === 'object')
        overrides.value = incoming as Record<number, CandidateStatus>
    },
    source: overrides,
  })

  const candidates = computed(() =>
    mockCandidates.map(c => ({ ...c, status: overrides.value[c.id] ?? c.status })),
  )

  const countByStatus = (status: CandidateStatus) => candidates.value.filter(c => c.status === status).length
  const newCount = computed(() => countByStatus('new'))
  const interviewCount = computed(() => countByStatus('interview'))

  function setStatus(id: number, status: CandidateStatus) {
    overrides.value = { ...overrides.value, [id]: status }
  }

  function getById(id: number) {
    return candidates.value.find(c => c.id === id)
  }

  return { candidates, syncStatus, newCount, interviewCount, countByStatus, setStatus, getById }
})
