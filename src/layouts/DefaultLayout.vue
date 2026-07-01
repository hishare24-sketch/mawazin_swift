<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDisplay, useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/AuthStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { useMessagesStore } from '@/stores/MessagesStore'
import { useGamificationStore } from '@/stores/GamificationStore'
import GlobalSearchBar from '@/components/shared/GlobalSearchBar.vue'
import { navForRole } from './navigation'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const theme = useTheme()

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

// Daily streak check-in — runs once when an authenticated layout mounts
useGamificationStore().checkIn()

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

const isDark = computed(() => theme.global.current.value.dark)

function toggleTheme() {
  theme.global.name.value = isDark.value ? 'lightTheme' : 'darkTheme'
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
      />
    </VList>
  </VNavigationDrawer>

  <VAppBar flat border color="surface" height="68">
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

    <!-- User menu -->
    <VMenu>
      <template #activator="{ props }">
        <VBtn v-bind="props" variant="text" class="px-2 ms-2">
          <VAvatar color="secondary" size="36">
            <span class="text-white font-weight-bold">{{ initials }}</span>
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
      <VList density="compact" min-width="200">
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
</template>
