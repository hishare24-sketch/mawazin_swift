<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import BaseConfirm from '@/components/ui/BaseConfirm.vue'
import AdminCommandPalette from '@/modules/admin/components/AdminCommandPalette.vue'
import { ADMIN_NAV } from '@/layouts/adminNavigation'
import { useAuthStore } from '@/stores/AuthStore'
import { useThemeStore } from '@/stores/ThemeStore'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const auth = useAuthStore()
const themeStore = useThemeStore()

const RAIL_KEY = 'adminRail'
const collapsed = ref(localStorage.getItem(RAIL_KEY) === '1')
const mobileOpen = ref(false)
function toggleRail() {
  collapsed.value = !collapsed.value
  localStorage.setItem(RAIL_KEY, collapsed.value ? '1' : '0')
}

const palette = ref<InstanceType<typeof AdminCommandPalette>>()

// أقسام التنقّل المصرّح بها فقط
const visibleGroups = computed(() =>
  ADMIN_NAV
    .map(g => ({ ...g, items: g.items.filter(it => !it.permission || auth.hasPermission(it.permission)) }))
    .filter(g => g.items.length),
)

const currentTitle = computed(() => {
  const item = ADMIN_NAV.flatMap(g => g.items).find(it => it.to === route.name)
  return item ? t(item.title) : (route.meta.title ? t(route.meta.title as string) : '')
})

const isDark = computed(() => themeStore.isDark)
function toggleTheme() { themeStore.toggleDark() }
function toggleLocale() { locale.value = locale.value === 'ar' ? 'en' : 'ar' }
function isActive(name: string) { return route.name === name }

