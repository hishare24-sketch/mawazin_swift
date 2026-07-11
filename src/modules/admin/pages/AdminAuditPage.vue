<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import LineChart from '@/components/charts/LineChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { type AdminAuditLog, type AdminAuditStats, api } from '@/services/api'

const { t } = useI18n()
const r = useAdminResource<AdminAuditLog>({ fetcher: params => api.admin.auditLogs(params), initialSort: '-id' })
const { items, meta, loading, sortKey, search, filters } = r

const stats = ref<AdminAuditStats | null>(null)
async function loadStats() { try { stats.value = await api.admin.auditStats() } catch { /* تجاهل */ } }
onMounted(loadStats)

const seriesData = computed(() => (stats.value?.series ?? []).map(s => ({ label: s.date.slice(5), value: s.value })))

const columns: TableColumn[] = [
  { key: 'at', label: t('admin.audit.colTime') },
  { key: 'actor', label: t('admin.audit.colActor') },
  { key: 'action', label: t('admin.audit.colAction'), align: 'center' },
  { key: 'resource', label: t('admin.audit.colResource') },
  { key: 'method', label: t('admin.audit.colMethod'), align: 'center' },
  { key: 'status', label: t('admin.audit.colStatus'), sortable: true, align: 'center' },
]
const filterDefs: FilterDef[] = [
  { key: 'method', label: t('admin.audit.colMethod'), options: ['POST', 'PUT', 'PATCH', 'DELETE'].map(m => ({ value: m, label: m })) },
  { key: 'action', label: t('admin.audit.colAction'), options: ['create', 'update', 'delete', 'close', 'approve', 'reject', 'adjust', 'suspend', 'activate', 'permissions'].map(a => ({ value: a, label: t(`admin.audit.act_${a}`) })) },
]
const actionColor: Record<string, 'success' | 'info' | 'error' | 'warning' | 'brand' | 'neutral'> = {
  create: 'success', update: 'info', delete: 'error', close: 'warning', approve: 'success', reject: 'error', adjust: 'brand', suspend: 'error', activate: 'success', permissions: 'brand',
}
const methodColor: Record<string, 'success' | 'info' | 'warning' | 'error' | 'neutral'> = { POST: 'success', PUT: 'info', PATCH: 'warning', DELETE: 'error' }
function actionLabel(a: string) { const k = `admin.audit.act_${a}`; const l = t(k); return l === k ? a : l }
function statusColor(s: number) { return s >= 200 && s < 300 ? 'success' : s >= 400 ? 'error' : 'neutral' }
function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleString() : '—' }

const detailOpen = ref(false)
const detail = ref<AdminAuditLog | null>(null)
function openDetail(row: AdminAuditLog) { detail.value = row; detailOpen.value = true }
</script>

