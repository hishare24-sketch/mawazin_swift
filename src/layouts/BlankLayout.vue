<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()

const canGoBack = computed(() => {
  void route.fullPath
  return !!(window.history.state && window.history.state.back)
})
const backIcon = computed(() => (locale.value === 'ar' ? 'mdi-arrow-right' : 'mdi-arrow-left'))
function goBack() {
  router.back()
}
</script>

<template>
  <VMain class="bg-background position-relative">
    <VBtn
      v-show="canGoBack"
      :prepend-icon="backIcon"
      variant="tonal"
      color="primary"
      size="small"
      class="position-fixed"
      style="top: 16px; inset-inline-start: 16px; z-index: 5"
      @click="goBack"
    >
      {{ t('common.back') }}
    </VBtn>
    <slot />
  </VMain>
</template>
