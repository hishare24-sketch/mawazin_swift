<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { KIND_META, useRequestsStore } from '@/stores/RequestsStore'
import type { MarketRequest } from '@/stores/RequestsStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { useResumesStore } from '@/stores/ResumesStore'
import { matchScore } from '@/services/matching'
import { requestMatchProfile, seekerMatchProfile } from '@/services/matchProfile'
import { ai } from '@/services/ai'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseProgressRing from '@/components/ui/BaseProgressRing.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'

// رمز لون Vuetify → نغمة مكوّنات الأساس
type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}

const route = useRoute()
const router = useRouter()
const store = useRequestsStore()
const profile = useProfileStore()
const resumesStore = useResumesStore()

const request = computed(() => store.getById(Number(route.params.id)))
const similar = computed(() => store.similar(Number(route.params.id)))
const applied = computed(() => (request.value ? store.hasApplied(request.value.id) : false))

// نسبة التطابق الحيّة (نفس محرّك سوق الطلبات)
const seeker = computed(() => seekerMatchProfile({
  skills: profile.skills.map(s => s.name),
  city: profile.prefs.location,
  opportunityType: profile.prefs.preferred_employment_types[0],
}))
function liveMatch(r: MarketRequest): number {
  return matchScore(seeker.value, requestMatchProfile({ field: r.field, skills: r.skills, city: r.city, remote: r.remote })).score
}
const matchRate = computed(() => (request.value ? liveMatch(request.value) : 0))

const breakdown = computed(() => {
  const b = request.value?.breakdown
  return [
    { label: 'المهارات', value: b?.skills ?? 0 },
    { label: 'الخبرات', value: b?.experience ?? 0 },
    { label: 'الموقع', value: b?.location ?? 0 },
    { label: 'المدة', value: b?.duration ?? 0 },
  ]
})

// AI narrative match analysis
const matchNarrative = computed(() => {
  if (!request.value)
    return ''
  const b = request.value.breakdown
  const weakest = [...breakdown.value].sort((a, b2) => a.value - b2.value)[0]
  return `مهاراتك تتناسب مع هذا الطلب بنسبة ${b.skills}%. أقوى جوانبك «${breakdown.value[0].value >= 85 ? 'المهارات' : 'الخبرة'}»، بينما «${weakest.label}» (${weakest.value}%) هو الأقل — عزّزه بإضافة ${weakest.label === 'المهارات' ? 'اختبار مهارة' : 'مشروع'} ذي صلة لرفع فرصك.`
})

const faqs = computed(() => (request.value ? ai.generatedFaqs(request.value.title, request.value.kind) : []))
const forecast = computed(() => (request.value ? ai.applicationForecast(request.value.org, request.value.avgResponseDays) : ''))

// Apply dialog
const applyDialog = ref(false)
const resumes = computed(() => resumesStore.resumes)
const selectedResume = ref<number | null>(resumesStore.active?.id ?? null)
const appliedSnackbar = ref(false)
function confirmApply() {
  if (request.value)
    store.apply(request.value)
  applyDialog.value = false
  appliedSnackbar.value = true
}

// AI negotiation dialog
const negotiationDialog = ref(false)
const negotiationText = ref('')
const negotiationLoading = ref(false)
function openNegotiation() {
  negotiationDialog.value = true
  negotiationLoading.value = true
  negotiationText.value = ''
  setTimeout(() => {
    if (request.value) {
      const strengths = profile.skills
        .filter(s => !profile.unverifiedSkills.includes(s.name))
        .map(s => s.name)
      negotiationText.value = ai.negotiationDraft(request.value.title, request.value.org, strengths)
    }
    negotiationLoading.value = false
  }, 900)
}
function copyNegotiation() {
  navigator.clipboard?.writeText(negotiationText.value)
  negotiationDialog.value = false
  router.push({ name: 'messages' })
}
</script>

