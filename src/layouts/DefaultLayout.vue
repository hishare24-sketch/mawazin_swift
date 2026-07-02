<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { useAuthStore } from '@/stores/AuthStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { useMessagesStore } from '@/stores/MessagesStore'
import { useGamificationStore } from '@/stores/GamificationStore'
import GlobalSearchBar from '@/components/shared/GlobalSearchBar.vue'
import RewardFeedback from '@/components/shared/RewardFeedback.vue'
import RoleSwitcher from '@/components/shared/RoleSwitcher.vue'
import ThemeCustomizer from '@/components/shared/ThemeCustomizer.vue'
import WhatsNewDialog from '@/components/shared/WhatsNewDialog.vue'
import { useThemeStore } from '@/stores/ThemeStore'
import { usePeerRequestsStore } from '@/stores/PeerRequestsStore'
import { useWalletStore } from '@/stores/WalletStore'
import { navForRole } from './navigation'

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

// Menu button: on mobile toggle the overlay drawer; on desktop toggle rail (collapse)
function onMenuClick() {
  if (mobile.value)
    drawer.value = !drawer.value
  else rail.value = !rail.value
}

const items = computed(() => navForRole(authStore.role))
const user = computed(() => authStore.authUser)
const roleLabel = computed(() => (authStore.role ? t(`roles.${authStore.role}`) : ''))

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.isDark)
// المختلط: القوائم داكنة والمحتوى فاتح
const chromeTheme = computed(() => (themeStore.isMixed ? 'darkTheme' : undefined))

function toggleTheme() {
  themeStore.toggleDark()
}

function toggleLocale() {
  locale.value = locale.value === 'ar' ? 'en' : 'ar'
}

function logout() {
  authStore.clearAuthUser()
  router.push({ name: 'login' })
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
  <VNavigationDrawer
    v-model="drawer"
    :rail="rail && !mobile"
    :temporary="mobile"
    :permanent="!mobile"
    :location="locale === 'ar' ? 'right' : 'left'"
    width="270"
    color="surface"
    border
    :theme="chromeTheme"
  >
    <!-- Brand -->
    <div class="d-flex align-center pa-4 ga-3">
      <VAvatar color="primary" size="40" rounded="lg">
        <VIcon icon="mdi-briefcase-account" color="on-primary" />
      </VAvatar>
      <div v-if="!rail" class="text-truncate">
        <div class="text-subtitle-1 font-weight-bold">
          {{ t('app.name') }}
        </div>
      </div>
    </div>

    <VDivider />

    <!-- Nav items -->
    <VList nav density="comfortable" class="px-2 mt-2">
      <VListItem
        v-for="item in items"
        :key="`${item.title}-${item.to}`"
        :prepend-icon="item.icon"
        :title="t(`nav.${item.title}`)"
        :to="{ name: item.to }"
        rounded="lg"
        color="primary"
        class="mb-1 nav-item"
        @click="mobile && (drawer = false)"
      >
        <template v-if="!rail && navBadge(item.to)" #append>
          <VChip size="x-small" color="error" label>{{ navBadge(item.to) }}</VChip>
        </template>
      </VListItem>
    </VList>
  </VNavigationDrawer>

  <VAppBar flat border color="surface" height="68" :theme="chromeTheme">
    <VBtn icon variant="text" @click="onMenuClick">
      <VIcon icon="mdi-menu" />
    </VBtn>

    <VTooltip :text="t('common.back')" location="bottom">
      <template #activator="{ props }">
        <VBtn v-show="canGoBack" v-bind="props" icon variant="text" @click="goBack">
          <VIcon :icon="backIcon" />
        </VBtn>
      </template>
    </VTooltip>

    <GlobalSearchBar class="mx-2 d-none d-sm-flex" />

    <VSpacer />

    <!-- Locale toggle -->
    <VBtn variant="text" class="font-weight-bold" @click="toggleLocale">
      {{ locale === 'ar' ? 'EN' : 'ع' }}
    </VBtn>

    <!-- Theme toggle -->
    <VBtn icon variant="text" @click="toggleTheme">
      <VIcon :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'" />
    </VBtn>

    <!-- Theme customizer (5 presets × 3 modes + custom colors) -->
    <VMenu :close-on-content-click="false" location="bottom end">
      <template #activator="{ props }">
        <VBtn v-bind="props" icon variant="text">
          <VIcon icon="mdi-palette-outline" />
        </VBtn>
      </template>
      <ThemeCustomizer />
    </VMenu>

    <!-- Messages -->
    <VBtn icon variant="text" :to="{ name: 'messages' }">
      <VBadge :model-value="messagesStore.totalUnread > 0" :content="messagesStore.totalUnread" color="accent">
        <VIcon icon="mdi-message-outline" />
      </VBadge>
    </VBtn>

    <!-- Notifications -->
    <VBtn icon variant="text" :to="{ name: 'notifications' }">
      <VBadge :model-value="notificationsStore.unreadCount > 0" :content="notificationsStore.unreadCount" color="error">
        <VIcon icon="mdi-bell-outline" />
      </VBadge>
    </VBtn>

    <!-- User menu (eager: keeps RoleSwitcher dialogs mounted after the menu closes) -->
    <VMenu eager>
      <template #activator="{ props }">
        <VBtn v-bind="props" variant="text" class="px-2 ms-2">
          <VAvatar color="secondary" size="36">
            <span class="font-weight-bold">{{ initials }}</span>
          </VAvatar>
          <div class="d-none d-sm-block text-start mx-2">
            <div class="text-body-2 font-weight-bold">
              {{ user?.name }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ roleLabel }}
            </div>
          </div>
        </VBtn>
      </template>
      <VList density="compact" min-width="240">
        <RoleSwitcher />
        <VDivider />
        <VListItem :title="t('nav.wallet')" prepend-icon="mdi-wallet-outline" :to="{ name: 'wallet' }">
          <template #append>
            <VChip size="x-small" color="primary" variant="tonal" label>{{ walletStore.available.toLocaleString('ar') }} ر.س</VChip>
          </template>
        </VListItem>
        <VListItem :title="t('common.profile')" prepend-icon="mdi-account-outline" :to="{ name: 'profile' }" />
        <VListItem :title="t('common.settings')" prepend-icon="mdi-cog-outline" :to="{ name: 'settings' }" />
        <VDivider />
        <VListItem :title="t('common.logout')" prepend-icon="mdi-logout" base-color="error" @click="logout" />
      </VList>
    </VMenu>
  </VAppBar>

  <VMain class="bg-background">
    <VContainer fluid class="pa-4 pa-md-6">
      <slot />
    </VContainer>
  </VMain>

  <!-- Global reward toasts + badge-unlock celebrations -->
  <RewardFeedback />

  <!-- What's new after each deploy (once per build) -->
  <WhatsNewDialog />

  <!-- Scroll to top -->
  <VScaleTransition>
    <VBtn
      v-show="showTop"
      icon="mdi-chevron-up"
      color="primary"
      size="small"
      elevation="6"
      class="scroll-top-fab"
      aria-label="العودة للأعلى"
      @click="scrollTop"
    />
  </VScaleTransition>
</template>

<style scoped>
.scroll-top-fab {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 1000;
}
</style>
