<script setup lang="ts">
import { computed, ref } from 'vue'

// رسم أعمدة SVG — ألوان من الثيم، تلميح hover، تسميات القيم.
interface Bar { label: string, value: number, color?: string }
const props = withDefaults(defineProps<{ data: Bar[], color?: string, height?: number }>(), {
  color: 'primary',
  height: 200,
})

const W = 560
const PAD = { top: 16, right: 8, bottom: 30, left: 34 }
const max = computed(() => Math.max(1, ...props.data.map(d => d.value)))
const plotW = computed(() => W - PAD.left - PAD.right)
const plotH = computed(() => props.height - PAD.top - PAD.bottom)
const bandW = computed(() => plotW.value / Math.max(1, props.data.length))
const barW = computed(() => Math.min(46, bandW.value * 0.62))

function bx(i: number) { return PAD.left + i * bandW.value + (bandW.value - barW.value) / 2 }
function bh(v: number) { return (v / max.value) * plotH.value }

const grid = computed(() => [0, 0.5, 1].map(f => ({ yv: PAD.top + plotH.value - f * plotH.value, label: Math.round(f * max.value) })))
const hover = ref<number | null>(null)
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${height}`" class="w-full" :style="{ height: `${height}px` }" dir="ltr" @mouseleave="hover = null">
    <g>
      <line v-for="(g, i) in grid" :key="i" :x1="PAD.left" :x2="W - PAD.right" :y1="g.yv" :y2="g.yv" stroke="rgb(var(--v-theme-on-surface))" stroke-opacity="0.08" />
      <text v-for="(g, i) in grid" :key="`t${i}`" :x="PAD.left - 6" :y="g.yv + 3" text-anchor="end" fill="rgb(var(--v-theme-on-surface))" fill-opacity="0.5" font-size="10">{{ g.label }}</text>
    </g>

    <g v-for="(d, i) in data" :key="i" @mouseenter="hover = i">
      <rect
        :x="bx(i)" :y="PAD.top + plotH - bh(d.value)" :width="barW" :height="bh(d.value)"
        rx="4" :fill="`rgb(var(--v-theme-${d.color || color}))`"
        :opacity="hover === null || hover === i ? 1 : 0.55"
        style="transition: opacity 0.15s ease"
      />
      <text
        v-if="hover === i"
        :x="bx(i) + barW / 2" :y="PAD.top + plotH - bh(d.value) - 5" text-anchor="middle"
        fill="rgb(var(--v-theme-on-surface))" font-size="11" font-weight="700"
      >{{ d.value }}</text>
      <text
        :x="bx(i) + barW / 2" :y="height - 10" text-anchor="middle"
        fill="rgb(var(--v-theme-on-surface))" fill-opacity="0.6" font-size="10"
      >{{ d.label }}</text>
    </g>
  </svg>
</template>
