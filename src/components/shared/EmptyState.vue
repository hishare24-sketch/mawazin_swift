<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  description?: string
  actionText?: string
  actionIcon?: string
}>()
defineEmits<{ action: [] }>()
</script>

<template>
  <div class="text-center py-10 px-4">
    <VAvatar :size="72" color="surface-variant" class="mb-3">
      <VIcon :icon="icon ?? 'mdi-inbox-outline'" size="36" color="primary" />
    </VAvatar>
    <div class="text-subtitle-1 font-weight-bold">
      {{ title }}
    </div>
    <p v-if="description" class="text-body-2 text-medium-emphasis mt-1 mx-auto" style="max-width: 420px">
      {{ description }}
    </p>
    <div class="mt-4 d-flex justify-center">
      <slot name="action">
        <VBtn v-if="actionText" color="accent" :prepend-icon="actionIcon" @click="$emit('action')">
          {{ actionText }}
        </VBtn>
      </slot>
    </div>
  </div>
</template>
