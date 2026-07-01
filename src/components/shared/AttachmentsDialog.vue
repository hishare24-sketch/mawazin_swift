<script setup lang="ts">
import { computed, ref } from 'vue'
import { useInterviewersStore } from '@/stores/InterviewersStore'
import type { Attachment } from '@/stores/InterviewersStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'

const props = defineProps<{ bookingId: number, interviewerName: string }>()
const open = defineModel<boolean>({ default: false })

const store = useInterviewersStore()
const notifications = useNotificationsStore()

const booking = computed(() => store.bookings.find(b => b.id === props.bookingId))
const attachments = computed(() => booking.value?.attachments ?? [])

const linkUrl = ref('')
const linkLabel = ref('')

function notifyInterviewer(what: string) {
  notifications.push({
    icon: 'mdi-paperclip',
    color: 'secondary',
    title: 'أُرسلت مواد تحضيرية',
    body: `أرسلت ${what} إلى ${props.interviewerName} قبل المقابلة.`,
    category: 'interview',
  })
}

function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  for (const f of files)
    store.addAttachment(props.bookingId, { kind: 'file', name: f.name, fileType: f.type || 'application/octet-stream', size: f.size })
  if (files.length)
    notifyInterviewer(`${files.length} ملفًا`)
  input.value = ''
}
function addLink() {
  const url = linkUrl.value.trim()
  if (!url)
    return
  store.addAttachment(props.bookingId, { kind: 'link', name: linkLabel.value.trim() || url, url })
  notifyInterviewer('رابطًا')
  linkUrl.value = ''
  linkLabel.value = ''
}
function humanSize(bytes?: number) {
  if (!bytes)
    return ''
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
function iconFor(a: Attachment) {
  if (a.kind === 'link')
    return 'mdi-link-variant'
  const t = `${a.fileType ?? ''}${a.name}`
  if (/pdf/i.test(t))
    return 'mdi-file-pdf-box'
  if (/image|png|jpg|jpeg|gif/i.test(t))
    return 'mdi-file-image-outline'
  if (/word|doc/i.test(t))
    return 'mdi-file-word-outline'
  if (/video|mp4|mov/i.test(t))
    return 'mdi-file-video-outline'
  return 'mdi-file-outline'
}
</script>

<template>
  <VDialog v-model="open" max-width="560">
    <VCard class="pa-2">
      <VCardTitle class="d-flex align-center ga-2">
        <VIcon icon="mdi-paperclip" color="secondary" /> مرفقات ما قبل المقابلة
      </VCardTitle>
      <VCardText>
        <VAlert type="info" variant="tonal" density="compact" class="mb-3 text-caption">
          أرسل موادك التحضيرية (سيرة، مشاريع، روابط) حتى 24 ساعة قبل المقابلة ليطّلع عليها المقيّم ويجعل التقييم أدقّ.
        </VAlert>

        <!-- Existing attachments -->
        <div v-if="attachments.length" class="d-flex flex-column ga-2 mb-4">
          <div v-for="a in attachments" :key="a.id" class="att-row pa-2 d-flex align-center ga-2">
            <VIcon :icon="iconFor(a)" color="secondary" />
            <div class="flex-grow-1 text-truncate">
              <div class="text-body-2 font-weight-bold text-truncate">{{ a.name }}</div>
              <div class="text-caption text-medium-emphasis">
                <template v-if="a.kind === 'link'">رابط · {{ a.url }}</template>
                <template v-else>{{ a.fileType }}<span v-if="a.size"> · {{ humanSize(a.size) }}</span></template>
              </div>
            </div>
            <VChip size="x-small" :color="a.kind === 'link' ? 'info' : 'secondary'" variant="tonal" label>{{ a.kind === 'link' ? 'رابط' : 'ملف' }}</VChip>
          </div>
        </div>
        <div v-else class="text-caption text-medium-emphasis mb-3 text-center py-2">لا مرفقات بعد.</div>

        <!-- Add file -->
        <VBtn color="secondary" variant="tonal" prepend-icon="mdi-upload" block class="mb-3">
          رفع ملفات (PDF، Word، صور، فيديو)
          <input type="file" multiple class="file-overlay" @change="onFiles">
        </VBtn>

        <!-- Add link -->
        <div class="text-body-2 font-weight-bold mb-1">إضافة رابط</div>
        <VRow dense align="center">
          <VCol cols="12" sm="5"><VTextField v-model="linkUrl" placeholder="https://github.com/..." density="compact" hide-details /></VCol>
          <VCol cols="8" sm="5"><VTextField v-model="linkLabel" placeholder="وصف مختصر (اختياري)" density="compact" hide-details /></VCol>
          <VCol cols="4" sm="2"><VBtn color="accent" block height="40" :disabled="!linkUrl.trim()" @click="addLink"><VIcon icon="mdi-plus" /></VBtn></VCol>
        </VRow>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn color="primary" variant="text" @click="open = false">تم</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.att-row {
  border: 1px solid rgba(140, 163, 150, 0.2);
  border-radius: var(--ui-radius);
}
.file-overlay {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
</style>
