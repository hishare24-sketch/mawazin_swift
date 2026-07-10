<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { authService } from '@/modules/auth/services/AuthService'
import { useAuthStore } from '@/stores/AuthStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { useMessagesStore } from '@/stores/MessagesStore'
import { useGamificationStore } from '@/stores/GamificationStore'
import GlobalSearchBar from '@/components/shared/GlobalSearchBar.vue'
import RewardFeedback from '@/components/shared/RewardFeedback.vue'
import RoleSwitcher from '@/components/shared/RoleSwitcher.vue'
import ThemeCustomizer from '@/components/shared/ThemeCustomizer.vue'
import WhatsNewDialog from '@/components/shared/WhatsNewDialog.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import { useThemeStore } from '@/stores/ThemeStore'
import { usePeerRequestsStore } from '@/stores/PeerRequestsStore'
import { useWalletStore } from '@/stores/WalletStore'
import { useDelegationStore } from '@/stores/DelegationStore'
import { useUnifiedHubStore } from '@/stores/UnifiedHubStore'
import { navSections } from './navigation'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()

// Global back navigation — shown only when a previous screen exists
const canGoBack = computed(() => {
  void route.fullPath // re-evaluate on every navigation
  return !!(window.history.state && window.history.state.back)
})
const backIcon = computed(() => (locale.value === 'ar' ? 'mdi-arrow-right' : 'mdi-arrow-left'))
function goBack() {
  if (canGoBack.value)
    router.back()
  else
    router.push({ name: 'dashboard' })
}
const { mobile } = useDisplay()
const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const messagesStore = useMessagesStore()
const walletStore = useWalletStore()

// Daily streak check-in — runs once when an authenticated layout mounts
useGamificationStore().checkIn()

// Live badge counts for nav items (e.g. pending peer requests)
const peerRequests = usePeerRequestsStore()
function navBadge(to: string): number {
  if (to === 'peer-requests')
    return peerRequests.pendingIncoming
  return 0
}

// On desktop the drawer is permanent (open by default); on mobile it starts closed
const drawer = ref(!mobile.value)
const rail = ref(false)

// عرض القائمة الجانبية بالبكسل (مطوي rail على سطح المكتب فقط)
const sidebarW = computed(() => (rail.value && !mobile.value ? 76 : 270))

// Menu button: on mobile toggle the overlay drawer; on desktop toggle rail (collapse)
function onMenuClick() {
  if (mobile.value)
    drawer.value = !drawer.value
  else rail.value = !rail.value
}

const sections = computed(() => navSections(authStore.role, { multiRole: authStore.activeRoles.length >= 2 }))

// التحكم الكامل من القائمة الجانبية: ترويسة «مساحة الدور» تفتح مبدّل الأدوار inline
const roleControlOpen = ref(false)

// —— القائمة بنافذتين: تبويب «المنصة» (السوق الصافي) وتبويب «حسابي» (إدارتي + عملي) ——
const NAV_TAB_KEY = 'navActiveTab'
const activeNav = ref<'platform' | 'account'>((localStorage.getItem(NAV_TAB_KEY) as 'platform' | 'account') ?? 'platform')
watch(activeNav, v => localStorage.setItem(NAV_TAB_KEY, v))

const platformItems = computed(() => sections.value.find(g => g.section === 'platform')?.items ?? [])
const accountItems = computed(() => sections.value.find(g => g.section === 'account')?.items ?? [])
const roleItems = computed(() => sections.value.find(g => g.section === 'role')?.items ?? [])

// شارات عابرة للتبويبين: لا يفوتك شيء وأنت في النافذة الأخرى
const hub = useUnifiedHubStore()
const accountTabBadge = computed(() => hub.kpis.actionCount)
const platformTabBadge = computed(() => peerRequests.pendingIncoming)

// طي «مساحة الدور» داخل تبويب حسابي (محفوظ)
const NAV_COLLAPSED_KEY = 'navCollapsed'
const collapsedSections = ref<Record<string, boolean>>(JSON.parse(localStorage.getItem(NAV_COLLAPSED_KEY) ?? '{}'))
watch(collapsedSections, v => localStorage.setItem(NAV_COLLAPSED_KEY, JSON.stringify(v)), { deep: true })
function toggleSection(s: string) {
  collapsedSections.value = { ...collapsedSections.value, [s]: !collapsedSections.value[s] }
}

