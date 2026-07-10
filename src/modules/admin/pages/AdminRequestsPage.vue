<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import { type AdminMarketRequest, api } from '@/services/api'

const { t } = useI18n()
const r = useAdminResource<AdminMarketRequest>({ fetcher: params => api.admin.requests(params), initialSort: '-id' })
const { items, meta, loading, sortKey, selected, search, filters } = r

const columns: TableColumn[] = [
  { key: 'title', label: t('admin.requests.colTitle'), sortable: true },
  { key: 'org', label: t('admin.requests.colOrg'), sortable: true },
  { key: 'type', label: t('admin.requests.colType'), sortable: true },
  { key: 'state', label: t('admin.requests.colState'), sortable: true, align: 'center' },
  { key: 'compensation', label: t('admin.requests.colCompensation') },
  { key: 'remote', label: t('admin.requests.colRemote'), align: 'center' },
  { key: 'created_at', label: t('admin.requests.colCreated'), sortable: true },
]

const filterDefs: FilterDef[] = [
  { key: 'type', label: t('admin.requests.filterType'), options: [
    { value: 'job', label: 'job' }, { value: 'project', label: 'project' }, { value: 'consultation', label: 'consultation' }, { value: 'task', label: 'task' },
  ] },
  { key: 'state', label: t('admin.requests.filterState'), options: [
    { value: 'new', label: 'new' }, { value: 'reviewing', label: 'reviewing' }, { value: 'accepted', label: 'accepted' }, { value: 'closed', label: 'closed' },
  ] },
]

const stateColor: Record<string, 'info' | 'warning' | 'success' | 'neutral'> = { new: 'info', reviewing: 'warning', accepted: 'success', closed: 'neutral' }

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }
function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleDateString() : '—' }

async function remove(req: AdminMarketRequest) {
  const ok = await confirm({
    title: t('admin.requests.confirmDeleteTitle'),
    message: t('admin.requests.confirmDeleteMsg', { title: req.title }),
    confirmText: t('admin.requests.delete'),
    tone: 'danger',
    icon: 'mdi-delete-outline',
  })
  if (!ok)
    return
  try {
    await api.admin.deleteRequest(req.id)
    toast(t('admin.toast.updated'))
    r.refresh()
  }
  catch (e) { fail(e) }
}
async function bulkDelete() {
  const ids = [...selected.value] as number[]
  try {
    await Promise.all(ids.map(id => api.admin.deleteRequest(id)))
    toast(t('admin.toast.updated'))
    r.clearSelection()
    r.refresh()
  }
  catch (e) { fail(e) }
}
</script>

<template>
  <div>
    <PageHeader :title="t('admin.requests.title')" :subtitle="t('admin.requests.subtitle')" icon="mdi-file-document-outline" />

    <ResourceScaffold
      :columns="columns"
      :items="items"
      :loading="loading"
      :meta="meta"
      :sort-key="sortKey"
      :selected="selected"
      :search="search"
      :filters="filterDefs"
      :active-filters="filters"
      :search-placeholder="t('admin.requests.searchPlaceholder')"
      selectable
      @update:sort-key="r.setSort"
      @update:selected="v => (selected = v)"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
    >
      <template #cell-type="{ row }">
        <BaseChip color="brand">{{ row.type }}</BaseChip>
      </template>
      <template #cell-state="{ row }">
        <BaseChip :color="stateColor[row.state] || 'neutral'">{{ row.state }}</BaseChip>
      </template>
      <template #cell-remote="{ row }">
        <BaseIcon :name="row.remote ? 'mdi-check-circle' : 'mdi-minus'" :size="16" :style="{ color: row.remote ? 'rgb(var(--v-theme-success))' : 'rgba(var(--v-theme-on-surface),0.4)' }" />
      </template>
      <template #cell-created_at="{ row }">
        <span class="text-muted">{{ fmtDate(row.createdAt) }}</span>
      </template>

      <template #actions="{ row }">
        <BaseTooltip :text="t('admin.requests.delete')">
          <button class="row-act" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.requests.delete')" @click="remove(row)">
            <BaseIcon name="mdi-delete-outline" :size="18" />
          </button>
        </BaseTooltip>
      </template>

      <template #bulk>
        <BaseButton size="sm" variant="ghost" @click="bulkDelete">
          <BaseIcon name="mdi-delete-outline" :size="16" style="color: rgb(var(--v-theme-error))" />{{ t('admin.requests.bulkDelete') }}
        </BaseButton>
      </template>
    </ResourceScaffold>

    <BaseSnackbar v-model="snack.show" :color="snack.color">{{ snack.text }}</BaseSnackbar>
  </div>
</template>

<style scoped>
.row-act {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}
.row-act:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
