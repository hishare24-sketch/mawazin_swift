<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import LineChart from '@/components/charts/LineChart.vue'
import { type ReportDomain, type ReportOverview, type ReportResult, api } from '@/services/api'

const { t } = useI18n()

const overview = ref<ReportOverview | null>(null)
const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

async function loadOverview() {
  try { overview.value = await api.admin.reportsOverview() }
  catch (e) { fail(e) }
}

// ── قمع التوظيف ──
const STAGE_LABEL = computed<Record<string, string>>(() => ({
  opportunities: t('admin.reports.stageOpportunities'), applications: t('admin.reports.stageApplications'),
  interviews: t('admin.reports.stageInterviews'), completed: t('admin.reports.stageCompleted'),
}))
const STAGE_COLOR = ['primary', 'info', 'accent', 'success']
const funnel = computed(() => {
  const f = overview.value?.funnel ?? []
  const top = Math.max(1, f[0]?.value ?? 1)
  return f.map((s, i) => ({
    ...s, label: STAGE_LABEL.value[s.stage] ?? s.stage, pct: Math.round((s.value / top) * 100),
    conv: i > 0 && f[i - 1].value > 0 ? Math.round((s.value / f[i - 1].value) * 100) : null,
    color: STAGE_COLOR[i % STAGE_COLOR.length],
  }))
})
const growthData = computed(() => (overview.value?.growthSeries ?? []).map(s => ({ label: s.date.slice(5), value: s.value })))
const revenueData = computed(() => (overview.value?.revenueSeries ?? []).map(s => ({ label: s.date.slice(5), value: s.value })))

// ── باني التقرير ──
const DOMAINS = computed<{ value: ReportDomain, title: string }[]>(() => [
  { value: 'funnel', title: t('admin.reports.domFunnel') }, { value: 'growth', title: t('admin.reports.domGrowth') },
  { value: 'finance', title: t('admin.reports.domFinance') }, { value: 'engagement', title: t('admin.reports.domEngagement') },
  { value: 'quality', title: t('admin.reports.domQuality') },
])
function isoDaysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
const domain = ref<ReportDomain>('funnel')
const from = ref(isoDaysAgo(29))
const to = ref(isoDaysAgo(0))
const result = ref<ReportResult | null>(null)
const loadingReport = ref(false)
async function generate() {
  loadingReport.value = true
  try { result.value = await api.admin.report(domain.value, from.value, to.value) }
  catch (e) { fail(e) }
  finally { loadingReport.value = false }
}
const reportSeries = computed(() => (result.value?.series ?? []).map(s => ({ label: s.date.slice(5), value: s.value })))

