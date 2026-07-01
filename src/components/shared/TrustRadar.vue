<script setup lang="ts">
import { computed } from 'vue'

interface RadarPoint { label: string, value: number }
const props = defineProps<{ points: RadarPoint[], size?: number }>()

const size = computed(() => props.size ?? 260)
const center = computed(() => size.value / 2)
const radius = computed(() => size.value / 2 - 34)

function coord(index: number, value: number) {
  const n = props.points.length
  const angle = (Math.PI * 2 * index) / n - Math.PI / 2
  const r = (value / 100) * radius.value
  return {
    x: center.value + r * Math.cos(angle),
    y: center.value + r * Math.sin(angle),
  }
}

function axisCoord(index: number, factor = 1) {
  const n = props.points.length
  const angle = (Math.PI * 2 * index) / n - Math.PI / 2
  return {
    x: center.value + radius.value * factor * Math.cos(angle),
    y: center.value + radius.value * factor * Math.sin(angle),
  }
}

const polygon = computed(() =>
  props.points.map((p, i) => {
    const c = coord(i, p.value)
    return `${c.x},${c.y}`
  }).join(' '),
)

const rings = [0.25, 0.5, 0.75, 1]
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
    <!-- grid rings -->
    <polygon
      v-for="(ring, ri) in rings"
      :key="ri"
      :points="points.map((_, i) => { const c = axisCoord(i, ring); return `${c.x},${c.y}` }).join(' ')"
      fill="none"
      stroke="rgba(120,130,150,0.2)"
      stroke-width="1"
    />
    <!-- axes -->
    <line
      v-for="(p, i) in points"
      :key="`axis-${i}`"
      :x1="center" :y1="center"
      :x2="axisCoord(i).x" :y2="axisCoord(i).y"
      stroke="rgba(120,130,150,0.2)"
      stroke-width="1"
    />
    <!-- data polygon -->
    <polygon :points="polygon" fill="rgba(49,151,149,0.28)" stroke="#319795" stroke-width="2" />
    <!-- vertices -->
    <circle
      v-for="(p, i) in points"
      :key="`v-${i}`"
      :cx="coord(i, p.value).x" :cy="coord(i, p.value).y"
      r="3" fill="#1A365D"
    />
    <!-- labels -->
    <text
      v-for="(p, i) in points"
      :key="`l-${i}`"
      :x="axisCoord(i, 1.16).x" :y="axisCoord(i, 1.16).y"
      text-anchor="middle"
      dominant-baseline="middle"
      font-size="9"
      fill="currentColor"
      opacity="0.7"
    >
      {{ p.label }}
    </text>
  </svg>
</template>
