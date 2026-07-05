<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import { OFFER_STATUS_META, SENT_STATUS_META, useWishesStore } from '@/stores/WishesStore'
import type { ReceivedOffer, SentWish } from '@/stores/WishesStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'

const store = useWishesStore()
const tab = ref('sent')
const snackbar = ref('')

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c?: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral', 'surface-variant': 'neutral', grey: 'neutral', orange: 'warning', amber: 'warning' } as Record<string, BaseColor>)[c ?? ''] ?? c ?? 'brand') as BaseColor
}

const stats = computed(() => [
  { title: 'رغبات مرسلة', value: store.sentActive.length, icon: 'mdi-send-outline', color: 'primary' },
  { title: 'مقبولة', value: store.sentAccepted, icon: 'mdi-check-circle-outline', color: 'success' },
  { title: 'معلّقة', value: store.sentPending, icon: 'mdi-clock-outline', color: 'warning' },
  { title: 'نسبة القبول', value: `${store.acceptanceRate}%`, icon: 'mdi-percent-outline', color: 'secondary' },
])

// Edit dialog
const editDialog = ref(false)
const editing = ref<SentWish | null>(null)
const editForm = ref({ role: '', amount: '', duration: '', reason: '' })
function openEdit(w: SentWish) {
  editing.value = w
  editForm.value = { role: w.role, amount: w.amount, duration: w.duration, reason: w.reason }
  editDialog.value = true
}
function saveEdit() {
  if (editing.value) {
    store.updateWish(editing.value.id, { ...editForm.value })
    snackbar.value = 'تم تحديث الرغبة'
  }
  editDialog.value = false
}

// Withdraw confirm
const withdrawDialog = ref(false)
const withdrawing = ref<SentWish | null>(null)
function confirmWithdraw(w: SentWish) {
  withdrawing.value = w
  withdrawDialog.value = true
}
function doWithdraw() {
  if (withdrawing.value) {
    store.withdrawWish(withdrawing.value.id)
    snackbar.value = 'سُحبت الرغبة'
  }
  withdrawDialog.value = false
}

function resend(w: SentWish) {
  store.resendWish(w.id)
  snackbar.value = `أُعيد إرسال الرغبة إلى ${w.candidateName} — ستصلك استجابته قريبًا`
}

// Received offers
function accept(o: ReceivedOffer) {
  store.respondOffer(o.id, 'accepted')
  snackbar.value = `قبلت عرض ${o.candidateName}`
}
function decline(o: ReceivedOffer) {
  store.respondOffer(o.id, 'declined')
  snackbar.value = `اعتذرت عن عرض ${o.candidateName}`
}
const negotiateDialog = ref(false)
const negotiating = ref<ReceivedOffer | null>(null)
const counterAmount = ref('')
function openNegotiate(o: ReceivedOffer) {
  negotiating.value = o
  counterAmount.value = o.amount
  negotiateDialog.value = true
}
function sendCounter() {
  if (negotiating.value && counterAmount.value.trim()) {
    store.negotiateOffer(negotiating.value.id, counterAmount.value.trim())
    snackbar.value = 'أُرسل عرضك المضاد — بانتظار رد المرشح'
  }
  negotiateDialog.value = false
}
</script>