// —— طريقتا عرض للقائمة على الموبايل: قائمة تفصيلية أو شبكة أيقونات سريعة ——
const NAV_VIEW_KEY = 'navViewMode'
const navView = ref<'list' | 'grid'>((localStorage.getItem(NAV_VIEW_KEY) as 'list' | 'grid') ?? 'list')
watch(navView, v => localStorage.setItem(NAV_VIEW_KEY, v))
const gridMode = computed(() => mobile.value && navView.value === 'grid')

// الشريط العلوي = مبدّل الحسابات (شخصي / مفوَّضة)
const delegation = useDelegationStore()
function enterAccount(id: number) {
  if (delegation.enterAccount(id))
    router.push({ name: 'unified-hub' })
}
function exitDelegation() {
  if (delegation.exitDelegation())
    router.push({ name: 'unified-hub' })
}
const user = computed(() => authStore.authUser)
const roleLabel = computed(() => (authStore.role ? t(`roles.${authStore.role}`) : ''))

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.isDark)
// المختلط: القوائم داكنة والمحتوى فاتح — نلفّ القشرة بثيم داكن فتقرأ رموز Tailwind متغيّراته
const chromeThemeName = computed(() => (themeStore.isMixed ? 'darkTheme' : themeStore.activeThemeName))

function toggleTheme() {
  themeStore.toggleDark()
}

function toggleLocale() {
  locale.value = locale.value === 'ar' ? 'en' : 'ar'
}

function logout() {
  authService.logout() // ينهي جلسة Supabase أيضًا إن كانت مفعّلة
  authStore.clearAuthUser()
  router.push({ name: 'login' })
}

function closeDrawerOnMobile() {
  if (mobile.value)
    drawer.value = false
}

const initials = computed(() => {
  const name = user.value?.name ?? '?'
  return name.trim().charAt(0).toUpperCase()
})

