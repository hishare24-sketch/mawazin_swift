<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import { CANDIDATE_STATUS_META } from '../interfaces/Candidate'
import type { CandidateStatus } from '../interfaces/Candidate'
import { useCandidatesStore } from '@/stores/CandidatesStore'

const router = useRouter()
const store = useCandidatesStore()

const search = ref('')
const statusFilter = ref<CandidateStatus | null>(null)
const sortBy = ref<'match' | 'recent' | 'trust'>('match')
const minTrust = ref(0)
const interviewLevelFilter = ref<string | null>(null)
const interviewLevelOptions = ['أساسي', 'متوسط', 'متقدم', 'خبير'].map(v => ({ value: v, title: v }))

function trustColor(v: number) {
  if (v >= 70)
    return 'success'
  if (v >= 40)
    return 'warning'
  return 'error'
}

// Bulk selection
const selected = ref<number[]>([])
const bulkSnackbar = ref('')
function toggleSelect(id: number) {
  selected.value = selected.value.includes(id) ? selected.value.filter(x => x !== id) : [...selected.value, id]
}
function clearSelection() {
  selected.value = []
}
function bulkInterview() {
  selected.value.forEach(id => store.setStatus(id, 'interview'))
  bulkSnackbar.value = `تمت دعوة ${selected.value.length} مرشحين لمقابلة`
  clearSelection()
}
function bulkReject() {
  selected.value.forEach(id => store.setStatus(id, 'rejected'))
  bulkSnackbar.value = `تم رفض ${selected.value.length} مرشحين`
  clearSelection()
}
function bulkMessage() {
  bulkSnackbar.value = `تم إرسال رسالة جماعية إلى ${selected.value.length} مرشحين`
  clearSelection()
}

const statusOptions = (Object.keys(CANDIDATE_STATUS_META) as CandidateStatus[]).map(value => ({
  value,
  title: CANDIDATE_STATUS_META[value].label,
}))

const stats = computed(() => [
  { title: 'إجمالي الترشيحات', value: store.candidates.length, icon: 'mdi-account-group-outline', color: 'primary' },
  { title: 'ترشيحات جديدة', value: store.newCount, icon: 'mdi-account-plus-outline', color: 'accent' },
  { title: 'قيد المراجعة', value: store.countByStatus('reviewing'), icon: 'mdi-file-search-outline', color: 'info' },
  { title: 'مقابلات', value: store.interviewCount, icon: 'mdi-calendar-check-outline', color: 'success' },
])

const filtered = computed(() => {
  let list = store.candidates.filter((c) => {
    const matchesSearch = !search.value || c.name.includes(search.value) || c.title.includes(search.value)
      || c.skills.some(s => s.toLowerCase().includes(search.value.toLowerCase()))
    const matchesStatus = !statusFilter.value || c.status === statusFilter.value
    const matchesTrust = c.trustScore >= minTrust.value
    const matchesInterview = !interviewLevelFilter.value || c.interviewLevel === interviewLevelFilter.value
    return matchesSearch && matchesStatus && matchesTrust && matchesInterview
  })
  list = [...list].sort((a, b) => {
    if (sortBy.value === 'trust')
      return b.trustScore - a.trustScore
    if (sortBy.value === 'recent')
      return b.id - a.id
    return b.matchRate - a.matchRate
  })
  return list
})

function matchColor(rate: number) {
  if (rate >= 85)
    return 'success'
  if (rate >= 70)
    return 'secondary'
  return 'warning'
}

function openProfile(id: number) {
  router.push({ name: 'candidate-profile', params: { id } })
}
</script>

