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
import { useDelegationStore } from '@/stores/DelegationStore'
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

// Menu button: on mobile toggle the overlay drawer; on desktop toggle rail (collapse)
function onMenuClick() {
  if (mobile.value)
    drawer.value = !drawer.value
  else rail.value = !rail.value
}

const sections = computed(() => navSections(authStore.role))

// التحكم الكامل من القائمة الجانبية: ترويسة «مساحة الدور» تفتح مبدّل الأدوار inline
const roleControlOpen = ref(false)

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

    <!-- Nav items: قسم «حسابي» الموحّد لكل الأدوار ثم «مساحة الدور» النشط -->
    <VList nav density="comfortable" class="px-2 mt-2">
      <template v-for="group in sections" :key="group.section">
        <VListSubheader v-if="!rail && group.section === 'account'" class="nav-subheader">
          {{ t('nav.sectionAccount') }}
        </VListSubheader>
        <!-- ترويسة «مساحة الدور» تفاعلية: تفتح مبدّل الأدوار داخل القائمة نفسها -->
        <VListItem
          v-else-if="!rail && group.section === 'role'"
          class="role-section-header mb-1"
          density="compact"
          @click="roleControlOpen = !roleControlOpen"
        >
          <VListItemTitle class="text-caption font-weight-bold text-medium-emphasis">
            {{ t('nav.sectionRole', { role: roleLabel }) }}
          </VListItemTitle>
          <template #append>
            <VIcon :icon="roleControlOpen ? 'mdi-chevron-up' : 'mdi-swap-horizontal'" size="16" color="medium-emphasis" />
          </template>
        </VListItem>
        <VDivider v-if="rail" class="my-2" />

        <!-- مبدّل الأدوار الكامل داخل القائمة الجانبية -->
        <VExpandTransition>
          <div v-if="group.section === 'role' && roleControlOpen && !rail" class="role-switcher-inline mb-2">
            <RoleSwitcher />
          </div>
        </VExpandTransition>

        <VListItem
          v-for="item in group.items"
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
      </template>
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

    <!-- User menu = مبدّل الحسابات: شخصي + مفوَّضة (الأدوار تُدار من القائمة الجانبية) -->
    <VMenu eager>
      <template #activator="{ props }">
        <VBtn v-bind="props" variant="text" class="px-2 ms-2">
          <VBadge :model-value="delegation.isDelegating" color="warning" dot location="bottom start">
            <VAvatar :color="delegation.isDelegating ? 'warning' : 'secondary'" size="36">
              <span class="font-weight-bold">{{ initials }}</span>
            </VAvatar>
          </VBadge>
          <div class="d-none d-sm-block text-start mx-2">
            <div class="text-body-2 font-weight-bold">
              {{ user?.name }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ delegation.isDelegating ? t('accounts.delegated') : roleLabel }}
            </div>
          </div>
        </VBtn>
      </template>
      <VList density="compact" min-width="260">
        <VListSubheader>{{ t('accounts.myAccounts') }}</VListSubheader>

        <!-- الحساب الشخصي -->
        <VListItem
          :active="!delegation.isDelegating"
          color="primary"
          density="compact"
          @click="delegation.isDelegating && exitDelegation()"
        >
          <template #prepend>
            <VAvatar color="secondary" size="30" class="me-2">
              <span class="text-caption font-weight-bold">{{ (delegation.originalUser?.name ?? user?.name ?? '؟').trim().charAt(0) }}</span>
            </VAvatar>
          </template>
          <VListItemTitle class="text-body-2">{{ delegation.originalUser?.name ?? user?.name }}</VListItemTitle>
          <VListItemSubtitle class="text-caption">{{ t('accounts.personal') }}</VListItemSubtitle>
          <template #append>
            <VChip v-if="!delegation.isDelegating" size="x-small" color="primary" label>{{ t('roleSwitcher.active') }}</VChip>
          </template>
        </VListItem>

        <!-- الحسابات المفوَّضة -->
        <VListItem
          v-for="acc in delegation.accounts"
          :key="acc.id"
          :active="delegation.activeId === acc.id"
          color="warning"
          density="compact"
          :disabled="delegation.isDelegating && delegation.activeId !== acc.id"
          @click="delegation.activeId !== acc.id && enterAccount(acc.id)"
        >
          <template #prepend>
            <VAvatar color="warning" variant="tonal" size="30" class="me-2">
              <span class="text-caption font-weight-bold">{{ acc.initial }}</span>
            </VAvatar>
          </template>
          <VListItemTitle class="text-body-2">{{ acc.name }}</VListItemTitle>
          <VListItemSubtitle class="text-caption">{{ acc.note }}</VListItemSubtitle>
          <template #append>
            <VChip v-if="delegation.activeId === acc.id" size="x-small" color="warning" label>{{ t('accounts.managing') }}</VChip>
          </template>
        </VListItem>

        <VListItem
          v-if="delegation.isDelegating"
          prepend-icon="mdi-account-arrow-right-outline"
          :title="t('accounts.exit')"
          base-color="warning"
          density="compact"
          @click="exitDelegation"
        />

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
    <!-- شريط سياق التفويض — لا يمكن إغفاله أثناء إدارة حساب آخر -->
    <VAlert
      v-if="delegation.isDelegating && delegation.activeAccount"
      color="warning"
      variant="tonal"
      density="compact"
      border="start"
      icon="mdi-account-switch-outline"
      class="ma-3 mb-0"
    >
      <div class="d-flex align-center flex-wrap ga-2">
        <span class="text-body-2">
          {{ t('accounts.banner', { name: delegation.activeAccount.name }) }}
          <span class="text-caption text-medium-emphasis">({{ delegation.activeAccount.note }})</span>
        </span>
        <VSpacer />
        <VBtn size="small" color="warning" variant="flat" prepend-icon="mdi-account-arrow-right-outline" @click="exitDelegation">
          {{ t('accounts.exit') }}
        </VBtn>
      </div>
    </VAlert>
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
.role-section-header {
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.04);
}
.role-switcher-inline {
  border: 1px dashed rgba(var(--v-theme-primary), 0.25);
  border-radius: 8px;
  margin-inline: 4px;
}
.scroll-top-fab {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 1000;
}
</style>
