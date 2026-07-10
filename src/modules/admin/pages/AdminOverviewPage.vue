<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import LineChart from '@/components/charts/LineChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import { type AdminStats, api } from '@/services/api'
import { useRoleRequestsStore } from '@/stores/RoleRequestsStore'
import { useReviewQueueStore } from '@/stores/ReviewQueueStore'

const { t } = useI18n()
const stats = ref<AdminStats | null>(null)
const loading = ref(true)
const roleReq = useRoleRequestsStore()
const review = useReviewQueueStore()

onMounted(async () => {
  try {
    stats.value = await api.admin.stats()
  }
  finally {
    loading.value = false
  }
})

const kpis = computed(() => {
  const tt = stats.value?.totals
  return [
    { icon: 'mdi-account-multiple', value: tt?.users ?? 0, title: t('admin.overview.kpiUsers'), color: 'primary' },
    { icon: 'mdi-account-cancel-outline', value: tt?.suspended ?? 0, title: t('admin.overview.kpiSuspended'), color: 'error' },
    { icon: 'mdi-briefcase-outline', value: tt?.opportunities ?? 0, title: t('admin.overview.kpiOpportunities'), color: 'accent' },
    { icon: 'mdi-file-document-outline', value: tt?.requests ?? 0, title: t('admin.overview.kpiRequests'), color: 'info' },
    { icon: 'mdi-account-tie-voice-outline', value: tt?.interviews ?? 0, title: t('admin.overview.kpiInterviews'), color: 'warning' },
    { icon: 'mdi-clipboard-text-outline', value: tt?.surveys ?? 0, title: t('admin.overview.kpiSurveys'), color: 'success' },
  ]
})

const signupData = computed(() => (stats.value?.signups ?? []).map(s => ({ label: s.date.slice(5), value: s.count })))
const roleData = computed(() => Object.entries(stats.value?.usersByRole ?? {}).map(([label, value]) => ({ label, value })))
const tierData = computed(() => Object.entries(stats.value?.usersByTier ?? {}).map(([label, value]) => ({ label, value })))

const pendingRoles = computed(() => roleReq.pending.length)
</script>

<template>
  <div>
    <PageHeader :title="t('admin.overview.title')" :subtitle="t('admin.overview.subtitle')" icon="mdi-view-dashboard-outline" />

    <!-- KPIs -->
    <div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatCard v-for="k in kpis" :key="k.title" :icon="k.icon" :value="k.value" :title="k.title" :color="k.color" />
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- التسجيلات -->
      <BaseCard class="lg:col-span-2">
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-line" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.overview.signups') }}</h2>
        </div>
        <LineChart v-if="signupData.length" :data="signupData" color="primary" :height="220" />
      </BaseCard>

      <!-- التوزيع حسب الدور -->
      <BaseCard>
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.overview.byRole') }}</h2>
        </div>
        <DonutChart v-if="roleData.length" :data="roleData" :size="170" :center-label="t('admin.overview.kpiUsers')" />
      </BaseCard>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- التوزيع حسب الباقة -->
      <BaseCard class="lg:col-span-2">
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-bar" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.overview.byTier') }}</h2>
        </div>
        <BarChart v-if="tierData.length" :data="tierData" color="secondary" :height="200" />
      </BaseCard>

      <!-- إجراءات معلّقة -->
      <BaseCard>
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-bell-alert-outline" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.overview.pending') }}</h2>
        </div>
        <div class="space-y-2">
          <RouterLink to="/hub" class="pending-row">
            <span class="grid h-9 w-9 place-items-center rounded-ui bg-warning/15 text-warning"><BaseIcon name="mdi-account-check-outline" :size="19" /></span>
            <span class="flex-1 text-sm text-content">{{ t('admin.overview.roleRequests') }}</span>
            <span class="pending-badge">{{ pendingRoles }}</span>
          </RouterLink>
          <RouterLink to="/governance" class="pending-row">
            <span class="grid h-9 w-9 place-items-center rounded-ui bg-info/15 text-info"><BaseIcon name="mdi-shield-search" :size="19" /></span>
            <span class="flex-1 text-sm text-content">{{ t('admin.overview.reviewQueue') }}</span>
            <span class="pending-badge">{{ review.pendingCount }}</span>
          </RouterLink>
          <p v-if="!pendingRoles && !review.pendingCount" class="pt-2 text-center text-xs text-muted">
            {{ t('admin.overview.noPending') }}
          </p>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<style scoped>
.pending-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  transition: background-color 0.15s ease;
}
.pending-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.pending-badge {
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
</style>
