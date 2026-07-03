<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import { ACCOUNT_TIER_META, useAccountPlanStore } from '@/stores/AccountPlanStore'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { useProfileStore } from '@/stores/ProfileStore'
import type { AvailabilityStatus, ProfileThemeKey } from '@/stores/PublicProfileStore'
import { AVAILABILITY_META, PROFILE_THEMES, SECTION_TIER, usePublicProfileStore } from '@/stores/PublicProfileStore'
import { useRoleProfilesStore } from '@/stores/RoleProfilesStore'

// ===== إدارة الصفحة التعريفية — مقسومة لثلاث مهام واضحة: هويتي / محتواي / ظهوري =====
// embedded: تُعرض داخل مركز الإعدادات بلا ترويسة مكررة
withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

const pub = usePublicProfileStore()
const profile = useProfileStore()
const roleProfiles = useRoleProfilesStore()
const notifications = useNotificationsStore()
const plan = useAccountPlanStore()
const s = computed(() => pub.state)

const subTab = ref<'identity' | 'appearance' | 'content' | 'visibility'>('identity')

// —— المظهر: الثيمات والحالة المهنية ونقاط القوة وترتيب الأقسام ——
const THEME_CHOICES = computed(() => [
  { key: 'platform' as ProfileThemeKey, label: 'ثيم المنصة', hint: 'يتبع مظهر المنصة تلقائيًا', dots: [] as string[] },
  ...Object.entries(PROFILE_THEMES).map(([key, p]) => ({
    key: key as ProfileThemeKey,
    label: p.label,
    hint: p.hint,
    dots: [p.bg, p.surface, p.accent],
  })),
])

const AVAILABILITY_CHOICES = Object.entries(AVAILABILITY_META) as [AvailabilityStatus, typeof AVAILABILITY_META[AvailabilityStatus]][]

const AVATAR_SHAPES = [
  { value: 'circle', label: 'دائري', icon: 'mdi-circle-outline' },
  { value: 'rounded', label: 'زوايا دائرية', icon: 'mdi-square-rounded-outline' },
  { value: 'square', label: 'مربع', icon: 'mdi-square-outline' },
] as const

function pickTheme(key: ProfileThemeKey) {
  if (pub.setTheme(key))
    saved()
}

const canCustomTheme = computed(() => plan.atLeast('pro'))

/** المهارات المرشّحة كنقاط قوة — من المهارات المعروضة علنًا فقط */
const featuredCandidates = computed(() => profile.skills.filter(sk => s.value.selectedSkillIds.includes(sk.id)))

const linkCopied = ref(false)
function copyLink() {
  navigator.clipboard?.writeText(pub.publicUrl)
  pub.recordShare()
  linkCopied.value = true
  setTimeout(() => (linkCopied.value = false), 1800)
}

// إنجاز جديد
const newAchievement = ref('')
function addAchievement() {
  if (!newAchievement.value.trim())
    return
  pub.addAchievement(newAchievement.value.trim())
  newAchievement.value = ''
}

// عمل جديد في المعرض
const portfolioDialog = ref(false)
const newWork = ref({ title: '', desc: '', link: '', tag: '' })
const workValid = computed(() => !!newWork.value.title.trim() && !!newWork.value.desc.trim() && !!newWork.value.tag.trim())
function addWork() {
  if (!workValid.value)
    return
  pub.addPortfolio({
    title: newWork.value.title.trim(),
    desc: newWork.value.desc.trim(),
    link: newWork.value.link.trim() || undefined,
    tag: newWork.value.tag.trim(),
  })
  portfolioDialog.value = false
  newWork.value = { title: '', desc: '', link: '', tag: '' }
}

const SECTION_LABELS: Record<keyof typeof s.value.sections, string> = {
  stats: 'شريط المصداقية',
  story: 'قصتي المهنية',
  achievements: 'أبرز الإنجازات',
  testimonials: 'التوصيات',
  skills: 'المهارات',
  experience: 'الخبرات',
  portfolio: 'معرض الأعمال',
  roles: 'شارات أدواري',
  followers: 'المتابعون وزر المتابعة',
  ratings: 'تقييم الزوار',
  comments: 'تعليقات الزوار',
}

