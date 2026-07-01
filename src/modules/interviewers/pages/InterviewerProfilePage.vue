<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { COMMISSION_NOTE, INTERVIEWER_TIER_META, INTERVIEWER_TYPE_META, KIND_META, PLATFORM_COMMISSION, interviewerTier, useInterviewersStore } from '@/stores/InterviewersStore'
import type { CustomEvalElement, MarketInterviewKind } from '@/stores/InterviewersStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { ai } from '@/services/ai'
import type { DayPeriod, TimeSuggestion } from '@/services/ai'
import ReviewsPanel from '@/components/shared/ReviewsPanel.vue'

const route = useRoute()
const router = useRouter()
const store = useInterviewersStore()
const profile = useProfileStore()
const notifications = useNotificationsStore()

const interviewer = computed(() => store.getById(Number(route.params.id)))
const candidate = computed(() => ({ field: 'تطوير الويب', skills: profile.skills.map(s => s.name) }))
const match = computed(() => (interviewer.value ? store.matchFor(candidate.value, interviewer.value.id) : 0))

const kinds = Object.keys(KIND_META) as MarketInterviewKind[]

// Booking dialog + advanced calendar
const bookDialog = ref(false)
const chosenKind = ref<MarketInterviewKind>('level')
const chosenDate = ref<Date | null>(null)
const chosenTime = ref('')
const bookedSnackbar = ref(false)

// AI smart scheduling — 3 optimal times based on both parties' preferences.
// The candidate's preferred period is remembered across bookings (adaptive).
const PREF_KEY = 'candidateTimePref'
const candidatePref = ref<DayPeriod>((localStorage.getItem(PREF_KEY) as DayPeriod) || 'morning')
const suggestedTimes = ref<TimeSuggestion[]>([])
const timesExplanation = ref('')
const showWhy = ref(false)
const showFullCalendar = ref(false)
const selectedSuggestionId = ref('')

function compatColor(v: number) {
  if (v >= 90)
    return 'success'
  if (v >= 84)
    return 'warning'
  return 'orange-darken-2'
}
function pickSuggestion(s: TimeSuggestion) {
  chosenDate.value = new Date(`${s.iso}T00:00:00`)
  chosenTime.value = s.time
  candidatePref.value = s.period
  selectedSuggestionId.value = s.id
}
function periodOfTime(time: string): DayPeriod {
  const h = Number(time.split(':')[0])
  if (h < 12)
    return 'morning'
  if (h < 17)
    return 'afternoon'
  return 'evening'
}

// Map Arabic weekday names → JS getDay() so the calendar only opens the interviewer's days
const DAY_MAP: Record<string, number> = {
  'الأحد': 0, 'الإثنين': 1, 'الاثنين': 1, 'الثلاثاء': 2, 'الأربعاء': 3, 'الخميس': 4, 'الجمعة': 5, 'السبت': 6,
}
const AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const allowedWeekdays = computed(() =>
  new Set((interviewer.value?.availability ?? []).map(d => DAY_MAP[d]).filter(n => n !== undefined)),
)
const today = new Date()
today.setHours(0, 0, 0, 0)

// VDatePicker allowed-dates predicate: only future dates on the interviewer's weekdays
function allowedDates(value: unknown): boolean {
  const d = value instanceof Date ? value : new Date(value as string)
  d.setHours(0, 0, 0, 0)
  return d >= today && allowedWeekdays.value.has(d.getDay())
}

// Time slots for the chosen date — some deterministically marked as booked
const BASE_SLOTS = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00']
const timeSlots = computed(() => {
  if (!chosenDate.value)
    return []
  const seed = chosenDate.value.getDate()
  return BASE_SLOTS.map((time, i) => ({ time, taken: (seed + i) % 4 === 0 }))
})

function pickTime(time: string, taken: boolean) {
  if (!taken) {
    chosenTime.value = time
    selectedSuggestionId.value = '' // manual pick overrides the AI suggestion
  }
}

const basePrice = computed(() => {
  if (!interviewer.value)
    return 0
  // scale within the interviewer's range by interview kind weight
  const weight: Record<MarketInterviewKind, number> = { level: 0.2, behavioral: 0.4, skills: 0.6, leadership: 0.85, comprehensive: 1 }
  const { priceMin, priceMax } = interviewer.value
  return Math.round((priceMin + (priceMax - priceMin) * weight[chosenKind.value]) / 5) * 5
})

