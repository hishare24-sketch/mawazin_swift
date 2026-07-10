<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { BOOKING_STATUS_META, INTERVIEWER_TIER_META, INTERVIEWER_TIERS, INTERVIEWER_TYPE_META, KIND_META, interviewerTier, useInterviewersStore } from '@/stores/InterviewersStore'
import type { Interviewer, InterviewerType } from '@/stores/InterviewersStore'
import { useProfileStore } from '@/stores/ProfileStore'
import AttachmentsDialog from '@/components/shared/AttachmentsDialog.vue'
import { ALL_SKILLS } from '@/services/taxonomy'
import { sectorForField } from '@/services/sectors'
import { useSectorContext } from '@/composables/useSectorContext'
import { sectorFacet, sectorFromFieldAndSkills } from '@/composables/sectorFacet'
import { matchChipColor } from '@/utils/match'
import FacetedList from '@/components/shared/FacetedList.vue'
import type { FacetSpec, SortSpec } from '@/composables/useFacetedList'
import { ai } from '@/services/ai'
import type { DayPeriod, TimeSuggestion } from '@/services/ai'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
// خريطة ألوان Vuetify (من metas المخزن) → رموز مكوّنات الأساس
function mapColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral', 'blue-grey': 'neutral' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}

const router = useRouter()
const store = useInterviewersStore()
const profile = useProfileStore()
const sector = useSectorContext()

/** قطاع المقيّم (slug) من حقل مجاله عبر resolver الترحيل */
function ivSector(iv: Interviewer): string | undefined {
  return sectorForField(iv.field)?.id
}

// Reschedule flow — reuses the AI smart-time suggestions
const reschedDialog = ref(false)
const reschedName = ref('')
const reschedBookingId = ref(0)
const reschedTimes = ref<TimeSuggestion[]>([])
const reschedExplanation = ref('')
const reschedSnackbar = ref(false)
function reschedColor(v: number): BaseColor {
  if (v >= 90)
    return 'success'
  if (v >= 84)
    return 'warning'
  return 'error'
}
function openReschedule(bookingId: number, interviewerId: number, interviewerName: string) {
  const iv = store.getById(interviewerId)
  const pref = (localStorage.getItem('candidateTimePref') as DayPeriod) || 'morning'
  const res = ai.suggestOptimalTimes({ availability: iv?.availability ?? [], candidatePref: pref })
  reschedTimes.value = res.suggestions
  reschedExplanation.value = res.explanation
  reschedName.value = interviewerName
  reschedBookingId.value = bookingId
  reschedDialog.value = true
}
function applyReschedule(s: TimeSuggestion) {
  store.reschedule(reschedBookingId.value, s.label)
  reschedDialog.value = false
  reschedSnackbar.value = true
}

// Accreditation tiers reference dialog
const tiersDialog = ref(false)

// Pre-interview attachments dialog
const attachDialog = ref(false)
const attachBookingId = ref(0)
const attachInterviewerName = ref('')
function openAttachments(bookingId: number, interviewerName: string) {
  attachBookingId.value = bookingId
  attachInterviewerName.value = interviewerName
  attachDialog.value = true
}

const candidate = computed(() => ({
  field: 'تطوير الويب',
  skills: profile.skills.map(s => s.name),
}))

const recommended = computed(() => store.recommendedFor(candidate.value))

// —— العقد الموحّد: القطاع محوريّ + التخصص/المهارات فاسِتات + أدنى تقييم ——
const types = Object.keys(INTERVIEWER_TYPE_META) as InterviewerType[]
const view = ref<'grid' | 'list'>('grid')

const smartChips = computed(() => ai.smartFilterChips({ section: 'interviewers', skills: profile.skills.map(s => s.name) }))
const activeChips = ref<Set<string>>(new Set())
function toggleChip(key: string) {
  const next = new Set(activeChips.value)
  next.has(key) ? next.delete(key) : next.add(key)
  activeChips.value = next
}
const userSkills = computed(() => profile.skills.map(s => s.name))
const skillOptions = computed(() =>
  [...new Set([...store.interviewers.flatMap(i => i.specialties), ...ALL_SKILLS])].sort(),
)

function matchOf(id: number) {
  return store.matchFor(candidate.value, id)
}