<template>
  <div v-if="request">
    <BaseButton variant="ghost" size="sm" class="mb-3" @click="router.back()">
      <BaseIcon name="mdi-arrow-right" :size="18" /> رجوع
    </BaseButton>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <!-- Main -->
      <div class="md:col-span-2">
        <BaseCard class="mb-4">
          <div class="mb-3 flex items-start gap-4">
            <BaseAvatar :color="mapColor(KIND_META[request.kind].color)" :size="64" tonal square>
              <span class="text-3xl font-bold">{{ request.orgInitial }}</span>
            </BaseAvatar>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl font-bold">{{ request.title }}</h1>
                <BaseChip :color="mapColor(KIND_META[request.kind].color)"><BaseIcon :name="KIND_META[request.kind].icon" :size="12" /> {{ KIND_META[request.kind].label }}</BaseChip>
              </div>
              <div class="text-muted">{{ request.org }} · {{ request.field }}</div>
            </div>
          </div>

          <div class="mb-4 flex flex-wrap gap-2">
            <BaseChip color="neutral"><BaseIcon name="mdi-map-marker-outline" :size="14" /> {{ request.remote ? 'عن بُعد' : request.city }}</BaseChip>
            <BaseChip color="neutral"><BaseIcon name="mdi-clock-outline" :size="14" /> {{ request.duration }}</BaseChip>
            <BaseChip color="neutral"><BaseIcon name="mdi-cash" :size="14" /> {{ request.budget }}</BaseChip>
            <BaseChip color="neutral"><BaseIcon name="mdi-account-multiple-outline" :size="14" /> {{ request.applicants }} متقدم</BaseChip>
          </div>

          <div class="mb-4 border-t border-ui" />

          <h3 class="mb-2 font-bold">وصف الطلب</h3>
          <p class="mb-4 text-sm text-muted">{{ request.description }}</p>

          <h3 class="mb-2 font-bold">المخرجات المتوقّعة</h3>
          <ul class="mb-3 space-y-1">
            <li v-for="d in request.deliverables" :key="d" class="flex items-start gap-2 text-sm">
              <BaseIcon name="mdi-check-circle-outline" :size="18" class="shrink-0" style="color: rgb(var(--v-theme-success))" /> <span>{{ d }}</span>
            </li>
          </ul>

          <h3 class="mb-2 font-bold">المهارات المطلوبة</h3>
          <div class="flex flex-wrap gap-2">
            <BaseChip v-for="s in request.skills" :key="s" color="emerald">{{ s }}</BaseChip>
          </div>
        </BaseCard>

        <!-- AI-generated FAQs -->
        <BaseCard class="mb-4">
          <div class="mb-3 flex items-center gap-2">
            <BaseIcon name="mdi-robot-happy-outline" :size="22" style="color: rgb(var(--v-theme-secondary))" />
            <h3 class="font-bold">أسئلة شائعة (مولّدة بالذكاء الاصطناعي)</h3>
          </div>
          <div class="divide-y" style="border-color: rgba(var(--v-theme-on-surface), 0.14)">
            <details v-for="(f, i) in faqs" :key="i" class="group py-1">
              <summary class="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-medium">
                {{ f.question }}
                <BaseIcon name="mdi-chevron-down" :size="18" class="text-muted transition group-open:rotate-180" />
              </summary>
              <p class="pb-2 text-sm text-muted">{{ f.answer }}</p>
            </details>
          </div>
        </BaseCard>

        <!-- Similar -->
        <template v-if="similar.length">
          <h3 class="mb-3 text-xl font-bold">طلبات مشابهة</h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <BaseCard
              v-for="r in similar"
              :key="r.id"
              hover
              class="h-full cursor-pointer"
              @click="router.push({ name: 'request-details', params: { id: r.id } })"
            >
              <BaseChip :color="mapColor(KIND_META[r.kind].color)" class="mb-2">{{ KIND_META[r.kind].label }}</BaseChip>
              <div class="truncate font-bold">{{ r.title }}</div>
              <div class="text-xs text-muted">{{ r.org }}</div>
              <BaseChip color="success" class="mt-2">{{ liveMatch(r) }}% تطابق</BaseChip>
            </BaseCard>
          </div>
        </template>
      </div>

      <!-- Sidebar -->
      <div>
        <BaseCard class="mb-4">
          <div class="mb-3 text-center">
            <BaseProgressRing :value="matchRate" :size="110" :width="10" color="success" class="mx-auto">
              <span class="text-2xl font-bold">{{ matchRate }}%</span>
            </BaseProgressRing>
            <div class="mt-2 text-sm text-muted">نسبة تطابقك مع الطلب</div>
          </div>

          <BaseButton variant="accent" size="lg" block :disabled="applied" @click="applyDialog = true">
            <BaseIcon :name="applied ? 'mdi-check' : 'mdi-send'" :size="18" /> {{ applied ? 'تم التقديم' : 'تقدّم الآن' }}
          </BaseButton>
          <BaseButton variant="outline" block class="mt-2" @click="openNegotiation">
            <BaseIcon name="mdi-handshake-outline" :size="18" /> تفاوض مدعوم من AI
          </BaseButton>

          <div
            class="rounded-ui mt-3 flex items-center gap-1 border-s-4 p-3 text-xs"
            style="border-color: rgb(var(--v-theme-info)); background: rgba(var(--v-theme-info), 0.1)"
          >
            <BaseIcon name="mdi-clock-fast" :size="16" />{{ forecast }}
          </div>
        </BaseCard>

        <!-- Match analysis -->
        <BaseCard>
          <div class="mb-3 font-bold">تحليل التطابق التفصيلي</div>
          <div v-for="item in breakdown" :key="item.label" class="mb-3">
            <div class="mb-1 flex justify-between text-sm">
              <span>{{ item.label }}</span>
              <span class="font-bold">{{ item.value }}%</span>
            </div>
            <BaseProgressBar :value="item.value" color="primary" :height="6" />
          </div>
          <div
            class="rounded-ui mt-2 flex items-start gap-2 border-s-4 p-3 text-xs"
            style="border-color: rgb(var(--v-theme-secondary)); background: rgba(var(--v-theme-secondary), 0.1)"
          >
            <BaseIcon name="mdi-robot-happy-outline" :size="18" class="shrink-0" />
            <span>{{ matchNarrative }}</span>
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- Apply dialog -->
    <BaseModal v-model="applyDialog" title="التقديم بسيرة ذاتية">
      <p class="mb-3 text-sm text-muted">اختر السيرة الأنسب لهذا الطلب (الـ AI يوصي بالسيرة النشطة):</p>
      <button
        v-for="r in resumes"
        :key="r.id"
        class="rounded-ui mb-2 flex w-full items-center gap-3 border p-3 text-start transition"
        :class="selectedResume === r.id ? 'border-transparent' : 'border-ui hover:bg-surfalt'"
        :style="selectedResume === r.id ? { background: 'rgba(var(--v-theme-primary), 0.12)' } : {}"
        @click="selectedResume = r.id"
      >
        <BaseIcon
          :name="selectedResume === r.id ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
          :size="22"
          :style="selectedResume === r.id ? { color: 'rgb(var(--v-theme-primary))' } : { color: 'rgba(var(--v-theme-on-surface), 0.6)' }"
        />
        <div>
          <div class="text-sm font-bold">{{ r.name }}</div>
          <div class="text-xs text-muted">{{ r.template }} · {{ r.language }}</div>
        </div>
      </button>
      <BaseButton variant="tonal-emerald" block class="mt-2" :to="{ name: 'resume-builder' }">
        <BaseIcon name="mdi-plus" :size="18" /> إنشاء سيرة جديدة لهذا الطلب
      </BaseButton>
      <template #actions>
        <BaseButton variant="ghost" @click="applyDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" @click="confirmApply"><BaseIcon name="mdi-send" :size="18" /> تأكيد التقديم</BaseButton>
      </template>
    </BaseModal>

    <!-- AI negotiation dialog -->
    <BaseModal v-model="negotiationDialog" :max-width="560">
      <template #title>
        <span class="flex items-center gap-2"><BaseIcon name="mdi-robot-happy-outline" :size="22" style="color: rgb(var(--v-theme-secondary))" /> تفاوض مدعوم من AI</span>
      </template>
      <p class="mb-2 text-xs text-muted">صاغ الـ AI رسالة تفاوض احترافية تستند إلى نقاط قوتك المُثبتة:</p>
      <div v-if="negotiationLoading" class="space-y-2">
        <div class="h-3 w-full animate-pulse rounded bg-surfalt" />
        <div class="h-3 w-11/12 animate-pulse rounded bg-surfalt" />
        <div class="h-3 w-4/5 animate-pulse rounded bg-surfalt" />
        <div class="h-3 w-full animate-pulse rounded bg-surfalt" />
      </div>
      <BaseTextarea v-else v-model="negotiationText" :rows="8" />
      <template #actions>
        <BaseButton variant="ghost" @click="negotiationDialog = false">إغلاق</BaseButton>
        <BaseButton variant="emerald" :disabled="negotiationLoading" @click="copyNegotiation">
          <BaseIcon name="mdi-send" :size="18" /> إرسال عبر الرسائل
        </BaseButton>
      </template>
    </BaseModal>

    <BaseSnackbar v-model="appliedSnackbar" color="success" :timeout="4000">
      تم إرسال طلبك بنجاح!
      <template #actions>
        <button class="font-bold underline" @click="router.push({ name: 'my-requests' })">طلباتي</button>
      </template>
    </BaseSnackbar>
  </div>

  <BaseCard v-else class="py-12 text-center">
    <BaseIcon name="mdi-alert-circle-outline" :size="64" style="color: rgb(var(--v-theme-error))" />
    <div class="mt-3 text-xl font-bold">الطلب غير موجود</div>
    <BaseButton variant="brand" class="mt-3" :to="{ name: 'requests' }">العودة للسوق</BaseButton>
  </BaseCard>
</template>
