<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { UserRole } from '@/interfaces/Auth'
import type { PublicSections } from '@/stores/PublicProfileStore'
import { ROLE_META } from '@/services/roles'
import { useAccountPlanStore } from '@/stores/AccountPlanStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { usePublicProfileStore } from '@/stores/PublicProfileStore'

// ===== الصفحة التعريفية العامة — بطاقة المستخدم أمام العالم (كل الأدوار) =====
const { t } = useI18n()
const route = useRoute()
const pub = usePublicProfileStore()
const profile = useProfileStore()
const plan = useAccountPlanStore()

const isFound = computed(() => String(route.params.slug) === pub.state.slug)
const s = computed(() => pub.state)
const roleLabel = (r: UserRole) => t(`roles.${r}`)

onMounted(() => {
  if (isFound.value)
    pub.recordView()
})

// —— طرق العرض المتعددة: الزائر يختار كيف يقرأ الصفحة ——
type ViewMode = 'classic' | 'compact' | 'resume'
const viewMode = ref<ViewMode>('classic')

/** الأقسام المسموحة لكل طريقة عرض — null تعني كل الأقسام */
const MODE_SECTIONS: Record<ViewMode, readonly (keyof PublicSections)[] | null> = {
  classic: null,
  compact: ['stats', 'roles', 'achievements', 'skills'],
  resume: ['stats', 'story', 'achievements', 'experience', 'portfolio', 'testimonials', 'skills'],
}
function sectionVisible(key: keyof PublicSections): boolean {
  const allowed = MODE_SECTIONS[viewMode.value]
  return (!allowed || allowed.includes(key)) && pub.canShow(key)
}

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

/** المهارات غير المميزة (تُعرض بعد نقاط القوة) */
const regularSkills = computed(() =>
  pub.publicSkills.filter(sk => !s.value.featuredSkillIds.includes(sk.id)),
)

// —— مشاركة ——
const copied = ref(false)
function share() {
  navigator.clipboard?.writeText(window.location.href)
  pub.recordShare()
  copied.value = true
  setTimeout(() => (copied.value = false), 1800)
}

