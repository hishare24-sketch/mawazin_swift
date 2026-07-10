<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { usePublicProfileStore } from '@/stores/PublicProfileStore'
import { useSectorContext } from '@/composables/useSectorContext'
import { dominantSector } from '@/services/matchProfile'
import { getSector, visibleSectors } from '@/services/sectors'
import type { FacetSpec, SortSpec } from '@/composables/useFacetedList'
import FacetedList from '@/components/shared/FacetedList.vue'

// ===== استكشاف الأشخاص — دليل الصفحات التعريفية العامة: بوابة هوية أهل المنصة =====
const router = useRouter()
const pub = usePublicProfileStore()
const sector = useSectorContext()

// قطاع الشخص يُشتقّ من مهاراته (لا حقل قطاع صريح) ويُطبَّع إلى slug ليطابق الفاسِت
function personSector(skills: string[]): string | undefined {
  return getSector(dominantSector(skills))?.id
}
function uniq<A>(xs: A[]): A[] {
  return [...new Set(xs)]
}

interface PersonCard {
  slug: string
  name: string
  initial: string
  headline: string
  location: string
  roles: string[]
  skills: string[]
  credibility: number
  followers: number
  rating: number
  /** صاحب الملف الحي في هذا العرض التجريبي */
  live?: boolean
}

/** دليل تجريبي — مع الربط الخلفي يصبح فهرس الصفحات العامة الحقيقي */
const people = computed<PersonCard[]>(() => [
  {
    slug: pub.state.slug,
    name: pub.displayName,
    initial: pub.displayName.trim().charAt(0),
    headline: pub.state.publicHeadline,
    location: pub.state.location,
    roles: ['باحث عن عمل', 'مقيّم معتمد'],
    skills: pub.publicSkills.map(s => s.name),
    credibility: 77,
    followers: pub.state.followersCount,
    rating: pub.avgRating,
    live: true,
  },
  { slug: 'reem-alqahtani', name: 'د. ريم القحطاني', initial: 'ر', headline: 'مستشارة قيادة وموارد بشرية · PMP', location: 'الرياض', roles: ['مستشارة', 'مقيّمة معتمدة'], skills: ['القيادة', 'الإدارة', 'التخطيط'], credibility: 91, followers: 482, rating: 4.8 },
  { slug: 'hind-alzahrani', name: 'أ. هند الزهراني', initial: 'ه', headline: 'مرشدة مسارات تقنية — التحول الوظيفي', location: 'جدة', roles: ['مرشدة مهنية'], skills: ['الإرشاد المهني', 'السير الذاتية'], credibility: 84, followers: 356, rating: 4.9 },
  { slug: 'omar-bawazir', name: 'م. عمر باوزير', initial: 'ع', headline: 'مهندس بيانات أول · مستشار سوق البيانات', location: 'الظهران', roles: ['مستشار', 'مقيّم معتمد'], skills: ['هندسة البيانات', 'Python', 'SQL'], credibility: 88, followers: 267, rating: 4.5 },
  { slug: 'nouf-alshehri', name: 'م. نوف الشهري', initial: 'ن', headline: 'مدربة TypeScript معتمدة — ورش عملية', location: 'الرياض', roles: ['مدربة تقنية'], skills: ['TypeScript', 'Vue.js', 'الاختبارات'], credibility: 82, followers: 391, rating: 4.8 },
  { slug: 'sara-alotaibi', name: 'سارة العتيبي', initial: 'س', headline: 'مهندسة برمجيات — واجهات عالية الأداء', location: 'الرياض', roles: ['باحثة عن عمل'], skills: ['React', 'الأداء', 'إمكانية الوصول'], credibility: 73, followers: 128, rating: 4.4 },
  { slug: 'future-tech', name: 'شركة تقنية المستقبل', initial: 'ت', headline: 'نبني منتجات رقمية تخدم الملايين — نوظّف باستمرار', location: 'الرياض', roles: ['جهة توظيف'], skills: ['تقنية', 'منتجات رقمية'], credibility: 95, followers: 1240, rating: 4.6 },
  { slug: 'khalid-alharbi', name: 'خالد الحربي', initial: 'خ', headline: 'مطوّر ويب — شغوف بجودة الكود', location: 'مكة المكرمة', roles: ['باحث عن عمل'], skills: ['JavaScript', 'Node.js'], credibility: 61, followers: 54, rating: 4.1 },
])

// —— العقد الموحّد: القطاع (مشتقّ) + الدور + المدينة فاسِتات ——
const facets = computed<FacetSpec<PersonCard>[]>(() => [
  {
    key: 'sector', label: 'القطاعات', kind: 'multi', primary: true, searchable: true,
    value: p => personSector(p.skills),
    options: () => visibleSectors().map(s => ({ value: s.id, label: s.label, icon: s.icon })),
  },
  {
    key: 'role', label: 'الدور', kind: 'multi', value: p => p.roles,
    options: () => uniq(people.value.flatMap(p => p.roles)).map(r => ({ value: r, label: r })),
  },
  {
    key: 'city', label: 'المدينة', kind: 'multi', value: p => p.location,
    options: () => uniq(people.value.map(p => p.location)).map(c => ({ value: c, label: c })),
  },
])
const sorts = computed<SortSpec<PersonCard>[]>(() => [
  { key: 'followers', label: 'الأكثر متابعة', cmp: (a, b) => { const d = b.followers - a.followers; return d !== 0 ? d : sector.boost(personSector(b.skills)) - sector.boost(personSector(a.skills)) } },
  { key: 'credibility', label: 'الأعلى مصداقية', cmp: (a, b) => b.credibility - a.credibility },
  { key: 'rating', label: 'الأعلى تقييمًا', cmp: (a, b) => b.rating - a.rating },
])
const primaryPreset = computed(() =>
  sector.has.value ? { label: 'قطاعاتي', icon: 'mdi-shape-outline', values: sector.effective.value } : undefined,
)
const personText = (p: PersonCard) => `${p.name} ${p.headline} ${p.skills.join(' ')}`

