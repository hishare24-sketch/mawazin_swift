// ============================================================================
// محرّك القوائم المُفَصَّتة (Faceted List) — العقد الموحّد للاكتشاف عبر كل الأسطح.
// ----------------------------------------------------------------------------
// فلسفة التصفّح المُتعارَف عليها عالميًّا (LinkedIn Jobs / Amazon): «الكل»
// افتراضًا → تضييق عبر فاسِتات مسطّحة متعدّدة الاختيار (تاقز) → فرز. التصنيف
// الهرميّ يبقى فاسِتًا واحدًا (عبر منتقٍ باحث) لا شجرة متصدّرة. هذا المحرّك نقيّ
// وقابل للاختبار؛ مكوّن `FacetedList.vue` يقدّم واجهته. المرجع: نقاش تصميم الوصول.
// ============================================================================
import { computed, reactive } from 'vue'

/** خيار داخل فاسِت متعدّد (قيمة + تسمية عرض + أيقونة اختياريّة) */
export interface FacetOption {
  value: string
  label: string
  icon?: string
}

/**
 * تعريف فاسِت واحد على نوع العنصر T. ثلاثة أنواع:
 * - multi: اختيار متعدّد من قائمة (قطاع/مدينة/نوع…) — تطابق OR داخل الفاسِت.
 * - bool: تبديل ثنائيّ (عن بُعد فقط…).
 * - range: حدّ أدنى رقميّ (الراتب من…).
 */
export interface FacetSpec<T> {
  key: string
  label: string
  kind: 'multi' | 'bool' | 'range'
  /** يُعرض كشريط علويّ (Ribbon) بدل رقاقة — للفاسِت المحوريّ (القطاع) */
  primary?: boolean
  /** قائمة الخيارات قابلة للبحث في الشيت (للتصنيفات الكبيرة) */
  searchable?: boolean
  /** خيارات الفاسِت (multi) — دالة كي تتفاعل مع تغيّر البيانات */
  options?: () => FacetOption[]
  /** قيمة العنصر لهذا الفاسِت: نصّ مفرد أو قائمة (multi) */
  value?: (item: T) => string | string[] | undefined
  /** قيمة منطقيّة للعنصر (bool) */
  boolValue?: (item: T) => boolean
  /** قيمة رقميّة للعنصر (range) */
  numberValue?: (item: T) => number
  /**
   * مدى المنزلق (range). `mode`:
   * - 'min' (افتراضيّ): حدّ أدنى — يُبقي العناصر ≥ القيمة (غير نشِط عند 0).
   * - 'max': حدّ أقصى — يُبقي العناصر ≤ القيمة (غير نشِط عند القيمة القصوى).
   */
  range?: { min: number, max: number, step: number, mode?: 'min' | 'max' }
}

/** تعريف فرز واحد (مفتاح + تسمية + مقارِن) */
export interface SortSpec<T> {
  key: string
  label: string
  cmp: (a: T, b: T) => number
}

/** حالة التصفية القابلة للتسلسل (للحفظ في العروض المحفوظة/الرابط) */
export interface FacetState {
  q: string
  sel: Record<string, string[]>
  bools: Record<string, boolean>
  ranges: Record<string, number>
  sortKey: string
}

/** رقاقة مطبّقة معروضة للمستخدم مع دالة إزالتها */
export interface AppliedChip {
  key: string
  label: string
  remove: () => void
}

function itemValues<T>(facet: FacetSpec<T>, item: T): string[] {
  const v = facet.value?.(item)
  if (v == null)
    return []
  return Array.isArray(v) ? v : [v]
}

/** هل فاسِت المدى نشِط؟ (min: >0 · max: أقلّ من القيمة القصوى) */
function rangeActive<T>(f: FacetSpec<T>, state: FacetState): boolean {
  const v = state.ranges[f.key]
  if (f.range?.mode === 'max')
    return v != null && v < (f.range.max ?? Number.POSITIVE_INFINITY)
  return (v ?? 0) > 0
}

/** هل يمرّ العنصر عبر فاسِت المدى؟ */
function rangePasses<T>(f: FacetSpec<T>, item: T, state: FacetState): boolean {
  if (!rangeActive(f, state))
    return true
  const n = f.numberValue?.(item) ?? 0
  const v = state.ranges[f.key]!
  return f.range?.mode === 'max' ? n <= v : n >= v
}

