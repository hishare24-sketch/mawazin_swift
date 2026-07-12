// ============================================================================
// جسر بين كائنات المجال (باحث/فرصة) ومحرّك المطابقة `matching.ts`.
// يبني `MatchProfile` من مصادر حقيقية كي تُحسب نسبة التطابق حيًّا بدل الأرقام المبذورة.
// دوال نقيّة (تأخذ قيمًا أوّليّة لا مخازن) — سهلة الاختبار. المرجع: DOC/BACKLOG.md (B1)
// ============================================================================
import type { MatchProfile } from '@/services/matching'
import { getSector, sectorForField, sectorForSkill } from '@/services/sectors'

/** القطاع الغالب على قائمة مهارات (الأكثر تكرارًا) — كود قطاع أو undefined */
export function dominantSector(skills: string[]): string | undefined {
  const counts = new Map<string, number>()
  for (const sk of skills) {
    if (!sk)
      continue
    const code = sectorForSkill(sk)
    if (code)
      counts.set(code, (counts.get(code) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return top?.[0]
}

/** ملف مطابقة للباحث من مهاراته وتفضيلاته (القطاع يُشتقّ من المهارات إن لم يُصرّح) */
export function seekerMatchProfile(input: {
  skills: string[]
  city?: string
  opportunityType?: string
  sector?: string
}): MatchProfile {
  const sectorCode = input.sector ? getSector(input.sector)?.code : dominantSector(input.skills)
  return {
    sector: sectorCode,
    skills: input.skills,
    city: input.city,
    opportunityType: input.opportunityType,
  }
}

/** ملف مطابقة لفرصة (القطاع من حقل department عبر resolver الترحيل) */
export function opportunityMatchProfile(o: {
  department?: string
  skills: string[]
  city?: string
  type?: string
}): MatchProfile {
  return {
    sector: sectorForField(o.department)?.code,
    skills: o.skills,
    city: o.city,
    remote: o.type === 'remote',
    opportunityType: o.type,
  }
}

/** ملف مطابقة لطلب سوق (القطاع من حقل field عبر resolver الترحيل) */
export function requestMatchProfile(r: {
  field?: string
  skills: string[]
  city?: string
  remote?: boolean
}): MatchProfile {
  return {
    sector: sectorForField(r.field)?.code,
    skills: r.skills,
    city: r.city,
    remote: r.remote,
  }
}
