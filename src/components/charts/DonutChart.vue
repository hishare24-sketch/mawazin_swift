<script setup lang="ts">
import { computed, ref } from 'vue'

// رسم حلقيّ (Donut) SVG + وسيلة إيضاح — ألوان من الثيم بالتدوير.
interface Slice { label: string, value: number, color?: string }
const props = withDefaults(defineProps<{ data: Slice[], size?: number, thickness?: number, centerLabel?: string }>(), {
  size: 180,
  thickness: 26,
  centerLabel: '',
})

const PALETTE = ['primary', 'secondary', 'accent', 'info', 'warning', 'success', 'error']
const total = computed(() => props.data.reduce((s, d) => s + d.value, 0))
const hover = ref<number | null>(null)

const cx = computed(() => props.size / 2)
const r = computed(() => props.size / 2 - props.thickness / 2 - 2)
const circ = computed(() => 2 * Math.PI * r.value)

// أجزاء عبر stroke-dasharray/offset (أبسط وأنظف من مسارات القوس)
const segments = computed(() => {
  let acc = 0
  return props.data.map((d, i) => {
    const frac = total.value ? d.value / total.value : 0
    const seg = {
      color: d.color || PALETTE[i % PALETTE.length],
      dash: frac * circ.value,
      offset: -acc * circ.value,
      frac,
      i,
    }
    acc += frac
    return seg
  })
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-5">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="shrink-0" dir="ltr">
      <g :transform="`rotate(-90 ${cx} ${cx})`">
        <circle :cx="cx" :cy="cx" :r="r" fill="none" stroke="rgb(var(--v-theme-on-surface))" stroke-opacity="0.08" :stroke-width="thickness" />
        <circle
          v-for="s in segments" :key="s.i"
          :cx="cx" :cy="cx" :r="r" fill="none"
          :stroke="`rgb(var(--v-theme-${s.color}))`"
          :stroke-width="hover === s.i ? thickness + 4 : thickness"
          :stroke-dasharray="`${s.dash} ${circ - s.dash}`"
          :stroke-dashoffset="s.offset"
          stroke-linecap="butt"
          style="transition: stroke-width 0.15s ease"
          @mouseenter="hover = s.i"
          @mouseleave="hover = null"
        />
      </g>
      <text :x="cx" :y="cx - 2" text-anchor="middle" fill="rgb(var(--v-theme-on-surface))" font-size="26" font-weight="800">{{ total }}</text>
      <text :x="cx" :y="cx + 16" text-anchor="middle" fill="rgb(var(--v-theme-on-surface))" fill-opacity="0.55" font-size="11">{{ centerLabel }}</text>
    </svg>

    <ul class="flex-1 space-y-1.5">
      <li
        v-for="s in segments" :key="s.i"
        class="flex items-center gap-2 text-sm"
        :class="{ 'font-bold': hover === s.i }"
        @mouseenter="hover = s.i" @mouseleave="hover = null"
      >
        <span class="inline-block h-3 w-3 shrink-0 rounded-sm" :style="{ background: `rgb(var(--v-theme-${s.color}))` }" />
        <span class="flex-1 truncate text-content">{{ data[s.i].label }}</span>
        <span class="text-muted">{{ data[s.i].value }}</span>
        <span class="w-10 text-end text-xs text-muted">{{ Math.round(s.frac * 100) }}%</span>
      </li>
    </ul>
  </div>
</template>
