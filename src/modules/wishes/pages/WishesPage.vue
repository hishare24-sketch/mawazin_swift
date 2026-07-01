<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import { useWishesStore } from '@/stores/WishesStore'
import type { Wish, WishStatus } from '@/stores/WishesStore'

const store = useWishesStore()

const statusMeta: Record<WishStatus, { label: string, color: string }> = {
  new: { label: 'جديد', color: 'accent' },
  pending: { label: 'قيد الانتظار', color: 'warning' },
  accepted: { label: 'مقبول', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
}

const stats = computed(() => [
  { title: 'إجمالي الرغبات', value: store.total, icon: 'mdi-hand-heart-outline', color: 'primary' },
  { title: 'معلّقة', value: store.pendingCount, icon: 'mdi-clock-outline', color: 'warning' },
  { title: 'مقبولة', value: store.acceptedCount, icon: 'mdi-check-circle-outline', color: 'success' },
  { title: 'مرفوضة', value: store.rejectedCount, icon: 'mdi-close-circle-outline', color: 'error' },
])

// Negotiation dialog
const negotiateDialog = ref(false)
const activeWish = ref<Wish | null>(null)
const counterAmount = ref('')
const counterDuration = ref('')
const counterNotes = ref('')

function openNegotiate(wish: Wish) {
  activeWish.value = wish
  counterAmount.value = ''
  counterDuration.value = ''
  counterNotes.value = ''
  negotiateDialog.value = true
}
function submitNegotiation() {
  if (activeWish.value)
    store.setStatus(activeWish.value.id, 'pending')
  negotiateDialog.value = false
}
</script>

<template>
  <div>
    <PageHeader title="الرغبات الواردة" subtitle="جهات أبدت رغبتها في خدماتك" icon="mdi-hand-heart-outline" />

    <VRow class="mb-2">
      <VCol v-for="s in stats" :key="s.title" cols="6" md="3">
        <StatCard v-bind="s" />
      </VCol>
    </VRow>

    <VRow>
      <VCol v-for="wish in store.wishes" :key="wish.id" cols="12" md="6">
        <VCard class="pa-4" height="100%">
          <div class="d-flex justify-space-between align-start mb-2">
            <div class="d-flex align-center ga-3">
              <VAvatar color="secondary" variant="tonal" rounded="lg">
                <span class="font-weight-bold">{{ wish.companyInitial }}</span>
              </VAvatar>
              <div>
                <div class="text-subtitle-1 font-weight-bold">{{ wish.company }}</div>
                <div class="text-caption text-medium-emphasis">{{ wish.role }} · {{ wish.amount }} · {{ wish.duration }}</div>
              </div>
            </div>
            <VChip :color="statusMeta[wish.status].color" size="small" label>{{ statusMeta[wish.status].label }}</VChip>
          </div>

          <p class="text-body-2 text-medium-emphasis my-2">{{ wish.reason }}</p>

          <div class="d-flex flex-wrap ga-2 mb-3">
            <VChip size="x-small" variant="tonal" color="info" prepend-icon="mdi-robot-happy-outline">
              تطابق {{ wish.matchRate }}%
            </VChip>
            <VChip size="x-small" variant="tonal" color="success" prepend-icon="mdi-star-outline">
              سمعة الجهة: {{ wish.reputation }}
            </VChip>
          </div>

          <div v-if="wish.status === 'new' || wish.status === 'pending'" class="d-flex ga-2">
            <VBtn color="success" size="small" class="flex-grow-1" prepend-icon="mdi-check" @click="store.setStatus(wish.id, 'accepted')">قبول</VBtn>
            <VBtn color="warning" variant="outlined" size="small" prepend-icon="mdi-swap-horizontal" @click="openNegotiate(wish)">تفاوض</VBtn>
            <VBtn color="error" variant="outlined" size="small" icon="mdi-close" @click="store.setStatus(wish.id, 'rejected')" />
          </div>
          <div v-else class="text-center text-body-2 text-medium-emphasis pt-1">
            تم {{ statusMeta[wish.status].label }} هذه الرغبة
            <VBtn variant="text" size="x-small" color="primary" @click="store.setStatus(wish.id, 'new')">تراجع</VBtn>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <!-- Negotiation dialog -->
    <VDialog v-model="negotiateDialog" max-width="480">
      <VCard class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>التفاوض مع {{ activeWish?.company }}</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="negotiateDialog = false" />
        </VCardTitle>
        <VCardText>
          <VTextField v-model="counterAmount" label="المقابل المقترح" placeholder="مثال: 18,000 ريال" class="mb-2" />
          <VTextField v-model="counterDuration" label="المدة المقترحة" placeholder="مثال: سنة" class="mb-2" />
          <VTextarea v-model="counterNotes" label="ملاحظات" rows="3" />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="negotiateDialog = false">إلغاء</VBtn>
          <VBtn color="warning" prepend-icon="mdi-send" @click="submitNegotiation">إرسال العرض المضاد</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
