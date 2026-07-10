<script setup lang="ts">
import { ref, watch } from 'vue'
import { THEME_PRESETS } from '@/services/themePresets'
import { isValidHex } from '@/services/themePresets'
import { useThemeStore } from '@/stores/ThemeStore'
import type { ThemeMode } from '@/stores/ThemeStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

// عرض أقصى قابل للتمرير (مركز الإعدادات يمرّر 100% كي يملأ التبويب العريض)
const props = withDefaults(defineProps<{ maxWidth?: string }>(), { maxWidth: '420px' })

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
  <BaseCard class="w-full" :style="{ maxWidth: props.maxWidth }">
    <div class="mb-4 flex items-center gap-2">
      <BaseIcon name="mdi-palette-outline" :size="22" :style="{ color: 'rgb(var(--v-theme-primary))' }" />
      <h3 class="text-base font-bold text-content">تخصيص المظهر</h3>
    </div>

    <!-- الوضع -->
    <div class="mb-2 text-sm font-bold text-content">وضع العرض</div>
    <div class="seg mb-4 w-full">
      <button
        v-for="m in MODES"
        :key="m.value"
        type="button"
        class="seg-btn flex flex-1 items-center justify-center gap-1"
        :class="{ 'is-active': themeStore.mode === m.value }"
        @click="themeStore.setMode(m.value)"
      >
        <BaseIcon :name="m.icon" :size="16" />
        {{ m.label }}
      </button>
    </div>
    <p v-if="themeStore.isMixed" class="-mt-2 mb-3 text-xs text-muted">
      المختلط: محتوى فاتح مع قوائم وشريط علوي داكنين.
    </p>

    <!-- الهويات الخمس -->
    <div class="mb-2 text-sm font-bold text-content">الهوية اللونية</div>
    <div class="mb-4 flex flex-col gap-1">
      <button
        v-for="p in THEME_PRESETS"
        :key="p.id"
        type="button"
        class="preset-row flex cursor-pointer items-center gap-3 rounded-ui p-2 text-start"
        :class="{ 'preset-active': themeStore.presetId === p.id }"
        @click="themeStore.setPreset(p.id)"
      >
        <span class="preset-swatch" :style="swatchStyle(p.id)" />
        <span class="flex-1 text-sm text-content">{{ p.name }}</span>
        <BaseIcon v-if="themeStore.presetId === p.id" name="mdi-check-circle" :size="20" :style="{ color: 'rgb(var(--v-theme-primary))' }" />
      </button>
    </div>

    <!-- الألوان المخصصة -->
    <div class="mb-2 flex items-center gap-2">
      <span class="text-sm font-bold text-content">ألوان مخصصة</span>
      <BaseChip color="emerald">تتجاوز الهوية المختارة</BaseChip>
    </div>
    <div class="mb-1 flex gap-2">
      <BaseInput
        v-model="primaryHex"
        label="الأساسي"
        placeholder="#A3E635"
        dir="ltr"
        class="flex-1"
        @change="applyHex('primary', primaryHex)"
      >
        <template #suffix>
          <label class="color-well" :style="{ background: themeStore.customPrimary ?? 'transparent' }">
            <input type="color" :value="themeStore.customPrimary ?? '#A3E635'" @input="e => applyHex('primary', (e.target as HTMLInputElement).value)">
          </label>
        </template>
      </BaseInput>
      <BaseInput
        v-model="secondaryHex"
        label="الثانوي"
        placeholder="#34D399"
        dir="ltr"
        class="flex-1"
        @change="applyHex('secondary', secondaryHex)"
      >
        <template #suffix>
          <label class="color-well" :style="{ background: themeStore.customSecondary ?? 'transparent' }">
            <input type="color" :value="themeStore.customSecondary ?? '#34D399'" @input="e => applyHex('secondary', (e.target as HTMLInputElement).value)">
          </label>
        </template>
      </BaseInput>
    </div>
    <p class="mb-2 text-xs text-muted">لون النص المقابل يُحسب تلقائيًا لضمان التباين.</p>
    <BaseButton
      v-if="themeStore.customPrimary || themeStore.customSecondary"
      size="sm"
      variant="tonal-brand"
      @click="themeStore.resetCustom()"
    >
      <BaseIcon name="mdi-restore" :size="16" />
      العودة لألوان الهوية
    </BaseButton>
  </BaseCard>
</template>

<style scoped>
.preset-row {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
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
  border: 2px solid rgba(var(--v-theme-on-surface), 0.2);
}
.color-well {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.3);
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
