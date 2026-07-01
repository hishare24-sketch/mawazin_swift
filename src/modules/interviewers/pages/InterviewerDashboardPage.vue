<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import { KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import type { AgendaItem, MarketInterviewKind } from '@/stores/InterviewersStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

const router = useRouter()
const store = useInterviewersStore()
const notifications = useNotificationsStore()

function acceptRequest(a: AgendaItem) {
  store.acceptRequest(a.id)
  notifications.push({
    icon: 'mdi-calendar-check-outline',
    color: 'success',
    title: 'قبلت طلب مقابلة',
    body: `أكّدت مقابلة ${KIND_META[a.kind].label} مع ${a.candidateName} — ${a.datetime}`,
    category: 'interview',
  })
}

const stats = computed(() => [
  { title: 'أرباح الشهر', value: `${store.interviewerStats.earnings} ﷼`, icon: 'mdi-cash-multiple', color: 'success' },
  { title: 'مقابلات منفّذة', value: store.interviewerStats.sessions, icon: 'mdi-check-decagram', color: 'primary' },
  { title: 'متوسط التقييم', value: `${store.interviewerStats.avgRating} ★`, icon: 'mdi-star', color: 'warning' },
  { title: 'طلبات جديدة', value: store.interviewerStats.pending, icon: 'mdi-bell-ring-outline', color: 'accent' },
])

// Pricing management
const priceDialog = ref(false)
const kinds = Object.keys(KIND_META) as MarketInterviewKind[]
const draftPricing = ref<Record<MarketInterviewKind, number>>({ ...store.pricing })
function openPricing() {
  draftPricing.value = { ...store.pricing }
  priceDialog.value = true
}
function savePricing() {
  kinds.forEach(k => store.setPrice(k, draftPricing.value[k]))
  priceDialog.value = false
}
</script>

<template>
  <div>
    <PageHeader
      title="لوحة المقيّم"
      subtitle="أدر مقابلاتك التقييمية وأرباحك وأسعارك"
      icon="mdi-account-tie"
    >
      <template #actions>
        <VBtn variant="tonal" color="secondary" prepend-icon="mdi-tag-outline" @click="openPricing">إدارة الأسعار</VBtn>
      </template>
    </PageHeader>

    <VRow class="mb-2">
      <VCol v-for="s in stats" :key="s.title" cols="12" sm="6" lg="3">
        <StatCard v-bind="s" />
      </VCol>
    </VRow>

    <!-- AI tip -->
    <VAlert color="secondary" variant="tonal" class="mb-4" border="start">
      <template #prepend><VIcon icon="mdi-robot-happy-outline" /></template>
      <span class="text-body-2">
        لديك {{ store.interviewerStats.pending }} طلب مقابلة جديد يناسب تخصصك — الرد السريع يرفع تقييمك وترتيبك في السوق.
      </span>
    </VAlert>

    <VRow>
      <!-- Requests + upcoming -->
      <VCol cols="12" lg="7">
        <h2 class="text-subtitle-1 font-weight-bold mb-3">طلبات مقابلات جديدة ({{ store.agendaRequests.length }})</h2>
        <VCard v-if="store.agendaRequests.length" class="mb-5">
          <VList lines="two">
            <template v-for="(a, i) in store.agendaRequests" :key="a.id">
              <VListItem>
                <template #prepend>
                  <VAvatar color="accent" variant="tonal"><span class="font-weight-bold">{{ a.candidateInitial }}</span></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ a.candidateName }} · {{ KIND_META[a.kind].label }}</VListItemTitle>
                <VListItemSubtitle>{{ a.candidateField }} · {{ a.datetime }} · {{ a.price }} ﷼</VListItemSubtitle>
                <template #append>
                  <div class="d-flex ga-1">
                    <VBtn size="small" color="success" variant="tonal" prepend-icon="mdi-check" @click="acceptRequest(a)">قبول</VBtn>
                    <VBtn icon="mdi-close" size="small" variant="text" color="error" @click="store.declineRequest(a.id)" />
                  </div>
                </template>
              </VListItem>
              <VDivider v-if="i < store.agendaRequests.length - 1" />
            </template>
          </VList>
        </VCard>
        <VCard v-else class="pa-6 text-center mb-5">
          <VIcon icon="mdi-inbox-outline" size="40" color="medium-emphasis" />
          <div class="text-body-2 text-medium-emphasis mt-1">لا طلبات جديدة حاليًا</div>
        </VCard>

        <h2 class="text-subtitle-1 font-weight-bold mb-3">مقابلات قادمة ({{ store.agendaUpcoming.length }})</h2>
        <VCard v-if="store.agendaUpcoming.length">
          <VList lines="two">
            <template v-for="(a, i) in store.agendaUpcoming" :key="a.id">
              <VListItem>
                <template #prepend>
                  <VAvatar color="info" variant="tonal"><span class="font-weight-bold">{{ a.candidateInitial }}</span></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ a.candidateName }} · {{ KIND_META[a.kind].label }}</VListItemTitle>
                <VListItemSubtitle>{{ a.datetime }} · {{ a.price }} ﷼</VListItemSubtitle>
                <template #append>
                  <VBtn size="small" color="primary" prepend-icon="mdi-video-outline" @click="router.push({ name: 'conduct-interview', params: { id: a.id } })">
                    بدء المقابلة
                  </VBtn>
                </template>
              </VListItem>
              <VDivider v-if="i < store.agendaUpcoming.length - 1" />
            </template>
          </VList>
        </VCard>
        <VCard v-else class="pa-6 text-center">
          <VIcon icon="mdi-calendar-blank-outline" size="40" color="medium-emphasis" />
          <div class="text-body-2 text-medium-emphasis mt-1">لا مقابلات مجدولة</div>
        </VCard>
      </VCol>

      <!-- Completed -->
      <VCol cols="12" lg="5">
        <h2 class="text-subtitle-1 font-weight-bold mb-3">مقابلات منفّذة ({{ store.agendaCompleted.length }})</h2>
        <VCard>
          <VList v-if="store.agendaCompleted.length" lines="two">
            <template v-for="(a, i) in store.agendaCompleted" :key="a.id">
              <VListItem>
                <template #prepend>
                  <VAvatar color="success" variant="tonal"><span class="font-weight-bold">{{ a.candidateInitial }}</span></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ a.candidateName }}</VListItemTitle>
                <VListItemSubtitle>{{ KIND_META[a.kind].label }} · {{ a.datetime }}</VListItemSubtitle>
                <template #append>
                  <div class="d-flex align-center ga-2">
                    <VRating v-if="a.rating" :model-value="a.rating" color="warning" density="compact" size="x-small" readonly />
                    <VChip v-if="a.report" color="success" size="small" label>{{ a.report.overall }}%</VChip>
                  </div>
                </template>
              </VListItem>
              <VDivider v-if="i < store.agendaCompleted.length - 1" />
            </template>
          </VList>
          <div v-else class="pa-6 text-center text-medium-emphasis">لا مقابلات منفّذة بعد</div>
        </VCard>
      </VCol>
    </VRow>

    <!-- Pricing dialog -->
    <VDialog v-model="priceDialog" max-width="460">
      <VCard class="pa-2">
        <VCardTitle>إدارة أسعار المقابلات</VCardTitle>
        <VCardText>
          <div v-for="k in kinds" :key="k" class="d-flex align-center ga-3 mb-2">
            <span class="text-body-2 flex-grow-1">{{ KIND_META[k].label }}</span>
            <VTextField
              v-model.number="draftPricing[k]"
              type="number"
              density="compact"
              hide-details
              suffix="﷼"
              style="max-width: 130px"
            />
          </div>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="priceDialog = false">إلغاء</VBtn>
          <VBtn color="accent" prepend-icon="mdi-content-save" @click="savePricing">حفظ الأسعار</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
