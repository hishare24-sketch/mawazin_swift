<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import { type AdminRole, api } from '@/services/api'
import { PERMISSION_GROUPS } from '@/services/adminPermissions'
import { useAuthStore } from '@/stores/AuthStore'

const { t } = useI18n()
const auth = useAuthStore()
const canEdit = computed(() => auth.hasPermission('update_roles'))

const roles = ref<AdminRole[]>([])
const loading = ref(true)
// نسخ محرّرة (مجموعات) لكل دور عدا super_admin
const edited = ref<Record<string, Set<string>>>({})
const original = ref<Record<string, Set<string>>>({})

const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }

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
onMounted(load)

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
  }
  catch (e) {
    toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error')
  }
}
</script>

<template>
  <div>
    <PageHeader :title="t('admin.roles.title')" :subtitle="t('admin.roles.subtitle')" icon="mdi-shield-key-outline" />

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
                <div class="text-sm font-bold text-content">{{ role.name }}</div>
                <div class="text-[11px] text-muted">{{ t('admin.roles.usersCount', { n: role.usersCount }) }}</div>
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
</style>