const SOCIAL_LINKS = [
  { key: 'linkedin', label: 'LinkedIn', icon: 'mdi-linkedin' },
  { key: 'github', label: 'GitHub', icon: 'mdi-github' },
  { key: 'twitter', label: 'X / Twitter', icon: 'mdi-twitter' },
  { key: 'instagram', label: 'Instagram', icon: 'mdi-instagram' },
  { key: 'youtube', label: 'YouTube', icon: 'mdi-youtube' },
  { key: 'behance', label: 'Behance', icon: 'mdi-alpha-b-circle-outline' },
  { key: 'website', label: 'موقع شخصي', icon: 'mdi-web' },
] as const

function saved() {
  notifications.push({
    icon: 'mdi-content-save-check-outline',
    color: 'success',
    title: 'حُفظت صفحتك التعريفية',
    body: 'تغييراتك ظاهرة الآن على رابطك العام.',
    category: 'system',
    actionTo: `/${pub.publicPath}`,
    actionLabel: 'معاينة الصفحة',
  })
}
</script>

<template>
  <div>
    <PageHeader
      v-if="!embedded"
      title="صفحتي التعريفية"
      subtitle="واجهتك أمام العالم — تحكّم بما يظهر وسوّق نفسك بقصة لا بأرقام"
      icon="mdi-card-account-details-star-outline"
    />

    <!-- شريط أدوات دائم: القوة + المعاينة + المشاركة (يعمل أيضًا داخل الإعدادات) -->
    <VCard class="pa-3 mb-4">
      <div class="d-flex align-center ga-3 flex-wrap">
        <div class="d-flex align-center ga-2" style="min-width: 220px">
          <VProgressCircular :model-value="pub.strength.score" color="primary" size="44" width="5">
            <span class="text-caption font-weight-bold">{{ pub.strength.score }}</span>
          </VProgressCircular>
          <div>
            <div class="text-body-2 font-weight-bold">قوة صفحتك</div>
            <div class="text-caption text-medium-emphasis">{{ pub.strength.nextTip ?? 'مكتملة — شاركها الآن!' }}</div>
          </div>
        </div>
        <VSpacer />
        <VBtn size="small" variant="tonal" color="primary" prepend-icon="mdi-open-in-new" :to="`/${pub.publicPath}`" target="_blank">معاينة</VBtn>
        <VBtn size="small" variant="tonal" color="secondary" :prepend-icon="linkCopied ? 'mdi-check' : 'mdi-link-variant'" @click="copyLink">
          {{ linkCopied ? 'نُسخ' : 'نسخ الرابط' }}
        </VBtn>
        <VBtn size="small" variant="tonal" color="info" icon="mdi-linkedin" @click="pub.shareOnLinkedIn()" />
      </div>
    </VCard>

    <!-- ثلاث مهام واضحة -->
    <VTabs v-model="subTab" color="primary" class="mb-4" grow>
      <VTab value="identity" prepend-icon="mdi-account-edit-outline">هويتي وقصتي</VTab>
      <VTab value="appearance" prepend-icon="mdi-palette-swatch-outline">المظهر والحالة</VTab>
      <VTab value="content" prepend-icon="mdi-rocket-launch-outline">محتواي</VTab>
      <VTab value="visibility" prepend-icon="mdi-eye-settings-outline">
        الظهور والإشراف
        <VBadge v-if="s.comments.length" color="info" :content="s.comments.length" inline class="ms-1" />
      </VTab>
    </VTabs>

    <VWindow v-model="subTab">
      <!-- ===== هويتي وقصتي ===== -->
      <VWindowItem value="identity">
        <VCard class="pa-5 mb-4">
          <h2 class="text-subtitle-1 font-weight-bold mb-3"><VIcon icon="mdi-account-edit-outline" size="20" color="primary" class="me-1" />الهوية</h2>
          <VRow dense>
            <VCol cols="12" sm="6"><VTextField v-model="s.slug" label="معرّف الرابط (slug)" prefix="/u/" dir="ltr" density="compact" @blur="saved" /></VCol>
            <VCol cols="12" sm="6"><VTextField v-model="s.location" label="الموقع" density="compact" @blur="saved" /></VCol>
            <VCol cols="12"><VTextField v-model="s.publicHeadline" label="المسمى التسويقي (يظهر تحت اسمك)" density="compact" @blur="saved" /></VCol>
            <VCol cols="12">
              <VTextField v-model="s.tagline" label="عبارتك المؤثرة — جملة واحدة تلخّص رسالتك («أبني حلولًا تترك أثرًا»)" density="compact" prepend-inner-icon="mdi-format-quote-close" @blur="saved" />
            </VCol>
            <VCol cols="12">
              <VTextarea v-model="s.story" label="قصتك المهنية — اكتبها بلغة النتائج لا الصفات" rows="4" auto-grow counter="600" @blur="saved" />
            </VCol>
          </VRow>
        </VCard>

        <VCard class="pa-5">
          <h2 class="text-subtitle-1 font-weight-bold mb-3"><VIcon icon="mdi-link-variant" size="20" color="secondary" class="me-1" />حساباتي على الشبكات</h2>
          <VRow dense>
            <VCol v-for="l in SOCIAL_LINKS" :key="l.key" cols="12" sm="6">
              <VTextField v-model="s.links[l.key]" :label="l.label" :prepend-inner-icon="l.icon" dir="ltr" density="compact" clearable @blur="saved" />
            </VCol>
          </VRow>
        </VCard>
      </VWindowItem>

      <!-- ===== المظهر والحالة ===== -->
      <VWindowItem value="appearance">
        <VRow>
          <VCol cols="12" md="6">
            <!-- الحالة المهنية -->
            <VCard class="pa-5 mb-4">
              <h2 class="text-subtitle-1 font-weight-bold mb-1"><VIcon icon="mdi-account-badge-outline" size="20" color="success" class="me-1" />حالتي المهنية</h2>
              <p class="text-caption text-medium-emphasis mb-3">تظهر في أعلى صفحتك — أخبر الزوار بجاهزيتك فورًا.</p>
              <div class="d-flex flex-wrap ga-2 mb-3">
                <VChip
                  v-for="[status, meta] in AVAILABILITY_CHOICES"
                  :key="status"
                  :color="meta.color"
                  :variant="s.availability.status === status ? 'flat' : 'outlined'"
                  label
                  @click="s.availability.status = status; saved()"
                >
                  <VIcon :icon="s.availability.status === status ? 'mdi-check-circle' : 'mdi-circle-outline'" start size="14" />{{ meta.label }}
                </VChip>
              </div>
              <VTextField v-model="s.availability.message" label="رسالة مخصصة بجانب الحالة (اختياري)" density="compact" clearable @blur="saved" />
            </VCard>

            <!-- شكل الصورة والحركة -->
            <VCard class="pa-5 mb-4">
              <h2 class="text-subtitle-1 font-weight-bold mb-3"><VIcon icon="mdi-image-frame" size="20" color="secondary" class="me-1" />الصورة والحركة</h2>
              <p class="text-caption text-medium-emphasis mb-2">شكل صورتك الشخصية:</p>
              <VBtnToggle :model-value="s.appearance.avatarShape" density="compact" mandatory variant="outlined" divided class="mb-4" @update:model-value="s.appearance.avatarShape = $event; saved()">
                <VBtn v-for="sh in AVATAR_SHAPES" :key="sh.value" :value="sh.value" size="small" :prepend-icon="sh.icon">{{ sh.label }}</VBtn>
              </VBtnToggle>
              <VSwitch
                v-model="s.appearance.motion"
                label="تأثيرات الحركة (تلاشي البطاقات ونبض الحالة)"
                color="secondary"
                hide-details
                density="compact"
                @update:model-value="saved"
              />
            </VCard>

            <!-- نقاط القوة -->
            <VCard class="pa-5">
              <h2 class="text-subtitle-1 font-weight-bold mb-1">
                <VIcon icon="mdi-star" size="20" color="accent" class="me-1" />نقاط القوة
                <VChip size="x-small" variant="tonal" :color="s.featuredSkillIds.length >= 5 ? 'warning' : 'accent'" label class="ms-1">{{ s.featuredSkillIds.length }}/5</VChip>
              </h2>
              <p class="text-caption text-medium-emphasis mb-2">اختر حتى 5 مهارات رئيسية تُبرَز في أعلى قسم المهارات.</p>
              <div class="d-flex flex-wrap ga-2">
                <VChip
                  v-for="sk in featuredCandidates"
                  :key="sk.id"
                  :color="s.featuredSkillIds.includes(sk.id) ? 'accent' : 'surface-variant'"
                  :variant="s.featuredSkillIds.includes(sk.id) ? 'flat' : 'outlined'"
                  label
                  @click="pub.toggleFeaturedSkill(sk.id) && saved()"
                >
                  <VIcon :icon="s.featuredSkillIds.includes(sk.id) ? 'mdi-star' : 'mdi-star-outline'" start size="14" />{{ sk.name }}
                </VChip>
              </div>
              <p v-if="!featuredCandidates.length" class="text-caption text-medium-emphasis mb-0 mt-2">أظهر مهارات أولًا من تبويب «محتواي».</p>
            </VCard>
          </VCol>

          <VCol cols="12" md="6">
            <!-- الثيمات الجاهزة -->
            <VCard class="pa-5 mb-4">
              <h2 class="text-subtitle-1 font-weight-bold mb-1"><VIcon icon="mdi-palette-swatch-outline" size="20" color="primary" class="me-1" />ثيم صفحتك</h2>
              <p class="text-caption text-medium-emphasis mb-3">هوية بصرية كاملة لا مجرد لون — اختر ما يعكس شخصيتك المهنية.</p>
              <VRow dense>
                <VCol v-for="th in THEME_CHOICES" :key="th.key" cols="6">
                  <VCard
                    variant="outlined"
                    class="pa-3 h-100 cursor-pointer"
                    :class="{ 'border-primary border-opacity-100': s.appearance.theme === th.key }"
                    @click="pickTheme(th.key)"
                  >
                    <div class="d-flex align-center ga-1 mb-1">
                      <template v-if="th.dots.length">
                        <span v-for="(d, i) in th.dots" :key="i" class="theme-dot" :style="{ background: d }" />
                      </template>
                      <VIcon v-else icon="mdi-theme-light-dark" size="16" color="primary" />
                      <VIcon v-if="s.appearance.theme === th.key" icon="mdi-check-circle" size="16" color="primary" class="ms-auto" />
                    </div>
                    <div class="text-body-2 font-weight-bold">{{ th.label }}</div>
                    <div class="text-caption text-medium-emphasis">{{ th.hint }}</div>
                  </VCard>
                </VCol>
              </VRow>
              <VDivider class="my-3" />
              <!-- الثيم المخصص — ميزة الاحترافية -->
              <div class="d-flex align-center ga-2 flex-wrap">
                <VChip
                  :color="s.appearance.theme === 'custom' ? 'primary' : 'surface-variant'"
                  :variant="s.appearance.theme === 'custom' ? 'flat' : 'outlined'"
                  label
                  :disabled="!canCustomTheme"
                  @click="pickTheme('custom')"
                >
                  <VIcon icon="mdi-eyedropper-variant" start size="14" />ثيم مخصص بلوني
                </VChip>
                <input
                  v-if="canCustomTheme"
                  v-model="s.appearance.customColor"
                  type="color"
                  class="color-input"
                  :disabled="s.appearance.theme !== 'custom'"
                  @change="saved"
                >
                <VChip v-if="!canCustomTheme" size="x-small" :color="ACCOUNT_TIER_META.pro.color" variant="tonal" label prepend-icon="mdi-lock-outline">
                  {{ ACCOUNT_TIER_META.pro.label }}
                </VChip>
              </div>
            </VCard>

            <!-- ترتيب الأقسام -->
            <VCard class="pa-5">
              <h2 class="text-subtitle-1 font-weight-bold mb-1"><VIcon icon="mdi-sort" size="20" color="info" class="me-1" />ترتيب أقسام صفحتك</h2>
              <p class="text-caption text-medium-emphasis mb-2">حرّك الأقسام لتقرر ما يقرؤه الزائر أولًا.</p>
              <div v-for="(key, i) in s.sectionOrder" :key="key" class="d-flex align-center ga-2 py-1">
                <VChip size="small" variant="tonal" color="info" label>{{ i + 1 }}</VChip>
                <span class="text-body-2 flex-grow-1">{{ SECTION_LABELS[key] }}</span>
                <VBtn icon="mdi-arrow-up" size="x-small" variant="text" :disabled="i === 0" @click="pub.moveSection(key, -1); saved()" />
                <VBtn icon="mdi-arrow-down" size="x-small" variant="text" :disabled="i === s.sectionOrder.length - 1" @click="pub.moveSection(key, 1); saved()" />
              </div>
            </VCard>
          </VCol>
        </VRow>
      </VWindowItem>

      <!-- ===== محتواي ===== -->
      <VWindowItem value="content">
        <VRow>
          <VCol cols="12" md="6">
            <VCard class="pa-5 mb-4">
              <h2 class="text-subtitle-1 font-weight-bold mb-1"><VIcon icon="mdi-rocket-launch-outline" size="20" color="primary" class="me-1" />أبرز الإنجازات</h2>
              <p class="text-caption text-medium-emphasis mb-3">بصيغة نتيجة رقمية: «خفّضت زمن التحميل 40%» أقوى من «مطوّر شغوف».</p>
              <div v-for="a in s.achievements" :key="a.id" class="d-flex align-center ga-2 py-1">
                <VIcon :icon="a.kind === 'verified' ? 'mdi-check-decagram' : 'mdi-star-four-points-outline'" :color="a.kind === 'verified' ? 'success' : 'primary'" size="16" />
                <span class="text-body-2 flex-grow-1">{{ a.text }}</span>
                <VBtn icon="mdi-delete-outline" size="x-small" variant="text" color="error" @click="pub.removeAchievement(a.id)" />
              </div>
              <div class="d-flex ga-2 mt-2">
                <VTextField v-model="newAchievement" label="إنجاز جديد" density="compact" hide-details @keyup.enter="addAchievement" />
                <VBtn color="primary" height="40" :disabled="!newAchievement.trim()" @click="addAchievement"><VIcon icon="mdi-plus" /></VBtn>
              </div>
            </VCard>

            <VCard class="pa-5">
              <h2 class="text-subtitle-1 font-weight-bold mb-1"><VIcon icon="mdi-star-outline" size="20" color="primary" class="me-1" />المهارات الظاهرة</h2>
              <p class="text-caption text-medium-emphasis mb-2">اختر ما يظهر — قد تختلف عن مهارات ملفك الخاص.</p>
              <div class="d-flex flex-wrap ga-2">
                <VChip
                  v-for="sk in profile.skills"
                  :key="sk.id"
                  :color="s.selectedSkillIds.includes(sk.id) ? 'primary' : 'surface-variant'"
                  :variant="s.selectedSkillIds.includes(sk.id) ? 'flat' : 'outlined'"
                  label
                  @click="pub.toggleSkill(sk.id); saved()"
                >
                  <VIcon :icon="s.selectedSkillIds.includes(sk.id) ? 'mdi-check' : 'mdi-plus'" start size="14" />{{ sk.name }}
                </VChip>
              </div>
            </VCard>
          </VCol>

          <VCol cols="12" md="6">
            <VCard class="pa-5 mb-4">
              <div class="d-flex align-center justify-space-between mb-1">
                <h2 class="text-subtitle-1 font-weight-bold"><VIcon icon="mdi-palette-outline" size="20" color="accent" class="me-1" />معرض الأعمال</h2>
                <VBtn size="small" variant="tonal" color="accent" prepend-icon="mdi-plus" @click="portfolioDialog = true">عمل جديد</VBtn>
              </div>
              <div v-for="p in s.portfolio" :key="p.id" class="d-flex align-center ga-2 py-1">
                <VChip size="x-small" color="accent" variant="tonal" label>{{ p.tag }}</VChip>
                <span class="text-body-2 flex-grow-1">{{ p.title }}</span>
                <VBtn icon="mdi-delete-outline" size="x-small" variant="text" color="error" @click="pub.removePortfolio(p.id)" />
              </div>
              <p v-if="!s.portfolio.length" class="text-caption text-medium-emphasis mb-0">أضف مشاريعك — أقوى حجة تسويقية لديك.</p>
            </VCard>

            <VCard class="pa-5">
              <h2 class="text-subtitle-1 font-weight-bold mb-1"><VIcon icon="mdi-comment-quote-outline" size="20" color="amber" class="me-1" />التوصيات الظاهرة</h2>
              <p class="text-caption text-medium-emphasis mb-2">أنت من يقرر أي توصية تظهر علنًا.</p>
              <div v-for="tm in s.testimonials" :key="tm.id" class="d-flex align-center ga-2 py-1">
                <VSwitch :model-value="tm.visible" color="amber" hide-details density="compact" @update:model-value="pub.toggleTestimonial(tm.id); saved()" />
                <div class="flex-grow-1">
                  <span class="text-body-2 font-weight-bold">{{ tm.author }}</span>
                  <span class="text-caption text-medium-emphasis"> — {{ tm.excerpt.slice(0, 60) }}…</span>
                </div>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </VWindowItem>

      <!-- ===== الظهور والإشراف ===== -->
      <VWindowItem value="visibility">
        <VRow>
          <VCol cols="12" md="6">
            <VCard class="pa-5 mb-4">
              <h2 class="text-subtitle-1 font-weight-bold mb-1"><VIcon icon="mdi-eye-settings-outline" size="20" color="primary" class="me-1" />ما الذي يظهر للزوار؟</h2>
              <p class="text-caption text-medium-emphasis mb-2">
                الأقسام المقفلة تفتحها باقة أعلى —
                <VChip size="x-small" :color="ACCOUNT_TIER_META[plan.tier].color" variant="tonal" label>باقتك: {{ ACCOUNT_TIER_META[plan.tier].label }}</VChip>
              </p>
              <div v-for="(label, key) in SECTION_LABELS" :key="key" class="d-flex align-center ga-1">
                <VSwitch
                  v-model="s.sections[key]"
                  :label="label"
                  color="primary"
                  hide-details
                  density="compact"
                  :disabled="!pub.tierAllows(key)"
                  class="flex-grow-1"
                  @update:model-value="saved"
                />
                <VChip v-if="!pub.tierAllows(key)" size="x-small" :color="ACCOUNT_TIER_META[SECTION_TIER[key]].color" variant="tonal" label prepend-icon="mdi-lock-outline">
                  {{ ACCOUNT_TIER_META[SECTION_TIER[key]].label }}
                </VChip>
              </div>
              <VDivider class="my-3" />
              <VSwitch v-model="s.contactEnabled" label="زر «تواصل معي»" color="accent" hide-details density="compact" @update:model-value="saved" />
              <VSwitch
                :model-value="roleProfiles.linkRolesPublicly"
                label="ربط أدواري علنًا (شارات الأدوار)"
                color="secondary"
                hide-details
                density="compact"
                @update:model-value="roleProfiles.linkRolesPublicly = !roleProfiles.linkRolesPublicly; saved()"
              />
            </VCard>
          </VCol>

          <VCol cols="12" md="6">
            <VCard class="pa-5 mb-4">
              <h2 class="text-subtitle-1 font-weight-bold mb-3"><VIcon icon="mdi-chart-line" size="20" color="secondary" class="me-1" />مؤشرات الجذب</h2>
              <VRow dense class="text-center">
                <VCol v-for="m in [
                  { label: 'مشاهدات', value: s.views, icon: 'mdi-eye-outline', color: 'primary' },
                  { label: 'متابعون', value: s.followersCount, icon: 'mdi-account-group-outline', color: 'accent' },
                  { label: 'التقييم', value: `${pub.avgRating} ★`, icon: 'mdi-star-outline', color: 'warning' },
                  { label: 'مشاركات', value: s.shares, icon: 'mdi-share-variant-outline', color: 'secondary' },
                  { label: 'رسائل', value: s.contacts, icon: 'mdi-message-arrow-left-outline', color: 'info' },
                  { label: 'تعليقات', value: s.comments.length, icon: 'mdi-comment-multiple-outline', color: 'success' },
                ]" :key="m.label" cols="4">
                  <VIcon :icon="m.icon" :color="m.color" size="20" class="mb-1" />
                  <div class="text-h6 font-weight-bold">{{ m.value }}</div>
                  <div class="text-caption text-medium-emphasis">{{ m.label }}</div>
                </VCol>
              </VRow>
            </VCard>

            <VCard v-if="pub.tierAllows('comments')" class="pa-5">
              <h2 class="text-subtitle-1 font-weight-bold mb-1"><VIcon icon="mdi-comment-check-outline" size="20" color="info" class="me-1" />إشراف التعليقات</h2>
              <p class="text-caption text-medium-emphasis mb-2">أخفِ ما لا يمثلك (يبقى قابلًا للإظهار) أو احذفه نهائيًا.</p>
              <div v-for="c in s.comments" :key="c.id" class="d-flex align-center ga-2 py-1">
                <VSwitch :model-value="!c.hidden" color="info" hide-details density="compact" @update:model-value="pub.setCommentHidden(c.id, !$event); saved()" />
                <div class="flex-grow-1" :class="{ 'text-medium-emphasis': c.hidden }">
                  <span class="text-body-2 font-weight-bold">{{ c.author }}</span>
                  <span class="text-caption"> — {{ c.text.slice(0, 60) }}{{ c.text.length > 60 ? '…' : '' }}</span>
                </div>
                <VChip v-if="c.hidden" size="x-small" color="warning" variant="tonal" label>مخفي</VChip>
                <VBtn icon="mdi-delete-outline" size="x-small" variant="text" color="error" @click="pub.removeComment(c.id)" />
              </div>
              <p v-if="!s.comments.length" class="text-caption text-medium-emphasis mb-0">لا تعليقات بعد.</p>
            </VCard>
          </VCol>
        </VRow>
      </VWindowItem>
    </VWindow>

    <!-- عمل جديد -->
    <VDialog v-model="portfolioDialog" max-width="480">
      <VCard class="pa-2">
        <VCardTitle>عمل جديد في المعرض</VCardTitle>
        <VCardText>
          <VTextField v-model="newWork.title" label="عنوان المشروع" class="mb-3" />
          <VTextarea v-model="newWork.desc" label="وصف مختصر ودورك فيه" rows="2" auto-grow class="mb-3" />
          <VRow dense>
            <VCol cols="6"><VTextField v-model="newWork.tag" label="وسم (Vue 3، تصميم...)" density="compact" /></VCol>
            <VCol cols="6"><VTextField v-model="newWork.link" label="رابط (اختياري)" dir="ltr" density="compact" /></VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="portfolioDialog = false">إلغاء</VBtn>
          <VBtn color="accent" variant="flat" :disabled="!workValid" prepend-icon="mdi-plus" @click="addWork">إضافة</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.theme-dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(128, 128, 128, 0.4);
}

.color-input {
  width: 42px;
  height: 30px;
  padding: 0;
  border: 1px solid rgba(128, 128, 128, 0.4);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}
</style>
