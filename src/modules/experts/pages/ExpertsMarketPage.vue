<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import type { MarketExpert, MarketExpertRole } from '@/stores/ExpertRolesStore'
import { MARKET_EXPERTS, MARKET_ROLE_META } from '@/stores/ExpertRolesStore'
import type { PeerRequestType } from '@/stores/PeerRequestsStore'
import { usePeerRequestsStore } from '@/stores/PeerRequestsStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { useAuthStore } from '@/stores/AuthStore'

// السوق الموحّد لاكتشاف خبراء النظام البيئي (جانب الطلب) — يغذي الطلبات المتبادلة
const peerRequests = usePeerRequestsStore()
const notifications = useNotificationsStore()
const authStore = useAuthStore()

const roleFilter = ref<'all' | MarketExpertRole>('all')
const search = ref('')

const filtered = computed(() =>
  MARKET_EXPERTS
    .filter(e => roleFilter.value === 'all' || e.role === roleFilter.value)
    .filter((e) => {
      const q = search.value.trim()
      return !q || e.name.includes(q) || e.specialty.includes(q) || e.title.includes(q)
    }),
)

// دور الخبير → نوع الطلب المتبادل المقابل
const ROLE_TO_REQUEST: Record<MarketExpertRole, PeerRequestType> = {
  coach: 'coaching',
  trainer: 'training',
  consultant: 'consultation',
}

const requestDialog = ref(false)
const selected = ref<MarketExpert | null>(null)
const reason = ref('')
function openRequest(e: MarketExpert) {
  selected.value = e
  reason.value = ''
  requestDialog.value = true
}
function sendRequest() {
  const e = selected.value
  if (!e || !reason.value.trim())
    return
  peerRequests.create({
    type: ROLE_TO_REQUEST[e.role],
    personName: e.name,
    personRole: e.title,
    reason: reason.value.trim(),
    skills: [e.specialty],
    attachments: [],
  })
  requestDialog.value = false
  notifications.push({
    icon: MARKET_ROLE_META[e.role].icon,
    color: 'success',
    title: 'أُرسل طلبك للخبير',
    body: `${MARKET_ROLE_META[e.role].service} من ${e.name} — تابع الرد في الطلبات المتبادلة.`,
    category: 'system',
    actionTo: '/peer-requests',
    actionLabel: 'متابعة الطلب',
  })
}

// جانب العرض: دعوة أصحاب الخبرة للانضمام
const canJoin = computed(() => !!authStore.authUser)
</script>

