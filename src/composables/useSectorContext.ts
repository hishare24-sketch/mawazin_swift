// ============================================================================
// طبقة السياق القطاعيّ الموحّدة — مصدر الحقيقة الوحيد لـ«قطاعات المستخدم الفعّالة».
// ----------------------------------------------------------------------------
// المشكلة التي تحلّها: `interestedSectors` (تفضيل المستخدم الصريح) كان يُلتقَط في
// onboarding ثمّ يُهمَل — بيانات ميتة. هذا الـcomposable يجمع التفضيل الصريح مع
// القطاع المشتقّ من المهارات في **سياق واحد** تستهلكه كل الأسطح (عرض/وصول/بحث/
// توصية/مطابقة) عبر أدوات موحّدة، فلا يتبعثر منطق «قطاعاتي» في كل صفحة.
//
// التطبيع: `interestedSectors` تُخزَّن slugs (technology)، و`dominantSector` يعيد
// codes (S01). نوحّد داخليًّا على **codes** لعمليات المجموعات (boost/rank متينة
// تجاه slug/code/قديم عبر getSector)، ونعرض **slugs** للواجهة لأنها لغة الفلاتر
// (treeSel.category يُقارَن بـ sector.id). المرجع: DOC/SECTOR_INTEGRATION_PLAN.md
// ============================================================================
import { computed } from 'vue'
import { getSector, sectorsByPriority } from '@/services/sectors'
import { dominantSector } from '@/services/matchProfile'
import { useAuthStore } from '@/stores/AuthStore'
import { usePersonaStore } from '@/stores/PersonaStore'
import { useProfileStore } from '@/stores/ProfileStore'

/** درجات الترجيح حسب قرب القطاع من سياق المستخدم (نقيّة، قابلة للضبط في م2) */
const BOOST_PRIMARY = 1 // القطاع الأبرز
const BOOST_EXPLICIT = 0.8 // اختيار صريح آخر (interestedSectors)
const BOOST_DERIVED = 0.4 // مشتقّ من المهارات فقط (احتياط)
const BOOST_NONE = 0 // خارج السياق أو بلا سياق (محايد — يحافظ على الترتيب)

function uniq(xs: string[]): string[] {
  return [...new Set(xs)]
}

/** codes القطاعات لقائمة قيم حرّة (slug/code/قديم) — بلا تكرار وبلا فراغات */
function toCodes(values: string[]): string[] {
  return uniq(values.map(v => getSector(v)?.code).filter((c): c is string => !!c))
}

