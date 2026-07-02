<script setup lang="ts">
import { ref, watch } from 'vue'
import { THEME_PRESETS } from '@/services/themePresets'
import { isValidHex } from '@/services/themePresets'
import { useThemeStore } from '@/stores/ThemeStore'
import type { ThemeMode } from '@/stores/ThemeStore'

const themeStore = useThemeStore()

const MODES: { value: ThemeMode, label: string, icon: string }[] = [
  { value: 'dark', label: 'داكن', icon: 'mdi-weather-night' },
  { value: 'light', label: 'فاتح', icon: 'mdi-weather-sunny' },
  { value: 'mixed', label: 'مختلط', icon: 'mdi-circle-half-full' },
]

// حقول hex حرة مع تحقق — أسهل طريقة مرنة للتخصيص، مع منتقي لوني أصلي
const primaryHex = ref(themeStore.customPrimary ?? '')
const secondaryHex = ref(themeStore.customSecondary ?? '')
watch(() => themeStore.customPrimary, v => (primaryHex.value = v ?? ''))
watch(() => themeStore.customSecondary, v => (secondaryHex.value = v ?? ''))

function applyHex(kind: 'primary' | 'secondary', value: string) {
  const v = value.trim()
  if (!v) {
    kind === 'primary' ? themeStore.setCustomPrimary(null) : themeStore.setCustomSecondary(null)
    return
  }
  const hex = v.startsWith('#') ? v : `#${v}`
  if (isValidHex(hex))
    kind === 'primary' ? themeStore.setCustomPrimary(hex) : themeStore.setCustomSecondary(hex)
}

// swatch يعرض لوني الهوية معًا (النصف الأيمن primary والأيسر secondary)
function swatchStyle(presetId: string) {
  const p = THEME_PRESETS.find(x => x.id === presetId)!
  const pal = themeStore.isDark ? p.dark : p.light
  return { background: `linear-gradient(135deg, ${pal.primary} 50%, ${pal.secondary} 50%)` }
}
</script>

<template>
  <VCard class="pa-5" min-width="340" max-width="420">
    <div class="d-flex align-center ga-2 mb-4">
      <VIcon icon="mdi-palette-outline" color="primary" />
      <h3 class="text-subtitle-1 font-weight-bold">تخصيص المظهر</h3>
    </div>

    <!-- الوضع -->
    <div class="text-body-2 font-weight-bold mb-2">وضع العرض</div>
    <VBtnToggle
      :model-value="themeStore.mode"
      mandatory
      density="comfortable"
      color="primary"
      variant="outlined"
      divided
      class="mb-4 w-100"
      @update:model-value="m => themeStore.setMode(m as ThemeMode)"
    >
      <VBtn v-for="m in MODES" :key="m.value" :value="m.value" class="flex-grow-1" :prepend-icon="m.icon" size="small">
        {{ m.label }}
      </VBtn>
    </VBtnToggle>
    <p v-if="themeStore.isMixed" class="text-caption text-medium-emphasis mt-n2 mb-3">
      المختلط: محتوى فاتح مع قوائم وشريط علوي داكنين.
    </p>

    <!-- الهويات الخمس -->
    <div class="text-body-2 font-weight-bold mb-2">الهوية اللونية</div>
    <div class="d-flex flex-column ga-1 mb-4">
      <div
        v-for="p in THEME_PRESETS"
        :key="p.id"
        class="preset-row d-flex align-center ga-3 pa-2 rounded-lg cursor-pointer"
        :class="{ 'preset-active': themeStore.presetId === p.id }"
        @click="themeStore.setPreset(p.id)"
      >
        <span class="preset-swatch" :style="swatchStyle(p.id)" />
        <span class="text-body-2 flex-grow-1">{{ p.name }}</span>
        <VIcon v-if="themeStore.presetId === p.id" icon="mdi-check-circle" color="primary" size="20" />
      </div>
    </div>

    <!-- الألوان المخصصة -->
    <div class="d-flex align-center ga-2 mb-2">
      <span class="text-body-2 font-weight-bold">ألوان مخصصة</span>
      <VChip size="x-small" variant="tonal" color="secondary" label>تتجاوز الهوية المختارة</VChip>
    </div>
    <div class="d-flex ga-2 mb-1">
      <VTextField
        v-model="primaryHex"
        label="الأساسي"
        placeholder="#A3E635"
        density="compact"
        hide-details
        dir="ltr"
        @change="applyHex('primary', primaryHex)"
      >
        <template #prepend-inner>
          <label class="color-well" :style="{ background: themeStore.customPrimary ?? 'transparent' }">
            <input type="color" :value="themeStore.customPrimary ?? '#A3E635'" @input="e => applyHex('primary', (e.target as HTMLInputElement).value)">
          </label>
        </template>
      </VTextField>
      <VTextField
        v-model="secondaryHex"
        label="الثانوي"
        placeholder="#34D399"
        density="compact"
        hide-details
        dir="ltr"
        @change="applyHex('secondary', secondaryHex)"
      >
        <template #prepend-inner>
          <label class="color-well" :style="{ background: themeStore.customSecondary ?? 'transparent' }">
            <input type="color" :value="themeStore.customSecondary ?? '#34D399'" @input="e => applyHex('secondary', (e.target as HTMLInputElement).value)">
          </label>
        </template>
      </VTextField>
    </div>
    <p class="text-caption text-medium-emphasis mb-2">لون النص المقابل يُحسب تلقائيًا لضمان التباين.</p>
    <VBtn
      v-if="themeStore.customPrimary || themeStore.customSecondary"
      size="small"
      variant="tonal"
      prepend-icon="mdi-restore"
      @click="themeStore.resetCustom()"
    >
      العودة لألوان الهوية
    </VBtn>
  </VCard>
</template>

<style scoped>
.preset-row {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.preset-row:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
.preset-active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}
.preset-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid rgba(var(--v-border-color), 0.2);
}
.color-well {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  overflow: hidden;
  cursor: pointer;
  display: inline-block;
}
.color-well input[type='color'] {
  width: 200%;
  height: 200%;
  transform: translate(-25%, -25%);
  border: none;
  padding: 0;
  cursor: pointer;
}
</style>
