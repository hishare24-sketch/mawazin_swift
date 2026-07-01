<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { BOOKING_STATUS_META, INTERVIEWER_TIER_META, INTERVIEWER_TIERS, INTERVIEWER_TYPE_META, KIND_META, interviewerTier, useInterviewersStore } from '@/stores/InterviewersStore'
import type { InterviewerType } from '@/stores/InterviewersStore'
import { useProfileStore } from '@/stores/ProfileStore'
import EmptyState from '@/components/shared/EmptyState.vue'
import AttachmentsDialog from '@/components/shared/AttachmentsDialog.vue'
import TaxonomyTree from '@/components/shared/TaxonomyTree.vue'
import { ALL_SKILLS, categorizeSkill } from '@/services/taxonomy'
import { ai } from '@/services/ai'
import type { DayPeriod, TimeSuggestion } from '@/services/ai'

const router = useRouter()
const store = useInterviewersStore()
const profile = useProfileStore()

// Reschedule flow — reuses the AI smart-time suggestions
const reschedDialog = ref(false)
const reschedName = ref('')
const reschedBookingId = ref(0)
const reschedTimes = ref<TimeSuggestion[]>([])
const reschedExplanation = ref('')
const reschedSnackbar = ref(false)
function reschedColor(v: number) {
  if (v >= 90)
    return 'success'
  if (v >= 84)
    return 'warning'
  return 'orange-darken-2'
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

// Filters
const types = Object.keys(INTERVIEWER_TYPE_META) as InterviewerType[]
const selectedTypes = ref<InterviewerType[]>([])
const selectedSkills = ref<string[]>([])
const minRating = ref(0)
const maxPrice = ref(500)
const treeSel = ref<{ category?: string, sub?: string }>({})
const search = ref('')
const sortBy = ref<'match' | 'rating' | 'priceLow' | 'priceHigh' | 'sessions'>('match')
const view = ref<'grid' | 'list'>('grid')
const sortOptions = [
  { value: 'match', title: 'الأعلى تطابقًا' },
  { value: 'rating', title: 'الأعلى تقييمًا' },
  { value: 'priceLow', title: 'الأقل سعرًا' },
  { value: 'priceHigh', title: 'الأعلى سعرًا' },
  { value: 'sessions', title: 'الأكثر مقابلات' },
]

// AI smart quick-filters
const smartChips = computed(() => ai.smartFilterChips({ section: 'interviewers', skills: profile.skills.map(s => s.name) }))
const activeChips = ref<Set<string>>(new Set())
function toggleChip(key: string) {
  const next = new Set(activeChips.value)
  next.has(key) ? next.delete(key) : next.add(key)
  activeChips.value = next
}
const userSkills = computed(() => profile.skills.map(s => s.name))

// Taxonomy tree items (skills for counting, text for sub-category keyword match)
const treeItems = computed(() => store.interviewers.map(iv => ({
  skills: iv.specialties,
  text: `${iv.title} ${iv.field} ${iv.specialties.join(' ')}`,
})))

// Skill options = interviewer specialties ∪ taxonomy skills (so a pick always matches something)
const skillOptions = computed(() =>
  [...new Set([...store.interviewers.flatMap(i => i.specialties), ...ALL_SKILLS])].sort(),
)

function toggleType(t: InterviewerType) {
  selectedTypes.value = selectedTypes.value.includes(t)
    ? selectedTypes.value.filter(x => x !== t)
    : [...selectedTypes.value, t]
}

function matchOf(id: number) {
  return store.matchFor(candidate.value, id)
}

const filtered = computed(() => {
  const list = store.interviewers.filter((iv) => {
    if (search.value.trim() && !`${iv.name} ${iv.title} ${iv.field} ${iv.specialties.join(' ')}`.includes(search.value.trim()))
      return false
    if (selectedTypes.value.length && !selectedTypes.value.includes(iv.type))
      return false
    if (selectedSkills.value.length && !iv.specialties.some(s => selectedSkills.value.includes(s)))
      return false
    if (treeSel.value.category && !iv.specialties.some(s => categorizeSkill(s) === treeSel.value.category))
      return false
    if (treeSel.value.sub && !`${iv.title} ${iv.field} ${iv.specialties.join(' ')}`.includes(treeSel.value.sub))
      return false
    if (iv.rating < minRating.value)
      return false
    if (iv.priceMin > maxPrice.value)
      return false
    // AI smart quick-filters
    if (activeChips.value.has('topRated') && iv.rating < 4.5)
      return false
    if (activeChips.value.has('skills') && !iv.specialties.some(s => userSkills.value.includes(s)))
      return false
    return true
  })
  const sorted = [...list]
  switch (sortBy.value) {
    case 'rating': sorted.sort((a, b) => b.rating - a.rating); break
    case 'priceLow': sorted.sort((a, b) => a.priceMin - b.priceMin); break
    case 'priceHigh': sorted.sort((a, b) => b.priceMax - a.priceMax); break
    case 'sessions': sorted.sort((a, b) => b.sessionsCount - a.sessionsCount); break
    default: sorted.sort((a, b) => matchOf(b.id) - matchOf(a.id))
  }
  return sorted
})
function open(id: number) {
  router.push({ name: 'interviewer-profile', params: { id } })
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
        <VBtn variant="text" prepend-icon="mdi-medal-outline" @click="tiersDialog = true">
          المستويات والمزايا
        </VBtn>
        <VBtn variant="tonal" color="secondary" prepend-icon="mdi-badge-account-outline" :to="{ name: 'interviewer-register' }">
          سجّل كمقيّم
        </VBtn>
      </template>
    </PageHeader>

    <!-- Accreditation tiers reference -->
    <VDialog v-model="tiersDialog" max-width="620">
      <VCard class="pa-2">
        <VCardTitle class="d-flex align-center ga-2">
          <VIcon icon="mdi-medal-outline" color="warning" /> مستويات الاعتماد ومزاياها
        </VCardTitle>
        <VCardText>
          <p class="text-caption text-medium-emphasis mb-3">يترقّى المقيّم تلقائيًا بين المستويات كلما زادت مقابلاته المنجزة وتقييماته.</p>
          <VCard v-for="t in INTERVIEWER_TIERS" :key="t" variant="outlined" class="pa-3 mb-2">
            <div class="d-flex align-center ga-2 mb-1">
              <VChip :color="INTERVIEWER_TIER_META[t].color" size="small" variant="tonal" label :prepend-icon="INTERVIEWER_TIER_META[t].icon">
                {{ INTERVIEWER_TIER_META[t].label }}
              </VChip>
              <span class="text-caption text-medium-emphasis">{{ INTERVIEWER_TIER_META[t].req }}</span>
            </div>
            <div class="text-body-2"><VIcon icon="mdi-gift-outline" size="14" color="success" /> {{ INTERVIEWER_TIER_META[t].perk }}</div>
          </VCard>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="tiersDialog = false">إغلاق</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- AI recommended -->
    <div v-if="recommended.length" class="mb-6">
      <div class="d-flex align-center ga-2 mb-3">
        <VIcon icon="mdi-robot-happy-outline" color="secondary" />
        <h2 class="text-subtitle-1 font-weight-bold">مقيّمون موصى بهم لك</h2>
      </div>
      <VRow>
        <VCol v-for="r in recommended" :key="r.interviewer.id" cols="12" md="4">
          <VCard class="pa-4 h-100 cursor-pointer" variant="tonal" color="secondary" @click="open(r.interviewer.id)">
            <div class="d-flex align-center ga-3 mb-2">
              <VAvatar :color="INTERVIEWER_TYPE_META[r.interviewer.type].color" size="48">
                <span class="text-white font-weight-bold">{{ r.interviewer.initial }}</span>
              </VAvatar>
              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-bold">{{ r.interviewer.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ INTERVIEWER_TYPE_META[r.interviewer.type].label }}</div>
              </div>
              <VChip color="success" size="small" label>{{ r.match }}%</VChip>
            </div>
            <p class="text-caption mb-0">{{ r.reason }}</p>
          </VCard>
        </VCol>
      </VRow>
    </div>

    <VRow>
      <!-- Filters -->
      <VCol cols="12" md="3">
        <VCard class="pa-4 mb-4">
          <TaxonomyTree v-model="treeSel" :items="treeItems" />
        </VCard>

        <VCard class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-subtitle-2 font-weight-bold">فلترة</span>
            <VIcon icon="mdi-filter-variant" size="18" />
          </div>
          <div class="text-caption font-weight-bold mb-2">التخصص</div>
          <div class="d-flex flex-wrap ga-1 mb-4">
            <VChip
              v-for="t in types"
              :key="t"
              :color="selectedTypes.includes(t) ? INTERVIEWER_TYPE_META[t].color : undefined"
              :variant="selectedTypes.includes(t) ? 'flat' : 'outlined'"
              size="small"
              @click="toggleType(t)"
            >
              {{ INTERVIEWER_TYPE_META[t].label }}
            </VChip>
          </div>
          <div class="text-caption font-weight-bold mb-1">المهارات</div>
          <VAutocomplete
            v-model="selectedSkills"
            :items="skillOptions"
            multiple
            chips
            closable-chips
            clearable
            density="compact"
            placeholder="مثال: Python، React"
            hide-details
            class="mb-4"
          />
          <div class="text-caption font-weight-bold mb-1">أدنى تقييم ({{ minRating }}★)</div>
          <VSlider v-model="minRating" :min="0" :max="5" :step="0.5" color="warning" hide-details class="mb-3" />
          <div class="text-caption font-weight-bold mb-1">أعلى سعر بداية ({{ maxPrice }} ريال)</div>
          <VSlider v-model="maxPrice" :min="30" :max="500" :step="10" color="accent" hide-details />
        </VCard>
      </VCol>

      <!-- Interviewers grid -->
      <VCol cols="12" md="9">
        <!-- Local search -->
        <VTextField
          v-model="search"
          placeholder="ابحث في المقيّمين بالاسم أو التخصص..."
          prepend-inner-icon="mdi-magnify"
          variant="solo"
          density="compact"
          flat
          hide-details
          clearable
          class="mb-3"
        />

        <!-- AI smart quick-filters -->
        <div class="d-flex align-center flex-wrap ga-2 mb-3">
          <span class="text-caption text-medium-emphasis"><VIcon icon="mdi-robot-happy-outline" size="16" color="secondary" /> فلاتر ذكية:</span>
          <VChip
            v-for="chip in smartChips"
            :key="chip.key"
            :color="activeChips.has(chip.key) ? 'secondary' : undefined"
            :variant="activeChips.has(chip.key) ? 'flat' : 'outlined'"
            size="small"
            :prepend-icon="chip.icon"
            @click="toggleChip(chip.key)"
          >
            {{ chip.label }}
          </VChip>
        </div>

        <!-- Toolbar: count · sort · view -->
        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
          <span class="text-body-2 text-medium-emphasis">{{ filtered.length }} مقيّم معتمد</span>
          <div class="d-flex align-center ga-2">
            <VSelect v-model="sortBy" :items="sortOptions" density="compact" variant="outlined" hide-details prepend-inner-icon="mdi-sort" style="max-width: 180px" />
            <VBtnToggle v-model="view" mandatory density="compact" variant="outlined" divided>
              <VBtn value="grid" icon="mdi-view-grid-outline" size="small" />
              <VBtn value="list" icon="mdi-view-list-outline" size="small" />
            </VBtnToggle>
          </div>
        </div>

        <VRow>
          <VCol v-for="iv in filtered" :key="iv.id" cols="12" :sm="view === 'grid' ? 6 : 12">
            <VCard class="pa-4 h-100 d-flex flex-column cursor-pointer" @click="open(iv.id)">
              <div class="d-flex align-start ga-3 mb-2">
                <VAvatar :color="INTERVIEWER_TYPE_META[iv.type].color" size="52">
                  <span class="text-white text-h6 font-weight-bold">{{ iv.initial }}</span>
                </VAvatar>
                <div class="flex-grow-1">
                  <div class="d-flex align-center ga-1">
                    <span class="text-body-1 font-weight-bold">{{ iv.name }}</span>
                    <VIcon v-if="iv.verified" icon="mdi-check-decagram" color="primary" size="16" />
                  </div>
                  <div class="text-caption text-medium-emphasis">{{ iv.title }}</div>
                </div>
                <VChip color="success" size="small" label>{{ matchOf(iv.id) }}%</VChip>
              </div>

              <div class="d-flex align-center flex-wrap ga-2 mb-2">
                <VChip :color="INTERVIEWER_TYPE_META[iv.type].color" size="x-small" label :prepend-icon="INTERVIEWER_TYPE_META[iv.type].icon">
                  {{ INTERVIEWER_TYPE_META[iv.type].label }}
                </VChip>
                <VChip :color="INTERVIEWER_TIER_META[interviewerTier(iv)].color" size="x-small" variant="tonal" label :prepend-icon="INTERVIEWER_TIER_META[interviewerTier(iv)].icon">
                  {{ INTERVIEWER_TIER_META[interviewerTier(iv)].label }}
                </VChip>
                <div class="d-flex align-center text-caption text-medium-emphasis">
                  <VIcon icon="mdi-star" color="warning" size="14" class="me-1" />{{ iv.rating }} ({{ iv.reviewsCount }})
                </div>
              </div>

              <div class="d-flex flex-wrap ga-1 mb-3 flex-grow-1">
                <VChip v-for="s in iv.specialties.slice(0, 3)" :key="s" size="x-small" variant="tonal">{{ s }}</VChip>
              </div>

              <div class="d-flex align-center justify-space-between">
                <span class="text-caption text-medium-emphasis">{{ iv.sessionsCount }} مقابلة</span>
                <span class="text-body-2 font-weight-bold">{{ iv.priceMin }}–{{ iv.priceMax }} ريال</span>
              </div>
            </VCard>
          </VCol>
        </VRow>
        <VCard v-if="!filtered.length">
          <EmptyState
            icon="mdi-account-search-outline"
            title="لا مقيّمين مطابقين"
            description="جرّب توسيع نطاق التقييم أو السعر، أو إزالة فلتر التخصص."
          />
        </VCard>

        <!-- My bookings -->
        <div v-if="store.bookings.length" class="mt-6">
          <h2 class="text-subtitle-1 font-weight-bold mb-3">حجوزاتي مع المقيّمين ({{ store.bookings.length }})</h2>
          <VCard>
            <VList lines="two">
              <template v-for="(b, i) in store.bookings" :key="b.id">
                <VListItem>
                  <template #prepend>
                    <VAvatar color="primary" variant="tonal" rounded="lg"><VIcon icon="mdi-account-tie-voice-outline" /></VAvatar>
                  </template>
                  <VListItemTitle class="font-weight-bold">{{ b.interviewerName }} · {{ KIND_META[b.kind].label }}</VListItemTitle>
                  <VListItemSubtitle>{{ b.datetime }} · {{ b.price }} ريال</VListItemSubtitle>
                  <template #append>
                    <div class="d-flex align-center ga-2">
                      <VBtn
                        v-if="b.status !== 'completed' && b.status !== 'cancelled'"
                        size="x-small"
                        color="secondary"
                        variant="tonal"
                        prepend-icon="mdi-paperclip"
                        @click="openAttachments(b.id, b.interviewerName)"
                      >
                        مرفقات
                        <VChip v-if="b.attachments?.length" size="x-small" color="secondary" class="ms-1" label>{{ b.attachments.length }}</VChip>
                      </VBtn>
                      <VBtn
                        v-if="b.status !== 'completed' && b.status !== 'cancelled'"
                        size="x-small"
                        variant="tonal"
                        prepend-icon="mdi-calendar-refresh-outline"
                        @click="openReschedule(b.id, b.interviewerId, b.interviewerName)"
                      >
                        إعادة جدولة
                      </VBtn>
                      <VChip v-if="b.report" color="success" size="small" label>{{ b.report.overall }}%</VChip>
                      <VChip :color="BOOKING_STATUS_META[b.status].color" size="small" label>{{ BOOKING_STATUS_META[b.status].label }}</VChip>
                    </div>
                  </template>
                </VListItem>
                <VDivider v-if="i < store.bookings.length - 1" />
              </template>
            </VList>
          </VCard>
        </div>
      </VCol>
    </VRow>

    <AttachmentsDialog v-model="attachDialog" :booking-id="attachBookingId" :interviewer-name="attachInterviewerName" />

    <!-- Reschedule dialog — AI suggests 3 new optimal times -->
    <VDialog v-model="reschedDialog" max-width="620">
      <VCard class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span class="text-body-1 font-weight-bold">إعادة جدولة مع {{ reschedName }}</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="reschedDialog = false" />
        </VCardTitle>
        <VCardText>
          <div class="d-flex align-center ga-2 mb-3">
            <VIcon icon="mdi-robot-happy-outline" color="secondary" size="18" />
            <span class="text-caption text-medium-emphasis">اقترح الـ AI مواعيد بديلة بناءً على تفضيلاتك وتوفّر المقيّم — اختر بنقرة:</span>
          </div>
          <VRow dense>
            <VCol v-for="s in reschedTimes" :key="s.id" cols="12" sm="4">
              <VCard variant="outlined" class="pa-3 h-100 cursor-pointer suggest-card" @click="applyReschedule(s)">
                <VChip size="x-small" :color="reschedColor(s.compatibility)" label class="mb-2">{{ s.tag }}</VChip>
                <div class="text-body-2 font-weight-bold mb-2">{{ s.label }}</div>
                <div class="d-flex align-center justify-space-between text-caption mb-1">
                  <span class="text-medium-emphasis">توافق</span>
                  <span class="font-weight-bold" :class="`text-${reschedColor(s.compatibility)}`">{{ s.compatibility }}%</span>
                </div>
                <VProgressLinear :model-value="s.compatibility" :color="reschedColor(s.compatibility)" height="6" rounded />
              </VCard>
            </VCol>
          </VRow>
          <VAlert color="secondary" variant="tonal" density="compact" class="mt-3 text-caption" border="start">
            <template #prepend><VIcon icon="mdi-lightbulb-on-outline" size="18" /></template>
            {{ reschedExplanation }}
          </VAlert>
        </VCardText>
      </VCard>
    </VDialog>

    <VSnackbar v-model="reschedSnackbar" color="success" timeout="4000">
      تمت إعادة جدولة المقابلة — أُرسل الموعد الجديد للمقيّم للتأكيد.
    </VSnackbar>
  </div>
</template>

<style scoped>
.suggest-card {
  transition: border-color 0.18s ease, transform 0.18s ease;
}
.suggest-card:hover {
  border-color: rgba(var(--v-theme-secondary), 0.55);
  transform: translateY(-2px);
}
</style>
