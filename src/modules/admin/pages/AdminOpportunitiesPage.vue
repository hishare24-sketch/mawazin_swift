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
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import { type AdminOpportunity, api } from '@/services/api'

const { t } = useI18n()
const r = useAdminResource<AdminOpportunity>({ fetcher: params => api.admin.opportunities(params), initialSort: '-id' })
const { items, meta, loading, sortKey, selected, search } = r

const columns: TableColumn[] = [
  { key: 'title', label: t('admin.opportunities.colTitle'), sortable: true },
  { key: 'company', label: t('admin.opportunities.colCompany'), sortable: true },
  { key: 'location', label: t('admin.opportunities.colLocation'), sortable: true },
  { key: 'salary', label: t('admin.opportunities.colSalary'), align: 'center' },
  { key: 'category', label: t('admin.opportunities.colCategory'), sortable: true },
  { key: 'created_at', label: t('admin.opportunities.colCreated'), sortable: true },
]

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }
function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleDateString() : '—' }

async function remove(o: AdminOpportunity) {
  const ok = await confirm({
    title: t('admin.opportunities.confirmDeleteTitle'),
    message: t('admin.opportunities.confirmDeleteMsg', { title: o.title }),
    confirmText: t('admin.opportunities.delete'),
    tone: 'danger',
    icon: 'mdi-delete-outline',
  })
  if (!ok)
    return
  try {
    await api.admin.deleteOpportunity(o.id)
    toast(t('admin.toast.updated'))
    r.refresh()
  }
  catch (e) { fail(e) }
}
async function bulkDelete() {
  const ids = [...selected.value] as number[]
  try {
    await Promise.all(ids.map(id => api.admin.deleteOpportunity(id)))
    toast(t('admin.toast.updated'))
    r.clearSelection()
    r.refresh()
  }
  catch (e) { fail(e) }
}
</script>

<template>
  <div>
    <PageHeader :title="t('admin.opportunities.title')" :subtitle="t('admin.opportunities.subtitle')" icon="mdi-briefcase-outline" />

    <ResourceScaffold
      :columns="columns"
      :items="items"
      :loading="loading"
      :meta="meta"
      :sort-key="sortKey"
      :selected="selected"
      :search="search"
      :search-placeholder="t('admin.opportunities.searchPlaceholder')"
      selectable
      @update:sort-key="r.setSort"
      @update:selected="v => (selected = v)"
      @update:search="r.setSearch"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
    >
      <template #cell-category="{ row }">
        <BaseChip color="accent">{{ row.category }}</BaseChip>
      </template>
      <template #cell-created_at="{ row }">
        <span class="text-muted">{{ fmtDate(row.createdAt) }}</span>
      </template>

      <template #actions="{ row }">
        <BaseTooltip :text="t('admin.opportunities.delete')">
          <button class="row-act" style="color: rgb(var(--v-theme-error))" :aria-label="t('admin.opportunities.delete')" @click="remove(row)">
            <BaseIcon name="mdi-delete-outline" :size="18" />
          </button>
        </BaseTooltip>
      </template>

      <template #bulk>
        <BaseButton size="sm" variant="ghost" @click="bulkDelete">
          <BaseIcon name="mdi-delete-outline" :size="16" style="color: rgb(var(--v-theme-error))" />{{ t('admin.opportunities.bulkDelete') }}
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
