// مصنع الفاسِت المحوريّ للقطاع — يوحّد التسمية/الخيارات/الأعلام عبر كل الأسواق.
// كل صفحة تُمرّر فقط دالّة استخراج قطاع العنصر (تختلف بين department/field/skills).
// المرجع: مراجعة عقد الاكتشاف (منع تكرار spec القطاع في 5 صفحات).
import { categorizeSkill } from '@/services/taxonomy'
import { visibleSectors } from '@/services/sectors'
import { i18n } from '@/plugins/i18n'
import type { FacetSpec } from '@/composables/useFacetedList'

/**
 * الفاسِت المحوريّ للقطاع. الخيارات = **كامل القطاعات المرئيّة الـ20** مرتّبة
 * بأولويّة التصنيف (قرار خطة التوحيد المعتمد #1: «الـ21 كاملةً — لا مجموعة جزئية
 * — عبر الأولويّة لا البتر»). لكل خيار **عدّاد نتائج** كي لا تبدو القطاعات الفارغة
 * مكسورة. يُمرَّر `items` كامل مجموعة السوق (لا المصفّاة) فيثبت العدّاد مع التصفية.
 */
export function sectorFacet<T>(
  value: (t: T) => string | string[] | undefined,
  items: () => T[],
): FacetSpec<T> {
  return {
    key: 'sector',
    label: 'القطاعات',
    kind: 'multi',
    primary: true,
    searchable: true,
    value,
    options: () => {
      const counts = new Map<string, number>()
      for (const it of items()) {
        const v = value(it)
        // إزالة التكرار داخل العنصر (حقل + عدّة مهارات لنفس القطاع) فيُعدّ العنصر مرّة واحدة لكل قطاع
        const ids = new Set(Array.isArray(v) ? v : v ? [v] : [])
        for (const id of ids)
          counts.set(id, (counts.get(id) ?? 0) + 1)
      }
      const en = i18n.global.locale.value === 'en'
      return visibleSectors().map(s => ({
        value: s.id,
        label: en ? s.en : s.label,
        icon: s.icon,
        count: counts.get(s.id) ?? 0,
      }))
    },
  }
}

/**
 * بانية قيمة القطاع بتسامح الشجرة القديمة: قطاع الحقل + القطاعات المشتقّة من المهارات
 * (عنصر يظهر ضمن قطاع إن طابقه حقلُه أو صُنِّفت إحدى مهاراته إليه).
 */
export function sectorFromFieldAndSkills<T>(
  field: (t: T) => string | undefined,
  skills: (t: T) => string[],
): (t: T) => string[] {
  return t => [field(t), ...skills(t).map(s => categorizeSkill(s))].filter((x): x is string => !!x)
}