<template>
  <div>
    <PageHeader
      title="سوق الخبراء"
      subtitle="اكتشف المرشدين والمدربين والمستشارين المعتمدين واطلب خدمتهم مباشرة"
      icon="mdi-storefront-outline"
    />

    <!-- فلاتر -->
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <VBtnToggle v-model="roleFilter" mandatory color="primary" variant="outlined" density="comfortable">
        <VBtn value="all" size="small">الكل ({{ MARKET_EXPERTS.length }})</VBtn>
        <VBtn v-for="(meta, role) in MARKET_ROLE_META" :key="role" :value="role" size="small" :prepend-icon="meta.icon">
          {{ meta.label }}
        </VBtn>
      </VBtnToggle>
      <VTextField
        v-model="search"
        placeholder="ابحث بالاسم أو التخصص..."
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        clearable
        style="max-width: 280px"
      />
    </div>

    <VRow>
      <VCol v-for="e in filtered" :key="e.id" cols="12" sm="6" lg="4">
        <VCard class="pa-5 h-100 d-flex flex-column">
          <div class="d-flex align-center ga-3 mb-2">
            <VAvatar :color="MARKET_ROLE_META[e.role].color" variant="tonal" size="48">
              <span class="text-h6 font-weight-bold">{{ e.initial }}</span>
            </VAvatar>
            <div class="flex-grow-1">
              <div class="d-flex align-center ga-1">
                <span class="text-body-1 font-weight-bold">{{ e.name }}</span>
                <VIcon v-if="e.verified" icon="mdi-check-decagram" color="primary" size="16" />
              </div>
              <div class="text-caption text-medium-emphasis">{{ e.title }}</div>
            </div>
          </div>

          <VChip size="small" :color="MARKET_ROLE_META[e.role].color" variant="tonal" label :prepend-icon="MARKET_ROLE_META[e.role].icon" class="align-self-start mb-2">
            {{ MARKET_ROLE_META[e.role].label }}
          </VChip>

          <div class="text-body-2 mb-3">{{ e.specialty }}</div>

          <div class="d-flex align-center ga-3 text-caption text-medium-emphasis mb-3 mt-auto">
            <span><VIcon icon="mdi-star" color="warning" size="14" /> {{ e.rating }}</span>
            <span><VIcon icon="mdi-account-group-outline" size="14" /> {{ e.clients }} عميلًا</span>
            <span class="ms-auto font-weight-bold text-primary">من {{ e.priceFrom }} ﷼ {{ e.priceUnit }}</span>
          </div>

          <VBtn :color="MARKET_ROLE_META[e.role].color" variant="flat" block prepend-icon="mdi-send" @click="openRequest(e)">
            اطلب {{ MARKET_ROLE_META[e.role].service }}
          </VBtn>
        </VCard>
      </VCol>
    </VRow>

    <VCard v-if="!filtered.length" class="pa-10 text-center">
      <VIcon icon="mdi-magnify-remove-outline" size="48" color="medium-emphasis" />
      <p class="text-body-2 text-medium-emphasis mt-2 mb-0">لا نتائج مطابقة — جرّب تخصصًا أو اسمًا آخر.</p>
    </VCard>

    <!-- دعوة جانب العرض -->
    <VCard v-if="canJoin" class="brand-gradient pa-5 mt-6 text-center" theme="darkTheme">
      <p class="text-body-1 text-white mb-3">لديك خبرة إرشاد أو تدريب أو استشارة؟ انضم إلى السوق وحوّل خبرتك إلى دخل.</p>
      <div class="d-flex justify-center flex-wrap ga-2">
        <VBtn v-for="(meta, role) in MARKET_ROLE_META" :key="role" color="accent" variant="outlined" size="small" :prepend-icon="meta.icon" :to="`/join/${role}`">
          انضم {{ meta.label }}
        </VBtn>
      </div>
    </VCard>

    <!-- طلب خدمة -->
    <VDialog v-model="requestDialog" max-width="480">
      <VCard v-if="selected" class="pa-2">
        <VCardTitle class="d-flex align-center ga-2">
          <VIcon :icon="MARKET_ROLE_META[selected.role].icon" :color="MARKET_ROLE_META[selected.role].color" />
          طلب {{ MARKET_ROLE_META[selected.role].service }}
        </VCardTitle>
        <VCardText>
          <div class="d-flex align-center ga-2 mb-3">
            <VAvatar :color="MARKET_ROLE_META[selected.role].color" variant="tonal" size="36">
              <span class="font-weight-bold">{{ selected.initial }}</span>
            </VAvatar>
            <div>
              <div class="text-body-2 font-weight-bold">{{ selected.name }}</div>
              <div class="text-caption text-medium-emphasis">{{ selected.specialty }} · من {{ selected.priceFrom }} ﷼ {{ selected.priceUnit }}</div>
            </div>
          </div>
          <VTextarea v-model="reason" label="صف هدفك من الخدمة" rows="3" auto-grow placeholder="مثال: أريد خطة انتقال من الدعم الفني إلى تطوير الواجهات خلال 6 أشهر" />
          <p class="text-caption text-medium-emphasis mb-0">يصل طلبك للخبير عبر «الطلبات المتبادلة» وتتابع رده من هناك.</p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="requestDialog = false">إلغاء</VBtn>
          <VBtn :color="MARKET_ROLE_META[selected.role].color" variant="flat" :disabled="!reason.trim()" prepend-icon="mdi-send" @click="sendRequest">إرسال الطلب</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
