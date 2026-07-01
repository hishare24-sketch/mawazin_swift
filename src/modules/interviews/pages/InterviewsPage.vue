<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { LEVEL_META, TYPE_META, useInterviewsStore } from '@/stores/InterviewsStore'
import type { Interview } from '@/stores/InterviewsStore'
import type { InterviewLevel, InterviewTrack, InterviewType } from '@/services/ai'
import { TRACK_META } from '@/services/ai'
import { BOOKING_STATUS_META, KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'

const router = useRouter()
const store = useInterviewsStore()
const interviewers = useInterviewersStore()

// — Upcoming schedule (weekly calendar + smart reminders) —
const AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
function parseDT(s: string): Date | null {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[^\d]*(\d{1,2}):(\d{2}))?/)
  if (!m)
    return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), m[4] ? Number(m[4]) : 0, m[5] ? Number(m[5]) : 0)
  return Number.isNaN(d.getTime()) ? null : d
}
const nowRef = new Date()
const todayMid = new Date(nowRef.getFullYear(), nowRef.getMonth(), nowRef.getDate())
function daysUntil(d: Date) {
  const dm = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((dm.getTime() - todayMid.getTime()) / 86_400_000)
}
function relLabel(d: Date | null) {
  if (!d)
    return ''
  const n = daysUntil(d)
  if (n < 0)
    return 'سابقة'
  if (n === 0)
    return 'اليوم'
  if (n === 1)
    return 'غدًا'
  if (n <= 7)
    return `خلال ${n} أيام`
  return `بعد ${n} يومًا`
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

interface AgendaEntry { id: string, title: string, icon: string, raw: string, dt: Date | null, statusLabel: string, color: string, to: any }
const upcoming = computed<AgendaEntry[]>(() => {
  const fromInterviews: AgendaEntry[] = store.interviews
    .filter(i => i.status !== 'completed')
    .map(i => ({
      id: `iv${i.id}`, title: `${TYPE_META[i.type].label} · ${LEVEL_META[i.level].label}`, icon: TYPE_META[i.type].icon,
      raw: i.date, dt: parseDT(i.date),
      statusLabel: i.status === 'in_progress' ? 'قيد التنفيذ' : 'مجدولة', color: i.status === 'in_progress' ? 'primary' : 'warning',
      to: i.status === 'in_progress' ? { name: 'interview-session', params: { id: i.id } } : { name: 'interviews' },
    }))
  const fromBookings: AgendaEntry[] = interviewers.bookings
    .filter(b => b.status === 'requested' || b.status === 'scheduled')
    .map(b => ({
      id: `bk${b.id}`, title: `${b.interviewerName} · ${KIND_META[b.kind].label}`, icon: 'mdi-account-tie-voice-outline',
      raw: b.datetime, dt: parseDT(b.datetime),
      statusLabel: BOOKING_STATUS_META[b.status].label, color: BOOKING_STATUS_META[b.status].color,
      to: { name: 'interviewers' },
    }))
  return [...fromInterviews, ...fromBookings].sort((a, b) => (a.dt ? a.dt.getTime() : Infinity) - (b.dt ? b.dt.getTime() : Infinity))
})
const nextSession = computed(() => upcoming.value.find(u => u.dt && daysUntil(u.dt) >= 0) ?? upcoming.value[0] ?? null)
const week = computed(() => Array.from({ length: 7 }, (_, k) => {
  const d = new Date(todayMid)
  d.setDate(d.getDate() + k)
  return { key: k, label: AR_DAYS[d.getDay()], num: d.getDate(), items: upcoming.value.filter(u => u.dt && sameDay(u.dt, d)), isToday: k === 0 }
}))

const types = Object.keys(TYPE_META) as InterviewType[]
const levels = Object.keys(LEVEL_META) as InterviewLevel[]
const tracks = Object.keys(TRACK_META) as InterviewTrack[]

const setupDialog = ref(false)
const chosenType = ref<InterviewType>('ai_text')
const chosenLevel = ref<InterviewLevel>('intermediate')
const chosenTrack = ref<InterviewTrack>('tech')

const isAiInterview = computed(() => chosenType.value === 'ai_text' || chosenType.value === 'ai_video')

function openSetup(type: InterviewType) {
  chosenType.value = type
  chosenLevel.value = 'intermediate'
  setupDialog.value = true
}

function startNow() {
  const id = store.start(chosenType.value, chosenLevel.value, isAiInterview.value ? chosenTrack.value : undefined)
  setupDialog.value = false
  if (isAiInterview.value)
    router.push({ name: 'interview-session', params: { id } })
  else
    router.push({ name: 'interviews' })
}

function viewResult(iv: Interview) {
  router.push({ name: 'interview-result', params: { id: iv.id } })
}
</script>

<template>
  <div>
    <PageHeader
      title="المقابلات وتحديد المستوى"
      subtitle="أثبت مستواك عبر مقابلات ذكية أو مع خبراء — ترفع نسبة ثقتك"
      icon="mdi-account-tie-voice-outline"
    />

    <!-- Upcoming schedule (weekly calendar + smart reminder) -->
    <VCard v-if="upcoming.length" class="pa-4 mb-4">
      <div class="d-flex align-center ga-2 mb-3">
        <VIcon icon="mdi-calendar-clock-outline" color="primary" />
        <h3 class="text-subtitle-1 font-weight-bold">جدولك القادم</h3>
      </div>

      <!-- Smart reminder -->
      <VAlert v-if="nextSession" color="accent" variant="tonal" density="comfortable" class="mb-3" border="start">
        <template #prepend><VIcon icon="mdi-bell-ring-outline" /></template>
        <div class="d-flex align-center justify-space-between flex-wrap ga-2">
          <span class="text-body-2">
            <span class="font-weight-bold">مقابلتك القادمة:</span> {{ nextSession.title }}
            <VChip v-if="nextSession.dt" size="x-small" color="accent" label class="ms-1">{{ relLabel(nextSession.dt) }}</VChip>
            <span class="text-caption text-medium-emphasis ms-1">{{ nextSession.raw }}</span>
          </span>
          <VBtn size="small" color="accent" variant="flat" :to="nextSession.to">التفاصيل</VBtn>
        </div>
      </VAlert>

      <!-- Weekly strip -->
      <div class="week-strip">
        <div
          v-for="day in week"
          :key="day.key"
          class="week-day pa-2 text-center"
          :class="{ 'week-day--today': day.isToday, 'week-day--has': day.items.length }"
        >
          <div class="text-caption text-medium-emphasis">{{ day.label }}</div>
          <div class="text-h6 font-weight-bold">{{ day.num }}</div>
          <div class="d-flex justify-center ga-1 mt-1" style="min-height: 8px">
            <span v-for="it in day.items.slice(0, 3)" :key="it.id" class="week-dot" :style="{ background: `rgb(var(--v-theme-${it.color}))` }" />
          </div>
        </div>
      </div>

      <!-- Upcoming list -->
      <VList class="py-0 mt-2">
        <VListItem v-for="u in upcoming" :key="u.id" :to="u.to" class="px-2">
          <template #prepend>
            <VAvatar :color="u.color" variant="tonal" rounded="lg" size="38"><VIcon :icon="u.icon" size="20" /></VAvatar>
          </template>
          <VListItemTitle class="font-weight-bold text-body-2">{{ u.title }}</VListItemTitle>
          <VListItemSubtitle>{{ u.raw }}</VListItemSubtitle>
          <template #append>
            <div class="d-flex align-center ga-2">
              <VChip v-if="u.dt" size="x-small" variant="tonal" label>{{ relLabel(u.dt) }}</VChip>
              <VChip :color="u.color" size="x-small" label>{{ u.statusLabel }}</VChip>
            </div>
          </template>
        </VListItem>
      </VList>
    </VCard>

    <!-- Available -->
    <h3 class="text-h6 font-weight-bold mb-3">المقابلات المتاحة</h3>
    <VRow class="mb-4">
      <VCol v-for="t in types" :key="t" cols="12" sm="6" lg="3">
        <VCard class="pa-4 text-center h-100 d-flex flex-column">
          <VAvatar color="primary" variant="tonal" size="56" rounded="lg" class="mb-3 mx-auto"><VIcon :icon="TYPE_META[t].icon" size="30" /></VAvatar>
          <div class="text-subtitle-2 font-weight-bold">{{ TYPE_META[t].label }}</div>
          <div class="text-caption text-medium-emphasis mb-3 flex-grow-1">{{ TYPE_META[t].desc }}</div>
          <VBtn color="accent" size="small" block @click="openSetup(t)">اختيار المستوى</VBtn>
        </VCard>
      </VCol>
    </VRow>

    <!-- History -->
    <h3 class="text-h6 font-weight-bold mb-3">سجل المقابلات ({{ store.count }})</h3>
    <VCard v-if="store.count">
      <VList lines="two">
        <template v-for="(iv, i) in store.interviews" :key="iv.id">
          <VListItem>
            <template #prepend>
              <VAvatar :color="iv.status === 'completed' ? 'success' : 'warning'" variant="tonal" rounded="lg">
                <VIcon :icon="TYPE_META[iv.type].icon" />
              </VAvatar>
            </template>
            <VListItemTitle class="font-weight-bold">
              {{ TYPE_META[iv.type].label }} · {{ LEVEL_META[iv.level].label }}
            </VListItemTitle>
            <VListItemSubtitle>
              {{ iv.date }} ·
              <span v-if="iv.result">النتيجة {{ iv.result.score }}% ({{ iv.result.level }})</span>
              <span v-else>{{ iv.status === 'in_progress' ? 'قيد التنفيذ' : 'مجدولة' }}</span>
            </VListItemSubtitle>
            <template #append>
              <VBtn v-if="iv.status === 'completed'" variant="tonal" color="primary" size="small" @click="viewResult(iv)">التقرير</VBtn>
              <VBtn v-else-if="iv.status === 'in_progress'" color="accent" size="small" @click="router.push({ name: 'interview-session', params: { id: iv.id } })">متابعة</VBtn>
            </template>
          </VListItem>
          <VDivider v-if="i < store.interviews.length - 1" />
        </template>
      </VList>
    </VCard>
    <VCard v-else class="pa-8 text-center">
      <VIcon icon="mdi-account-voice" size="48" color="medium-emphasis" />
      <div class="text-body-2 text-medium-emphasis mt-2">لم تُجرِ أي مقابلة بعد — ابدأ بمقابلة AI أساسية مجانية</div>
    </VCard>

    <!-- Setup dialog -->
    <VDialog v-model="setupDialog" max-width="520">
      <VCard class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>{{ TYPE_META[chosenType].label }}</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="setupDialog = false" />
        </VCardTitle>
        <VCardText>
          <template v-if="isAiInterview">
            <div class="text-body-2 font-weight-bold mb-2">اختر مسار المقابلة</div>
            <p class="text-caption text-medium-emphasis mb-2">أسئلة تفاعلية تكيّفية مضادة للغش حسب مجالك</p>
            <VRow class="mb-3">
              <VCol v-for="tr in tracks" :key="tr" cols="6">
                <VCard
                  :variant="chosenTrack === tr ? 'flat' : 'outlined'"
                  :color="chosenTrack === tr ? 'primary' : undefined"
                  class="pa-2 cursor-pointer d-flex align-center ga-2"
                  @click="chosenTrack = tr"
                >
                  <VIcon :icon="TRACK_META[tr].icon" :color="chosenTrack === tr ? 'white' : 'primary'" size="20" />
                  <div class="text-caption font-weight-bold" :class="chosenTrack === tr ? 'text-white' : ''">{{ TRACK_META[tr].label }}</div>
                </VCard>
              </VCol>
            </VRow>
          </template>

          <div class="text-body-2 font-weight-bold mb-2">اختر المستوى</div>
          <VCard
            v-for="lvl in levels"
            :key="lvl"
            :variant="chosenLevel === lvl ? 'flat' : 'outlined'"
            :color="chosenLevel === lvl ? 'primary' : undefined"
            class="pa-3 mb-2 cursor-pointer d-flex align-center justify-space-between"
            @click="chosenLevel = lvl"
          >
            <div class="d-flex align-center ga-2">
              <VIcon :icon="chosenLevel === lvl ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'" :color="chosenLevel === lvl ? 'white' : undefined" />
              <span :class="chosenLevel === lvl ? 'text-white' : ''">{{ LEVEL_META[lvl].label }}</span>
            </div>
            <VChip size="small" :color="chosenLevel === lvl ? 'white' : 'accent'" :variant="chosenLevel === lvl ? 'flat' : 'tonal'" label>
              {{ LEVEL_META[lvl].cost === 0 ? 'مجاني' : `${LEVEL_META[lvl].cost} ريال` }}
            </VChip>
          </VCard>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="setupDialog = false">إلغاء</VBtn>
          <VBtn v-if="chosenType === 'external' || chosenType === 'expert'" color="secondary" variant="tonal" prepend-icon="mdi-calendar">جدولة</VBtn>
          <VBtn color="accent" prepend-icon="mdi-play" @click="startNow">
            {{ chosenType === 'external' || chosenType === 'expert' ? 'طلب المقابلة' : 'بدء الآن' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.week-strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.week-day {
  border: 1px solid rgba(140, 163, 150, 0.18);
  border-radius: var(--ui-radius);
  transition: border-color 0.18s ease, background 0.18s ease;
}
.week-day--has {
  border-color: rgba(var(--v-theme-primary), 0.4);
}
.week-day--today {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgb(var(--v-theme-primary));
}
.week-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
</style>
