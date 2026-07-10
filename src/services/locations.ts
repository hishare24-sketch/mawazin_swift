// ============================================================================
// تصنيف المواقع الموحّد — محور «المكان» المتعامد (دولة → مدينة).
// ----------------------------------------------------------------------------
// يعالج فجوتين: (1) لم يكن هناك نموذج مواقع مُهيكل (المدن سلاسل حرّة، و«عن بُعد»
// كانت تُخزَّن كأنها مدينة فتختلط بمحور المكان)؛ (2) لا محور دولة. هنا نموذج
// دولة→مدينة ثنائيّ اللغة + resolver «تطبيع عند القراءة» يربط سلاسل المدن الحرّة
// في البذور بالتصنيف (نفس فلسفة sectors.ts/FIELD_TO_SECTOR). «عن بُعد» ليست مكانًا
// بل ترتيب عمل (محور مستقلّ) — لا تدخل هنا إطلاقًا.
// ============================================================================

export interface City {
  id: string
  label: string
  en: string
}
export interface Country {
  code: string // ISO-3166 alpha-2 (SA/AE/…)
  id: string // slug ثابت (saudi/uae/…)
  label: string
  en: string
  priority: number // أولوية الظهور (السوق الأساسيّ أولًا)
  cities: City[]
}

// دول خليجيّة/عربيّة مع أبرز مدنها (ثنائيّ اللغة). المصدر الأساسيّ السعوديّة.
export const COUNTRIES: Country[] = [
  {
    code: 'SA', id: 'saudi', label: 'السعودية', en: 'Saudi Arabia', priority: 1,
    cities: [
      { id: 'riyadh', label: 'الرياض', en: 'Riyadh' },
      { id: 'jeddah', label: 'جدة', en: 'Jeddah' },
      { id: 'makkah', label: 'مكة المكرمة', en: 'Makkah' },
      { id: 'madinah', label: 'المدينة المنورة', en: 'Madinah' },
      { id: 'dammam', label: 'الدمام', en: 'Dammam' },
      { id: 'khobar', label: 'الخبر', en: 'Khobar' },
      { id: 'dhahran', label: 'الظهران', en: 'Dhahran' },
      { id: 'ahsa', label: 'الأحساء', en: 'Al Ahsa' },
      { id: 'taif', label: 'الطائف', en: 'Taif' },
      { id: 'buraidah', label: 'بريدة', en: 'Buraidah' },
      { id: 'tabuk', label: 'تبوك', en: 'Tabuk' },
      { id: 'abha', label: 'أبها', en: 'Abha' },
    ],
  },
  {
    code: 'AE', id: 'uae', label: 'الإمارات', en: 'UAE', priority: 2,
    cities: [
      { id: 'dubai', label: 'دبي', en: 'Dubai' },
      { id: 'abudhabi', label: 'أبوظبي', en: 'Abu Dhabi' },
      { id: 'sharjah', label: 'الشارقة', en: 'Sharjah' },
    ],
  },
  {
    code: 'QA', id: 'qatar', label: 'قطر', en: 'Qatar', priority: 3,
    cities: [{ id: 'doha', label: 'الدوحة', en: 'Doha' }],
  },
  {
    code: 'KW', id: 'kuwait', label: 'الكويت', en: 'Kuwait', priority: 4,
    cities: [{ id: 'kuwait_city', label: 'مدينة الكويت', en: 'Kuwait City' }],
  },
  {
    code: 'BH', id: 'bahrain', label: 'البحرين', en: 'Bahrain', priority: 5,
    cities: [{ id: 'manama', label: 'المنامة', en: 'Manama' }],
  },
  {
    code: 'OM', id: 'oman', label: 'عُمان', en: 'Oman', priority: 6,
    cities: [{ id: 'muscat', label: 'مسقط', en: 'Muscat' }],
  },
  {
    code: 'EG', id: 'egypt', label: 'مصر', en: 'Egypt', priority: 7,
    cities: [
      { id: 'cairo', label: 'القاهرة', en: 'Cairo' },
      { id: 'alexandria', label: 'الإسكندرية', en: 'Alexandria' },
    ],
  },
  {
    code: 'JO', id: 'jordan', label: 'الأردن', en: 'Jordan', priority: 8,
    cities: [{ id: 'amman', label: 'عمّان', en: 'Amman' }],
  },
]

// فهرس تسمية المدينة (عربيّ/إنجليزيّ) → { المدينة، الدولة } لتطبيع السلاسل الحرّة.
const CITY_INDEX = new Map<string, { city: City, country: Country }>()
for (const country of COUNTRIES) {
  for (const city of country.cities) {
    CITY_INDEX.set(city.label, { city, country })
    CITY_INDEX.set(city.en.toLowerCase(), { city, country })
    CITY_INDEX.set(city.id, { city, country })
  }
}

/** حلّ سلسلة مدينة حرّة (عربيّ/إنجليزيّ/slug) إلى { المدينة، الدولة } — أو undefined. */
export function resolveCity(raw?: string): { city: City, country: Country } | undefined {
  if (!raw)
    return undefined
  const t = raw.trim()
  return CITY_INDEX.get(t) ?? CITY_INDEX.get(t.toLowerCase())
}

/** slug الدولة لمدينة معطاة (لفاسِت الدولة). undefined إن لم تُعرَف. */
export function countryOfCity(cityName?: string): string | undefined {
  return resolveCity(cityName)?.country.id
}

/** الدول مرتّبة بالأولويّة (السوق الأساسيّ أولًا). */
export function countriesByPriority(): Country[] {
  return [...COUNTRIES].sort((a, b) => a.priority - b.priority)
}

/** كل المدن (لبناء خيارات) مرتّبة حسب أولويّة دولتها ثم إدراجها. */
export function allCities(): { city: City, country: Country }[] {
  return countriesByPriority().flatMap(country => country.cities.map(city => ({ city, country })))
}
