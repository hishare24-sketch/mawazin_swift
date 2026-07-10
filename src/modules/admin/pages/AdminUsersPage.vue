<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import ResourceScaffold from '@/modules/admin/components/ResourceScaffold.vue'
import type { FilterDef } from '@/modules/admin/components/ResourceScaffold.vue'
import type { TableColumn } from '@/components/ui/BaseTable.vue'
import { useAdminResource } from '@/modules/admin/composables/useAdminResource'
import { confirm } from '@/components/ui/confirm'
import { type AdminUser, type AdminUserPatch, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()

const r = useAdminResource<AdminUser>({ fetcher: params => api.admin.users(params), initialSort: '-id' })
const { items, meta, loading, sortKey, selected, search, filters } = r

const columns: TableColumn[] = [
  { key: 'name', label: t('admin.users.colName'), sortable: true },
  { key: 'email', label: t('admin.users.colEmail'), sortable: true },
  { key: 'role', label: t('admin.users.colRole'), sortable: true },
  { key: 'tier', label: t('admin.users.colTier'), sortable: true, align: 'center' },
  { key: 'status', label: t('admin.users.colStatus'), sortable: true, align: 'center' },
  { key: 'adminRoles', label: t('admin.users.colAdmin') },
  { key: 'created_at', label: t('admin.users.colCreated'), sortable: true },
]

const filterDefs: FilterDef[] = [
  { key: 'tier', label: t('admin.users.filterTier'), options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }, { value: 'elite', label: 'Elite' }] },
  { key: 'kind', label: t('admin.users.filterKind'), options: [{ value: 'individual', label: t('admin.users.individual') }, { value: 'organization', label: t('admin.users.organization') }] },
  { key: 'status', label: t('admin.users.filterStatus'), options: [{ value: 'active', label: t('admin.users.active') }, { value: 'suspended', label: t('admin.users.suspended') }] },
]

const tierColor: Record<string, 'neutral' | 'info' | 'accent'> = { free: 'neutral', pro: 'info', elite: 'accent' }
const ADMIN_ROLE_OPTIONS = [
  { value: '', title: t('admin.users.none') },
  { value: 'super_admin', title: 'super_admin' },
  { value: 'admin', title: 'admin' },
  { value: 'governance', title: 'governance' },
]

function fmtDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString() : '—'
}

// ——— تغذية راجعة ———
const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') {
  snack.value = { show: true, text, color }
}
function fail(e: unknown) {
  toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error')
}

// ——— تعليق / تفعيل ———
async function toggleSuspend(u: AdminUser) {
  if (u.status === 'active') {
    const ok = await confirm({
      title: t('admin.users.confirmSuspendTitle'),
      message: t('admin.users.confirmSuspendMsg', { name: u.name }),
      confirmText: t('admin.users.suspend'),
      tone: 'danger',
      icon: 'mdi-account-cancel-outline',
    })
    if (!ok)
      return
    try {
      await api.admin.suspendUser(u.id)
      toast(t('admin.toast.suspended'))
      r.refresh()
    }
    catch (e) { fail(e) }
  }
  else {
    try {
      await api.admin.activateUser(u.id)
      toast(t('admin.toast.activated'))
      r.refresh()
    }
    catch (e) { fail(e) }
  }
}

async function bulkStatus(suspend: boolean) {
  const ids = [...selected.value] as number[]
  try {
    await Promise.all(ids.map(id => suspend ? api.admin.suspendUser(id) : api.admin.activateUser(id)))
    toast(suspend ? t('admin.toast.suspended') : t('admin.toast.activated'))
    r.clearSelection()
    r.refresh()
  }
  catch (e) { fail(e) }
}

// ——— درج التعديل ———
const editOpen = ref(false)
const editing = ref<AdminUser | null>(null)
const form = ref<AdminUserPatch>({})
const formAdminRole = ref<string>('')
function openEdit(u: AdminUser) {
  editing.value = u
  form.value = { name: u.name, email: u.email, tier: u.tier, kind: u.kind }
  formAdminRole.value = u.adminRoles[0] ?? ''
  editOpen.value = true
}
async function saveEdit() {
  if (!editing.value)
    return
  const id = editing.value.id
  try {
    await api.admin.updateUser(id, form.value)
    if ((editing.value.adminRoles[0] ?? '') !== formAdminRole.value)
      await api.admin.setAdminRole(id, formAdminRole.value || null)
    toast(t('admin.toast.updated'))
    editOpen.value = false
    r.refresh()
  }
  catch (e) { fail(e) }
}

const selfId = computed(() => auth.authUser?.id)
</script>

