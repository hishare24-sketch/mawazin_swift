<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LEVEL_META, TYPE_META, useInterviewsStore } from '@/stores/InterviewsStore'
import TrustRadar from '@/components/shared/TrustRadar.vue'

const route = useRoute()
const router = useRouter()
const store = useInterviewsStore()

const interview = computed(() => store.getById(Number(route.params.id)))
const result = computed(() => interview.value?.result)

const levelColor = computed(() => {
  const s = result.value?.score ?? 0
  if (s >= 85)
    return 'success'
  if (s >= 70)
    return 'secondary'
  if (s >= 50)
    return 'warning'
  return 'error'
})
</script>

<template>
  <div v-if="interview && result" class="mx-auto" style="max-width: 860px">
    <VBtn variant="text" prepend-icon="mdi-arrow-right" class="mb-3" @click="router.push({ name: 'interviews' })">سجل المقابلات</VBtn>

    <!-- Score hero -->
    <VCard class="pa-6 mb-4 text-center">
      <VProgressCircular :model-value="result.score" :size="140" :width="12" :color="levelColor">
        <div class="text-h4 font-weight-bold">{{ result.score }}%</div>
      </VProgressCircular>
      <h1 class="text-h5 font-weight-bold mt-4">{{ TYPE_META[interview.type].label }}</h1>
      <VChip :color="levelColor" class="mt-2" label>المستوى المُحدّد: {{ result.level }}</VChip>
      <VAlert type="success" variant="tonal" density="compact" class="mt-3 text-caption d-inline-flex">
        <VIcon icon="mdi-shield-check-outline" size="16" /> تم تحديث نسبة الثقة في ملفك بناءً على هذه المقابلة
      </VAlert>
    </VCard>

    <VRow>
      <!-- Competency radar -->
      <VCol cols="12" md="6">
        <VCard class="pa-5 h-100">
          <div class="text-subtitle-1 font-weight-bold mb-2">تقييم الكفاءات</div>
          <div class="d-flex justify-center text-medium-emphasis">
            <TrustRadar :points="result.competencies.map(c => ({ label: c.name.split(' ')[0], value: c.score }))" :size="240" />
          </div>
        </VCard>
      </VCol>

      <!-- Video analysis or breakdown -->
      <VCol cols="12" md="6">
        <VCard v-if="result.video" class="pa-5 mb-4">
          <div class="d-flex align-center ga-2 mb-3">
            <VIcon icon="mdi-video-account" color="secondary" />
            <span class="text-subtitle-1 font-weight-bold">تحليل الفيديو (AI)</span>
          </div>
          <div v-for="item in [{ l: 'لغة الجسد', v: result.video.bodyLanguage }, { l: 'نبرة الصوت', v: result.video.tone }, { l: 'الثقة بالنفس', v: result.video.confidence }, { l: 'وتيرة الكلام', v: result.video.pace }, { l: 'التواصل البصري', v: result.video.eyeContact }]" :key="item.l" class="mb-2">
            <div class="d-flex justify-space-between text-body-2 mb-1"><span>{{ item.l }}</span><span class="font-weight-bold">{{ item.v }}%</span></div>
            <VProgressLinear :model-value="item.v" color="secondary" height="6" rounded />
          </div>
          <p class="text-caption text-medium-emphasis mt-2 mb-2">{{ result.video.note }}</p>
          <VDivider class="mb-2" />
          <div class="text-caption font-weight-bold mb-1">تلميحات لتحسين الأداء</div>
          <VList density="compact" class="py-0">
            <VListItem v-for="tip in result.video.tips" :key="tip" class="px-0" min-height="28">
              <template #prepend><VIcon icon="mdi-lightbulb-on-outline" color="accent" size="16" /></template>
              <VListItemTitle class="text-caption" style="white-space: normal">{{ tip }}</VListItemTitle>
            </VListItem>
          </VList>
        </VCard>

        <VCard class="pa-5">
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon icon="mdi-thumb-up-outline" color="success" />
            <span class="text-subtitle-2 font-weight-bold">نقاط القوة</span>
          </div>
          <VChip v-for="s in result.strengths" :key="s" size="small" color="success" variant="tonal" class="ma-1">{{ s }}</VChip>

          <div class="d-flex align-center ga-2 mb-2 mt-3">
            <VIcon icon="mdi-arrow-up-circle-outline" color="warning" />
            <span class="text-subtitle-2 font-weight-bold">نقاط التحسين</span>
          </div>
          <VChip v-for="w in result.improvements" :key="w" size="small" color="warning" variant="tonal" class="ma-1">{{ w }}</VChip>
        </VCard>
      </VCol>

      <VCol cols="12">
        <VCard class="pa-5">
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon icon="mdi-robot-happy-outline" color="secondary" />
            <span class="text-subtitle-1 font-weight-bold">توصيات الذكاء الاصطناعي</span>
          </div>
          <VList density="compact" class="py-0">
            <VListItem v-for="r in result.recommendations" :key="r" class="px-0">
              <template #prepend><VIcon icon="mdi-lightbulb-on-outline" color="accent" size="18" /></template>
              <VListItemTitle class="text-body-2">{{ r }}</VListItemTitle>
            </VListItem>
          </VList>
        </VCard>
      </VCol>
    </VRow>

    <div class="d-flex flex-wrap justify-center ga-3 mt-5">
      <VBtn variant="outlined" color="primary" prepend-icon="mdi-account-tie-voice-outline" :to="{ name: 'interviews' }">مقابلة أخرى</VBtn>
      <VBtn color="accent" prepend-icon="mdi-shield-check-outline" :to="{ name: 'profile' }">عرض نسبة الثقة</VBtn>
    </div>
  </div>

  <VCard v-else class="pa-12 text-center">
    <VIcon icon="mdi-alert-circle-outline" size="64" color="error" />
    <div class="text-h6 mt-3">النتيجة غير متاحة</div>
    <VBtn color="primary" class="mt-3" :to="{ name: 'interviews' }">العودة للمقابلات</VBtn>
  </VCard>
</template>