const facets = computed<FacetSpec<Interviewer>[]>(() => [
  sectorFacet(sectorFromFieldAndSkills(ivSector, iv => iv.specialties), () => store.interviewers),
  {
    key: 'type', label: 'التخصص', kind: 'multi', value: iv => iv.type,
    options: () => types.map(t => ({ value: t, label: INTERVIEWER_TYPE_META[t].label, icon: INTERVIEWER_TYPE_META[t].icon })),
  },
  {
    key: 'skills', label: 'المهارات', kind: 'multi', searchable: true,
    value: iv => iv.specialties,
    options: () => skillOptions.value.map(s => ({ value: s, label: s })),
  },
  { key: 'rating', label: 'أدنى تقييم', kind: 'range', numberValue: iv => iv.rating, range: { min: 0, max: 5, step: 0.5 } },
  { key: 'price', label: 'الحدّ الأقصى للسعر', kind: 'range', numberValue: iv => iv.priceMin, range: { min: 30, max: 500, step: 10, mode: 'max' } },
])
const sorts = computed<SortSpec<Interviewer>[]>(() => [
  { key: 'match', label: 'الأعلى تطابقًا', cmp: (a, b) => { const d = matchOf(b.id) - matchOf(a.id); return d !== 0 ? d : sector.boost(ivSector(b)) - sector.boost(ivSector(a)) } },
  { key: 'rating', label: 'الأعلى تقييمًا', cmp: (a, b) => b.rating - a.rating },
  { key: 'priceLow', label: 'الأقل سعرًا', cmp: (a, b) => a.priceMin - b.priceMin },
  { key: 'priceHigh', label: 'الأعلى سعرًا', cmp: (a, b) => b.priceMax - a.priceMax },
  { key: 'sessions', label: 'الأكثر مقابلات', cmp: (a, b) => b.sessionsCount - a.sessionsCount },
])
const primaryPreset = sector.mySectorsPreset

const preFiltered = computed(() => store.interviewers.filter((iv) => {
  if (activeChips.value.has('topRated') && iv.rating < 4.5)
    return false
  if (activeChips.value.has('skills') && !iv.specialties.some(s => userSkills.value.includes(s)))
    return false
  return true
}))
const ivText = (iv: Interviewer) => `${iv.name} ${iv.title} ${iv.field} ${iv.specialties.join(' ')}`
function open(id: number) {
  router.push({ name: 'interviewer-profile', params: { id } })
}

