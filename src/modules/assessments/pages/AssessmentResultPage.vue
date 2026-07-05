<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAssessmentById } from '../services/mockAssessments'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseProgressRing from '@/components/ui/BaseProgressRing.vue'

const route = useRoute()
const router = useRouter()

const assessment = computed(() => getAssessmentById(Number(route.params.id)))
const score = computed(() => Number(route.query.score ?? 0))
const hasResult = computed(() => route.query.score !== undefined)
const correct = computed(() => (route.query.correct !== undefined ? Number(route.query.correct) : null))
const total = computed(() => (route.query.total !== undefined ? Number(route.query.total) : null))
const displayName = computed(() => assessment.value?.name ?? String(route.query.name ?? 'الاختبار'))
const canRetake = computed(() => !!assessment.value)

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c?: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral', 'surface-variant': 'neutral', grey: 'neutral', orange: 'warning', amber: 'warning' } as Record<string, BaseColor>)[c ?? ''] ?? c ?? 'brand') as BaseColor
}

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

const toastMsg = ref('')
function shareResult() {
  const text = `حصلت على ${score.value}% (${level.value.label}) في اختبار «${displayName.value}» على منظومة التوظيف الذكية.`
  navigator.clipboard?.writeText(text)
  toastMsg.value = 'تم نسخ نتيجتك — جاهزة للمشاركة كإثبات مهارة.'
}
</script>

<template>
  <div v-if="hasResult" class="mx-auto" style="max-width: 820px">
    <!-- Score hero -->
    <BaseCard class="mb-4 py-6 text-center">
      <BaseProgressRing :value="score" :size="140" :width="12" :color="level.color" class="mx-auto">
        <div class="text-3xl font-bold text-content">{{ score }}%</div>
      </BaseProgressRing>
      <h1 class="mt-4 text-xl font-bold text-content">{{ displayName }}</h1>
      <div class="mt-2">
        <BaseChip :color="mapColor(level.color)">المستوى: {{ level.label }}</BaseChip>
      </div>
      <div v-if="correct !== null" class="mt-3 text-base font-medium text-content">
        أجبت بشكل صحيح على {{ correct }} من {{ total }} أسئلة
      </div>
      <div class="mt-1 text-sm text-muted">
        نتيجتك أعلى من 68% من المستخدمين الآخرين في هذا الاختبار
      </div>
    </BaseCard>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <BaseCard class="h-full">
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-thumb-up-outline" :size="22" :style="{ color: 'rgb(var(--v-theme-success))' }" />
          <span class="text-base font-bold text-content">نقاط القوة</span>
        </div>
        <div class="flex flex-col gap-2">
          <div v-for="s in strengths" :key="s" class="flex items-center gap-2 text-sm text-content">
            <BaseIcon name="mdi-check-circle-outline" :size="18" :style="{ color: 'rgb(var(--v-theme-success))' }" />{{ s }}
          </div>
        </div>
      </BaseCard>
      <BaseCard class="h-full">
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-alert-outline" :size="22" :style="{ color: 'rgb(var(--v-theme-warning))' }" />
          <span class="text-base font-bold text-content">نقاط التحسين</span>
        </div>
        <div class="flex flex-col gap-2">
          <div v-for="w in weaknesses" :key="w" class="flex items-center gap-2 text-sm text-content">
            <BaseIcon name="mdi-arrow-up-circle-outline" :size="18" :style="{ color: 'rgb(var(--v-theme-warning))' }" />{{ w }}
          </div>
        </div>
      </BaseCard>

      <BaseCard class="md:col-span-2">
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-robot-happy-outline" :size="22" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
          <span class="text-base font-bold text-content">توصيات الذكاء الاصطناعي للتطوير</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <BaseChip v-for="r in recommendations" :key="r" color="emerald"><BaseIcon name="mdi-school-outline" :size="12" />{{ r }}</BaseChip>
        </div>
      </BaseCard>
    </div>

    <div class="mt-5 flex flex-wrap justify-center gap-3">
      <BaseButton v-if="canRetake" variant="outline" @click="router.replace({ name: 'assessment-take', params: { id: assessment!.id } })">
        <BaseIcon name="mdi-refresh" :size="16" />إعادة الاختبار
      </BaseButton>
      <BaseButton variant="tonal-emerald" @click="shareResult">
        <BaseIcon name="mdi-share-variant-outline" :size="16" />مشاركة النتيجة
      </BaseButton>
      <BaseButton variant="accent" :to="{ name: 'assessments' }">
        <BaseIcon name="mdi-view-dashboard-outline" :size="16" />العودة لمركز التقييم
      </BaseButton>
    </div>

    <BaseSnackbar :model-value="!!toastMsg" color="primary" :timeout="3500" @update:model-value="toastMsg = ''">
      {{ toastMsg }}
    </BaseSnackbar>
  </div>

  <BaseCard v-else class="py-12 text-center">
    <BaseIcon name="mdi-alert-circle-outline" :size="64" :style="{ color: 'rgb(var(--v-theme-error))' }" />
    <div class="mt-3 text-lg font-bold text-content">النتيجة غير متاحة</div>
    <BaseButton variant="brand" class="mt-3" :to="{ name: 'assessments' }">العودة لمركز التقييم</BaseButton>
  </BaseCard>
</template>
