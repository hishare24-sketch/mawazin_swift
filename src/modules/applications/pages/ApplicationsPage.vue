<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'

type AppStatus = 'submitted' | 'reviewing' | 'interview' | 'rejected' | 'accepted'

interface Application {
  id: number
  opportunityId: number
  title: string
  company: string
  appliedAt: string
  status: AppStatus
  resume: string
}

const statusMeta: Record<AppStatus, { label: string, color: string, icon: string }> = {
  submitted: { label: 'تم التقديم', color: 'info', icon: 'mdi-send-check-outline' },
  reviewing: { label: 'قيد المراجعة', color: 'secondary', icon: 'mdi-file-search-outline' },
  interview: { label: 'مقابلة', color: 'success', icon: 'mdi-calendar-check-outline' },
  rejected: { label: 'مرفوض', color: 'error', icon: 'mdi-close-circle-outline' },
  accepted: { label: 'مقبول', color: 'accent', icon: 'mdi-check-decagram-outline' },
}

const router = useRouter()
const filter = ref<AppStatus | 'all'>('all')

const applications = ref<Application[]>([
  { id: 1, opportunityId: 1, title: 'مطوّر واجهات أمامية (Vue.js)', company: 'شركة تقنية المستقبل', appliedAt: 'قبل يومين', status: 'interview', resume: 'سيرة تقنية - حديث' },
  { id: 2, opportunityId: 2, title: 'مهندس ذكاء اصطناعي', company: 'مجموعة الابتكار', appliedAt: 'قبل 3 أيام', status: 'reviewing', resume: 'سيرة تقنية - حديث' },
  { id: 3, opportunityId: 4, title: 'محلل بيانات', company: 'بنك المعرفة', appliedAt: 'قبل أسبوع', status: 'submitted', resume: 'Technical CV - Modern' },
  { id: 4, opportunityId: 5, title: 'مدير تسويق رقمي', company: 'علامة تجارية ناشئة', appliedAt: 'قبل أسبوعين', status: 'rejected', resume: 'سيرة تقنية - حديث' },
])

const filtered = computed(() =>
  filter.value === 'all' ? applications.value : applications.value.filter(a => a.status === filter.value),
)

const stats = computed(() => [
  { title: 'إجمالي الطلبات', value: applications.value.length, icon: 'mdi-file-send-outline', color: 'primary' },
  { title: 'قيد المراجعة', value: applications.value.filter(a => a.status === 'reviewing').length, icon: 'mdi-file-search-outline', color: 'secondary' },
  { title: 'مقابلات', value: applications.value.filter(a => a.status === 'interview').length, icon: 'mdi-calendar-check-outline', color: 'success' },
  { title: 'مقبولة', value: applications.value.filter(a => a.status === 'accepted').length, icon: 'mdi-check-decagram-outline', color: 'accent' },
])

const filterChips: { value: AppStatus | 'all', label: string }[] = [
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
    <PageHeader
      title="طلباتي"
      subtitle="تابع حالة تقديماتك على الفرص"
      icon="mdi-file-send-outline"
    />

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
          <VListItem @click="router.push({ name: 'opportunity-details', params: { id: app.opportunityId } })">
            <template #prepend>
              <VAvatar :color="statusMeta[app.status].color" variant="tonal" rounded="lg">
                <VIcon :icon="statusMeta[app.status].icon" />
              </VAvatar>
            </template>
            <VListItemTitle class="font-weight-bold">{{ app.title }}</VListItemTitle>
            <VListItemSubtitle>
              {{ app.company }} · قُدّم {{ app.appliedAt }} · بـ «{{ app.resume }}»
            </VListItemSubtitle>
            <template #append>
              <VChip :color="statusMeta[app.status].color" size="small" label>
                {{ statusMeta[app.status].label }}
              </VChip>
            </template>
          </VListItem>
          <VDivider v-if="i < filtered.length - 1" />
        </template>
      </VList>
    </VCard>

    <VCard v-else class="pa-10 text-center">
      <VIcon icon="mdi-file-search-outline" size="56" color="medium-emphasis" />
      <div class="text-h6 mt-3">لا توجد طلبات بهذه الحالة</div>
      <VBtn color="accent" class="mt-3" :to="{ name: 'opportunities' }">تصفّح الفرص</VBtn>
    </VCard>
  </div>
</template>
