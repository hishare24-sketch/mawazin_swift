<script setup lang="ts">
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { confirmState, settleConfirm } from '@/components/ui/confirm'

// حوار تأكيد مشترك — يُركَّب مرّة واحدة في قشرة الأدمن. الاستدعاء عبر confirm() من confirm.ts.
</script>

<template>
  <BaseModal
    :model-value="confirmState.open"
    :title="confirmState.title"
    :max-width="440"
    @update:model-value="v => !v && settleConfirm(false)"
  >
    <div class="flex items-start gap-3">
      <span
        v-if="confirmState.icon || confirmState.tone === 'danger'"
        class="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        :style="confirmState.tone === 'danger'
          ? 'background: rgba(var(--v-theme-error), 0.14); color: rgb(var(--v-theme-error))'
          : 'background: rgba(var(--v-theme-primary), 0.14); color: rgb(var(--v-theme-primary))'"
      >
        <BaseIcon :name="confirmState.icon || 'mdi-alert-outline'" :size="20" />
      </span>
      <p class="pt-1 text-sm leading-relaxed text-content">{{ confirmState.message }}</p>
    </div>

    <template #actions>
      <BaseButton variant="ghost" @click="settleConfirm(false)">{{ confirmState.cancelText }}</BaseButton>
      <button
        type="button"
        class="confirm-go"
        :class="confirmState.tone === 'danger' ? 'is-danger' : 'is-brand'"
        @click="settleConfirm(true)"
      >{{ confirmState.confirmText }}</button>
    </template>
  </BaseModal>
</template>

<style scoped>
.confirm-go {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--ui-radius, 12px);
  font-weight: 700;
  font-size: 0.875rem;
  transition: filter 0.15s ease;
}
.confirm-go:hover { filter: brightness(1.06); }
.is-brand { background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-on-primary)); }
.is-danger { background: rgb(var(--v-theme-error)); color: #fff; }
</style>