// Custom evaluation elements selected on top of the base interview
const selectedElements = ref<CustomEvalElement[]>([])
function toggleElement(el: CustomEvalElement) {
  const i = selectedElements.value.findIndex(e => e.id === el.id)
  if (i >= 0)
    selectedElements.value.splice(i, 1)
  else
    selectedElements.value.push(el)
}
function isSelected(el: CustomEvalElement) {
  return selectedElements.value.some(e => e.id === el.id)
}
const elementsTotal = computed(() => selectedElements.value.reduce((s, e) => s + e.price, 0))
const price = computed(() => basePrice.value + elementsTotal.value)
const commissionText = computed(() => {
  const lo = Math.round(price.value * PLATFORM_COMMISSION.min / 100)
  const hi = Math.round(price.value * PLATFORM_COMMISSION.max / 100)
  return `عمولة المنصة (${PLATFORM_COMMISSION.min}–${PLATFORM_COMMISSION.max}%): ${lo}–${hi} ريال · يصل للمقيّم ${price.value - hi}–${price.value - lo} ريال`
})
const commissionNote = COMMISSION_NOTE

const dateLabel = computed(() => {
  if (!chosenDate.value)
    return ''
  const d = chosenDate.value
  return `${AR_DAYS[d.getDay()]} ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
const canConfirm = computed(() => !!chosenDate.value && !!chosenTime.value)

function refreshSuggestions() {
  if (!interviewer.value)
    return
  const res = ai.suggestOptimalTimes({ availability: interviewer.value.availability, candidatePref: candidatePref.value })
  suggestedTimes.value = res.suggestions
  timesExplanation.value = res.explanation
}

function openBooking(kind?: MarketInterviewKind) {
  if (kind)
    chosenKind.value = kind
  chosenDate.value = null
  chosenTime.value = ''
  selectedElements.value = []
  selectedSuggestionId.value = ''
  showFullCalendar.value = false
  showWhy.value = false
  refreshSuggestions()
  bookDialog.value = true
}

function confirmBooking() {
  if (interviewer.value && canConfirm.value) {
    // Remember the chosen period so future suggestions adapt to the candidate
    const period = selectedSuggestionId.value
      ? (suggestedTimes.value.find(s => s.id === selectedSuggestionId.value)?.period ?? periodOfTime(chosenTime.value))
      : periodOfTime(chosenTime.value)
    localStorage.setItem(PREF_KEY, period)

    store.book(interviewer.value, chosenKind.value, `${dateLabel.value} · ${chosenTime.value}`, price.value, selectedElements.value.map(e => e.name))
    notifications.push({
      icon: 'mdi-calendar-check-outline',
      color: 'secondary',
      title: 'طلب حجز مقابلة',
      body: `أرسلت طلب ${KIND_META[chosenKind.value].label} إلى ${interviewer.value.name} — ${dateLabel.value} · ${chosenTime.value}`,
      category: 'interview',
    })
  }
  bookDialog.value = false
  bookedSnackbar.value = true
}
</script>

<template>
  <div v-if="interviewer">
    <VBtn variant="text" prepend-icon="mdi-arrow-right" class="mb-3" @click="router.back()">رجوع</VBtn>

    <VRow>
      <!-- Main -->
      <VCol cols="12" md="8">
        <VCard class="pa-5 mb-4">
          <div class="d-flex align-start ga-4 mb-3">
            <VAvatar :color="INTERVIEWER_TYPE_META[interviewer.type].color" size="72">
              <span class="text-h4 text-white font-weight-bold">{{ interviewer.initial }}</span>
            </VAvatar>
            <div class="flex-grow-1">
              <div class="d-flex align-center ga-2 flex-wrap">
                <h1 class="text-h5 font-weight-bold">{{ interviewer.name }}</h1>
                <VIcon v-if="interviewer.verified" icon="mdi-check-decagram" color="primary" />
              </div>
              <div class="text-body-2 text-medium-emphasis">{{ interviewer.title }}</div>
              <div class="d-flex align-center ga-3 mt-1">
                <span class="d-flex align-center text-body-2"><VIcon icon="mdi-star" color="warning" size="18" class="me-1" />{{ interviewer.rating }} ({{ interviewer.reviewsCount }} تقييم)</span>
                <span class="text-body-2 text-medium-emphasis">{{ interviewer.sessionsCount }} مقابلة</span>
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap ga-2 mb-4">
            <VChip :color="INTERVIEWER_TYPE_META[interviewer.type].color" variant="tonal" :prepend-icon="INTERVIEWER_TYPE_META[interviewer.type].icon">
              {{ INTERVIEWER_TYPE_META[interviewer.type].label }}
            </VChip>
            <VChip :color="INTERVIEWER_TIER_META[interviewerTier(interviewer)].color" variant="tonal" :prepend-icon="INTERVIEWER_TIER_META[interviewerTier(interviewer)].icon">
              {{ INTERVIEWER_TIER_META[interviewerTier(interviewer)].label }}
            </VChip>
            <VChip variant="tonal" prepend-icon="mdi-translate">{{ interviewer.languages.join(' · ') }}</VChip>
            <VChip variant="tonal" prepend-icon="mdi-calendar-check">{{ interviewer.availability.join(' · ') }}</VChip>
          </div>

          <VDivider class="mb-4" />
          <h3 class="text-subtitle-1 font-weight-bold mb-2">نبذة</h3>
          <p class="text-body-2 text-medium-emphasis mb-4">{{ interviewer.bio }}</p>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">مجالات الخبرة</h3>
          <div class="d-flex flex-wrap ga-2">
            <VChip v-for="s in interviewer.specialties" :key="s" color="secondary" variant="tonal" size="small">{{ s }}</VChip>
          </div>
        </VCard>

        <!-- Interview kinds -->
        <VCard class="pa-5">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">أنواع المقابلات المتاحة</h3>
          <VRow>
            <VCol v-for="k in kinds" :key="k" cols="12" sm="6">
              <VCard variant="outlined" class="pa-3 h-100">
                <div class="text-body-2 font-weight-bold mb-1">{{ KIND_META[k].label }}</div>
                <div class="text-caption text-medium-emphasis mb-2">{{ KIND_META[k].desc }} · {{ KIND_META[k].minutes }}</div>
                <VBtn size="x-small" color="accent" variant="tonal" @click="openBooking(k)">احجز هذا النوع</VBtn>
              </VCard>
            </VCol>
          </VRow>
        </VCard>

        <!-- Public reviews about this interviewer -->
        <VCard class="pa-5 mt-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">التقييمات العلنية</h3>
          <ReviewsPanel
            direction="toInterviewer"
            :subject-id="String(interviewer.id)"
            :subject-name="interviewer.name"
            can-add-review
          />
        </VCard>
      </VCol>

      <!-- Sidebar -->
      <VCol cols="12" md="4">
        <VCard class="pa-5 mb-4">
          <div class="text-center mb-3">
            <VProgressCircular :model-value="match" :size="110" :width="10" color="success">
              <span class="text-h5 font-weight-bold">{{ match }}%</span>
            </VProgressCircular>
            <div class="text-body-2 text-medium-emphasis mt-2">نسبة توافقك مع المقيّم</div>
          </div>
          <div class="text-center text-h6 font-weight-bold mb-1">{{ interviewer.priceMin }}–{{ interviewer.priceMax }} ريال</div>
          <div class="text-center text-caption text-medium-emphasis mb-3">حسب نوع المقابلة</div>
          <VBtn color="accent" size="large" block prepend-icon="mdi-calendar-plus" @click="openBooking()">احجز مقابلة</VBtn>
          <VAlert type="info" variant="tonal" density="compact" class="mt-3 text-caption">
            <VIcon icon="mdi-shield-check-outline" size="16" class="me-1" />تقرير المقابلة يُضاف لملفك ويرفع نسبة ثقتك تلقائيًا.
          </VAlert>
        </VCard>
      </VCol>
    </VRow>

    <!-- Booking dialog with advanced calendar -->
    <VDialog v-model="bookDialog" max-width="680" scrollable>
      <VCard class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>حجز مقابلة مع {{ interviewer.name }}</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="bookDialog = false" />
        </VCardTitle>
        <VCardText>
          <VSelect
            v-model="chosenKind"
            :items="kinds.map(k => ({ value: k, title: `${KIND_META[k].label} · ${KIND_META[k].minutes}` }))"
            label="نوع المقابلة"
            prepend-inner-icon="mdi-format-list-bulleted-type"
            class="mb-3"
          />

          <!-- AI smart time suggestions -->
          <div class="d-flex align-center ga-2 mb-1">
            <VIcon icon="mdi-robot-happy-outline" color="secondary" size="18" />
            <span class="text-subtitle-2 font-weight-bold">الأوقات المقترحة لك</span>
            <VChip size="x-small" color="secondary" variant="tonal" label>AI</VChip>
          </div>
          <div class="text-caption text-medium-emphasis mb-3">مرتّبة حسب نسبة التوافق بين تفضيلاتك وأيام توفّر المقيّم — اختر بنقرة واحدة.</div>
          <VRow dense>
            <VCol v-for="s in suggestedTimes" :key="s.id" cols="12" sm="4">
              <VCard
                variant="outlined"
                class="pa-3 h-100 suggest-card cursor-pointer"
                :class="{ 'suggest-card--on': selectedSuggestionId === s.id }"
                @click="pickSuggestion(s)"
              >
                <div class="d-flex align-center justify-space-between mb-1">
                  <VChip size="x-small" :color="compatColor(s.compatibility)" label>{{ s.tag }}</VChip>
                  <VIcon v-if="selectedSuggestionId === s.id" icon="mdi-check-circle" color="success" size="18" />
                </div>
                <div class="text-body-2 font-weight-bold mb-2">{{ s.label }}</div>
                <div class="d-flex align-center justify-space-between text-caption mb-1">
                  <span class="text-medium-emphasis">توافق</span>
                  <span class="font-weight-bold" :class="`text-${compatColor(s.compatibility)}`">{{ s.compatibility }}%</span>
                </div>
                <VProgressLinear :model-value="s.compatibility" :color="compatColor(s.compatibility)" height="6" rounded />
              </VCard>
            </VCol>
          </VRow>

          <div class="d-flex align-center flex-wrap ga-1 mt-2">
            <VBtn variant="text" size="small" color="secondary" prepend-icon="mdi-lightbulb-on-outline" @click="showWhy = !showWhy">
              لماذا هذه الأوقات؟
            </VBtn>
            <VBtn variant="text" size="small" prepend-icon="mdi-calendar-edit-outline" @click="showFullCalendar = !showFullCalendar">
              {{ showFullCalendar ? 'إخفاء الجدول الكامل' : 'أقترح وقتًا آخر' }}
            </VBtn>
          </div>
          <VExpandTransition>
            <VAlert v-if="showWhy" color="secondary" variant="tonal" density="comfortable" class="mt-2" border="start">
              <template #prepend><VIcon icon="mdi-robot-happy-outline" /></template>
              <span class="text-caption">{{ timesExplanation }}</span>
            </VAlert>
          </VExpandTransition>

          <!-- Full calendar — collapsed by default (AI suggestions are the primary path) -->
          <VExpandTransition>
            <div v-if="showFullCalendar">
              <VDivider class="my-3" />
              <VRow>
                <!-- Calendar -->
                <VCol cols="12" sm="7">
                  <div class="text-caption font-weight-bold mb-1">
                    <VIcon icon="mdi-calendar-month-outline" size="16" class="me-1" />اختر اليوم
                    <span class="text-medium-emphasis">(أيام المقيّم: {{ interviewer.availability.join('، ') }})</span>
                  </div>
                  <VDatePicker
                    v-model="chosenDate"
                    :allowed-dates="allowedDates"
                    :min="today"
                    color="primary"
                    show-adjacent-months
                    hide-header
                    width="100%"
                    @update:model-value="chosenTime = ''; selectedSuggestionId = ''"
                  />
                </VCol>

                <!-- Time slots -->
                <VCol cols="12" sm="5">
                  <div class="text-caption font-weight-bold mb-2">
                    <VIcon icon="mdi-clock-outline" size="16" class="me-1" />الفترات المتاحة
                  </div>
                  <div v-if="!chosenDate" class="text-caption text-medium-emphasis py-4 text-center">
                    اختر يومًا من الكالندر أولًا
                  </div>
                  <div v-else class="d-flex flex-wrap ga-2">
                    <VChip
                      v-for="slot in timeSlots"
                      :key="slot.time"
                      :color="chosenTime === slot.time ? 'primary' : slot.taken ? 'error' : undefined"
                      :variant="chosenTime === slot.time ? 'flat' : slot.taken ? 'tonal' : 'outlined'"
                      :disabled="slot.taken"
                      label
                      @click="pickTime(slot.time, slot.taken)"
                    >
                      <VIcon v-if="slot.taken" icon="mdi-lock-outline" size="13" start />
                      {{ slot.time }}
                    </VChip>
                  </div>
                  <div v-if="chosenDate" class="text-caption text-medium-emphasis mt-2">
                    <VIcon icon="mdi-information-outline" size="13" /> الفترات الحمراء محجوزة
                  </div>
                </VCol>
              </VRow>
            </div>
          </VExpandTransition>

          <!-- Custom evaluation elements -->
          <template v-if="interviewer.evalElements.length">
            <VDivider class="my-3" />
            <div class="text-subtitle-2 font-weight-bold mb-2">عناصر تقييم إضافية (اختياري)</div>
            <div class="d-flex flex-column ga-2">
              <div
                v-for="el in interviewer.evalElements"
                :key="el.id"
                class="element-row pa-2 d-flex align-center ga-2 cursor-pointer"
                :class="{ 'element-row--on': isSelected(el) }"
                @click="toggleElement(el)"
              >
                <VCheckboxBtn :model-value="isSelected(el)" color="accent" density="compact" @click.stop="toggleElement(el)" />
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-bold">{{ el.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ el.description }}</div>
                </div>
                <div class="d-flex align-center ga-1">
                  <span class="text-body-2 font-weight-bold">+{{ el.price }}</span>
                  <VMenu :close-on-content-click="false" location="top">
                    <template #activator="{ props }">
                      <VIcon v-bind="props" icon="mdi-information-outline" size="16" color="medium-emphasis" @click.stop />
                    </template>
                    <VCard max-width="300" class="pa-3 text-caption">{{ commissionNote }}</VCard>
                  </VMenu>
                </div>
              </div>
            </div>
          </template>

          <VDivider class="my-3" />

          <VAlert :color="canConfirm ? 'success' : 'accent'" variant="tonal" density="compact">
            <div class="d-flex justify-space-between align-center flex-wrap ga-2">
              <span class="text-body-2">
                <template v-if="canConfirm">{{ dateLabel }} · {{ chosenTime }}</template>
                <template v-else>اختر اليوم والفترة لتأكيد الموعد</template>
              </span>
              <span class="font-weight-bold">{{ price }} ريال</span>
            </div>
            <div class="d-flex align-center justify-space-between mt-1 text-caption text-medium-emphasis">
              <span>الأساسي {{ basePrice }}<span v-if="elementsTotal"> + إضافات {{ elementsTotal }}</span> ريال</span>
              <VMenu :close-on-content-click="false" location="top">
                <template #activator="{ props }">
                  <span v-bind="props" class="cursor-pointer d-flex align-center">
                    <VIcon icon="mdi-information-outline" size="14" class="me-1" />العمولة
                  </span>
                </template>
                <VCard max-width="320" class="pa-3">
                  <div class="text-caption font-weight-bold mb-1">{{ commissionText }}</div>
                  <div class="text-caption text-medium-emphasis">{{ commissionNote }}</div>
                </VCard>
              </VMenu>
            </div>
          </VAlert>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="bookDialog = false">إلغاء</VBtn>
          <VBtn color="accent" prepend-icon="mdi-check" :disabled="!canConfirm" @click="confirmBooking">تأكيد الحجز والدفع</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar v-model="bookedSnackbar" color="success" timeout="4500">
      تم إرسال طلب الحجز للمقيّم — ستصلك تأكيد الموعد قريبًا.
      <template #actions>
        <VBtn variant="text" @click="router.push({ name: 'interviewers' })">حجوزاتي</VBtn>
      </template>
    </VSnackbar>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-alert-circle-outline" size="64" color="error" />
    <div class="text-h6 mt-3">المقيّم غير موجود</div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'interviewers' }">العودة للسوق</VBtn>
  </VCard>
</template>

<style scoped>
.element-row {
  border: 1px solid rgba(140, 163, 150, 0.2);
  border-radius: var(--ui-radius);
  transition: border-color 0.18s ease, background 0.18s ease;
}
.element-row--on {
  border-color: rgb(var(--v-theme-accent));
  background: rgba(var(--v-theme-accent), 0.08);
}
.suggest-card {
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}
.suggest-card:hover {
  border-color: rgba(var(--v-theme-secondary), 0.55);
  transform: translateY(-2px);
}
.suggest-card--on {
  border-color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.08);
}
</style>
