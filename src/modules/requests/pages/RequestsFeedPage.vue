<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import { KIND_META, STATE_META, useRequestsStore } from '@/stores/RequestsStore'
import type { MarketRequest, RequestKind } from '@/stores/RequestsStore'
import { ai } from '@/services/ai'
import { useProfileStore } from '@/stores/ProfileStore'
import { matchScore } from '@/services/matching'
import { requestMatchProfile, seekerMatchProfile } from '@/services/matchProfile'
import { useSectorContext } from '@/composables/useSectorContext'
import { sectorFacet, sectorFromFieldAndSkills } from '@/composables/sectorFacet'
import { cityFacet, countryFacet } from '@/composables/locationFacet'
import { sectorForField } from '@/services/sectors'
import type { FacetSpec, SortSpec } from '@/composables/useFacetedList'
import FacetedList from '@/components/shared/FacetedList.vue'
import MatchBadge from '@/components/shared/MatchBadge.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}

const { t } = useI18n()
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
    key: 'field', label: t('discovery.requests.facetField'), kind: 'multi', searchable: true, value: r => r.field,
    options: () => store.fields.map(f => ({ value: f, label: f })),
  },
  {
    key: 'kind', label: t('discovery.requests.facetKind'), kind: 'multi', value: r => r.kind,
    options: () => kinds.map(k => ({ value: k, label: KIND_META[k].label, icon: KIND_META[k].icon })),
  },
  countryFacet(r => r.city, () => store.requests),
  cityFacet(r => r.city, () => store.requests),
  { key: 'remote', label: t('discovery.remote'), kind: 'bool', boolValue: r => r.remote },
  { key: 'budget', label: t('discovery.requests.facetMinBudget'), kind: 'range', numberValue: r => r.budgetValue, range: { min: 0, max: 50000, step: 2500 } },
  { key: 'duration', label: t('discovery.requests.facetDuration'), kind: 'range', numberValue: r => r.durationWeeks, range: { min: 1, max: 20, step: 1, mode: 'max' } },
])

const sorts = computed<SortSpec<MarketRequest>[]>(() => [
  { key: 'match', label: t('discovery.sortTopMatch'), cmp: (a, b) => { const d = liveMatch(b) - liveMatch(a); return d !== 0 ? d : sector.boost(reqSector(b)) - sector.boost(reqSector(a)) } },
  { key: 'newest', label: t('discovery.sortNewest'), cmp: (a, b) => b.postedOrder - a.postedOrder },
  { key: 'oldest', label: t('discovery.sortOldest'), cmp: (a, b) => a.postedOrder - b.postedOrder },
  { key: 'rating', label: t('discovery.requests.sortRatingHigh'), cmp: (a, b) => b.orgRating - a.orgRating },
  { key: 'price', label: t('discovery.requests.sortBudgetLow'), cmp: (a, b) => a.budgetValue - b.budgetValue },
  { key: 'applicants', label: t('discovery.requests.sortApplicants'), cmp: (a, b) => b.applicants - a.applicants },
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
      :title="t('discovery.requests.title')"
      :subtitle="t('discovery.requests.subtitle')"
      icon="mdi-storefront-outline"
    >
      <template #actions>
        <BaseButton variant="tonal-emerald" size="sm" :to="{ name: 'my-requests' }">
          <BaseIcon name="mdi-file-send-outline" :size="18" /> {{ t('discovery.requests.myRequests') }}
        </BaseButton>
      </template>
    </PageHeader>

    <!-- AI smart quick-filters -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <span class="text-xs text-muted"><BaseIcon name="mdi-robot-happy-outline" :size="16" style="color: rgb(var(--v-theme-secondary))" /> {{ t('discovery.smartFilters') }}</span>
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
      surface="requests"
      view="list"
      :primary-preset="primaryPreset"
      :noun="t('discovery.requests.noun')"
      :search-placeholder="t('discovery.requests.search')"
    >
      <template #banner>
        <div
          v-if="topMatch"
          class="rounded-ui mb-4 flex flex-wrap items-center justify-between gap-2 border-s-4 p-3"
          style="border-color: rgb(var(--v-theme-secondary)); background: rgba(var(--v-theme-secondary), 0.1)"
        >
          <span class="text-sm">
            <BaseIcon name="mdi-robot-happy-outline" :size="16" /> {{ t('discovery.requests.topBanner', { title: topMatch.title, org: topMatch.org, rate: liveMatch(topMatch) }) }}
          </span>
          <BaseButton variant="emerald" size="sm" @click="open(topMatch.id)">{{ t('discovery.view') }}</BaseButton>
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
                <BaseChip color="neutral"><BaseIcon name="mdi-map-marker-outline" :size="12" /> {{ (item as MarketRequest).remote ? t('discovery.remote') : (item as MarketRequest).city }}</BaseChip>
                <BaseChip color="neutral"><BaseIcon name="mdi-clock-outline" :size="12" /> {{ (item as MarketRequest).duration }}</BaseChip>
                <BaseChip color="neutral"><BaseIcon name="mdi-cash" :size="12" /> {{ (item as MarketRequest).budget }}</BaseChip>
              </div>
            </div>
            <div class="flex flex-col items-center text-center" style="min-width: 84px" :title="t('discovery.matchRate')">
              <MatchBadge :value="liveMatch(item as MarketRequest)" variant="ring" :label="t('discovery.matchShort')" />
              <BaseChip v-if="store.hasApplied((item as MarketRequest).id)" color="success" class="mt-1"><BaseIcon name="mdi-check" :size="12" /> {{ t('discovery.requests.applied') }}</BaseChip>
            </div>
          </div>
          <div class="my-2 border-t border-ui" />
          <div class="flex items-center justify-between text-xs text-muted">
            <span class="flex items-center gap-1"><BaseIcon name="mdi-account-group-outline" :size="14" /> {{ t('discovery.requests.applicants', { count: (item as MarketRequest).applicants }) }} · {{ (item as MarketRequest).postedAt }}</span>
            <span class="flex items-center gap-1" style="color: rgb(var(--v-theme-primary))">{{ t('discovery.details') }} <BaseIcon name="mdi-arrow-left" :size="16" /></span>
          </div>
        </BaseCard>
      </template>
    </FacetedList>
  </div>
</template>
