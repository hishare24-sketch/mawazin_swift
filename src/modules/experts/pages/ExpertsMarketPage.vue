<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import type { MarketExpert, MarketExpertRole } from '@/stores/ExpertRolesStore'
import { EXPERT_TIER_META, MARKET_EXPERTS, MARKET_ROLE_META, expertTier } from '@/stores/ExpertRolesStore'
import type { ExpertSpecialty } from '@/services/personas'
import { EXPERT_SPECIALTY_META, specialtiesForBucket } from '@/services/personas'
import type { PeerRequestType } from '@/stores/PeerRequestsStore'
import { usePeerRequestsStore } from '@/stores/PeerRequestsStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { useAuthStore } from '@/stores/AuthStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'

// السوق الموحّد لاكتشاف خبراء النظام البيئي (جانب الطلب) — يغذي الطلبات المتبادلة
const peerRequests = usePeerRequestsStore()
const notifications = useNotificationsStore()
const authStore = useAuthStore()

const roleFilter = ref<'all' | MarketExpertRole>('all')
const specialtyFilter = ref<'all' | ExpertSpecialty>('all')
const search = ref('')
const snackbar = ref(false)

// عند تبديل الدور تُصفَّر التخصّص، وتظهر تخصّصات الدور كفلتر فرعي
function setRole(r: 'all' | MarketExpertRole) {
  roleFilter.value = r
  specialtyFilter.value = 'all'
}
const subSpecialties = computed(() => (roleFilter.value === 'all' ? [] : specialtiesForBucket(roleFilter.value)))

const filtered = computed(() =>
  MARKET_EXPERTS
    .filter(e => roleFilter.value === 'all' || e.role === roleFilter.value)
    .filter(e => specialtyFilter.value === 'all' || e.specialtyKey === specialtyFilter.value)
    .filter((e) => {
      const q = search.value.trim()
      return !q || e.name.includes(q) || e.specialty.includes(q) || e.title.includes(q) || EXPERT_SPECIALTY_META[e.specialtyKey].label.includes(q)
    }),
)