// Scroll-to-top FAB — appears after scrolling down a long page
const showTop = ref(false)
function onScroll() {
  showTop.value = window.scrollY > 400
}
function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <!-- ============ القشرة (قائمة جانبية + شريط علوي + تنقّل سفلي) تحت ثيم القشرة ============
       نلفّها بفئة ثيم Vuetify العامة (.v-theme--*) فتُضبط متغيّرات --v-theme-* لهذا الفرع؛
       في الوضع المختلط = darkTheme (قوائم داكنة) بينما المحتوى يتبع الثيم العام. -->
  <div :class="`v-theme--${chromeThemeName}`">
    <!-- خلفية معتمة للموبايل خلف القائمة المنسدلة -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobile && drawer"
        class="fixed inset-0 z-30 bg-black/50"
        @click="drawer = false"
      />
    </Transition>

    <!-- ======== القائمة الجانبية ======== -->
    <aside
      class="fixed inset-y-0 start-0 z-40 flex flex-col border-ui bg-surface text-content transition-[width,transform] duration-200"
      :class="[
        mobile ? 'shadow-2xl' : '',
        mobile && !drawer ? 'rtl:translate-x-full ltr:-translate-x-full' : 'translate-x-0',
      ]"
      :style="{ width: `${sidebarW}px` }"
    >
      <!-- الهوية -->
      <div class="flex items-center gap-3 p-4">
        <BaseAvatar color="brand" :size="40" square>
          <BaseIcon name="mdi-briefcase-account" :size="22" />
        </BaseAvatar>
        <div v-if="!rail || mobile" class="truncate text-base font-bold">
          {{ t('app.name') }}
        </div>
      </div>
      <div class="border-t border-ui" />

      <!-- تبويبا القائمة: المنصة / حسابي -->
      <div v-if="!rail || mobile" class="flex gap-1 px-2 pt-2">
        <button class="nav-tab" :class="{ 'is-active': activeNav === 'platform' }" @click="activeNav = 'platform'">
          <BaseIcon name="mdi-storefront-outline" :size="18" />
          <span>{{ t('nav.sectionPlatform') }}</span>
          <BaseBadge v-if="platformTabBadge" :content="platformTabBadge" inline color="error" />
        </button>
        <button class="nav-tab" :class="{ 'is-active': activeNav === 'account' }" @click="activeNav = 'account'">
          <BaseIcon name="mdi-account-circle-outline" :size="18" />
          <span>{{ t('nav.sectionAccount') }}</span>
          <BaseBadge v-if="accountTabBadge" :content="accountTabBadge" inline color="error" />
        </button>
      </div>
      <!-- وضع rail: التبويبان أيقونتان -->
      <div v-else class="flex flex-col items-center gap-1 pt-2">
        <button class="icon-btn" :class="{ 'is-active': activeNav === 'platform' }" @click="activeNav = 'platform'">
          <BaseIcon name="mdi-storefront-outline" :size="22" />
        </button>
        <button class="icon-btn" :class="{ 'is-active': activeNav === 'account' }" @click="activeNav = 'account'">
          <BaseIcon name="mdi-account-circle-outline" :size="22" />
        </button>
        <div class="my-1 w-full border-t border-ui" />
      </div>

      <!-- تبديل طريقة العرض (موبايل) -->
      <div v-if="mobile" class="flex justify-end px-3 pt-2">
        <div class="inline-flex overflow-hidden rounded-ui border-ui">
          <button
            class="px-2 py-1 text-xs transition"
            :class="navView === 'list' ? 'bg-brand text-on-brand' : 'text-muted'"
            @click="navView = 'list'"
          >
            <BaseIcon name="mdi-format-list-bulleted" :size="16" />
          </button>
          <button
            class="px-2 py-1 text-xs transition"
            :class="navView === 'grid' ? 'bg-brand text-on-brand' : 'text-muted'"
            @click="navView = 'grid'"
          >
            <BaseIcon name="mdi-view-grid-outline" :size="16" />
          </button>
        </div>
      </div>

      <!-- قائمة التنقّل (قابلة للتمرير) -->
      <nav class="flex-1 overflow-y-auto p-2">
        <!-- ===== نافذة المنصة ===== -->
        <template v-if="activeNav === 'platform'">
          <div v-if="gridMode" class="grid grid-cols-3 gap-2">
            <RouterLink
              v-for="item in platformItems"
              :key="`gp-${item.title}-${item.to}`"
              :to="{ name: item.to }"
              class="nav-tile"
              @click="drawer = false"
            >
              <BaseBadge :show="navBadge(item.to) > 0" dot color="error">
                <BaseIcon :name="item.icon" :size="22" />
              </BaseBadge>
              <span class="truncate text-xs">{{ t(`nav.${item.title}`) }}</span>
            </RouterLink>
          </div>
          <template v-else>
            <RouterLink
              v-for="item in platformItems"
              :key="`p-${item.title}-${item.to}`"
              :to="{ name: item.to }"
              class="nav-link mb-1"
              :title="t(`nav.${item.title}`)"
              @click="closeDrawerOnMobile"
            >
              <BaseIcon :name="item.icon" :size="22" />
              <span v-if="!rail || mobile" class="flex-1 truncate">{{ t(`nav.${item.title}`) }}</span>
              <BaseChip v-if="(!rail || mobile) && navBadge(item.to)" color="error">{{ navBadge(item.to) }}</BaseChip>
            </RouterLink>
          </template>
        </template>

        <!-- ===== نافذة حسابي ===== -->
        <template v-else>
          <div v-if="gridMode" class="grid grid-cols-3 gap-2">
            <RouterLink
              v-for="item in accountItems"
              :key="`ga-${item.title}-${item.to}`"
              :to="{ name: item.to }"
              class="nav-tile"
              @click="drawer = false"
            >
              <BaseBadge :show="navBadge(item.to) > 0" dot color="error">
                <BaseIcon :name="item.icon" :size="22" />
              </BaseBadge>
              <span class="truncate text-xs">{{ t(`nav.${item.title}`) }}</span>
            </RouterLink>
          </div>
          <template v-else>
            <RouterLink
              v-for="item in accountItems"
              :key="`a-${item.title}-${item.to}`"
              :to="{ name: item.to }"
              class="nav-link mb-1"
              :title="t(`nav.${item.title}`)"
              @click="closeDrawerOnMobile"
            >
              <BaseIcon :name="item.icon" :size="22" />
              <span v-if="!rail || mobile" class="flex-1 truncate">{{ t(`nav.${item.title}`) }}</span>
              <BaseChip v-if="(!rail || mobile) && navBadge(item.to)" color="error">{{ navBadge(item.to) }}</BaseChip>
            </RouterLink>
          </template>

          <!-- مساحة الدور: ترويسة قابلة للطي تحمل مبدّل الأدوار -->
          <button
            v-if="(!rail || mobile) && roleItems.length"
            class="mb-1 mt-3 flex w-full items-center gap-1 rounded-ui px-2 py-1.5 text-start transition hover:bg-surfalt"
            @click="toggleSection('role')"
          >
            <BaseIcon name="mdi-account-convert-outline" :size="16" class="text-muted" />
            <span class="flex-1 text-xs font-bold text-muted">{{ t('nav.sectionRole', { role: roleLabel }) }}</span>
            <span
              class="icon-btn h-7 w-7 text-brand"
              @click.stop="roleControlOpen = !roleControlOpen; collapsedSections.role && toggleSection('role')"
            >
              <BaseIcon name="mdi-swap-horizontal" :size="16" />
            </span>
            <BaseIcon :name="collapsedSections.role ? 'mdi-chevron-down' : 'mdi-chevron-up'" :size="16" class="text-muted" />
          </button>

          <div v-if="(!collapsedSections.role || rail) && roleItems.length">
            <Transition
              enter-active-class="transition-all duration-200"
              enter-from-class="opacity-0 -translate-y-1"
              leave-active-class="transition-all duration-150"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div v-if="roleControlOpen && (!rail || mobile)" class="mb-2 rounded-ui border border-dashed p-1" style="border-color: rgba(var(--v-theme-primary), 0.3)">
                <RoleSwitcher />
              </div>
            </Transition>

            <div v-if="gridMode" class="grid grid-cols-3 gap-2">
              <RouterLink
                v-for="item in roleItems"
                :key="`gr-${item.title}-${item.to}`"
                :to="{ name: item.to }"
                class="nav-tile"
                @click="drawer = false"
              >
                <BaseIcon :name="item.icon" :size="22" />
                <span class="truncate text-xs">{{ t(`nav.${item.title}`) }}</span>
              </RouterLink>
            </div>
            <template v-else>
              <RouterLink
                v-for="item in roleItems"
                :key="`r-${item.title}-${item.to}`"
                :to="{ name: item.to }"
                class="nav-link mb-1"
                :title="t(`nav.${item.title}`)"
                @click="closeDrawerOnMobile"
              >
                <BaseIcon :name="item.icon" :size="22" />
                <span v-if="!rail || mobile" class="flex-1 truncate">{{ t(`nav.${item.title}`) }}</span>
                <BaseChip v-if="(!rail || mobile) && navBadge(item.to)" color="error">{{ navBadge(item.to) }}</BaseChip>
              </RouterLink>
            </template>
          </div>
        </template>
      </nav>
    </aside>

    <!-- ======== الشريط العلوي ======== -->
    <header
      class="fixed end-0 top-0 z-30 flex h-[68px] items-center gap-1 border-b border-ui bg-surface px-2 text-content"
      :style="{ insetInlineStart: mobile ? '0' : `${sidebarW}px` }"
    >
      <button class="icon-btn" :title="t('common.menu')" @click="onMenuClick">
        <BaseIcon name="mdi-menu" :size="24" />
      </button>

      <button v-show="canGoBack" class="icon-btn" :title="t('common.back')" @click="goBack">
        <BaseIcon :name="backIcon" :size="24" />
      </button>

      <GlobalSearchBar class="mx-2 hidden sm:flex" />

      <div class="flex-1" />

      <!-- تبديل اللغة -->
      <button class="icon-btn font-bold" @click="toggleLocale">
        {{ locale === 'ar' ? 'EN' : 'ع' }}
      </button>

      <!-- تبديل الوضع -->
      <button class="icon-btn" @click="toggleTheme">
        <BaseIcon :name="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'" :size="24" />
      </button>

      <!-- مخصّص الثيم -->
      <BaseDropdown :close-on-content="false" align="end">
        <template #trigger="{ toggle }">
          <button class="icon-btn" @click="toggle">
            <BaseIcon name="mdi-palette-outline" :size="24" />
          </button>
        </template>
        <ThemeCustomizer />
      </BaseDropdown>

      <!-- الرسائل -->
      <RouterLink class="icon-btn" :to="{ name: 'messages' }">
        <BaseBadge :show="messagesStore.totalUnread > 0" :content="messagesStore.totalUnread" color="accent">
          <BaseIcon name="mdi-message-outline" :size="24" />
        </BaseBadge>
      </RouterLink>

      <!-- الإشعارات -->
      <RouterLink class="icon-btn" :to="{ name: 'notifications' }">
        <BaseBadge :show="notificationsStore.unreadCount > 0" :content="notificationsStore.unreadCount" color="error">
          <BaseIcon name="mdi-bell-outline" :size="24" />
        </BaseBadge>
      </RouterLink>

      <!-- قائمة المستخدم = مبدّل الحسابات -->
      <BaseDropdown align="end" panel-class="min-w-[260px]">
        <template #trigger="{ toggle }">
          <button class="ms-1 flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-surfalt" @click="toggle">
            <BaseBadge :show="delegation.isDelegating" dot color="warning" location="bottom-start">
              <BaseAvatar :color="delegation.isDelegating ? 'warning' : 'emerald'" :size="36">
                {{ initials }}
              </BaseAvatar>
            </BaseBadge>
            <div class="hidden text-start sm:block">
              <div class="text-sm font-bold">
                {{ user?.name }}
              </div>
              <div class="text-xs text-muted">
                {{ delegation.isDelegating ? t('accounts.delegated') : roleLabel }}
              </div>
            </div>
          </button>
        </template>

        <template #default="{ close }">
          <div class="py-1">
            <div class="px-4 py-1.5 text-xs font-bold text-muted">
              {{ t('accounts.myAccounts') }}
            </div>

            <!-- الحساب الشخصي -->
            <button class="menu-row" @click="delegation.isDelegating && exitDelegation(); close()">
              <BaseAvatar color="emerald" :size="30">
                {{ (delegation.originalUser?.name ?? user?.name ?? '؟').trim().charAt(0) }}
              </BaseAvatar>
              <div class="flex-1">
                <div class="text-sm">{{ delegation.originalUser?.name ?? user?.name }}</div>
                <div class="text-xs text-muted">{{ t('accounts.personal') }}</div>
              </div>
              <BaseChip v-if="!delegation.isDelegating" color="brand">{{ t('roleSwitcher.active') }}</BaseChip>
            </button>

            <!-- الحسابات المفوَّضة -->
            <button
              v-for="acc in delegation.accounts"
              :key="acc.id"
              class="menu-row"
              :disabled="delegation.isDelegating && delegation.activeId !== acc.id"
              :class="{ 'opacity-40': delegation.isDelegating && delegation.activeId !== acc.id }"
              @click="delegation.activeId !== acc.id && enterAccount(acc.id); close()"
            >
              <BaseAvatar color="warning" tonal :size="30">
                {{ acc.initial }}
              </BaseAvatar>
              <div class="flex-1">
                <div class="text-sm">{{ acc.name }}</div>
                <div class="text-xs text-muted">{{ acc.note }}</div>
              </div>
              <BaseChip v-if="delegation.activeId === acc.id" color="warning">{{ t('accounts.managing') }}</BaseChip>
            </button>

            <button v-if="delegation.isDelegating" class="menu-row" style="color: rgb(var(--v-theme-warning))" @click="exitDelegation(); close()">
              <BaseIcon name="mdi-account-arrow-right-outline" :size="20" />
              <span>{{ t('accounts.exit') }}</span>
            </button>

            <div class="my-1 border-t border-ui" />

            <RouterLink class="menu-row" :to="{ name: 'wallet' }">
              <BaseIcon name="mdi-wallet-outline" :size="20" />
              <span class="flex-1">{{ t('nav.wallet') }}</span>
              <BaseChip color="brand">{{ walletStore.available.toLocaleString('ar') }} ر.س</BaseChip>
            </RouterLink>
            <RouterLink class="menu-row" :to="{ name: 'profile' }">
              <BaseIcon name="mdi-account-outline" :size="20" />
              <span>{{ t('common.profile') }}</span>
            </RouterLink>
            <RouterLink class="menu-row" :to="{ name: 'settings' }">
              <BaseIcon name="mdi-cog-outline" :size="20" />
              <span>{{ t('common.settings') }}</span>
            </RouterLink>

            <div class="my-1 border-t border-ui" />

            <button class="menu-row" style="color: rgb(var(--v-theme-error))" @click="logout(); close()">
              <BaseIcon name="mdi-logout" :size="20" />
              <span>{{ t('common.logout') }}</span>
            </button>
          </div>
        </template>
      </BaseDropdown>
    </header>

    <!-- ======== تنقّل سفلي للموبايل ======== -->
    <nav
      v-if="mobile"
      class="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-ui bg-surface text-content"
    >
      <RouterLink class="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs" :to="{ name: 'opportunities' }">
        <BaseIcon name="mdi-briefcase-search-outline" :size="22" />
        <span>{{ t('nav.opportunities') }}</span>
      </RouterLink>
      <RouterLink class="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs" :to="{ name: 'people-explorer' }">
        <BaseIcon name="mdi-account-group-outline" :size="22" />
        <span>{{ t('nav.bottomPeople') }}</span>
      </RouterLink>
      <RouterLink class="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs" :to="{ name: 'unified-hub' }">
        <BaseIcon name="mdi-view-dashboard-variant-outline" :size="22" />
        <span>{{ t('nav.bottomHub') }}</span>
      </RouterLink>
      <RouterLink class="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs" :to="{ name: 'wallet' }">
        <BaseIcon name="mdi-wallet-outline" :size="22" />
        <span>{{ t('nav.wallet') }}</span>
      </RouterLink>
      <button class="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs" @click="drawer = !drawer">
        <BaseBadge :show="peerRequests.pendingIncoming > 0" dot color="error">
          <BaseIcon name="mdi-menu" :size="22" />
        </BaseBadge>
        <span>{{ t('nav.bottomMenu') }}</span>
      </button>
    </nav>
  </div>

  <!-- ============ المحتوى (ثيم المحتوى العام) ============ -->
  <main
    class="min-h-screen bg-bg text-content"
    :style="{
      paddingTop: '68px',
      paddingInlineStart: mobile ? '0' : `${sidebarW}px`,
      paddingBottom: mobile ? '64px' : '0',
    }"
  >
    <!-- شريط سياق التفويض -->
    <div
      v-if="delegation.isDelegating && delegation.activeAccount"
      class="m-3 mb-0 flex flex-wrap items-center gap-2 rounded-ui border-s-4 p-3 text-sm"
      style="border-color: rgb(var(--v-theme-warning)); background: rgba(var(--v-theme-warning), 0.12); color: rgb(var(--v-theme-warning))"
    >
      <BaseIcon name="mdi-account-switch-outline" :size="20" />
      <span>
        {{ t('accounts.banner', { name: delegation.activeAccount.name }) }}
        <span class="text-muted">({{ delegation.activeAccount.note }})</span>
      </span>
      <div class="flex-1" />
      <button
        class="inline-flex items-center gap-1 rounded-ui px-3 py-1.5 text-sm font-semibold text-on-brand"
        style="background: rgb(var(--v-theme-warning))"
        @click="exitDelegation"
      >
        <BaseIcon name="mdi-account-arrow-right-outline" :size="18" />
        {{ t('accounts.exit') }}
      </button>
    </div>

    <div class="p-4 md:p-6">
      <slot />
    </div>
  </main>

  <!-- Global reward toasts + badge-unlock celebrations -->
  <RewardFeedback />

  <!-- What's new after each deploy (once per build) -->
  <WhatsNewDialog />

  <!-- Scroll to top -->
  <Transition
    enter-active-class="transition duration-200"
    enter-from-class="opacity-0 scale-75"
    leave-active-class="transition duration-150"
    leave-to-class="opacity-0 scale-75"
  >
    <button
      v-show="showTop"
      class="fixed bottom-6 start-6 z-[45] flex h-11 w-11 items-center justify-center rounded-full bg-brand text-on-brand shadow-lg shadow-black/30"
      :aria-label="t('nav.backToTop')"
      @click="scrollTop"
    >
      <BaseIcon name="mdi-chevron-up" :size="24" />
    </button>
  </Transition>
</template>
