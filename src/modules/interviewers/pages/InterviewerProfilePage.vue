<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { INTERVIEWER_TYPE_META, KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import type { MarketInterviewKind } from '@/stores/InterviewersStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

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
  if (!taken)
    chosenTime.value = time
}

const price = computed(() => {
  if (!interviewer.value)
    return 0
  // scale within the interviewer's range by interview kind weight
  const weight: Record<MarketInterviewKind, number> = { level: 0.2, behavioral: 0.4, skills: 0.6, leadership: 0.85, comprehensive: 1 }
  const { priceMin, priceMax } = interviewer.value
  return Math.round((priceMin + (priceMax - priceMin) * weight[chosenKind.value]) / 5) * 5
})

const dateLabel = computed(() => {
  if (!chosenDate.value)
    return ''
  const d = chosenDate.value
  return `${AR_DAYS[d.getDay()]} ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
const canConfirm = computed(() => !!chosenDate.value && !!chosenTime.value)

function openBooking(kind?: MarketInterviewKind) {
  if (kind)
    chosenKind.value = kind
  chosenDate.value = null
  chosenTime.value = ''
  bookDialog.value = true
}

function confirmBooking() {
  if (interviewer.value && canConfirm.value) {
    store.book(interviewer.value, chosenKind.value, `${dateLabel.value} · ${chosenTime.value}`, price.value)
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
                @update:model-value="chosenTime = ''"
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

          <VDivider class="my-3" />

          <VAlert :color="canConfirm ? 'success' : 'accent'" variant="tonal" density="compact">
            <div class="d-flex justify-space-between align-center flex-wrap ga-2">
              <span class="text-body-2">
                <template v-if="canConfirm">{{ dateLabel }} · {{ chosenTime }}</template>
                <template v-else>اختر اليوم والفترة لتأكيد الموعد</template>
              </span>
              <span class="font-weight-bold">{{ price }} ريال</span>
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