function exportCsv() {
  if (!result.value)
    return
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const lines = [result.value.columns.map(esc).join(','), ...result.value.rows.map(r => r.map(esc).join(','))]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `report-${result.value.domain}-${from.value}_${to.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast(t('admin.reports.exported'))
}

onMounted(() => { loadOverview(); generate() })
</script>

<template>
  <div>
    <PageHeader :title="t('admin.reports.title')" :subtitle="t('admin.reports.subtitle')" icon="mdi-chart-box-outline" />

    <!-- شريط المؤشّرات العابرة -->
    <div v-if="overview" class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard icon="mdi-account-multiple-outline" :value="overview.kpis.users" :title="t('admin.reports.kpiUsers')" color="primary" :trend="overview.kpis.newUsers30d ? t('admin.reports.newIn30', { n: overview.kpis.newUsers30d }) : undefined" />
      <StatCard icon="mdi-briefcase-outline" :value="overview.kpis.opportunities" :title="t('admin.reports.kpiOpportunities')" color="info" />
      <StatCard icon="mdi-file-send-outline" :value="overview.kpis.applications" :title="t('admin.reports.kpiApplications')" color="accent" />
      <StatCard icon="mdi-account-voice" :value="overview.kpis.interviews" :title="t('admin.reports.kpiInterviews')" color="emerald" />
      <StatCard icon="mdi-star-outline" :value="overview.kpis.avgInterviewScore" :title="t('admin.reports.kpiAvgScore')" color="warning" />
      <StatCard icon="mdi-cash-multiple" :value="overview.kpis.revenue" :title="t('admin.reports.kpiRevenue')" color="success" />
      <StatCard icon="mdi-robot-happy-outline" :value="overview.kpis.assistantMessages" :title="t('admin.reports.kpiAssistant')" color="brand" />
      <StatCard icon="mdi-lifebuoy" :value="overview.kpis.openTickets" :title="t('admin.reports.kpiOpenTickets')" color="error" />
    </div>

    <!-- قمع التوظيف -->
    <BaseCard v-if="overview" class="mb-5">
      <div class="mb-3 flex items-center gap-2">
        <BaseIcon name="mdi-filter-variant" :size="20" class="text-brand" />
        <h2 class="font-bold text-content">{{ t('admin.reports.funnelTitle') }}</h2>
      </div>
      <div class="space-y-2.5">
        <div v-for="s in funnel" :key="s.stage">
          <div class="mb-1 flex items-center justify-between text-sm">
            <span class="font-medium text-content">{{ s.label }}</span>
            <span class="flex items-center gap-2">
              <BaseChip v-if="s.conv !== null" :color="s.conv >= 50 ? 'success' : (s.conv >= 20 ? 'warning' : 'error')">{{ s.conv }}%</BaseChip>
              <b class="text-content">{{ s.value }}</b>
            </span>
          </div>
          <div class="h-3 w-full overflow-hidden rounded-full" style="background: rgba(var(--v-theme-on-surface),0.06)">
            <div class="h-full rounded-full transition-all" :style="{ width: `${Math.max(3, s.pct)}%`, background: `rgb(var(--v-theme-${s.color}))` }" />
          </div>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-3 gap-3 border-t border-ui pt-3 text-center">
        <div><div class="text-lg font-bold text-content">{{ overview.conversion.applicationsPerOpportunity }}</div><div class="text-xs text-muted">{{ t('admin.reports.convAppsPerOpp') }}</div></div>
        <div><div class="text-lg font-bold text-content">{{ overview.conversion.interviewRate }}%</div><div class="text-xs text-muted">{{ t('admin.reports.convInterviewRate') }}</div></div>
        <div><div class="text-lg font-bold text-content">{{ overview.conversion.completionRate }}%</div><div class="text-xs text-muted">{{ t('admin.reports.convCompletionRate') }}</div></div>
      </div>
    </BaseCard>

    <!-- سلاسل النموّ والإيراد -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <BaseCard>
        <div class="mb-2 flex items-center gap-2"><BaseIcon name="mdi-trending-up" :size="18" class="text-brand" /><h2 class="text-sm font-bold text-content">{{ t('admin.reports.growth30') }}</h2></div>
        <LineChart v-if="growthData.length" :data="growthData" color="primary" :height="160" />
      </BaseCard>
      <BaseCard>
        <div class="mb-2 flex items-center gap-2"><BaseIcon name="mdi-cash-multiple" :size="18" class="text-brand" /><h2 class="text-sm font-bold text-content">{{ t('admin.reports.revenue30') }}</h2></div>
        <LineChart v-if="revenueData.length" :data="revenueData" color="success" :height="160" />
      </BaseCard>
    </div>

    <!-- باني التقرير -->
    <BaseCard>
      <div class="mb-3 flex items-center gap-2">
        <BaseIcon name="mdi-file-chart-outline" :size="20" class="text-brand" />
        <h2 class="font-bold text-content">{{ t('admin.reports.builderTitle') }}</h2>
      </div>
      <div class="flex flex-wrap items-end gap-3">
        <div class="w-44"><label class="mb-1 block text-xs text-muted">{{ t('admin.reports.domain') }}</label><BaseSelect v-model="domain" :items="DOMAINS" /></div>
        <div><label class="mb-1 block text-xs text-muted">{{ t('admin.reports.from') }}</label><BaseInput v-model="from" type="date" /></div>
        <div><label class="mb-1 block text-xs text-muted">{{ t('admin.reports.to') }}</label><BaseInput v-model="to" type="date" /></div>
        <BaseButton variant="brand" :disabled="loadingReport" @click="generate"><BaseIcon name="mdi-refresh" :size="18" />{{ t('admin.reports.generate') }}</BaseButton>
        <BaseButton v-if="result" variant="outline" @click="exportCsv"><BaseIcon name="mdi-download-outline" :size="18" />{{ t('admin.reports.exportCsv') }}</BaseButton>
      </div>

      <template v-if="result">
        <!-- ملخّص -->
        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div v-for="s in result.summary" :key="s.label" class="rounded-ui border-ui p-3 text-center">
            <div class="text-xl font-bold text-content">{{ s.value }}</div>
            <div class="text-xs text-muted">{{ s.label }}</div>
          </div>
        </div>

        <!-- رسم -->
        <div class="mt-4 grid grid-cols-1 gap-4" :class="{ 'lg:grid-cols-2': result.series && result.breakdown }">
          <div v-if="result.series?.length"><LineChart :data="reportSeries" color="brand" :height="200" /></div>
          <div v-if="result.breakdown?.length">
            <DonutChart v-if="result.breakdown.length <= 6" :data="result.breakdown" :size="180" />
            <BarChart v-else :data="result.breakdown" :height="200" />
          </div>
        </div>

        <!-- جدول -->
        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="border-b border-ui text-muted"><th v-for="c in result.columns" :key="c" class="p-2 text-start font-medium">{{ c }}</th></tr></thead>
            <tbody>
              <tr v-for="(row, i) in result.rows" :key="i" class="border-b border-ui">
                <td v-for="(cell, j) in row" :key="j" class="p-2 text-content" :class="{ 'text-muted': j === 0 }">{{ cell }}</td>
              </tr>
              <tr v-if="!result.rows.length"><td :colspan="result.columns.length" class="p-6 text-center text-muted">—</td></tr>
            </tbody>
          </table>
        </div>
      </template>
    </BaseCard>

    <BaseSnackbar v-model="snack.show" :color="snack.color">{{ snack.text }}</BaseSnackbar>
  </div>
</template>
