<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/AuthStore'
import { useReviewsStore } from '@/stores/ReviewsStore'
import type { ReviewDirection } from '@/stores/ReviewsStore'
import { ai } from '@/services/ai'

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
    <div class="d-flex align-center flex-wrap ga-4 mb-3">
      <div class="text-center">
        <div class="text-h4 font-weight-bold" :class="`text-${avgColor}`">{{ average || '—' }}</div>
        <VRating :model-value="average" color="amber" active-color="amber" half-increments readonly density="compact" size="small" />
        <div class="text-caption text-medium-emphasis">{{ count }} تقييمًا</div>
      </div>
      <VDivider vertical class="d-none d-sm-block" />
      <div class="flex-grow-1" style="min-width: 200px">
        <div v-if="count" class="text-body-2 mb-2">
          <VIcon icon="mdi-robot-happy-outline" color="secondary" size="18" class="me-1" />
          {{ digest.summary }}
        </div>
        <div class="d-flex flex-wrap ga-1">
          <VChip v-for="tr in digest.traits" :key="tr" size="x-small" color="secondary" variant="tonal" label>{{ tr }}</VChip>
        </div>
      </div>
      <VBtn v-if="canAddReview" color="accent" size="small" prepend-icon="mdi-star-plus-outline" @click="addDialog = true">أضف تقييمًا</VBtn>
    </div>

    <VDivider class="mb-3" />

    <!-- Review list -->
    <div v-if="shown.length" class="d-flex flex-column ga-3">
      <div v-for="r in shown" :key="r.id" class="review-item pa-3">
        <div class="d-flex align-center ga-2 mb-1">
          <VAvatar :color="r.authorRole === 'interviewer' ? 'secondary' : 'primary'" variant="tonal" size="34">
            <span class="font-weight-bold">{{ r.authorInitial }}</span>
          </VAvatar>
          <div class="flex-grow-1">
            <div class="text-body-2 font-weight-bold d-flex align-center ga-1">
              {{ r.authorName }}
              <VIcon v-if="r.authorRole === 'interviewer'" icon="mdi-check-decagram" color="secondary" size="14" />
            </div>
            <div class="text-caption text-medium-emphasis">{{ r.date }}<span v-if="r.kindLabel"> · {{ r.kindLabel }}</span></div>
          </div>
          <VRating :model-value="r.stars" color="amber" active-color="amber" readonly density="compact" size="x-small" />
        </div>
        <p class="text-body-2 mb-0">{{ r.comment }}</p>

        <!-- Reply -->
        <div v-if="r.reply" class="reply-block mt-2 pa-2">
          <div class="text-caption font-weight-bold text-secondary mb-1">
            <VIcon icon="mdi-reply" size="14" /> رد {{ subjectName || 'صاحب الملف' }} · {{ r.reply.date }}
          </div>
          <div class="text-body-2">{{ r.reply.text }}</div>
        </div>

        <!-- Reply editor -->
        <template v-else-if="canReply">
          <div v-if="replyingId === r.id" class="mt-2">
            <VTextarea v-model="replyText" rows="2" auto-grow density="compact" placeholder="اكتب ردًّا احترافيًّا..." hide-details class="mb-2" />
            <div class="d-flex ga-2">
              <VBtn size="x-small" color="secondary" variant="tonal" prepend-icon="mdi-robot-happy-outline" @click="suggestReply(r.stars, r.comment)">اقتراح رد</VBtn>
              <VBtn size="x-small" color="accent" :disabled="!replyText.trim()" @click="submitReply(r.id)">إرسال الرد</VBtn>
              <VBtn size="x-small" variant="text" @click="replyingId = null">إلغاء</VBtn>
            </div>
          </div>
          <VBtn v-else size="x-small" variant="text" color="secondary" prepend-icon="mdi-reply" class="mt-1" @click="startReply(r.id)">رد على التقييم</VBtn>
        </template>
      </div>
    </div>
    <div v-else class="text-center text-medium-emphasis py-6">لا توجد تقييمات بعد.</div>

    <!-- View all -->
    <div v-if="!compact && count > limit" class="text-center mt-3">
      <VBtn variant="text" color="primary" append-icon="mdi-arrow-left" @click="viewAll">عرض كل التقييمات ({{ count }})</VBtn>
    </div>

    <!-- Add review dialog -->
    <VDialog v-model="addDialog" max-width="480">
      <VCard class="pa-2">
        <VCardTitle>قيّم {{ subjectName || 'المقيّم' }}</VCardTitle>
        <VCardText>
          <div class="text-body-2 mb-1">تقييمك بالنجوم</div>
          <VRating v-model="newStars" color="amber" active-color="amber" size="large" class="mb-3" />
          <VTextarea v-model="newComment" label="تعليقك" rows="3" auto-grow placeholder="صف تجربتك بوضوح وإنصاف..." />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="addDialog = false">إلغاء</VBtn>
          <VBtn color="accent" :disabled="!newComment.trim()" @click="submitReview">نشر التقييم</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
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