<template>
  <div>
    <PageHeader :title="t('admin.users.title')" :subtitle="t('admin.users.subtitle')" icon="mdi-account-multiple-outline" />

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
      :search-placeholder="t('admin.users.searchPlaceholder')"
      selectable
      @update:sort-key="r.setSort"
      @update:selected="v => (selected = v)"
      @update:search="r.setSearch"
      @filter="r.setFilter"
      @update:page="r.setPage"
      @update:per-page="r.setPerPage"
    >
      <!-- خلايا مخصّصة -->
      <template #cell-tier="{ row }">
        <BaseChip :color="tierColor[row.tier] || 'neutral'">{{ row.tier }}</BaseChip>
      </template>
      <template #cell-status="{ row }">
        <BaseChip :color="row.status === 'suspended' ? 'error' : 'success'">
          {{ row.status === 'suspended' ? t('admin.users.suspended') : t('admin.users.active') }}
        </BaseChip>
      </template>
      <template #cell-adminRoles="{ row }">
        <span v-if="!row.adminRoles.length" class="text-muted">{{ t('admin.users.none') }}</span>
        <BaseChip v-for="ar in row.adminRoles" v-else :key="ar" color="brand" class="me-1">{{ ar }}</BaseChip>
      </template>
      <template #cell-created_at="{ row }">
        <span class="text-muted">{{ fmtDate(row.createdAt) }}</span>
      </template>

      <!-- إجراءات الصفّ -->
      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <BaseTooltip :text="t('admin.users.edit')">
            <button class="row-act" :aria-label="t('admin.users.edit')" @click="openEdit(row)">
              <BaseIcon name="mdi-pencil-outline" :size="18" />
            </button>
          </BaseTooltip>
          <BaseTooltip :text="row.status === 'active' ? t('admin.users.suspend') : t('admin.users.activate')">
            <button
              class="row-act"
              :disabled="row.id === selfId"
              :style="row.status === 'active' ? 'color: rgb(var(--v-theme-error))' : 'color: rgb(var(--v-theme-success))'"
              :aria-label="row.status === 'active' ? t('admin.users.suspend') : t('admin.users.activate')"
              @click="toggleSuspend(row)"
            >
              <BaseIcon :name="row.status === 'active' ? 'mdi-account-cancel-outline' : 'mdi-account-check-outline'" :size="18" />
            </button>
          </BaseTooltip>
        </div>
      </template>

      <!-- إجراءات جماعيّة -->
      <template #bulk>
        <BaseButton size="sm" variant="ghost" @click="bulkStatus(false)">
          <BaseIcon name="mdi-account-check-outline" :size="16" style="color: rgb(var(--v-theme-success))" />{{ t('admin.users.bulkActivate') }}
        </BaseButton>
        <BaseButton size="sm" variant="ghost" @click="bulkStatus(true)">
          <BaseIcon name="mdi-account-cancel-outline" :size="16" style="color: rgb(var(--v-theme-error))" />{{ t('admin.users.bulkSuspend') }}
        </BaseButton>
      </template>
    </ResourceScaffold>

    <!-- درج التعديل -->
    <BaseDrawer v-model="editOpen" :width="420" side="end">
      <div v-if="editing" class="flex h-full flex-col">
        <div class="flex items-center gap-2 border-b border-ui p-4">
          <BaseIcon name="mdi-account-edit-outline" :size="22" class="text-brand" />
          <h2 class="text-base font-bold text-content">{{ t('admin.users.editTitle') }}</h2>
        </div>
        <div class="flex-1 space-y-3 overflow-y-auto p-4">
          <BaseInput v-model="form.name" :label="t('admin.users.colName')" />
          <BaseInput v-model="form.email" :label="t('admin.users.colEmail')" type="email" dir="ltr" />
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="mb-1 text-xs text-muted">{{ t('admin.users.colTier') }}</p>
              <BaseSelect
                :model-value="form.tier"
                :items="[{ value: 'free', title: 'Free' }, { value: 'pro', title: 'Pro' }, { value: 'elite', title: 'Elite' }]"
                @update:model-value="v => (form.tier = v as AdminUserPatch['tier'])"
              />
            </div>
            <div>
              <p class="mb-1 text-xs text-muted">{{ t('admin.users.filterKind') }}</p>
              <BaseSelect
                :model-value="form.kind"
                :items="[{ value: 'individual', title: t('admin.users.individual') }, { value: 'organization', title: t('admin.users.organization') }]"
                @update:model-value="v => (form.kind = v as AdminUserPatch['kind'])"
              />
            </div>
          </div>
          <div>
            <p class="mb-1 text-xs text-muted">{{ t('admin.users.adminRole') }}</p>
            <BaseSelect v-model="formAdminRole" :items="ADMIN_ROLE_OPTIONS" />
          </div>
        </div>
        <div class="flex justify-end gap-2 border-t border-ui p-4">
          <BaseButton variant="ghost" @click="editOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
          <BaseButton variant="brand" @click="saveEdit"><BaseIcon name="mdi-content-save-outline" :size="18" />{{ t('admin.users.save') }}</BaseButton>
        </div>
      </div>
    </BaseDrawer>

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
  color: rgba(var(--v-theme-on-surface), 0.7);
  transition: background-color 0.15s ease;
}
.row-act:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.row-act:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
