<script setup lang="ts">
// تلميح خفيف — يلفّ عنصرًا ويُظهر فقاعة عند hover/focus. RTL آليّ.
withDefaults(defineProps<{ text: string, placement?: 'top' | 'bottom' }>(), { placement: 'top' })
</script>

<template>
  <span class="tip-wrap">
    <slot />
    <span class="tip-bubble" :class="placement === 'bottom' ? 'tip-bottom' : 'tip-top'" role="tooltip">{{ text }}</span>
  </span>
</template>

<style scoped>
.tip-wrap {
  position: relative;
  display: inline-flex;
}
.tip-bubble {
  position: absolute;
  inset-inline-start: 50%;
  transform: translateX(50%) scale(0.96);
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  background: rgb(var(--v-theme-on-surface));
  color: rgb(var(--v-theme-surface));
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease, transform 0.12s ease;
  z-index: 60;
}
:dir(ltr) .tip-bubble { transform: translateX(-50%) scale(0.96); }
.tip-top { bottom: calc(100% + 6px); }
.tip-bottom { top: calc(100% + 6px); }
.tip-wrap:hover .tip-bubble,
.tip-wrap:focus-within .tip-bubble {
  opacity: 1;
  transform: translateX(50%) scale(1);
}
:dir(ltr) .tip-wrap:hover .tip-bubble,
:dir(ltr) .tip-wrap:focus-within .tip-bubble {
  transform: translateX(-50%) scale(1);
}
@media (prefers-reduced-motion: reduce) {
  .tip-bubble { transition: opacity 0.12s ease; }
}
</style>
