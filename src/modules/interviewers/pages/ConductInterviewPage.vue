<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import type { EvaluationReport } from '@/stores/InterviewersStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { ai } from '@/services/ai'

const route = useRoute()
const router = useRouter()
const store = useInterviewersStore()
const notifications = useNotificationsStore()

const item = computed(() => store.getAgendaItem(Number(route.params.id)))
const questions = computed(() => (item.value ? ai.suggestEvaluationQuestions(item.value.kind) : []))

// Candidate's pre-interview materials + AI insight
const attachments = computed(() => item.value?.attachments ?? [])
const attachInsight = computed(() => ai.attachmentsInsight(attachments.value.map(a => ({ name: a.name, kind: a.kind, fileType: a.fileType }))))
function attIcon(a: { kind: string, fileType?: string, name: string }) {
  if (a.kind === 'link')
    return 'mdi-link-variant'
  const t = `${a.fileType ?? ''}${a.name}`
  if (/pdf/i.test(t))
    return 'mdi-file-pdf-box'
  if (/image|png|jpg|jpeg/i.test(t))
    return 'mdi-file-image-outline'
  if (/word|doc/i.test(t))
    return 'mdi-file-word-outline'
  return 'mdi-file-outline'
}

// Evaluation form
const competencies = ref([
  { name: 'المعرفة التقنية', score: 70 },
  { name: 'حل المشكلات', score: 70 },
  { name: 'التواصل', score: 70 },
])
const level = ref('متوسط')
const strengths = ref('')
const improvements = ref('')
const recommendation = ref('')
const levels = ['مبتدئ', 'متوسط', 'متقدم', 'خبير']

const overall = computed(() =>
  Math.round(competencies.value.reduce((s, c) => s + c.score, 0) / competencies.value.length),
)

// AI review of the draft report
const review = computed(() => ai.reviewEvaluationReport({
  strengths: strengths.value,
  improvements: improvements.value,
  level: level.value,
}))

const trustGain = computed(() => {
  if (overall.value >= 85)
    return 15
  if (overall.value >= 70)
    return 10
  if (overall.value >= 50)
    return 6
  return 3
})

const submittedSnackbar = ref(false)
const canSubmit = computed(() => strengths.value.trim().length > 0 && recommendation.value.trim().length > 0)

function submitReport() {
  if (!item.value || !canSubmit.value)
    return
  const report: EvaluationReport = {
    level: level.value,
    overall: overall.value,
    competencies: competencies.value.map(c => ({ ...c })),
    strengths: strengths.value.split('\n').map(s => s.trim()).filter(Boolean),
    improvements: improvements.value.split('\n').map(s => s.trim()).filter(Boolean),
    recommendation: recommendation.value.trim(),
    trustGain: trustGain.value,
  }
  store.completeSession(item.value.id, report)
  notifications.push({
    icon: 'mdi-file-check-outline',
    color: 'success',
    title: 'اعتُمد تقرير مقابلة',
    body: `أضفت تقرير ${item.value.candidateName} (${report.overall}%) لملفه ورفعت ثقته +${report.trustGain}%`,
    category: 'interview',
  })
  submittedSnackbar.value = true
  setTimeout(() => router.push({ name: 'interviewer-dashboard' }), 1200)
}
</script>

