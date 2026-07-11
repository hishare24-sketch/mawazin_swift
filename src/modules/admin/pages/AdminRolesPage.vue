<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import { type AdminRole, type AdminRolesStats, type RoleMember, api } from '@/services/api'
import { PERMISSION_GROUPS } from '@/services/adminPermissions'
import { confirm } from '@/components/ui/confirm'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const canEdit = computed(() => auth.hasPermission('update_roles'))
const canCreate = computed(() => auth.hasPermission('create_roles'))
const canDelete = computed(() => auth.hasPermission('delete_roles'))
const SYSTEM_ROLES = ['super_admin', 'admin', 'governance']

const roles = ref<AdminRole[]>([])
const loading = ref(true)
const stats = ref<AdminRolesStats | null>(null)
const edited = ref<Record<string, Set<string>>>({})
const original = ref<Record<string, Set<string>>>({})

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

// ——— عضويّة الدور (C2) ———
const membersOpen = ref(false)
const membersRole = ref('')
const members = ref<RoleMember[]>([])
const membersLoading = ref(false)
const memberQuery = ref('')
const memberResults = ref<{ id: number, name: string, email: string }[]>([])
const searching = ref(false)

async function openMembers(roleName: string) {
  membersRole.value = roleName
  membersOpen.value = true
  members.value = []
  memberQuery.value = ''
  memberResults.value = []
  await loadMembers()
}
async function loadMembers() {
  membersLoading.value = true
  try { members.value = (await api.admin.roleMembers(membersRole.value)).members }
  catch (e) { fail(e) }
  finally { membersLoading.value = false }
}
let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearch() {
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    const q = memberQuery.value.trim()
    if (q.length < 2) { memberResults.value = []; return }
    searching.value = true
    try {
      const held = new Set(members.value.map(m => m.id))
      memberResults.value = (await api.admin.users({ q, perPage: 6 })).items
        .filter(u => !held.has(u.id)).map(u => ({ id: u.id, name: u.name, email: u.email }))
    }
    catch { memberResults.value = [] }
    finally { searching.value = false }
  }, 250)
}
async function assign(userId: number) {
  try {
    await api.admin.assignRole(membersRole.value, userId)
    toast(t('admin.roles.assigned'))
    memberQuery.value = ''; memberResults.value = []
    await loadMembers(); load(); loadStats()
  }
  catch (e) { fail(e) }
}
async function revoke(m: RoleMember) {
  const ok = await confirm({ title: t('admin.roles.revokeTitle'), message: t('admin.roles.revokeMsg', { name: m.name, role: membersRole.value }), confirmText: t('admin.roles.revoke'), tone: 'danger', icon: 'mdi-account-remove-outline' })
  if (!ok)
    return
  try { await api.admin.revokeRole(membersRole.value, m.id); toast(t('admin.toast.updated')); await loadMembers(); load(); loadStats() }
  catch (e) { fail(e) }
}

async function loadStats() { try { stats.value = await api.admin.rolesStats() } catch { /* تجاهل */ } }
async function load() {
  loading.value = true
  try {
    const res = await api.admin.roles()
    roles.value = res.roles
    edited.value = {}
    original.value = {}
    for (const role of res.roles) {
      if (role.name === 'super_admin')
        continue
      edited.value[role.name] = new Set(role.permissions)
      original.value[role.name] = new Set(role.permissions)
    }
  }
  finally {
    loading.value = false
  }
}
onMounted(() => { load(); loadStats() })

