<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import BlankLayout from '@/layouts/BlankLayout.vue'
import FormsLayout from '@/layouts/FormsLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useThemeStore } from '@/stores/ThemeStore'
import { useAuthStore } from '@/stores/AuthStore'
import { api } from '@/services/api'

const route = useRoute()

// يزامن صلاحيّات الأدمن من الخادم مرّة عند الإقلاع — فتظهر الميزات الإداريّة الجديدة
// بمجرّد إعادة التحميل بلا تسجيل خروج/دخول.
const authStore = useAuthStore()
const { locale } = useI18n()
const theme = useTheme()

// Dynamic theming: bind the store to Vuetify's theme engine and apply the
// persisted preset/mode/custom colors before first paint
const themeStore = useThemeStore()
themeStore.bind(theme)

onMounted(async () => {
  // يزامن صلاحيّات الأدمن من الخادم — فتظهر الميزات الإداريّة الجديدة بإعادة التحميل بلا تسجيل دخول.
  authStore.syncPermissions()
  // هويّة المنصّة الافتراضيّة — تُطبَّق فقط إن لم يخصّص المستخدم ثيمه بعد.
  if (!localStorage.getItem('themePrefs')) {
    try {
      const b = await api.branding()
      if (b) {
        themeStore.setPreset(b.preset)
        themeStore.setMode(b.mode)
        if (b.primaryColor)
          themeStore.setCustomPrimary(b.primaryColor)
        if (b.secondaryColor)
          themeStore.setCustomSecondary(b.secondaryColor)
        themeStore.apply()
      }
    }
    catch { /* الثيم الافتراضيّ */ }
  }
})

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
