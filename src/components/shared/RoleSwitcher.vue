<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { UserRole } from '@/interfaces/Auth'
import { COMPANY_SIZES } from '@/interfaces/RoleProfiles'
import { ROLE_META, SWITCHABLE_ROLES, roleHome } from '@/services/roles'
import { useAuthStore } from '@/stores/AuthStore'
import { useGamificationStore } from '@/stores/GamificationStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { useRoleRequestsStore } from '@/stores/RoleRequestsStore'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const notifications = useNotificationsStore()

// Roles the user owns (any status), in the canonical order
const ownedRoles = computed(() =>
  SWITCHABLE_ROLES.filter(r => authStore.ownsRole(r)),
)
// Roles the user can still request
const requestableRoles = computed(() =>
  SWITCHABLE_ROLES.filter(r => ROLE_META[r].requestable && !authStore.ownsRole(r)),
)

const snackbar = ref('')
const requestDialog = ref(false)

// Employer activation mini-form (fields mirror employer_profiles)
const companyDialog = ref(false)
const companyName = ref('')
const industry = ref('')
const companySize = ref<string | null>(null)

function switchTo(r: UserRole) {
  if (!authStore.switchRole(r))
    return
  snackbar.value = t('roleSwitcher.switched', { role: t(`roles.${r}`) })
  router.push({ name: roleHome(r) })
}

// السياسة: كل الأدوار فورية — والمعالجات (اعتماد المقيّم / ملف الانضمام)
// شارات جودة اختيارية تُقترح بعد التفعيل، لا بوابات دخول.
const QUALITY_PATH: Partial<Record<UserRole, { to: string, params?: Record<string, string>, hint: string }>> = {
  interviewer: { to: 'interviewer-register', hint: 'أكمل اعتماد الجودة لتحصل على شارة «مقيّم معتمد ✓» وترتفع في السوق' },
  coach: { to: 'role-join', params: { role: 'coach' }, hint: 'أكمل ملف الانضمام (خبرات وتزكيات) ليقوى عرضك في سوق الخبراء' },
  trainer: { to: 'role-join', params: { role: 'trainer' }, hint: 'أكمل ملف الانضمام (خبرات وتزكيات) ليقوى عرضك في سوق الخبراء' },
  consultant: { to: 'role-join', params: { role: 'consultant' }, hint: 'أكمل ملف الانضمام (خبرات وتزكيات) ليقوى عرضك في سوق الخبراء' },
}

function requestRole(r: UserRole) {
  requestDialog.value = false
  if (r === 'company') {
    companyDialog.value = true
    return
  }
  const entry = authStore.requestRole(r)
  if (entry?.status === 'pending') {
    // احتياط: إن أُعيدت بوابة الموافقة لأي دور مستقبلًا يدخل طابور الاعتماد
    const requests = useRoleRequestsStore()
    const req = requests.add(r, `طلب دور ${t(`roles.${r}`)} عبر مبدّل الأدوار`, true)
    requests.simulatePlatformReview(req.id)
    snackbar.value = t('roleSwitcher.pendingNote')
    return
  }
  useGamificationStore().record('roleActivated', t('roleSwitcher.activated', { role: t(`roles.${r}`) }))
  snackbar.value = t('roleSwitcher.activated', { role: t(`roles.${r}`) })
  const quality = QUALITY_PATH[r]
  if (quality) {
    notifications.push({
      icon: 'mdi-check-decagram-outline',
      color: 'info',
      title: `دورك «${t(`roles.${r}`)}» نشط — والشارة تنتظرك`,
      body: quality.hint,
      category: 'system',
      actionTo: quality.params ? `/join/${quality.params.role}` : '/interviewers/register',
      actionLabel: 'ابدأ مسار الشارة',
    })
  }
  switchTo(r)
}

