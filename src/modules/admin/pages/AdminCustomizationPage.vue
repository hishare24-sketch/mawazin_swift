<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/shared/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import { type Branding, api } from '@/services/api'
import { useAuthStore } from '@/stores/AuthStore'
import { useThemeStore } from '@/stores/ThemeStore'
import { THEME_PRESETS } from '@/services/themePresets'

const { t } = useI18n()
const auth = useAuthStore()
const theme = useThemeStore()
const canManage = computed(() => auth.hasPermission('manage_branding'))

const form = ref<Branding | null>(null)
const snack = ref({ show: false, text: '', color: 'success' })
function toast(text: string, color = 'success') { snack.value = { show: true, text, color } }
function fail(e: unknown) { toast((e as { message?: string })?.message ?? t('admin.toast.failed'), 'error') }

const PRESETS = computed(() => THEME_PRESETS.map(p => ({ value: p.id, title: p.name })))
const MODES = computed(() => [
  { value: 'dark', title: t('admin.branding.modeDark') },
  { value: 'light', title: t('admin.branding.modeLight') },
  { value: 'mixed', title: t('admin.branding.modeMixed') },
])

async function load() {
  try { form.value = await api.admin.branding() }
  catch (e) { fail(e) }
}
onMounted(load)

/** معاينة حيّة موصولة بمحرّك الثيم الفعليّ — تعيد تلوين الكونسول فورًا. */
function applyPreview() {
  if (!form.value)
    return
  theme.setPreset(form.value.preset)
  theme.setMode(form.value.mode)
  theme.setCustomPrimary(form.value.primaryColor || null)
  theme.setCustomSecondary(form.value.secondaryColor || null)
  theme.apply()
}

const saving = ref(false)
async function save() {
  if (!form.value)
    return
  saving.value = true
  try {
    form.value = await api.admin.updateBranding({
      platform_name: form.value.platformName,
      tagline: form.value.tagline,
      logo_url: form.value.logoUrl,
      default_preset: form.value.preset,
      primary_color: form.value.primaryColor,
      secondary_color: form.value.secondaryColor,
      default_mode: form.value.mode,
      login_headline: form.value.loginHeadline,
      login_subtext: form.value.loginSubtext,
    })
    applyPreview()
    toast(t('admin.branding.saved'))
  }
  catch (e) { fail(e) }
  finally { saving.value = false }
}
</script>