<template>
  <div v-if="item" class="mx-auto" style="max-width: 900px">
    <VBtn variant="text" prepend-icon="mdi-arrow-right" class="mb-3" @click="router.push({ name: 'interviewer-dashboard' })">لوحة المقيّم</VBtn>

    <!-- Session header -->
    <VCard class="pa-4 mb-4">
      <div class="d-flex align-center ga-3 flex-wrap">
        <VAvatar color="primary" size="52"><span class="text-h6 text-white font-weight-bold">{{ item.candidateInitial }}</span></VAvatar>
        <div class="flex-grow-1">
          <h1 class="text-h6 font-weight-bold mb-0">{{ item.candidateName }}</h1>
          <div class="text-caption text-medium-emphasis">{{ item.candidateField }} · {{ KIND_META[item.kind].label }} · {{ item.datetime }}</div>
        </div>
        <VChip color="error" label prepend-icon="mdi-record-circle"><span class="pulse">غرفة المقابلة</span></VChip>
      </div>
    </VCard>

    <!-- Candidate's pre-interview materials -->
    <VCard v-if="attachments.length" class="pa-4 mb-4">
      <div class="d-flex align-center ga-2 mb-3">
        <VIcon icon="mdi-paperclip" color="secondary" />
        <span class="text-subtitle-2 font-weight-bold">مواد تحضيرية من المرشح ({{ attachments.length }})</span>
      </div>
      <VRow dense class="mb-2">
        <VCol v-for="a in attachments" :key="a.id" cols="12" sm="6">
          <div class="att-row pa-2 d-flex align-center ga-2">
            <VIcon :icon="attIcon(a)" color="secondary" />
            <div class="flex-grow-1 text-truncate">
              <div class="text-body-2 font-weight-bold text-truncate">{{ a.name }}</div>
              <div class="text-caption text-medium-emphasis text-truncate">
                <template v-if="a.kind === 'link'">{{ a.url }}</template>
                <template v-else>{{ a.fileType }}</template>
              </div>
            </div>
            <VBtn size="x-small" variant="text" color="primary" :href="a.url" target="_blank" :disabled="a.kind !== 'link'">
              {{ a.kind === 'link' ? 'فتح' : 'معاينة' }}
            </VBtn>
          </div>
        </VCol>
      </VRow>
      <VAlert color="secondary" variant="tonal" density="compact" border="start">
        <div class="text-body-2 font-weight-bold mb-1"><VIcon icon="mdi-robot-happy-outline" size="18" /> تحليل الـ AI للمواد</div>
        <div class="text-caption mb-2">{{ attachInsight.summary }}</div>
        <ul class="text-caption ps-4 mb-0">
          <li v-for="(tip, i) in attachInsight.tips" :key="i">{{ tip }}</li>
        </ul>
      </VAlert>
    </VCard>

    <VRow>
      <!-- AI suggested questions -->
      <VCol cols="12" md="5">
        <VCard class="pa-4 h-100">
          <div class="d-flex align-center ga-2 mb-3">
            <VIcon icon="mdi-robot-happy-outline" color="secondary" />
            <span class="text-subtitle-2 font-weight-bold">أسئلة مقترحة من الـ AI</span>
          </div>
          <VList density="compact" class="py-0">
            <VListItem v-for="(q, i) in questions" :key="i" class="px-0">
              <template #prepend><VChip size="x-small" color="secondary" label class="me-2">{{ i + 1 }}</VChip></template>
              <VListItemTitle class="text-body-2" style="white-space: normal">{{ q }}</VListItemTitle>
            </VListItem>
          </VList>
          <VAlert type="info" variant="tonal" density="compact" class="mt-3 text-caption">
            مخصّصة حسب نوع «{{ KIND_META[item.kind].label }}» — استخدمها كإطار مرن.
          </VAlert>
        </VCard>
      </VCol>

      <!-- Evaluation form -->
      <VCol cols="12" md="7">
        <VCard class="pa-4">
          <div class="text-subtitle-2 font-weight-bold mb-3">نموذج التقييم</div>

          <div v-for="c in competencies" :key="c.name" class="mb-2">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>{{ c.name }}</span><span class="font-weight-bold">{{ c.score }}%</span>
            </div>
            <VSlider v-model="c.score" :min="0" :max="100" :step="5" color="primary" hide-details />
          </div>

          <div class="d-flex align-center justify-space-between my-3 pa-2 rounded" style="background: rgba(79,70,229,0.06)">
            <span class="text-body-2 font-weight-bold">التقييم العام</span>
            <VChip color="primary" label>{{ overall }}%</VChip>
          </div>

          <VSelect v-model="level" :items="levels" label="المستوى المُحدَّد" density="compact" class="mb-3" />
          <VTextarea v-model="strengths" label="نقاط القوة (سطر لكل نقطة)" rows="2" auto-grow class="mb-2" />
          <VTextarea v-model="improvements" label="نقاط التحسين (سطر لكل نقطة)" rows="2" auto-grow class="mb-2" />
          <VTextarea v-model="recommendation" label="التوصية النهائية" rows="2" auto-grow />

          <!-- AI review of report -->
          <VAlert color="secondary" variant="tonal" density="compact" class="mt-3" border="start">
            <template #prepend><VIcon icon="mdi-robot-happy-outline" size="18" /></template>
            <div class="text-caption">
              <div class="font-weight-bold mb-1">مراجعة الـ AI للتقرير</div>
              <div>{{ review.summary }}</div>
              <ul v-if="review.suggestions.length" class="ps-4 mt-1">
                <li v-for="s in review.suggestions" :key="s">{{ s }}</li>
              </ul>
            </div>
          </VAlert>

          <div class="d-flex align-center justify-space-between mt-3">
            <VChip color="success" variant="tonal" label prepend-icon="mdi-shield-check-outline">يرفع ثقة المرشح +{{ trustGain }}%</VChip>
            <VBtn color="accent" prepend-icon="mdi-send" :disabled="!canSubmit" @click="submitReport">
              اعتماد التقرير وإرساله
            </VBtn>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <VSnackbar v-model="submittedSnackbar" color="success" timeout="1500">
      تم اعتماد التقرير وإضافته لملف المرشح وتحديث نسبة ثقته.
    </VSnackbar>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-alert-circle-outline" size="64" color="error" />
    <div class="text-h6 mt-3">المقابلة غير موجودة</div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'interviewer-dashboard' }">لوحة المقيّم</VBtn>
  </VCard>
</template>

<style scoped>
.pulse { animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.att-row {
  border: 1px solid rgba(140, 163, 150, 0.2);
  border-radius: var(--ui-radius);
}
</style>
