<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import ReviewsPanel from '@/components/shared/ReviewsPanel.vue'
import StatCard from '@/components/shared/StatCard.vue'
import { COMMISSION_NOTE, KIND_META, useInterviewersStore } from '@/stores/InterviewersStore'
import type { AgendaItem, MarketInterviewKind } from '@/stores/InterviewersStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { ai } from '@/services/ai'
import type { EvalElementSuggestion } from '@/services/ai'
import { MY_INTERVIEWER_ID, useInterviewerBrandStore } from '@/stores/InterviewerBrandStore'
import { useReviewsStore } from '@/stores/ReviewsStore'

const router = useRouter()
const store = useInterviewersStore()
const notifications = useNotificationsStore()

// ===== لوحة التسويق الشخصي (شريك نجاح) =====
const brand = useInterviewerBrandStore()
const reviewsStore = useReviewsStore()
const linkCopied = ref(false)
const refCopied = ref(false)
function copyPublicLink() {
  navigator.clipboard?.writeText(`${window.location.origin}${import.meta.env.BASE_URL}${brand.publicPath}`)
  brand.recordShare()
  linkCopied.value = true
  setTimeout(() => (linkCopied.value = false), 1800)
}
function copyReferral() {
  navigator.clipboard?.writeText(brand.referralLink)
  refCopied.value = true
  setTimeout(() => (refCopied.value = false), 1800)
}

// مستشار النمو الذكي — يحلل تعليقات مرشحيّ الحقيقية ويقارن بمتوسط المجال
const growth = computed(() => {
  const myReviews = reviewsStore.forSubject('toInterviewer', String(MY_INTERVIEWER_ID))
  return ai.interviewerGrowthTips({
    comments: myReviews.map(r => r.comment),
    avgRating: store.interviewerStats.avgRating || 4.6,
    fieldAvgRating: 4.3, // متوسط مجاله (تحليل منافسين ضمني — بلا أسماء)
  })
})

// عرض ترويجي جديد
const promoDialog = ref(false)
const newPromo = ref({ title: '', kind: 'discount' as 'discount' | 'free_intro', pct: 20 })
function savePromo() {
  if (!newPromo.value.title.trim())
    return
  brand.addPromo({ title: newPromo.value.title.trim(), kind: newPromo.value.kind, pct: newPromo.value.kind === 'discount' ? newPromo.value.pct : undefined })
  promoDialog.value = false
  newPromo.value = { title: '', kind: 'discount', pct: 20 }
}

// توصيات الزملاء المتبادلة — زملاء المهنة من سوق المقيّمين (عداي)
const peerDialog = ref(false)
const colleagues = computed(() => store.interviewers.filter(i => i.id !== MY_INTERVIEWER_ID))
const selectedPeerId = ref<number | null>(null)
function requestEndorsement() {
  const peer = colleagues.value.find(c => c.id === selectedPeerId.value)
  if (!peer)
    return
  brand.requestPeerEndorsement(peer.name, peer.title, peer.initial)
  peerDialog.value = false
  selectedPeerId.value = null
  notifications.push({ icon: 'mdi-account-heart-outline', color: 'info', title: 'أُرسل طلب التوصية', body: `طلبت توصية مهنية من ${peer.name} — ستصلك فور ردّه.`, category: 'endorsement' })
}

// قصة نجاح جديدة — تُرسل لصاحبها للموافقة قبل النشر
const storyDialog = ref(false)
const newStory = ref({ candidateName: '', headline: '', story: '' })
const storyValid = computed(() => !!newStory.value.candidateName.trim() && !!newStory.value.headline.trim() && !!newStory.value.story.trim())
function saveStory() {
  if (!storyValid.value)
    return
  brand.addSuccessStory(newStory.value.candidateName.trim(), newStory.value.headline.trim(), newStory.value.story.trim())
  storyDialog.value = false
  newStory.value = { candidateName: '', headline: '', story: '' }
  notifications.push({ icon: 'mdi-email-fast-outline', color: 'info', title: 'أُرسل طلب الموافقة', body: 'لن تُنشر القصة في ملفك العام إلا بعد موافقة صاحبها.', category: 'system' })
}

