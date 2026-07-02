<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { INTERVIEWER_TYPE_META, KIND_META } from '@/stores/InterviewersStore'
import type { InterviewerType, MarketInterviewKind } from '@/stores/InterviewersStore'
import { ai } from '@/services/ai'
import { useAuthStore } from '@/stores/AuthStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { useRoleProfilesStore } from '@/stores/RoleProfilesStore'

const router = useRouter()
const authStore = useAuthStore()
const notifications = useNotificationsStore()
const step = ref(1)

// Step 1: qualifications
const type = ref<InterviewerType>('technical')
const years = ref(5)
const certs = ref(2)
const endorsements = ref(1)
const hasLicense = ref(false)
const types = Object.keys(INTERVIEWER_TYPE_META) as InterviewerType[]

// Step 2: AI eligibility
const eligibility = computed(() => ai.interviewerEligibility({
  years: years.value, certs: certs.value, endorsements: endorsements.value, hasLicense: hasLicense.value,
}))
const eligColor = computed(() => (eligibility.value.score >= 70 ? 'success' : eligibility.value.score >= 45 ? 'warning' : 'error'))
const recLabel: Record<string, string> = { accept: 'مؤهّل للقبول', review: 'قيد المراجعة', reject: 'دون الحدّ الأدنى' }

// Step 3: services + pricing
const kinds = Object.keys(KIND_META) as MarketInterviewKind[]
const selectedKinds = ref<MarketInterviewKind[]>(['skills', 'level'])
function toggleKind(k: MarketInterviewKind) {
  selectedKinds.value = selectedKinds.value.includes(k)
    ? selectedKinds.value.filter(x => x !== k)
    : [...selectedKinds.value, k]
}
const pricing = computed(() =>
  selectedKinds.value.map(k => ({ kind: k, ...ai.suggestInterviewerPricing(k, years.value) })),
)

const doneSnackbar = ref(false)
function finish() {
  // Grant the interviewer role: the AI eligibility step is the approval gate.
  // A "reject" recommendation leaves the request pending (doc: approval role).
  authStore.requestRole('interviewer')
  const approved = eligibility.value.recommendation !== 'reject'
  // Seed the interviewer_profiles record from the wizard answers
  useRoleProfilesStore().updateInterviewer({
    specializations: [INTERVIEWER_TYPE_META[type.value].label],
    interview_types: selectedKinds.value.map(k => KIND_META[k].label),
    hourly_rate: pricing.value[0] ? Math.round((pricing.value[0].min + pricing.value[0].max) / 2) : 0,
    certificates: certs.value > 0 ? [`${certs.value} شهادة مهنية موثّقة`] : [],
    is_approved: approved,
  })
  if (approved) {
    authStore.activateRole('interviewer')
    authStore.switchRole('interviewer')
    notifications.push({
      icon: 'mdi-star-check-outline',
      color: 'success',
      title: 'تم اعتمادك مقيّمًا',
      body: 'فُعّل دور المقيّم المعتمد في حسابك — يمكنك التبديل إليه من قائمة حسابك.',
      category: 'system',
    })
  }
  doneSnackbar.value = true
  setTimeout(() => {
    if (approved)
      router.push({ name: 'interviewer-dashboard' })
    else
      router.push({ name: 'dashboard' })
  }, 1300)
}
</script>

