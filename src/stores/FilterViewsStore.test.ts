import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFilterViewsStore } from './FilterViewsStore'
import type { FacetState } from '@/composables/useFacetedList'

function state(sel: Record<string, string[]>): FacetState {
  return { q: '', sel, bools: {}, ranges: {}, sortKey: 'match' }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('filterViewsStore', () => {
  it('saves and lists views scoped per surface', () => {
    const s = useFilterViewsStore()
    s.saveView('opportunities', 'الرياض · تقنية', state({ sector: ['technology'], city: ['riyadh'] }))
    s.saveView('requests', 'تصميم', state({ sector: ['design'] }))
    expect(s.forSurface('opportunities')).toHaveLength(1)
    expect(s.forSurface('requests')).toHaveLength(1)
    expect(s.forSurface('people')).toHaveLength(0)
    expect(s.forSurface('opportunities')[0].label).toBe('الرياض · تقنية')
  })

  it('assigns unique ids and prepends newest', () => {
    const s = useFilterViewsStore()
    const a = s.saveView('opportunities', 'A', state({}))
    const b = s.saveView('opportunities', 'B', state({}))
    expect(a.id).not.toBe(b.id)
    expect(s.forSurface('opportunities')[0].label).toBe('B') // الأحدث أولًا
  })

  it('removes a view by id', () => {
    const s = useFilterViewsStore()
    const v = s.saveView('opportunities', 'X', state({ city: ['jeddah'] }))
    s.removeView(v.id)
    expect(s.forSurface('opportunities')).toHaveLength(0)
  })

  it('persists to localStorage and restores on a fresh store', () => {
    const s = useFilterViewsStore()
    s.saveView('experts', 'مرشد', state({ role: ['coach'] }))
    setActivePinia(createPinia())
    const s2 = useFilterViewsStore()
    expect(s2.forSurface('experts')).toHaveLength(1)
    // معرّف تالٍ لا يتصادم بعد الاستعادة
    const added = s2.saveView('experts', 'مدرّب', state({ role: ['trainer'] }))
    const ids = s2.forSurface('experts').map(v => v.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(added.id).toBeGreaterThan(0)
  })
})
