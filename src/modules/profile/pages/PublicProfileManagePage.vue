<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import { fileToDataUrl } from '@/services/imageTools'
import { ACCOUNT_TIER_META, useAccountPlanStore } from '@/stores/AccountPlanStore'
import { useProfileStore } from '@/stores/ProfileStore'
import type { AvailabilityStatus, ProfileFont, ProfileThemeKey } from '@/stores/PublicProfileStore'
import { AVAILABILITY_META, PROFILE_FONTS, PROFILE_THEMES, SECTION_TIER, usePublicProfileStore } from '@/stores/PublicProfileStore'
import { useRoleProfilesStore } from '@/stores/RoleProfilesStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseTagInput from '@/components/ui/BaseTagInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseProgressRing from '@/components/ui/BaseProgressRing.vue'
import BaseToggleChip from '@/components/ui/BaseToggleChip.vue'
import BaseColorField from '@/components/ui/BaseColorField.vue'

// ===== إدارة الصفحة التعريفية — مقسومة لثلاث مهام واضحة: هويتي / محتواي / ظهوري =====
// embedded: تُعرض داخل مركز الإعدادات بلا ترويسة مكررة
withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

const pub = usePublicProfileStore()
const profile = useProfileStore()
const roleProfiles = useRoleProfilesStore()
const plan = useAccountPlanStore()
const s = computed(() => pub.state)

const subTab = ref<'identity' | 'appearance' | 'content' | 'visibility'>('identity')
const SUB_TABS = [
  { value: 'identity', label: 'هويتي وقصتي', icon: 'mdi-account-edit-outline' },
  { value: 'appearance', label: 'المظهر والحالة', icon: 'mdi-palette-swatch-outline' },
  { value: 'content', label: 'محتواي', icon: 'mdi-rocket-launch-outline' },
  { value: 'visibility', label: 'الظهور والإشراف', icon: 'mdi-eye-settings-outline' },
] as const

// —— تلوين الرقائق (بديل VChip flat/outlined) ——
type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald', 'medium-emphasis': 'neutral', 'surface-variant': 'neutral', grey: 'neutral', amber: 'warning' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}

