<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useReviewsStore } from '@/stores/ReviewsStore'
import type { ReviewDirection } from '@/stores/ReviewsStore'
import { ai } from '@/services/ai'

const route = useRoute()
const reviews = useReviewsStore()

const direction = computed(() => (route.query.direction as ReviewDirection) || 'toCandidate')
const subjectId = computed(() => (route.query.subject as string) || 'me')
const subjectName = computed(() => (route.query.name as string) || '')
const canReply = computed(() => direction.value === 'toCandidate' && subjectId.value === 'me')

const starFilter = ref<number | null>(null)
const sortOrder = ref<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')

const base = computed(() => reviews.forSubject(direction.value, subjectId.value))
const average = computed(() => reviews.averageFor(direction.value, subjectId.value))
const digest = computed(() => ai.reviewsDigest(base.value.map(r => r.comment)))

const filtered = computed(() => {
  let list = [...base.value]
  if (starFilter.value)
    list = list.filter(r => r.stars === starFilter.value)
  switch (sortOrder.value) {
    case 'oldest': list.sort((a, b) => a.date.localeCompare(b.date)); break
    case 'highest': list.sort((a, b) => b.stars - a.stars); break
    case 'lowest': list.sort((a, b) => a.stars - b.stars); break
    default: list.sort((a, b) => b.date.localeCompare(a.date))
  }
  return list
})

// Star distribution for the mini bar chart
const distribution = computed(() => {
  const d = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: base.value.filter(r => r.stars === star).length,
  }))
  const max = Math.max(1, ...d.map(x => x.count))
  return d.map(x => ({ ...x, pct: Math.round((x.count / max) * 100) }))
})

const sortOptions = [
  { value: 'newest', title: 'الأحدث' },
  { value: 'oldest', title: 'الأقدم' },
  { value: 'highest', title: 'الأعلى تقييمًا' },
  { value: 'lowest', title: 'الأقل تقييمًا' },
]

const replyingId = ref<number | null>(null)
const replyText = ref('')
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
</script>

<template>
  <div>
    <h1 class="text-h5 font-weight-bold mb-1">
      {{ direction === 'toCandidate' ? 'التقييمات الواردة عنك' : `تقييمات ${subjectName || 'المقيّم'}` }}
    </h1>
    <p class="text-body-2 text-medium-emphasis mb-4">جميع التقييمات العلنية الموثّقة، مرتّبة وقابلة للتصفية.</p>

    <VRow>
      <!-- Summary sidebar -->
      <VCol cols="12" md="4">
        <VCard class="pa-5">
          <div class="text-center mb-3">
            <div class="text-h2 font-weight-bold text-success">{{ average || '—' }}</div>
            <VRating :model-value="average" color="amber" active-color="amber" half-increments readonly />
            <div class="text-caption text-medium-emphasis">{{ base.length }} تقييمًا</div>
          </div>
          <div v-for="row in distribution" :key="row.star" class="d-flex align-center ga-2 mb-1">
            <span class="text-caption" style="width: 28px">{{ row.star }} ★</span>
            <VProgressLinear :model-value="row.pct" color="amber" height="8" rounded bg-color="surface-variant" />
            <span class="text-caption text-medium-emphasis" style="width: 20px">{{ row.count }}</span>
          </div>
          <VDivider class="my-3" />
          <div class="text-body-2 mb-2">
            <VIcon icon="mdi-robot-happy-outline" color="secondary" size="18" class="me-1" />{{ digest.summary }}
          </div>
          <div class="d-flex flex-wrap ga-1">
            <VChip v-for="tr in digest.traits" :key="tr" size="small" color="secondary" variant="tonal" label>{{ tr }}</VChip>
          </div>
        </VCard>
      </VCol>

      <!-- Reviews list -->
      <VCol cols="12" md="8">
        <VCard class="pa-4">
          <div class="d-flex align-center flex-wrap ga-2 mb-4">
            <VSelect v-model="sortOrder" :items="sortOptions" density="compact" hide-details style="max-width: 200px" />
            <VChipGroup v-model="starFilter" filter>
              <VChip v-for="s in [5, 4, 3, 2, 1]" :key="s" :value="s" size="small" label>{{ s }} ★</VChip>
            </VChipGroup>
          </div>

          <div v-if="filtered.length" class="d-flex flex-column ga-3">
            <div v-for="r in filtered" :key="r.id" class="review-item pa-3">
              <div class="d-flex align-center ga-2 mb-1">
                <VAvatar :color="r.authorRole === 'interviewer' ? 'secondary' : 'primary'" variant="tonal" size="36">
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

              <div v-if="r.reply" class="reply-block mt-2 pa-2">
                <div class="text-caption font-weight-bold text-secondary mb-1"><VIcon icon="mdi-reply" size="14" /> ردّك · {{ r.reply.date }}</div>
                <div class="text-body-2">{{ r.reply.text }}</div>
              </div>
              <template v-else-if="canReply">
                <div v-if="replyingId === r.id" class="mt-2">
                  <VTextarea v-model="replyText" rows="2" auto-grow density="compact" placeholder="اكتب ردًّا احترافيًّا..." hide-details class="mb-2" />
                  <div class="d-flex ga-2">
                    <VBtn size="x-small" color="secondary" variant="tonal" prepend-icon="mdi-robot-happy-outline" @click="suggestReply(r.stars, r.comment)">اقتراح رد</VBtn>
                    <VBtn size="x-small" color="accent" :disabled="!replyText.trim()" @click="submitReply(r.id)">إرسال</VBtn>
                    <VBtn size="x-small" variant="text" @click="replyingId = null">إلغاء</VBtn>
                  </div>
                </div>
                <VBtn v-else size="x-small" variant="text" color="secondary" prepend-icon="mdi-reply" class="mt-1" @click="replyingId = r.id; replyText = ''">رد على التقييم</VBtn>
              </template>
            </div>
          </div>
          <div v-else class="text-center text-medium-emphasis py-8">لا تقييمات مطابقة للتصفية.</div>
        </VCard>
      </VCol>
    </VRow>
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
