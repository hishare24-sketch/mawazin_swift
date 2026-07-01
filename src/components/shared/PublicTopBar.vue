<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <VAppBar flat color="surface" height="70" class="px-4" border>
    <div class="d-flex align-center ga-2 cursor-pointer" @click="router.push({ name: 'home' })">
      <VAvatar color="primary" size="40" rounded="lg">
        <VIcon icon="mdi-briefcase-account" color="white" />
      </VAvatar>
      <span class="text-h6 font-weight-bold d-none d-sm-block">{{ t('app.name') }}</span>
    </div>
    <VSpacer />
    <VBtn variant="text" @click="router.push({ name: 'explore-opportunities' })">الفرص</VBtn>
    <VBtn variant="text" class="d-none d-sm-inline-flex" @click="router.push({ name: 'explore-assistant' })">المساعد</VBtn>
    <VBtn variant="text" @click="router.push({ name: 'login' })">{{ t('auth.login') }}</VBtn>
    <VBtn color="accent" class="ms-2" @click="router.push({ name: 'register' })">{{ t('auth.register') }}</VBtn>
  </VAppBar>
</template>
