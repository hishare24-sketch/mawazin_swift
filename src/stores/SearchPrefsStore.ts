import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { SearchScope } from '@/services/ai/types'
import { syncPrivateDoc } from '@/services/cloudSync'

// Adaptive search: remembers recent queries (so results/suggestions adapt to
// the user's behaviour) and lets the user save favourite searches/filter sets.

export interface SavedSearch {
  id: number
  q: string
  scope: SearchScope
  category?: string
}

const RECENT_STORAGE = 'searchRecent'
const SAVED_STORAGE = 'searchSaved'
const RECENT_CAP = 8

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_STORAGE) ?? '[]') as string[]
  }
  catch {
    return []
  }
}
function loadSaved(): SavedSearch[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_STORAGE) ?? '[]') as SavedSearch[]
  }
  catch {
    return []
  }
}

let nextId = 1

export const useSearchPrefsStore = defineStore('searchPrefs', () => {
  const recent = ref<string[]>(loadRecent())
  const saved = ref<SavedSearch[]>(loadSaved())

  watch(recent, v => localStorage.setItem(RECENT_STORAGE, JSON.stringify(v)), { deep: true })
  watch(saved, v => localStorage.setItem(SAVED_STORAGE, JSON.stringify(v)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'searchPrefs',
    snapshot: () => ({ recent: recent.value, saved: saved.value }),
    apply: (incoming) => {
      const d = incoming as { recent?: string[], saved?: SavedSearch[] }
      if (Array.isArray(d.recent))
        recent.value = d.recent
      if (Array.isArray(d.saved))
        saved.value = d.saved
    },
    source: [recent, saved],
  })

  function recordSearch(q: string) {
    const query = q.trim()
    if (!query)
      return
    recent.value = [query, ...recent.value.filter(r => r !== query)].slice(0, RECENT_CAP)
  }
  function clearRecent() {
    recent.value = []
  }

  function isSaved(q: string, scope: SearchScope) {
    return saved.value.some(s => s.q === q.trim() && s.scope === scope)
  }
  function saveSearch(q: string, scope: SearchScope, category?: string) {
    const query = q.trim()
    if (!query || isSaved(query, scope))
      return
    saved.value.unshift({ id: nextId++, q: query, scope, category })
  }
  function removeSaved(id: number) {
    saved.value = saved.value.filter(s => s.id !== id)
  }

  return { recent, saved, syncStatus, recordSearch, clearRecent, isSaved, saveSearch, removeSaved }
})
