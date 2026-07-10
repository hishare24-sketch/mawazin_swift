<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { UserRole } from '@/interfaces/Auth'
import type { PortfolioItem, PublicSections } from '@/stores/PublicProfileStore'
import type { ProofType, Skill } from '@/stores/ProfileStore'
import { resolveProfileOwner } from '@/services/directMessages'
import { ROLE_META } from '@/services/roles'
import { useAccountPlanStore } from '@/stores/AccountPlanStore'
import { useAuthStore } from '@/stores/AuthStore'
import { useMessagesStore } from '@/stores/MessagesStore'
import { PROOF_META, useProfileStore } from '@/stores/ProfileStore'
import { usePublicProfileStore } from '@/stores/PublicProfileStore'

// ===== الصفحة التعريفية العامة — بطاقة المستخدم أمام العالم (كل الأدوار) =====
const { t } = useI18n()
const route = useRoute()
const pub = usePublicProfileStore()
const profile = useProfileStore()
const plan = useAccountPlanStore()
const auth = useAuthStore()
const messages = useMessagesStore()

const isFound = computed(() => String(route.params.slug) === pub.state.slug)
const s = computed(() => pub.state)
const roleLabel = (r: UserRole) => t(`roles.${r}`)

onMounted(() => {
  if (isFound.value) {
    pub.recordView()
    animateStats()
  }
})

// —— عدّاد تصاعدي لأرقام المصداقية عند التحميل (يتعطل مع إيقاف الحركة) ——
const statDisplay = ref<Record<string, string | number>>({})
function animateStats() {
  pub.verifiedFacts.forEach((f) => {
    const raw = String(f.value)
    const target = Number.parseInt(raw.replace(/\D/g, ''), 10)
    if (!s.value.appearance.motion || Number.isNaN(target)) {
      statDisplay.value[f.label] = raw
      return
    }
    const suffix = raw.replace(/^\d+/, '')
    const t0 = performance.now()
    const dur = 900
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur)
      statDisplay.value[f.label] = `${Math.round(target * (1 - (1 - k) ** 3))}${suffix}`
      if (k < 1)
        requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

// —— النبذة المزدوجة: مختصرة دائمًا + «اقرأ المزيد» للسرد الممتد ——
const storyExpanded = ref(false)

// —— خط الصفحة المختار: يُحمَّل من Google Fonts عند الحاجة ——
watch(() => pub.fontFamily, (fam) => {
  if (!fam)
    return
  const id = 'pp-font-link'
  let link = document.getElementById(id) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  link.href = `https://fonts.googleapis.com/css2?family=${fam.replace(/ /g, '+')}:wght@400;500;700&display=swap`
}, { immediate: true })
const pageFontStyle = computed(() => pub.fontFamily ? { fontFamily: `'${pub.fontFamily}', sans-serif` } : {})

// —— توصية من زائر (تدخل مخفية حتى موافقة صاحب الصفحة) ——
const testimonialDialog = ref(false)
const tmAuthor = ref('')
const tmRole = ref('')
const tmText = ref('')
const tmSent = ref(false)
function sendTestimonial() {
  if (!tmAuthor.value.trim() || !tmText.value.trim())
    return
  pub.submitTestimonial(tmAuthor.value.trim(), tmRole.value.trim(), tmText.value.trim())
  tmSent.value = true
  setTimeout(() => {
    testimonialDialog.value = false
    tmSent.value = false
    tmAuthor.value = ''
    tmRole.value = ''
    tmText.value = ''
  }, 1800)
}

// —— طرق العرض المتعددة: الزائر يختار كيف يقرأ الصفحة ——
type ViewMode = 'classic' | 'compact' | 'visual' | 'academic' | 'resume' | 'custom'
const viewMode = ref<ViewMode>('classic')

/** الأقسام المسموحة لكل طريقة عرض — null تعني كل الأقسام (custom يُدار بمجموعة الزائر) */
const MODE_SECTIONS: Record<ViewMode, readonly (keyof PublicSections)[] | null> = {
  classic: null,
  compact: ['stats', 'roles', 'achievements', 'skills'],
  visual: ['stats', 'portfolio', 'skills', 'testimonials', 'roles'],
  academic: ['stats', 'story', 'experience', 'skills'],
  resume: ['stats', 'story', 'achievements', 'experience', 'portfolio', 'testimonials', 'skills'],
  custom: null,
}

// —— العرض المخصص: الزائر يركّب صفحته بنفسه من الأقسام المتاحة ——
const CUSTOM_LABELS: Partial<Record<keyof PublicSections, string>> = {
  stats: 'المصداقية',
  roles: 'الأدوار',
  story: 'القصة',
  achievements: 'الإنجازات',
  experience: 'الخبرات',
  portfolio: 'الأعمال',
  testimonials: 'التوصيات',
  skills: 'المهارات',
  ratings: 'التقييم',
  comments: 'التعليقات',
}
const customSet = ref<Set<keyof PublicSections>>(new Set())
watch(viewMode, (m) => {
  // أول دخول للعرض المخصص: ابدأ بكل الأقسام المتاحة ثم انتقِ
  if (m === 'custom' && !customSet.value.size)
    customSet.value = new Set((Object.keys(CUSTOM_LABELS) as (keyof PublicSections)[]).filter(k => pub.canShow(k)))
})
function toggleCustomSection(k: keyof PublicSections) {
  const set = new Set(customSet.value)
  if (set.has(k))
    set.delete(k)
  else
    set.add(k)
  customSet.value = set
}

/** ترتيب العمود الرئيسي — العرض المرئي يقدّم المعرض على كل شيء */
const mainOrder = computed(() =>
  viewMode.value === 'visual'
    ? ['portfolio', ...s.value.sectionOrder.filter(k => k !== 'portfolio')] as typeof s.value.sectionOrder
    : s.value.sectionOrder,
)
function sectionVisible(key: keyof PublicSections): boolean {
  if (!pub.canShow(key))
    return false
  if (viewMode.value === 'custom')
    return customSet.value.has(key)
  const allowed = MODE_SECTIONS[viewMode.value]
  return !allowed || allowed.includes(key)
}

/** رابط خريطة تفاعلية للموقع */
const mapsUrl = computed(() => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.value.location)}`)

/**
 * تثبيت سياق Vuetify على قتامة ثيم الصفحة نفسه —
 * وإلا ورث الزوار لوحة منصّتهم (فاتحة/داكنة) فظهر حبر داكن فوق بطاقات داكنة والعكس.
 * undefined = ثيم المنصة (يتبع وضع الزائر كما هو مقصود).
 */
const pageTheme = computed(() => {
  if (!pub.themeStyles)
    return undefined
  return pub.themeIsLight ? 'lightTheme' : 'darkTheme'
})

// —— شريط التنقّل الداخلي (العرض الكلاسيكي) ——
const ANCHOR_LABELS: Partial<Record<keyof PublicSections, string>> = {
  story: 'قصتي',
  achievements: 'الإنجازات',
  experience: 'الخبرات',
  portfolio: 'الأعمال',
  testimonials: 'التوصيات',
  skills: 'المهارات',
}
const anchors = computed(() =>
  ([...s.value.sectionOrder, 'testimonials', 'skills'] as (keyof PublicSections)[])
    .filter(k => ANCHOR_LABELS[k] && sectionVisible(k))
    .map(k => ({ key: k, label: ANCHOR_LABELS[k]! })),
)
function scrollTo(key: string) {
  document.getElementById(`pp-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function printPage() {
  window.print()
}

// —— شكل الصورة الشخصية من إعدادات المظهر ——
const avatarRounded = computed(() => {
  const shape = s.value.appearance.avatarShape
  return shape === 'square' ? '0' : shape === 'rounded' ? 'lg' : undefined
})

// —— المهارات: مستويات + مصادر إثبات مصنّفة ——
/** خريطة selfLevel (1-5) → تسمية الوثيقة (مبتدئ/متوسط/متقدم/خبير) */
const LEVEL_LABELS = ['', 'مبتدئ', 'مبتدئ', 'متوسط', 'متقدم', 'خبير']
const levelLabel = (n: number) => LEVEL_LABELS[n] ?? 'متوسط'

/** تجميع إثباتات المهارة حسب النوع (📝 اختبار / 💬 توصية / 🚀 مشروع / 🎓 شهادة) */
function proofSummary(sk: Skill) {
  const counts = new Map<ProofType, number>()
  sk.proofs.forEach(p => counts.set(p.type, (counts.get(p.type) ?? 0) + 1))
  return [...counts].map(([type, count]) => ({ type, count, ...PROOF_META[type] }))
}

// نافذة تفاصيل إثباتات مهارة
const proofsDialog = ref(false)
const proofsSkill = ref<Skill | null>(null)
function openProofs(sk: Skill) {
  proofsSkill.value = sk
  proofsDialog.value = true
}

// —— طلب إثبات مهارة (من الزوار، خاصة الزملاء) ——
const proofReqDialog = ref(false)
const proofReqSkill = ref('')
const proofReqName = ref('')
const proofReqRelation = ref('')
const proofReqSent = ref(false)
function sendProofRequest() {
  if (!proofReqSkill.value || !proofReqName.value.trim())
    return
  pub.requestSkillProof(proofReqSkill.value, proofReqName.value.trim(), proofReqRelation.value.trim() || 'زائر')
  proofReqSent.value = true
  setTimeout(() => {
    proofReqDialog.value = false
    proofReqSent.value = false
    proofReqSkill.value = ''
    proofReqName.value = ''
    proofReqRelation.value = ''
  }, 1600)
}

// —— جدولة مقابلة (تكامل مع نظام المقابلات — وفق أوقات متاحة مقترحة) ——
const scheduleDialog = ref(false)
const SLOTS = ['10:00', '12:00', '16:00', '20:00']
const scheduleDays = computed(() => Array.from({ length: 5 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() + i + 1)
  return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' }) }
}))
/** محاكاة انشغال صاحب الصفحة — نمط ثابت كي تبدو بعض الفترات محجوزة */
const slotBusy = (dayIdx: number, slotIdx: number) => (dayIdx + slotIdx) % 4 === 0
const meetDay = ref(0)
const meetSlot = ref('')
const meetName = ref('')
const meetTopic = ref('')
const meetSent = ref(false)
function sendSchedule() {
  if (!meetSlot.value || !meetName.value.trim())
    return
  pub.scheduleMeeting(meetName.value.trim(), scheduleDays.value[meetDay.value].label, meetSlot.value, meetTopic.value.trim())
  meetSent.value = true
  setTimeout(() => {
    scheduleDialog.value = false
    meetSent.value = false
    meetSlot.value = ''
    meetName.value = ''
    meetTopic.value = ''
  }, 1600)
}

