// مصنع الفاسِت المحوريّ للقطاع — يوحّد التسمية/الخيارات/الأعلام عبر كل الأسواق.
// كل صفحة تُمرّر فقط دالّة استخراج قطاع العنصر (تختلف بين department/field/skills).
// المرجع: مراجعة عقد الاكتشاف (منع تكرار spec القطاع في 5 صفحات).
import { categorizeSkill } from '@/services/taxonomy'
import { visibleSectors } from '@/services/sectors'
import type { FacetSpec } from '@/composables/useFacetedList'

/** الفاسِت المحوريّ للقطاع: خيارات = كامل التصنيف المرئيّ (مرتّب بالأولويّة، يُخفي «أخرى») */
export function sectorFacet<T>(value: (t: T) => string | string[] | undefined): FacetSpec<T> {
  return {
    key: 'sector',
    label: 'القطاعات',
    kind: 'multi',
    primary: true,
    searchable: true,
    value,
    options: () => visibleSectors().map(s => ({ value: s.id, label: s.label, icon: s.icon })),
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
