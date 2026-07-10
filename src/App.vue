<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import BlankLayout from '@/layouts/BlankLayout.vue'
import FormsLayout from '@/layouts/FormsLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useThemeStore } from '@/stores/ThemeStore'

const route = useRoute()
const { locale } = useI18n()
const theme = useTheme()

// Dynamic theming: bind the store to Vuetify's theme engine and apply the
// persisted preset/mode/custom colors before first paint
const themeStore = useThemeStore()
themeStore.bind(theme)

const layouts = {
  default: DefaultLayout,
  blank: BlankLayout,
  forms: FormsLayout,
  admin: AdminLayout,
}

const layoutComponent = computed(() => {
  const layout = (route.meta.layout as keyof typeof layouts) || 'blank'
  return layouts[layout] ?? BlankLayout
})

// Keep <html> dir/lang in sync with locale
watch(
  locale,
  (value) => {
    const dir = value === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', value)
    localStorage.setItem('locale', value)
  },
  { immediate: true },
)

</script>

<template>
  <VApp :theme="themeStore.activeThemeName">
    <Component :is="layoutComponent">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <Component :is="Component" />
        </Transition>
      </RouterView>
    </Component>
  </VApp>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (prefers-reduced-motion: reduce) {
  .fade-enter-from,
  .fade-leave-to {
    transform: none;
  }
}
</style>
