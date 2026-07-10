// مصنع الفاسِت المحوريّ للقطاع — يوحّد التسمية/الخيارات/الأعلام عبر كل الأسواق.
// كل صفحة تُمرّر فقط دالّة استخراج قطاع العنصر (تختلف بين department/field/skills).
// المرجع: مراجعة عقد الاكتشاف (منع تكرار spec القطاع في 5 صفحات).
import { categorizeSkill } from '@/services/taxonomy'
import { visibleSectors } from '@/services/sectors'
import type { FacetSpec } from '@/composables/useFacetedList'

/**
 * الفاسِت المحوريّ للقطاع. الخيارات = القطاعات **الحاضرة فعلًا في البيانات**
 * (مرتّبة بأولويّة التصنيف، بأيقونات/تسميات التصنيف) — كي لا يعرض الشريط المحوريّ
 * قطاعات بلا نتائج (أخطر خلل مظهريّ حين تغطّي البيانات جزءًا من التصنيف).
 * يُمرَّر `items` كامل مجموعة السوق (لا المصفّاة) كي لا تختفي الخيارات مع التصفية.
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
      const present = new Set<string>()
      for (const it of items()) {
        const v = value(it)
        if (Array.isArray(v))
          v.forEach(x => x && present.add(x))
        else if (v)
          present.add(v)
      }
      return visibleSectors()
        .filter(s => present.has(s.id))
        .map(s => ({ value: s.id, label: s.label, icon: s.icon }))
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