function has(roleName: string, perm: string): boolean {
  if (roleName === 'super_admin')
    return true
  return edited.value[roleName]?.has(perm) ?? false
}
function toggle(roleName: string, perm: string) {
  if (!canEdit.value || roleName === 'super_admin')
    return
  const set = edited.value[roleName]
  if (!set)
    return
  set.has(perm) ? set.delete(perm) : set.add(perm)
  edited.value = { ...edited.value }
}
function dirty(roleName: string): boolean {
  const a = edited.value[roleName]
  const b = original.value[roleName]
  if (!a || !b)
    return false
  return a.size !== b.size || [...a].some(p => !b.has(p))
}
async function save(roleName: string) {
  try {
    await api.admin.updateRolePermissions(roleName, [...edited.value[roleName]])
    original.value[roleName] = new Set(edited.value[roleName])
    original.value = { ...original.value }
    toast(t('admin.toast.roleUpdated'))
    loadStats()
  }
  catch (e) { fail(e) }
}

// ——— إنشاء دور ———
const createOpen = ref(false)
const newName = ref('')
const newPerms = ref<Set<string>>(new Set())
const creating = ref(false)
function openCreate() {
  newName.value = ''
  newPerms.value = new Set()
  createOpen.value = true
}
function togglePerm(perm: string) {
  newPerms.value.has(perm) ? newPerms.value.delete(perm) : newPerms.value.add(perm)
  newPerms.value = new Set(newPerms.value)
}
function toggleGroup(perms: string[]) {
  const allOn = perms.every(p => newPerms.value.has(p))
  perms.forEach(p => allOn ? newPerms.value.delete(p) : newPerms.value.add(p))
  newPerms.value = new Set(newPerms.value)
}
const validName = computed(() => /^[a-z][a-z0-9_]*$/.test(newName.value.trim()))
async function createRole() {
  if (!validName.value)
    return
  creating.value = true
  try {
    await api.admin.createRole(newName.value.trim(), [...newPerms.value])
    toast(t('admin.roles.created'))
    createOpen.value = false
    load(); loadStats()
  }
  catch (e) { fail(e) }
  finally { creating.value = false }
}
async function removeRole(roleName: string) {
  const ok = await confirm({
    title: t('admin.roles.confirmDeleteTitle'),
    message: t('admin.roles.confirmDeleteMsg', { name: roleName }),
    confirmText: t('admin.roles.delete'),
    tone: 'danger',
    icon: 'mdi-delete-outline',
  })
  if (!ok)
    return
  try { await api.admin.deleteRole(roleName); toast(t('admin.toast.updated')); load(); loadStats() }
  catch (e) { fail(e) }
}
</script>

