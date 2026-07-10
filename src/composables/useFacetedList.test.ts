import { describe, expect, it } from 'vitest'
import type { FacetSpec, FacetState, SortSpec } from './useFacetedList'
import { runFacets } from './useFacetedList'

interface Job {
  id: number
  title: string
  city: string
  sector: string
  remote: boolean
  salary: number
  skills: string[]
}

const JOBS: Job[] = [
  { id: 1, title: 'مطوّر Vue', city: 'الرياض', sector: 'technology', remote: true, salary: 15000, skills: ['Vue', 'TS'] },
  { id: 2, title: 'محلل مالي', city: 'جدة', sector: 'finance', remote: false, salary: 12000, skills: ['Excel'] },
  { id: 3, title: 'مصمّم', city: 'الرياض', sector: 'design', remote: false, salary: 8000, skills: ['Figma'] },
  { id: 4, title: 'مهندس بيانات', city: 'الرياض', sector: 'technology', remote: true, salary: 22000, skills: ['SQL'] },
]

const facets: FacetSpec<Job>[] = [
  { key: 'sector', label: 'القطاع', kind: 'multi', value: j => j.sector },
  { key: 'city', label: 'المدينة', kind: 'multi', value: j => j.city },
  { key: 'remote', label: 'عن بُعد', kind: 'bool', boolValue: j => j.remote },
  { key: 'salary', label: 'الراتب', kind: 'range', numberValue: j => j.salary, range: { min: 0, max: 30000, step: 1000 } },
]
const sorts: SortSpec<Job>[] = [
  { key: 'salary', label: 'الأعلى راتبًا', cmp: (a, b) => b.salary - a.salary },
  { key: 'id', label: 'الأقدم', cmp: (a, b) => a.id - b.id },
]
const cfg = { facets, sorts, text: (j: Job) => `${j.title} ${j.skills.join(' ')}` }

function base(over: Partial<FacetState> = {}): FacetState {
  return { q: '', sel: {}, bools: {}, ranges: {}, sortKey: 'id', ...over }
}

describe('runFacets — التصفية', () => {
  it('بلا فلاتر: يعيد الكل مرتّبًا بالفرز الافتراضيّ', () => {
    expect(runFacets(JOBS, cfg, base()).map(j => j.id)).toEqual([1, 2, 3, 4])
  })

  it('فاسِت متعدّد (قطاع): تطابق OR داخل الفاسِت', () => {
    const r = runFacets(JOBS, cfg, base({ sel: { sector: ['technology'] } }))
    expect(r.map(j => j.id)).toEqual([1, 4])
    const r2 = runFacets(JOBS, cfg, base({ sel: { sector: ['finance', 'design'] } }))
    expect(r2.map(j => j.id)).toEqual([2, 3])
  })

  it('فاسِتان مختلفان: تطابق AND بينهما', () => {
    const r = runFacets(JOBS, cfg, base({ sel: { sector: ['technology'], city: ['الرياض'] } }))
    expect(r.map(j => j.id)).toEqual([1, 4])
    const none = runFacets(JOBS, cfg, base({ sel: { sector: ['finance'], city: ['الرياض'] } }))
    expect(none).toHaveLength(0)
  })

  it('فاسِت منطقيّ (عن بُعد): يقيّد على true فقط حين مفعّل', () => {
    expect(runFacets(JOBS, cfg, base({ bools: { remote: true } })).map(j => j.id)).toEqual([1, 4])
    expect(runFacets(JOBS, cfg, base({ bools: { remote: false } }))).toHaveLength(4)
  })

  it('فاسِت مدى (الراتب): حدّ أدنى', () => {
    expect(runFacets(JOBS, cfg, base({ ranges: { salary: 14000 } })).map(j => j.id)).toEqual([1, 4])
  })

  it('فاسِت مدى بنمط «حدّ أقصى» (mode: max): يُبقي ≤ العتبة، وغير نشِط عند القيمة القصوى', () => {
    const maxCfg = {
      facets: [{ key: 'salary', label: 'راتب', kind: 'range' as const, numberValue: (j: Job) => j.salary, range: { min: 0, max: 30000, step: 1000, mode: 'max' as const } }],
      sorts,
      text: cfg.text,
    }
    // حدّ أقصى 12000 → يُبقي من راتبه ≤ 12000 (id 2 و3)
    expect(runFacets(JOBS, maxCfg, base({ ranges: { salary: 12000 } })).map(j => j.id)).toEqual([2, 3])
    // عند القيمة القصوى (30000) → غير نشِط، يُعيد الكل
    expect(runFacets(JOBS, maxCfg, base({ ranges: { salary: 30000 } }))).toHaveLength(4)
    // غير محدَّد → غير نشِط
    expect(runFacets(JOBS, maxCfg, base())).toHaveLength(4)
  })

  it('البحث النصّيّ يطابق العنوان والمهارات', () => {
    expect(runFacets(JOBS, cfg, base({ q: 'figma' })).map(j => j.id)).toEqual([3])
    expect(runFacets(JOBS, cfg, base({ q: 'مطوّر' })).map(j => j.id)).toEqual([1])
  })
})

describe('runFacets — الفرز', () => {
  it('يفرز حسب sortKey المطلوب', () => {
    expect(runFacets(JOBS, cfg, base({ sortKey: 'salary' })).map(j => j.id)).toEqual([4, 1, 2, 3])
  })

  it('sortKey غير معروف يسقط للفرز الأوّل', () => {
    expect(runFacets(JOBS, cfg, base({ sortKey: 'zzz' })).map(j => j.id)).toEqual([4, 1, 2, 3])
  })
})
