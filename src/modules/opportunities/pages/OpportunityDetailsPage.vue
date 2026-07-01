<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EMPLOYMENT_TYPE_LABELS } from '../interfaces/Opportunity'
import { getOpportunityById, mockOpportunities } from '../services/mockOpportunities'

const route = useRoute()
const router = useRouter()

const opportunity = computed(() => getOpportunityById(Number(route.params.id)))
const similar = computed(() => mockOpportunities.filter(o => o.id !== Number(route.params.id)).slice(0, 3))

const applied = ref(false)
const applyDialog = ref(false)
const selectedResume = ref<number | null>(1)

// User's resumes to choose from when applying
const resumes = [
  { id: 1, name: 'سيرة تقنية - حديث', template: 'حديث', lang: 'عربي' },
  { id: 2, name: 'Technical CV - Modern', template: 'Modern', lang: 'English' },
]

// Match breakdown (mock detailed analysis)
const matchBreakdown = [
  { label: 'المهارات', value: 88 },
  { label: 'الخبرات', value: 75 },
  { label: 'التعليم', value: 90 },
  { label: 'الموقع', value: 100 },
]

function openApply() {
  applyDialog.value = true
}

function confirmApply() {
  applied.value = true
  applyDialog.value = false
}

function askAboutOpportunity() {
  router.push({ name: 'messages' })
}
</script>

<template>
  <div v-if="opportunity">
    <VBtn variant="text" prepend-icon="mdi-arrow-right" class="mb-3" @click="router.back()">
      رجوع
    </VBtn>

    <VRow>
      <!-- Main -->
      <VCol cols="12" md="8">
        <VCard class="pa-5 mb-4">
          <div class="d-flex align-start ga-4 mb-4">
            <VAvatar color="primary" variant="tonal" rounded="lg" size="64">
              <VIcon icon="mdi-domain" size="34" />
            </VAvatar>
            <div class="flex-grow-1">
              <div class="d-flex align-center ga-2 flex-wrap">
                <h1 class="text-h5 font-weight-bold">
                  {{ opportunity.title }}
                </h1>
                <VChip v-if="opportunity.isFeatured" color="accent" size="small" label>
                  مميزة
                </VChip>
              </div>
              <div class="text-body-1 text-medium-emphasis">
                {{ opportunity.company }}
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap ga-2 mb-4">
            <VChip variant="tonal" prepend-icon="mdi-map-marker-outline">
              {{ opportunity.location }}
            </VChip>
            <VChip variant="tonal" prepend-icon="mdi-briefcase-outline">
              {{ EMPLOYMENT_TYPE_LABELS[opportunity.type] }}
            </VChip>
            <VChip variant="tonal" prepend-icon="mdi-cash">
              {{ opportunity.salaryRange }}
            </VChip>
            <VChip variant="tonal" prepend-icon="mdi-account-multiple-outline">
              {{ opportunity.applicants }} متقدم
            </VChip>
          </div>

          <VDivider class="mb-4" />

          <h3 class="text-subtitle-1 font-weight-bold mb-2">
            وصف الفرصة
          </h3>
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ opportunity.description }}
          </p>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">
            المهارات المطلوبة
          </h3>
          <div class="d-flex flex-wrap ga-2">
            <VChip v-for="skill in opportunity.skills" :key="skill" color="secondary" variant="tonal" size="small">
              {{ skill }}
            </VChip>
          </div>
        </VCard>

        <!-- Similar -->
        <h3 class="text-h6 font-weight-bold mb-3">
          فرص مشابهة
        </h3>
        <VRow>
          <VCol v-for="opp in similar" :key="opp.id" cols="12" sm="4">
            <VCard class="pa-3 cursor-pointer" @click="router.push({ name: 'opportunity-details', params: { id: opp.id } })">
              <div class="text-subtitle-2 font-weight-bold text-truncate">
                {{ opp.title }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ opp.company }}
              </div>
              <VChip color="success" size="x-small" label class="mt-2">
                {{ opp.matchRate }}% تطابق
              </VChip>
            </VCard>
          </VCol>
        </VRow>
      </VCol>

      <!-- Sidebar -->
      <VCol cols="12" md="4">
        <!-- Apply card -->
        <VCard class="pa-5 mb-4">
          <div class="text-center mb-3">
            <VProgressCircular
              :model-value="opportunity.matchRate"
              :size="110"
              :width="10"
              color="success"
            >
              <span class="text-h5 font-weight-bold">{{ opportunity.matchRate }}%</span>
            </VProgressCircular>
            <div class="text-body-2 text-medium-emphasis mt-2">
              نسبة تطابقك مع الفرصة
            </div>
          </div>

          <VBtn
            color="accent"
            size="large"
            block
            :disabled="applied"
            :prepend-icon="applied ? 'mdi-check' : 'mdi-send'"
            @click="openApply"
          >
            {{ applied ? 'تم التقديم' : 'تقدّم الآن' }}
          </VBtn>
          <VBtn variant="outlined" color="primary" block class="mt-2" prepend-icon="mdi-message-outline" @click="askAboutOpportunity">
            سؤال عن الفرصة
          </VBtn>
        </VCard>

        <!-- Match breakdown -->
        <VCard class="pa-5">
          <div class="text-subtitle-1 font-weight-bold mb-3">
            تحليل التطابق
          </div>
          <div v-for="item in matchBreakdown" :key="item.label" class="mb-3">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>{{ item.label }}</span>
              <span class="font-weight-bold">{{ item.value }}%</span>
            </div>
            <VProgressLinear :model-value="item.value" color="primary" height="6" rounded />
          </div>
          <VAlert type="info" variant="tonal" density="compact" class="mt-2 text-caption">
            لتحسين تطابقك: أضف شهادة في {{ opportunity.skills?.[0] }} وأكمل اختبار المهارات ذي الصلة.
          </VAlert>
        </VCard>
      </VCol>
    </VRow>

    <!-- Apply with resume dialog -->
    <VDialog v-model="applyDialog" max-width="520">
      <VCard class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>التقديم بسيرة ذاتية</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="applyDialog = false" />
        </VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-3">اختر السيرة الذاتية التي تريد التقديم بها:</p>
          <VCard
            v-for="r in resumes"
            :key="r.id"
            :variant="selectedResume === r.id ? 'flat' : 'outlined'"
            :color="selectedResume === r.id ? 'primary' : undefined"
            class="pa-3 mb-2 cursor-pointer d-flex align-center ga-3"
            @click="selectedResume = r.id"
          >
            <VIcon :icon="selectedResume === r.id ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'" :color="selectedResume === r.id ? 'white' : undefined" />
            <div>
              <div class="text-body-2 font-weight-bold" :class="selectedResume === r.id ? 'text-white' : ''">{{ r.name }}</div>
              <div class="text-caption" :class="selectedResume === r.id ? 'text-white' : 'text-medium-emphasis'">{{ r.template }} · {{ r.lang }}</div>
            </div>
          </VCard>
          <VBtn variant="tonal" color="secondary" block class="mt-2" prepend-icon="mdi-plus" :to="{ name: 'resume-builder' }">
            إنشاء سيرة جديدة لهذه الفرصة
          </VBtn>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="applyDialog = false">إلغاء</VBtn>
          <VBtn color="accent" prepend-icon="mdi-send" @click="confirmApply">تأكيد التقديم</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-alert-circle-outline" size="64" color="error" />
    <div class="text-h6 mt-3">
      الفرصة غير موجودة
    </div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'opportunities' }">
      العودة للفرص
    </VBtn>
  </VCard>
</template>