<template>
  <div>
    <PageHeader
      title="إدارة الرغبات"
      subtitle="تابع الرغبات المرسلة للمرشحين والواردة منهم"
      icon="mdi-hand-heart-outline"
    />

    <div class="mb-2 grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard v-for="s in stats" :key="s.title" v-bind="s" />
    </div>

    <div class="mb-4 flex gap-1">
      <button type="button" class="nav-tab flex-none" :class="{ 'is-active': tab === 'sent' }" @click="tab = 'sent'">
        <BaseIcon name="mdi-send-outline" :size="18" />الرغبات المرسلة ({{ store.sentActive.length }})
      </button>
      <button type="button" class="nav-tab flex-none" :class="{ 'is-active': tab === 'received' }" @click="tab = 'received'">
        <BaseIcon name="mdi-inbox-arrow-down-outline" :size="18" />الرغبات المستلمة
        <BaseChip v-if="store.newOffersCount" color="accent" class="ms-1">{{ store.newOffersCount }}</BaseChip>
      </button>
    </div>

    <!-- Sent -->
    <div v-if="tab === 'sent'">
      <BaseCard v-if="store.sent.length" :padded="false" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-ui text-xs text-muted">
              <th class="p-3 text-start font-medium">المرشح</th>
              <th class="p-3 text-start font-medium">الدور</th>
              <th class="p-3 text-start font-medium">المقابل</th>
              <th class="p-3 text-start font-medium">الحالة</th>
              <th class="p-3 text-start font-medium">التاريخ</th>
              <th class="p-3 text-start font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in store.sent" :key="w.id" class="border-b border-ui" :class="{ 'wish-withdrawn': w.status === 'withdrawn' }">
              <td class="p-3 font-bold text-content">{{ w.candidateName }}</td>
              <td class="p-3 text-content">{{ w.role }}</td>
              <td class="p-3 text-content">{{ w.amount }}</td>
              <td class="p-3"><BaseChip :color="mapColor(SENT_STATUS_META[w.status].color)">{{ SENT_STATUS_META[w.status].label }}</BaseChip></td>
              <td class="p-3 text-muted">{{ w.date }}</td>
              <td class="whitespace-nowrap p-3">
                <button class="icon-btn h-8 w-8 disabled:opacity-40" :disabled="w.status !== 'pending'" title="تعديل" aria-label="تعديل" @click="openEdit(w)"><BaseIcon name="mdi-pencil" :size="16" /></button>
                <button v-if="w.status === 'pending'" class="icon-btn h-8 w-8" style="color: rgb(var(--v-theme-error))" title="سحب الرغبة" aria-label="سحب" @click="confirmWithdraw(w)"><BaseIcon name="mdi-close" :size="16" /></button>
                <button v-if="w.status === 'withdrawn' || w.status === 'rejected'" class="icon-btn h-8 w-8" style="color: rgb(var(--v-theme-secondary))" title="إعادة إرسال" aria-label="إعادة إرسال" @click="resend(w)"><BaseIcon name="mdi-send-clock-outline" :size="16" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </BaseCard>
      <EmptyState
        v-else
        icon="mdi-hand-heart-outline"
        title="لا رغبات مرسلة"
        description="أرسل رغبة لمرشح مميز من صفحة الترشيحات"
      />
    </div>

    <!-- Received -->
    <div v-else>
      <div v-if="store.received.length" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BaseCard v-for="o in store.received" :key="o.id">
          <div class="mb-2 flex items-center gap-3">
            <BaseAvatar color="emerald" tonal><span class="font-bold">{{ o.candidateInitial }}</span></BaseAvatar>
            <div class="flex-1">
              <div class="text-base font-bold text-content">{{ o.candidateName }}</div>
              <div class="text-xs text-muted">{{ o.service }} · {{ o.date }}</div>
            </div>
            <BaseChip :color="mapColor(OFFER_STATUS_META[o.status].color)">{{ OFFER_STATUS_META[o.status].label }}</BaseChip>
          </div>
          <p class="mb-2 text-xs text-muted">{{ o.note }}</p>
          <div class="mb-3 text-sm text-content">المقابل: <span class="font-bold">{{ o.amount }}</span></div>
          <div v-if="o.status === 'new' || o.status === 'negotiating'" class="flex gap-2">
            <BaseButton variant="tonal-emerald" size="sm" class="flex-1" @click="accept(o)"><BaseIcon name="mdi-check" :size="16" />قبول</BaseButton>
            <BaseButton variant="outline" size="sm" :disabled="o.status === 'negotiating'" @click="openNegotiate(o)">
              <BaseIcon name="mdi-swap-horizontal" :size="16" />{{ o.status === 'negotiating' ? 'بانتظار الرد' : 'تفاوض' }}
            </BaseButton>
            <BaseButton variant="outline" size="sm" aria-label="اعتذار" @click="decline(o)"><BaseIcon name="mdi-close" :size="16" :style="{ color: 'rgb(var(--v-theme-error))' }" /></BaseButton>
          </div>
        </BaseCard>
      </div>
      <EmptyState
        v-else
        icon="mdi-inbox-arrow-down-outline"
        title="لا عروض واردة"
        description="ستظهر هنا عروض المرشحين ذوي العرض الذاتي المفعّل"
      />
    </div>

    <!-- Edit wish -->
    <BaseModal v-model="editDialog" :title="`تعديل الرغبة — ${editing?.candidateName}`" :max-width="480">
      <BaseInput v-model="editForm.role" label="الدور" class="mb-3" />
      <BaseInput v-model="editForm.amount" label="المقابل" class="mb-3" />
      <BaseInput v-model="editForm.duration" label="المدة" class="mb-3" />
      <BaseTextarea v-model="editForm.reason" label="سبب الرغبة" :rows="2" />
      <template #actions>
        <BaseButton variant="ghost" @click="editDialog = false">إلغاء</BaseButton>
        <BaseButton variant="brand" @click="saveEdit">حفظ</BaseButton>
      </template>
    </BaseModal>

    <!-- Withdraw confirm -->
    <BaseModal v-model="withdrawDialog" title="سحب الرغبة" :max-width="400">
      هل تريد سحب رغبتك المرسلة إلى «{{ withdrawing?.candidateName }}»؟ يمكنك إعادة إرسالها لاحقًا.
      <template #actions>
        <BaseButton variant="ghost" @click="withdrawDialog = false">تراجع</BaseButton>
        <BaseButton variant="brand" @click="doWithdraw"><BaseIcon name="mdi-close" :size="16" />سحب</BaseButton>
      </template>
    </BaseModal>

    <!-- Negotiate offer -->
    <BaseModal v-model="negotiateDialog" :title="`تفاوض — ${negotiating?.candidateName}`" :max-width="420">
      <p class="mb-3 text-sm text-muted">اقترح مقابلًا مضادًا وسيصلك رد المرشح كإشعار.</p>
      <BaseInput v-model="counterAmount" label="المقابل المقترح" prefix-icon="mdi-cash-multiple" />
      <template #actions>
        <BaseButton variant="ghost" @click="negotiateDialog = false">إلغاء</BaseButton>
        <BaseButton variant="brand" :disabled="!counterAmount.trim()" @click="sendCounter">إرسال العرض</BaseButton>
      </template>
    </BaseModal>

    <BaseSnackbar :model-value="!!snackbar" color="primary" :timeout="3000" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </BaseSnackbar>
  </div>
</template>

<style scoped>
.wish-withdrawn {
  opacity: 0.55;
}
</style>
