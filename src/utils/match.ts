// سلّم لون «نسبة التطابق» الموحّد عبر كل بطاقات الاكتشاف — رمز ثيم Vuetify.
// مصدر حقيقة واحد يمنع تباين العتبات/الألوان بين الأسواق (كان الوسط secondary
// في الفرص وaccent في الطلبات، وثابتًا أخضر في المقيّمين).
export type MatchColor = 'success' | 'secondary' | 'warning'

/** رمز ثيم Vuetify (للأشرطة/الحلقات والأنماط المضمّنة): ≥85 success · ≥70 secondary · وإلا warning */
export function matchColor(rate: number): MatchColor {
  if (rate >= 85)
    return 'success'
  if (rate >= 70)
    return 'secondary'
  return 'warning'
}

// نفس السلّم بمسمّيات لوحة BaseChip (التي تُسمّي الأخضر emerald لا secondary).
export type MatchChipColor = 'success' | 'emerald' | 'warning'

/** مطابق لـ matchColor لكن بمسمّى BaseChip: ≥85 success · ≥70 emerald · وإلا warning */
export function matchChipColor(rate: number): MatchChipColor {
  if (rate >= 85)
    return 'success'
  if (rate >= 70)
    return 'emerald'
  return 'warning'
}
