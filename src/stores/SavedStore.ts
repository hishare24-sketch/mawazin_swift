import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { syncPrivateDoc } from '@/services/cloudSync'

const STORAGE_KEY = 'savedOpportunities'

function load(): number[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return [6, 11]
  try {
    return JSON.parse(raw) as number[]
  }
  catch {
    return []
  }
}

export const useSavedStore = defineStore('saved', () => {
  const savedIds = ref<number[]>(load())

  watch(savedIds, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'saved',
    snapshot: () => savedIds.value,
    apply: (incoming) => {
      if (Array.isArray(incoming))
        savedIds.value = incoming as number[]
    },
    source: savedIds,
  })

  const count = computed(() => savedIds.value.length)

  function isSaved(id: number): boolean {
    return savedIds.value.includes(id)
  }

  function toggle(id: number) {
    if (isSaved(id))
      savedIds.value = savedIds.value.filter(x => x !== id)
    else
      savedIds.value.push(id)
  }

  return { savedIds, syncStatus, count, isSaved, toggle }
})
