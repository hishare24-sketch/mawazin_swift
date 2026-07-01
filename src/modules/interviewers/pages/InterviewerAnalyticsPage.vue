<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import { KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import type { MarketInterviewKind } from '@/stores/InterviewersStore'

const store = useInterviewersStore()

// Monthly earnings trend (mock 6-month series, last month reflects live agenda)
const liveEarnings = computed(() => store.interviewerStats.earnings)
const months = ['فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو']
const earningsSeries = computed(() => [420, 610, 540, 780, 690, Math.max(360, liveEarnings.value)])
const maxEarning = computed(() => Math.max(...earningsSeries.value))
const totalEarnings = computed(() => earningsSeries.value.reduce((s, v) => s + v, 0))

// Sessions by interview kind (from completed agenda)
const kindBreakdown = computed(() => {
  const kinds = Object.keys(KIND_META) as MarketInterviewKind[]
  const counts = kinds.map(k => ({
    kind: k,
    label: KIND_META[k].label,
    count: store.agendaCompleted.filter(a => a.kind === k).length,
  })).filter(x => x.count > 0)
  const seed = [{ kind: 'skills' as MarketInterviewKind, label: KIND_META.skills.label, count: 3 }, { kind: 'behavioral' as MarketInterviewKind, label: KIND_META.behavioral.label, count: 2 }, { kind: 'level' as MarketInterviewKind, label: KIND_META.level.label, count: 2 }]
  const merged = counts.length ? counts : seed
  const total = merged.reduce((s, x) => s + x.count, 0)
  return merged.map(x => ({ ...x, pct: Math.round((x.count / total) * 100) }))
})

// Rating distribution (mock, weighted to high)
const ratingDist = [
  { stars: 5, count: 74 },
  { stars: 4, count: 38 },
  { stars: 3, count: 11 },
  { stars: 2, count: 3 },
  { stars: 1, count: 2 },
]
const totalRatings = ratingDist.reduce((s, r) => s + r.count, 0)

const topStats = computed(() => [
  { title: 'إجمالي الأرباح (6 أشهر)', value: `${totalEarnings.value.toLocaleString('en-US')} ﷼`, icon: 'mdi-cash-multiple', color: 'success' },
  { title: 'متوسط قيمة المقابلة', value: `${Math.round(totalEarnings.value / 30)} ﷼`, icon: 'mdi-chart-line', color: 'primary' },
  { title: 'متوسط التقييم', value: '4.8 ★', icon: 'mdi-star', color: 'warning' },
  { title: 'نسبة القبول', value: '92%', icon: 'mdi-thumb-up-outline', color: 'secondary' },
])

const insight = computed(() => {
  const best = [...kindBreakdown.value].sort((a, b) => b.count - a.count)[0]
  return `«${best.label}» هو أكثر أنواع مقابلاتك طلبًا (${best.pct}%). أرباحك في تصاعد — رفع سعر هذا النوع 10% لن يؤثر على الطلب غالبًا نظرًا لتقييمك المرتفع.`
})
</script>

<template>
  <div>
    <PageHeader
      title="تحليلات المقيّم"
      subtitle="أداؤك وأرباحك وتقييماتك عبر الزمن"
      icon="mdi-chart-box-outline"
    />

    <VRow class="mb-2">
      <VCol v-for="s in topStats" :key="s.title" cols="12" sm="6" lg="3">
        <StatCard v-bind="s" />
      </VCol>
    </VRow>

    <!-- AI insight -->
    <VAlert color="secondary" variant="tonal" class="mb-4" border="start">
      <template #prepend><VIcon icon="mdi-robot-happy-outline" /></template>
      <span class="text-body-2">{{ insight }}</span>
    </VAlert>

    <VRow>
      <!-- Earnings trend -->
      <VCol cols="12" lg="7">
        <VCard class="pa-5">
          <div class="text-subtitle-1 font-weight-bold mb-4">الأرباح الشهرية</div>
          <div class="d-flex align-end justify-space-between ga-2" style="height: 200px">
            <div v-for="(v, i) in earningsSeries" :key="i" class="d-flex flex-column align-center flex-grow-1">
              <div class="text-caption font-weight-bold mb-1">{{ v }}</div>
              <div
                class="rounded-t bar-lime w-100"
                :style="{ height: `${(v / maxEarning) * 150}px`, minHeight: '8px', transition: 'height .4s ease' }"
              />
              <div class="text-caption text-medium-emphasis mt-1">{{ months[i] }}</div>
            </div>
          </div>
        </VCard>
      </VCol>

      <!-- Rating distribution -->
      <VCol cols="12" lg="5">
        <VCard class="pa-5 h-100">
          <div class="text-subtitle-1 font-weight-bold mb-4">توزيع التقييمات ({{ totalRatings }})</div>
          <div v-for="r in ratingDist" :key="r.stars" class="d-flex align-center ga-2 mb-2">
            <span class="text-caption d-flex align-center" style="width: 34px">
              {{ r.stars }} <VIcon icon="mdi-star" color="warning" size="13" />
            </span>
            <VProgressLinear :model-value="(r.count / totalRatings) * 100" color="warning" height="10" rounded class="flex-grow-1" />
            <span class="text-caption text-medium-emphasis" style="width: 30px">{{ r.count }}</span>
          </div>
        </VCard>
      </VCol>

      <!-- Kind breakdown -->
      <VCol cols="12">
        <VCard class="pa-5">
          <div class="text-subtitle-1 font-weight-bold mb-4">المقابلات حسب النوع</div>
          <VRow>
            <VCol v-for="k in kindBreakdown" :key="k.kind" cols="12" sm="6" md="4">
              <div class="d-flex justify-space-between text-body-2 mb-1">
                <span>{{ k.label }}</span>
                <span class="font-weight-bold">{{ k.count }} ({{ k.pct }}%)</span>
              </div>
              <VProgressLinear :model-value="k.pct" color="primary" height="8" rounded />
            </VCol>
          </VRow>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
