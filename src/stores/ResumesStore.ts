import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { syncPrivateDoc } from '@/services/cloudSync'

export interface Resume {
  id: number
  name: string
  template: string
  language: string
  createdAt: string
  updatedAt: string
  active: boolean
}

const STORAGE_KEY = 'resumes'

const seed: Resume[] = [
  { id: 1, name: 'سيرة تقنية - حديث', template: 'حديث', language: 'عربي', createdAt: '2026-06-01', updatedAt: '2026-06-10', active: true },
  { id: 2, name: 'Technical CV - Modern', template: 'Modern', language: 'English', createdAt: '2026-05-15', updatedAt: '2026-05-20', active: false },
]

function load(): Resume[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return seed.map(r => ({ ...r }))
  try {
    return JSON.parse(raw) as Resume[]
  }
  catch {
    return seed.map(r => ({ ...r }))
  }
}

let nextId = 900

export const useResumesStore = defineStore('resumes', () => {
  const resumes = ref<Resume[]>(load())

  watch(resumes, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'resumes',
    snapshot: () => resumes.value,
    apply: (incoming) => {
      if (Array.isArray(incoming))
        resumes.value = incoming as Resume[]
    },
    source: resumes,
  })

  const count = computed(() => resumes.value.length)
  const active = computed(() => resumes.value.find(r => r.active) ?? resumes.value[0])

  function add(name: string, template: string, language: string) {
    const isFirst = resumes.value.length === 0
    resumes.value.unshift({
      id: nextId++,
      name,
      template,
      language,
      createdAt: 'الآن',
      updatedAt: 'الآن',
      active: isFirst,
    })
  }

  function setActive(id: number) {
    resumes.value.forEach(r => (r.active = r.id === id))
  }

  function remove(id: number) {
    const wasActive = resumes.value.find(r => r.id === id)?.active
    resumes.value = resumes.value.filter(r => r.id !== id)
    if (wasActive && resumes.value.length)
      resumes.value[0].active = true
  }

  return { resumes, syncStatus, count, active, add, setActive, remove }
})
