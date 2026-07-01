<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useMessagesStore } from '@/stores/MessagesStore'

const store = useMessagesStore()
const activeId = ref(store.conversations[0]?.id ?? 0)
const draft = ref('')
const threadRef = ref<HTMLElement | null>(null)

const active = computed(() => store.conversations.find(c => c.id === activeId.value))

async function scrollBottom() {
  await nextTick()
  if (threadRef.value)
    threadRef.value.scrollTop = threadRef.value.scrollHeight
}

function selectConversation(id: number) {
  activeId.value = id
  store.markRead(id)
  scrollBottom()
}

async function sendMessage() {
  const text = draft.value.trim()
  if (!text || !active.value)
    return
  store.send(active.value.id, text)
  draft.value = ''
  await scrollBottom()
}

onMounted(() => {
  if (active.value)
    store.markRead(active.value.id)
  scrollBottom()
})
</script>

<template>
  <div>
    <h1 class="text-h5 font-weight-bold mb-4">الرسائل</h1>
    <VCard class="d-flex overflow-hidden" style="height: calc(100vh - 180px)">
      <!-- Conversation list -->
      <div class="border-e d-none d-md-block" style="width: 300px; min-width: 300px">
        <VList class="py-0">
          <template v-for="(conv, i) in store.conversations" :key="conv.id">
            <VListItem :active="conv.id === activeId" color="primary" @click="selectConversation(conv.id)">
              <template #prepend>
                <VAvatar color="secondary"><span class="text-white">{{ conv.initial }}</span></VAvatar>
              </template>
              <VListItemTitle class="font-weight-bold">{{ conv.name }}</VListItemTitle>
              <VListItemSubtitle>{{ conv.messages[conv.messages.length - 1]?.text }}</VListItemSubtitle>
              <template #append>
                <VBadge v-if="conv.unread" :content="conv.unread" color="accent" inline />
              </template>
            </VListItem>
            <VDivider v-if="i < store.conversations.length - 1" />
          </template>
        </VList>
      </div>

      <!-- Thread -->
      <div v-if="active" class="flex-grow-1 d-flex flex-column">
        <div class="d-flex align-center ga-3 pa-4 border-b">
          <VAvatar color="secondary"><span class="text-white">{{ active.initial }}</span></VAvatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold">{{ active.name }}</div>
            <div class="text-caption text-medium-emphasis">{{ active.role }}</div>
          </div>
        </div>

        <div ref="threadRef" class="flex-grow-1 overflow-y-auto pa-4 bg-background">
          <div v-for="(m, i) in active.messages" :key="i" class="d-flex mb-2" :class="m.from === 'me' ? 'justify-end' : 'justify-start'">
            <div class="pa-3 rounded-lg text-body-2" :class="m.from === 'me' ? 'bg-primary text-white' : 'bg-surface'" style="max-width: 70%">
              {{ m.text }}
              <div class="text-caption opacity-70 mt-1">{{ m.time }}</div>
            </div>
          </div>
        </div>

        <div class="pa-3 border-t">
          <VTextField
            v-model="draft"
            placeholder="اكتب رسالة..."
            hide-details
            density="comfortable"
            append-inner-icon="mdi-send"
            @click:append-inner="sendMessage"
            @keyup.enter="sendMessage"
          />
        </div>
      </div>
    </VCard>
  </div>
</template>