const adminUser = computed(() => auth.authUser)
function logout() {
  auth.clearAuthUser()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="admin-shell flex min-h-screen bg-bg text-content">
    <!-- خلفيّة تعتيم للموبايل -->
    <div v-if="mobileOpen" class="fixed inset-0 z-30 bg-black/50 md:hidden" @click="mobileOpen = false" />

    <!-- القائمة الجانبيّة -->
    <aside
      class="admin-side fixed z-40 flex h-screen shrink-0 flex-col border-e border-ui bg-surface transition-all md:sticky md:top-0 md:translate-x-0"
      :class="[
        collapsed ? 'w-[76px]' : 'w-[264px]',
        mobileOpen ? 'translate-x-0' : 'rtl:translate-x-full ltr:-translate-x-full md:!translate-x-0',
      ]"
    >
      <!-- ترويسة العلامة -->
      <div class="flex h-16 items-center gap-2.5 border-b border-ui px-4">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-ui bg-brand text-on-brand">
          <BaseIcon name="mdi-shield-crown-outline" :size="22" />
        </span>
        <div v-if="!collapsed" class="min-w-0">
          <div class="truncate text-sm font-extrabold">{{ t('admin.consoleTitle') }}</div>
          <div class="truncate text-[11px] text-muted">{{ t('admin.consoleSubtitle') }}</div>
        </div>
      </div>

      <!-- التنقّل -->
      <nav class="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <div v-for="g in visibleGroups" :key="g.key">
          <div v-if="!collapsed" class="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted">
            {{ t(g.titleKey) }}
          </div>
          <RouterLink
            v-for="it in g.items"
            :key="it.to"
            :to="{ name: it.to }"
            class="admin-navlink"
            :class="{ 'admin-navlink-active': isActive(it.to), 'justify-center': collapsed }"
            :title="collapsed ? t(it.title) : undefined"
            @click="mobileOpen = false"
          >
            <BaseIcon :name="it.icon" :size="21" />
            <span v-if="!collapsed" class="truncate">{{ t(it.title) }}</span>
          </RouterLink>
        </div>
      </nav>

      <!-- تذييل: العودة للتطبيق -->
      <div class="border-t border-ui p-3">
        <RouterLink to="/dashboard" class="admin-navlink" :class="{ 'justify-center': collapsed }" :title="collapsed ? t('admin.backToApp') : undefined">
          <BaseIcon name="mdi-arrow-left-circle-outline" :size="21" />
          <span v-if="!collapsed" class="truncate">{{ t('admin.backToApp') }}</span>
        </RouterLink>
      </div>
    </aside>

    <!-- العمود الرئيسيّ -->
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- الشريط العلويّ -->
      <header class="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-ui bg-surface/95 px-3 backdrop-blur md:px-5">
        <button class="admin-iconbtn md:hidden" aria-label="القائمة" @click="mobileOpen = true">
          <BaseIcon name="mdi-menu" :size="22" />
        </button>
        <button class="admin-iconbtn hidden md:inline-flex" aria-label="طيّ القائمة" @click="toggleRail">
          <BaseIcon name="mdi-format-indent-decrease" :size="20" />
        </button>

        <!-- مسار التنقّل -->
        <nav class="flex items-center gap-1.5 text-sm" aria-label="مسار">
          <span class="font-bold text-muted">{{ t('admin.brand') }}</span>
          <BaseIcon name="mdi-chevron-left" :size="16" class="text-muted rtl:hidden" />
          <BaseIcon name="mdi-chevron-right" :size="16" class="text-muted ltr:hidden" />
          <span class="font-bold text-content">{{ currentTitle }}</span>
        </nav>

        <span class="flex-1" />

        <!-- زرّ لوحة الأوامر -->
        <button class="cmd-trigger" @click="palette?.open()">
          <BaseIcon name="mdi-magnify" :size="17" />
          <span class="hidden sm:inline">{{ t('admin.search') }}</span>
          <kbd class="cmd-hint">⌘K</kbd>
        </button>

        <button class="admin-iconbtn font-bold" :aria-label="t('admin.language')" @click="toggleLocale">
          {{ locale === 'ar' ? 'EN' : 'ع' }}
        </button>
        <button class="admin-iconbtn" :aria-label="t('admin.theme')" @click="toggleTheme">
          <BaseIcon :name="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'" :size="21" />
        </button>

        <BaseDropdown align="end">
          <template #trigger="{ toggle }">
            <button class="flex items-center gap-2 rounded-full py-1 ps-1 pe-2 hover:bg-surfalt" @click="toggle">
              <span class="grid h-8 w-8 place-items-center rounded-full bg-brand/15 text-sm font-bold text-brand">
                {{ (adminUser?.name || 'A').charAt(0) }}
              </span>
              <span class="hidden max-w-[120px] truncate text-sm font-bold sm:inline">{{ adminUser?.name }}</span>
            </button>
          </template>
          <div class="min-w-[180px] p-1">
            <RouterLink to="/dashboard" class="menu-row"><BaseIcon name="mdi-application-outline" :size="18" />{{ t('admin.backToApp') }}</RouterLink>
            <button class="menu-row w-full" style="color: rgb(var(--v-theme-error))" @click="logout">
              <BaseIcon name="mdi-logout" :size="18" />{{ t('admin.logout') }}
            </button>
          </div>
        </BaseDropdown>
      </header>

      <!-- المحتوى -->
      <main class="flex-1 overflow-x-hidden px-3 py-5 md:px-6 md:py-7">
        <div class="mx-auto max-w-[1400px]">
          <slot />
        </div>
      </main>
    </div>

    <AdminCommandPalette ref="palette" />
    <BaseConfirm />
  </div>
</template>

<style scoped>
.admin-navlink {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.72);
  transition: background-color 0.15s ease, color 0.15s ease;
}
.admin-navlink:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
  color: rgb(var(--v-theme-on-surface));
}
.admin-navlink-active {
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}
.admin-iconbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  color: rgba(var(--v-theme-on-surface), 0.75);
  transition: background-color 0.15s ease;
}
.admin-iconbtn:hover {
  background: rgba(var(--v-theme-on-surface), 0.07);
}
.cmd-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  transition: border-color 0.15s ease;
}
.cmd-trigger:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.cmd-hint {
  font-size: 0.68rem;
  padding: 1px 5px;
  border-radius: 5px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
}
.menu-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
}
.menu-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
</style>