<template>
  <div>
    <PageHeader :title="t('admin.audit.title')" :subtitle="t('admin.audit.subtitle')" icon="mdi-history" />

    <!-- شريط الإحصاءات -->
    <div class="mb-4 grid grid-cols-3 gap-3">
      <StatCard icon="mdi-history" :value="stats?.total ?? 0" :title="t('admin.audit.statTotal')" color="primary" />
      <StatCard icon="mdi-calendar-today-outline" :value="stats?.today ?? 0" :title="t('admin.audit.statToday')" color="accent" />
      <StatCard icon="mdi-account-key-outline" :value="stats?.actors ?? 0" :title="t('admin.audit.statActors')" color="info" />
    </div>

    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <BaseCard class="lg:col-span-2">
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-line" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.audit.activityTrend') }}</h2>
        </div>
        <LineChart v-if="seriesData.length" :data="seriesData" color="primary" :height="190" />
      </BaseCard>
      <BaseCard>
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.audit.byAction') }}</h2>
        </div>
        <DonutChart v-if="stats?.byAction?.length" :data="stats.byAction.map(a => ({ label: actionLabel(a.label), value: a.value }))" :size="150" :center-label="t('admin.audit.statTotal')" />
        <p v-else class="py-6 text-center text-xs text-muted">—</p>
      </BaseCard>
    </div>

    <ResourceScaffold
      :columns="columns"
      :items="items"
      :loading="loading"
      :meta="meta"
      :sort-key="sortKey"
      :search="search"
      :filters="filterDefs"
      :active-filters="filters"
      :search-placeholder="t('admin.audit.searchPlaceholder')"
      export-name="audit-logs"
      inspectable
      @update:sort-key="r.setSort"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
      @row-click="openDetail"
    >
      <template #cell-at="{ row }">
        <span class="text-muted">{{ fmtDate(row.at) }}</span>
      </template>
      <template #cell-actor="{ row }">
        <span class="text-content">{{ row.actor }}</span>
      </template>
      <template #cell-action="{ row }">
        <BaseChip :color="actionColor[row.action] || 'neutral'">{{ actionLabel(row.action) }}</BaseChip>
      </template>
      <template #cell-resource="{ row }">
        <span class="font-mono text-xs text-content" dir="ltr">{{ row.resource ?? '—' }}{{ row.targetId ? `#${row.targetId}` : '' }}</span>
      </template>
      <template #cell-method="{ row }">
        <BaseChip :color="methodColor[row.method] || 'neutral'">{{ row.method }}</BaseChip>
      </template>
      <template #cell-status="{ row }">
        <BaseChip :color="statusColor(row.status)">{{ row.status }}</BaseChip>
      </template>
    </ResourceScaffold>

    <!-- تفصيل القيد -->
    <BaseDrawer v-model="detailOpen" :width="380">
      <div v-if="detail" class="p-4 space-y-3">
        <h3 class="flex items-center gap-2 text-base font-bold text-content">
          <BaseIcon name="mdi-history" :size="20" class="text-brand" />{{ t('admin.audit.detailTitle') }}
        </h3>
        <div class="space-y-2 text-sm">
          <div class="det"><span class="text-muted">{{ t('admin.audit.colActor') }}</span><span class="text-content">{{ detail.actor }}</span></div>
          <div class="det"><span class="text-muted">{{ t('admin.audit.colAction') }}</span><BaseChip :color="actionColor[detail.action] || 'neutral'">{{ actionLabel(detail.action) }}</BaseChip></div>
          <div class="det"><span class="text-muted">{{ t('admin.audit.colMethod') }}</span><BaseChip :color="methodColor[detail.method] || 'neutral'">{{ detail.method }}</BaseChip></div>
          <div class="det"><span class="text-muted">{{ t('admin.audit.colStatus') }}</span><BaseChip :color="statusColor(detail.status)">{{ detail.status }}</BaseChip></div>
          <div class="det"><span class="text-muted">{{ t('admin.audit.path') }}</span><span class="font-mono text-xs text-content" dir="ltr">/{{ detail.path }}</span></div>
          <div class="det"><span class="text-muted">IP</span><span class="font-mono text-xs text-content" dir="ltr">{{ detail.ip ?? '—' }}</span></div>
          <div class="det"><span class="text-muted">{{ t('admin.audit.colTime') }}</span><span class="text-content">{{ fmtDate(detail.at) }}</span></div>
        </div>

        <!-- فرق قبل/بعد (C2) -->
        <div v-if="detail.meta" class="rounded-ui border-ui p-3">
          <div class="mb-2 flex items-center gap-1.5 text-xs font-bold text-content">
            <BaseIcon name="mdi-file-compare" :size="15" class="text-brand" />{{ t('admin.audit.changes') }}
          </div>
          <div class="space-y-1.5 text-xs">
            <div v-if="detail.meta.role" class="flex items-center gap-1.5">
              <span class="text-muted">{{ t('admin.audit.role') }}:</span><BaseChip color="brand">{{ detail.meta.role }}</BaseChip>
              <BaseChip v-if="detail.meta.deleted" color="error">{{ t('admin.audit.deleted') }}</BaseChip>
            </div>
            <div v-if="detail.meta.user" class="flex items-center gap-1.5">
              <span class="text-muted">{{ t('admin.audit.user') }}:</span><span class="text-content">{{ detail.meta.user }}</span>
            </div>
            <div v-if="detail.meta.added?.length" class="flex flex-wrap items-center gap-1">
              <span class="text-muted">{{ t('admin.audit.added') }}:</span>
              <BaseChip v-for="p in detail.meta.added" :key="p" color="success">+ {{ p }}</BaseChip>
            </div>
            <div v-if="detail.meta.removed?.length" class="flex flex-wrap items-center gap-1">
              <span class="text-muted">{{ t('admin.audit.removed') }}:</span>
              <BaseChip v-for="p in detail.meta.removed" :key="p" color="error">− {{ p }}</BaseChip>
            </div>
            <div v-if="detail.meta.granted?.length" class="flex flex-wrap items-center gap-1">
              <span class="text-muted">{{ t('admin.audit.granted') }}:</span>
              <BaseChip v-for="p in detail.meta.granted" :key="p" color="info">{{ p }}</BaseChip>
            </div>
            <div v-if="detail.meta.status" class="flex items-center gap-1.5">
              <span class="text-muted">{{ t('admin.audit.statusChange') }}:</span>
              <BaseChip color="neutral">{{ detail.meta.status.from }}</BaseChip>
              <BaseIcon name="mdi-arrow-left" :size="14" class="text-muted" />
              <BaseChip color="brand">{{ detail.meta.status.to }}</BaseChip>
            </div>
            <div v-if="Array.isArray(detail.meta.from) || Array.isArray(detail.meta.to)" class="flex flex-wrap items-center gap-1">
              <span class="text-muted">{{ t('admin.audit.roleChange') }}:</span>
              <BaseChip color="neutral">{{ (detail.meta.from as string[])?.join('، ') || '—' }}</BaseChip>
              <BaseIcon name="mdi-arrow-left" :size="14" class="text-muted" />
              <BaseChip color="brand">{{ (detail.meta.to as string[])?.join('، ') || '—' }}</BaseChip>
            </div>
            <div v-if="detail.meta.assigned" class="flex items-center gap-1.5">
              <span class="text-muted">{{ t('admin.audit.assigned') }}:</span><BaseChip color="success">{{ detail.meta.assigned }}</BaseChip>
            </div>
            <div v-if="detail.meta.revoked" class="flex items-center gap-1.5">
              <span class="text-muted">{{ t('admin.audit.revoked') }}:</span><BaseChip color="error">{{ detail.meta.revoked }}</BaseChip>
            </div>
          </div>
        </div>
      </div>
    </BaseDrawer>
  </div>
</template>

<style scoped>
.det {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
</style>
