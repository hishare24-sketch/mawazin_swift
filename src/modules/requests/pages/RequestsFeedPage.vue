<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { KIND_META, STATE_META, useRequestsStore } from '@/stores/RequestsStore'
import type { RequestKind } from '@/stores/RequestsStore'
import { ai } from '@/services/ai'
import EmptyState from '@/components/shared/EmptyState.vue'
import TaxonomyTree from '@/components/shared/TaxonomyTree.vue'
import { categorizeSkill } from '@/services/taxonomy'
import { useProfileStore } from '@/stores/ProfileStore'
import { matchScore } from '@/services/matching'
import { requestMatchProfile, seekerMatchProfile } from '@/services/matchProfile'
import type { MarketRequest } from '@/stores/RequestsStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSlider from '@/components/ui/BaseSlider.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseProgressRing from '@/components/ui/BaseProgressRing.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'

// رمز لون Vuetify → نغمة مكوّنات الأساس
type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}

const router = useRouter()
const store = useRequestsStore()
const profile = useProfileStore()

// AI smart quick-filters
const smartChips = computed(() => ai.smartFilterChips({ section: 'requests', skills: profile.skills.map(s => s.name) }))
const activeChips = ref<Set<string>>(new Set())
function toggleChip(key: string) {
  const next = new Set(activeChips.value)
  next.has(key) ? next.delete(key) : next.add(key)
  activeChips.value = next
}
const userSkills = computed(() => profile.skills.map(s => s.name))

// نسبة التطابق الحيّة — نفس محرّك بطاقة الفرصة (قطاع + مهارات + موقع)
const seekerProfile = computed(() => seekerMatchProfile({
  skills: userSkills.value,
  city: profile.prefs.location,
  opportunityType: profile.prefs.preferred_employment_types[0],
}))
function liveMatch(r: MarketRequest): number {
  return matchScore(seekerProfile.value, requestMatchProfile({ field: r.field, skills: r.skills, city: r.city, remote: r.remote })).score
}

const search = ref('')
const searchFocused = ref(false)
const suggestions = computed(() => (searchFocused.value ? ai.searchSuggestions(search.value) : []))

const kinds = Object.keys(KIND_META) as RequestKind[]
const selectedKinds = ref<RequestKind[]>([])
const selectedField = ref<string | null>(null)
const remoteOnly = ref(false)
const maxWeeks = ref(20)
const minBudget = ref(0)
const treeSel = ref<{ category?: string, sub?: string }>({})

const treeItems = computed(() => store.requests.map(r => ({
  skills: r.skills,
  text: `${r.title} ${r.field} ${r.skills.join(' ')}`,
})))

// AI personalized top match (highest LIVE match with the user's profile)
const topMatch = computed(() => [...store.requests].sort((a, b) => liveMatch(b) - liveMatch(a))[0])

// Side-sheet filter + sorting
const filterDrawer = ref(false)
const sortBy = ref<'match' | 'newest' | 'oldest' | 'rating' | 'price' | 'applicants'>('match')
const sortOptions = [
  { value: 'match', title: 'الأعلى تطابقًا' },
  { value: 'newest', title: 'الأحدث' },
  { value: 'oldest', title: 'الأقدم' },
  { value: 'rating', title: 'الأعلى تقييمًا' },
  { value: 'price', title: 'الأقل سعرًا' },
  { value: 'applicants', title: 'الأكثر تقدّمًا' },
]
const activeFilterCount = computed(() =>
  selectedKinds.value.length + (selectedField.value ? 1 : 0) + (remoteOnly.value ? 1 : 0)
  + (maxWeeks.value < 20 ? 1 : 0) + (minBudget.value > 0 ? 1 : 0) + (treeSel.value.category ? 1 : 0),
)
function resetFilters() {
  selectedKinds.value = []
  selectedField.value = null
  remoteOnly.value = false
  maxWeeks.value = 20
  minBudget.value = 0
  treeSel.value = {}
}