// —— فتح الملف: الحيّ يفتح صفحته، والتجريبي بطاقة معاينة ——
const previewPerson = ref<PersonCard | null>(null)
function open(p: PersonCard) {
  if (p.live)
    router.push(`/u/${p.slug}`)
  else
    previewPerson.value = p
}
</script>

<template>
  <div>
    <PageHeader
      title="استكشاف الأشخاص"
      subtitle="تعرّف على أهل المنصة — خبراء وباحثون وجهات، كلٌّ بصفحته التعريفية الموثّقة"
      icon="mdi-account-group-outline"
    />

    <FacetedList
      :items="people"
      :facets="facets"
      :sorts="sorts"
      :text="personText"
      :item-key="(p: PersonCard) => p.slug"
      view="grid"
      :primary-preset="primaryPreset"
      noun="شخص"
      search-placeholder="ابحث بالاسم أو التخصص أو المهارة…"
    >
      <template #item="{ item }">
        <VCard class="pa-4 h-100 d-flex flex-column person-card" @click="open(item as PersonCard)">
          <template v-for="p in [item as PersonCard]" :key="p.slug">
          <div class="d-flex align-center ga-3 mb-2">
            <VAvatar color="primary" variant="tonal" size="48">
              <span class="text-h6 font-weight-bold">{{ p.initial }}</span>
            </VAvatar>
            <div class="flex-grow-1">
              <div class="d-flex align-center ga-1">
                <span class="text-body-1 font-weight-bold">{{ p.name }}</span>
                <VChip v-if="p.live" size="x-small" color="success" variant="tonal" label>حيّ</VChip>
              </div>
              <div class="text-caption text-medium-emphasis">{{ p.headline }}</div>
              <div class="text-caption text-medium-emphasis"><VIcon icon="mdi-map-marker-outline" size="12" /> {{ p.location }}</div>
            </div>
          </div>

          <div class="d-flex flex-wrap ga-1 mb-2">
            <VChip v-for="r in p.roles" :key="r" size="x-small" color="secondary" variant="tonal" label>{{ r }}</VChip>
          </div>
          <div class="d-flex flex-wrap ga-1 mb-3">
            <VChip v-for="sk in p.skills.slice(0, 3)" :key="sk" size="x-small" variant="outlined" label>{{ sk }}</VChip>
          </div>

          <VSpacer />
          <div class="d-flex align-center ga-3 text-caption text-medium-emphasis">
            <span><VIcon icon="mdi-shield-check-outline" size="14" color="primary" /> {{ p.credibility }}%</span>
            <span><VIcon icon="mdi-account-group-outline" size="14" color="accent" /> {{ p.followers }}</span>
            <span><VIcon icon="mdi-star" size="14" color="warning" /> {{ p.rating }}</span>
            <VSpacer />
            <VIcon icon="mdi-arrow-left-circle-outline" size="18" color="primary" />
          </div>
          </template>
        </VCard>
      </template>
    </FacetedList>

    <!-- CTA: صفحتك أنت -->
    <VCard class="brand-gradient pa-5 mt-4 text-center" theme="darkTheme">
      <p class="text-body-1 text-white mb-3">هذه صفحاتهم — أين صفحتك؟ قوّها وشاركها ليجدك أصحاب الفرص هنا.</p>
      <VBtn color="accent" :to="{ name: 'public-profile-manage' }">إدارة صفحتي التعريفية</VBtn>
    </VCard>

    <!-- معاينة ملف تجريبي -->
    <VDialog :model-value="!!previewPerson" max-width="420" @update:model-value="previewPerson = null">
      <VCard v-if="previewPerson" class="pa-5">
        <div class="d-flex align-center ga-3 mb-3">
          <VAvatar color="primary" variant="tonal" size="56"><span class="text-h5 font-weight-bold">{{ previewPerson.initial }}</span></VAvatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold">{{ previewPerson.name }}</div>
            <div class="text-caption text-medium-emphasis">{{ previewPerson.headline }}</div>
          </div>
        </div>
        <div class="d-flex ga-3 text-caption text-medium-emphasis mb-3">
          <span><VIcon icon="mdi-shield-check-outline" size="14" color="primary" /> مصداقية {{ previewPerson.credibility }}%</span>
          <span><VIcon icon="mdi-account-group-outline" size="14" color="accent" /> {{ previewPerson.followers }} متابعًا</span>
          <span><VIcon icon="mdi-star" size="14" color="warning" /> {{ previewPerson.rating }}</span>
        </div>
        <div class="d-flex flex-wrap ga-1 mb-3">
          <VChip v-for="sk in previewPerson.skills" :key="sk" size="x-small" color="primary" variant="tonal" label>{{ sk }}</VChip>
        </div>
        <VAlert color="secondary" variant="tonal" density="compact" border="start" class="text-caption mb-3">
          ملف تجريبي للعرض — الصفحات الكاملة لكل الأعضاء تتفعل مع الربط الخلفي.
        </VAlert>
        <VBtn variant="tonal" color="primary" block @click="previewPerson = null">إغلاق</VBtn>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.person-card {
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;
  border: 1px solid transparent;
}
.person-card:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-2px);
}
</style>
