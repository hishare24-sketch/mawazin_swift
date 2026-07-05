<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/AuthStore'
import { useReviewsStore } from '@/stores/ReviewsStore'
import type { ReviewDirection } from '@/stores/ReviewsStore'
import { ai } from '@/services/ai'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseRating from '@/components/ui/BaseRating.vue'

const props = withDefaults(defineProps<{
  direction: ReviewDirection
  subjectId: string
  subjectName?: string
  canReply?: boolean // current user owns these reviews → may reply once
  canAddReview?: boolean // current user may post a review for this subject
  limit?: number
  compact?: boolean // hide the "view all" link (used on the full page)
}>(), { limit: 5 })

const router = useRouter()
const authStore = useAuthStore()
const reviews = useReviewsStore()

const all = computed(() => reviews.forSubject(props.direction, props.subjectId))
const shown = computed(() => (props.compact ? all.value : all.value.slice(0, props.limit)))
const average = computed(() => reviews.averageFor(props.direction, props.subjectId))
const count = computed(() => all.value.length)
const digest = computed(() => ai.reviewsDigest(all.value.map(r => r.comment)))
const avgColor = computed(() => (average.value >= 4.5 ? 'success' : average.value >= 3.5 ? 'warning' : 'error'))

// — Reply (once) —
const replyingId = ref<number | null>(null)
const replyText = ref('')
function startReply(id: number) {
  replyingId.value = id
  replyText.value = ''
}
function suggestReply(stars: number, comment: string) {
  replyText.value = ai.suggestReviewReply(stars, comment)
}
function submitReply(id: number) {
  if (replyText.value.trim()) {
    reviews.addReply(id, replyText.value)
    replyingId.value = null
    replyText.value = ''
  }
}

// — Add review —
const addDialog = ref(false)
const newStars = ref(5)
const newComment = ref('')
function submitReview() {
  if (!newComment.value.trim())
    return
  const name = authStore.authUser?.name ?? 'مستخدم'
  reviews.addReview({
    direction: props.direction,
    subjectId: props.subjectId,
    authorName: name,
    authorInitial: name.charAt(0),
    authorRole: 'seeker',
    stars: newStars.value,
    comment: newComment.value.trim(),
  })
  newComment.value = ''
  newStars.value = 5
  addDialog.value = false
}

function viewAll() {
  router.push({ name: 'reviews', query: { direction: props.direction, subject: props.subjectId, name: props.subjectName ?? '' } })
}
</script>

