<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { KIND_META, STATE_META, useRequestsStore } from '@/stores/RequestsStore'
import type { MarketRequest, RequestKind } from '@/stores/RequestsStore'
import { ai } from '@/services/ai'
import { useProfileStore } from '@/stores/ProfileStore'
import { matchScore } from '@/services/matching'
import { requestMatchProfile, seekerMatchProfile } from '@/services/matchProfile'
import { useSectorContext } from '@/composables/useSectorContext'
import { sectorFacet, sectorFromFieldAndSkills } from '@/composables/sectorFacet'
import { sectorForField } from '@/services/sectors'
import type { FacetSpec, SortSpec } from '@/composables/useFacetedList'
import FacetedList from '@/components/shared/FacetedList.vue'
import { uniq } from '@/utils/array'
import { matchColor } from '@/utils/match'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseProgressRing from '@/components/ui/BaseProgressRing.vue'

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}

const router = useRouter()
const store = useRequestsStore()
const profile = useProfileStore()
const sector = useSectorContext()

const smartChips = computed(() => ai.smartFilterChips({ section: 'requests', skills: profile.skills.map(s => s.name) }))
const activeChips = ref<Set<string>>(new Set())
function toggleChip(key: string) {
  const next = new Set(activeChips.value)
  next.has(key) ? next.delete(key) : next.add(key)
  activeChips.value = next
}
const userSkills = computed(() => profile.skills.map(s => s.name))

const seekerProfile = computed(() => seekerMatchProfile({
  skills: userSkills.value,
  city: profile.prefs.location,
  opportunityType: profile.prefs.preferred_employment_types[0],
  ...sector.matchInput(),
}))
function liveMatch(r: MarketRequest): number {
  return matchScore(seekerProfile.value, requestMatchProfile({ field: r.field, skills: r.skills, city: r.city, remote: r.remote })).score
}
const topMatch = computed(() => [...store.requests].sort((a, b) => liveMatch(b) - liveMatch(a))[0])
function reqSector(r: MarketRequest): string | undefined {
  return sectorForField(r.field)?.id
}
const kinds = Object.keys(KIND_META) as RequestKind[]

const facets = computed<FacetSpec<MarketRequest>[]>(() => [
  sectorFacet(sectorFromFieldAndSkills(reqSector, r => r.skills), () => store.requests),
  {
    key: 'field', label: 'المجال', kind: 'multi', searchable: true, value: r => r.field,
    options: () => store.fields.map(f => ({ value: f, label: f })),
  },
  {
    key: 'kind', label: 'نوع الطلب', kind: 'multi', value: r => r.kind,
    options: () => kinds.map(k => ({ value: k, label: KIND_META[k].label, icon: KIND_META[k].icon })),
  },
  {
    key: 'city', label: 'المدينة', kind: 'multi', value: r => r.city,
    options: () => uniq(store.requests.map(r => r.city)).map(c => ({ value: c, label: c })),
  },
  { key: 'remote', label: 'عن بُعد', kind: 'bool', boolValue: r => r.remote },
  { key: 'budget', label: 'الحدّ الأدنى للمقابل', kind: 'range', numberValue: r => r.budgetValue, range: { min: 0, max: 50000, step: 2500 } },
  { key: 'duration', label: 'المدة (أسابيع)', kind: 'range', numberValue: r => r.durationWeeks, range: { min: 1, max: 20, step: 1, mode: 'max' } },
])

const sorts = computed<SortSpec<MarketRequest>[]>(() => [
  { key: 'match', label: 'الأعلى تطابقًا', cmp: (a, b) => { const d = liveMatch(b) - liveMatch(a); return d !== 0 ? d : sector.boost(reqSector(b)) - sector.boost(reqSector(a)) } },
  { key: 'newest', label: 'الأحدث', cmp: (a, b) => b.postedOrder - a.postedOrder },
  { key: 'oldest', label: 'الأقدم', cmp: (a, b) => a.postedOrder - b.postedOrder },
  { key: 'rating', label: 'الأعلى تقييمًا', cmp: (a, b) => b.orgRating - a.orgRating },
  { key: 'price', label: 'الأقل مقابلًا', cmp: (a, b) => a.budgetValue - b.budgetValue },
  { key: 'applicants', label: 'الأكثر تقدّمًا', cmp: (a, b) => b.applicants - a.applicants },
])

const primaryPreset = sector.mySectorsPreset

