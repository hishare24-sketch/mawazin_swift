import { ref, shallowRef } from 'vue'
import type { Ref } from 'vue'
import type { Page, PageMeta } from '@/services/api'

// ===== محرّك موارد لوحة الأدمن — ترقيم/فرز/بحث/فلاتر خادميّة + تحديد صفوف =====
// كل تغيير حالة يعيد الجلب بالمعاملات المناسبة. البحث مُمهَّل. يُعاد ضبط الصفحة لـ1
// عند تغيّر البحث/الفلاتر (لا عند تغيّر الصفحة نفسها).

export interface AdminResourceOptions<T> {
  fetcher: (params: Record<string, unknown>) => Promise<Page<T>>
  perPage?: number
  initialSort?: string
  rowKey?: (row: T) => string | number
}

export interface AdminResource<T> {
  items: Ref<T[]>
  meta: Ref<PageMeta | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  page: Ref<number>
  perPage: Ref<number>
  sortKey: Ref<string>
  search: Ref<string>
  filters: Ref<Record<string, string>>
  selected: Ref<(string | number)[]>
  load: () => Promise<void>
  refresh: () => Promise<void>
  setPage: (n: number) => void
  setPerPage: (n: number) => void
  setSort: (s: string) => void
  setSearch: (q: string) => void
  setFilter: (key: string, value: string | undefined) => void
  clearSelection: () => void
}

export function useAdminResource<T>(opts: AdminResourceOptions<T>): AdminResource<T> {
  const items = shallowRef<T[]>([]) as Ref<T[]>
  const meta = ref<PageMeta | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const page = ref(1)
  const perPage = ref(opts.perPage ?? 15)
  const sortKey = ref(opts.initialSort ?? '-id')
  const search = ref('')
  const filters = ref<Record<string, string>>({})
  const selected = ref<(string | number)[]>([])

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, unknown> = {
        page: page.value,
        perPage: perPage.value,
        sort: sortKey.value,
      }
      if (search.value.trim())
        params.q = search.value.trim()
      for (const [k, v] of Object.entries(filters.value)) {
        if (v)
          params[k] = v
      }
      const res = await opts.fetcher(params)
      items.value = res.items
      meta.value = res.meta
    }
    catch (e) {
      error.value = (e as { message?: string })?.message ?? 'تعذّر الجلب'
      items.value = []
    }
    finally {
      loading.value = false
    }
  }

  // بحث مُمهَّل (300ms) كي لا يُغرق الخادم بكل ضغطة
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  function setSearch(q: string): void {
    search.value = q
    if (searchTimer)
      clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      page.value = 1
      clearSelection()
      load()
    }, 300)
  }

  function setPage(n: number): void {
    page.value = n
    load()
  }
  function setPerPage(n: number): void {
    perPage.value = n
    page.value = 1
    load()
  }
  function setSort(s: string): void {
    sortKey.value = s
    page.value = 1
    load()
  }
  function setFilter(key: string, value: string | undefined): void {
    if (value)
      filters.value = { ...filters.value, [key]: value }
    else {
      const next = { ...filters.value }
      delete next[key]
      filters.value = next
    }
    page.value = 1
    clearSelection()
    load()
  }
  function clearSelection(): void {
    selected.value = []
  }

  load()

  return {
    items, meta, loading, error, page, perPage, sortKey, search, filters, selected,
    load, refresh: load, setPage, setPerPage, setSort, setSearch, setFilter, clearSelection,
  }
}