<template>
  <div>
    <PageHeader title="الترشيحات" subtitle="المرشحون المتقدمون لفرصك مع نسب التطابق الذكي" icon="mdi-account-group-outline" />

    <VRow class="mb-2">
      <VCol v-for="s in stats" :key="s.title" cols="6" md="3">
        <StatCard v-bind="s" />
      </VCol>
    </VRow>

    <VCard class="pa-4 mb-5">
      <VRow dense align="center">
        <VCol cols="12" md="5">
          <VTextField v-model="search" placeholder="ابحث بالاسم أو المسمى أو المهارة..." prepend-inner-icon="mdi-magnify" hide-details clearable />
        </VCol>
        <VCol cols="6" md="3">
          <VSelect v-model="statusFilter" :items="statusOptions" placeholder="حالة الترشيح" hide-details clearable />
        </VCol>
        <VCol cols="6" md="2">
          <VSelect v-model="interviewLevelFilter" :items="interviewLevelOptions" placeholder="مستوى المقابلة" hide-details clearable />
        </VCol>
        <VCol cols="6" md="2">
          <VSelect v-model="sortBy" :items="[{ value: 'match', title: 'الأعلى تطابقاً' }, { value: 'trust', title: 'الأعلى ثقة' }, { value: 'recent', title: 'الأحدث' }]" hide-details prepend-inner-icon="mdi-sort" />
        </VCol>
        <VCol cols="12" class="d-flex align-center ga-3">
          <span class="text-caption text-medium-emphasis text-no-wrap">أدنى نسبة ثقة: {{ minTrust }}%</span>
          <VSlider v-model="minTrust" :min="0" :max="100" :step="5" color="secondary" hide-details density="compact" />
        </VCol>
      </VRow>
    </VCard>

    <div class="d-flex align-center justify-space-between mb-3">
      <span class="text-body-2 text-medium-emphasis">{{ filtered.length }} مرشح</span>
    </div>

    <!-- Bulk action bar -->
    <VExpandTransition>
      <VCard v-if="selected.length" color="primary" theme="darkTheme" class="pa-3 mb-3 d-flex align-center flex-wrap ga-2">
        <span class="font-weight-bold me-2">{{ selected.length }} محدّد</span>
        <VBtn size="small" color="white" variant="tonal" prepend-icon="mdi-calendar-check-outline" @click="bulkInterview">دعوة جماعية لمقابلة</VBtn>
        <VBtn size="small" color="white" variant="tonal" prepend-icon="mdi-message-outline" @click="bulkMessage">رسالة جماعية</VBtn>
        <VBtn size="small" color="white" variant="tonal" prepend-icon="mdi-close" @click="bulkReject">رفض جماعي</VBtn>
        <VSpacer />
        <VBtn size="small" variant="text" @click="clearSelection">إلغاء التحديد</VBtn>
      </VCard>
    </VExpandTransition>

    <VRow>
      <VCol v-for="c in filtered" :key="c.id" cols="12" md="6">
        <VCard class="pa-4" height="100%" :variant="selected.includes(c.id) ? 'outlined' : undefined" :color="selected.includes(c.id) ? 'primary' : undefined">
          <div class="d-flex align-start justify-space-between">
            <div class="d-flex align-center ga-2">
              <VCheckbox :model-value="selected.includes(c.id)" hide-details density="compact" color="primary" @update:model-value="toggleSelect(c.id)" />
              <div class="d-flex align-center ga-3 cursor-pointer" @click="openProfile(c.id)">
                <VAvatar color="secondary" size="52"><span class="text-h6 text-white font-weight-bold">{{ c.name.charAt(0) }}</span></VAvatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold">{{ c.name }}</div>
                  <div class="text-body-2 text-medium-emphasis">{{ c.title }} · {{ c.location }} · {{ c.level }}</div>
                </div>
              </div>
            </div>
            <div class="d-flex flex-column align-end ga-1">
              <VChip :color="CANDIDATE_STATUS_META[c.status].color" size="small" label>{{ CANDIDATE_STATUS_META[c.status].label }}</VChip>
              <VChip :color="trustColor(c.trustScore)" size="x-small" variant="tonal" prepend-icon="mdi-shield-check-outline">
                ثقة {{ c.trustScore }}%
              </VChip>
            </div>
          </div>

          <div class="d-flex flex-wrap ga-1 my-3 align-center">
            <VChip v-for="s in c.skills.slice(0, 4)" :key="s" size="x-small" variant="tonal" color="primary">{{ s }}</VChip>
            <VChip v-if="c.interviewLevel !== 'لا يوجد'" size="x-small" variant="tonal" color="info" prepend-icon="mdi-account-tie-voice-outline">
              مقابلة {{ c.interviewLevel }}
            </VChip>
          </div>

          <div class="mb-3">
            <div class="d-flex justify-space-between text-caption mb-1">
              <span class="text-medium-emphasis">نسبة التطابق</span>
              <span class="font-weight-bold" :class="`text-${matchColor(c.matchRate)}`">{{ c.matchRate }}%</span>
            </div>
            <VProgressLinear :model-value="c.matchRate" :color="matchColor(c.matchRate)" height="6" rounded />
          </div>

          <VDivider class="mb-3" />
          <div class="d-flex align-center justify-space-between">
            <span class="text-caption text-medium-emphasis">تقدّم {{ c.appliedAt }}</span>
            <div class="d-flex ga-1">
              <VBtn v-if="c.status === 'new' || c.status === 'reviewing'" color="success" size="small" variant="tonal" prepend-icon="mdi-calendar-check-outline" @click="store.setStatus(c.id, 'interview')">
                دعوة لمقابلة
              </VBtn>
              <VBtn color="primary" size="small" variant="tonal" @click="openProfile(c.id)">الملف</VBtn>
              <VMenu>
                <template #activator="{ props }">
                  <VBtn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" />
                </template>
                <VList density="compact">
                  <VListItem prepend-icon="mdi-file-search-outline" title="نقل لقيد المراجعة" @click="store.setStatus(c.id, 'reviewing')" />
                  <VListItem prepend-icon="mdi-calendar-check-outline" title="دعوة لمقابلة" @click="store.setStatus(c.id, 'interview')" />
                  <VListItem prepend-icon="mdi-close-circle-outline" title="رفض الترشيح" base-color="error" @click="store.setStatus(c.id, 'rejected')" />
                </VList>
              </VMenu>
            </div>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <VSnackbar :model-value="!!bulkSnackbar" color="success" timeout="2500" @update:model-value="bulkSnackbar = ''">
      {{ bulkSnackbar }}
    </VSnackbar>
  </div>
</template>