export function useSectorContext() {
  const persona = usePersonaStore()
  const profile = useProfileStore()
  const auth = useAuthStore()

  // — المصادر (codes داخليًّا) —
  // نستبعد S21 («أخرى/يحتاج تصنيف») من السياق: كتلة حوكمة احتياطيّة لا تصلح
  // لتخصيص أيّ سطح (بذر/فلترة/توصية) — قاعدة other_hidden في sectors.ts.
  const isContextual = (code: string) => code !== 'S21'
  /** الاختيار الصريح من onboarding/الإعدادات */
  const explicitCodes = computed(() => toCodes(persona.state.interestedSectors).filter(isContextual))
  /** المشتقّ من مهارات الملف (سلّم الاحتياط) */
  const derivedCodes = computed(() => {
    const code = dominantSector(profile.skills.map(s => s.name))
    return code && isContextual(code) ? [code] : []
  })
  /** الاتّحاد — المصدر الموحّد للتخصيص (explicit ∪ derived) */
  const effectiveCodes = computed(() => uniq([...explicitCodes.value, ...derivedCodes.value]))

  /** القطاع الأبرز: الأعلى أولويّة عرض بين القطاعات الفعّالة (تفضيل الصريح ضمنيًّا) */
  const primaryCode = computed<string | undefined>(() => {
    const codes = effectiveCodes.value
    if (!codes.length)
      return undefined
    // نرتّب بأولويّة العرض (priority أصغر = أبرز) ونفضّل الصريح عند التساوي المفاهيميّ
    const ranked = sectorsByPriority().filter(s => codes.includes(s.code))
    const explicitFirst = ranked.find(s => explicitCodes.value.includes(s.code))
    return (explicitFirst ?? ranked[0])?.code
  })

  // — العرض للواجهة (slugs: لغة الفلاتر والمنتقيات) —
  const toSlug = (code: string) => getSector(code)?.id
  const explicit = computed(() => explicitCodes.value.map(toSlug).filter((s): s is string => !!s))
  const derived = computed(() => derivedCodes.value.map(toSlug).filter((s): s is string => !!s))
  const effective = computed(() => effectiveCodes.value.map(toSlug).filter((s): s is string => !!s))
  const primary = computed(() => (primaryCode.value ? toSlug(primaryCode.value) : undefined))
  const has = computed(() => effectiveCodes.value.length > 0)
  /** هل لدى المستخدم اختيار قطاعيّ **صريح**؟ (أقوى من المشتقّ — يحكم البذر الافتراضيّ) */
  const hasExplicit = computed(() => explicitCodes.value.length > 0)

  // — أدوات الاستهلاك الموحّدة —

  /**
   * هل قطاع العنصر ضمن السياق الفعّال للمستخدم (الاتّحاد)؟ أساس شريحة «قطاعاتي».
   * عنصر بلا قطاع قابل للحلّ → خارج النطاق (لا يُطابِق «قطاعاتي»).
   */
  const effectiveCodeSet = computed(() => new Set(effectiveCodes.value))
  function inEffective(itemSector?: string): boolean {
    if (!itemSector)
      return false
    const code = getSector(itemSector)?.code
    return code ? effectiveCodeSet.value.has(code) : false
  }

  /** معامل ترجيح 0..1 لعنصر حسب قربه من سياق المستخدم (دالة نقيّة تقرأ السياق) */
  function boost(itemSector?: string): number {
    if (!has.value || !itemSector)
      return BOOST_NONE
    const code = getSector(itemSector)?.code
    if (!code)
      return BOOST_NONE
    if (code === primaryCode.value)
      return BOOST_PRIMARY
    if (explicitCodes.value.includes(code))
      return BOOST_EXPLICIT
    if (derivedCodes.value.includes(code))
      return BOOST_DERIVED
    return BOOST_NONE
  }

  /** بذرة فلتر TaxonomyTree من القطاع الأبرز (slug) — قابلة للتجاوز، ليست قفلًا */
  function seedTree(): { category?: string } {
    return primary.value ? { category: primary.value } : {}
  }

  /**
   * إعادة ترتيب نتائج بحث/قائمة برفع عناصر قطاعات المستخدم (ترتيب مستقرّ: يحافظ
   * على ترتيب المتساوين). بلا سياق → لا تغيير (كل الدرجات محايدة).
   */
  function rankSearch<T>(items: T[], getItemSector: (item: T) => string | undefined): T[] {
    if (!has.value)
      return items.slice()
    return items
      .map((item, i) => ({ item, i, b: boost(getItemSector(item)) }))
      .sort((a, b) => b.b - a.b || a.i - b.i)
      .map(x => x.item)
  }

  /** مُدخل seekerMatchProfile من السياق (القطاع الأبرز) بدل المهارات وحدها */
  function matchInput(): { sector?: string } {
    return primary.value ? { sector: primary.value } : {}
  }

  /** بذرة «قطاعاتي» لشريط FacetedList المحوريّ (undefined حين لا سياق) */
  const mySectorsPreset = computed(() =>
    has.value ? { label: 'قطاعاتي', icon: 'mdi-shape-outline', values: effective.value } : undefined,
  )

  return {
    // الدور النشط (العدسة يحدّدها السطح؛ السياق نفسه بلا عدسة)
    role: computed(() => auth.role),
    // القيم (slugs للواجهة)
    explicit,
    derived,
    effective,
    primary,
    has,
    hasExplicit,
    mySectorsPreset,
    // الأدوات
    boost,
    inEffective,
    seedTree,
    rankSearch,
    matchInput,
  }
}
