import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { FacetState } from '@/composables/useFacetedList'
import { syncPrivateDoc } from '@/services/cloudSync'

// العروض المحفوظة: توليفة فلاتر كاملة (قطاع + فاسِتات + فرز + بحث) لكل سطح اكتشاف،
// يعيد المستخدم تطبيقها بنقرة. تُخزَّن محليًّا وتُزامَن سحابيًّا (بجلسة حقيقيّة)
// بنفس نمط SearchPrefsStore. `surface` يفصل عروض كل سوق (opportunities/requests/…).

export interface SavedFilterView {
  id: number
  surface: string
  label: string
  state: FacetState
}

const STORAGE = 'filterViews'

function loadViews(): SavedFilterView[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE) ?? '[]') as SavedFilterView[]
  }
  catch {
    return []
  }
}

export const useFilterViewsStore = defineStore('filterViews', () => {
  const views = ref<SavedFilterView[]>(loadViews())
  // معرّف تالٍ مشتقّ من المحفوظ (لا عدّاد وحدة يتصادم بعد إعادة التحميل)
  let nextId = views.value.reduce((m, v) => Math.max(m, v.id), 0) + 1

  // flush:'sync' كي يثبت localStorage فور التعديل (لا فجوة عبر tick قبل قراءة جلسة جديدة)
  watch(views, v => localStorage.setItem(STORAGE, JSON.stringify(v)), { deep: true, flush: 'sync' })

  const { status: syncStatus } = syncPrivateDoc({
    store: 'filterViews',
    snapshot: () => ({ views: views.value }),
    apply: (incoming) => {
      const d = incoming as { views?: SavedFilterView[] }
      if (Array.isArray(d.views)) {
        views.value = d.views
        nextId = views.value.reduce((m, v) => Math.max(m, v.id), 0) + 1
      }
    },
    source: [views],
  })

  /** عروض سطحٍ معيّن (سوق). */
  function forSurface(surface: string): SavedFilterView[] {
    return views.value.filter(v => v.surface === surface)
  }

  /** حفظ توليفة الفلاتر الحاليّة كعرض جديد. يعيد العرض المُنشأ. */
  function saveView(surface: string, label: string, state: FacetState): SavedFilterView {
    const view: SavedFilterView = { id: nextId++, surface, label, state }
    views.value = [view, ...views.value]
    return view
  }

  function removeView(id: number) {
    views.value = views.value.filter(v => v.id !== id)
  }

  return { views, syncStatus, forSurface, saveView, removeView }
})
