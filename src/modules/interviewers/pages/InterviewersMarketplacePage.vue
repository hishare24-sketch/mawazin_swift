<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { BOOKING_STATUS_META, INTERVIEWER_TYPE_META, KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import type { InterviewerType } from '@/stores/InterviewersStore'
import { useProfileStore } from '@/stores/ProfileStore'
import EmptyState from '@/components/shared/EmptyState.vue'

const router = useRouter()
const store = useInterviewersStore()
const profile = useProfileStore()

const candidate = computed(() => ({
  field: 'تطوير الويب',
  skills: profile.skills.map(s => s.name),
}))

const recommended = computed(() => store.recommendedFor(candidate.value))

// Filters
const types = Object.keys(INTERVIEWER_TYPE_META) as InterviewerType[]
const selectedTypes = ref<InterviewerType[]>([])
const minRating = ref(0)
const maxPrice = ref(500)

function toggleType(t: InterviewerType) {
  selectedTypes.value = selectedTypes.value.includes(t)
    ? selectedTypes.value.filter(x => x !== t)
    : [...selectedTypes.value, t]
}

const filtered = computed(() =>
  store.interviewers.filter((iv) => {
    if (selectedTypes.value.length && !selectedTypes.value.includes(iv.type))
      return false
    if (iv.rating < minRating.value)
      return false
    if (iv.priceMin > maxPrice.value)
      return false
    return true
  }),
)

function matchOf(id: number) {
  return store.matchFor(candidate.value, id)
}
function open(id: number) {
  router.push({ name: 'interviewer-profile', params: { id } })
}
</script>

<template>
  <div>
    <PageHeader
      title="سوق المقيّمين المعتمدين"
      subtitle="خبراء معتمدون يُجرون مقابلات تقييمية موثّقة ترفع نسبة ثقتك"
      icon="mdi-account-supervisor-circle-outline"
    >
      <template #actions>
        <VBtn variant="tonal" color="secondary" prepend-icon="mdi-badge-account-outline" :to="{ name: 'interviewer-register' }">
          سجّل كمقيّم
        </VBtn>
      </template>
    </PageHeader>

    <!-- AI recommended -->
    <div v-if="recommended.length" class="mb-6">
      <div class="d-flex align-center ga-2 mb-3">
        <VIcon icon="mdi-robot-happy-outline" color="secondary" />
        <h2 class="text-subtitle-1 font-weight-bold">مقيّمون موصى بهم لك</h2>
      </div>
      <VRow>
        <VCol v-for="r in recommended" :key="r.interviewer.id" cols="12" md="4">
          <VCard class="pa-4 h-100 cursor-pointer" variant="tonal" color="secondary" @click="open(r.interviewer.id)">
            <div class="d-flex align-center ga-3 mb-2">
              <VAvatar :color="INTERVIEWER_TYPE_META[r.interviewer.type].color" size="48">
                <span class="text-white font-weight-bold">{{ r.interviewer.initial }}</span>
              </VAvatar>
              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-bold">{{ r.interviewer.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ INTERVIEWER_TYPE_META[r.interviewer.type].label }}</div>
              </div>
              <VChip color="success" size="small" label>{{ r.match }}%</VChip>
            </div>
            <p class="text-caption mb-0">{{ r.reason }}</p>
          </VCard>
        </VCol>
      </VRow>
    </div>

    <VRow>
      <!-- Filters -->
      <VCol cols="12" md="3">
        <VCard class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-subtitle-2 font-weight-bold">فلترة</span>
            <VIcon icon="mdi-filter-variant" size="18" />
          </div>
          <div class="text-caption font-weight-bold mb-2">التخصص</div>
          <div class="d-flex flex-wrap ga-1 mb-4">
            <VChip
              v-for="t in types"
              :key="t"
              :color="selectedTypes.includes(t) ? INTERVIEWER_TYPE_META[t].color : undefined"
              :variant="selectedTypes.includes(t) ? 'flat' : 'outlined'"
              size="small"
              @click="toggleType(t)"
            >
              {{ INTERVIEWER_TYPE_META[t].label }}
            </VChip>
          </div>
          <div class="text-caption font-weight-bold mb-1">أدنى تقييم ({{ minRating }}★)</div>
          <VSlider v-model="minRating" :min="0" :max="5" :step="0.5" color="warning" hide-details class="mb-3" />
          <div class="text-caption font-weight-bold mb-1">أعلى سعر بداية ({{ maxPrice }} ريال)</div>
          <VSlider v-model="maxPrice" :min="30" :max="500" :step="10" color="accent" hide-details />
        </VCard>
      </VCol>

      <!-- Interviewers grid -->
      <VCol cols="12" md="9">
        <div class="text-body-2 text-medium-emphasis mb-3">{{ filtered.length }} مقيّم معتمد</div>
        <VRow>
          <VCol v-for="iv in filtered" :key="iv.id" cols="12" sm="6">
            <VCard class="pa-4 h-100 d-flex flex-column cursor-pointer" @click="open(iv.id)">
              <div class="d-flex align-start ga-3 mb-2">
                <VAvatar :color="INTERVIEWER_TYPE_META[iv.type].color" size="52">
                  <span class="text-white text-h6 font-weight-bold">{{ iv.initial }}</span>
                </VAvatar>
                <div class="flex-grow-1">
                  <div class="d-flex align-center ga-1">
                    <span class="text-body-1 font-weight-bold">{{ iv.name }}</span>
                    <VIcon v-if="iv.verified" icon="mdi-check-decagram" color="primary" size="16" />
                  </div>
                  <div class="text-caption text-medium-emphasis">{{ iv.title }}</div>
                </div>
                <VChip color="success" size="small" label>{{ matchOf(iv.id) }}%</VChip>
              </div>

              <div class="d-flex align-center ga-2 mb-2">
                <VChip :color="INTERVIEWER_TYPE_META[iv.type].color" size="x-small" label :prepend-icon="INTERVIEWER_TYPE_META[iv.type].icon">
                  {{ INTERVIEWER_TYPE_META[iv.type].label }}
                </VChip>
                <div class="d-flex align-center text-caption text-medium-emphasis">
                  <VIcon icon="mdi-star" color="warning" size="14" class="me-1" />{{ iv.rating }} ({{ iv.reviewsCount }})
                </div>
              </div>

              <div class="d-flex flex-wrap ga-1 mb-3 flex-grow-1">
                <VChip v-for="s in iv.specialties.slice(0, 3)" :key="s" size="x-small" variant="tonal">{{ s }}</VChip>
              </div>

              <div class="d-flex align-center justify-space-between">
                <span class="text-caption text-medium-emphasis">{{ iv.sessionsCount }} مقابلة</span>
                <span class="text-body-2 font-weight-bold">{{ iv.priceMin }}–{{ iv.priceMax }} ريال</span>
              </div>
            </VCard>
          </VCol>
        </VRow>
        <VCard v-if="!filtered.length">
          <EmptyState
            icon="mdi-account-search-outline"
            title="لا مقيّمين مطابقين"
            description="جرّب توسيع نطاق التقييم أو السعر، أو إزالة فلتر التخصص."
          />
        </VCard>

        <!-- My bookings -->
        <div v-if="store.bookings.length" class="mt-6">
          <h2 class="text-subtitle-1 font-weight-bold mb-3">حجوزاتي مع المقيّمين ({{ store.bookings.length }})</h2>
          <VCard>
            <VList lines="two">
              <template v-for="(b, i) in store.bookings" :key="b.id">
                <VListItem>
                  <template #prepend>
                    <VAvatar color="primary" variant="tonal" rounded="lg"><VIcon icon="mdi-account-tie-voice-outline" /></VAvatar>
                  </template>
                  <VListItemTitle class="font-weight-bold">{{ b.interviewerName }} · {{ KIND_META[b.kind].label }}</VListItemTitle>
                  <VListItemSubtitle>{{ b.datetime }} · {{ b.price }} ريال</VListItemSubtitle>
                  <template #append>
                    <div class="d-flex align-center ga-2">
                      <VChip v-if="b.report" color="success" size="small" label>{{ b.report.overall }}%</VChip>
                      <VChip :color="BOOKING_STATUS_META[b.status].color" size="small" label>{{ BOOKING_STATUS_META[b.status].label }}</VChip>
                    </div>
                  </template>
                </VListItem>
                <VDivider v-if="i < store.bookings.length - 1" />
              </template>
            </VList>
          </VCard>
        </div>
      </VCol>
    </VRow>
  </div>
</template>