<template>
  <div v-if="form">
    <PageHeader :title="t('admin.branding.title')" :subtitle="t('admin.branding.subtitle')" icon="mdi-palette-outline">
      <template #actions>
        <BaseButton variant="brand" size="sm" :disabled="!canManage || saving" @click="save"><BaseIcon name="mdi-content-save-outline" :size="18" />{{ t('admin.branding.save') }}</BaseButton>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- الهويّة -->
      <BaseCard>
        <h2 class="mb-3 flex items-center gap-2 font-bold text-content"><BaseIcon name="mdi-card-account-details-outline" :size="20" class="text-brand" />{{ t('admin.branding.identity') }}</h2>
        <div class="space-y-3">
          <BaseInput v-model="form.platformName" :label="t('admin.branding.platformName')" :disabled="!canManage" />
          <BaseInput v-model="form.tagline as string" :label="t('admin.branding.tagline')" :disabled="!canManage" />
          <BaseInput v-model="form.logoUrl as string" :label="t('admin.branding.logoUrl')" placeholder="https://..." :disabled="!canManage" />
          <div v-if="form.logoUrl" class="flex items-center gap-2 rounded-ui border-ui p-2">
            <img :src="form.logoUrl" :alt="form.platformName" class="h-8 max-w-[140px] object-contain" @error="() => {}">
            <span class="text-xs text-muted">{{ t('admin.branding.logoPreview') }}</span>
          </div>
        </div>
      </BaseCard>

      <!-- الثيم والألوان -->
      <BaseCard>
        <h2 class="mb-3 flex items-center gap-2 font-bold text-content"><BaseIcon name="mdi-palette-swatch-outline" :size="20" class="text-brand" />{{ t('admin.branding.theme') }}</h2>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-sm text-muted">{{ t('admin.branding.preset') }}</label>
            <BaseSelect :model-value="form.preset" :items="PRESETS" :disabled="!canManage" @update:model-value="v => { if (form) form.preset = v as string }" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-muted">{{ t('admin.branding.mode') }}</label>
            <BaseSelect :model-value="form.mode" :items="MODES" :disabled="!canManage" @update:model-value="v => { if (form) form.mode = v as 'dark' | 'light' | 'mixed' }" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm text-muted">{{ t('admin.branding.primary') }}</label>
              <div class="flex items-center gap-2">
                <input type="color" :value="form.primaryColor || '#f5c518'" class="h-9 w-12 cursor-pointer rounded-ui border-ui" :disabled="!canManage" @input="e => { if (form) form.primaryColor = (e.target as HTMLInputElement).value }">
                <BaseInput v-model="form.primaryColor as string" placeholder="#RRGGBB" :disabled="!canManage" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm text-muted">{{ t('admin.branding.secondary') }}</label>
              <div class="flex items-center gap-2">
                <input type="color" :value="form.secondaryColor || '#22c55e'" class="h-9 w-12 cursor-pointer rounded-ui border-ui" :disabled="!canManage" @input="e => { if (form) form.secondaryColor = (e.target as HTMLInputElement).value }">
                <BaseInput v-model="form.secondaryColor as string" placeholder="#RRGGBB" :disabled="!canManage" />
              </div>
            </div>
          </div>
          <BaseButton variant="outline" size="sm" :disabled="!canManage" @click="applyPreview"><BaseIcon name="mdi-eye-outline" :size="16" />{{ t('admin.branding.livePreview') }}</BaseButton>
          <p class="text-[11px] text-muted">{{ t('admin.branding.previewNote') }}</p>
        </div>
      </BaseCard>

      <!-- معاينة العلامة -->
      <BaseCard>
        <h2 class="mb-3 flex items-center gap-2 font-bold text-content"><BaseIcon name="mdi-monitor-eye" :size="20" class="text-brand" />{{ t('admin.branding.brandPreview') }}</h2>
        <div class="rounded-ui border-ui p-4">
          <div class="mb-3 flex items-center gap-2">
            <img v-if="form.logoUrl" :src="form.logoUrl" class="h-7 object-contain" @error="() => {}">
            <BaseIcon v-else name="mdi-briefcase-check-outline" :size="24" class="text-brand" />
            <span class="text-lg font-bold text-content">{{ form.platformName }}</span>
          </div>
          <p v-if="form.tagline" class="mb-3 text-sm text-muted">{{ form.tagline }}</p>
          <div class="flex flex-wrap gap-2">
            <BaseButton variant="brand" size="sm">{{ t('admin.branding.sampleBtn') }}</BaseButton>
            <BaseChip color="brand">brand</BaseChip>
            <BaseChip color="success">success</BaseChip>
            <BaseChip color="accent">accent</BaseChip>
          </div>
        </div>
      </BaseCard>

      <!-- صفحة الدخول -->
      <BaseCard>
        <h2 class="mb-3 flex items-center gap-2 font-bold text-content"><BaseIcon name="mdi-login-variant" :size="20" class="text-brand" />{{ t('admin.branding.loginPage') }}</h2>
        <div class="space-y-3">
          <BaseInput v-model="form.loginHeadline as string" :label="t('admin.branding.loginHeadline')" :disabled="!canManage" />
          <BaseInput v-model="form.loginSubtext as string" :label="t('admin.branding.loginSubtext')" :disabled="!canManage" />
        </div>
        <div class="mt-3 rounded-ui p-4 text-center" style="background: rgba(var(--v-theme-primary),0.06)">
          <div class="text-base font-bold text-content">{{ form.loginHeadline || form.platformName }}</div>
          <div class="mt-1 text-xs text-muted">{{ form.loginSubtext || '—' }}</div>
        </div>
      </BaseCard>
    </div>

    <BaseSnackbar v-model="snack.show" :color="snack.color">{{ snack.text }}</BaseSnackbar>
  </div>
</template>
