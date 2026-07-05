<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import {
  QUESTION_TYPE_META,
  TEST_SIZES,
  availableAssessments,
  completedAssessments,
} from '../services/mockAssessments'
import { useGamificationStore } from '@/stores/GamificationStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'

const router = useRouter()
const g = useGamificationStore()
// Points, leaderboard and challenges now come from the real gamification engine
const leaderboard = computed(() => g.leaderboard)
const METRIC_ICON: Record<string, string> = { skills: 'mdi-star-plus-outline', interviews: 'mdi-account-tie-voice-outline', recommendations: 'mdi-comment-check-outline', assessments: 'mdi-clipboard-check-outline', peerRequests: 'mdi-swap-horizontal-circle-outline', loginDays: 'mdi-calendar-check-outline' }

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c?: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral', 'surface-variant': 'neutral', grey: 'neutral', orange: 'warning', amber: 'warning', 'blue-grey': 'neutral', brown: 'neutral' } as Record<string, BaseColor>)[c ?? ''] ?? c ?? 'brand') as BaseColor
}
// ألوان منصّة المتصدّرين (ذهبي/فضي/برونزي) — خارج رموز الثيم
const MEDAL = ['#F59E0B', '#94A3B8', '#B45309']
function rankBg(rank: number) {
  return rank <= 3 ? MEDAL[rank - 1] : 'rgba(var(--v-theme-on-surface), 0.12)'
}

// Size picker dialog
const sizeDialog = ref(false)
const pendingId = ref<number | null>(null)
function startTest(id: number) {
  pendingId.value = id
  sizeDialog.value = true
}
function confirmStart(size: number) {
  if (pendingId.value != null)
    router.push({ name: 'assessment-take', params: { id: pendingId.value }, query: { size } })
  sizeDialog.value = false
}

function viewResult(id: number, score: number, name: string) {
  router.push({ name: 'assessment-result', params: { id }, query: { score, name } })
}

const allTypes = Object.values(QUESTION_TYPE_META)
</script>

