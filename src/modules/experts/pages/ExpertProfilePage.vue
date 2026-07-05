<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EXPERT_TIER_META, MARKET_ROLE_META, expertTier, getExpertBySlug } from '@/stores/ExpertRolesStore'
import type { MarketExpertRole } from '@/stores/ExpertRolesStore'
import { usePeerRequestsStore } from '@/stores/PeerRequestsStore'
import type { PeerRequestType } from '@/stores/PeerRequestsStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'

const route = useRoute()
const router = useRouter()
const peerRequests = usePeerRequestsStore()
const notifications = useNotificationsStore()

const expert = computed(() => getExpertBySlug(String(route.params.slug)))
const roleMeta = computed(() => (expert.value ? MARKET_ROLE_META[expert.value.role] : null))
const tier = computed(() => (expert.value ? EXPERT_TIER_META[expertTier(expert.value.clients)] : null))

// رمز لون الدور → نغمة مكوّنات الأساس (teal للمدرّب → info)
type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function roleColor(role: MarketExpertRole): BaseColor {
  return ({ coach: 'brand', trainer: 'info', consultant: 'warning' } as Record<MarketExpertRole, BaseColor>)[role]
}
function tierColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}

// —— طلب خدمة (نفس منطق سوق الخبراء) ——
const ROLE_TO_REQUEST: Record<MarketExpertRole, PeerRequestType> = { coach: 'coaching', trainer: 'training', consultant: 'consultation' }
const requestDialog = ref(false)
const reason = ref('')
const snackbar = ref(false)
function sendRequest() {
  const e = expert.value
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

function shareProfile() {
  navigator.clipboard?.writeText(`${window.location.origin}/experts/${expert.value?.slug}`)
  snackbar.value = true
}
</script>

<template>
  <div v-if="expert && roleMeta && tier">
    <BaseButton variant="ghost" size="sm" class="mb-3" @click="router.back()">
      <BaseIcon name="mdi-arrow-right" :size="18" /> رجوع
    </BaseButton>

    <!-- ترويسة الملف -->
    <BaseCard class="mb-4">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
        <BaseAvatar :color="roleColor(expert.role)" :size="88" tonal square>
          <span class="text-3xl font-bold">{{ expert.initial }}</span>
        </BaseAvatar>
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-bold">{{ expert.name }}</h1>
            <BaseIcon v-if="expert.verified" name="mdi-check-decagram" :size="20" style="color: rgb(var(--v-theme-primary))" />
            <BaseChip :color="tierColor(tier.color)"><BaseIcon :name="tier.icon" :size="14" /> {{ tier.label }}</BaseChip>
          </div>
          <div class="mt-0.5 text-muted">{{ expert.title }}</div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <BaseChip :color="roleColor(expert.role)"><BaseIcon :name="roleMeta.icon" :size="14" /> {{ roleMeta.label }}</BaseChip>
            <BaseChip color="neutral"><BaseIcon name="mdi-map-marker-outline" :size="14" /> {{ expert.location }}</BaseChip>
            <BaseChip color="neutral"><BaseIcon name="mdi-translate" :size="14" /> {{ expert.languages.join(' · ') }}</BaseChip>
          </div>
          <!-- إحصاءات سريعة -->
          <div class="mt-3 flex flex-wrap gap-4 text-sm">
            <span class="flex items-center gap-1"><BaseIcon name="mdi-star" :size="16" style="color: #f59e0b" /> <b>{{ expert.rating }}</b> <span class="text-muted">({{ expert.reviewsCount }} تقييمًا)</span></span>
            <span class="flex items-center gap-1"><BaseIcon name="mdi-account-group-outline" :size="16" class="text-muted" /> <b>{{ expert.clients }}</b> <span class="text-muted">عميلًا</span></span>
            <span class="flex items-center gap-1"><BaseIcon name="mdi-briefcase-clock-outline" :size="16" class="text-muted" /> <b>{{ expert.years }}</b> <span class="text-muted">سنوات خبرة</span></span>
          </div>
        </div>
        <div class="flex flex-col gap-2 sm:w-52">
          <div class="text-center">
            <div class="text-xl font-bold" style="color: rgb(var(--v-theme-primary))">من {{ expert.priceFrom }} ﷼</div>
            <div class="text-xs text-muted">{{ expert.priceUnit }}</div>
          </div>
          <BaseButton :variant="expert.role === 'coach' ? 'brand' : expert.role === 'consultant' ? 'accent' : 'emerald'" block @click="requestDialog = true">
            <BaseIcon name="mdi-send" :size="18" /> اطلب {{ roleMeta.service }}
          </BaseButton>
          <BaseButton variant="outline" block @click="shareProfile">
            <BaseIcon name="mdi-share-variant-outline" :size="18" /> شارك الملف
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- العمود الرئيسي -->
      <div class="space-y-4 lg:col-span-2">
        <!-- النبذة -->
        <BaseCard>
          <h3 class="mb-2 font-bold">نبذة</h3>
          <p class="text-sm leading-relaxed text-muted">{{ expert.bio }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <BaseChip v-for="s in expert.specialties" :key="s" color="emerald">{{ s }}</BaseChip>
          </div>
        </BaseCard>

        <!-- قصص النجاح -->
        <BaseCard v-if="expert.successStories.length">
          <h3 class="mb-3 flex items-center gap-2 font-bold"><BaseIcon name="mdi-trophy-outline" :size="20" style="color: rgb(var(--v-theme-warning))" /> قصص نجاح</h3>
          <div class="space-y-3">
            <div
              v-for="s in expert.successStories"
              :key="s.id"
              class="rounded-ui border-s-4 p-3"
              style="border-color: rgb(var(--v-theme-success)); background: rgba(var(--v-theme-success), 0.08)"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-bold">{{ s.headline }}</span>
                <BaseChip color="success">{{ s.metric }}</BaseChip>
              </div>
              <p class="mt-1 text-sm text-muted">{{ s.outcome }}</p>
              <div class="mt-1 text-xs text-muted">— {{ s.client }}</div>
            </div>
          </div>
        </BaseCard>

        <!-- التقييمات -->
        <BaseCard v-if="expert.reviews.length">
          <h3 class="mb-3 flex items-center gap-2 font-bold"><BaseIcon name="mdi-comment-quote-outline" :size="20" style="color: rgb(var(--v-theme-secondary))" /> تقييمات العملاء ({{ expert.reviewsCount }})</h3>
          <div class="divide-y" style="border-color: rgba(var(--v-theme-on-surface), 0.14)">
            <div v-for="r in expert.reviews" :key="r.id" class="py-3 first:pt-0">
              <div class="flex items-center gap-2">
                <BaseAvatar color="emerald" :size="34" tonal>{{ r.initial }}</BaseAvatar>
                <div class="flex-1">
                  <div class="text-sm font-bold">{{ r.author }}</div>
                  <div class="text-xs text-muted">{{ r.service }} · {{ r.date }}</div>
                </div>
                <div class="flex items-center gap-0.5">
                  <BaseIcon v-for="n in r.rating" :key="n" name="mdi-star" :size="14" style="color: #f59e0b" />
                </div>
              </div>
              <p class="mt-2 text-sm text-muted">{{ r.text }}</p>
              <div v-if="r.reply" class="mt-2 rounded-ui bg-surfalt p-2 text-xs">
                <span class="font-bold">ردّ {{ expert.name }}:</span> <span class="text-muted">{{ r.reply }}</span>
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- المقالات -->
        <BaseCard v-if="expert.articles.length">
          <h3 class="mb-3 flex items-center gap-2 font-bold"><BaseIcon name="mdi-post-outline" :size="20" style="color: rgb(var(--v-theme-info))" /> مقالات ورؤى</h3>
          <div class="space-y-2">
            <div v-for="a in expert.articles" :key="a.id" class="rounded-ui border-ui p-3">
              <div class="font-bold">{{ a.title }}</div>
              <p class="mt-1 text-sm text-muted">{{ a.excerpt }}</p>
              <div class="mt-1 text-xs text-muted">{{ a.readMinutes }} دقائق قراءة · {{ a.date }}</div>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- العمود الجانبي -->
      <div class="space-y-4">
        <!-- العروض -->
        <BaseCard v-if="expert.offers.some(o => o.active)">
          <h3 class="mb-2 flex items-center gap-2 font-bold"><BaseIcon name="mdi-tag-outline" :size="20" style="color: rgb(var(--v-theme-accent))" /> عروض حالية</h3>
          <div
            v-for="o in expert.offers.filter(o => o.active)"
            :key="o.id"
            class="mb-2 rounded-ui border-s-4 p-3"
            style="border-color: rgb(var(--v-theme-accent)); background: rgba(var(--v-theme-accent), 0.1)"
          >
            <div class="text-sm font-bold">{{ o.label }}</div>
            <div class="text-xs text-muted">{{ o.desc }}</div>
          </div>
        </BaseCard>

        <!-- عناصر خدمة إضافية -->
        <BaseCard v-if="expert.serviceElements.length">
          <h3 class="mb-3 font-bold">خدمات إضافية اختيارية</h3>
          <div v-for="el in expert.serviceElements" :key="el.id" class="mb-3 flex items-start gap-2">
            <BaseIcon name="mdi-plus-circle-outline" :size="18" class="mt-0.5 shrink-0" style="color: rgb(var(--v-theme-primary))" />
            <div class="flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-bold">{{ el.label }}</span>
                <BaseChip color="brand">+{{ el.price }} ﷼</BaseChip>
              </div>
              <div class="text-xs text-muted">{{ el.desc }}</div>
            </div>
          </div>
        </BaseCard>

        <!-- أثر المنصة -->
        <BaseCard>
          <h3 class="mb-3 font-bold">الأثر على المنصة</h3>
          <div class="grid grid-cols-2 gap-3 text-center">
            <div class="rounded-ui bg-surfalt p-3">
              <div class="text-xl font-bold">{{ expert.stats.views }}</div>
              <div class="text-xs text-muted">مشاهدة</div>
            </div>
            <div class="rounded-ui bg-surfalt p-3">
              <div class="text-xl font-bold">{{ expert.stats.saves }}</div>
              <div class="text-xs text-muted">حفظ</div>
            </div>
            <div class="rounded-ui bg-surfalt p-3">
              <div class="text-xl font-bold">{{ expert.stats.shares }}</div>
              <div class="text-xs text-muted">مشاركة</div>
            </div>
            <div class="rounded-ui bg-surfalt p-3">
              <div class="text-xl font-bold">{{ expert.stats.referrals }}</div>
              <div class="text-xs text-muted">إحالة</div>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- طلب خدمة -->
    <BaseModal v-model="requestDialog" :title="`طلب ${roleMeta.service}`" :max-width="480">
      <div class="mb-3 flex items-center gap-2">
        <BaseAvatar :color="roleColor(expert.role)" :size="36" tonal>{{ expert.initial }}</BaseAvatar>
        <div>
          <div class="text-sm font-bold">{{ expert.name }}</div>
          <div class="text-xs text-muted">{{ expert.specialty }} · من {{ expert.priceFrom }} ﷼ {{ expert.priceUnit }}</div>
        </div>
      </div>
      <BaseTextarea v-model="reason" label="صف هدفك من الخدمة" :rows="3" placeholder="مثال: أريد خطة انتقال من الدعم الفني إلى تطوير الواجهات خلال 6 أشهر" />
      <p class="mt-2 text-xs text-muted">يصل طلبك للخبير عبر «الطلبات المتبادلة» وتتابع رده من هناك.</p>
      <template #actions>
        <BaseButton variant="ghost" @click="requestDialog = false">إلغاء</BaseButton>
        <BaseButton :variant="expert.role === 'consultant' ? 'accent' : 'brand'" :disabled="!reason.trim()" @click="sendRequest">
          <BaseIcon name="mdi-send" :size="18" /> إرسال الطلب
        </BaseButton>
      </template>
    </BaseModal>

    <BaseSnackbar v-model="snackbar" color="success" :timeout="3000">تمّ! تابع في الطلبات المتبادلة.</BaseSnackbar>
  </div>

  <BaseCard v-else class="py-12 text-center">
    <BaseIcon name="mdi-account-alert-outline" :size="64" style="color: rgb(var(--v-theme-error))" />
    <div class="mt-3 text-xl font-bold">الخبير غير موجود</div>
    <BaseButton variant="brand" class="mt-3" :to="{ name: 'experts-market' }">العودة لسوق الخبراء</BaseButton>
  </BaseCard>
</template>
