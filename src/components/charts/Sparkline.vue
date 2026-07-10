<script setup lang="ts">
import { computed } from 'vue'

// خطّ مصغّر بلا محاور — لاتجاه سريع داخل بطاقة.
const props = withDefaults(defineProps<{ values: number[], color?: string, height?: number, area?: boolean }>(), {
  color: 'primary',
  height: 36,
  area: true,
})

const W = 100
const path = computed(() => {
  const v = props.values
  if (v.length < 2)
    return { line: '', area: '' }
  const max = Math.max(...v)
  const min = Math.min(...v)
  const span = max - min || 1
  const step = W / (v.length - 1)
  const pts = v.map((n, i) => [i * step, props.height - 4 - ((n - min) / span) * (props.height - 8)])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${W},${props.height} L0,${props.height} Z`
  return { line, area }
})
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${height}`" preserveAspectRatio="none" class="w-full" :style="{ height: `${height}px` }" dir="ltr">
    <path v-if="area" :d="path.area" :fill="`rgb(var(--v-theme-${color}))`" opacity="0.12" />
    <path :d="path.line" fill="none" :stroke="`rgb(var(--v-theme-${color}))`" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
  </svg>
</template>
