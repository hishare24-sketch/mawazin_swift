<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInterviewerBrandStore, MY_INTERVIEWER_ID } from '@/stores/InterviewerBrandStore'
import { INTERVIEWER_TYPE_META, useInterviewersStore } from '@/stores/InterviewersStore'
import { useReviewsStore } from '@/stores/ReviewsStore'

// الملف العام التسويقي للمقيّم — قابل للمشاركة خارج المنصة (رابط عام)
const route = useRoute()
const router = useRouter()
const brand = useInterviewerBrandStore()
const interviewersStore = useInterviewersStore()
const reviewsStore = useReviewsStore()

const isMe = computed(() => String(route.params.slug) === brand.state.slug)
const expert = computed(() => (isMe.value ? interviewersStore.getById(MY_INTERVIEWER_ID) : undefined))

const featuredReviews = computed(() =>
  reviewsStore.forSubject('toInterviewer', String(MY_INTERVIEWER_ID))
    .filter(r => brand.state.featuredReviewIds.includes(r.id)),
)

const stats = computed(() => interviewersStore.interviewerStats)

onMounted(() => {
  if (isMe.value)
    brand.recordView() // عدّاد المشاهدات للوحة التسويق الشخصي
})

const copied = ref(false)
function share() {
  navigator.clipboard?.writeText(window.location.href)
  brand.recordShare()
  copied.value = true
  setTimeout(() => (copied.value = false), 1800)
}

// بطاقة مشاركة (OG-style) تُرسم على canvas وتُحمّل PNG — بديل عملي عن OG server-side في SPA
async function downloadShareCard() {
  const e = expert.value
  if (!e)
    return
  // Tajawal لم يعد خطّ الواجهة الافتراضيّ — نضمن تحميله قبل الرسم كي لا يسقط للاحتياطيّ
  await Promise.all([
    document.fonts.load('bold 64px Tajawal'),
    document.fonts.load('36px Tajawal'),
  ]).catch(() => {})
  const c = document.createElement('canvas')
  c.width = 1200
  c.height = 630
  const ctx = c.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 1200, 630)
  grad.addColorStop(0, '#14532d')
  grad.addColorStop(1, '#0f2e1c')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1200, 630)
  ctx.fillStyle = '#A3E635'
  ctx.font = 'bold 64px Tajawal, sans-serif'
  ctx.textAlign = 'center'
  ctx.direction = 'rtl'
  ctx.fillText(e.name, 600, 220)
  ctx.fillStyle = '#E6EFE7'
  ctx.font = '36px Tajawal, sans-serif'
  ctx.fillText(e.title, 600, 290)
  ctx.font = '32px Tajawal, sans-serif'
  ctx.fillText(`★ ${e.rating} · ${e.reviewsCount} تقييمًا · ${stats.value.sessions + 103} مقابلة منفّذة`, 600, 370)
  ctx.fillStyle = '#BEF264'
  ctx.font = 'bold 30px Tajawal, sans-serif'
  ctx.fillText('احجز جلستك عبر منظومة التوظيف الذكية', 600, 480)
  const a = document.createElement('a')
  a.href = c.toDataURL('image/png')
  a.download = `${brand.state.slug}-card.png`
  a.click()
  brand.recordShare()
}

function book() {
  router.push({ name: 'interviewer-profile', params: { id: MY_INTERVIEWER_ID } })
}
</script>