// نمط رقاقة الفلتر: خلفية/نص باللون الدلالي عند التفعيل، وإلا حدّ محايد
function chipStyle(vColor: string, active: boolean) {
  if (!active)
    return {}
  return {
    background: `rgba(var(--v-theme-${vColor}), 0.18)`,
    color: `rgb(var(--v-theme-${vColor}))`,
    borderColor: `rgb(var(--v-theme-${vColor}))`,
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="سوق المقيّمين المعتمدين"
      subtitle="خبراء معتمدون يُجرون مقابلات تقييمية موثّقة ترفع نسبة ثقتك"
      icon="mdi-account-supervisor-circle-outline"
    >
      <template #actions>
        <BaseButton variant="ghost" size="sm" @click="tiersDialog = true">
          <BaseIcon name="mdi-medal-outline" :size="18" /> المستويات والمزايا
        </BaseButton>
        <BaseButton variant="tonal-emerald" size="sm" :to="{ name: 'interviewer-register' }">
          <BaseIcon name="mdi-badge-account-outline" :size="18" /> سجّل كمقيّم
        </BaseButton>
      </template>
    </PageHeader>

    <!-- AI recommended -->
    <div v-if="recommended.length" class="mb-6">
      <div class="mb-3 flex items-center gap-2">
        <BaseIcon name="mdi-robot-happy-outline" :size="20" style="color: rgb(var(--v-theme-secondary))" />
        <h2 class="font-bold text-content">مقيّمون موصى بهم لك</h2>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          v-for="r in recommended"
          :key="r.interviewer.id"
          type="button"
          class="rounded-ui-lg p-4 text-start transition hover:brightness-105"
          style="background: rgba(var(--v-theme-secondary), 0.12)"
          @click="open(r.interviewer.id)"
        >
          <div class="mb-2 flex items-center gap-3">
            <BaseAvatar :color="mapColor(INTERVIEWER_TYPE_META[r.interviewer.type].color)" :size="48">
              <span class="font-bold">{{ r.interviewer.initial }}</span>
            </BaseAvatar>
            <div class="flex-1">
              <div class="text-sm font-bold text-content">{{ r.interviewer.name }}</div>
              <div class="text-xs text-muted">{{ INTERVIEWER_TYPE_META[r.interviewer.type].label }}</div>
            </div>
            <BaseChip :color="matchChipColor(r.match)" :aria-label="`نسبة التطابق ${r.match}%`">{{ r.match }}%</BaseChip>
          </div>
          <p class="text-xs text-muted">{{ r.reason }}</p>
        </button>
      </div>
    </div>

    <!-- AI smart quick-filters -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <span class="flex items-center gap-1 text-xs text-muted">
        <BaseIcon name="mdi-robot-happy-outline" :size="16" style="color: rgb(var(--v-theme-secondary))" /> فلاتر ذكية:
      </span>
      <button
        v-for="chip in smartChips"
        :key="chip.key"
        type="button"
        class="inline-flex items-center gap-1 rounded-full border-ui px-2.5 py-1 text-xs font-medium transition"
        :style="chipStyle('secondary', activeChips.has(chip.key))"
        @click="toggleChip(chip.key)"
      >
        <BaseIcon :name="chip.icon" :size="14" /> {{ chip.label }}
      </button>
    </div>

    <FacetedList
      :items="preFiltered"
      :facets="facets"
      :sorts="sorts"
      :text="ivText"
      :item-key="(iv: Interviewer) => iv.id"
      :view="view"
      :primary-preset="primaryPreset"
      noun="مقيّم معتمد"
      search-placeholder="ابحث في المقيّمين بالاسم أو التخصص…"
    >
      <template #toolbar>
        <div class="seg">
          <button type="button" class="seg-btn" :class="{ 'is-active': view === 'grid' }" aria-label="شبكة" @click="view = 'grid'">
            <BaseIcon name="mdi-view-grid-outline" :size="18" />
          </button>
          <button type="button" class="seg-btn" :class="{ 'is-active': view === 'list' }" aria-label="قائمة" @click="view = 'list'">
            <BaseIcon name="mdi-view-list-outline" :size="18" />
          </button>
        </div>
      </template>

      <template #item="{ item }">
        <template v-for="iv in [item as Interviewer]" :key="iv.id">
          <BaseCard
            hover class="flex cursor-pointer flex-col" role="button" tabindex="0"
            @click="open(iv.id)"
            @keydown.enter="open(iv.id)"
            @keydown.space.prevent="open(iv.id)"
          >
            <div class="mb-2 flex items-start gap-3">
              <BaseAvatar :color="mapColor(INTERVIEWER_TYPE_META[iv.type].color)" :size="52">
                <span class="text-lg font-bold">{{ iv.initial }}</span>
              </BaseAvatar>
              <div class="flex-1">
                <div class="flex items-center gap-1">
                  <span class="font-bold text-content">{{ iv.name }}</span>
                  <BaseIcon v-if="iv.verified" name="mdi-check-decagram" :size="16" style="color: rgb(var(--v-theme-primary))" />
                </div>
                <div class="text-xs text-muted">{{ iv.title }}</div>
              </div>
              <BaseChip :color="matchChipColor(matchOf(iv.id))" :aria-label="`نسبة التطابق ${matchOf(iv.id)}%`">{{ matchOf(iv.id) }}%</BaseChip>
            </div>

            <div class="mb-2 flex flex-wrap items-center gap-2">
              <BaseChip :color="mapColor(INTERVIEWER_TYPE_META[iv.type].color)">
                <BaseIcon :name="INTERVIEWER_TYPE_META[iv.type].icon" :size="12" /> {{ INTERVIEWER_TYPE_META[iv.type].label }}
              </BaseChip>
              <BaseChip :color="mapColor(INTERVIEWER_TIER_META[interviewerTier(iv)].color)">
                <BaseIcon :name="INTERVIEWER_TIER_META[interviewerTier(iv)].icon" :size="12" /> {{ INTERVIEWER_TIER_META[interviewerTier(iv)].label }}
              </BaseChip>
              <div class="flex items-center gap-1 text-xs text-muted">
                <BaseIcon name="mdi-star" :size="14" style="color: rgb(var(--v-theme-warning))" />{{ iv.rating }} ({{ iv.reviewsCount }})
              </div>
            </div>

            <div class="mb-3 flex flex-1 flex-wrap gap-1">
              <BaseChip v-for="s in iv.specialties.slice(0, 3)" :key="s" color="neutral">{{ s }}</BaseChip>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">{{ iv.sessionsCount }} مقابلة</span>
              <span class="font-bold text-content">{{ iv.priceMin }}–{{ iv.priceMax }} ريال</span>
            </div>
          </BaseCard>
        </template>
      </template>
    </FacetedList>

    <!-- My bookings -->
        <div v-if="store.bookings.length" class="mt-6">
          <h2 class="mb-3 font-bold text-content">حجوزاتي مع المقيّمين ({{ store.bookings.length }})</h2>
          <BaseCard :padded="false">
            <div>
              <div
                v-for="(b, i) in store.bookings"
                :key="b.id"
                class="flex flex-wrap items-center gap-3 p-4"
                :style="i > 0 ? 'border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12)' : ''"
              >
                <BaseAvatar color="brand" tonal square>
                  <BaseIcon name="mdi-account-tie-voice-outline" :size="22" />
                </BaseAvatar>
                <div class="min-w-[10rem] flex-1">
                  <div class="font-bold text-content">{{ b.interviewerName }} · {{ KIND_META[b.kind].label }}</div>
                  <div class="text-sm text-muted">{{ b.datetime }} · {{ b.price }} ريال</div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <BaseButton
                    v-if="b.status !== 'completed' && b.status !== 'cancelled'"
                    variant="tonal-emerald"
                    size="sm"
                    @click="openAttachments(b.id, b.interviewerName)"
                  >
                    <BaseIcon name="mdi-paperclip" :size="16" /> مرفقات
                    <BaseChip v-if="b.attachments?.length" color="emerald" class="ms-1">{{ b.attachments.length }}</BaseChip>
                  </BaseButton>
                  <BaseButton
                    v-if="b.status !== 'completed' && b.status !== 'cancelled'"
                    variant="outline"
                    size="sm"
                    @click="openReschedule(b.id, b.interviewerId, b.interviewerName)"
                  >
                    <BaseIcon name="mdi-calendar-refresh-outline" :size="16" /> إعادة جدولة
                  </BaseButton>
                  <BaseChip v-if="b.report" color="success">{{ b.report.overall }}%</BaseChip>
                  <BaseChip :color="mapColor(BOOKING_STATUS_META[b.status].color)">{{ BOOKING_STATUS_META[b.status].label }}</BaseChip>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>

    <!-- Accreditation tiers reference -->
    <BaseModal v-model="tiersDialog" title="مستويات الاعتماد ومزاياها">
      <p class="mb-3 text-xs text-muted">يترقّى المقيّم تلقائيًا بين المستويات كلما زادت مقابلاته المنجزة وتقييماته.</p>
      <div class="space-y-2">
        <div v-for="t in INTERVIEWER_TIERS" :key="t" class="rounded-ui border-ui p-3">
          <div class="mb-1 flex flex-wrap items-center gap-2">
            <BaseChip :color="mapColor(INTERVIEWER_TIER_META[t].color)">
              <BaseIcon :name="INTERVIEWER_TIER_META[t].icon" :size="12" /> {{ INTERVIEWER_TIER_META[t].label }}
            </BaseChip>
            <span class="text-xs text-muted">{{ INTERVIEWER_TIER_META[t].req }}</span>
          </div>
          <div class="text-sm text-content">
            <BaseIcon name="mdi-gift-outline" :size="14" style="color: rgb(var(--v-theme-success))" /> {{ INTERVIEWER_TIER_META[t].perk }}
          </div>
        </div>
      </div>
    </BaseModal>

    <AttachmentsDialog v-model="attachDialog" :booking-id="attachBookingId" :interviewer-name="attachInterviewerName" />

    <!-- Reschedule dialog — AI suggests 3 new optimal times -->
    <BaseModal v-model="reschedDialog" :title="`إعادة جدولة مع ${reschedName}`">
      <div class="mb-3 flex items-center gap-2">
        <BaseIcon name="mdi-robot-happy-outline" :size="18" style="color: rgb(var(--v-theme-secondary))" />
        <span class="text-xs text-muted">اقترح الـ AI مواعيد بديلة بناءً على تفضيلاتك وتوفّر المقيّم — اختر بنقرة:</span>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          v-for="s in reschedTimes"
          :key="s.id"
          type="button"
          class="rounded-ui border-ui p-3 text-start transition hover:-translate-y-0.5"
          @click="applyReschedule(s)"
        >
          <BaseChip :color="reschedColor(s.compatibility)" class="mb-2">{{ s.tag }}</BaseChip>
          <div class="mb-2 text-sm font-bold text-content">{{ s.label }}</div>
          <div class="mb-1 flex items-center justify-between text-xs">
            <span class="text-muted">توافق</span>
            <span class="font-bold" :style="{ color: `rgb(var(--v-theme-${reschedColor(s.compatibility)}))` }">{{ s.compatibility }}%</span>
          </div>
          <BaseProgressBar :value="s.compatibility" :color="reschedColor(s.compatibility)" :height="6" />
        </button>
      </div>
      <div class="mt-3 flex items-start gap-2 rounded-ui p-3 text-xs" style="background: rgba(var(--v-theme-secondary), 0.12); color: rgb(var(--v-theme-secondary))">
        <BaseIcon name="mdi-lightbulb-on-outline" :size="18" class="shrink-0" />
        <span>{{ reschedExplanation }}</span>
      </div>
    </BaseModal>

    <BaseSnackbar v-model="reschedSnackbar" color="success">
      تمت إعادة جدولة المقابلة — أُرسل الموعد الجديد للمقيّم للتأكيد.
    </BaseSnackbar>
  </div>
</template>