// بطاقة مشاركة PNG عبر canvas (بديل OG server-side في SPA)
function downloadShareCard() {
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
function sendContact() {
  if (!visitorName.value.trim() || !visitorMsg.value.trim())
    return
  pub.contact(visitorName.value.trim(), visitorMsg.value.trim())
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
    :class="{ 'pp-themed': !!pub.themeStyles, 'pp-motion': s.appearance.motion }"
    :style="pub.themeStyles ?? undefined"
  >
    <VContainer class="py-8" style="max-width: 880px">
      <template v-if="isFound">
        <!-- الهيدر التسويقي -->
        <VCard class="overflow-hidden mb-4">
          <div class="brand-gradient pp-hero pa-6 pa-md-8" theme="darkTheme">
            <div class="d-flex align-center ga-4 flex-wrap">
              <VAvatar color="rgba(255,255,255,0.15)" size="84" :rounded="avatarRounded">
                <span class="text-h4 font-weight-bold text-white">{{ pub.displayName.trim().charAt(0) }}</span>
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
                  <span><VIcon icon="mdi-map-marker-outline" size="14" />{{ s.location }}</span>
                  <span v-if="pub.canShow('followers')"><VIcon icon="mdi-account-group-outline" size="14" /> {{ s.followersCount }} متابعًا</span>
                  <span v-if="pub.canShow('ratings') && s.ratingCount">
                    <VIcon icon="mdi-star" size="14" color="amber" /> {{ pub.avgRating }} ({{ s.ratingCount }} تقييمًا)
                  </span>
                </div>
                <div v-if="externalLinks.length" class="d-flex ga-1 mt-2">
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
                <div class="text-subtitle-1 font-weight-bold">{{ f.value }}</div>
                <div class="text-caption text-medium-emphasis">{{ f.label }}</div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- طرق العرض + التنقّل السريع بين الأقسام -->
        <VCard class="pa-2 mb-4 pp-nav no-print d-flex align-center ga-2 flex-wrap">
          <VBtnToggle v-model="viewMode" density="compact" mandatory variant="outlined" divided>
            <VBtn value="classic" size="small" prepend-icon="mdi-view-dashboard-outline">كلاسيكي</VBtn>
            <VBtn value="compact" size="small" prepend-icon="mdi-card-text-outline">مختصر</VBtn>
            <VBtn value="resume" size="small" prepend-icon="mdi-file-account-outline">سيرة ذاتية</VBtn>
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
            <template v-for="key in s.sectionOrder" :key="key">
              <!-- القصة المهنية -->
              <VCard v-if="key === 'story' && sectionVisible('story')" id="pp-story" class="pa-5 mb-4">
                <h2 class="text-subtitle-1 font-weight-bold mb-2">قصتي المهنية</h2>
                <p class="text-body-2 mb-0" style="line-height: 2">{{ s.story }}</p>
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
                <div v-for="e in profile.experiences" :key="e.id" class="mb-3">
                  <div class="text-body-2 font-weight-bold">{{ e.title }} — {{ e.company }}</div>
                  <div class="text-caption text-medium-emphasis">{{ e.period }}</div>
                  <p class="text-body-2 mb-0">{{ e.desc }}</p>
                </div>
              </VCard>

              <!-- معرض الأعمال -->
              <VCard v-else-if="key === 'portfolio' && sectionVisible('portfolio') && s.portfolio.length" id="pp-portfolio" class="pa-5 mb-4">
                <h2 class="text-subtitle-1 font-weight-bold mb-3">
                  <VIcon icon="mdi-palette-outline" color="accent" size="20" class="me-1" />معرض الأعمال
                </h2>
                <VRow dense>
                  <VCol v-for="p in s.portfolio" :key="p.id" cols="12" sm="6">
                    <VCard variant="outlined" class="pa-3 h-100">
                      <VChip size="x-small" color="accent" variant="tonal" label class="mb-2">{{ p.tag }}</VChip>
                      <div class="text-body-2 font-weight-bold mb-1">{{ p.title }}</div>
                      <p class="text-caption text-medium-emphasis mb-2">{{ p.desc }}</p>
                      <VBtn v-if="p.link" size="x-small" variant="tonal" color="primary" prepend-icon="mdi-open-in-new" :href="p.link" target="_blank" rel="noopener">
                        عرض المشروع
                      </VBtn>
                    </VCard>
                  </VCol>
                </VRow>
              </VCard>
            </template>
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
                  <div>
                    <div class="text-body-2 font-weight-bold">{{ tm.author }}</div>
                    <div class="text-caption text-medium-emphasis">{{ tm.authorRole }}</div>
                  </div>
                </div>
                <p class="text-body-2 mb-0">«{{ tm.excerpt }}»</p>
              </div>
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
                    <VTooltip v-if="sk.proofs.length" activator="parent" location="top">{{ sk.proofs.length }} إثباتات موثّقة</VTooltip>
                  </VChip>
                </div>
                <VDivider v-if="regularSkills.length" class="mb-3" />
              </template>
              <div class="d-flex flex-wrap ga-2">
                <VChip v-for="sk in regularSkills" :key="sk.id" color="primary" variant="tonal" label>
                  {{ sk.name }}
                  <VTooltip v-if="sk.proofs.length" activator="parent" location="top">{{ sk.proofs.length }} إثباتات موثّقة</VTooltip>
                  <VBadge v-if="sk.proofs.length" color="success" :content="sk.proofs.length" inline class="ms-1" />
                </VChip>
              </div>
              <p class="text-caption text-medium-emphasis mt-3 mb-0">الأرقام الخضراء = إثباتات موثّقة من المنصة (شهادات، تقييمات، تزكيات).</p>
            </VCard>
          </VCol>
        </VRow>

        <!-- تقييم الزوار -->
        <VCard v-if="viewMode === 'classic' && pub.canShow('ratings')" class="pa-5 mt-4 no-print">
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
        <VCard v-if="viewMode === 'classic' && pub.canShow('comments')" class="pa-5 mt-4 no-print">
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
    </VContainer>
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

/* شريط التنقّل اللاصق */
.pp-nav {
  position: sticky;
  top: 12px;
  z-index: 5;
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
.pp-themed :deep(.pp-hero) {
  background: linear-gradient(135deg, var(--pp-hero-from), var(--pp-hero-to)) !important;
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
