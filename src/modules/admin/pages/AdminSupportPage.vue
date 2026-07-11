<script setup lang="ts">
defineProps<{ embedded?: boolean }>()
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { type AdminSupportStats, type AdminTicket, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.hasPermission('manage_support'))
const r = useAdminResource<AdminTicket>({ fetcher: params => api.admin.tickets(params), initialSort: '-id' })
const { items, meta, loading, sortKey, search, filters } = r

const stats = ref<AdminSupportStats | null>(null)
async function loadStats() { try { stats.value = await api.admin.ticketsStats() } catch { /* تجاهل */ } }
onMounted(loadStats)
function refreshAll() { r.refresh(); loadStats() }

const CATEGORIES = ['billing', 'technical', 'account', 'other']
const PRIORITIES = ['low', 'normal', 'high', 'urgent']
const STATUSES = ['open', 'pending', 'resolved', 'closed']
const catLabel = (x: string) => t(`admin.support.cat_${x}`)
const prioLabel = (x: string) => t(`admin.support.prio_${x}`)
const stLabel = (x: string) => t(`admin.support.st_${x}`)
const statusColor: Record<string, 'warning' | 'info' | 'success' | 'neutral'> = { open: 'warning', pending: 'info', resolved: 'success', closed: 'neutral' }
const prioColor: Record<string, 'neutral' | 'info' | 'warning' | 'error'> = { low: 'neutral', normal: 'info', high: 'warning', urgent: 'error' }

const columns: TableColumn[] = [
  { key: 'subject', label: t('admin.support.colSubject'), sortable: true },
  { key: 'user', label: t('admin.support.colUser') },
  { key: 'category', label: t('admin.support.colCategory'), align: 'center' },
  { key: 'priority', label: t('admin.support.colPriority'), sortable: true, align: 'center' },
  { key: 'status', label: t('admin.support.colStatus'), sortable: true, align: 'center' },
  { key: 'repliesCount', label: t('admin.support.colReplies'), align: 'center' },
]
const filterDefs: FilterDef[] = [
  { key: 'status', label: t('admin.support.colStatus'), options: STATUSES.map(s => ({ value: s, label: stLabel(s) })) },
  { key: 'category', label: t('admin.support.colCategory'), options: CATEGORIES.map(c => ({ value: c, label: catLabel(c) })) },
  { key: 'priority', label: t('admin.support.colPriority'), options: PRIORITIES.map(p => ({ value: p, label: prioLabel(p) })) },
]

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }
function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleString() : '—' }

// ——— درج المحادثة ———
const open = ref(false)
const ticket = ref<AdminTicket | null>(null)
const loadingTicket = ref(false)
const replyBody = ref('')
const sending = ref(false)
async function openTicket(row: AdminTicket) {
  open.value = true
  ticket.value = null
  loadingTicket.value = true
  replyBody.value = ''
  try { ticket.value = await api.admin.ticket(row.id) }
  catch (e) { fail(e) }
  finally { loadingTicket.value = false }
}
async function sendReply() {
  if (!ticket.value || !replyBody.value.trim())
    return
  sending.value = true
  try {
    ticket.value = await api.admin.replyTicket(ticket.value.id, replyBody.value.trim())
    replyBody.value = ''
    toast(t('admin.support.replied'))
    r.refresh(); loadStats()
  }
  catch (e) { fail(e) }
  finally { sending.value = false }
}
async function changeStatus(status: string) {
  if (!ticket.value)
    return
  try {
    const updated = await api.admin.setTicketStatus(ticket.value.id, status)
    ticket.value = { ...ticket.value, status: updated.status }
    toast(t('admin.support.statusChanged'))
    refreshAll()
  }
  catch (e) { fail(e) }
}
async function assign() {
  if (!ticket.value)
    return
  try {
    const updated = await api.admin.assignTicket(ticket.value.id)
    ticket.value = { ...ticket.value, assignee: updated.assignee }
    toast(t('admin.support.assigned'))
    r.refresh()
  }
  catch (e) { fail(e) }
}
</script>

