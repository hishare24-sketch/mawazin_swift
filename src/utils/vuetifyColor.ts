// خريطة لون موحّدة: أسماء ألوان Vuetify/التصنيف → مفردات ألوان مكوّنات الأساس.
// مصدر واحد يمنع تكرار `type BaseColor` + `mapColor` المبعثر عبر الصفحات.
// الخريطة superset لكل المتغيّرات المحليّة السابقة (fallback: تمرير لون Base صالح، وإلا brand).
export type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const MAP: Record<string, BaseColor> = {
  primary: 'brand',
  secondary: 'emerald',
  'medium-emphasis': 'neutral',
  'surface-variant': 'neutral',
  'blue-grey': 'neutral',
  grey: 'neutral',
  orange: 'warning',
  amber: 'warning',
}

/** يحوّل اسم لون (Vuetify/تصنيف) إلى BaseColor؛ يمرّر ألوان Base الصالحة كما هي، وإلا brand. */
export function mapVuetifyColor(c?: string): BaseColor {
  return (MAP[c ?? ''] ?? c ?? 'brand') as BaseColor
}
