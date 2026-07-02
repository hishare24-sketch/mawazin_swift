<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import { useExpertRolesStore } from '@/stores/ExpertRolesStore'
import type { ConsultingRequest } from '@/stores/ExpertRolesStore'

// لوحة المستشار المهني — خدمات B2B للشركات
const store = useExpertRolesStore()
const snackbar = ref('')

const STATUS: Record<ConsultingRequest['status'], { label: string, color: string }> = {
  new: { label: 'جديد', color: 'accent' },
  accepted: { label: 'مقبول', color: 'info' },
  in_progress: { label: 'قيد التنفيذ', color: 'primary' },
  done: { label: 'منجز', color: 'success' },
  declined: { label: 'معتذَر عنه', color: 'error' },
}

function accept(r: ConsultingRequest) {
  store.respondConsulting(r.id, true)
  snackbar.value = `قبلت استشارة ${r.company}`
}
function decline(r: ConsultingRequest) {
  store.respondConsulting(r.id, false)
  snackbar.value = `اعتذرت عن استشارة ${r.company}`
}

const completeDialog = ref(false)
const completing = ref<ConsultingRequest | null>(null)
const fee = ref(5000)
function openComplete(r: ConsultingRequest) {
  completing.value = r
  fee.value = 5000
  completeDialog.value = true
}
function doComplete() {
  if (completing.value) {
    store.completeConsulting(completing.value.id, fee.value)
    snackbar.value = 'أُنجزت الاستشارة — الأتعاب أُودعت محفظتك (معلقة حتى التسوية)'
  }
  completeDialog.value = false
}
</script>

<template>
  <div>
    <PageHeader title="لوحة المستشار المهني" subtitle="استشارات استراتيجية للشركات حول السوق والفرق" icon="mdi-lightbulb-on-outline" />

    <VRow class="mb-2">
      <VCol cols="4"><StatCard title="طلبات جديدة" :value="store.consultantStats.newRequests" icon="mdi-inbox-arrow-down-outline" color="accent" /></VCol>
      <VCol cols="4"><StatCard title="استشارات نشطة" :value="store.consultantStats.active" icon="mdi-progress-clock" color="primary" /></VCol>
      <VCol cols="4"><StatCard title="منجزة" :value="store.consultantStats.done" icon="mdi-check-decagram-outline" color="success" /></VCol>
    </VRow>

    <VCard class="pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-1">طلبات الشركات</h2>
      <p class="text-caption text-medium-emphasis mb-3">قناة B2B: الشركات تطلب استشاراتك مباشرة عبر المنصة (بالساعة أو بالمشروع).</p>
      <VCard v-for="r in store.state.consulting" :key="r.id" variant="outlined" class="pa-4 mb-2">
        <div class="d-flex align-center ga-3 flex-wrap">
          <VAvatar color="info" variant="tonal" rounded="lg"><VIcon icon="mdi-office-building-outline" /></VAvatar>
          <div class="flex-grow-1">
            <div class="text-body-2 font-weight-bold">{{ r.topic }}</div>
            <div class="text-caption text-medium-emphasis">{{ r.company }} · {{ r.scope }} · {{ r.budget }} · {{ r.date }}</div>
          </div>
          <VChip size="small" :color="STATUS[r.status].color" label>{{ STATUS[r.status].label }}</VChip>
          <div v-if="r.status === 'new'" class="d-flex ga-1">
            <VBtn size="small" color="success" prepend-icon="mdi-check" @click="accept(r)">قبول</VBtn>
            <VBtn size="small" color="error" variant="outlined" icon="mdi-close" @click="decline(r)" />
          </div>
          <VBtn v-else-if="r.status === 'accepted' || r.status === 'in_progress'" size="small" color="primary" variant="tonal" prepend-icon="mdi-flag-checkered" @click="openComplete(r)">
            إنجاز وتحصيل
          </VBtn>
        </div>
      </VCard>
    </VCard>

    <VDialog v-model="completeDialog" max-width="400">
      <VCard class="pa-2">
        <VCardTitle>إنجاز الاستشارة</VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-3">{{ completing?.company }} — {{ completing?.topic }}</p>
          <VTextField v-model.number="fee" type="number" label="الأتعاب (ر.س)" prepend-inner-icon="mdi-cash-multiple" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="completeDialog = false">إلغاء</VBtn>
          <VBtn color="primary" variant="flat" :disabled="fee <= 0" @click="doComplete">تأكيد الإنجاز</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar :model-value="!!snackbar" color="success" location="top" timeout="3000" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </VSnackbar>
  </div>
</template>