type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function roleColor(role: MarketExpertRole): BaseColor {
  return ({ coach: 'brand', trainer: 'info', consultant: 'warning' } as Record<MarketExpertRole, BaseColor>)[role]
}
function tierColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}
function tierOf(e: MarketExpert) {
  return EXPERT_TIER_META[expertTier(e.clients)]
}

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
  snackbar.value = true
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
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="rounded-ui inline-flex flex-wrap overflow-hidden border-ui">
        <button
          class="px-3 py-2 text-sm transition"
          :class="roleFilter === 'all' ? 'bg-brand text-on-brand' : 'text-muted hover:bg-surfalt'"
          @click="setRole('all')"
        >الكل ({{ MARKET_EXPERTS.length }})</button>
        <button
          v-for="(meta, role) in MARKET_ROLE_META"
          :key="role"
          class="flex items-center gap-1 px-3 py-2 text-sm transition"
          :class="roleFilter === role ? 'bg-brand text-on-brand' : 'text-muted hover:bg-surfalt'"
          @click="setRole(role)"
        >
          <BaseIcon :name="meta.icon" :size="16" /> {{ meta.label }}
        </button>
      </div>
      <BaseInput v-model="search" prefix-icon="mdi-magnify" placeholder="ابحث بالاسم أو التخصص..." class="w-[280px]">
        <template #suffix>
          <button v-if="search" type="button" class="text-muted" aria-label="مسح" @click="search = ''">
            <BaseIcon name="mdi-close" :size="18" />
          </button>
        </template>
      </BaseInput>
    </div>

    <!-- فلتر التخصّص الفرعي (يظهر عند اختيار دور) -->
    <div v-if="subSpecialties.length" class="mb-4 flex flex-wrap items-center gap-2">
      <span class="text-xs text-muted">التخصّص:</span>
      <button
        class="rounded-full px-2.5 py-1 text-xs font-medium transition"
        :class="specialtyFilter === 'all' ? 'bg-emerald text-on-brand' : 'border-ui text-content hover:bg-surfalt'"
        @click="specialtyFilter = 'all'"
      >الكل</button>
      <button
        v-for="sp in subSpecialties"
        :key="sp"
        class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition"
        :class="specialtyFilter === sp ? 'bg-emerald text-on-brand' : 'border-ui text-content hover:bg-surfalt'"
        @click="specialtyFilter = sp"
      >
        <BaseIcon :name="EXPERT_SPECIALTY_META[sp].icon" :size="14" /> {{ EXPERT_SPECIALTY_META[sp].label }}
      </button>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BaseCard v-for="e in filtered" :key="e.id" class="flex h-full flex-col">
        <div class="mb-2 flex items-center gap-3">
          <BaseAvatar :color="roleColor(e.role)" :size="48" tonal>{{ e.initial }}</BaseAvatar>
          <div class="flex-1">
            <div class="flex items-center gap-1">
              <span class="font-bold">{{ e.name }}</span>
              <BaseIcon v-if="e.verified" name="mdi-check-decagram" :size="16" style="color: rgb(var(--v-theme-primary))" />
            </div>
            <div class="text-xs text-muted">{{ e.title }}</div>
          </div>
        </div>

        <div class="mb-2 flex flex-wrap gap-1">
          <BaseChip :color="roleColor(e.role)"><BaseIcon :name="EXPERT_SPECIALTY_META[e.specialtyKey].icon" :size="14" /> {{ EXPERT_SPECIALTY_META[e.specialtyKey].label }}</BaseChip>
          <BaseChip :color="tierColor(tierOf(e).color)"><BaseIcon :name="tierOf(e).icon" :size="14" /> {{ tierOf(e).label }}</BaseChip>
        </div>

        <div class="mb-3 text-sm">{{ e.specialty }}</div>

        <div class="mb-3 mt-auto flex items-center gap-3 text-xs text-muted">
          <span class="flex items-center gap-1"><BaseIcon name="mdi-star" :size="14" style="color: #f59e0b" /> {{ e.rating }}</span>
          <span class="flex items-center gap-1"><BaseIcon name="mdi-account-group-outline" :size="14" /> {{ e.clients }} عميلًا</span>
          <span class="ms-auto font-bold" style="color: rgb(var(--v-theme-primary))">من {{ e.priceFrom }} ﷼ {{ e.priceUnit }}</span>
        </div>

        <div class="flex gap-2">
          <BaseButton variant="outline" size="sm" :to="{ name: 'expert-profile', params: { slug: e.slug } }">الملف</BaseButton>
          <BaseButton :variant="e.role === 'consultant' ? 'accent' : e.role === 'trainer' ? 'emerald' : 'brand'" size="sm" class="flex-1" @click="openRequest(e)">
            <BaseIcon name="mdi-send" :size="16" /> اطلب {{ MARKET_ROLE_META[e.role].service }}
          </BaseButton>
        </div>
      </BaseCard>
    </div>

    <BaseCard v-if="!filtered.length" class="py-10 text-center">
      <BaseIcon name="mdi-magnify-remove-outline" :size="48" class="text-muted" />
      <p class="mt-2 text-sm text-muted">لا نتائج مطابقة — جرّب تخصصًا أو اسمًا آخر.</p>
    </BaseCard>

    <!-- دعوة جانب العرض -->
    <div v-if="canJoin" class="brand-gradient rounded-ui-lg mt-6 p-5 text-center">
      <p class="mb-3 text-white">لديك خبرة إرشاد أو تدريب أو استشارة؟ انضم إلى السوق وحوّل خبرتك إلى دخل.</p>
      <div class="flex flex-wrap justify-center gap-2">
        <RouterLink
          v-for="(meta, role) in MARKET_ROLE_META"
          :key="role"
          :to="`/join/${role}`"
          class="rounded-ui inline-flex items-center gap-1 border border-white/60 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <BaseIcon :name="meta.icon" :size="16" /> انضم {{ meta.label }}
        </RouterLink>
      </div>
    </div>

    <!-- طلب خدمة -->
    <BaseModal v-model="requestDialog" :title="selected ? `طلب ${MARKET_ROLE_META[selected.role].service}` : ''" :max-width="480">
      <template v-if="selected">
        <div class="mb-3 flex items-center gap-2">
          <BaseAvatar :color="roleColor(selected.role)" :size="36" tonal>{{ selected.initial }}</BaseAvatar>
          <div>
            <div class="text-sm font-bold">{{ selected.name }}</div>
            <div class="text-xs text-muted">{{ selected.specialty }} · من {{ selected.priceFrom }} ﷼ {{ selected.priceUnit }}</div>
          </div>
        </div>
        <BaseTextarea v-model="reason" label="صف هدفك من الخدمة" :rows="3" placeholder="مثال: أريد خطة انتقال من الدعم الفني إلى تطوير الواجهات خلال 6 أشهر" />
        <p class="mt-2 text-xs text-muted">يصل طلبك للخبير عبر «الطلبات المتبادلة» وتتابع رده من هناك.</p>
      </template>
      <template #actions>
        <BaseButton variant="ghost" @click="requestDialog = false">إلغاء</BaseButton>
        <BaseButton :variant="selected?.role === 'consultant' ? 'accent' : 'brand'" :disabled="!reason.trim()" @click="sendRequest">
          <BaseIcon name="mdi-send" :size="18" /> إرسال الطلب
        </BaseButton>
      </template>
    </BaseModal>

    <BaseSnackbar v-model="snackbar" color="success" :timeout="3000">أُرسل طلبك — تابع في الطلبات المتبادلة.</BaseSnackbar>
  </div>
</template>
