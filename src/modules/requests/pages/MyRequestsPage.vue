<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { KIND_META, STATUS_META, useRequestsStore } from '@/stores/RequestsStore'
import type { RequestStatus } from '@/stores/RequestsStore'
import { ai } from '@/services/ai'
import EmptyState from '@/components/shared/EmptyState.vue'

const router = useRouter()
const store = useRequestsStore()

const filter = ref<RequestStatus | 'all'>('all')
const statusFilters: { value: RequestStatus | 'all', label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'reviewing', label: 'قيد المراجعة' },
  { value: 'accepted', label: 'مقبول' },
  { value: 'done', label: 'منفّذ' },
  { value: 'rejected', label: 'مرفوض' },
]

const list = computed(() =>
  filter.value === 'all' ? store.mine : store.mine.filter(m => m.status === filter.value),
)

const performance = computed(() => ai.requestPerformance(store.perfStats))

// Status-update request
const updateSnackbar = ref('')
function requestStatusUpdate(org: string) {
  updateSnackbar.value = `أرسل الـ AI رسالة مهنية إلى «${org}» لطلب تحديث حالة طلبك.`
}

// Rate org dialog
const rateDialog = ref(false)
const rateTarget = ref<number | null>(null)
const rateValue = ref(5)
function openRate(myId: number, current?: number) {
  rateTarget.value = myId
  rateValue.value = current ?? 5
  rateDialog.value = true
}
function saveRate() {
  if (rateTarget.value != null)
    store.rateOrg(rateTarget.value, rateValue.value)
  rateDialog.value = false
}
</script>

<template>
  <div>
    <PageHeader
      title="طلباتي المقدّمة"
      subtitle="تابع حالة طلباتك مع تحليل أداء ذكي وتوقّعات زمنية"
      icon="mdi-file-send-outline"
    >
      <template #actions>
        <VBtn color="accent" prepend-icon="mdi-storefront-outline" :to="{ name: 'requests' }">تصفّح السوق</VBtn>
      </template>
    </PageHeader>

    <!-- Stat summary -->
    <VRow class="mb-2">
      <VCol cols="6" sm="3">
        <VCard class="pa-3 text-center"><div class="text-h5 font-weight-bold">{{ store.counts.total }}</div><div class="text-caption text-medium-emphasis">إجمالي الطلبات</div></VCard>
      </VCol>
      <VCol cols="6" sm="3">
        <VCard class="pa-3 text-center"><div class="text-h5 font-weight-bold text-warning">{{ store.counts.reviewing }}</div><div class="text-caption text-medium-emphasis">قيد المراجعة</div></VCard>
      </VCol>
      <VCol cols="6" sm="3">
        <VCard class="pa-3 text-center"><div class="text-h5 font-weight-bold text-success">{{ store.counts.accepted }}</div><div class="text-caption text-medium-emphasis">مقبول/منفّذ</div></VCard>
      </VCol>
      <VCol cols="6" sm="3">
        <VCard class="pa-3 text-center"><div class="text-h5 font-weight-bold text-error">{{ store.counts.rejected }}</div><div class="text-caption text-medium-emphasis">مرفوض</div></VCard>
      </VCol>
    </VRow>

    <!-- AI performance insight -->
    <VAlert color="secondary" variant="tonal" class="mb-4" border="start">
      <template #prepend><VIcon icon="mdi-robot-happy-outline" /></template>
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <div>
          <div class="text-subtitle-2 font-weight-bold mb-1">تحليل الأداء</div>
          <span class="text-body-2">{{ performance.message }}</span>
        </div>
        <VChip v-if="performance.acceptRate" color="success" label>{{ performance.acceptRate }}% قبول</VChip>
      </div>
    </VAlert>

    <!-- Filter chips -->
    <div class="d-flex flex-wrap ga-2 mb-3">
      <VChip
        v-for="f in statusFilters"
        :key="f.value"
        :color="filter === f.value ? 'primary' : undefined"
        :variant="filter === f.value ? 'flat' : 'outlined'"
        @click="filter = f.value"
      >
        {{ f.label }}
      </VChip>
    </div>

    <!-- Requests list -->
    <VCard v-if="list.length">
      <VList lines="two">
        <template v-for="(m, i) in list" :key="m.id">
          <VListItem>
            <template #prepend>
              <VAvatar :color="KIND_META[m.kind].color" variant="tonal" rounded="lg"><VIcon :icon="KIND_META[m.kind].icon" /></VAvatar>
            </template>
            <VListItemTitle class="font-weight-bold">{{ m.title }}</VListItemTitle>
            <VListItemSubtitle>{{ m.org }} · {{ KIND_META[m.kind].label }} · تقدّمت {{ m.appliedAt }}</VListItemSubtitle>
            <template #append>
              <div class="d-flex align-center ga-2">
                <VRating v-if="m.status === 'done'" :model-value="m.rated ?? 0" color="warning" density="compact" size="x-small" readonly half-increments />
                <VChip :color="STATUS_META[m.status].color" size="small" label>{{ STATUS_META[m.status].label }}</VChip>
                <VMenu>
                  <template #activator="{ props }">
                    <VBtn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" />
                  </template>
                  <VList density="compact">
                    <VListItem prepend-icon="mdi-open-in-new" title="عرض الطلب" @click="router.push({ name: 'request-details', params: { id: m.requestId } })" />
                    <VListItem v-if="m.status === 'reviewing'" prepend-icon="mdi-refresh" title="طلب تحديث الحالة" @click="requestStatusUpdate(m.org)" />
                    <VListItem v-if="m.status === 'done'" prepend-icon="mdi-star-outline" title="تقييم الجهة" @click="openRate(m.id, m.rated)" />
                  </VList>
                </VMenu>
              </div>
            </template>
          </VListItem>
          <VDivider v-if="i < list.length - 1" />
        </template>
      </VList>
    </VCard>
    <VCard v-else>
      <EmptyState
        icon="mdi-file-outline"
        title="لا طلبات في هذه الحالة"
        description="عندما تتقدّم لطلبات من السوق ستظهر هنا مع حالتها وتحليل أدائها."
        action-text="تصفّح سوق الطلبات"
        action-icon="mdi-storefront-outline"
        @action="router.push({ name: 'requests' })"
      />
    </VCard>

    <!-- Rate dialog -->
    <VDialog v-model="rateDialog" max-width="380">
      <VCard class="pa-4 text-center">
        <VCardTitle>تقييم الجهة</VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-3">كيف كانت تجربتك مع هذه الجهة؟</p>
          <VRating v-model="rateValue" color="warning" size="large" />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="rateDialog = false">إلغاء</VBtn>
          <VBtn color="accent" @click="saveRate">حفظ التقييم</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar :model-value="!!updateSnackbar" color="secondary" timeout="4000" @update:model-value="updateSnackbar = ''">
      {{ updateSnackbar }}
    </VSnackbar>
  </div>
</template>
