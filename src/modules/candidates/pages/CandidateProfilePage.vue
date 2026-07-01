<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CANDIDATE_STATUS_META } from '../interfaces/Candidate'
import { useCandidatesStore } from '@/stores/CandidatesStore'
import { KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import type { MarketInterviewKind } from '@/stores/InterviewersStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

const route = useRoute()
const router = useRouter()
const store = useCandidatesStore()
const interviewersStore = useInterviewersStore()
const notifications = useNotificationsStore()
const candidate = computed(() => store.getById(Number(route.params.id)))
const snackbar = ref('')

// Certified-interviewer reports already on the candidate's record (mock)
const candidateReports = [
  { id: 1, interviewer: 'م. خالد الشمري', kind: 'skills' as MarketInterviewKind, level: 'متقدم', overall: 88, verified: true, strengths: ['حلول تقنية منظّمة', 'إلمام عميق بأنماط التصميم'], improvements: ['تحسين تغطية الاختبارات'], recommendation: 'مرشح تقني قوي جاهز لأدوار متقدمة.' },
  { id: 2, interviewer: 'أ. سلمى العنزي', kind: 'behavioral' as MarketInterviewKind, level: 'متقدم', overall: 84, verified: true, strengths: ['تواصل واضح', 'وعي ذاتي عالٍ'], improvements: ['تعزيز الحزم في المواقف الصعبة'], recommendation: 'مرشح متوازن سلوكيًا مناسب للعمل التعاوني.' },
]
const reportDialog = ref(false)
const activeReport = ref<typeof candidateReports[number] | null>(null)
function openReport(r: typeof candidateReports[number]) {
  activeReport.value = r
  reportDialog.value = true
}

// Request interview via a certified interviewer
const requestInterviewDialog = ref(false)
const chosenInterviewerId = ref<number | null>(interviewersStore.interviewers[0]?.id ?? null)
const chosenKind = ref<MarketInterviewKind>('skills')
const kinds = Object.keys(KIND_META) as MarketInterviewKind[]
const chosenInterviewer = computed(() => interviewersStore.getById(chosenInterviewerId.value ?? -1))
const requestPrice = computed(() => {
  const iv = chosenInterviewer.value
  if (!iv)
    return 0
  const weight: Record<MarketInterviewKind, number> = { level: 0.2, behavioral: 0.4, skills: 0.6, leadership: 0.85, comprehensive: 1 }
  return Math.round((iv.priceMin + (iv.priceMax - iv.priceMin) * weight[chosenKind.value]) / 5) * 5
})
function sendInterviewRequest() {
  requestInterviewDialog.value = false
  const ivName = chosenInterviewer.value?.name ?? 'مقيّم معتمد'
  notifications.push({
    icon: 'mdi-account-tie',
    color: 'primary',
    title: 'طلب مقابلة عبر مقيّم معتمد',
    body: `طلبت ${KIND_META[chosenKind.value].label} للمرشح ${candidate.value?.name} عبر ${ivName} (${requestPrice.value} ﷼)`,
    category: 'interview',
  })
  snackbar.value = `تم إرسال طلب مقابلة للمرشح عبر ${ivName}`
}

const matchBreakdown = [
  { label: 'المهارات', value: 90 },
  { label: 'الخبرات', value: 85 },
  { label: 'التعليم', value: 95 },
  { label: 'الموقع', value: 100 },
]

const endorsements = [
  { name: 'محمد العلي', relation: 'مدير سابق', type: 'فيديو', trusted: true },
  { name: 'لينا سعد', relation: 'زميلة', type: 'نص', trusted: false },
]
</script>

<template>
  <div v-if="candidate">
    <VBtn variant="text" prepend-icon="mdi-arrow-right" class="mb-3" @click="router.back()">
      رجوع للترشيحات
    </VBtn>

    <VRow>
      <VCol cols="12" md="8">
        <VCard class="pa-5 mb-4">
          <div class="d-flex align-center ga-4 mb-4">
            <VAvatar color="secondary" size="72">
              <span class="text-h4 text-white font-weight-bold">{{ candidate.name.charAt(0) }}</span>
            </VAvatar>
            <div>
              <h1 class="text-h5 font-weight-bold">{{ candidate.name }}</h1>
              <div class="text-body-1 text-medium-emphasis">{{ candidate.title }} · {{ candidate.location }}</div>
              <VChip size="x-small" label class="mt-1">{{ candidate.level }} · {{ candidate.experienceYears }} سنوات خبرة</VChip>
            </div>
          </div>
          <p class="text-body-2 text-medium-emphasis">{{ candidate.summary }}</p>

          <VDivider class="my-4" />
          <h3 class="text-subtitle-1 font-weight-bold mb-2">المهارات</h3>
          <div class="d-flex flex-wrap ga-2 mb-4">
            <VChip v-for="s in candidate.skills" :key="s" color="primary" variant="tonal" size="small">{{ s }}</VChip>
          </div>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">التوصيات</h3>
          <VRow class="mb-4">
            <VCol v-for="e in endorsements" :key="e.name" cols="12" sm="6">
              <VCard variant="outlined" class="pa-3 d-flex align-center ga-3">
                <VAvatar color="secondary" variant="tonal"><VIcon icon="mdi-account" /></VAvatar>
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-bold">
                    {{ e.name }}
                    <VIcon v-if="e.trusted" icon="mdi-check-decagram" color="success" size="16" />
                  </div>
                  <div class="text-caption text-medium-emphasis">{{ e.relation }}</div>
                </div>
                <VChip size="x-small" label>{{ e.type }}</VChip>
              </VCard>
            </VCol>
          </VRow>

          <!-- Certified-interviewer reports -->
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon icon="mdi-account-tie" color="secondary" size="20" />
            <h3 class="text-subtitle-1 font-weight-bold">تقارير المقيّمين المعتمدين ({{ candidateReports.length }})</h3>
          </div>
          <VRow class="mb-4">
            <VCol v-for="r in candidateReports" :key="r.id" cols="12" sm="6">
              <VCard variant="outlined" class="pa-3 cursor-pointer" @click="openReport(r)">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-body-2 font-weight-bold">{{ r.interviewer }}</span>
                  <VChip color="success" size="x-small" label>{{ r.overall }}%</VChip>
                </div>
                <div class="text-caption text-medium-emphasis mb-2">{{ KIND_META[r.kind].label }} · المستوى {{ r.level }}</div>
                <VBtn size="x-small" variant="text" color="primary" prepend-icon="mdi-file-document-outline">عرض التقرير</VBtn>
              </VCard>
            </VCol>
          </VRow>

          <div class="d-flex align-center justify-space-between mb-2">
            <h3 class="text-subtitle-1 font-weight-bold">السير الذاتية المُقدّمة</h3>
            <VBtn variant="text" size="x-small" color="primary" prepend-icon="mdi-refresh" @click="snackbar = 'تم إرسال طلب سيرة ذاتية محدّثة للمرشح'">
              طلب سيرة محدّثة
            </VBtn>
          </div>
          <VCard variant="outlined" class="pa-3 d-flex align-center ga-3">
            <VAvatar color="primary" variant="tonal" rounded="lg"><VIcon icon="mdi-file-account-outline" /></VAvatar>
            <div class="flex-grow-1">
              <div class="text-body-2 font-weight-bold">سيرة {{ candidate.name.split(' ')[0] }} - {{ candidate.title }}</div>
              <div class="text-caption text-medium-emphasis">قالب حديث · عربي · قُدّمت مع الطلب</div>
            </div>
            <VBtn icon="mdi-eye-outline" variant="text" size="small" :to="{ name: 'public-resume', params: { token: String(candidate.id) } }" />
            <VBtn icon="mdi-download" variant="text" size="small" />
          </VCard>
        </VCard>
      </VCol>

      <VCol cols="12" md="4">
        <VCard class="pa-5 mb-4 text-center">
          <VProgressCircular :model-value="candidate.matchRate" :size="110" :width="10" color="success">
            <span class="text-h5 font-weight-bold">{{ candidate.matchRate }}%</span>
          </VProgressCircular>
          <div class="text-body-2 text-medium-emphasis mt-2 mb-2">تطابق مع: {{ candidate.appliedFor }}</div>
          <VChip :color="CANDIDATE_STATUS_META[candidate.status].color" size="small" label class="mb-4">
            الحالة: {{ CANDIDATE_STATUS_META[candidate.status].label }}
          </VChip>

          <VBtn color="accent" block class="mb-2" prepend-icon="mdi-hand-heart-outline" @click="snackbar = 'تم إرسال رغبة للمرشح'">إبداء رغبة</VBtn>
          <VBtn color="primary" block class="mb-2" prepend-icon="mdi-account-tie-voice-outline" @click="requestInterviewDialog = true">طلب مقابلة</VBtn>
          <VBtn color="primary" variant="tonal" block class="mb-2" prepend-icon="mdi-calendar-clock-outline" @click="store.setStatus(candidate.id, 'interview'); snackbar = 'تمت دعوة المرشح لمقابلة'">جدولة مقابلة</VBtn>
          <VBtn color="secondary" variant="outlined" block class="mb-2" prepend-icon="mdi-message-outline" :to="{ name: 'messages' }">إرسال رسالة</VBtn>
          <VBtn color="error" variant="text" block prepend-icon="mdi-close" @click="store.setStatus(candidate.id, 'rejected'); snackbar = 'تم رفض الترشيح'">رفض الترشيح</VBtn>
        </VCard>

        <VCard class="pa-5">
          <div class="text-subtitle-1 font-weight-bold mb-3">تحليل التطابق</div>
          <div v-for="item in matchBreakdown" :key="item.label" class="mb-3">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>{{ item.label }}</span>
              <span class="font-weight-bold">{{ item.value }}%</span>
            </div>
            <VProgressLinear :model-value="item.value" color="primary" height="6" rounded />
          </div>
        </VCard>
      </VCol>
    </VRow>

    <!-- Request interview via certified interviewer -->
    <VDialog v-model="requestInterviewDialog" max-width="520">
      <VCard class="pa-2">
        <VCardTitle>طلب مقابلة تقييمية — {{ candidate.name }}</VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-3">اختر مقيّمًا معتمدًا يُجري المقابلة ويوثّق نتيجتها:</p>
          <VSelect
            v-model="chosenInterviewerId"
            :items="interviewersStore.interviewers.map(i => ({ value: i.id, title: `${i.name} · ${i.title}` }))"
            label="المقيّم المعتمد"
            prepend-inner-icon="mdi-account-tie"
            class="mb-3"
          />
          <VSelect
            v-model="chosenKind"
            :items="kinds.map(k => ({ value: k, title: `${KIND_META[k].label} · ${KIND_META[k].minutes}` }))"
            label="نوع المقابلة"
            class="mb-2"
          />
          <VAlert color="accent" variant="tonal" density="compact">
            <div class="d-flex justify-space-between align-center">
              <span class="text-body-2">التكلفة التقديرية</span>
              <span class="font-weight-bold">{{ requestPrice }} ﷼</span>
            </div>
          </VAlert>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="requestInterviewDialog = false">إلغاء</VBtn>
          <VBtn color="accent" prepend-icon="mdi-send" :disabled="!chosenInterviewerId" @click="sendInterviewRequest">إرسال الطلب</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Report view dialog -->
    <VDialog v-model="reportDialog" max-width="480">
      <VCard v-if="activeReport" class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>تقرير المقابلة</span>
          <VChip color="success" label>{{ activeReport.overall }}%</VChip>
        </VCardTitle>
        <VCardText>
          <div class="text-caption text-medium-emphasis mb-1">
            <VIcon icon="mdi-check-decagram" color="primary" size="14" /> {{ activeReport.interviewer }} · {{ KIND_META[activeReport.kind].label }} · المستوى {{ activeReport.level }}
          </div>
          <VDivider class="my-2" />
          <div class="text-body-2 font-weight-bold mb-1">نقاط القوة</div>
          <VChip v-for="s in activeReport.strengths" :key="s" size="x-small" color="success" variant="tonal" class="ma-1">{{ s }}</VChip>
          <div class="text-body-2 font-weight-bold mt-2 mb-1">نقاط التحسين</div>
          <VChip v-for="w in activeReport.improvements" :key="w" size="x-small" color="warning" variant="tonal" class="ma-1">{{ w }}</VChip>
          <VAlert color="secondary" variant="tonal" density="compact" class="mt-3 text-body-2">
            <template #prepend><VIcon icon="mdi-lightbulb-on-outline" size="18" /></template>
            {{ activeReport.recommendation }}
          </VAlert>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="reportDialog = false">إغلاق</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar :model-value="!!snackbar" color="success" timeout="2500" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </VSnackbar>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-account-alert-outline" size="64" color="error" />
    <div class="text-h6 mt-3">المرشح غير موجود</div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'candidates' }">العودة للترشيحات</VBtn>
  </VCard>
</template>
