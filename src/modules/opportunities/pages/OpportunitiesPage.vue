<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import OpportunityCard from '../components/OpportunityCard.vue'
import { mockOpportunities } from '../services/mockOpportunities'
import { EMPLOYMENT_TYPE_LABELS, EXPERIENCE_LEVEL_LABELS } from '../interfaces/Opportunity'
import type { Opportunity } from '../interfaces/Opportunity'
import { useSavedStore } from '@/stores/SavedStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { matchScore } from '@/services/matching'
import { opportunityMatchProfile, seekerMatchProfile } from '@/services/matchProfile'
import { sectorForField } from '@/services/sectors'
import { useSectorContext } from '@/composables/useSectorContext'
import { sectorFacet, sectorFromFieldAndSkills } from '@/composables/sectorFacet'
import type { FacetSpec, SortSpec } from '@/composables/useFacetedList'
import FacetedList from '@/components/shared/FacetedList.vue'
import { uniq } from '@/utils/array'
import { ai } from '@/services/ai'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'

const savedStore = useSavedStore()
const profile = useProfileStore()
const sector = useSectorContext()

// AI smart quick-filters (طبقة تصفية سابقة على العقد الموحّد)
const smartChips = computed(() => ai.smartFilterChips({ section: 'opportunities', skills: profile.skills.map(s => s.name) }))
const activeChips = ref<Set<string>>(new Set())
function toggleChip(key: string) {
  const next = new Set(activeChips.value)
  next.has(key) ? next.delete(key) : next.add(key)
  activeChips.value = next
}
const userSkills = computed(() => profile.skills.map(s => s.name))

// نسبة التطابق الحيّة (القطاع من سياق المستخدم) — للفرز و«الأعلى تطابقاً»
const seekerProfile = computed(() => seekerMatchProfile({
  skills: userSkills.value,
  city: profile.prefs.location,
  opportunityType: profile.prefs.preferred_employment_types[0],
  ...sector.matchInput(),
}))
function liveMatch(o: Opportunity): number {
  return matchScore(seekerProfile.value, opportunityMatchProfile(o)).score
}
const topMatch = computed(() => [...mockOpportunities].sort((a, b) => liveMatch(b) - liveMatch(a))[0])

const savedOnly = ref(false)
const view = ref<'grid' | 'list'>('grid')

function oppSector(o: Opportunity): string | undefined {
  return sectorForField(o.department)?.id
}

// —— العقد الموحّد: spec الفاسِتات + الفرز (القطاع محوريّ، مُنتقٍ باحث) ——
const facets = computed<FacetSpec<Opportunity>[]>(() => [
  sectorFacet(sectorFromFieldAndSkills(oppSector, o => o.skills), () => mockOpportunities),
  {
    key: 'city', label: 'المدينة', kind: 'multi', value: o => o.city,
    options: () => uniq(mockOpportunities.map(o => o.city)).map(c => ({ value: c, label: c })),
  },
  {
    key: 'type', label: 'النوع', kind: 'multi', value: o => o.type,
    options: () => uniq(mockOpportunities.map(o => o.type)).map(t => ({ value: t, label: EMPLOYMENT_TYPE_LABELS[t] })),
  },
  {
    key: 'level', label: 'الخبرة', kind: 'multi', value: o => o.level,
    options: () => uniq(mockOpportunities.map(o => o.level)).map(l => ({ value: l, label: EXPERIENCE_LEVEL_LABELS[l] })),
  },
  { key: 'salary', label: 'الحدّ الأدنى للراتب', kind: 'range', numberValue: o => o.salaryMax, range: { min: 0, max: 28000, step: 1000 } },
])

const sorts = computed<SortSpec<Opportunity>[]>(() => [
  { key: 'match', label: 'الأعلى تطابقًا', cmp: (a, b) => { const d = liveMatch(b) - liveMatch(a); return d !== 0 ? d : sector.boost(oppSector(b)) - sector.boost(oppSector(a)) } },
  { key: 'newest', label: 'الأحدث', cmp: (a, b) => a.postedDaysAgo - b.postedDaysAgo },
  { key: 'oldest', label: 'الأقدم', cmp: (a, b) => b.postedDaysAgo - a.postedDaysAgo },
  { key: 'salary', label: 'الأعلى راتبًا', cmp: (a, b) => b.salaryMax - a.salaryMax },
  { key: 'salaryLow', label: 'الأقل راتبًا', cmp: (a, b) => a.salaryMax - b.salaryMax },
])

const primaryPreset = sector.mySectorsPreset

// تصفية سابقة بطبقة الرقائق الذكيّة + المحفوظة، ثم يتولّى العقد الموحّد الباقي
const preFiltered = computed(() => mockOpportunities.filter((o) => {
  const matchesSaved = !savedOnly.value || savedStore.isSaved(o.id)
  const matchesNew = !activeChips.value.has('newToday') || o.postedDaysAgo <= 1
  const matchesSkills = !activeChips.value.has('skills') || o.skills.some(s => userSkills.value.includes(s))
  return matchesSaved && matchesNew && matchesSkills
}))
const oppText = (o: Opportunity) => `${o.title} ${o.company} ${o.skills.join(' ')}`
</script>

<template>
  <div>
    <PageHeader
      title="استعراض الفرص"
      subtitle="فرص مرشّحة لك بالذكاء الاصطناعي حسب ملفك"
      icon="mdi-briefcase-search-outline"
    >
      <template #actions>
        <BaseButton :variant="savedOnly ? 'accent' : 'outline'" size="sm" @click="savedOnly = !savedOnly">
          <BaseIcon :name="savedOnly ? 'mdi-bookmark' : 'mdi-bookmark-outline'" :size="18" />
          المحفوظة ({{ savedStore.count }})
        </BaseButton>
        <div class="rounded-ui inline-flex overflow-hidden border-ui">
          <button class="px-3 py-2 transition" :class="view === 'grid' ? 'bg-brand text-on-brand' : 'text-muted hover:bg-surfalt'" aria-label="عرض شبكي" @click="view = 'grid'">
            <BaseIcon name="mdi-view-grid-outline" :size="18" />
          </button>
          <button class="px-3 py-2 transition" :class="view === 'list' ? 'bg-brand text-on-brand' : 'text-muted hover:bg-surfalt'" aria-label="عرض قائمة" @click="view = 'list'">
            <BaseIcon name="mdi-view-list-outline" :size="18" />
          </button>
        </div>
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
      :text="oppText"
      :item-key="(o: Opportunity) => o.id"
      :view="view"
      :primary-preset="primaryPreset"
      noun="فرصة"
      search-placeholder="ابحث بالمسمى أو الشركة أو المهارة…"
    >
      <template #banner>
        <div
          v-if="topMatch"
          class="rounded-ui mb-4 flex flex-wrap items-center justify-between gap-2 border-s-4 p-3"
          style="border-color: rgb(var(--v-theme-secondary)); background: rgba(var(--v-theme-secondary), 0.1)"
        >
          <span class="text-sm">
            <BaseIcon name="mdi-robot-happy-outline" :size="16" /> الأكثر تطابقًا مع ملفك: «{{ topMatch.title }}» — {{ topMatch.company }} · تطابق
            <strong>{{ liveMatch(topMatch) }}%</strong>
          </span>
          <BaseButton variant="emerald" size="sm" :to="{ name: 'opportunity-details', params: { id: topMatch.id } }">عرض</BaseButton>
        </div>
      </template>

      <template #item="{ item }">
        <OpportunityCard :opportunity="(item as Opportunity)" />
      </template>
    </FacetedList>
  </div>
</template>
