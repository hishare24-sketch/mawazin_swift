<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'

interface AppNotification {
  id: number
  icon: string
  color: string
  title: string
  body: string
  time: string
  read: boolean
  category: 'opportunity' | 'wish' | 'endorsement' | 'message' | 'system'
}

const notifications = ref<AppNotification[]>([
  { id: 1, icon: 'mdi-briefcase-search-outline', color: 'primary', title: 'فرصة جديدة تناسبك', body: 'فرصة "مطوّر واجهات أمامية" بنسبة تطابق 94%', time: 'قبل 10 دقائق', read: false, category: 'opportunity' },
  { id: 2, icon: 'mdi-hand-heart-outline', color: 'accent', title: 'رغبة واردة', body: 'أبدت "شركة الحلول الذكية" رغبتها في خدماتك', time: 'قبل ساعة', read: false, category: 'wish' },
  { id: 3, icon: 'mdi-account-star-outline', color: 'secondary', title: 'توصية جديدة', body: 'أضاف أحمد المنصور توصية لملفك', time: 'قبل 3 ساعات', read: false, category: 'endorsement' },
  { id: 4, icon: 'mdi-message-text-outline', color: 'info', title: 'رسالة جديدة', body: 'راسلتك "شركة تقنية المستقبل" بخصوص طلبك', time: 'أمس', read: true, category: 'message' },
  { id: 5, icon: 'mdi-robot-happy-outline', color: 'success', title: 'تحديث من المساعد', body: 'أكملت 80% من ملفك — أضف توصية لرفع فرصك', time: 'قبل يومين', read: true, category: 'system' },
])

const filter = ref<'all' | 'unread'>('all')

const filtered = computed(() =>
  filter.value === 'unread' ? notifications.value.filter(n => !n.read) : notifications.value,
)
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

function markAllRead() {
  notifications.value.forEach(n => (n.read = true))
}
function toggleRead(n: AppNotification) {
  n.read = !n.read
}
</script>

<template>
  <div class="mx-auto" style="max-width: 820px">
    <PageHeader title="الإشعارات" :subtitle="`لديك ${unreadCount} إشعارات غير مقروءة`" icon="mdi-bell-outline">
      <template #actions>
        <VBtn variant="text" size="small" prepend-icon="mdi-check-all" @click="markAllRead">تعليم الكل كمقروء</VBtn>
      </template>
    </PageHeader>

    <VBtnToggle v-model="filter" mandatory color="primary" variant="outlined" class="mb-4">
      <VBtn value="all" size="small">الكل</VBtn>
      <VBtn value="unread" size="small">غير المقروءة</VBtn>
    </VBtnToggle>

    <VCard>
      <VList lines="three">
        <template v-for="(n, i) in filtered" :key="n.id">
          <VListItem :class="!n.read ? 'bg-blue-lighten-5' : ''" @click="toggleRead(n)">
            <template #prepend>
              <VAvatar :color="n.color" variant="tonal" rounded="lg"><VIcon :icon="n.icon" /></VAvatar>
            </template>
            <VListItemTitle class="font-weight-bold">
              {{ n.title }}
              <VBadge v-if="!n.read" color="error" dot inline class="ms-1" />
            </VListItemTitle>
            <VListItemSubtitle>{{ n.body }}</VListItemSubtitle>
            <template #append>
              <span class="text-caption text-medium-emphasis">{{ n.time }}</span>
            </template>
          </VListItem>
          <VDivider v-if="i < filtered.length - 1" />
        </template>
      </VList>
      <div v-if="!filtered.length" class="pa-10 text-center text-medium-emphasis">
        <VIcon icon="mdi-bell-check-outline" size="48" />
        <div class="mt-2">لا توجد إشعارات</div>
      </div>
    </VCard>
  </div>
</template>
