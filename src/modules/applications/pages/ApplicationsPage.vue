<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import { useApplicationsStore } from '@/stores/ApplicationsStore'
import type { ApplicationStatus } from '@/stores/ApplicationsStore'

const statusMeta: Record<ApplicationStatus, { label: string, color: string, icon: string }> = {
  submitted: { label: 'تم التقديم', color: 'info', icon: 'mdi-send-check-outline' },
  reviewing: { label: 'قيد المراجعة', color: 'secondary', icon: 'mdi-file-search-outline' },
  interview: { label: 'مقابلة', color: 'success', icon: 'mdi-calendar-check-outline' },
  rejected: { label: 'مرفوض', color: 'error', icon: 'mdi-close-circle-outline' },
  accepted: { label: 'مقبول', color: 'accent', icon: 'mdi-check-decagram-outline' },
}

const router = useRouter()
const store = useApplicationsStore()
const filter = ref<ApplicationStatus | 'all'>('all')

const filtered = computed(() =>
  filter.value === 'all' ? store.applications : store.applications.filter(a => a.status === filter.value),
)

const stats = computed(() => [
  { title: 'إجمالي الطلبات', value: store.count, icon: 'mdi-file-send-outline', color: 'primary' },
  { title: 'قيد المراجعة', value: store.byStatus('reviewing').length, icon: 'mdi-file-search-outline', color: 'secondary' },
  { title: 'مقابلات', value: store.byStatus('interview').length, icon: 'mdi-calendar-check-outline', color: 'success' },
  { title: 'مقبولة', value: store.byStatus('accepted').length, icon: 'mdi-check-decagram-outline', color: 'accent' },
])

const filterChips: { value: ApplicationStatus | 'all', label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'submitted', label: 'تم التقديم' },
  { value: 'reviewing', label: 'قيد المراجعة' },
  { value: 'interview', label: 'مقابلة' },
  { value: 'accepted', label: 'مقبول' },
  { value: 'rejected', label: 'مرفوض' },
]
</script>

<template>
  <div>
    <PageHeader title="طلباتي" subtitle="تابع حالة تقديماتك على الفرص" icon="mdi-file-send-outline" />

    <VRow class="mb-2">
      <VCol v-for="s in stats" :key="s.title" cols="6" md="3">
        <StatCard v-bind="s" />
      </VCol>
    </VRow>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <VChip
        v-for="c in filterChips"
        :key="c.value"
        :color="filter === c.value ? 'primary' : undefined"
        :variant="filter === c.value ? 'flat' : 'outlined'"
        class="cursor-pointer"
        @click="filter = c.value"
      >
        {{ c.label }}
      </VChip>
    </div>

    <VCard v-if="filtered.length">
      <VList lines="two">
        <template v-for="(app, i) in filtered" :key="app.id">
          <VListItem>
            <template #prepend>
              <VAvatar :color="statusMeta[app.status].color" variant="tonal" rounded="lg">
                <VIcon :icon="statusMeta[app.status].icon" />
              </VAvatar>
            </template>
            <VListItemTitle class="font-weight-bold cursor-pointer" @click="router.push({ name: 'opportunity-details', params: { id: app.opportunityId } })">
              {{ app.title }}
            </VListItemTitle>
            <VListItemSubtitle>
              {{ app.company }} · قُدّم {{ app.appliedAt }} · بـ «{{ app.resume }}»
            </VListItemSubtitle>
            <template #append>
              <div class="d-flex align-center ga-2">
                <VChip :color="statusMeta[app.status].color" size="small" label>{{ statusMeta[app.status].label }}</VChip>
                <VMenu>
                  <template #activator="{ props }">
                    <VBtn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" />
                  </template>
                  <VList density="compact">
                    <VListItem prepend-icon="mdi-eye-outline" title="عرض الفرصة" @click="router.push({ name: 'opportunity-details', params: { id: app.opportunityId } })" />
                    <VListItem prepend-icon="mdi-delete-outline" title="سحب الطلب" base-color="error" @click="store.withdraw(app.id)" />
                  </VList>
                </VMenu>
              </div>
            </template>
          </VListItem>
          <VDivider v-if="i < filtered.length - 1" />
        </template>
      </VList>
    </VCard>

    <VCard v-else>
      <EmptyState
        icon="mdi-file-search-outline"
        title="لا توجد طلبات بهذه الحالة"
        description="تقدّم على الفرص المناسبة وتابع حالتها من هنا."
        action-text="تصفّح الفرص"
        action-icon="mdi-briefcase-search-outline"
        @action="router.push({ name: 'opportunities' })"
      />
    </VCard>
  </div>
</template>