function toggleKind(k: RequestKind) {
  selectedKinds.value = selectedKinds.value.includes(k)
    ? selectedKinds.value.filter(x => x !== k)
    : [...selectedKinds.value, k]
}

const filtered = computed(() => {
  const list = store.requests.filter((r) => {
    if (search.value.trim() && !`${r.title} ${r.org} ${r.field} ${r.skills.join(' ')}`.includes(search.value.trim()))
      return false
    if (selectedKinds.value.length && !selectedKinds.value.includes(r.kind))
      return false
    if (selectedField.value && r.field !== selectedField.value)
      return false
    if (remoteOnly.value && !r.remote)
      return false
    if (r.durationWeeks > maxWeeks.value)
      return false
    if (r.budgetValue < minBudget.value)
      return false
    if (treeSel.value.category && !r.skills.some(s => categorizeSkill(s) === treeSel.value.category))
      return false
    if (treeSel.value.sub && !`${r.title} ${r.field} ${r.skills.join(' ')}`.includes(treeSel.value.sub))
      return false
    // AI smart quick-filters
    if (activeChips.value.has('newToday') && r.state !== 'new')
      return false
    if (activeChips.value.has('lowComp') && r.applicants >= 5)
      return false
    if (activeChips.value.has('topRated') && r.orgRating < 4.5)
      return false
    if (activeChips.value.has('skills') && !r.skills.some(s => userSkills.value.includes(s)))
      return false
    return true
  })
  const sorted = [...list]
  switch (sortBy.value) {
    case 'newest': sorted.sort((a, b) => b.postedOrder - a.postedOrder); break
    case 'oldest': sorted.sort((a, b) => a.postedOrder - b.postedOrder); break
    case 'rating': sorted.sort((a, b) => b.orgRating - a.orgRating); break
    case 'price': sorted.sort((a, b) => a.budgetValue - b.budgetValue); break
    case 'applicants': sorted.sort((a, b) => b.applicants - a.applicants); break
    default: sorted.sort((a, b) => liveMatch(b) - liveMatch(a))
  }
  return sorted
})

function matchColor(v: number) {
  if (v >= 85)
    return 'success'
  if (v >= 70)
    return 'accent'
  return 'warning'
}

function applySuggestion(s: string) {
  search.value = s
  searchFocused.value = false
}
function onSearchBlur() {
  setTimeout(() => (searchFocused.value = false), 200)
}
function open(id: number) {
  router.push({ name: 'request-details', params: { id } })
}
</script>

