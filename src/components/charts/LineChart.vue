<script setup lang="ts">
import { computed, ref } from 'vue'

// رسم خطّيّ SVG بمحاور وشبكة وتلميح — ألوان من الثيم، اتجاه LTR (زمنيّ).
interface Point { label: string, value: number }
const props = withDefaults(defineProps<{ data: Point[], color?: string, height?: number, area?: boolean }>(), {
  color: 'primary',
  height: 200,
  area: true,
})

const W = 560
const H = computed(() => props.height)
const PAD = { top: 14, right: 14, bottom: 26, left: 34 }

const max = computed(() => Math.max(1, ...props.data.map(d => d.value)))
const plotW = computed(() => W - PAD.left - PAD.right)
const plotH = computed(() => H.value - PAD.top - PAD.bottom)
const stepX = computed(() => (props.data.length > 1 ? plotW.value / (props.data.length - 1) : 0))

function x(i: number) { return PAD.left + i * stepX.value }
function y(v: number) { return PAD.top + plotH.value - (v / max.value) * plotH.value }

const line = computed(() => props.data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' '))
const areaPath = computed(() => `${line.value} L${x(props.data.length - 1).toFixed(1)},${(PAD.top + plotH.value).toFixed(1)} L${PAD.left},${(PAD.top + plotH.value).toFixed(1)} Z`)

// خطوط شبكة أفقيّة (4 مستويات)
const gridLines = computed(() => [0, 0.25, 0.5, 0.75, 1].map(f => ({
  yv: PAD.top + plotH.value - f * plotH.value,
  label: Math.round(f * max.value),
})))

// تسميات المحور السينيّ — نعرض كل n لتفادي الازدحام
const xTicks = computed(() => {
  const n = props.data.length
  const every = n > 8 ? Math.ceil(n / 7) : 1
  return props.data.map((d, i) => ({ i, label: d.label, show: i % every === 0 || i === n - 1 }))
})

const hover = ref<number | null>(null)
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" :style="{ height: `${H}px` }" dir="ltr" @mouseleave="hover = null">
    <!-- شبكة -->
    <g>
      <line
        v-for="(g, i) in gridLines" :key="i"
        :x1="PAD.left" :x2="W - PAD.right" :y1="g.yv" :y2="g.yv"
        stroke="rgb(var(--v-theme-on-surface))" stroke-opacity="0.08" stroke-width="1"
      />
      <text
        v-for="(g, i) in gridLines" :key="`t${i}`"
        :x="PAD.left - 6" :y="g.yv + 3" text-anchor="end"
        fill="rgb(var(--v-theme-on-surface))" fill-opacity="0.5" font-size="10"
      >{{ g.label }}</text>
    </g>

    <!-- مساحة + خطّ -->
    <path v-if="area" :d="areaPath" :fill="`rgb(var(--v-theme-${color}))`" opacity="0.1" />
    <path :d="line" fill="none" :stroke="`rgb(var(--v-theme-${color}))`" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

    <!-- نقاط + مناطق تمرير -->
    <g v-for="(d, i) in data" :key="i">
      <circle
        :cx="x(i)" :cy="y(d.value)" :r="hover === i ? 4.5 : 3"
        :fill="`rgb(var(--v-theme-${color}))`" stroke="rgb(var(--v-theme-surface))" stroke-width="1.5"
      />
      <rect
        :x="x(i) - stepX / 2" :y="PAD.top" :width="stepX || plotW" :height="plotH"
        fill="transparent" @mouseenter="hover = i"
      />
    </g>

    <!-- تلميح -->
    <g v-if="hover !== null" :transform="`translate(${x(hover)}, ${y(data[hover].value)})`">
      <line x1="0" :y1="0" x2="0" :y2="plotH + PAD.top - y(data[hover].value)" stroke="rgb(var(--v-theme-on-surface))" stroke-opacity="0.15" />
      <g :transform="`translate(${x(hover) > W - 90 ? -78 : 8}, -10)`">
        <rect x="0" y="-14" width="72" height="30" rx="6" fill="rgb(var(--v-theme-on-surface))" />
        <text x="8" y="-2" fill="rgb(var(--v-theme-surface))" font-size="10" opacity="0.7">{{ data[hover].label }}</text>
        <text x="8" y="11" fill="rgb(var(--v-theme-surface))" font-size="12" font-weight="700">{{ data[hover].value }}</text>
      </g>
    </g>

    <!-- محور سينيّ -->
    <text
      v-for="t in xTicks.filter(t => t.show)" :key="`x${t.i}`"
      :x="x(t.i)" :y="H - 8" text-anchor="middle"
      fill="rgb(var(--v-theme-on-surface))" fill-opacity="0.5" font-size="9"
    >{{ t.label }}</text>
  </svg>
</template>