<template>
  <div>
    <!-- Summary header -->
    <div class="mb-3 flex flex-wrap items-center gap-4">
      <div class="text-center">
        <div class="text-3xl font-bold" :style="{ color: `rgb(var(--v-theme-${avgColor}))` }">{{ average || '—' }}</div>
        <BaseRating :model-value="average" color="warning" :size="18" readonly />
        <div class="text-xs text-muted">{{ count }} تقييمًا</div>
      </div>
      <div class="hidden w-px self-stretch bg-[rgba(var(--v-theme-on-surface),0.14)] sm:block" />
      <div class="flex-1" style="min-width: 200px">
        <div v-if="count" class="mb-2 flex items-center gap-1 text-sm text-content">
          <BaseIcon name="mdi-robot-happy-outline" :size="18" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
          {{ digest.summary }}
        </div>
        <div class="flex flex-wrap gap-1">
          <BaseChip v-for="tr in digest.traits" :key="tr" color="emerald">{{ tr }}</BaseChip>
        </div>
      </div>
      <BaseButton v-if="canAddReview" variant="tonal-accent" size="sm" @click="addDialog = true"><BaseIcon name="mdi-star-plus-outline" :size="16" />أضف تقييمًا</BaseButton>
    </div>

    <hr class="mb-3 border-ui">

    <!-- Review list -->
    <div v-if="shown.length" class="flex flex-col gap-3">
      <div v-for="r in shown" :key="r.id" class="review-item p-3">
        <div class="mb-1 flex items-center gap-2">
          <BaseAvatar :color="r.authorRole === 'interviewer' ? 'emerald' : 'brand'" tonal :size="34">
            <span class="font-bold">{{ r.authorInitial }}</span>
          </BaseAvatar>
          <div class="flex-1">
            <div class="flex items-center gap-1 text-sm font-bold text-content">
              {{ r.authorName }}
              <BaseIcon v-if="r.authorRole === 'interviewer'" name="mdi-check-decagram" :size="14" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
            </div>
            <div class="text-xs text-muted">{{ r.date }}<span v-if="r.kindLabel"> · {{ r.kindLabel }}</span></div>
          </div>
          <BaseRating :model-value="r.stars" color="warning" :size="14" readonly />
        </div>
        <p class="mb-0 text-sm text-content">{{ r.comment }}</p>

        <!-- Reply -->
        <div v-if="r.reply" class="reply-block mt-2 p-2">
          <div class="mb-1 flex items-center gap-1 text-xs font-bold" :style="{ color: 'rgb(var(--v-theme-secondary))' }">
            <BaseIcon name="mdi-reply" :size="14" /> رد {{ subjectName || 'صاحب الملف' }} · {{ r.reply.date }}
          </div>
          <div class="text-sm text-content">{{ r.reply.text }}</div>
        </div>

        <!-- Reply editor -->
        <template v-else-if="canReply">
          <div v-if="replyingId === r.id" class="mt-2">
            <BaseTextarea v-model="replyText" :rows="2" placeholder="اكتب ردًّا احترافيًّا..." class="mb-2" />
            <div class="flex gap-2">
              <BaseButton variant="tonal-emerald" size="sm" @click="suggestReply(r.stars, r.comment)"><BaseIcon name="mdi-robot-happy-outline" :size="16" />اقتراح رد</BaseButton>
              <BaseButton variant="accent" size="sm" :disabled="!replyText.trim()" @click="submitReply(r.id)">إرسال الرد</BaseButton>
              <BaseButton variant="ghost" size="sm" @click="replyingId = null">إلغاء</BaseButton>
            </div>
          </div>
          <BaseButton v-else variant="ghost" size="sm" class="mt-1" @click="startReply(r.id)">
            <BaseIcon name="mdi-reply" :size="16" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
            <span :style="{ color: 'rgb(var(--v-theme-secondary))' }">رد على التقييم</span>
          </BaseButton>
        </template>
      </div>
    </div>
    <div v-else class="py-6 text-center text-muted">لا توجد تقييمات بعد.</div>

    <!-- View all -->
    <div v-if="!compact && count > limit" class="mt-3 text-center">
      <BaseButton variant="ghost" size="sm" @click="viewAll">عرض كل التقييمات ({{ count }})<BaseIcon name="mdi-arrow-left" :size="16" /></BaseButton>
    </div>

    <!-- Add review dialog -->
    <BaseModal v-model="addDialog" :title="`قيّم ${subjectName || 'المقيّم'}`" :max-width="480">
      <div class="mb-1 text-sm text-content">تقييمك بالنجوم</div>
      <BaseRating v-model="newStars" color="warning" :size="34" class="mb-3" />
      <BaseTextarea v-model="newComment" label="تعليقك" :rows="3" placeholder="صف تجربتك بوضوح وإنصاف..." />
      <template #actions>
        <BaseButton variant="ghost" @click="addDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" :disabled="!newComment.trim()" @click="submitReview">نشر التقييم</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.review-item {
  border: 1px solid rgba(140, 163, 150, 0.18);
  border-radius: var(--ui-radius);
}
.reply-block {
  border-inline-start: 3px solid rgb(var(--v-theme-secondary));
  border-radius: 8px;
  background: rgba(var(--v-theme-secondary), 0.08);
}
</style>