<template>
  <div class="mx-auto" style="max-width: 780px">
    <PageHeader
      title="التسجيل كمقيّم معتمد"
      subtitle="انضم كخبير لإجراء مقابلات تقييمية موثّقة وتحقيق دخل إضافي"
      icon="mdi-badge-account-outline"
    />

    <VStepper v-model="step" :items="['المؤهلات', 'الأهلية', 'الخدمات والأسعار']" hide-actions class="mb-4">
      <!-- Step 1 -->
      <template #item.1>
        <VCard flat class="pa-2">
          <div class="text-body-2 font-weight-bold mb-2">نوع التخصص</div>
          <div class="d-flex flex-wrap ga-2 mb-4">
            <VChip
              v-for="t in types"
              :key="t"
              :color="type === t ? INTERVIEWER_TYPE_META[t].color : undefined"
              :variant="type === t ? 'flat' : 'outlined'"
              :prepend-icon="INTERVIEWER_TYPE_META[t].icon"
              @click="type = t"
            >
              {{ INTERVIEWER_TYPE_META[t].label }}
            </VChip>
          </div>

          <div class="text-body-2 mb-1">سنوات الخبرة: <strong>{{ years }}</strong></div>
          <VSlider v-model="years" :min="0" :max="20" :step="1" color="primary" hide-details class="mb-3" />
          <div class="text-body-2 mb-1">عدد الشهادات المعتمدة: <strong>{{ certs }}</strong></div>
          <VSlider v-model="certs" :min="0" :max="8" :step="1" color="secondary" hide-details class="mb-3" />
          <div class="text-body-2 mb-1">التوصيات الموثّقة: <strong>{{ endorsements }}</strong></div>
          <VSlider v-model="endorsements" :min="0" :max="6" :step="1" color="accent" hide-details class="mb-2" />
          <VSwitch v-model="hasLicense" label="لديّ ترخيص مهني (إن وُجد)" color="primary" density="compact" hide-details />

          <div class="d-flex justify-end mt-3">
            <VBtn color="accent" append-icon="mdi-arrow-left" @click="step = 2">تحليل الأهلية</VBtn>
          </div>
        </VCard>
      </template>

      <!-- Step 2 -->
      <template #item.2>
        <VCard flat class="pa-2 text-center">
          <VProgressCircular :model-value="eligibility.score" :size="130" :width="12" :color="eligColor">
            <span class="text-h4 font-weight-bold">{{ eligibility.score }}</span>
          </VProgressCircular>
          <div class="mt-2 mb-3">
            <VChip :color="eligColor" label>{{ recLabel[eligibility.recommendation] }}</VChip>
          </div>
          <VAlert :color="eligColor" variant="tonal" density="compact" class="text-body-2 text-start mb-3">
            <template #prepend><VIcon icon="mdi-robot-happy-outline" /></template>
            {{ eligibility.note }}
          </VAlert>

          <VRow class="text-start">
            <VCol cols="12" sm="6">
              <div class="text-caption font-weight-bold mb-1"><VIcon icon="mdi-thumb-up-outline" color="success" size="16" /> نقاط القوة</div>
              <VChip v-for="s in eligibility.strengths" :key="s" size="x-small" color="success" variant="tonal" class="ma-1">{{ s }}</VChip>
            </VCol>
            <VCol cols="12" sm="6">
              <div class="text-caption font-weight-bold mb-1"><VIcon icon="mdi-alert-outline" color="warning" size="16" /> نقاط للتعزيز</div>
              <VChip v-for="g in eligibility.gaps" :key="g" size="x-small" color="warning" variant="tonal" class="ma-1">{{ g }}</VChip>
            </VCol>
          </VRow>

          <div class="d-flex justify-space-between mt-4">
            <VBtn variant="text" prepend-icon="mdi-arrow-right" @click="step = 1">رجوع</VBtn>
            <VBtn color="accent" append-icon="mdi-arrow-left" :disabled="eligibility.recommendation === 'reject'" @click="step = 3">تحديد الخدمات</VBtn>
          </div>
        </VCard>
      </template>

      <!-- Step 3 -->
      <template #item.3>
        <VCard flat class="pa-2">
          <div class="text-body-2 font-weight-bold mb-2">أنواع المقابلات التي ستُجريها</div>
          <div class="d-flex flex-wrap ga-2 mb-4">
            <VChip
              v-for="k in kinds"
              :key="k"
              :color="selectedKinds.includes(k) ? 'accent' : undefined"
              :variant="selectedKinds.includes(k) ? 'flat' : 'outlined'"
              @click="toggleKind(k)"
            >
              {{ KIND_META[k].label }}
            </VChip>
          </div>

          <div class="text-body-2 font-weight-bold mb-2">
            <VIcon icon="mdi-robot-happy-outline" color="secondary" size="18" /> أسعار مقترحة من الـ AI
          </div>
          <VCard v-for="p in pricing" :key="p.kind" variant="outlined" class="pa-3 mb-2">
            <div class="d-flex justify-space-between align-center mb-1">
              <span class="text-body-2 font-weight-bold">{{ KIND_META[p.kind].label }}</span>
              <VChip color="accent" size="small" label>{{ p.min }}–{{ p.max }} ﷼</VChip>
            </div>
            <div class="text-caption text-medium-emphasis">{{ p.note }}</div>
          </VCard>

          <div class="d-flex justify-space-between mt-4">
            <VBtn variant="text" prepend-icon="mdi-arrow-right" @click="step = 2">رجوع</VBtn>
            <VBtn color="success" prepend-icon="mdi-check-decagram" :disabled="!selectedKinds.length" @click="finish">تفعيل حسابي كمقيّم</VBtn>
          </div>
        </VCard>
      </template>
    </VStepper>

    <VSnackbar v-model="doneSnackbar" color="success" timeout="1500">
      تم تفعيل حسابك كمقيّم معتمد! جارٍ فتح لوحة المقيّم...
    </VSnackbar>
  </div>
</template>