const preFiltered = computed(() => store.requests.filter((r) => {
  if (activeChips.value.has('newToday') && r.state !== 'new')
    return false
  if (activeChips.value.has('lowComp') && r.applicants >= 5)
    return false
  if (activeChips.value.has('topRated') && r.orgRating < 4.5)
    return false
  if (activeChips.value.has('skills') && !r.skills.some(s => userSkills.value.includes(s)))
    return false
  return true
}))
const reqText = (r: MarketRequest) => `${r.title} ${r.org} ${r.field} ${r.skills.join(' ')}`

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

    <FacetedList
      :items="preFiltered"
      :facets="facets"
      :sorts="sorts"
      :text="reqText"
      :item-key="(r: MarketRequest) => r.id"
      view="list"
      :primary-preset="primaryPreset"
      noun="طلب"
      search-placeholder="ابحث: مشاريع Vue، استشارة معمارية، مهمة قصيرة…"
    >
      <template #banner>
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
      </template>

      <template #item="{ item }">
        <BaseCard
          hover class="cursor-pointer" role="button" tabindex="0"
          @click="open((item as MarketRequest).id)"
          @keydown.enter="open((item as MarketRequest).id)"
          @keydown.space.prevent="open((item as MarketRequest).id)"
        >
          <div class="flex flex-wrap items-center gap-4 sm:flex-nowrap">
            <BaseAvatar :color="mapColor(KIND_META[(item as MarketRequest).kind].color)" :size="56" square>
              <span class="text-lg font-bold">{{ (item as MarketRequest).orgInitial }}</span>
            </BaseAvatar>
            <div class="flex-1" style="min-width: 220px">
              <div class="mb-1 flex flex-wrap items-center gap-2">
                <BaseChip :color="mapColor(KIND_META[(item as MarketRequest).kind].color)"><BaseIcon :name="KIND_META[(item as MarketRequest).kind].icon" :size="12" /> {{ KIND_META[(item as MarketRequest).kind].label }}</BaseChip>
                <BaseChip :color="mapColor(STATE_META[(item as MarketRequest).state].color)"><BaseIcon :name="STATE_META[(item as MarketRequest).state].icon" :size="12" /> {{ STATE_META[(item as MarketRequest).state].label }}</BaseChip>
              </div>
              <div class="mb-1 font-bold">{{ (item as MarketRequest).title }}</div>
              <div class="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span class="font-bold">{{ (item as MarketRequest).org }}</span>
                <span class="flex items-center gap-1"><BaseIcon name="mdi-star" :size="14" style="color: rgb(var(--v-theme-warning))" />{{ (item as MarketRequest).orgRating }} ({{ (item as MarketRequest).orgReviews }})</span>
                <span>· {{ (item as MarketRequest).field }}</span>
              </div>
              <div class="flex flex-wrap gap-1">
                <BaseChip color="neutral"><BaseIcon name="mdi-map-marker-outline" :size="12" /> {{ (item as MarketRequest).remote ? 'عن بُعد' : (item as MarketRequest).city }}</BaseChip>
                <BaseChip color="neutral"><BaseIcon name="mdi-clock-outline" :size="12" /> {{ (item as MarketRequest).duration }}</BaseChip>
                <BaseChip color="neutral"><BaseIcon name="mdi-cash" :size="12" /> {{ (item as MarketRequest).budget }}</BaseChip>
              </div>
            </div>
            <div class="flex flex-col items-center text-center" style="min-width: 84px" title="نسبة التطابق الذكي مع مهاراتك المُثبتة">
              <BaseProgressRing :value="liveMatch(item as MarketRequest)" :color="matchColor(liveMatch(item as MarketRequest))" :size="58" :width="5">
                <span class="text-xs font-bold">{{ liveMatch(item as MarketRequest) }}%</span>
              </BaseProgressRing>
              <div class="mt-1 text-xs text-muted">تطابق</div>
              <BaseChip v-if="store.hasApplied((item as MarketRequest).id)" color="success" class="mt-1"><BaseIcon name="mdi-check" :size="12" /> مقدّم</BaseChip>
            </div>
          </div>
          <div class="my-2 border-t border-ui" />
          <div class="flex items-center justify-between text-xs text-muted">
            <span class="flex items-center gap-1"><BaseIcon name="mdi-account-group-outline" :size="14" /> {{ (item as MarketRequest).applicants }} متقدم · {{ (item as MarketRequest).postedAt }}</span>
            <span class="flex items-center gap-1" style="color: rgb(var(--v-theme-primary))">التفاصيل <BaseIcon name="mdi-arrow-left" :size="16" /></span>
          </div>
        </BaseCard>
      </template>
    </FacetedList>
  </div>
</template>