const STORY_STATUS_META = {
  awaiting_consent: { label: 'بانتظار الموافقة', color: 'warning' },
  approved: { label: 'منشورة بموافقة', color: 'success' },
  declined: { label: 'اعتُذر عنها', color: 'error' },
} as const

// مقال جديد
const articleDialog = ref(false)
const newArticle = ref({ title: '', body: '' })
function saveArticle() {
  if (!newArticle.value.title.trim() || !newArticle.value.body.trim())
    return
  brand.submitArticle(newArticle.value.title.trim(), newArticle.value.body.trim())
  articleDialog.value = false
  newArticle.value = { title: '', body: '' }
  notifications.push({ icon: 'mdi-post-outline', color: 'info', title: 'أُرسل مقالك للمراجعة', body: 'سيُنشر في ملفك العام فور اعتماده.', category: 'system' })
}

function acceptRequest(a: AgendaItem) {
  store.acceptRequest(a.id)
  notifications.push({
    icon: 'mdi-calendar-check-outline',
    color: 'success',
    title: 'قبلت طلب مقابلة',
    body: `أكّدت مقابلة ${KIND_META[a.kind].label} مع ${a.candidateName} — ${a.datetime}`,
    category: 'interview',
  })
}

const stats = computed(() => [
  { title: 'أرباح الشهر', value: `${store.interviewerStats.earnings} ﷼`, icon: 'mdi-cash-multiple', color: 'success' },
  { title: 'مقابلات منفّذة', value: store.interviewerStats.sessions, icon: 'mdi-check-decagram', color: 'primary' },
  { title: 'متوسط التقييم', value: `${store.interviewerStats.avgRating} ★`, icon: 'mdi-star', color: 'warning' },
  { title: 'طلبات جديدة', value: store.interviewerStats.pending, icon: 'mdi-bell-ring-outline', color: 'accent' },
])

// Pricing management
const priceDialog = ref(false)
const kinds = Object.keys(KIND_META) as MarketInterviewKind[]
const draftPricing = ref<Record<MarketInterviewKind, number>>({ ...store.pricing })
function openPricing() {
  draftPricing.value = { ...store.pricing }
  priceDialog.value = true
}
function savePricing() {
  kinds.forEach(k => store.setPrice(k, draftPricing.value[k]))
  priceDialog.value = false
}

// Custom evaluation elements management
const commissionNote = COMMISSION_NOTE
const newElement = ref({ name: '', description: '', price: 50 })
function addElement() {
  if (!newElement.value.name.trim())
    return
  store.addEvalElement({ name: newElement.value.name.trim(), description: newElement.value.description.trim(), price: newElement.value.price })
  newElement.value = { name: '', description: '', price: 50 }
}
const suggestions = ref<EvalElementSuggestion[]>([])
function loadSuggestions() {
  suggestions.value = ai.suggestEvalElements('technical', [])
}
function addSuggestion(s: EvalElementSuggestion) {
  store.addEvalElement({ name: s.name, description: s.description, price: s.price })
  suggestions.value = suggestions.value.filter(x => x.name !== s.name)
}
</script>