<template>
  <div>
    <PageHeader
      title="مركز التقييم والاختبارات"
      subtitle="اختبارات وألعاب ذكية بـ 10 أنماط أسئلة — تُولّد فريدة لكل محاولة"
      icon="mdi-clipboard-check-outline"
    >
      <template #actions>
        <BaseChip color="accent"><BaseIcon name="mdi-star-four-points" :size="14" />{{ g.points.toLocaleString('en-US') }} نقطة</BaseChip>
      </template>
    </PageHeader>

    <!-- Question-type variety -->
    <div class="mb-5 rounded-ui p-3" style="background: rgba(var(--v-theme-secondary), 0.12)">
      <div class="flex flex-wrap items-center gap-1">
        <BaseIcon name="mdi-shape-outline" :size="18" class="me-1" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
        <span class="me-2 text-xs font-bold text-content">10 أنماط أسئلة:</span>
        <BaseChip v-for="t in allTypes" :key="t.label" color="neutral"><BaseIcon :name="t.icon" :size="12" />{{ t.label }}</BaseChip>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div class="lg:col-span-8">
        <h3 class="mb-3 text-lg font-bold text-content">الاختبارات المتاحة</h3>
        <div class="mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseCard v-for="test in availableAssessments" :key="test.id" class="flex h-full flex-col">
            <div class="mb-2 flex items-center gap-3">
              <BaseAvatar :color="mapColor(test.color)" tonal square :size="48">
                <BaseIcon :name="test.icon" :size="26" />
              </BaseAvatar>
              <div>
                <div class="text-sm font-bold text-content">{{ test.name }}</div>
                <BaseChip color="neutral" class="mt-1">{{ test.type }}</BaseChip>
              </div>
            </div>
            <div class="mb-3 flex-1 text-xs text-muted">
              <BaseIcon name="mdi-shape-outline" :size="14" /> أنماط متعددة · حجم مرن (سريع/متوسط/شامل)
            </div>
            <BaseButton variant="accent" size="sm" block @click="startTest(test.id)"><BaseIcon name="mdi-play" :size="16" />ابدأ الاختبار</BaseButton>
          </BaseCard>
        </div>

        <!-- Challenges (live from the gamification engine) -->
        <h3 class="mb-3 mt-5 text-lg font-bold text-content">التحديات</h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseCard v-for="c in g.challenges" :key="c.id">
            <div class="mb-2 flex items-center gap-3">
              <BaseAvatar :color="c.done ? 'success' : 'accent'" tonal square>
                <BaseIcon :name="c.done ? 'mdi-check' : (METRIC_ICON[c.metric] || 'mdi-target')" :size="20" />
              </BaseAvatar>
              <div class="flex-1">
                <div class="text-sm font-bold text-content">{{ c.title }}</div>
                <div class="text-xs text-muted">{{ c.progress }}/{{ c.target }} — {{ c.done ? 'مكتمل' : 'قيد التقدّم' }}</div>
              </div>
              <BaseChip :color="c.done ? 'success' : 'warning'"><BaseIcon name="mdi-star-four-points" :size="12" />+{{ c.reward }}</BaseChip>
            </div>
            <BaseProgressBar :value="(c.progress / c.target) * 100" :color="c.done ? 'success' : 'accent'" :height="6" />
          </BaseCard>
        </div>
      </div>

      <!-- Leaderboard -->
      <div class="lg:col-span-4">
        <h3 class="mb-3 text-lg font-bold text-content">لوحة المتصدّرين</h3>
        <BaseCard :padded="false" class="mb-5 p-2">
          <div
            v-for="row in leaderboard"
            :key="row.rank"
            class="flex items-center gap-2 rounded-ui px-2 py-2"
            :class="{ 'bg-secondary-lighten': row.you }"
          >
            <span
              class="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-xs font-bold"
              :style="{ background: rankBg(row.rank), color: row.rank <= 3 ? '#fff' : 'rgb(var(--v-theme-on-surface))' }"
            >{{ row.rank }}</span>
            <span class="flex-1 font-bold" :class="row.you ? '' : 'text-content'" :style="row.you ? { color: 'rgb(var(--v-theme-secondary))' } : {}">{{ row.name }}</span>
            <span class="text-sm font-bold text-content">{{ row.points.toLocaleString('en-US') }}</span>
          </div>
        </BaseCard>

        <h3 class="mb-3 text-lg font-bold text-content">الاختبارات المنجزة</h3>
        <BaseCard :padded="false">
          <div v-for="(test, i) in completedAssessments" :key="test.id" class="flex items-center gap-3 p-3" :class="{ 'border-t border-ui': i > 0 }">
            <BaseAvatar :color="test.score >= 85 ? 'success' : 'warning'" tonal square>
              <span class="font-bold">{{ test.score }}</span>
            </BaseAvatar>
            <div class="min-w-0 flex-1">
              <div class="font-bold text-content">{{ test.name }}</div>
              <div class="truncate text-xs text-muted">{{ test.date }} · {{ test.level }}</div>
            </div>
            <BaseButton variant="tonal-brand" size="sm" @click="viewResult(test.id, test.score, test.name)">التحليل</BaseButton>
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- Test-size picker -->
    <BaseModal v-model="sizeDialog" title="اختر حجم الاختبار" :max-width="480">
      <button
        v-for="s in TEST_SIZES"
        :key="s.value"
        type="button"
        class="mb-2 flex w-full items-center gap-3 rounded-ui-lg border-ui p-3 text-start transition hover:bg-surfalt"
        @click="confirmStart(s.value)"
      >
        <BaseAvatar color="accent" tonal square><BaseIcon name="mdi-format-list-numbered" :size="20" /></BaseAvatar>
        <div class="flex-1">
          <div class="text-sm font-bold text-content">{{ s.label }} — {{ s.value }} سؤال</div>
          <div class="text-xs text-muted">زمن تقديري ~{{ s.minutes }} دقيقة</div>
        </div>
        <BaseIcon name="mdi-arrow-left-circle" :size="22" :style="{ color: 'rgb(var(--v-theme-accent))' }" />
      </button>
    </BaseModal>
  </div>
</template>

<style scoped>
.bg-secondary-lighten {
  background: rgba(var(--v-theme-secondary), 0.1);
}
</style>