<template>
  <VContainer class="py-8" style="max-width: 880px">
    <template v-if="expert">
      <!-- Hero -->
      <VCard class="overflow-hidden mb-5">
        <div class="brand-gradient pa-6 pa-md-8" theme="darkTheme">
          <div class="d-flex align-center ga-4 flex-wrap">
            <VAvatar color="rgba(255,255,255,0.15)" size="84">
              <span class="text-h4 font-weight-bold text-white">{{ expert.initial }}</span>
            </VAvatar>
            <div class="flex-grow-1">
              <div class="d-flex align-center ga-2 flex-wrap">
                <h1 class="text-h5 font-weight-bold text-white">{{ expert.name }}</h1>
                <VIcon v-if="expert.verified" icon="mdi-check-decagram" color="accent" size="22" />
                <VChip v-if="brand.isAmbassador" size="small" color="accent" label prepend-icon="mdi-shield-star-outline">
                  سفير المنصة
                </VChip>
              </div>
              <div class="text-body-1 text-white opacity-90">{{ expert.title }}</div>
              <div class="text-caption text-white opacity-75">{{ INTERVIEWER_TYPE_META[expert.type].label }} · {{ expert.field }}</div>
            </div>
            <div class="d-flex flex-column ga-2">
              <VBtn color="accent" prepend-icon="mdi-calendar-check-outline" @click="book">احجز جلسة</VBtn>
              <div class="d-flex ga-1">
                <VBtn size="small" variant="outlined" color="white" :prepend-icon="copied ? 'mdi-check' : 'mdi-link-variant'" @click="share">
                  {{ copied ? 'نُسخ' : 'مشاركة' }}
                </VBtn>
                <VTooltip text="مشاركة على LinkedIn" location="bottom">
                  <template #activator="{ props }">
                    <VBtn v-bind="props" size="small" variant="outlined" color="white" icon="mdi-linkedin" @click="brand.shareOnLinkedIn()" />
                  </template>
                </VTooltip>
                <VTooltip text="تحميل بطاقة مشاركة (صورة)" location="bottom">
                  <template #activator="{ props }">
                    <VBtn v-bind="props" size="small" variant="outlined" color="white" icon="mdi-image-outline" @click="downloadShareCard" />
                  </template>
                </VTooltip>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats strip -->
        <VCardText>
          <VRow dense class="text-center">
            <VCol v-for="s in [
              { label: 'مقابلة منفّذة', value: stats.sessions + 103, icon: 'mdi-account-tie-voice-outline' },
              { label: 'متوسط التقييم', value: `${expert.rating} ★`, icon: 'mdi-star-outline' },
              { label: 'تحسّن مستوى المرشحين', value: `${brand.candidateImprovement}%`, icon: 'mdi-trending-up' },
              { label: 'يستجيب خلال', value: 'ساعة', icon: 'mdi-lightning-bolt-outline' },
            ]" :key="s.label" cols="6" md="3">
              <VIcon :icon="s.icon" color="primary" size="22" class="mb-1" />
              <div class="text-h6 font-weight-bold">{{ s.value }}</div>
              <div class="text-caption text-medium-emphasis">{{ s.label }}</div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <VRow>
        <VCol cols="12" md="7">
          <!-- نبذة وتخصصات -->
          <VCard class="pa-5 mb-4">
            <h2 class="text-subtitle-1 font-weight-bold mb-2">نبذة مهنية</h2>
            <p class="text-body-2 mb-3">{{ expert.bio }}</p>
            <div class="d-flex flex-wrap ga-1">
              <VChip v-for="sp in expert.specialties" :key="sp" size="small" color="primary" variant="tonal" label>{{ sp }}</VChip>
            </div>
          </VCard>

          <!-- آراء العملاء المميزة -->
          <VCard class="pa-5 mb-4">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon icon="mdi-comment-quote-outline" color="amber" size="20" class="me-1" />آراء المرشحين
            </h2>
            <div v-for="r in featuredReviews" :key="r.id" class="mb-3 pa-3 rounded-lg review-quote">
              <div class="d-flex align-center ga-2 mb-1">
                <VAvatar size="28" color="secondary" variant="tonal"><span class="text-caption font-weight-bold">{{ r.authorInitial }}</span></VAvatar>
                <span class="text-body-2 font-weight-bold">{{ r.authorName }}</span>
                <VRating :model-value="r.stars" readonly density="compact" size="x-small" color="warning" class="ms-auto" />
              </div>
              <p class="text-body-2 mb-0">«{{ r.comment }}»</p>
              <div class="text-caption text-medium-emphasis mt-1">{{ r.kindLabel }} · {{ r.date }}</div>
            </div>
            <p v-if="!featuredReviews.length" class="text-caption text-medium-emphasis">لا تقييمات مثبتة بعد.</p>
          </VCard>

          <!-- قصص نجاح (بموافقة أصحابها) -->
          <VCard v-if="brand.approvedStories.length" class="pa-5 mb-4">
            <h2 class="text-subtitle-1 font-weight-bold mb-1">
              <VIcon icon="mdi-trophy-variant-outline" color="success" size="20" class="me-1" />قصص نجاح
            </h2>
            <p class="text-caption text-medium-emphasis mb-3">تُنشر كل قصة بموافقة صاحبها الصريحة.</p>
            <div v-for="s in brand.approvedStories" :key="s.id" class="mb-3 pa-3 rounded-lg story-quote">
              <div class="d-flex align-center ga-2 mb-1">
                <VAvatar size="28" color="success" variant="tonal"><span class="text-caption font-weight-bold">{{ s.candidateInitial }}</span></VAvatar>
                <span class="text-body-2 font-weight-bold">{{ s.headline }}</span>
              </div>
              <p class="text-body-2 mb-1">{{ s.story }}</p>
              <div class="text-caption text-medium-emphasis d-flex align-center ga-1">
                {{ s.candidateName }} · {{ s.date }}
                <VChip size="x-small" color="success" variant="tonal" label prepend-icon="mdi-check-decagram-outline">بموافقة صاحبها</VChip>
              </div>
            </div>
          </VCard>

          <!-- مقالات الخبير -->
          <VCard v-if="brand.publishedArticles.length" class="pa-5">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon icon="mdi-post-outline" color="secondary" size="20" class="me-1" />مقالات ونصائح
            </h2>
            <div v-for="a in brand.publishedArticles" :key="a.id" class="mb-3">
              <div class="text-body-2 font-weight-bold">{{ a.title }}</div>
              <p class="text-caption text-medium-emphasis mb-1">{{ a.date }}</p>
              <p class="text-body-2">{{ a.body }}</p>
            </div>
          </VCard>
        </VCol>

        <VCol cols="12" md="5">
          <!-- عروض نشطة -->
          <VCard v-if="brand.activePromos.length" class="pa-5 mb-4" color="accent" variant="tonal">
            <h2 class="text-subtitle-1 font-weight-bold mb-2">
              <VIcon icon="mdi-tag-heart-outline" size="20" class="me-1" />عروض حالية
            </h2>
            <div v-for="p in brand.activePromos" :key="p.id" class="d-flex align-center ga-2 py-1">
              <VIcon :icon="p.kind === 'discount' ? 'mdi-percent-outline' : 'mdi-gift-outline'" size="18" />
              <span class="text-body-2">{{ p.title }}<b v-if="p.pct"> ({{ p.pct }}%)</b></span>
            </div>
            <VBtn color="accent" size="small" block class="mt-3" @click="book">استفد من العرض</VBtn>
          </VCard>

          <!-- توصيات زملاء المهنة -->
          <VCard v-if="brand.receivedPeerEndorsements.length" class="pa-5 mb-4">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon icon="mdi-account-heart-outline" color="secondary" size="20" class="me-1" />توصيات زملاء المهنة
            </h2>
            <div v-for="e in brand.receivedPeerEndorsements" :key="e.id" class="mb-3">
              <div class="d-flex align-center ga-2 mb-1">
                <VAvatar size="28" color="secondary" variant="tonal"><span class="text-caption font-weight-bold">{{ e.peerInitial }}</span></VAvatar>
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-bold">{{ e.peerName }}</div>
                  <div class="text-caption text-medium-emphasis">{{ e.peerTitle }}</div>
                </div>
                <VChip v-if="e.reciprocated" size="x-small" color="secondary" variant="tonal" label prepend-icon="mdi-swap-horizontal">متبادلة</VChip>
              </div>
              <p class="text-body-2 mb-0">«{{ e.text }}»</p>
            </div>
          </VCard>

          <!-- الإنجازات والشهادات -->
          <VCard class="pa-5">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon icon="mdi-certificate-outline" color="primary" size="20" class="me-1" />إنجازات وشهادات
            </h2>
            <div v-for="a in brand.achievements.filter(x => x.earned)" :key="a.id" class="d-flex align-center ga-2 py-1">
              <VAvatar color="primary" variant="tonal" size="30"><VIcon :icon="a.icon" size="16" /></VAvatar>
              <span class="text-body-2">{{ a.label }}</span>
            </div>
            <VDivider class="my-3" />
            <p class="text-caption text-medium-emphasis mb-0">
              شهادات موثّقة من منظومة التوظيف الذكية — كل جلسة تُقيَّم علنًا من مرشح حقيقي.
            </p>
          </VCard>
        </VCol>
      </VRow>

      <!-- CTA للمنصة (تسويق مزدوج) -->
      <VCard class="brand-gradient pa-5 mt-4 text-center" theme="darkTheme">
        <p class="text-body-1 text-white mb-3">هل أنت خبير في مجالك؟ انضم كمقيّم معتمد وحوّل خبرتك إلى دخل وسمعة.</p>
        <VBtn color="accent" :to="{ name: 'register' }">سجّل الآن</VBtn>
      </VCard>
    </template>

    <VCard v-else class="pa-8 text-center">
      <VIcon icon="mdi-account-question-outline" size="48" color="medium-emphasis" class="mb-2" />
      <p class="text-body-1">الملف غير موجود أو غير متاح للعامة.</p>
    </VCard>
  </VContainer>
</template>

<style scoped>
.review-quote {
  background: rgba(var(--v-theme-primary), 0.05);
  border-inline-start: 3px solid rgb(var(--v-theme-primary));
}
.story-quote {
  background: rgba(var(--v-theme-success), 0.05);
  border-inline-start: 3px solid rgb(var(--v-theme-success));
}
</style>