<template>
  <div>
    <PageHeader
      title="لوحة المقيّم"
      subtitle="أدر مقابلاتك التقييمية وأرباحك وأسعارك"
      icon="mdi-account-tie"
    >
      <template #actions>
        <VBtn variant="text" color="primary" prepend-icon="mdi-chart-box-outline" :to="{ name: 'interviewer-analytics' }">التحليلات</VBtn>
        <VBtn variant="tonal" color="secondary" prepend-icon="mdi-tag-outline" @click="openPricing">إدارة الأسعار</VBtn>
      </template>
    </PageHeader>

    <VRow class="mb-2">
      <VCol v-for="s in stats" :key="s.title" cols="12" sm="6" lg="3">
        <StatCard v-bind="s" />
      </VCol>
    </VRow>

    <!-- AI tip -->
    <VAlert color="secondary" variant="tonal" class="mb-4" border="start">
      <template #prepend><VIcon icon="mdi-robot-happy-outline" /></template>
      <span class="text-body-2">
        لديك {{ store.interviewerStats.pending }} طلب مقابلة جديد يناسب تخصصك — الرد السريع يرفع تقييمك وترتيبك في السوق.
      </span>
    </VAlert>

    <VRow>
      <!-- Requests + upcoming -->
      <VCol cols="12" lg="7">
        <h2 class="text-subtitle-1 font-weight-bold mb-3">طلبات مقابلات جديدة ({{ store.agendaRequests.length }})</h2>
        <VCard v-if="store.agendaRequests.length" class="mb-5">
          <VList lines="two">
            <template v-for="(a, i) in store.agendaRequests" :key="a.id">
              <VListItem>
                <template #prepend>
                  <VAvatar color="accent" variant="tonal"><span class="font-weight-bold">{{ a.candidateInitial }}</span></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ a.candidateName }} · {{ KIND_META[a.kind].label }}</VListItemTitle>
                <VListItemSubtitle>{{ a.candidateField }} · {{ a.datetime }} · {{ a.price }} ﷼</VListItemSubtitle>
                <template #append>
                  <div class="d-flex ga-1">
                    <VBtn size="small" color="success" variant="tonal" prepend-icon="mdi-check" @click="acceptRequest(a)">قبول</VBtn>
                    <VBtn icon="mdi-close" size="small" variant="text" color="error" @click="store.declineRequest(a.id)" />
                  </div>
                </template>
              </VListItem>
              <VDivider v-if="i < store.agendaRequests.length - 1" />
            </template>
          </VList>
        </VCard>
        <VCard v-else class="pa-6 text-center mb-5">
          <VIcon icon="mdi-inbox-outline" size="40" color="medium-emphasis" />
          <div class="text-body-2 text-medium-emphasis mt-1">لا طلبات جديدة حاليًا</div>
        </VCard>

        <h2 class="text-subtitle-1 font-weight-bold mb-3">مقابلات قادمة ({{ store.agendaUpcoming.length }})</h2>
        <VCard v-if="store.agendaUpcoming.length">
          <VList lines="two">
            <template v-for="(a, i) in store.agendaUpcoming" :key="a.id">
              <VListItem>
                <template #prepend>
                  <VAvatar color="info" variant="tonal"><span class="font-weight-bold">{{ a.candidateInitial }}</span></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ a.candidateName }} · {{ KIND_META[a.kind].label }}</VListItemTitle>
                <VListItemSubtitle>{{ a.datetime }} · {{ a.price }} ﷼</VListItemSubtitle>
                <template #append>
                  <VBtn size="small" color="primary" prepend-icon="mdi-video-outline" @click="router.push({ name: 'conduct-interview', params: { id: a.id } })">
                    بدء المقابلة
                  </VBtn>
                </template>
              </VListItem>
              <VDivider v-if="i < store.agendaUpcoming.length - 1" />
            </template>
          </VList>
        </VCard>
        <VCard v-else class="pa-6 text-center">
          <VIcon icon="mdi-calendar-blank-outline" size="40" color="medium-emphasis" />
          <div class="text-body-2 text-medium-emphasis mt-1">لا مقابلات مجدولة</div>
        </VCard>
      </VCol>

      <!-- Completed -->
      <VCol cols="12" lg="5">
        <h2 class="text-subtitle-1 font-weight-bold mb-3">مقابلات منفّذة ({{ store.agendaCompleted.length }})</h2>
        <VCard>
          <VList v-if="store.agendaCompleted.length" lines="two">
            <template v-for="(a, i) in store.agendaCompleted" :key="a.id">
              <VListItem>
                <template #prepend>
                  <VAvatar color="success" variant="tonal"><span class="font-weight-bold">{{ a.candidateInitial }}</span></VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold">{{ a.candidateName }}</VListItemTitle>
                <VListItemSubtitle>{{ KIND_META[a.kind].label }} · {{ a.datetime }}</VListItemSubtitle>
                <template #append>
                  <div class="d-flex align-center ga-2">
                    <VRating v-if="a.rating" :model-value="a.rating" color="warning" density="compact" size="x-small" readonly />
                    <VChip v-if="a.report" color="success" size="small" label>{{ a.report.overall }}%</VChip>
                  </div>
                </template>
              </VListItem>
              <VDivider v-if="i < store.agendaCompleted.length - 1" />
            </template>
          </VList>
          <div v-else class="pa-6 text-center text-medium-emphasis">لا مقابلات منفّذة بعد</div>
        </VCard>
      </VCol>

      <!-- Custom evaluation elements management -->
      <VCol cols="12">
        <VCard class="pa-5">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-1">
            <div class="d-flex align-center ga-2">
              <VIcon icon="mdi-tune-vertical" color="accent" />
              <h2 class="text-subtitle-1 font-weight-bold">عناصر التقييم المخصّصة</h2>
            </div>
            <VBtn size="small" variant="tonal" color="secondary" prepend-icon="mdi-robot-happy-outline" @click="loadSuggestions">اقترح بالذكاء الاصطناعي</VBtn>
          </div>
          <p class="text-caption text-medium-emphasis mb-3 d-flex align-center flex-wrap ga-1">
            أضِف عناصر تقييم إضافية بسعر مستقل تظهر للمرشّحين عند الحجز.
            <VMenu :close-on-content-click="false" location="top">
              <template #activator="{ props }">
                <span v-bind="props" class="cursor-pointer d-inline-flex align-center text-secondary"><VIcon icon="mdi-information-outline" size="14" class="me-1" />العمولة</span>
              </template>
              <VCard max-width="320" class="pa-3 text-caption">{{ commissionNote }}</VCard>
            </VMenu>
          </p>

          <div v-if="suggestions.length" class="mb-3 d-flex flex-wrap ga-2">
            <VChip v-for="s in suggestions" :key="s.name" color="secondary" variant="tonal" size="small" @click="addSuggestion(s)">
              <VIcon icon="mdi-plus" start size="14" />{{ s.name }} (+{{ s.price }})
            </VChip>
          </div>

          <div v-if="store.myEvalElements.length" class="d-flex flex-column ga-2 mb-4">
            <div v-for="el in store.myEvalElements" :key="el.id" class="element-row pa-2 d-flex align-center ga-2">
              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-bold">{{ el.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ el.description }}</div>
              </div>
              <span class="font-weight-bold">+{{ el.price }} ﷼</span>
              <VBtn icon="mdi-delete-outline" variant="text" size="x-small" color="error" @click="store.removeEvalElement(el.id)" />
            </div>
          </div>
          <div v-else class="text-caption text-medium-emphasis mb-3">لا عناصر مخصّصة بعد.</div>

          <VRow dense align="center">
            <VCol cols="12" sm="4"><VTextField v-model="newElement.name" label="اسم العنصر" density="compact" hide-details /></VCol>
            <VCol cols="12" sm="5"><VTextField v-model="newElement.description" label="الوصف" density="compact" hide-details /></VCol>
            <VCol cols="8" sm="2"><VTextField v-model.number="newElement.price" type="number" label="السعر" suffix="﷼" density="compact" hide-details /></VCol>
            <VCol cols="4" sm="1"><VBtn color="accent" block height="40" :disabled="!newElement.name.trim()" @click="addElement"><VIcon icon="mdi-plus" /></VBtn></VCol>
          </VRow>
        </VCard>
      </VCol>

      <!-- Personal marketing & growth panel (شريك نجاح) -->
      <VCol cols="12">
        <VCard class="pa-5">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-1">
            <div class="d-flex align-center ga-2">
              <VIcon icon="mdi-bullhorn-outline" color="accent" />
              <h2 class="text-subtitle-1 font-weight-bold">التسويق الشخصي</h2>
              <VChip v-if="brand.isAmbassador" size="x-small" color="accent" label prepend-icon="mdi-shield-star-outline">سفير المنصة</VChip>
            </div>
            <div class="d-flex ga-2">
              <VBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-open-in-new" :to="`/${brand.publicPath}`" target="_blank">
                ملفي العام
              </VBtn>
              <VBtn size="small" color="secondary" variant="tonal" :prepend-icon="linkCopied ? 'mdi-check' : 'mdi-link-variant'" @click="copyPublicLink">
                {{ linkCopied ? 'نُسخ الرابط' : 'مشاركة الملف' }}
              </VBtn>
              <VBtn size="small" color="info" variant="tonal" prepend-icon="mdi-linkedin" @click="brand.shareOnLinkedIn()">
                LinkedIn
              </VBtn>
            </div>
          </div>
          <p class="text-caption text-medium-emphasis mb-3">ملفك العام بطاقة تسويقية — شاركه على LinkedIn ووسائل التواصل لجذب حجوزات جديدة.</p>

          <!-- مؤشرات الوصول -->
          <VRow dense class="mb-2">
            <VCol v-for="m in [
              { label: 'مشاهدات الملف', value: brand.marketingStats.views, icon: 'mdi-eye-outline', color: 'primary' },
              { label: 'مرات المشاركة', value: brand.marketingStats.shares, icon: 'mdi-share-variant-outline', color: 'secondary' },
              { label: 'أضافوني للمفضلة', value: brand.marketingStats.favorites, icon: 'mdi-heart-outline', color: 'error' },
              { label: 'إحالات ناجحة', value: brand.marketingStats.referrals, icon: 'mdi-account-plus-outline', color: 'accent' },
            ]" :key="m.label" cols="6" md="3">
              <div class="text-center pa-3 rounded-lg growth-tile">
                <VIcon :icon="m.icon" :color="m.color" size="20" class="mb-1" />
                <div class="text-h6 font-weight-bold">{{ m.value }}</div>
                <div class="text-caption text-medium-emphasis">{{ m.label }}</div>
              </div>
            </VCol>
          </VRow>

          <VRow>
            <!-- رابط الدعوة -->
            <VCol cols="12" md="6">
              <div class="text-body-2 font-weight-bold mb-1"><VIcon icon="mdi-account-multiple-plus-outline" size="16" /> رابط الدعوة (شريك نمو)</div>
              <p class="text-caption text-medium-emphasis mb-2">كل مرشح يسجّل عبر رابطك = +50 نقطة في محفظتك.</p>
              <VTextField :model-value="brand.referralLink" readonly density="compact" hide-details dir="ltr">
                <template #append-inner>
                  <VBtn :icon="refCopied ? 'mdi-check' : 'mdi-content-copy'" variant="text" size="small" :color="refCopied ? 'success' : undefined" @click="copyReferral" />
                </template>
              </VTextField>
            </VCol>

            <!-- العروض الترويجية -->
            <VCol cols="12" md="6">
              <div class="d-flex align-center justify-space-between mb-1">
                <div class="text-body-2 font-weight-bold"><VIcon icon="mdi-tag-heart-outline" size="16" /> عروضي الترويجية</div>
                <VBtn size="x-small" variant="tonal" color="accent" prepend-icon="mdi-plus" @click="promoDialog = true">عرض جديد</VBtn>
              </div>
              <div v-for="p in brand.state.promos" :key="p.id" class="d-flex align-center ga-2 py-1">
                <VSwitch :model-value="p.active" color="accent" hide-details density="compact" @update:model-value="brand.togglePromo(p.id)" />
                <span class="text-caption flex-grow-1" :class="{ 'text-medium-emphasis': !p.active }">{{ p.title }}<b v-if="p.pct"> ({{ p.pct }}%)</b></span>
                <VBtn icon="mdi-delete-outline" size="x-small" variant="text" color="error" @click="brand.removePromo(p.id)" />
              </div>
              <p v-if="!brand.state.promos.length" class="text-caption text-medium-emphasis">أنشئ عرضًا (خصم أو جلسة تعارف مجانية) لجذب مرشحين جدد.</p>
            </VCol>
          </VRow>

          <VDivider class="my-3" />

          <VRow>
            <!-- توصيات AI للنمو -->
            <VCol cols="12" md="6">
              <div class="text-body-2 font-weight-bold mb-2"><VIcon icon="mdi-robot-happy-outline" size="16" color="secondary" /> مستشار النمو الذكي</div>
              <VAlert color="success" variant="tonal" density="compact" border="start" class="mb-2 text-caption">{{ growth.praise }}</VAlert>
              <VAlert color="warning" variant="tonal" density="compact" border="start" class="mb-2 text-caption">{{ growth.focus }}</VAlert>
              <VAlert color="info" variant="tonal" density="compact" border="start" class="text-caption">{{ growth.vsField }}</VAlert>
            </VCol>

            <!-- مقالاتي -->
            <VCol cols="12" md="6">
              <div class="d-flex align-center justify-space-between mb-1">
                <div class="text-body-2 font-weight-bold"><VIcon icon="mdi-post-outline" size="16" /> مقالاتي المهنية</div>
                <VBtn size="x-small" variant="tonal" color="secondary" prepend-icon="mdi-pencil-plus-outline" @click="articleDialog = true">مقال جديد</VBtn>
              </div>
              <div v-for="a in brand.state.articles" :key="a.id" class="d-flex align-center ga-2 py-1">
                <VChip size="x-small" :color="a.status === 'published' ? 'success' : 'warning'" label>
                  {{ a.status === 'published' ? 'منشور' : 'قيد المراجعة' }}
                </VChip>
                <span class="text-caption flex-grow-1">{{ a.title }}</span>
              </div>
              <p class="text-caption text-medium-emphasis mt-1">المقالات تُعرض في ملفك العام بعد مراجعة المنصة — تبني سلطتك المهنية.</p>
            </VCol>
          </VRow>

          <VDivider class="my-3" />

          <VRow>
            <!-- توصيات الزملاء المتبادلة -->
            <VCol cols="12" md="6">
              <div class="d-flex align-center justify-space-between mb-1">
                <div class="text-body-2 font-weight-bold"><VIcon icon="mdi-account-heart-outline" size="16" color="secondary" /> توصيات زملاء المهنة</div>
                <VBtn size="x-small" variant="tonal" color="secondary" prepend-icon="mdi-plus" @click="peerDialog = true">اطلب توصية</VBtn>
              </div>
              <div v-for="e in brand.state.peerEndorsements" :key="e.id" class="d-flex align-center ga-2 py-1">
                <VChip size="x-small" :color="e.status === 'received' ? 'success' : 'warning'" label>
                  {{ e.status === 'received' ? 'مستلمة' : 'بانتظار الرد' }}
                </VChip>
                <span class="text-caption flex-grow-1">{{ e.peerName }}</span>
                <VChip v-if="e.reciprocated" size="x-small" color="secondary" variant="tonal" label prepend-icon="mdi-swap-horizontal">متبادلة</VChip>
                <VBtn v-else-if="e.status === 'received'" size="x-small" variant="text" color="secondary" prepend-icon="mdi-swap-horizontal" @click="brand.reciprocatePeerEndorsement(e.id)">
                  ردّ التوصية
                </VBtn>
              </div>
              <p class="text-caption text-medium-emphasis mt-1">التوصيات المتبادلة بين المقيّمين ترفع مصداقية الطرفين وتظهر في الملف العام بشارة «متبادلة».</p>
            </VCol>

            <!-- قصص النجاح (بموافقة أصحابها) -->
            <VCol cols="12" md="6">
              <div class="d-flex align-center justify-space-between mb-1">
                <div class="text-body-2 font-weight-bold"><VIcon icon="mdi-trophy-variant-outline" size="16" color="success" /> قصص نجاح مرشحيّ</div>
                <VBtn size="x-small" variant="tonal" color="success" prepend-icon="mdi-plus" @click="storyDialog = true">قصة جديدة</VBtn>
              </div>
              <div v-for="s in brand.state.successStories" :key="s.id" class="d-flex align-center ga-2 py-1">
                <VChip size="x-small" :color="STORY_STATUS_META[s.status].color" label>{{ STORY_STATUS_META[s.status].label }}</VChip>
                <span class="text-caption flex-grow-1">{{ s.headline }}</span>
                <VBtn icon="mdi-delete-outline" size="x-small" variant="text" color="error" @click="brand.removeSuccessStory(s.id)" />
              </div>
              <p class="text-caption text-medium-emphasis mt-1">لا تُنشر أي قصة في ملفك العام قبل موافقة صاحبها الصريحة — الخصوصية أولًا.</p>
            </VCol>
          </VRow>

          <VDivider class="my-3" />

          <!-- شهاداتي القابلة للمشاركة -->
          <div class="text-body-2 font-weight-bold mb-2"><VIcon icon="mdi-certificate-outline" size="16" color="primary" /> شهاداتي وإنجازاتي — شاركها على LinkedIn</div>
          <div class="d-flex flex-wrap ga-2">
            <VChip
              v-for="a in brand.achievements.filter(x => x.earned)"
              :key="a.id"
              color="primary"
              variant="tonal"
              label
              @click="brand.shareOnLinkedIn()"
            >
              <VIcon :icon="a.icon" start size="16" />{{ a.label }}
              <VIcon icon="mdi-linkedin" end size="16" color="info" />
            </VChip>
          </div>
          <p class="text-caption text-medium-emphasis mt-2 mb-0">النقر على الشهادة يفتح مشاركة LinkedIn لملفك العام الموثّق — كل شهادة مشتقة من أداء حقيقي على المنصة.</p>
        </VCard>
      </VCol>

      <!-- Candidate reviews of me (doc §3.3-ب) -->
      <VCol cols="12">
        <VCard class="pa-5">
          <div class="d-flex align-center ga-2 mb-1">
            <VIcon icon="mdi-star-check-outline" color="amber" />
            <h2 class="text-subtitle-1 font-weight-bold">تقييمات المرشحين لي</h2>
          </div>
          <p class="text-caption text-medium-emphasis mb-3">آخر التقييمات العلنية من مرشحيك — يمكنك الرد مرة واحدة على كل تقييم.</p>
          <ReviewsPanel direction="toInterviewer" subject-id="1" can-reply :limit="3" />
        </VCard>
      </VCol>
    </VRow>

    <!-- New promo dialog -->
    <VDialog v-model="promoDialog" max-width="440">
      <VCard class="pa-2">
        <VCardTitle>عرض ترويجي جديد</VCardTitle>
        <VCardText>
          <VTextField v-model="newPromo.title" label="عنوان العرض" placeholder="خصم على الحزمة الشاملة" class="mb-3" />
          <VBtnToggle v-model="newPromo.kind" mandatory color="accent" variant="outlined" divided class="mb-3 w-100">
            <VBtn value="discount" class="flex-grow-1" prepend-icon="mdi-percent-outline">خصم %</VBtn>
            <VBtn value="free_intro" class="flex-grow-1" prepend-icon="mdi-gift-outline">جلسة مجانية</VBtn>
          </VBtnToggle>
          <VSlider v-if="newPromo.kind === 'discount'" v-model="newPromo.pct" :min="5" :max="50" :step="5" color="accent" thumb-label="always" label="نسبة الخصم" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="promoDialog = false">إلغاء</VBtn>
          <VBtn color="accent" variant="flat" :disabled="!newPromo.title.trim()" @click="savePromo">تفعيل العرض</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Peer endorsement request dialog -->
    <VDialog v-model="peerDialog" max-width="440">
      <VCard class="pa-2">
        <VCardTitle>طلب توصية من زميل مقيّم</VCardTitle>
        <VCardText>
          <VSelect
            v-model="selectedPeerId"
            :items="colleagues.map(c => ({ title: `${c.name} — ${c.title}`, value: c.id }))"
            label="اختر الزميل"
            density="comfortable"
          />
          <p class="text-caption text-medium-emphasis mb-0">تصلك التوصية فور ردّ الزميل وتظهر في ملفك العام — ويمكنك ردّها لتصبح «متبادلة».</p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="peerDialog = false">إلغاء</VBtn>
          <VBtn color="secondary" variant="flat" :disabled="!selectedPeerId" prepend-icon="mdi-send" @click="requestEndorsement">إرسال الطلب</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- New success story dialog -->
    <VDialog v-model="storyDialog" max-width="560">
      <VCard class="pa-2">
        <VCardTitle>قصة نجاح جديدة</VCardTitle>
        <VCardText>
          <VTextField v-model="newStory.candidateName" label="اسم المرشح صاحب القصة" class="mb-3" />
          <VTextField v-model="newStory.headline" label="عنوان القصة" placeholder="من رفض متكرر إلى عرض عمل" class="mb-3" />
          <VTextarea v-model="newStory.story" label="القصة" rows="4" auto-grow counter="500" />
          <VAlert color="warning" variant="tonal" density="compact" border="start" class="text-caption">
            تُرسل القصة أولًا لصاحبها للموافقة — ولا تظهر في ملفك العام إلا بعد موافقته الصريحة.
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="storyDialog = false">إلغاء</VBtn>
          <VBtn color="success" variant="flat" :disabled="!storyValid" prepend-icon="mdi-email-fast-outline" @click="saveStory">طلب موافقة صاحبها</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- New article dialog -->
    <VDialog v-model="articleDialog" max-width="560">
      <VCard class="pa-2">
        <VCardTitle>مقال مهني جديد</VCardTitle>
        <VCardText>
          <VTextField v-model="newArticle.title" label="عنوان المقال" class="mb-3" />
          <VTextarea v-model="newArticle.body" label="المحتوى" rows="5" auto-grow counter="600" />
          <p class="text-caption text-medium-emphasis">يُراجَع المقال من المنصة قبل النشر في ملفك العام.</p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="articleDialog = false">إلغاء</VBtn>
          <VBtn color="secondary" variant="flat" :disabled="!newArticle.title.trim() || !newArticle.body.trim()" prepend-icon="mdi-send" @click="saveArticle">إرسال للمراجعة</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Pricing dialog -->
    <VDialog v-model="priceDialog" max-width="460">
      <VCard class="pa-2">
        <VCardTitle>إدارة أسعار المقابلات</VCardTitle>
        <VCardText>
          <div v-for="k in kinds" :key="k" class="d-flex align-center ga-3 mb-2">
            <span class="text-body-2 flex-grow-1">{{ KIND_META[k].label }}</span>
            <VTextField
              v-model.number="draftPricing[k]"
              type="number"
              density="compact"
              hide-details
              suffix="﷼"
              style="max-width: 130px"
            />
          </div>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="priceDialog = false">إلغاء</VBtn>
          <VBtn color="accent" prepend-icon="mdi-content-save" @click="savePricing">حفظ الأسعار</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.element-row {
  border: 1px solid rgba(140, 163, 150, 0.2);
  border-radius: var(--ui-radius);
}
.growth-tile {
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