<template>
  <div>
    <PageHeader v-if="!embedded" :title="t('admin.support.title')" :subtitle="t('admin.support.subtitle')" icon="mdi-lifebuoy" />

    <!-- شريط الإحصاءات -->
    <div class="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard icon="mdi-ticket-outline" :value="stats?.total ?? 0" :title="t('admin.support.statTotal')" color="primary" />
      <StatCard icon="mdi-alert-circle-outline" :value="stats?.open ?? 0" :title="t('admin.support.statOpen')" color="warning" />
      <StatCard icon="mdi-progress-clock" :value="stats?.pending ?? 0" :title="t('admin.support.statPending')" color="info" />
      <StatCard icon="mdi-check-circle-outline" :value="stats?.resolved ?? 0" :title="t('admin.support.statResolved')" color="success" />
    </div>

    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <BaseCard>
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.support.byCategory') }}</h2>
        </div>
        <DonutChart v-if="stats?.byCategory?.length" :data="stats.byCategory.map(x => ({ label: catLabel(x.label), value: x.value }))" :size="150" :center-label="t('admin.support.statTotal')" />
      </BaseCard>
      <BaseCard>
        <div class="mb-3 flex items-center gap-2">
          <BaseIcon name="mdi-chart-bar" :size="20" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.support.byPriority') }}</h2>
        </div>
        <BarChart v-if="stats?.byPriority?.length" :data="stats.byPriority.map(x => ({ label: prioLabel(x.label), value: x.value }))" color="secondary" :height="150" />
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
      :search-placeholder="t('admin.support.searchPlaceholder')"
      export-name="tickets"
      inspectable
      @update:sort-key="r.setSort"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
      @row-click="openTicket"
    >
      <template #cell-category="{ row }">
        <BaseChip color="neutral">{{ catLabel(row.category) }}</BaseChip>
      </template>
      <template #cell-priority="{ row }">
        <BaseChip :color="prioColor[row.priority] || 'neutral'">{{ prioLabel(row.priority) }}</BaseChip>
      </template>
      <template #cell-status="{ row }">
        <BaseChip :color="statusColor[row.status] || 'neutral'">{{ stLabel(row.status) }}</BaseChip>
      </template>
      <template #cell-repliesCount="{ row }">
        <span class="text-muted">{{ row.repliesCount }}</span>
      </template>
    </ResourceScaffold>

    <!-- درج المحادثة -->
    <BaseDrawer v-model="open" :width="480">
      <div v-if="loadingTicket" class="flex h-full items-center justify-center">
        <BaseIcon name="mdi-loading" :size="28" class="animate-spin text-brand" />
      </div>
      <div v-else-if="ticket" class="flex h-full flex-col">
        <div class="border-b border-ui p-4">
          <div class="mb-2 flex items-start justify-between gap-2">
            <h3 class="text-base font-bold text-content">{{ ticket.subject }}</h3>
            <BaseChip :color="statusColor[ticket.status] || 'neutral'">{{ stLabel(ticket.status) }}</BaseChip>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 text-xs">
            <BaseChip color="neutral">{{ ticket.user }}</BaseChip>
            <BaseChip color="neutral">{{ catLabel(ticket.category) }}</BaseChip>
            <BaseChip :color="prioColor[ticket.priority] || 'neutral'">{{ prioLabel(ticket.priority) }}</BaseChip>
            <span v-if="ticket.assignee" class="text-muted">· {{ t('admin.support.assignedTo') }} {{ ticket.assignee }}</span>
          </div>
        </div>

        <!-- المحادثة -->
        <div class="flex-1 space-y-3 overflow-y-auto p-4">
          <div v-for="m in ticket.replies ?? []" :key="m.id" class="flex" :class="m.isStaff ? 'justify-end' : 'justify-start'">
            <div class="max-w-[85%] rounded-ui p-3" :style="m.isStaff ? 'background: rgba(var(--v-theme-primary),0.1)' : 'background: rgba(var(--v-theme-on-surface),0.06)'">
              <div class="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
                <BaseIcon :name="m.isStaff ? 'mdi-headset' : 'mdi-account-outline'" :size="13" />
                <span class="font-medium">{{ m.author }}</span>
                <span v-if="m.isStaff" class="text-brand">· {{ t('admin.support.staff') }}</span>
                <span>· {{ fmtDate(m.at) }}</span>
              </div>
              <p class="whitespace-pre-wrap text-sm text-content">{{ m.body }}</p>
            </div>
          </div>
        </div>

        <!-- أدوات + ردّ -->
        <div v-if="canManage" class="border-t border-ui p-4">
          <div class="mb-2 flex items-center gap-2">
            <BaseSelect
              :model-value="ticket.status"
              class="flex-1"
              :items="STATUSES.map(s => ({ value: s, title: stLabel(s) }))"
              @update:model-value="v => v && changeStatus(String(v))"
            />
            <BaseButton size="sm" variant="outline" @click="assign">
              <BaseIcon name="mdi-account-arrow-right-outline" :size="16" />{{ t('admin.support.assignToMe') }}
            </BaseButton>
          </div>
          <textarea v-model="replyBody" rows="3" class="mb-2 w-full rounded-ui border-ui bg-surface px-3 py-2 text-sm text-content" :placeholder="t('admin.support.replyPlaceholder')" />
          <BaseButton variant="brand" block :disabled="sending || !replyBody.trim()" @click="sendReply">
            <BaseIcon name="mdi-send" :size="18" />{{ t('admin.support.reply') }}
          </BaseButton>
        </div>
      </div>
    </BaseDrawer>

    <BaseSnackbar v-model="snack.show" :color="snack.color">{{ snack.text }}</BaseSnackbar>
  </div>
</template>