// —— معرض الأعمال: تصنيف وفلترة + نافذة تفاصيل + هوية بصرية لكل مشروع ——
const activeTag = ref('')
const portfolioTags = computed(() => [...new Set(s.value.portfolio.map(p => p.tag))])
const filteredPortfolio = computed(() =>
  activeTag.value ? s.value.portfolio.filter(p => p.tag === activeTag.value) : s.value.portfolio,
)
/** تدرّج لوني ثابت مشتق من وسم المشروع — هوية بصرية بلا صور حقيقية */
function tagGradient(tag: string) {
  const h = [...tag].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return `linear-gradient(135deg, hsl(${h}, 55%, 32%), hsl(${(h + 45) % 360}, 60%, 22%))`
}
const workDialog = ref(false)
const activeWork = ref<PortfolioItem | null>(null)
function openWork(p: PortfolioItem) {
  activeWork.value = p
  workDialog.value = true
}

// —— مشاركة ——
const copied = ref(false)
function share() {
  navigator.clipboard?.writeText(window.location.href)
  pub.recordShare()
  copied.value = true
  setTimeout(() => (copied.value = false), 1800)
}

// بطاقة مشاركة PNG عبر canvas (بديل OG server-side في SPA)
async function downloadShareCard() {
  // Tajawal لم يعد خطّ الواجهة الافتراضيّ — نضمن تحميله قبل الرسم كي لا يسقط للاحتياطيّ
  await Promise.all([
    document.fonts.load('bold 64px Tajawal'),
    document.fonts.load('34px Tajawal'),
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
  ctx.fillText(pub.displayName, 600, 210)
  ctx.fillStyle = '#E6EFE7'
  ctx.font = '34px Tajawal, sans-serif'
  ctx.fillText(s.value.publicHeadline, 600, 280)
  ctx.font = '30px Tajawal, sans-serif'
  const facts = pub.verifiedFacts.slice(0, 3).map(f => `${f.label}: ${f.value}`).join(' · ')
  ctx.fillText(facts, 600, 360)
  ctx.fillStyle = '#BEF264'
  ctx.font = 'bold 30px Tajawal, sans-serif'
  ctx.fillText('تعرّف عليّ عبر منظومة التوظيف الذكية', 600, 470)
  const a = document.createElement('a')
  a.href = c.toDataURL('image/png')
  a.download = `${s.value.slug}-card.png`
  a.click()
  pub.recordShare()
}

// —— تواصل معي (يصبّ في رسائل صاحب الملف داخل المنصة) ——
const contactDialog = ref(false)
const visitorName = ref('')
const visitorMsg = ref('')
const contactSent = ref(false)
async function sendContact() {
  if (!visitorName.value.trim() || !visitorMsg.value.trim())
    return
  // زائر مسجّل يتواصل مع صفحة مُدّعاة لمستخدم آخر → تسليم حقيقي؛ وإلا محاكاة محلية
  const me = auth.authUser?.uuid
  const owner = me ? await resolveProfileOwner(String(route.params.slug)) : null
  if (owner && owner.ownerId !== me) {
    await messages.sendToPeer(owner.ownerId, owner.name, visitorMsg.value.trim())
    pub.state.contacts++
  }
  else {
    pub.contact(visitorName.value.trim(), visitorMsg.value.trim())
  }
  contactSent.value = true
  setTimeout(() => {
    contactDialog.value = false
    contactSent.value = false
    visitorName.value = ''
    visitorMsg.value = ''
  }, 1600)
}

const externalLinks = computed(() => [
  { key: 'linkedin', icon: 'mdi-linkedin', url: s.value.links.linkedin },
  { key: 'github', icon: 'mdi-github', url: s.value.links.github },
  { key: 'twitter', icon: 'mdi-twitter', url: s.value.links.twitter },
  { key: 'instagram', icon: 'mdi-instagram', url: s.value.links.instagram },
  { key: 'youtube', icon: 'mdi-youtube', url: s.value.links.youtube },
  { key: 'behance', icon: 'mdi-alpha-b-circle-outline', url: s.value.links.behance },
  { key: 'website', icon: 'mdi-web', url: s.value.links.website },
].filter(l => l.url))

// —— تفاعل الزائر: تعليق جديد ——
const commentName = ref('')
const commentText = ref('')
function postComment() {
  if (!commentName.value.trim() || !commentText.value.trim())
    return
  pub.addComment(commentName.value.trim(), commentText.value.trim())
  commentName.value = ''
  commentText.value = ''
}
</script>

<template>
  <div
    class="pp-page"
    :class="{ 'pp-themed': !!pub.themeStyles, 'pp-light': pub.themeIsLight, 'pp-motion': s.appearance.motion }"
    :style="[pub.themeStyles ?? {}, pageFontStyle]"
  >
    <VThemeProvider :theme="pageTheme">
      <VContainer class="py-8" style="max-width: 880px">
      <template v-if="isFound">
        <!-- الهيدر التسويقي -->
        <VCard class="overflow-hidden mb-4">
          <div class="brand-gradient pp-hero pa-6 pa-md-8" theme="darkTheme">
            <div class="d-flex align-center ga-4 flex-wrap">
              <VAvatar color="rgba(255,255,255,0.15)" size="84" :rounded="avatarRounded" :class="{ 'pp-ring': s.appearance.avatarRing }">
                <VImg v-if="s.avatarImage" :src="s.avatarImage" cover />
                <span v-else class="text-h4 font-weight-bold text-white">{{ pub.displayName.trim().charAt(0) }}</span>
              </VAvatar>
              <div class="flex-grow-1">
                <div class="d-flex align-center ga-2 flex-wrap">
                  <h1 class="text-h5 font-weight-bold text-white">{{ pub.displayName }}</h1>
                  <VChip v-if="plan.tier === 'elite'" size="x-small" color="accent" label prepend-icon="mdi-crown-outline">نخبة</VChip>
                </div>
                <div class="text-body-1 text-white opacity-90">{{ s.publicHeadline }}</div>
                <div v-if="s.tagline" class="text-body-2 text-white opacity-80 font-italic">«{{ s.tagline }}»</div>
                <div class="d-flex align-center ga-2 flex-wrap mt-1">
                  <VChip size="x-small" :color="pub.availabilityMeta.color" variant="flat" label>
                    <span class="pp-dot me-1" />{{ pub.availabilityMeta.label }}
                  </VChip>
                  <span v-if="s.availability.message" class="text-caption text-white opacity-75">{{ s.availability.message }}</span>
                </div>
                <div class="text-caption text-white opacity-75 d-flex align-center ga-2 flex-wrap mt-1">
                  <a :href="mapsUrl" target="_blank" rel="noopener" class="text-white text-decoration-none">
                    <VIcon icon="mdi-map-marker-outline" size="14" />{{ s.location }}
                    <VTooltip activator="parent" location="bottom">عرض على الخريطة</VTooltip>
                  </a>
                  <span v-if="s.timezone"><VIcon icon="mdi-clock-time-four-outline" size="14" /> {{ s.timezone }}</span>
                  <span v-if="pub.canShow('followers')"><VIcon icon="mdi-account-group-outline" size="14" /> {{ s.followersCount }} متابعًا</span>
                  <span v-if="pub.canShow('ratings') && s.ratingCount">
                    <VIcon icon="mdi-star" size="14" color="amber" /> {{ pub.avgRating }} ({{ s.ratingCount }} تقييمًا)
                  </span>
                </div>
                <div v-if="externalLinks.length || s.customLinks.length" class="d-flex ga-1 mt-2 flex-wrap align-center">
                  <VBtn
                    v-for="l in externalLinks"
                    :key="l.key"
                    :icon="l.icon"
                    size="small"
                    variant="text"
                    color="white"
                    :href="l.url"
                    target="_blank"
                    rel="noopener"
                  />
                  <VBtn
                    v-for="cl in s.customLinks"
                    :key="`c${cl.id}`"
                    size="small"
                    variant="text"
                    color="white"
                    prepend-icon="mdi-link-variant"
                    :href="cl.url"
                    target="_blank"
                    rel="noopener"
                  >
                    {{ cl.label }}
                  </VBtn>
                </div>
              </div>
              <div class="d-flex flex-column ga-2 no-print">
                <div class="d-flex ga-2">
                  <VBtn
                    v-if="pub.canShow('followers')"
                    :color="s.visitorFollows ? 'success' : 'accent'"
                    :variant="s.visitorFollows ? 'tonal' : 'flat'"
                    :prepend-icon="s.visitorFollows ? 'mdi-account-check-outline' : 'mdi-account-plus-outline'"
                    @click="pub.toggleFollow()"
                  >
                    {{ s.visitorFollows ? 'تُتابعه' : 'متابعة' }}
                  </VBtn>
                  <VBtn v-if="s.contactEnabled" color="accent" :variant="pub.canShow('followers') ? 'outlined' : 'flat'" prepend-icon="mdi-message-arrow-right-outline" @click="contactDialog = true">
                    تواصل معي
                  </VBtn>
                </div>
                <VBtn v-if="s.schedulingEnabled" size="small" variant="tonal" color="white" prepend-icon="mdi-calendar-clock-outline" @click="scheduleDialog = true">
                  جدولة مقابلة
                </VBtn>
                <div class="d-flex ga-1">
                  <VBtn size="small" variant="outlined" color="white" :prepend-icon="copied ? 'mdi-check' : 'mdi-link-variant'" @click="share">
                    {{ copied ? 'نُسخ' : 'مشاركة' }}
                  </VBtn>
                  <VTooltip text="مشاركة على LinkedIn" location="bottom">
                    <template #activator="{ props }">
                      <VBtn v-bind="props" size="small" variant="outlined" color="white" icon="mdi-linkedin" @click="pub.shareOnLinkedIn()" />
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

          <!-- شريط المصداقية الموثّقة (مصغّر عمدًا — القصة أولًا) -->
          <VCardText v-if="sectionVisible('stats')">
            <VRow dense class="text-center">
              <VCol v-for="f in pub.verifiedFacts" :key="f.label" cols="6" md="3">
                <VIcon :icon="f.icon" color="primary" size="20" class="mb-1" />
                <div class="text-subtitle-1 font-weight-bold">{{ statDisplay[f.label] ?? f.value }}</div>
                <div class="text-caption text-medium-emphasis">{{ f.label }}</div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- طرق العرض + التنقّل السريع بين الأقسام -->
        <VCard class="pa-2 mb-4 pp-nav no-print d-flex align-center ga-2 flex-wrap">
          <VBtnToggle v-model="viewMode" color="primary" density="compact" mandatory variant="outlined" divided>
            <VBtn value="classic" size="small" prepend-icon="mdi-view-dashboard-outline">كلاسيكي</VBtn>
            <VBtn value="compact" size="small" prepend-icon="mdi-card-text-outline">مختصر</VBtn>
            <VBtn value="visual" size="small" prepend-icon="mdi-image-multiple-outline">مرئي</VBtn>
            <VBtn value="academic" size="small" prepend-icon="mdi-school-outline">أكاديمي</VBtn>
            <VBtn value="resume" size="small" prepend-icon="mdi-file-account-outline">سيرة ذاتية</VBtn>
            <VBtn value="custom" size="small" prepend-icon="mdi-tune-variant">مخصص</VBtn>
          </VBtnToggle>
          <VSpacer />
          <template v-if="viewMode === 'classic'">
            <VChip
              v-for="a in anchors"
              :key="a.key"
              size="small"
              variant="text"
              class="d-none d-sm-inline-flex"
              @click="scrollTo(a.key)"
            >
              {{ a.label }}
            </VChip>
          </template>
          <template v-else-if="viewMode === 'custom'">
            <VChip
              v-for="(label, k) in CUSTOM_LABELS"
              v-show="pub.canShow(k)"
              :key="k"
              size="small"
              :color="customSet.has(k) ? 'primary' : 'surface-variant'"
              :variant="customSet.has(k) ? 'flat' : 'outlined'"
              label
              @click="toggleCustomSection(k)"
            >
              <VIcon :icon="customSet.has(k) ? 'mdi-eye-outline' : 'mdi-eye-off-outline'" start size="12" />{{ label }}
            </VChip>
          </template>
          <VBtn v-if="viewMode === 'resume'" size="small" variant="tonal" color="primary" prepend-icon="mdi-printer-outline" @click="printPage">
            طباعة / PDF
          </VBtn>
        </VCard>

        <!-- فسيفساء الأدوار (بموافقة صاحبها عبر «ربط أدواري علنًا») -->
        <VCard v-if="pub.roleBadges.length && sectionVisible('roles')" class="pa-4 mb-4">
          <div class="d-flex flex-wrap ga-2 align-center">
            <VIcon icon="mdi-account-convert-outline" color="secondary" size="20" />
            <VChip v-for="b in pub.roleBadges" :key="b.role" color="secondary" variant="tonal" label :prepend-icon="ROLE_META[b.role].icon">
              {{ b.fact }}
            </VChip>
          </div>
        </VCard>

        <VRow>
          <VCol cols="12" :md="viewMode === 'resume' ? 12 : 7">
            <!-- أقسام العمود الرئيسي بترتيب يختاره صاحب الصفحة -->
            <template v-for="key in mainOrder" :key="key">
              <!-- القصة المهنية: نبذة مختصرة + «اقرأ المزيد» + هاشتاغات -->
              <VCard v-if="key === 'story' && sectionVisible('story')" id="pp-story" class="pa-5 mb-4">
                <h2 class="text-subtitle-1 font-weight-bold mb-2">قصتي المهنية</h2>
                <p v-if="s.bioShort" class="text-body-1 font-weight-medium mb-2" style="line-height: 1.9">{{ s.bioShort }}</p>
                <p v-if="!s.bioShort || storyExpanded || viewMode === 'resume'" class="text-body-2 mb-0" style="line-height: 2">{{ s.story }}</p>
                <VBtn
                  v-if="s.bioShort && s.story && viewMode !== 'resume'"
                  size="x-small"
                  variant="text"
                  color="primary"
                  class="mt-1 no-print"
                  :prepend-icon="storyExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  @click="storyExpanded = !storyExpanded"
                >
                  {{ storyExpanded ? 'إخفاء' : 'اقرأ المزيد' }}
                </VBtn>
                <div v-if="s.keywords.length" class="d-flex flex-wrap ga-1 mt-3">
                  <VChip v-for="k in s.keywords" :key="k" size="x-small" variant="tonal" color="secondary" label>#{{ k }}</VChip>
                </div>
              </VCard>

              <!-- أبرز الإنجازات -->
              <VCard v-else-if="key === 'achievements' && sectionVisible('achievements') && s.achievements.length" id="pp-achievements" class="pa-5 mb-4">
                <h2 class="text-subtitle-1 font-weight-bold mb-3">
                  <VIcon icon="mdi-rocket-launch-outline" color="primary" size="20" class="me-1" />أبرز الإنجازات
                </h2>
                <div v-for="a in s.achievements" :key="a.id" class="d-flex align-start ga-2 mb-2">
                  <VIcon :icon="a.kind === 'verified' ? 'mdi-check-decagram' : 'mdi-star-four-points-outline'" :color="a.kind === 'verified' ? 'success' : 'primary'" size="18" class="mt-1" />
                  <div>
                    <span class="text-body-2">{{ a.text }}</span>
                    <VChip size="x-small" :color="a.kind === 'verified' ? 'success' : 'surface-variant'" variant="tonal" label class="ms-1">
                      {{ a.kind === 'verified' ? 'موثّق من المنصة' : 'من المستخدم' }}
                    </VChip>
                  </div>
                </div>
              </VCard>

              <!-- الخبرات (سردية موجزة) -->
              <VCard v-else-if="key === 'experience' && sectionVisible('experience') && profile.experiences.length" id="pp-experience" class="pa-5 mb-4">
                <h2 class="text-subtitle-1 font-weight-bold mb-3">
                  <VIcon icon="mdi-briefcase-outline" color="secondary" size="20" class="me-1" />الخبرات
                </h2>
                <!-- المحور الزمني التفاعلي (السرد المهني) أو القائمة السردية — حسب اختيار صاحب الصفحة -->
                <VTimeline v-if="s.appearance.experienceView === 'timeline'" side="end" density="compact" truncate-line="both">
                  <VTimelineItem v-for="e in profile.experiences" :key="e.id" dot-color="secondary" size="x-small">
                    <VChip size="x-small" color="secondary" variant="tonal" label class="mb-1" prepend-icon="mdi-calendar-range-outline">{{ e.period }}</VChip>
                    <div class="text-body-2 font-weight-bold">{{ e.title }} — {{ e.company }}</div>
                    <p class="text-body-2 mb-0">{{ e.desc }}</p>
                  </VTimelineItem>
                </VTimeline>
                <template v-else>
                  <div v-for="e in profile.experiences" :key="e.id" class="mb-3">
                    <div class="text-body-2 font-weight-bold">{{ e.title }} — {{ e.company }}</div>
                    <div class="text-caption text-medium-emphasis">{{ e.period }}</div>
                    <p class="text-body-2 mb-0">{{ e.desc }}</p>
                  </div>
                </template>
              </VCard>

              <!-- معرض الأعمال -->
              <VCard v-else-if="key === 'portfolio' && sectionVisible('portfolio') && s.portfolio.length" id="pp-portfolio" class="pa-5 mb-4">
                <h2 class="text-subtitle-1 font-weight-bold mb-3">
                  <VIcon icon="mdi-palette-outline" color="accent" size="20" class="me-1" />معرض الأعمال
                </h2>
                <!-- فلترة حسب التصنيف -->
                <div v-if="portfolioTags.length > 1" class="d-flex flex-wrap ga-2 mb-3 no-print">
                  <VChip
                    size="small"
                    :color="activeTag === '' ? 'accent' : 'surface-variant'"
                    :variant="activeTag === '' ? 'flat' : 'outlined'"
                    label
                    @click="activeTag = ''"
                  >
                    الكل ({{ s.portfolio.length }})
                  </VChip>
                  <VChip
                    v-for="tg in portfolioTags"
                    :key="tg"
                    size="small"
                    :color="activeTag === tg ? 'accent' : 'surface-variant'"
                    :variant="activeTag === tg ? 'flat' : 'outlined'"
                    label
                    @click="activeTag = tg"
                  >
                    {{ tg }}
                  </VChip>
                </div>
                <VRow dense>
                  <VCol v-for="p in filteredPortfolio" :key="p.id" cols="12" sm="6">
                    <VCard variant="outlined" class="h-100 overflow-hidden cursor-pointer work-card" @click="openWork(p)">
                      <!-- صورة العمل إن وُجدت، وإلا هوية بصرية مشتقة من الوسم -->
                      <div
                        class="work-banner d-flex align-center justify-center"
                        :style="p.image
                          ? { backgroundImage: `url(${p.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : { background: tagGradient(p.tag) }"
                      >
                        <VIcon v-if="!p.image" icon="mdi-folder-image-outline" color="white" size="28" class="opacity-75" />
                      </div>
                      <div class="pa-3">
                        <VChip size="x-small" color="accent" variant="tonal" label class="mb-2">{{ p.tag }}</VChip>
                        <div class="text-body-2 font-weight-bold mb-1">{{ p.title }}</div>
                        <p class="text-caption text-medium-emphasis mb-0 work-desc">{{ p.desc }}</p>
                      </div>
                    </VCard>
                  </VCol>
                </VRow>
                <p class="text-caption text-medium-emphasis mt-2 mb-0">انقر أي عمل لعرض تفاصيله.</p>
              </VCard>
            </template>

            <!-- الشهادات والتعليم — خاص بالعرض الأكاديمي -->
            <VCard v-if="viewMode === 'academic' && profile.certificates.length" class="pa-5 mb-4">
              <h2 class="text-subtitle-1 font-weight-bold mb-3">
                <VIcon icon="mdi-school-outline" color="info" size="20" class="me-1" />الشهادات والتعليم
              </h2>
              <div v-for="c in profile.certificates" :key="c.id" class="d-flex align-center ga-2 mb-2">
                <VIcon icon="mdi-certificate-outline" color="info" size="18" />
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-bold">{{ c.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ c.issuer }} · {{ c.date }}</div>
                </div>
              </div>
            </VCard>
          </VCol>

          <VCol cols="12" :md="viewMode === 'resume' ? 12 : 5">
            <!-- التوصيات (الدليل الاجتماعي) -->
            <VCard v-if="sectionVisible('testimonials') && pub.visibleTestimonials.length" id="pp-testimonials" class="pa-5 mb-4">
              <h2 class="text-subtitle-1 font-weight-bold mb-3">
                <VIcon icon="mdi-comment-quote-outline" color="amber" size="20" class="me-1" />ماذا يقولون عني
              </h2>
              <div v-for="tm in pub.visibleTestimonials" :key="tm.id" class="mb-3 pa-3 rounded-lg quote-tile">
                <div class="d-flex align-center ga-2 mb-1">
                  <VAvatar size="28" color="secondary" variant="tonal"><span class="text-caption font-weight-bold">{{ tm.initial }}</span></VAvatar>
                  <div class="flex-grow-1">
                    <div class="text-body-2 font-weight-bold">{{ tm.author }}</div>
                    <div class="text-caption text-medium-emphasis">{{ tm.authorRole }}</div>
                  </div>
                  <VBtn
                    size="x-small"
                    variant="text"
                    :color="tm.visitorLiked ? 'error' : 'medium-emphasis'"
                    :prepend-icon="tm.visitorLiked ? 'mdi-heart' : 'mdi-heart-outline'"
                    class="no-print"
                    @click="pub.toggleTestimonialLike(tm.id)"
                  >
                    {{ tm.likes || '' }}
                  </VBtn>
                </div>
                <p class="text-body-2 mb-0">«{{ tm.excerpt }}»</p>
              </div>
              <VBtn size="small" variant="tonal" color="amber" prepend-icon="mdi-comment-plus-outline" class="no-print" @click="testimonialDialog = true">
                أوصِ به أنت أيضًا
              </VBtn>
            </VCard>

            <!-- المهارات المختارة — نقاط القوة أولًا -->
            <VCard v-if="sectionVisible('skills') && pub.publicSkills.length" id="pp-skills" class="pa-5 mb-4">
              <h2 class="text-subtitle-1 font-weight-bold mb-3">
                <VIcon icon="mdi-star-outline" color="primary" size="20" class="me-1" />المهارات
              </h2>
              <template v-if="pub.featuredSkills.length">
                <div class="text-caption font-weight-bold mb-2">
                  <VIcon icon="mdi-star" size="14" color="accent" class="me-1" />نقاط القوة
                </div>
                <div class="d-flex flex-wrap ga-2 mb-3">
                  <VChip v-for="sk in pub.featuredSkills" :key="sk.id" color="accent" variant="flat" label prepend-icon="mdi-star">
                    {{ sk.name }}
                  </VChip>
                </div>
                <VDivider class="mb-2" />
              </template>
              <!-- مستوى + مصادر الإثبات لكل مهارة (انقر رقاقة إثبات للتفاصيل) -->
              <div v-for="sk in pub.publicSkills" :key="sk.id" class="py-2 skill-row">
                <div class="d-flex align-center ga-2 mb-1">
                  <VIcon v-if="s.featuredSkillIds.includes(sk.id)" icon="mdi-star" color="accent" size="14" />
                  <span class="text-body-2 font-weight-bold flex-grow-1">{{ sk.name }}</span>
                  <VChip size="x-small" color="primary" variant="tonal" label>{{ levelLabel(sk.selfLevel) }}</VChip>
                </div>
                <VProgressLinear :model-value="sk.selfLevel * 20" color="primary" height="5" rounded class="mb-2" />
                <div class="d-flex align-center ga-1 flex-wrap">
                  <VChip
                    v-for="pt in proofSummary(sk)"
                    :key="pt.type"
                    size="x-small"
                    variant="tonal"
                    :color="pt.color"
                    label
                    class="cursor-pointer"
                    @click="openProofs(sk)"
                  >
                    <VIcon :icon="pt.icon" start size="12" />{{ pt.label }}<template v-if="pt.count > 1"> ×{{ pt.count }}</template>
                  </VChip>
                  <span v-if="!sk.proofs.length" class="text-caption text-medium-emphasis">بلا إثباتات بعد</span>
                </div>
              </div>
              <p class="text-caption text-medium-emphasis mt-2 mb-2">انقر أي إثبات لعرض تفاصيله الموثّقة من المنصة.</p>
              <VBtn size="small" variant="tonal" color="warning" prepend-icon="mdi-check-decagram-outline" class="no-print" @click="proofReqDialog = true">
                طلب إثبات مهارة
              </VBtn>
            </VCard>
          </VCol>
        </VRow>

        <!-- تقييم الزوار -->
        <VCard v-if="sectionVisible('ratings')" class="pa-5 mt-4 no-print">
          <div class="d-flex align-center ga-3 flex-wrap">
            <div class="flex-grow-1">
              <h2 class="text-subtitle-1 font-weight-bold mb-1">
                <VIcon icon="mdi-star-outline" color="amber" size="20" class="me-1" />قيّم هذه الصفحة
              </h2>
              <p class="text-caption text-medium-emphasis mb-0">
                {{ s.visitorRating ? 'شكرًا لتقييمك — يمكنك تعديله متى شئت.' : 'رأيك يساعد الآخرين على الوثوق بهذا الملف.' }}
              </p>
            </div>
            <div class="text-center">
              <VRating
                :model-value="s.visitorRating"
                color="warning"
                hover
                size="32"
                @update:model-value="pub.rate(Number($event))"
              />
              <div class="text-caption text-medium-emphasis">المتوسط {{ pub.avgRating }} من {{ s.ratingCount }} تقييمًا</div>
            </div>
          </div>
        </VCard>

        <!-- تعليقات الزوار -->
        <VCard v-if="sectionVisible('comments')" class="pa-5 mt-4 no-print">
          <h2 class="text-subtitle-1 font-weight-bold mb-3">
            <VIcon icon="mdi-comment-multiple-outline" color="info" size="20" class="me-1" />التعليقات ({{ pub.visibleComments.length }})
          </h2>
          <div v-for="c in pub.visibleComments" :key="c.id" class="d-flex align-start ga-3 mb-3">
            <VAvatar size="32" color="info" variant="tonal"><span class="text-caption font-weight-bold">{{ c.initial }}</span></VAvatar>
            <div class="flex-grow-1">
              <div class="d-flex align-center ga-2">
                <span class="text-body-2 font-weight-bold">{{ c.author }}</span>
                <span class="text-caption text-medium-emphasis">{{ c.date }}</span>
              </div>
              <p class="text-body-2 mb-0">{{ c.text }}</p>
            </div>
          </div>
          <p v-if="!pub.visibleComments.length" class="text-caption text-medium-emphasis">كن أول من يعلّق.</p>
          <VDivider class="my-3" />
          <VRow dense align="center">
            <VCol cols="12" sm="3"><VTextField v-model="commentName" label="اسمك" density="compact" hide-details /></VCol>
            <VCol cols="12" sm="7"><VTextField v-model="commentText" label="أضف تعليقًا..." density="compact" hide-details @keyup.enter="postComment" /></VCol>
            <VCol cols="12" sm="2">
              <VBtn color="info" block height="40" :disabled="!commentName.trim() || !commentText.trim()" prepend-icon="mdi-send" @click="postComment">نشر</VBtn>
            </VCol>
          </VRow>
          <p class="text-caption text-medium-emphasis mt-2 mb-0">التعليقات تخضع لإشراف صاحب الصفحة.</p>
        </VCard>

        <!-- CTA المنصة (تسويق مزدوج) -->
        <VCard v-if="viewMode === 'classic'" class="brand-gradient pp-hero pa-5 mt-4 text-center no-print" theme="darkTheme">
          <p class="text-body-1 text-white mb-3">ابنِ هويتك المهنية الموثّقة أنت أيضًا — ملفك العام التالي يبدأ من هنا.</p>
          <VBtn color="accent" :to="{ name: 'register' }">أنشئ صفحتك</VBtn>
        </VCard>
      </template>

      <VCard v-else class="pa-8 text-center">
        <VIcon icon="mdi-account-question-outline" size="48" color="medium-emphasis" class="mb-2" />
        <p class="text-body-1">الصفحة غير موجودة أو غير متاحة للعامة.</p>
      </VCard>

      <!-- نموذج تواصل داخلي -->
      <VDialog v-model="contactDialog" max-width="460">
        <VCard class="pa-2">
          <VCardTitle>تواصل مع {{ pub.displayName }}</VCardTitle>
          <VCardText>
            <template v-if="!contactSent">
              <VTextField v-model="visitorName" label="اسمك" class="mb-3" />
              <VTextarea v-model="visitorMsg" label="رسالتك" rows="3" auto-grow placeholder="أرغب بالتواصل بخصوص..." />
              <p class="text-caption text-medium-emphasis mb-0">تصل رسالتك لصندوق رسائله داخل المنصة مباشرة.</p>
            </template>
            <VAlert v-else color="success" variant="tonal" border="start" density="compact">
              وصلت رسالتك! سيتواصل معك عبر المنصة.
            </VAlert>
          </VCardText>
          <VCardActions v-if="!contactSent">
            <VSpacer />
            <VBtn variant="text" @click="contactDialog = false">إلغاء</VBtn>
            <VBtn color="accent" variant="flat" :disabled="!visitorName.trim() || !visitorMsg.trim()" prepend-icon="mdi-send" @click="sendContact">إرسال</VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
      <!-- الشريط السفلي للجوال: إجراءات سريعة دائمة الحضور -->
      <div v-if="isFound" class="pp-bottom-bar d-flex d-sm-none align-center ga-2 pa-2 no-print">
        <VBtn v-if="s.contactEnabled" color="accent" size="small" class="flex-grow-1" prepend-icon="mdi-message-arrow-right-outline" @click="contactDialog = true">
          تواصل
        </VBtn>
        <VBtn v-if="s.schedulingEnabled" size="small" variant="tonal" color="secondary" icon="mdi-calendar-clock-outline" @click="scheduleDialog = true" />
        <VBtn
          v-if="pub.canShow('followers')"
          size="small"
          variant="tonal"
          :color="s.visitorFollows ? 'success' : 'primary'"
          :icon="s.visitorFollows ? 'mdi-account-check-outline' : 'mdi-account-plus-outline'"
          @click="pub.toggleFollow()"
        />
        <VBtn size="small" variant="tonal" color="primary" :icon="copied ? 'mdi-check' : 'mdi-share-variant-outline'" @click="share" />
      </div>

      <!-- توصية من زائر -->
      <VDialog v-model="testimonialDialog" max-width="460">
        <VCard class="pa-2">
          <VCardTitle>أوصِ بـ{{ pub.displayName }}</VCardTitle>
          <VCardText>
            <template v-if="!tmSent">
              <p class="text-caption text-medium-emphasis mb-3">عملت معه؟ شاركنا شهادتك — تظهر علنًا بعد موافقته.</p>
              <VTextField v-model="tmAuthor" label="اسمك" class="mb-3" />
              <VTextField v-model="tmRole" label="صفتك (زميل سابق، مدير...)" class="mb-3" />
              <VTextarea v-model="tmText" label="توصيتك" rows="3" auto-grow counter="240" />
            </template>
            <VAlert v-else color="success" variant="tonal" border="start" density="compact">
              شكرًا لتوصيتك! تظهر على الصفحة بعد موافقة صاحبها.
            </VAlert>
          </VCardText>
          <VCardActions v-if="!tmSent">
            <VSpacer />
            <VBtn variant="text" @click="testimonialDialog = false">إلغاء</VBtn>
            <VBtn color="amber" variant="flat" :disabled="!tmAuthor.trim() || !tmText.trim()" prepend-icon="mdi-send" @click="sendTestimonial">إرسال</VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

      <!-- تفاصيل عمل من المعرض -->
      <VDialog v-model="workDialog" max-width="520">
        <VCard v-if="activeWork" class="overflow-hidden">
          <div
            class="work-banner-lg d-flex align-end pa-4"
            :style="activeWork.image
              ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.55)), url(${activeWork.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: tagGradient(activeWork.tag) }"
          >
            <div>
              <VChip size="x-small" color="white" variant="outlined" label class="mb-1">{{ activeWork.tag }}</VChip>
              <h2 class="text-h6 font-weight-bold text-white mb-0">{{ activeWork.title }}</h2>
            </div>
          </div>
          <VCardText>
            <p class="text-body-2" style="line-height: 1.9">{{ activeWork.desc }}</p>
            <VBtn v-if="activeWork.link" size="small" variant="tonal" color="primary" prepend-icon="mdi-open-in-new" :href="activeWork.link" target="_blank" rel="noopener">
              زيارة المشروع
            </VBtn>
            <p v-else class="text-caption text-medium-emphasis mb-0">لا رابط عامًا لهذا العمل.</p>
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="workDialog = false">إغلاق</VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

      <!-- تفاصيل إثباتات مهارة -->
      <VDialog v-model="proofsDialog" max-width="440">
        <VCard v-if="proofsSkill" class="pa-2">
          <VCardTitle class="d-flex align-center ga-2">
            إثباتات «{{ proofsSkill.name }}»
            <VChip size="x-small" color="primary" variant="tonal" label>{{ levelLabel(proofsSkill.selfLevel) }}</VChip>
          </VCardTitle>
          <VCardText>
            <div v-for="p in proofsSkill.proofs" :key="p.id" class="d-flex align-center ga-2 py-2">
              <VIcon :icon="PROOF_META[p.type].icon" :color="PROOF_META[p.type].color" size="20" />
              <div class="flex-grow-1">
                <div class="text-body-2">{{ p.label }}</div>
                <div class="text-caption text-medium-emphasis">{{ PROOF_META[p.type].label }} · {{ p.date }}</div>
              </div>
              <VChip v-if="p.type !== 'self'" size="x-small" color="success" variant="tonal" label prepend-icon="mdi-check-decagram">موثّق</VChip>
            </div>
            <p v-if="!proofsSkill.proofs.length" class="text-caption text-medium-emphasis mb-0">لا إثباتات لهذه المهارة بعد.</p>
          </VCardText>
          <VCardActions>
            <VSpacer />
            <VBtn variant="text" @click="proofsDialog = false">إغلاق</VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

      <!-- طلب إثبات مهارة -->
      <VDialog v-model="proofReqDialog" max-width="440">
        <VCard class="pa-2">
          <VCardTitle>طلب إثبات مهارة</VCardTitle>
          <VCardText>
            <template v-if="!proofReqSent">
              <p class="text-caption text-medium-emphasis mb-3">هل تعرف قدرات {{ pub.displayName }}؟ اطلب منه إثبات مهارة — يصل طلبك إليه ليقرر.</p>
              <VSelect v-model="proofReqSkill" :items="pub.publicSkills.map(k => k.name)" label="المهارة" class="mb-3" />
              <VTextField v-model="proofReqName" label="اسمك" class="mb-3" />
              <VTextField v-model="proofReqRelation" label="علاقتك به (زميل سابق، مدير...)" />
            </template>
            <VAlert v-else color="success" variant="tonal" border="start" density="compact">
              وصل طلبك! سيراجعه صاحب الصفحة.
            </VAlert>
          </VCardText>
          <VCardActions v-if="!proofReqSent">
            <VSpacer />
            <VBtn variant="text" @click="proofReqDialog = false">إلغاء</VBtn>
            <VBtn color="warning" variant="flat" :disabled="!proofReqSkill || !proofReqName.trim()" prepend-icon="mdi-send" @click="sendProofRequest">إرسال الطلب</VBtn>
          </VCardActions>
        </VCard>
      </VDialog>

      <!-- جدولة مقابلة -->
      <VDialog v-model="scheduleDialog" max-width="520">
        <VCard class="pa-2">
          <VCardTitle>جدولة مقابلة مع {{ pub.displayName }}</VCardTitle>
          <VCardText>
            <template v-if="!meetSent">
              <p class="text-caption text-medium-emphasis mb-2">اختر يومًا وفترة متاحة — يصل الاقتراح لصاحب الصفحة ليؤكده عبر المنصة.</p>
              <div class="d-flex flex-wrap ga-2 mb-3">
                <VChip
                  v-for="(d, i) in scheduleDays"
                  :key="d.key"
                  :color="meetDay === i ? 'secondary' : 'surface-variant'"
                  :variant="meetDay === i ? 'flat' : 'outlined'"
                  label
                  @click="meetDay = i; meetSlot = ''"
                >
                  {{ d.label }}
                </VChip>
              </div>
              <div class="d-flex flex-wrap ga-2 mb-4">
                <VChip
                  v-for="(slot, si) in SLOTS"
                  :key="slot"
                  :color="slotBusy(meetDay, si) ? 'surface-variant' : 'secondary'"
                  :variant="meetSlot === slot ? 'flat' : slotBusy(meetDay, si) ? 'text' : 'outlined'"
                  :disabled="slotBusy(meetDay, si)"
                  label
                  @click="meetSlot = slot"
                >
                  <VIcon :icon="slotBusy(meetDay, si) ? 'mdi-lock-outline' : 'mdi-clock-outline'" start size="14" />
                  {{ slot }}{{ slotBusy(meetDay, si) ? ' — محجوزة' : '' }}
                </VChip>
              </div>
              <VTextField v-model="meetName" label="اسمك / جهتك" class="mb-3" />
              <VTextField v-model="meetTopic" label="موضوع المقابلة (اختياري)" placeholder="مقابلة تعارف، مناقشة فرصة..." />
            </template>
            <VAlert v-else color="success" variant="tonal" border="start" density="compact">
              وصل اقتراحك! سيؤكد الموعد أو يقترح بديلًا عبر المنصة.
            </VAlert>
          </VCardText>
          <VCardActions v-if="!meetSent">
            <VSpacer />
            <VBtn variant="text" @click="scheduleDialog = false">إلغاء</VBtn>
            <VBtn color="secondary" variant="flat" :disabled="!meetSlot || !meetName.trim()" prepend-icon="mdi-calendar-check-outline" @click="sendSchedule">اقتراح الموعد</VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
      </VContainer>
    </VThemeProvider>
  </div>
</template>

<style scoped>
.pp-page {
  min-height: 100%;
}

.quote-tile {
  background: rgba(var(--v-theme-primary), 0.05);
  border-inline-start: 3px solid rgb(var(--v-theme-primary));
}

.skill-row + .skill-row {
  border-top: 1px solid rgba(128, 128, 128, 0.15);
}

/* معرض الأعمال: لافتة بصرية لكل مشروع + قصّ الوصف */
.work-banner {
  height: 56px;
}
.work-banner-lg {
  height: 96px;
}
.work-card {
  transition: transform 0.2s ease;
}
.pp-motion .work-card:hover {
  transform: translateY(-3px);
}
.work-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* رقائق «غير مختار» (color=surface-variant): اللون لون سطحٍ لا نص —
   يُستبدل بنصف تركيز on-surface فيبقى مقروءًا في كل تركيبات الثيم/الوضع */
.pp-page :deep(.v-chip.text-surface-variant) {
  color: rgba(var(--v-theme-on-surface), 0.72) !important;
}

/* شريط التنقّل اللاصق */
.pp-nav {
  position: sticky;
  top: 12px;
  z-index: 5;
}

/* إطار ملون حول الصورة الشخصية */
.pp-ring {
  border: 3px solid rgb(var(--v-theme-accent));
}
.pp-themed .pp-ring {
  border-color: var(--pp-accent);
}

/* الشريط السفلي للجوال */
.pp-bottom-bar {
  position: fixed;
  bottom: 0;
  inset-inline: 0;
  z-index: 6;
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(128, 128, 128, 0.25);
}
.pp-themed .pp-bottom-bar {
  background: var(--pp-surface);
}
@media (max-width: 599px) {
  .pp-page {
    padding-bottom: 64px;
  }
}

/* نقطة الحالة المهنية */
.pp-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

/* ===== ثيم الصفحة: متغيرات CSS من المخزن تصبغ الصفحة دون المساس بثيم التطبيق ===== */
.pp-themed {
  background: var(--pp-bg);
  color: var(--pp-text);
}
.pp-themed :deep(.v-card) {
  background-color: var(--pp-surface) !important;
  color: var(--pp-text) !important;
}
/* تعتيم موحّد خفيف فوق تدرّج الهيرو يضمن تباين النص الأبيض مهما كان الثيم
   (الوردي/السماوي الفاتح كانا يهبطان بالتباين دون 3:1) */
.pp-themed :deep(.pp-hero) {
  background:
    linear-gradient(rgba(8, 10, 14, 0.35), rgba(8, 10, 14, 0.35)),
    linear-gradient(135deg, var(--pp-hero-from), var(--pp-hero-to)) !important;
}
/* التوهّج الليموني جزء من هوية المنصة — لا يتسرّب فوق تدرّجات الثيمات */
.pp-themed :deep(.pp-hero.brand-gradient::after) {
  display: none;
}
.pp-themed :deep(.text-medium-emphasis) {
  color: var(--pp-muted) !important;
}
.pp-themed :deep(.bg-accent),
.pp-themed :deep(.bg-primary) {
  background-color: var(--pp-accent) !important;
  color: var(--pp-on-accent) !important;
}
.pp-themed :deep(.text-accent),
.pp-themed :deep(.text-primary) {
  color: var(--pp-accent) !important;
}
.pp-themed .quote-tile {
  background: color-mix(in srgb, var(--pp-accent) 8%, transparent);
  border-inline-start-color: var(--pp-accent);
}

/* ===== الثيمات فاتحة الخلفية: remap لألوان Vuetify الساطعة =====
   secondary/success/accent... صُمّمت لثيم المنصة الداكن (زمردي/ليموني ساطع)
   وتباينها فوق البطاقات البيضاء يهبط دون 2:1 — تُستبدل بدرجات داكنة مكافئة */
.pp-light :deep(.text-secondary) {
  color: #0e7c50 !important;
}
.pp-light :deep(.text-success) {
  color: #15803d !important;
}
.pp-light :deep(.text-info) {
  color: #0369a1 !important;
}
.pp-light :deep(.text-warning),
.pp-light :deep(.text-amber) {
  color: #b45309 !important;
}
.pp-light :deep(.text-error) {
  color: #dc2626 !important;
}
.pp-light :deep(.bg-secondary) {
  background-color: #0e7c50 !important;
  color: #ffffff !important;
}
.pp-light :deep(.bg-success) {
  background-color: #15803d !important;
  color: #ffffff !important;
}
.pp-light :deep(.bg-info) {
  background-color: #0369a1 !important;
  color: #ffffff !important;
}
.pp-light :deep(.bg-warning) {
  background-color: #b45309 !important;
  color: #ffffff !important;
}

/* ===== تأثيرات الحركة (قابلة للإيقاف من إعدادات المظهر) ===== */
.pp-motion :deep(.v-card) {
  animation: pp-fade-up 0.45s ease both;
}
.pp-motion .pp-dot {
  animation: pp-pulse 1.6s ease-in-out infinite;
}
@keyframes pp-fade-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes pp-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

/* عرض «سيرة ذاتية» قابل للطباعة */
@media print {
  .no-print {
    display: none !important;
  }
  .pp-page {
    background: white !important;
  }
}
</style>
