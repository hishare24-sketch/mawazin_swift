<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LATEST_CHANGES } from '@/services/changelog'

// يظهر مرة واحدة بعد كل نشر جديد (مفتاح البناء)، فيعرف المستخدم أين يجد الجديد
const SEEN_KEY = 'lastSeenBuild'
const router = useRouter()

const open = ref(false)
if (import.meta.env.PROD && localStorage.getItem(SEEN_KEY) !== __BUILD_ID__)
  open.value = true

function dismiss() {
  localStorage.setItem(SEEN_KEY, __BUILD_ID__)
  open.value = false
}
function tryIt(to?: string) {
  dismiss()
  if (to)
    router.push({ name: to })
}
</script>

<template>
  <VDialog v-model="open" max-width="520" persistent>
    <VCard rounded="lg">
      <div class="brand-gradient pa-5" theme="darkTheme">
        <div class="d-flex align-center ga-3">
          <VAvatar color="rgba(255,255,255,0.15)" size="48" rounded="lg">
            <VIcon icon="mdi-party-popper" color="white" size="26" />
          </VAvatar>
          <div>
            <h2 class="text-h6 font-weight-bold text-white">{{ LATEST_CHANGES.title }}</h2>
            <p class="text-caption text-white opacity-80 mb-0">هذا ملخص ما أُضيف — انقر أي بند لتجربته مباشرة</p>
          </div>
        </div>
      </div>
      <VCardText class="pt-4">
        <div
          v-for="(item, i) in LATEST_CHANGES.items"
          :key="i"
          class="d-flex align-start ga-3 py-2 change-row rounded-lg px-2"
          :class="{ 'cursor-pointer': item.to }"
          @click="item.to && tryIt(item.to)"
        >
          <VAvatar color="primary" variant="tonal" size="34"><VIcon :icon="item.icon" size="18" /></VAvatar>
          <span class="text-body-2 flex-grow-1">{{ item.text }}</span>
          <VIcon v-if="item.to" icon="mdi-chevron-left" size="18" class="mt-2" />
        </div>
      </VCardText>
      <VCardActions class="justify-center pb-4">
        <VBtn color="accent" variant="flat" min-width="160" @click="dismiss">فهمت، لنبدأ</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.change-row:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
