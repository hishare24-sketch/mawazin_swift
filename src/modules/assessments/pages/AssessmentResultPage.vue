<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAssessmentById } from '../services/mockAssessments'

const route = useRoute()
const router = useRouter()

const assessment = computed(() => getAssessmentById(Number(route.params.id)))
const score = computed(() => Number(route.query.score ?? 0))
const hasResult = computed(() => route.query.score !== undefined)
const displayName = computed(() => assessment.value?.name ?? String(route.query.name ?? 'الاختبار'))
const canRetake = computed(() => !!assessment.value)

const level = computed(() => {
  if (score.value >= 85)
    return { label: 'متقدم', color: 'success' }
  if (score.value >= 60)
    return { label: 'متوسط', color: 'secondary' }
  return { label: 'مبتدئ', color: 'warning' }
})

const strengths = ['فهم جيد للمفاهيم الأساسية', 'سرعة في الإجابة', 'دقة في الأسئلة المنطقية']
const weaknesses = ['المفاهيم المتقدمة تحتاج مراجعة', 'أسئلة الأداء (Performance)']
const recommendations = ['أكمل دورة "JavaScript المتقدم"', 'تدرّب على مسائل معالجة المصفوفات', 'راجع مفاهيم Async/Await']
</script>

<template>
  <div v-if="hasResult" class="mx-auto" style="max-width: 820px">
    <!-- Score hero -->
    <VCard class="pa-6 mb-4 text-center">
      <VProgressCircular :model-value="score" :size="140" :width="12" :color="level.color">
        <div>
          <div class="text-h4 font-weight-bold">{{ score }}%</div>
        </div>
      </VProgressCircular>
      <h1 class="text-h5 font-weight-bold mt-4">{{ displayName }}</h1>
      <VChip :color="level.color" class="mt-2" label>المستوى: {{ level.label }}</VChip>
      <div class="text-body-2 text-medium-emphasis mt-3">
        نتيجتك أعلى من 68% من المستخدمين الآخرين في هذا الاختبار
      </div>
    </VCard>

    <VRow>
      <VCol cols="12" md="6">
        <VCard class="pa-5" height="100%">
          <div class="d-flex align-center ga-2 mb-3">
            <VIcon icon="mdi-thumb-up-outline" color="success" />
            <span class="text-subtitle-1 font-weight-bold">نقاط القوة</span>
          </div>
          <VList density="compact" class="py-0">
            <VListItem v-for="s in strengths" :key="s" class="px-0">
              <template #prepend><VIcon icon="mdi-check-circle-outline" color="success" size="18" /></template>
              <VListItemTitle class="text-body-2">{{ s }}</VListItemTitle>
            </VListItem>
          </VList>
        </VCard>
      </VCol>
      <VCol cols="12" md="6">
        <VCard class="pa-5" height="100%">
          <div class="d-flex align-center ga-2 mb-3">
            <VIcon icon="mdi-alert-outline" color="warning" />
            <span class="text-subtitle-1 font-weight-bold">نقاط التحسين</span>
          </div>
          <VList density="compact" class="py-0">
            <VListItem v-for="w in weaknesses" :key="w" class="px-0">
              <template #prepend><VIcon icon="mdi-arrow-up-circle-outline" color="warning" size="18" /></template>
              <VListItemTitle class="text-body-2">{{ w }}</VListItemTitle>
            </VListItem>
          </VList>
        </VCard>
      </VCol>

      <VCol cols="12">
        <VCard class="pa-5">
          <div class="d-flex align-center ga-2 mb-3">
            <VIcon icon="mdi-robot-happy-outline" color="secondary" />
            <span class="text-subtitle-1 font-weight-bold">توصيات الذكاء الاصطناعي للتطوير</span>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <VChip v-for="r in recommendations" :key="r" color="secondary" variant="tonal" prepend-icon="mdi-school-outline">
              {{ r }}
            </VChip>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <div class="d-flex flex-wrap justify-center ga-3 mt-5">
      <VBtn v-if="canRetake" variant="outlined" color="primary" prepend-icon="mdi-refresh" @click="router.replace({ name: 'assessment-take', params: { id: assessment!.id } })">
        إعادة الاختبار
      </VBtn>
      <VBtn variant="tonal" color="secondary" prepend-icon="mdi-share-variant-outline">
        مشاركة النتيجة
      </VBtn>
      <VBtn color="accent" prepend-icon="mdi-view-dashboard-outline" :to="{ name: 'assessments' }">
        العودة لمركز التقييم
      </VBtn>
    </div>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-alert-circle-outline" size="64" color="error" />
    <div class="text-h6 mt-3">النتيجة غير متاحة</div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'assessments' }">العودة لمركز التقييم</VBtn>
  </VCard>
</template>
