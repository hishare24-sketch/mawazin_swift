<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import type { AppNotification } from '@/stores/NotificationsStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

const store = useNotificationsStore()
const router = useRouter()
const filter = ref<'all' | 'unread'>('all')

// الإجراء المباشر من الإشعار: تعليمه كمقروء ثم الانتقال لتنفيذ الإجراء
function runAction(n: AppNotification) {
  if (!n.actionTo)
    return
  store.markRead(n.id)
  router.push(n.actionTo)
}

const filtered = computed(() =>
  filter.value === 'unread' ? store.notifications.filter(n => !n.read) : store.notifications,
)
</script>

<template>
  <div class="mx-auto" style="max-width: 820px">
    <PageHeader title="الإشعارات" :subtitle="`لديك ${store.unreadCount} إشعارات غير مقروءة`" icon="mdi-bell-outline">
      <template #actions>
        <VBtn variant="text" size="small" prepend-icon="mdi-check-all" :disabled="!store.unreadCount" @click="store.markAllRead">
          تعليم الكل كمقروء
        </VBtn>
      </template>
    </PageHeader>

    <VBtnToggle v-model="filter" mandatory color="primary" variant="outlined" class="mb-4">
      <VBtn value="all" size="small">الكل</VBtn>
      <VBtn value="unread" size="small">غير المقروءة ({{ store.unreadCount }})</VBtn>
    </VBtnToggle>

    <VCard>
      <VList lines="three">
        <template v-for="(n, i) in filtered" :key="n.id">
          <VListItem :class="!n.read ? 'bg-blue-lighten-5' : ''" @click="store.toggleRead(n.id)">
            <template #prepend>
              <VAvatar :color="n.color" variant="tonal" rounded="lg"><VIcon :icon="n.icon" /></VAvatar>
            </template>
            <VListItemTitle class="font-weight-bold">
              {{ n.title }}
              <VBadge v-if="!n.read" color="error" dot inline class="ms-1" />
            </VListItemTitle>
            <VListItemSubtitle>{{ n.body }}</VListItemSubtitle>
            <VBtn
              v-if="n.actionTo"
              size="small"
              color="primary"
              variant="tonal"
              class="mt-2 align-self-start"
              prepend-icon="mdi-arrow-left-circle-outline"
              @click.stop="runAction(n)"
            >
              {{ n.actionLabel ?? 'تنفيذ الإجراء' }}
            </VBtn>
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