<template>
  <div>
    <PageHeader
      title="سوق الطلبات"
      subtitle="وظائف ومشاريع واستشارات ومهمات — مرتّبة بذكاء حسب تطابقك"
      icon="mdi-storefront-outline"
    >
      <template #actions>
        <BaseButton variant="tonal-emerald" size="sm" :to="{ name: 'my-requests' }">
          <BaseIcon name="mdi-file-send-outline" :size="18" /> طلباتي المقدّمة
        </BaseButton>
      </template>
    </PageHeader>

    <!-- Smart search -->
    <div class="relative mb-4">
      <BaseInput
        v-model="search"
        prefix-icon="mdi-magnify"
        placeholder="ابحث: مشاريع Vue، استشارة معمارية، مهمة قصيرة..."
        @focus="searchFocused = true"
        @blur="onSearchBlur"
      >
        <template #suffix>
          <BaseChip color="emerald"><BaseIcon name="mdi-robot-happy-outline" :size="14" /> بحث ذكي</BaseChip>
        </template>
      </BaseInput>

      <!-- AI live suggestions -->
      <div
        v-if="searchFocused && suggestions.length"
        class="dd-panel border-ui rounded-ui-lg absolute inset-x-0 z-10 mt-1 overflow-hidden bg-surface shadow-xl shadow-black/25"
      >
        <div class="px-3 py-2 text-xs text-muted"><BaseIcon name="mdi-robot-happy-outline" :size="16" /> اقتراحات ذكية</div>
        <button
          v-for="(s, i) in suggestions"
          :key="i"
          class="flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition hover:bg-surfalt"
          @mousedown="applySuggestion(s)"
        >
          <BaseIcon name="mdi-magnify" :size="18" class="text-muted" /> {{ s }}
        </button>
      </div>
    </div>

    <!-- Toolbar: count · filter · sort -->
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <span class="text-sm text-muted">{{ filtered.length }} طلب</span>
      <div class="flex items-center gap-2">
        <BaseButton variant="outline" size="sm" @click="filterDrawer = true">
          <BaseIcon name="mdi-filter-variant" :size="18" /> فلترة
          <BaseChip v-if="activeFilterCount" color="accent">{{ activeFilterCount }}</BaseChip>
        </BaseButton>
        <BaseSelect v-model="sortBy" :items="sortOptions" prefix-icon="mdi-sort" class="w-[190px]" />
      </div>
    </div>

    <!-- AI smart quick-filters -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <span class="text-xs text-muted"><BaseIcon name="mdi-robot-happy-outline" :size="16" style="color: rgb(var(--v-theme-secondary))" /> فلاتر ذكية:</span>
      <button
        v-for="chip in smartChips"
        :key="chip.key"
        class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition"
        :class="activeChips.has(chip.key) ? 'bg-emerald text-on-brand' : 'border-ui text-content hover:bg-surfalt'"
        @click="toggleChip(chip.key)"
      >
        <BaseIcon :name="chip.icon" :size="14" /> {{ chip.label }}
      </button>
    </div>

    <!-- AI personalized top match -->
    <div
      v-if="topMatch"
      class="rounded-ui mb-4 flex flex-wrap items-center justify-between gap-2 border-s-4 p-3"
      style="border-color: rgb(var(--v-theme-secondary)); background: rgba(var(--v-theme-secondary), 0.1)"
    >
      <span class="text-sm">
        <BaseIcon name="mdi-robot-happy-outline" :size="16" /> ترشيح مخصّص لك: «{{ topMatch.title }}» من {{ topMatch.org }} — تطابق
        <strong>{{ liveMatch(topMatch) }}%</strong> مع ملفك.
      </span>
      <BaseButton variant="emerald" size="sm" @click="open(topMatch.id)">عرض</BaseButton>
    </div>

    <!-- Horizontal request cards -->
    <BaseCard
      v-for="r in filtered"
      :key="r.id"
      hover
      class="mb-3 cursor-pointer"
      @click="open(r.id)"
    >
      <div class="flex flex-wrap items-center gap-4 sm:flex-nowrap">
        <!-- Org logo -->
        <BaseAvatar :color="mapColor(KIND_META[r.kind].color)" :size="56" square>
          <span class="text-lg font-bold">{{ r.orgInitial }}</span>
        </BaseAvatar>

        <!-- Main info -->
        <div class="flex-1" style="min-width: 220px">
          <div class="mb-1 flex flex-wrap items-center gap-2">
            <BaseChip :color="mapColor(KIND_META[r.kind].color)"><BaseIcon :name="KIND_META[r.kind].icon" :size="12" /> {{ KIND_META[r.kind].label }}</BaseChip>
            <BaseChip :color="mapColor(STATE_META[r.state].color)"><BaseIcon :name="STATE_META[r.state].icon" :size="12" /> {{ STATE_META[r.state].label }}</BaseChip>
          </div>
          <div class="mb-1 font-bold">{{ r.title }}</div>
          <div class="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span class="font-bold">{{ r.org }}</span>
            <span class="flex items-center gap-1"><BaseIcon name="mdi-star" :size="14" style="color: #f59e0b" />{{ r.orgRating }} ({{ r.orgReviews }})</span>
            <span>· {{ r.field }}</span>
          </div>
          <div class="flex flex-wrap gap-1">
            <BaseChip color="neutral"><BaseIcon name="mdi-map-marker-outline" :size="12" /> {{ r.remote ? 'عن بُعد' : r.city }}</BaseChip>
            <BaseChip color="neutral"><BaseIcon name="mdi-clock-outline" :size="12" /> {{ r.duration }}</BaseChip>
            <BaseChip color="neutral"><BaseIcon name="mdi-cash" :size="12" /> {{ r.budget }}</BaseChip>
          </div>
        </div>

        <!-- Match ring + action -->
        <div class="flex flex-col items-center text-center" style="min-width: 84px" title="نسبة التطابق الذكي مع مهاراتك المُثبتة">
          <BaseProgressRing :value="liveMatch(r)" :color="matchColor(liveMatch(r))" :size="58" :width="5">
            <span class="text-xs font-bold">{{ liveMatch(r) }}%</span>
          </BaseProgressRing>
          <div class="mt-1 text-xs text-muted">تطابق</div>
          <BaseChip v-if="store.hasApplied(r.id)" color="success" class="mt-1"><BaseIcon name="mdi-check" :size="12" /> مقدّم</BaseChip>
        </div>
      </div>

      <div class="my-2 border-t border-ui" />
      <div class="flex items-center justify-between text-xs text-muted">
        <span class="flex items-center gap-1"><BaseIcon name="mdi-account-group-outline" :size="14" /> {{ r.applicants }} متقدم · {{ r.postedAt }}</span>
        <span class="flex items-center gap-1" style="color: rgb(var(--v-theme-primary))">التفاصيل <BaseIcon name="mdi-arrow-left" :size="16" /></span>
      </div>
    </BaseCard>

    <BaseCard v-if="!filtered.length">
      <EmptyState
        icon="mdi-magnify-close"
        title="لا طلبات مطابقة"
        description="وسّع نطاق المدة أو المقابل، أو أزل بعض الفلاتر لعرض المزيد."
      />
    </BaseCard>

    <!-- Filter side sheet -->
    <BaseDrawer v-model="filterDrawer" :width="330">
      <div class="p-4">
        <div class="mb-4 flex items-center justify-between">
          <span class="flex items-center gap-1 font-bold"><BaseIcon name="mdi-filter-variant" :size="20" /> فلترة الطلبات</span>
          <button class="icon-btn h-8 w-8" aria-label="إغلاق" @click="filterDrawer = false"><BaseIcon name="mdi-close" :size="20" /></button>
        </div>

        <TaxonomyTree v-model="treeSel" :items="treeItems" class="mb-4" />
        <div class="mb-4 border-t border-ui" />

        <div class="mb-2 text-xs font-bold">نوع الطلب</div>
        <div class="mb-4 flex flex-wrap gap-1">
          <button
            v-for="k in kinds"
            :key="k"
            class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition"
            :class="selectedKinds.includes(k) ? 'bg-emerald text-on-brand' : 'border-ui text-content hover:bg-surfalt'"
            @click="toggleKind(k)"
          >
            <BaseIcon :name="KIND_META[k].icon" :size="14" /> {{ KIND_META[k].label }}
          </button>
        </div>

        <BaseSelect v-model="selectedField" :items="store.fields.map(f => ({ value: f, title: f }))" placeholder="المجال" clearable class="mb-4" />

        <div class="mb-1 text-xs font-bold">المدة (حتى {{ maxWeeks }} أسبوع)</div>
        <BaseSlider v-model="maxWeeks" :min="1" :max="20" :step="1" color="accent" class="mb-3" />

        <div class="mb-1 text-xs font-bold">حد أدنى للمقابل ({{ minBudget.toLocaleString('en-US') }} ريال)</div>
        <BaseSlider v-model="minBudget" :min="0" :max="50000" :step="2500" color="secondary" class="mb-3" />

        <BaseSwitch v-model="remoteOnly" label="عن بُعد فقط" class="mb-4" />

        <div class="flex gap-2">
          <BaseButton variant="tonal-brand" block @click="resetFilters">إعادة تعيين</BaseButton>
          <BaseButton variant="accent" block @click="filterDrawer = false">عرض ({{ filtered.length }})</BaseButton>
        </div>
      </div>
    </BaseDrawer>
  </div>
</template>
