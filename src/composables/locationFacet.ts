// مصنع فاسِتَي المكان (دولة + مدينة) — يوحّد محور المكان المُهيكل عبر الأسواق.
// المصدر: locations.ts. القيم تُطبَّع من سلاسل المدن الحرّة في البذور إلى مُعرّفات
// التصنيف (فتُطابِق الخيارات وتُترجَم ثنائيًّا). الخيارات = الحاضر في البيانات فقط
// (المكان محور بيانات لا تصنيف مُلزَم بالعرض الكامل كالقطاعات).
import { allCities, countriesByPriority, countryOfCity, resolveCity } from '@/services/locations'
import { i18n } from '@/plugins/i18n'
import type { FacetSpec } from '@/composables/useFacetedList'

/** فاسِت الدولة — القيمة slug الدولة المشتقّ من مدينة العنصر. */
export function countryFacet<T>(city: (t: T) => string | undefined, items: () => T[]): FacetSpec<T> {
  return {
    key: 'country',
    label: i18n.global.t('discovery.country'),
    kind: 'multi',
    value: item => countryOfCity(city(item)),
    options: () => {
      const present = new Set<string>()
      for (const it of items()) {
        const id = countryOfCity(city(it))
        if (id)
          present.add(id)
      }
      const en = i18n.global.locale.value === 'en'
      return countriesByPriority()
        .filter(c => present.has(c.id))
        .map(c => ({ value: c.id, label: en ? c.en : c.label, icon: 'mdi-flag-outline' }))
    },
  }
}

/** فاسِت المدينة — القيمة مُعرّف المدينة المُطبَّع (لا سلسلة حرّة؛ يمنع تسرّب غير-المدن). */
export function cityFacet<T>(city: (t: T) => string | undefined, items: () => T[]): FacetSpec<T> {
  return {
    key: 'city',
    label: i18n.global.t('discovery.city'),
    kind: 'multi',
    searchable: true,
    value: item => resolveCity(city(item))?.city.id,
    options: () => {
      const present = new Set<string>()
      for (const it of items()) {
        const r = resolveCity(city(it))
        if (r)
          present.add(r.city.id)
      }
      const en = i18n.global.locale.value === 'en'
      return allCities()
        .filter(({ city: c }) => present.has(c.id))
        .map(({ city: c }) => ({ value: c.id, label: en ? c.en : c.label }))
    },
  }
}
