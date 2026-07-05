<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import { useRoleRequestsStore } from '@/stores/RoleRequestsStore'
import { useReviewQueueStore } from '@/stores/ReviewQueueStore'
import { ROLE_META } from '@/services/roles'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'

const { t } = useI18n()
const roleRequests = useRoleRequestsStore()
const review = useReviewQueueStore()
const snackbar = ref('')

function decideRequest(id: number, approve: boolean, name: string) {
  roleRequests.decide(id, approve)
  snackbar.value = approve ? `اعتُمد طلب ${name} وفُعّل الدور` : `رُفض طلب ${name}`
}

const stats = computed(() => [
  { title: 'إجمالي المستخدمين', value: '14,208', icon: 'mdi-account-multiple-outline', color: 'primary' },
  { title: 'الفرص النشطة', value: '3,142', icon: 'mdi-briefcase-outline', color: 'secondary' },
  { title: 'التوصيات الموثّقة', value: '8,761', icon: 'mdi-account-star-outline', color: 'accent' },
  { title: 'بانتظار مراجعة التصنيف', value: String(review.pendingCount), icon: 'mdi-tag-search-outline', color: 'warning' },
])

const usersByRole = [
  { label: 'باحثون عن عمل', value: 68, color: 'primary' },
  { label: 'جهات توظيف', value: 18, color: 'secondary' },
  { label: 'موصون', value: 11, color: 'accent' },
  { label: 'مدراء', value: 3, color: 'info' },
]

const recentActivity = [
  { icon: 'mdi-account-plus-outline', text: 'انضم 128 مستخدماً جديداً اليوم', time: 'اليوم' },
  { icon: 'mdi-briefcase-plus-outline', text: 'نُشرت 42 فرصة جديدة', time: 'اليوم' },
  { icon: 'mdi-flag-outline', text: '3 بلاغات محتوى بانتظار المراجعة', time: 'قبل ساعتين' },
  { icon: 'mdi-robot-happy-outline', text: 'تم تحديث نموذج المطابقة الذكي', time: 'أمس' },
]

const health = [
  { label: 'زمن الاستجابة', value: '120ms', color: 'success' },
  { label: 'التوفّر', value: '99.9%', color: 'success' },
  { label: 'طلبات AI/دقيقة', value: '340', color: 'info' },
]
</script>

<template>
  <div>
    <PageHeader
      title="لوحة تحكم المدير"
      subtitle="نظرة شاملة على أداء المنصة"
      icon="mdi-shield-crown-outline"
    />

    <div class="mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard v-for="s in stats" :key="s.title" v-bind="s" />
    </div>

    <!-- طابور اعتماد الأدوار — يقفل حلقة الانضمام والاعتماد -->
    <BaseCard class="mb-4">
      <div class="mb-1 flex items-center gap-2">
        <BaseIcon name="mdi-shield-account-outline" :size="22" :style="{ color: 'rgb(var(--v-theme-warning))' }" />
        <h2 class="text-base font-bold text-content">طلبات اعتماد الأدوار</h2>
        <BaseChip v-if="roleRequests.pending.length" color="warning">{{ roleRequests.pending.length }}</BaseChip>
      </div>
      <p class="mb-3 text-xs text-muted">أدوار الموافقة (مقيّم/مرشد/مدرب/مستشار) تنتظر قرارك — الاعتماد يفعّل الدور فورًا مع إشعار لصاحبه.</p>
      <template v-if="roleRequests.pending.length">
        <div v-for="r in roleRequests.pending" :key="r.id" class="flex flex-wrap items-center gap-3 py-2">
          <BaseAvatar color="warning" tonal :size="38"><BaseIcon :name="ROLE_META[r.role].icon" :size="20" /></BaseAvatar>
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-1 text-sm font-bold text-content">
              {{ r.userName }}
              <BaseChip color="brand">{{ t(`roles.${r.role}`) }}</BaseChip>
              <BaseChip v-if="r.mine" color="info">من هذا الحساب</BaseChip>
            </div>
            <div class="text-xs text-muted">{{ r.note }} · {{ r.date }}</div>
          </div>
          <div class="flex gap-1">
            <BaseButton size="sm" variant="emerald" @click="decideRequest(r.id, true, r.userName)"><BaseIcon name="mdi-check" :size="16" />اعتماد</BaseButton>
            <BaseButton size="sm" variant="outline" @click="decideRequest(r.id, false, r.userName)"><BaseIcon name="mdi-close" :size="16" :style="{ color: 'rgb(var(--v-theme-error))' }" /><span :style="{ color: 'rgb(var(--v-theme-error))' }">رفض</span></BaseButton>
          </div>
        </div>
      </template>
      <p v-else class="mb-0 text-xs text-muted">لا طلبات معلقة — كل الأدوار معتمدة.</p>
    </BaseCard>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-12">
      <div class="md:col-span-5">
        <BaseCard class="h-full">
          <div class="mb-4 text-base font-bold text-content">توزيع المستخدمين حسب الدور</div>
          <div v-for="r in usersByRole" :key="r.label" class="mb-4">
            <div class="mb-1 flex justify-between text-sm text-content">
              <span>{{ r.label }}</span>
              <span class="font-bold">{{ r.value }}%</span>
            </div>
            <BaseProgressBar :value="r.value" :color="r.color" :height="10" />
          </div>
        </BaseCard>
      </div>

      <div class="md:col-span-7">
        <BaseCard class="h-full">
          <div class="mb-3 text-base font-bold text-content">نشاطات المنصة</div>
          <div class="flex flex-col gap-2">
            <div v-for="(a, i) in recentActivity" :key="i" class="flex items-center gap-3">
              <BaseAvatar color="brand" tonal square><BaseIcon :name="a.icon" :size="20" /></BaseAvatar>
              <div class="flex-1">
                <div class="text-sm text-content">{{ a.text }}</div>
                <div class="text-xs text-muted">{{ a.time }}</div>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>

      <div class="md:col-span-12">
        <BaseCard>
          <div class="mb-4 text-base font-bold text-content">صحة النظام</div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div v-for="h in health" :key="h.label" class="flex items-center gap-3">
              <BaseIcon name="mdi-circle" :size="14" :style="{ color: `rgb(var(--v-theme-${h.color}))` }" />
              <div>
                <div class="text-lg font-bold text-content">{{ h.value }}</div>
                <div class="text-xs text-muted">{{ h.label }}</div>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>

    <BaseSnackbar :model-value="!!snackbar" color="primary" :timeout="2500" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </BaseSnackbar>
  </div>
</template>
