<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CANDIDATE_STATUS_META } from '../interfaces/Candidate'
import { useCandidatesStore } from '@/stores/CandidatesStore'

const route = useRoute()
const router = useRouter()
const store = useCandidatesStore()
const candidate = computed(() => store.getById(Number(route.params.id)))
const snackbar = ref('')

// Request interview dialog
const requestInterviewDialog = ref(false)
const requestLevel = ref('متوسط')
const interviewLevels = ['أساسي', 'متوسط', 'متقدم', 'خبير']
const levelCosts: Record<string, string> = { 'أساسي': 'مجاني', 'متوسط': '49 ريال', 'متقدم': '149 ريال', 'خبير': '299 ريال' }
function sendInterviewRequest() {
  requestInterviewDialog.value = false
  snackbar.value = `تم إرسال طلب مقابلة (${requestLevel.value}) للمرشح`
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

    <!-- Request interview dialog -->
    <VDialog v-model="requestInterviewDialog" max-width="440">
      <VCard class="pa-2">
        <VCardTitle>طلب مقابلة — {{ candidate.name }}</VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-2">اختر مستوى المقابلة المطلوب:</p>
          <VCard
            v-for="lvl in interviewLevels"
            :key="lvl"
            :variant="requestLevel === lvl ? 'flat' : 'outlined'"
            :color="requestLevel === lvl ? 'primary' : undefined"
            class="pa-3 mb-2 cursor-pointer d-flex align-center justify-space-between"
            @click="requestLevel = lvl"
          >
            <span :class="requestLevel === lvl ? 'text-white' : ''">{{ lvl }}</span>
            <VChip size="x-small" :color="requestLevel === lvl ? 'white' : 'accent'" :variant="requestLevel === lvl ? 'flat' : 'tonal'" label>{{ levelCosts[lvl] }}</VChip>
          </VCard>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="requestInterviewDialog = false">إلغاء</VBtn>
          <VBtn color="accent" prepend-icon="mdi-send" @click="sendInterviewRequest">إرسال الطلب</VBtn>
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