<template>
  <div>
    <PageHeader :title="t('admin.roles.title')" :subtitle="t('admin.roles.subtitle')" icon="mdi-shield-key-outline">
      <template #actions>
        <BaseButton v-if="canCreate" variant="brand" size="sm" @click="openCreate">
          <BaseIcon name="mdi-plus" :size="18" />{{ t('admin.roles.newRole') }}
        </BaseButton>
      </template>
    </PageHeader>

    <!-- شريط الإحصاءات -->
    <div class="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="grid grid-cols-3 gap-3">
        <StatCard icon="mdi-shield-account-outline" :value="stats?.totalRoles ?? 0" :title="t('admin.roles.statRoles')" color="primary" />
        <StatCard icon="mdi-account-key-outline" :value="stats?.adminUsers ?? 0" :title="t('admin.roles.statAdmins')" color="accent" />
        <StatCard icon="mdi-shield-plus-outline" :value="stats?.customRoles ?? 0" :title="t('admin.roles.statCustom')" color="info" />
      </div>
      <BaseCard>
        <div class="mb-2 flex items-center gap-2">
          <BaseIcon name="mdi-chart-donut" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.roles.holdersByRole') }}</h2>
        </div>
        <DonutChart v-if="stats?.holders?.some(h => h.value)" :data="stats.holders.filter(h => h.value)" :size="150" :center-label="t('admin.roles.statAdmins')" />
        <p v-else class="py-6 text-center text-xs text-muted">{{ t('admin.roles.noHolders') }}</p>
      </BaseCard>
      <BaseCard>
        <div class="mb-2 flex items-center gap-2">
          <BaseIcon name="mdi-chart-bar" :size="18" class="text-brand" />
          <h2 class="text-sm font-bold text-content">{{ t('admin.roles.permsByRole') }}</h2>
        </div>
        <BarChart v-if="stats?.permissionCounts?.length" :data="stats.permissionCounts" color="secondary" :height="150" />
      </BaseCard>
    </div>

    <p class="mb-3 flex items-center gap-1.5 text-xs text-muted">
      <BaseIcon name="mdi-information-outline" :size="15" />{{ t('admin.roles.superAdminNote') }}
    </p>

    <BaseCard :padded="false" class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-ui bg-surfalt">
              <th class="px-4 py-3 text-start text-xs font-bold uppercase text-muted">{{ t('admin.roles.permission') }}</th>
              <th v-for="role in roles" :key="role.name" class="px-3 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <span class="text-sm font-bold text-content">{{ role.name }}</span>
                  <BaseTooltip v-if="canDelete && !SYSTEM_ROLES.includes(role.name)" :text="t('admin.roles.delete')">
                    <button class="del-role" :aria-label="t('admin.roles.delete')" @click="removeRole(role.name)">
                      <BaseIcon name="mdi-close" :size="13" />
                    </button>
                  </BaseTooltip>
                </div>
                <button v-if="canEdit" class="mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-brand hover:bg-brand/[0.08]" @click="openMembers(role.name)">
                  <BaseIcon name="mdi-account-multiple-outline" :size="13" />{{ t('admin.roles.usersCount', { n: role.usersCount }) }}
                </button>
                <div v-else class="text-[11px] text-muted">{{ t('admin.roles.usersCount', { n: role.usersCount }) }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in PERMISSION_GROUPS" :key="group.key">
              <tr class="border-b border-ui bg-brand/[0.04]">
                <td :colspan="roles.length + 1" class="px-4 py-1.5 text-xs font-bold text-brand">{{ t(group.labelKey) }}</td>
              </tr>
              <tr v-for="perm in group.permissions" :key="perm" class="border-b border-ui/60 hover:bg-surfalt/50">
                <td class="px-4 py-2 font-mono text-xs text-content" dir="ltr">{{ perm }}</td>
                <td v-for="role in roles" :key="role.name" class="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    class="perm-check"
                    :checked="has(role.name, perm)"
                    :disabled="role.name === 'super_admin' || !canEdit"
                    @change="toggle(role.name, perm)"
                  >
                </td>
              </tr>
            </template>
          </tbody>
          <tfoot v-if="canEdit">
            <tr class="border-t border-ui">
              <td class="px-4 py-3 text-xs text-muted">{{ t('admin.roles.saveChanges') }}</td>
              <td v-for="role in roles" :key="role.name" class="px-3 py-3 text-center">
                <BaseButton
                  v-if="role.name !== 'super_admin'"
                  size="sm"
                  :variant="dirty(role.name) ? 'brand' : 'outline'"
                  :disabled="!dirty(role.name)"
                  @click="save(role.name)"
                >
                  <BaseIcon name="mdi-content-save-outline" :size="15" />{{ t('admin.users.save') }}
                </BaseButton>
                <BaseChip v-else color="brand"><BaseIcon name="mdi-lock-outline" :size="12" />الكل</BaseChip>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </BaseCard>

    <!-- إنشاء دور -->
    <BaseModal v-model="createOpen" :title="t('admin.roles.newRole')" :max-width="620">
      <div class="space-y-4">
        <div>
          <BaseInput v-model="newName" :label="t('admin.roles.fieldName')" placeholder="moderator" />
          <p class="mt-1 text-[11px] text-muted">{{ t('admin.roles.nameHint') }}</p>
        </div>
        <div class="space-y-3">
          <div v-for="group in PERMISSION_GROUPS" :key="group.key">
            <div class="mb-1 flex items-center justify-between">
              <span class="text-xs font-bold text-brand">{{ t(group.labelKey) }}</span>
              <button type="button" class="text-[11px] text-muted underline" @click="toggleGroup(group.permissions)">{{ t('admin.roles.toggleGroup') }}</button>
            </div>
            <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              <label v-for="perm in group.permissions" :key="perm" class="flex items-center gap-1.5 text-[11px] text-content">
                <input type="checkbox" class="perm-check" :checked="newPerms.has(perm)" @change="togglePerm(perm)">
                <span class="font-mono" dir="ltr">{{ perm }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="createOpen = false">{{ t('admin.users.cancel') }}</BaseButton>
        <BaseButton variant="brand" :disabled="creating || !validName" @click="createRole">
          <BaseIcon name="mdi-check" :size="18" />{{ t('admin.roles.create') }} ({{ newPerms.size }})
        </BaseButton>
      </template>
    </BaseModal>

    <!-- عضويّة الدور (C2) -->
    <BaseDrawer v-model="membersOpen" :width="400">
      <div class="p-4">
        <h3 class="mb-3 flex items-center gap-2 text-base font-bold text-content">
          <BaseIcon name="mdi-account-multiple-outline" :size="20" class="text-brand" />
          {{ t('admin.roles.membersOf', { role: membersRole }) }}
        </h3>

        <!-- إضافة عضو -->
        <div class="mb-3">
          <BaseInput v-model="memberQuery" :label="t('admin.roles.addMember')" :placeholder="t('admin.roles.searchUser')" @update:model-value="onSearch" />
          <div v-if="memberResults.length" class="mt-1 space-y-1 rounded-ui border-ui p-1.5">
            <button v-for="u in memberResults" :key="u.id" class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-sm hover:bg-brand/[0.08]" @click="assign(u.id)">
              <BaseIcon name="mdi-plus-circle-outline" :size="16" class="text-brand" />
              <div class="flex-1">
                <div class="text-content">{{ u.name }}</div>
                <div class="text-[11px] text-muted" dir="ltr">{{ u.email }}</div>
              </div>
            </button>
          </div>
          <p v-else-if="searching" class="mt-1 text-xs text-muted">…</p>
        </div>

        <!-- الأعضاء الحاليّون -->
        <div v-if="membersLoading" class="py-6 text-center"><BaseIcon name="mdi-loading" :size="24" class="animate-spin text-brand" /></div>
        <div v-else class="space-y-1.5">
          <div v-for="m in members" :key="m.id" class="flex items-center gap-2 rounded-ui border-ui px-3 py-2">
            <BaseIcon name="mdi-account-circle-outline" :size="20" class="text-muted" />
            <div class="flex-1">
              <div class="text-sm text-content">{{ m.name }}</div>
              <div class="text-[11px] text-muted" dir="ltr">{{ m.email }}</div>
            </div>
            <BaseChip :color="m.status === 'active' ? 'success' : 'neutral'">{{ m.status }}</BaseChip>
            <button class="del-role" :aria-label="t('admin.roles.revoke')" @click="revoke(m)"><BaseIcon name="mdi-account-remove-outline" :size="16" /></button>
          </div>
          <p v-if="!members.length" class="rounded-ui border border-dashed border-ui py-5 text-center text-xs text-muted">{{ t('admin.roles.noMembers') }}</p>
        </div>
      </div>
    </BaseDrawer>

    <BaseSnackbar v-model="snack.show" :color="snack.color">{{ snack.text }}</BaseSnackbar>
  </div>
</template>

<style scoped>
.perm-check {
  width: 16px;
  height: 16px;
  accent-color: rgb(var(--v-theme-primary));
  cursor: pointer;
}
.perm-check:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
.del-role {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  color: rgb(var(--v-theme-error));
}
.del-role:hover {
  background: rgba(var(--v-theme-error), 0.12);
}
</style>