// —— المظهر: الثيمات والحالة المهنية ونقاط القوة وترتيب الأقسام ——
const THEME_CHOICES = computed(() => [
  { key: 'platform' as ProfileThemeKey, label: 'ثيم المنصة', hint: 'يتبع مظهر المنصة تلقائيًا', icon: 'mdi-theme-light-dark', dots: [] as string[] },
  { key: 'smart' as ProfileThemeKey, label: 'الذكي', hint: 'يتبع جهاز الزائر ووقت اليوم — دافئ مساءً وبارد نهارًا', icon: 'mdi-brightness-auto', dots: [] as string[] },
  ...Object.entries(PROFILE_THEMES).map(([key, p]) => ({
    key: key as ProfileThemeKey,
    label: p.label,
    hint: p.hint,
    icon: '',
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

/** حقول ألوان الثيم المخصص الأربعة */
const CUSTOM_COLOR_FIELDS = [
  { key: 'customColor', label: 'اللكنة (الأزرار والتمييز)' },
  { key: 'customBg', label: 'الخلفية' },
  { key: 'customSurface', label: 'البطاقات' },
  { key: 'customText', label: 'النصوص' },
] as const

const FONT_CHOICES = Object.entries(PROFILE_FONTS).map(([value, f]) => ({ value: value as ProfileFont, title: f.label }))

const EXPERIENCE_VIEWS = [
  { value: 'timeline', label: 'محور زمني', icon: 'mdi-timeline-clock-outline' },
  { value: 'list', label: 'قائمة سردية', icon: 'mdi-format-list-text' },
] as const

// حفظ الثيم الحالي كقالب
const templateName = ref('')
function saveTemplate() {
  if (pub.saveThemeTemplate(templateName.value)) {
    templateName.value = ''
    saved()
  }
}

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

// عمل جديد في المعرض (مع صورة اختيارية تُصغَّر قبل التخزين)
const portfolioDialog = ref(false)
const newWork = ref({ title: '', desc: '', link: '', tag: '', image: '' })
const workValid = computed(() => !!newWork.value.title.trim() && !!newWork.value.desc.trim() && !!newWork.value.tag.trim())
async function pickWorkImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file)
    newWork.value.image = await fileToDataUrl(file, 640)
}
function addWork() {
  if (!workValid.value)
    return
  pub.addPortfolio({
    title: newWork.value.title.trim(),
    desc: newWork.value.desc.trim(),
    link: newWork.value.link.trim() || undefined,
    tag: newWork.value.tag.trim(),
    image: newWork.value.image || undefined,
  })
  portfolioDialog.value = false
  newWork.value = { title: '', desc: '', link: '', tag: '', image: '' }
}

// —— الصورة الشخصية الحقيقية ——
const avatarInput = ref<HTMLInputElement>()
const workImageInput = ref<HTMLInputElement>()
async function pickAvatar(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    pub.setAvatarImage(await fileToDataUrl(file, 256))
    saved()
  }
}

// —— سحب وإفلات ترتيب الأقسام ——
const dragIdx = ref(-1)
function onSectionDrop(toIdx: number) {
  if (dragIdx.value >= 0)
    pub.reorderSection(dragIdx.value, toIdx)
  dragIdx.value = -1
  saved()
}

// —— روابط مخصصة ——
const newLinkLabel = ref('')
const newLinkUrl = ref('')
function addCustomLink() {
  if (pub.addCustomLink(newLinkLabel.value, newLinkUrl.value)) {
    newLinkLabel.value = ''
    newLinkUrl.value = ''
    saved()
  }
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

const syncMeta = computed(() => ({
  synced: { color: 'success', icon: 'mdi-cloud-check-outline', label: 'مُزامَنة سحابيًا' },
  saving: { color: 'info', icon: 'mdi-cloud-sync-outline', label: 'تُزامَن...' },
}[pub.syncStatus as string] ?? { color: 'warning', icon: 'mdi-cloud-alert-outline', label: 'تعذّرت المزامنة' }))

function onFont(v: ProfileFont | null) {
  if (v) {
    pub.state.appearance.font = v
    saved()
  }
}

function setSection(key: keyof typeof SECTION_LABELS, v: boolean) {
  if (pub.tierAllows(key)) {
    pub.state.sections[key] = v
    saved()
  }
}

// مؤشّر حفظ عابر صامت — بدل إغراق مركز الإشعارات بإشعار دائم لكل @blur/تبديل
const justSaved = ref(false)
let savedTimer: ReturnType<typeof setTimeout> | undefined
function saved() {
  justSaved.value = true
  if (savedTimer)
    clearTimeout(savedTimer)
  savedTimer = setTimeout(() => (justSaved.value = false), 1600)
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
    <BaseCard :padded="false" class="mb-4 p-3">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2" style="min-width: 220px">
          <BaseProgressRing :value="pub.strength.score" :size="44" :width="5" color="primary">
            <span class="text-xs font-bold text-content">{{ pub.strength.score }}</span>
          </BaseProgressRing>
          <div>
            <div class="text-sm font-bold text-content">قوة صفحتك</div>
            <div class="text-xs text-muted">{{ pub.strength.nextTip ?? 'مكتملة — شاركها الآن!' }}</div>
          </div>
        </div>
        <span class="flex-1" />
        <BaseChip v-if="justSaved" color="success">
          <BaseIcon name="mdi-check" :size="14" />تم الحفظ
        </BaseChip>
        <BaseChip
          v-if="pub.syncStatus !== 'off'"
          :color="mapColor(syncMeta.color)"
        >
          <BaseIcon :name="syncMeta.icon" :size="14" />{{ syncMeta.label }}
        </BaseChip>
        <BaseButton size="sm" variant="tonal-brand" :to="`/${pub.publicPath}`">
          <BaseIcon name="mdi-open-in-new" :size="16" />معاينة
        </BaseButton>
        <BaseButton size="sm" variant="tonal-emerald" @click="copyLink">
          <BaseIcon :name="linkCopied ? 'mdi-check' : 'mdi-link-variant'" :size="16" />{{ linkCopied ? 'نُسخ' : 'نسخ الرابط' }}
        </BaseButton>
        <button class="icon-btn" style="color: rgb(var(--v-theme-info))" aria-label="مشاركة على LinkedIn" @click="pub.shareOnLinkedIn()">
          <BaseIcon name="mdi-linkedin" :size="20" />
        </button>
      </div>
    </BaseCard>

    <!-- ثلاث مهام واضحة -->
    <div class="mb-4 flex flex-wrap gap-1" role="tablist">
      <button
        v-for="t in SUB_TABS"
        :key="t.value"
        type="button"
        role="tab"
        :aria-selected="subTab === t.value"
        class="nav-tab"
        :class="{ 'is-active': subTab === t.value }"
        @click="subTab = t.value"
      >
        <BaseIcon :name="t.icon" :size="18" />
        {{ t.label }}
        <span
          v-if="t.value === 'visibility' && s.comments.length"
          class="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
          style="background: rgb(var(--v-theme-info)); color: rgb(var(--v-theme-on-info))"
        >{{ s.comments.length }}</span>
      </button>
    </div>

    <!-- ===== هويتي وقصتي ===== -->
    <div v-if="subTab === 'identity'">
      <BaseCard class="mb-4">
        <h2 class="mb-3 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-account-edit-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-primary))' }" />الهوية</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <BaseInput v-model="s.slug" class="sm:col-span-3" label="معرّف الرابط (‎/u/‎)" dir="ltr" @blur="saved" />
          <BaseInput v-model="s.location" class="sm:col-span-2" label="الموقع (يظهر كرابط خريطة)" @blur="saved" />
          <BaseInput v-model="s.timezone" class="sm:col-span-1" label="منطقتي الزمنية" placeholder="GMT+3" @blur="saved" />
          <BaseInput v-model="s.publicHeadline" class="sm:col-span-6" label="المسمى التسويقي (يظهر تحت اسمك)" @blur="saved" />
          <BaseInput v-model="s.tagline" class="sm:col-span-6" label="عبارتك المؤثرة — جملة واحدة تلخّص رسالتك («أبني حلولًا تترك أثرًا»)" prefix-icon="mdi-format-quote-close" @blur="saved" />
          <BaseTextarea v-model="s.bioShort" class="sm:col-span-6" label="نبذتك المختصرة — جملتان تظهران أولًا، والقصة الكاملة خلف «اقرأ المزيد»" :rows="2" @blur="saved" />
          <BaseTextarea v-model="s.story" class="sm:col-span-6" label="قصتك المهنية الممتدة — اكتبها بلغة النتائج لا الصفات" :rows="4" @blur="saved" />
          <BaseTagInput v-model="s.keywords" class="sm:col-span-6" label="كلمات مفتاحية (تظهر كهاشتاغات أسفل نبذتك)" placeholder="اكتب الكلمة واضغط Enter" @update:model-value="saved" />
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-link-variant" :size="20" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />حساباتي على الشبكات</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BaseInput v-for="l in SOCIAL_LINKS" :key="l.key" v-model="s.links[l.key]" :label="l.label" :prefix-icon="l.icon" dir="ltr" @blur="saved" />
        </div>
        <hr class="my-3 border-ui">
        <p class="mb-2 text-xs text-muted">روابط مخصصة لأي منصة أخرى (مدونة، Dribbble، قناة...):</p>
        <div v-for="cl in s.customLinks" :key="cl.id" class="flex items-center gap-2 py-1">
          <BaseIcon name="mdi-link-variant" :size="16" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />
          <span class="text-sm font-bold text-content">{{ cl.label }}</span>
          <span class="flex-1 truncate text-xs text-muted" dir="ltr">{{ cl.url }}</span>
          <button class="icon-btn h-8 w-8" style="color: rgb(var(--v-theme-error))" aria-label="حذف" @click="pub.removeCustomLink(cl.id); saved()">
            <BaseIcon name="mdi-delete-outline" :size="18" />
          </button>
        </div>
        <div class="mt-2 flex items-end gap-2">
          <BaseInput v-model="newLinkLabel" label="التسمية" class="max-w-[160px]" />
          <BaseInput v-model="newLinkUrl" label="الرابط" dir="ltr" class="flex-1" @keyup.enter="addCustomLink" />
          <BaseButton variant="emerald" :disabled="!newLinkLabel.trim() || !newLinkUrl.trim()" @click="addCustomLink"><BaseIcon name="mdi-plus" :size="18" /></BaseButton>
        </div>
      </BaseCard>
    </div>

    <!-- ===== المظهر والحالة ===== -->
    <div v-else-if="subTab === 'appearance'" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <!-- الحالة المهنية -->
        <BaseCard class="mb-4">
          <h2 class="mb-1 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-account-badge-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-success))' }" />حالتي المهنية</h2>
          <p class="mb-3 text-xs text-muted">تظهر في أعلى صفحتك — أخبر الزوار بجاهزيتك فورًا.</p>
          <div class="mb-3 flex flex-wrap gap-2">
            <BaseToggleChip
              v-for="[status, meta] in AVAILABILITY_CHOICES"
              :key="status"
              :active="s.availability.status === status"
              :color="meta.color"
              @toggle="s.availability.status = status; saved()"
            >
              <BaseIcon :name="s.availability.status === status ? 'mdi-check-circle' : 'mdi-circle-outline'" :size="14" />{{ meta.label }}
            </BaseToggleChip>
          </div>
          <BaseInput v-model="s.availability.message" label="رسالة مخصصة بجانب الحالة (اختياري)" @blur="saved" />
        </BaseCard>

        <!-- شكل الصورة والحركة -->
        <BaseCard class="mb-4">
          <h2 class="mb-3 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-image-frame" :size="20" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />الصورة والحركة</h2>
          <div class="mb-4 flex items-center gap-3">
            <span
              class="inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden text-xl font-bold"
              :class="s.appearance.avatarShape === 'square' ? 'rounded-none' : s.appearance.avatarShape === 'rounded' ? 'rounded-ui-lg' : 'rounded-full'"
              style="background: rgba(var(--v-theme-secondary), 0.16); color: rgb(var(--v-theme-secondary))"
            >
              <img v-if="s.avatarImage" :src="s.avatarImage" class="h-full w-full object-cover" alt="">
              <span v-else>{{ pub.displayName.trim().charAt(0) }}</span>
            </span>
            <div class="flex flex-col items-start gap-1">
              <BaseButton size="sm" variant="tonal-emerald" @click="avatarInput?.click()">
                <BaseIcon name="mdi-camera-outline" :size="16" />{{ s.avatarImage ? 'تغيير الصورة' : 'رفع صورة حقيقية' }}
              </BaseButton>
              <BaseButton v-if="s.avatarImage" size="sm" variant="ghost" @click="pub.setAvatarImage(null); saved()">
                <BaseIcon name="mdi-delete-outline" :size="16" style="color: rgb(var(--v-theme-error))" />
                <span style="color: rgb(var(--v-theme-error))">إزالة (العودة للحرف)</span>
              </BaseButton>
            </div>
            <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="pickAvatar">
          </div>
          <p class="mb-2 text-xs text-muted">شكل صورتك الشخصية:</p>
          <div class="seg mb-3">
            <button
              v-for="sh in AVATAR_SHAPES"
              :key="sh.value"
              type="button"
              class="seg-btn flex items-center gap-1"
              :class="{ 'is-active': s.appearance.avatarShape === sh.value }"
              @click="s.appearance.avatarShape = sh.value; saved()"
            >
              <BaseIcon :name="sh.icon" :size="16" />{{ sh.label }}
            </button>
          </div>
          <BaseSwitch :model-value="s.appearance.avatarRing" label="إطار ملون حول الصورة (بلون اللكنة)" class="mb-3" @update:model-value="s.appearance.avatarRing = $event; saved()" />
          <p class="mb-2 text-xs text-muted">خطّ صفحتك:</p>
          <BaseSelect
            :model-value="s.appearance.font"
            :items="FONT_CHOICES"
            prefix-icon="mdi-format-font"
            class="mb-3"
            @update:model-value="onFont"
          />
          <p class="mb-2 text-xs text-muted">نمط عرض الخبرات:</p>
          <div class="seg mb-4">
            <button
              v-for="ev in EXPERIENCE_VIEWS"
              :key="ev.value"
              type="button"
              class="seg-btn flex items-center gap-1"
              :class="{ 'is-active': s.appearance.experienceView === ev.value }"
              @click="s.appearance.experienceView = ev.value; saved()"
            >
              <BaseIcon :name="ev.icon" :size="16" />{{ ev.label }}
            </button>
          </div>
          <BaseSwitch :model-value="s.appearance.motion" label="تأثيرات الحركة (تلاشي البطاقات ونبض الحالة)" @update:model-value="s.appearance.motion = $event; saved()" />
        </BaseCard>

        <!-- نقاط القوة -->
        <BaseCard>
          <h2 class="mb-1 flex items-center gap-1 text-base font-bold text-content">
            <BaseIcon name="mdi-star" :size="20" :style="{ color: 'rgb(var(--v-theme-accent))' }" />نقاط القوة
            <BaseChip :color="s.featuredSkillIds.length >= 5 ? 'warning' : 'accent'" class="ms-1">{{ s.featuredSkillIds.length }}/5</BaseChip>
          </h2>
          <p class="mb-2 text-xs text-muted">اختر حتى 5 مهارات رئيسية تُبرَز في أعلى قسم المهارات.</p>
          <div class="flex flex-wrap gap-2">
            <BaseToggleChip
              v-for="sk in featuredCandidates"
              :key="sk.id"
              :active="s.featuredSkillIds.includes(sk.id)"
              color="accent"
              @toggle="pub.toggleFeaturedSkill(sk.id) && saved()"
            >
              <BaseIcon :name="s.featuredSkillIds.includes(sk.id) ? 'mdi-star' : 'mdi-star-outline'" :size="14" />{{ sk.name }}
            </BaseToggleChip>
          </div>
          <p v-if="!featuredCandidates.length" class="mb-0 mt-2 text-xs text-muted">أظهر مهارات أولًا من تبويب «محتواي».</p>
        </BaseCard>
      </div>

      <div>
        <!-- الثيمات الجاهزة -->
        <BaseCard class="mb-4">
          <h2 class="mb-1 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-palette-swatch-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-primary))' }" />ثيم صفحتك</h2>
          <p class="mb-3 text-xs text-muted">هوية بصرية كاملة لا مجرد لون — اختر ما يعكس شخصيتك المهنية.</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="th in THEME_CHOICES"
              :key="th.key"
              type="button"
              class="rounded-ui border p-3 text-start transition"
              :style="{ borderColor: s.appearance.theme === th.key ? 'rgb(var(--v-theme-primary))' : 'rgba(var(--v-theme-on-surface), 0.14)' }"
              @click="pickTheme(th.key)"
            >
              <div class="mb-1 flex items-center gap-1">
                <template v-if="th.dots.length">
                  <span v-for="(d, i) in th.dots" :key="i" class="theme-dot" :style="{ background: d }" />
                </template>
                <BaseIcon v-else :name="th.icon" :size="16" :style="{ color: 'rgb(var(--v-theme-primary))' }" />
                <BaseIcon v-if="s.appearance.theme === th.key" name="mdi-check-circle" :size="16" class="ms-auto" :style="{ color: 'rgb(var(--v-theme-primary))' }" />
              </div>
              <div class="text-sm font-bold text-content">{{ th.label }}</div>
              <div class="text-xs text-muted">{{ th.hint }}</div>
            </button>
          </div>
          <hr class="my-3 border-ui">
          <!-- الثيم المخصص الموسع — ميزة الاحترافية -->
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <BaseToggleChip
              :active="s.appearance.theme === 'custom'"
              color="primary"
              :disabled="!canCustomTheme"
              @toggle="pickTheme('custom')"
            >
              <BaseIcon name="mdi-eyedropper-variant" :size="14" />ثيم مخصص بألواني
            </BaseToggleChip>
            <BaseChip v-if="!canCustomTheme" :color="mapColor(ACCOUNT_TIER_META.pro.color)">
              <BaseIcon name="mdi-lock-outline" :size="12" />{{ ACCOUNT_TIER_META.pro.label }}
            </BaseChip>
          </div>
          <template v-if="canCustomTheme && s.appearance.theme === 'custom'">
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <BaseColorField
                v-for="f in CUSTOM_COLOR_FIELDS"
                :key="f.key"
                v-model="s.appearance[f.key]"
                :label="f.label"
                @update:model-value="saved"
              />
            </div>
            <p class="mb-1 mt-2 text-xs text-muted">اختر لونًا أو الصق قيمة HEX — تُطبَّق فورًا على صفحتك.</p>
            <!-- حفظ القالب وتطبيق المحفوظ -->
            <div class="mt-2 flex items-end gap-2">
              <BaseInput v-model="templateName" label="اسم القالب" class="flex-1" />
              <BaseButton size="sm" variant="tonal-brand" @click="saveTemplate"><BaseIcon name="mdi-content-save-outline" :size="16" />حفظ كقالب</BaseButton>
            </div>
          </template>
          <div v-if="s.savedThemes.length" class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="t in s.savedThemes"
              :key="t.id"
              class="inline-flex items-center gap-1 rounded-full border border-ui px-2.5 py-1 text-xs font-medium text-content"
            >
              <span class="theme-dot" :style="{ background: t.accent }" />
              <button type="button" @click="pub.applyThemeTemplate(t.id) && saved()">{{ t.name }}</button>
              <button type="button" class="leading-none" aria-label="حذف" @click="pub.removeThemeTemplate(t.id)"><BaseIcon name="mdi-close" :size="13" /></button>
            </span>
          </div>
        </BaseCard>

        <!-- ترتيب الأقسام -->
        <BaseCard>
          <h2 class="mb-1 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-sort" :size="20" :style="{ color: 'rgb(var(--v-theme-info))' }" />ترتيب أقسام صفحتك</h2>
          <p class="mb-2 text-xs text-muted">اسحب الأقسام (أو استخدم الأسهم) لتقرر ما يقرؤه الزائر أولًا.</p>
          <div
            v-for="(key, i) in s.sectionOrder"
            :key="key"
            class="drag-row flex items-center gap-2 py-1"
            :class="{ 'drag-source': dragIdx === i }"
            draggable="true"
            @dragstart="dragIdx = i"
            @dragover.prevent
            @drop="onSectionDrop(i)"
            @dragend="dragIdx = -1"
          >
            <BaseIcon name="mdi-drag" :size="18" class="drag-handle" />
            <BaseChip color="info">{{ i + 1 }}</BaseChip>
            <span class="flex-1 text-sm text-content">{{ SECTION_LABELS[key] }}</span>
            <button class="icon-btn h-8 w-8 disabled:opacity-40" :disabled="i === 0" aria-label="لأعلى" @click="pub.moveSection(key, -1); saved()"><BaseIcon name="mdi-arrow-up" :size="18" /></button>
            <button class="icon-btn h-8 w-8 disabled:opacity-40" :disabled="i === s.sectionOrder.length - 1" aria-label="لأسفل" @click="pub.moveSection(key, 1); saved()"><BaseIcon name="mdi-arrow-down" :size="18" /></button>
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- ===== محتواي ===== -->
    <div v-else-if="subTab === 'content'" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <BaseCard class="mb-4">
          <h2 class="mb-1 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-rocket-launch-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-primary))' }" />أبرز الإنجازات</h2>
          <p class="mb-3 text-xs text-muted">بصيغة نتيجة رقمية: «خفّضت زمن التحميل 40%» أقوى من «مطوّر شغوف».</p>
          <div v-for="a in s.achievements" :key="a.id" class="flex items-center gap-2 py-1">
            <BaseIcon :name="a.kind === 'verified' ? 'mdi-check-decagram' : 'mdi-star-four-points-outline'" :size="16" :style="{ color: a.kind === 'verified' ? 'rgb(var(--v-theme-success))' : 'rgb(var(--v-theme-primary))' }" />
            <span class="flex-1 text-sm text-content">{{ a.text }}</span>
            <button class="icon-btn h-8 w-8" style="color: rgb(var(--v-theme-error))" aria-label="حذف" @click="pub.removeAchievement(a.id)"><BaseIcon name="mdi-delete-outline" :size="18" /></button>
          </div>
          <div class="mt-2 flex items-end gap-2">
            <BaseInput v-model="newAchievement" label="إنجاز جديد" class="flex-1" @keyup.enter="addAchievement" />
            <BaseButton variant="brand" :disabled="!newAchievement.trim()" @click="addAchievement"><BaseIcon name="mdi-plus" :size="18" /></BaseButton>
          </div>
        </BaseCard>

        <BaseCard>
          <h2 class="mb-1 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-star-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-primary))' }" />المهارات الظاهرة</h2>
          <p class="mb-2 text-xs text-muted">اختر ما يظهر — قد تختلف عن مهارات ملفك الخاص.</p>
          <div class="flex flex-wrap gap-2">
            <BaseToggleChip
              v-for="sk in profile.skills"
              :key="sk.id"
              :active="s.selectedSkillIds.includes(sk.id)"
              color="primary"
              @toggle="pub.toggleSkill(sk.id); saved()"
            >
              <BaseIcon :name="s.selectedSkillIds.includes(sk.id) ? 'mdi-check' : 'mdi-plus'" :size="14" />{{ sk.name }}
            </BaseToggleChip>
          </div>
        </BaseCard>
      </div>

      <div>
        <BaseCard class="mb-4">
          <div class="mb-1 flex items-center justify-between">
            <h2 class="flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-palette-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-accent))' }" />معرض الأعمال</h2>
            <BaseButton size="sm" variant="tonal-accent" @click="portfolioDialog = true"><BaseIcon name="mdi-plus" :size="16" />عمل جديد</BaseButton>
          </div>
          <div v-for="p in s.portfolio" :key="p.id" class="flex items-center gap-2 py-1">
            <BaseChip color="accent">{{ p.tag }}</BaseChip>
            <span class="flex-1 text-sm text-content">{{ p.title }}</span>
            <button class="icon-btn h-8 w-8" style="color: rgb(var(--v-theme-error))" aria-label="حذف" @click="pub.removePortfolio(p.id)"><BaseIcon name="mdi-delete-outline" :size="18" /></button>
          </div>
          <p v-if="!s.portfolio.length" class="mb-0 text-xs text-muted">أضف مشاريعك — أقوى حجة تسويقية لديك.</p>
        </BaseCard>

        <BaseCard>
          <h2 class="mb-1 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-comment-quote-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-warning))' }" />التوصيات الظاهرة</h2>
          <p class="mb-2 text-xs text-muted">أنت من يقرر أي توصية تظهر علنًا.</p>
          <div v-for="tm in s.testimonials" :key="tm.id" class="flex items-center gap-2 py-1">
            <BaseSwitch :model-value="tm.visible" @update:model-value="pub.toggleTestimonial(tm.id); saved()" />
            <div class="flex-1">
              <span class="text-sm font-bold text-content">{{ tm.author }}</span>
              <span class="text-xs text-muted"> — {{ tm.excerpt.slice(0, 60) }}…</span>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- ===== الظهور والإشراف ===== -->
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <BaseCard class="mb-4">
          <h2 class="mb-1 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-eye-settings-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-primary))' }" />ما الذي يظهر للزوار؟</h2>
          <p class="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted">
            الأقسام المقفلة تفتحها باقة أعلى —
            <BaseChip :color="mapColor(ACCOUNT_TIER_META[plan.tier].color)">باقتك: {{ ACCOUNT_TIER_META[plan.tier].label }}</BaseChip>
          </p>
          <div v-for="(label, key) in SECTION_LABELS" :key="key" class="flex items-center gap-1">
            <BaseSwitch
              :model-value="s.sections[key]"
              :label="label"
              class="flex-1"
              :class="{ 'pointer-events-none opacity-50': !pub.tierAllows(key) }"
              @update:model-value="v => setSection(key, v)"
            />
            <BaseChip v-if="!pub.tierAllows(key)" :color="mapColor(ACCOUNT_TIER_META[SECTION_TIER[key]].color)">
              <BaseIcon name="mdi-lock-outline" :size="12" />{{ ACCOUNT_TIER_META[SECTION_TIER[key]].label }}
            </BaseChip>
          </div>
          <hr class="my-3 border-ui">
          <BaseSwitch :model-value="s.contactEnabled" label="زر «تواصل معي»" @update:model-value="s.contactEnabled = $event; saved()" />
          <BaseSwitch :model-value="s.schedulingEnabled" label="زر «جدولة مقابلة»" @update:model-value="s.schedulingEnabled = $event; saved()" />
          <BaseSwitch
            :model-value="roleProfiles.linkRolesPublicly"
            label="ربط أدواري علنًا (شارات الأدوار)"
            @update:model-value="roleProfiles.linkRolesPublicly = !roleProfiles.linkRolesPublicly; saved()"
          />
        </BaseCard>
      </div>

      <div>
        <BaseCard class="mb-4">
          <h2 class="mb-3 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-chart-line" :size="20" :style="{ color: 'rgb(var(--v-theme-secondary))' }" />مؤشرات الجذب</h2>
          <div class="grid grid-cols-3 gap-3 text-center">
            <div v-for="m in [
              { label: 'مشاهدات', value: s.views, icon: 'mdi-eye-outline', color: 'primary' },
              { label: 'متابعون', value: s.followersCount, icon: 'mdi-account-group-outline', color: 'accent' },
              { label: 'التقييم', value: `${pub.avgRating} ★`, icon: 'mdi-star-outline', color: 'warning' },
              { label: 'مشاركات', value: s.shares, icon: 'mdi-share-variant-outline', color: 'secondary' },
              { label: 'رسائل', value: s.contacts, icon: 'mdi-message-arrow-left-outline', color: 'info' },
              { label: 'تعليقات', value: s.comments.length, icon: 'mdi-comment-multiple-outline', color: 'success' },
            ]" :key="m.label">
              <BaseIcon :name="m.icon" :size="20" class="mb-1" :style="{ color: `rgb(var(--v-theme-${m.color}))` }" />
              <div class="text-lg font-bold text-content">{{ m.value }}</div>
              <div class="text-xs text-muted">{{ m.label }}</div>
            </div>
          </div>
        </BaseCard>

        <BaseCard v-if="pub.tierAllows('comments')">
          <h2 class="mb-1 flex items-center gap-1 text-base font-bold text-content"><BaseIcon name="mdi-comment-check-outline" :size="20" :style="{ color: 'rgb(var(--v-theme-info))' }" />إشراف التعليقات</h2>
          <p class="mb-2 text-xs text-muted">أخفِ ما لا يمثلك (يبقى قابلًا للإظهار) أو احذفه نهائيًا.</p>
          <div v-for="c in s.comments" :key="c.id" class="flex items-center gap-2 py-1">
            <BaseSwitch :model-value="!c.hidden" @update:model-value="pub.setCommentHidden(c.id, !$event); saved()" />
            <div class="flex-1" :class="{ 'text-muted': c.hidden }">
              <span class="text-sm font-bold text-content">{{ c.author }}</span>
              <span class="text-xs"> — {{ c.text.slice(0, 60) }}{{ c.text.length > 60 ? '…' : '' }}</span>
            </div>
            <BaseChip v-if="c.hidden" color="warning">مخفي</BaseChip>
            <button class="icon-btn h-8 w-8" style="color: rgb(var(--v-theme-error))" aria-label="حذف" @click="pub.removeComment(c.id)"><BaseIcon name="mdi-delete-outline" :size="18" /></button>
          </div>
          <p v-if="!s.comments.length" class="mb-0 text-xs text-muted">لا تعليقات بعد.</p>
        </BaseCard>
      </div>
    </div>

    <!-- عمل جديد -->
    <BaseModal v-model="portfolioDialog" title="عمل جديد في المعرض" :max-width="480">
      <BaseInput v-model="newWork.title" label="عنوان المشروع" class="mb-3" />
      <BaseTextarea v-model="newWork.desc" label="وصف مختصر ودورك فيه" :rows="2" class="mb-3" />
      <div class="grid grid-cols-2 gap-3">
        <BaseInput v-model="newWork.tag" label="وسم (Vue 3، تصميم...)" />
        <BaseInput v-model="newWork.link" label="رابط (اختياري)" dir="ltr" />
      </div>
      <div class="mt-3 flex items-center gap-2">
        <BaseButton size="sm" variant="tonal-accent" @click="workImageInput?.click()">
          <BaseIcon name="mdi-image-plus-outline" :size="16" />{{ newWork.image ? 'تغيير الصورة' : 'صورة للعمل (اختياري)' }}
        </BaseButton>
        <img v-if="newWork.image" :src="newWork.image" class="h-11 w-[72px] rounded-ui object-cover" alt="">
        <button v-if="newWork.image" class="icon-btn h-8 w-8" aria-label="إزالة" @click="newWork.image = ''"><BaseIcon name="mdi-close" :size="18" /></button>
        <input ref="workImageInput" type="file" accept="image/*" class="hidden" @change="pickWorkImage">
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="portfolioDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" :disabled="!workValid" @click="addWork"><BaseIcon name="mdi-plus" :size="18" />إضافة</BaseButton>
      </template>
    </BaseModal>
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

/* سحب وإفلات ترتيب الأقسام */
.drag-row {
  cursor: grab;
  border-radius: 8px;
}
.drag-row:active {
  cursor: grabbing;
}
.drag-source {
  opacity: 0.4;
}
.drag-handle {
  opacity: 0.5;
}
</style>
