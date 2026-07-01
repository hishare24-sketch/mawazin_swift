<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'

const router = useRouter()

const overview = [
  { title: 'المستجيبون', value: 47, icon: 'mdi-account-check-outline', color: 'primary' },
  { title: 'معدل الإكمال', value: '82%', icon: 'mdi-progress-check', color: 'success' },
  { title: 'متوسط الوقت', value: '3:12', icon: 'mdi-clock-outline', color: 'secondary' },
  { title: 'صافي الرضا', value: '+64', icon: 'mdi-emoticon-happy-outline', color: 'accent' },
]

const questions = [
  {
    text: 'كيف تقيّم سرعة الرد على طلبك؟',
    distribution: [
      { label: '5 - ممتاز', value: 45 },
      { label: '4 - جيد', value: 30 },
      { label: '3 - متوسط', value: 15 },
      { label: '2 - ضعيف', value: 7 },
      { label: '1 - سيئ', value: 3 },
    ],
  },
  {
    text: 'هل كانت عملية التوظيف واضحة؟',
    distribution: [
      { label: 'واضحة تماماً', value: 58 },
      { label: 'واضحة نوعاً ما', value: 32 },
      { label: 'غير واضحة', value: 10 },
    ],
  },
]
</script>

<template>
  <div>
    <VBtn variant="text" prepend-icon="mdi-arrow-right" class="mb-3" @click="router.back()">رجوع للاستبيانات</VBtn>
    <PageHeader
      title="تحليل: استبيان رضا المرشحين"
      subtitle="نتائج ورؤى ذكية من إجابات المستجيبين"
      icon="mdi-chart-box-outline"
    >
      <template #actions>
        <VBtn color="primary" variant="outlined" prepend-icon="mdi-download">تصدير التقرير</VBtn>
      </template>
    </PageHeader>

    <VRow class="mb-2">
      <VCol v-for="o in overview" :key="o.title" cols="6" md="3">
        <StatCard v-bind="o" />
      </VCol>
    </VRow>

    <VCard v-for="(q, i) in questions" :key="i" class="pa-5 mb-4">
      <div class="text-subtitle-1 font-weight-bold mb-4">{{ i + 1 }}. {{ q.text }}</div>
      <div v-for="d in q.distribution" :key="d.label" class="d-flex align-center ga-3 mb-2">
        <div class="text-body-2" style="width: 130px">{{ d.label }}</div>
        <VProgressLinear :model-value="d.value" color="primary" height="20" rounded class="flex-grow-1">
          <span class="text-caption text-white font-weight-bold">{{ d.value }}%</span>
        </VProgressLinear>
      </div>
    </VCard>

    <VCard class="pa-5">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon icon="mdi-robot-happy-outline" color="secondary" />
        <span class="text-subtitle-1 font-weight-bold">توصيات الذكاء الاصطناعي</span>
      </div>
      <VAlert type="info" variant="tonal" class="mb-2">
        يُلاحظ أن 10% من المرشحين يرون عملية التوظيف غير واضحة — يُنصح بإضافة دليل مرئي لمراحل التوظيف.
      </VAlert>
      <VAlert type="success" variant="tonal">
        رضا عالٍ عن سرعة الرد (75% قيّموها 4 فأعلى) — حافظ على هذا المستوى.
      </VAlert>
    </VCard>
  </div>
</template>