function activateCompany() {
  if (!companyName.value.trim())
    return
  // Draft adopted by the employer profile store (Phase 3 of the multi-role plan)
  localStorage.setItem('employerProfile', JSON.stringify({
    company_name: companyName.value.trim(),
    industry: industry.value.trim() || undefined,
    company_size: companySize.value ?? undefined,
  }))
  authStore.requestRole('company')
  useGamificationStore().record('roleActivated', t('roleSwitcher.activated', { role: t('roles.company') }))
  companyDialog.value = false
  notifications.push({
    icon: 'mdi-office-building-outline',
    color: 'success',
    title: t('roleSwitcher.activated', { role: t('roles.company') }),
    body: companyName.value.trim(),
    category: 'system',
  })
  switchTo('company')
}
</script>

<template>
  <div>
    <!-- Owned roles -->
    <VListSubheader>{{ t('roleSwitcher.myRoles') }}</VListSubheader>
    <VListItem
      v-for="r in ownedRoles"
      :key="r"
      :prepend-icon="ROLE_META[r].icon"
      :title="t(`roles.${r}`)"
      :disabled="authStore.roleStatus(r) === 'pending'"
      :active="authStore.role === r"
      color="primary"
      density="compact"
      @click="authStore.role !== r && switchTo(r)"
    >
      <template #append>
        <VChip v-if="authStore.role === r" size="x-small" color="primary" label>
          {{ t('roleSwitcher.active') }}
        </VChip>
        <VChip v-else-if="authStore.roleStatus(r) === 'pending'" size="x-small" color="warning" label>
          {{ t('roleSwitcher.pending') }}
        </VChip>
      </template>
    </VListItem>

    <!-- Request a new role -->
    <VListItem
      v-if="requestableRoles.length"
      prepend-icon="mdi-plus-circle-outline"
      :title="t('roleSwitcher.requestNew')"
      density="compact"
      base-color="secondary"
      @click="requestDialog = true"
    />

    <!-- New-role picker -->
    <VDialog v-model="requestDialog" max-width="440">
      <VCard rounded="lg">
        <VCardTitle class="text-subtitle-1 font-weight-bold">
          {{ t('roleSwitcher.requestTitle') }}
        </VCardTitle>
        <VCardSubtitle class="text-wrap">
          {{ t('roleSwitcher.requestHint') }}
        </VCardSubtitle>
        <VCardText class="pt-2">
          <VCard
            v-for="r in requestableRoles"
            :key="r"
            variant="outlined"
            rounded="lg"
            class="pa-3 mb-2 cursor-pointer"
            @click="requestRole(r)"
          >
            <div class="d-flex align-center ga-3">
              <VAvatar color="primary" variant="tonal" size="40">
                <VIcon :icon="ROLE_META[r].icon" />
              </VAvatar>
              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-bold">
                  {{ t(`roles.${r}`) }}
                  <VChip v-if="ROLE_META[r].activation === 'approval'" size="x-small" color="warning" label class="ms-1">
                    {{ t('roleSwitcher.pending') }}
                  </VChip>
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ t(`roleSwitcher.${r}Desc`) }}
                </div>
              </div>
              <VIcon icon="mdi-chevron-left" class="flip-in-ltr" />
            </div>
          </VCard>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Employer activation mini-form -->
    <VDialog v-model="companyDialog" max-width="440">
      <VCard rounded="lg">
        <VCardTitle class="text-subtitle-1 font-weight-bold">
          {{ t('roleSwitcher.companyFormTitle') }}
        </VCardTitle>
        <VCardText>
          <VTextField v-model="companyName" :label="t('roleSwitcher.companyName')" prepend-inner-icon="mdi-office-building-outline" class="mb-3" />
          <VTextField v-model="industry" :label="t('roleSwitcher.industry')" prepend-inner-icon="mdi-tag-outline" class="mb-3" />
          <VSelect v-model="companySize" :items="COMPANY_SIZES" :label="t('roleSwitcher.companySize')" prepend-inner-icon="mdi-account-group-outline" clearable />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="companyDialog = false">
            {{ t('common.cancel') }}
          </VBtn>
          <VBtn color="primary" variant="flat" :disabled="!companyName.trim()" @click="activateCompany">
            {{ t('roleSwitcher.activate') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar :model-value="!!snackbar" color="success" timeout="2500" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.flip-in-ltr {
  transform: scaleX(var(--dir-flip, 1));
}
[dir='ltr'] .flip-in-ltr {
  --dir-flip: -1;
}
</style>
