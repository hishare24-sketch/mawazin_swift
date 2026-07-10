<script setup lang="ts">
import { ref, watch } from 'vue'
import { isValidHex } from '@/services/themePresets'
import BaseInput from '@/components/ui/BaseInput.vue'

// حقل لون موحّد: تسمية + إدخال HEX متحقَّق منه + منتقٍ لونيّ أصليّ (swatch).
// يوحّد تجربة اختيار اللون بين محرّر ثيم المنصّة ومحرّر ثيم الصفحة التعريفية.
const props = defineProps<{ modelValue?: string, label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const hex = ref(props.modelValue ?? '')
watch(() => props.modelValue, v => (hex.value = v ?? ''))

function commit(v: string) {
  const t = v.trim()
  if (!t)
    return
  const h = t.startsWith('#') ? t : `#${t}`
  if (isValidHex(h))
    emit('update:modelValue', h)
}
</script>

<template>
  <BaseInput
    v-model="hex"
    :label="label"
    placeholder="#000000"
    dir="ltr"
    @change="commit(hex)"
  >
    <template #suffix>
      <label class="cf-well" :style="{ background: modelValue || 'transparent' }">
        <input
          type="color"
          :value="modelValue || '#000000'"
          @input="e => emit('update:modelValue', (e.target as HTMLInputElement).value)"
        >
      </label>
    </template>
  </BaseInput>
</template>

<style scoped>
.cf-well {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.3);
  overflow: hidden;
  cursor: pointer;
  display: inline-block;
}
.cf-well input[type='color'] {
  width: 200%;
  height: 200%;
  transform: translate(-25%, -25%);
  border: none;
  padding: 0;
  cursor: pointer;
}
</style>