/** المحرّك النقيّ: يصفّي ثم يفرز قائمة حسب الحالة (قابل للاختبار مباشرةً) */
export function runFacets<T>(
  items: T[],
  cfg: { facets: FacetSpec<T>[], sorts: SortSpec<T>[], text?: (t: T) => string },
  state: FacetState,
): T[] {
  const q = state.q.trim().toLowerCase()
  const out = items.filter((item) => {
    if (q && cfg.text && !cfg.text(item).toLowerCase().includes(q))
      return false
    for (const f of cfg.facets) {
      if (f.kind === 'multi') {
        const sel = state.sel[f.key] ?? []
        if (sel.length) {
          const vals = itemValues(f, item)
          if (!sel.some(s => vals.includes(s)))
            return false
        }
      }
      else if (f.kind === 'bool') {
        if (state.bools[f.key] && !f.boolValue?.(item))
          return false
      }
      else if (f.kind === 'range') {
        if (!rangePasses(f, item, state))
          return false
      }
    }
    return true
  })
  const sort = cfg.sorts.find(s => s.key === state.sortKey) ?? cfg.sorts[0]
  if (sort)
    out.sort(sort.cmp)
  return out
}

/**
 * الـcomposable التفاعليّ: يدير الحالة ويعيد النتائج والرقائق المطبّقة وأدوات الضبط.
 * `items` دالة (getter) كي تتعقّب التفاعليّة تغيّر المصدر.
 */
export function useFacetedList<T>(opts: {
  items: () => T[]
  facets: FacetSpec<T>[]
  sorts: SortSpec<T>[]
  text?: (t: T) => string
  initial?: Partial<FacetState>
}) {
  const state = reactive<FacetState>({
    q: '',
    sel: {},
    bools: {},
    ranges: {},
    sortKey: opts.initial?.sortKey ?? opts.sorts[0]?.key ?? '',
    ...opts.initial,
  }) as FacetState

  const results = computed(() =>
    runFacets(opts.items(), { facets: opts.facets, sorts: opts.sorts, text: opts.text }, state),
  )

  /** عدّ نتائج بحالة مؤقّتة (لمعاينة «عرض N نتيجة» في الشيت قبل الإغلاق) */
  function previewCount(): number {
    return results.value.length
  }

  function toggleMulti(key: string, value: string) {
    const cur = state.sel[key] ?? []
    state.sel[key] = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
  }
  function setMulti(key: string, values: string[]) {
    state.sel[key] = [...values]
  }
  function setBool(key: string, on: boolean) {
    state.bools[key] = on
  }
  function setRange(key: string, min: number) {
    state.ranges[key] = min
  }
  function setSort(key: string) {
    state.sortKey = key
  }
  function isActive(key: string): boolean {
    const f = opts.facets.find(x => x.key === key)
    if (!f)
      return false
    if (f.kind === 'multi')
      return (state.sel[key] ?? []).length > 0
    if (f.kind === 'bool')
      return !!state.bools[key]
    return rangeActive(f, state)
  }
  /** عدد الاختيارات النشِطة لفاسِت متعدّد (لعرض «(2)» على الرقاقة) */
  function activeCount(key: string): number {
    return (state.sel[key] ?? []).length
  }
  function clearFacet(key: string) {
    const f = opts.facets.find(x => x.key === key)
    if (!f)
      return
    if (f.kind === 'multi')
      state.sel[key] = []
    else if (f.kind === 'bool')
      state.bools[key] = false
    else state.ranges[key] = 0
  }
  function clearAll() {
    state.q = ''
    state.sel = {}
    state.bools = {}
    state.ranges = {}
  }
  /** هل هناك أيّ فاسِت مطبّق (عدا البحث)؟ */
  const hasActiveFacets = computed(() => opts.facets.some(f => isActive(f.key)))

  /** الرقائق المطبّقة (لعرضها فوق النتائج مع إزالة بنقرة) */
  const appliedChips = computed<AppliedChip[]>(() => {
    const chips: AppliedChip[] = []
    for (const f of opts.facets) {
      if (f.kind === 'multi') {
        const sel = state.sel[f.key] ?? []
        if (!sel.length)
          continue
        const optMap = new Map((f.options?.() ?? []).map(o => [o.value, o.label]))
        for (const v of sel) {
          chips.push({
            key: `${f.key}:${v}`,
            label: optMap.get(v) ?? v,
            remove: () => toggleMulti(f.key, v),
          })
        }
      }
      else if (f.kind === 'bool' && state.bools[f.key]) {
        chips.push({ key: f.key, label: f.label, remove: () => setBool(f.key, false) })
      }
      else if (f.kind === 'range' && rangeActive(f, state)) {
        const v = state.ranges[f.key].toLocaleString('en-US')
        chips.push({
          key: f.key,
          label: f.range?.mode === 'max' ? `${f.label} ≤ ${v}` : `${f.label} ${v}+`,
          remove: () => setRange(f.key, f.range?.mode === 'max' ? (f.range?.max ?? 0) : 0),
        })
      }
    }
    return chips
  })

  return {
    state,
    results,
    appliedChips,
    hasActiveFacets,
    previewCount,
    toggleMulti,
    setMulti,
    setBool,
    setRange,
    setSort,
    isActive,
    activeCount,
    clearFacet,
    clearAll,
  }
}
