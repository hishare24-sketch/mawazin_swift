<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { useResumesStore } from '@/stores/ResumesStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { useAuthStore } from '@/stores/AuthStore'
import { ai } from '@/services/ai'

const router = useRouter()
const resumesStore = useResumesStore()
const profile = useProfileStore()
const auth = useAuthStore()

const step = ref(1)
const totalSteps = 7

const templates = [
  { id: 'classic', name: 'كلاسيكي', desc: 'بسيط واحترافي', color: '#2D3748', icon: 'mdi-file-document-outline' },
  { id: 'modern', name: 'حديث', desc: 'عصري بألوان جريئة', color: '#319795', icon: 'mdi-file-star-outline' },
  { id: 'creative', name: 'إبداعي', desc: 'حر وغير تقليدي', color: '#ED8936', icon: 'mdi-palette-outline' },
  { id: 'academic', name: 'أكاديمي', desc: 'للأبحاث والمنشورات', color: '#1A365D', icon: 'mdi-school-outline' },
  { id: 'executive', name: 'تنفيذي', desc: 'فاخر للقياديين', color: '#553C9A', icon: 'mdi-crown-outline' },
]
const selectedTemplate = ref('modern')

const sections = ref([
  { key: 'personal', name: 'المعلومات الشخصية', enabled: true },
  { key: 'summary', name: 'الملخص المهني', enabled: true },
  { key: 'skills', name: 'المهارات', enabled: true },
  { key: 'experience', name: 'الخبرات', enabled: true },
  { key: 'education', name: 'التعليم', enabled: true },
  { key: 'projects', name: 'المشاريع', enabled: true },
  { key: 'endorsements', name: 'التوصيات', enabled: false },
  { key: 'certificates', name: 'الشهادات', enabled: true },
  { key: 'languages', name: 'اللغات', enabled: true },
  { key: 'hobbies', name: 'الهوايات', enabled: false },
])

const language = ref('ar')
const colorScheme = ref('blue')
const fontSize = ref('medium')
const withPhoto = ref(true)
const resumeName = ref('')

const templateName = computed(() => templates.find(t => t.id === selectedTemplate.value)?.name ?? 'حديث')
const languageLabel = computed(() => (language.value === 'ar' ? 'عربي' : language.value === 'en' ? 'English' : 'ثنائي'))

function saveResume() {
  const name = resumeName.value.trim() || `سيرة ${templateName.value}`
  resumesStore.add(name, templateName.value, languageLabel.value)
  router.push({ name: 'profile' })
}

const toastMsg = ref('')
function currentName() {
  return resumeName.value.trim() || `سيرة ${templateName.value}`
}

// — Real client-side export —
const PNG_PROPS = ['color', 'background-color', 'background-image', 'font-size', 'font-weight', 'font-family', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'border', 'border-bottom', 'border-radius', 'display', 'flex-wrap', 'flex-direction', 'align-items', 'justify-content', 'gap', 'width', 'height', 'opacity', 'box-sizing', 'direction']
function inlineStyles(src: Element, dest: HTMLElement) {
  const cs = getComputedStyle(src)
  for (const p of PNG_PROPS)
    dest.style.setProperty(p, cs.getPropertyValue(p))
  const s = src.children
  const d = dest.children
  for (let i = 0; i < s.length; i++)
    inlineStyles(s[i], d[i] as HTMLElement)
}
function printResume() {
  toastMsg.value = 'يفتح مربع الطباعة — اختر «حفظ كـ PDF».'
  setTimeout(() => window.print(), 300)
}
async function exportPng() {
  const node = document.querySelector('.resume-print-target') as HTMLElement | null
  if (!node)
    return
  try {
    const w = node.offsetWidth
    const h = node.scrollHeight
    const clone = node.cloneNode(true) as HTMLElement
    inlineStyles(node, clone)
    clone.style.maxHeight = 'none'
    clone.style.margin = '0'
    const xml = new XMLSerializer().serializeToString(clone)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject x="0" y="0" width="100%" height="100%">${xml}</foreignObject></svg>`
    const img = new Image()
    await new Promise((res, rej) => {
      img.onload = res
      img.onerror = rej
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    })
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = w * scale
    canvas.height = h * scale
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) {
        toastMsg.value = 'تعذّر توليد الصورة — جرّب تصدير PDF.'
        return
      }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${currentName()}.png`
      a.click()
      URL.revokeObjectURL(a.href)
      toastMsg.value = 'تم تنزيل صورة السيرة (PNG).'
    })
  }
  catch {
    toastMsg.value = 'تعذّر توليد الصورة — جرّب تصدير PDF.'
  }
}
function exportResume(format: string) {
  if (format.includes('PDF'))
    printResume()
  else if (format === 'PNG')
    exportPng()
  else
    toastMsg.value = `تصدير ${format} سيتوفّر قريبًا — استخدم PDF أو PNG الآن.`
}

// — Sharing: public link, private (password) link, QR —
const resumeSlug = computed(() => encodeURIComponent(currentName()))
const publicLink = computed(() => `${window.location.origin}/resume/${resumeSlug.value}`)
const privateDialog = ref(false)
const privatePassword = ref('')
const qrDialog = ref(false)
const qrUrl = computed(() => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(publicLink.value)}`)

function copyPublicLink() {
  navigator.clipboard?.writeText(publicLink.value)
  toastMsg.value = 'تم نسخ الرابط العام للسيرة.'
}
function genPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  privatePassword.value = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
function openPrivateLink() {
  genPassword()
  privateDialog.value = true
}
function copyPrivate() {
  navigator.clipboard?.writeText(`${publicLink.value}?pw=${privatePassword.value}`)
  toastMsg.value = 'تم نسخ الرابط الخاص وكلمة المرور.'
}

const exportFormats = [
  { label: 'PDF احترافي', icon: 'mdi-file-pdf-box', color: 'error', fmt: 'PDF احترافي' },
  { label: 'PDF تفاعلي', icon: 'mdi-file-link-outline', color: 'error', fmt: 'PDF تفاعلي' },
  { label: 'DOCX', icon: 'mdi-file-word-box', color: 'primary', fmt: 'DOCX' },
  { label: 'صورة PNG', icon: 'mdi-file-image-outline', color: 'success', fmt: 'PNG' },
]

// — AI analysis —
const resumeSkills = ['Vue.js', 'TypeScript', 'UI/UX', 'Node.js']
const aiReview = computed(() => ai.resumeReview(summary.value, resumeSkills))
const opportunities = ['مطوّر واجهات أمامية أول', 'استشارة معمارية Frontend', 'بناء نظام تصميم موحّد']
const selectedOpportunity = ref(opportunities[0])
const vsSuggestions = computed(() => ai.resumeVsOpportunity(summary.value, selectedOpportunity.value))
function translateSummary(to: 'ar' | 'en') {
  summary.value = ai.translateText(summary.value, to)
  toastMsg.value = to === 'en' ? 'تُرجم الملخص للإنجليزية.' : 'تُرجم الملخص للعربية.'
}

const summary = ref('مطوّر واجهات أمامية بخبرة 5 سنوات في بناء تطبيقات ويب حديثة وعالية الأداء باستخدام Vue.js و TypeScript. شغوف بتجربة المستخدم والحلول القابلة للتوسّع.')
const summaryStyle = ref('professional')

const stepTitles = [
  'اختيار القالب',
  'تخصيص المحتوى',
  'اللغة والتنسيق',
  'الملخص المهني',
  'مراجعة الإنجازات',
  'المعاينة النهائية',
  'التصدير والمشاركة',
]

function next() {
  if (step.value < totalSteps)
    step.value++
}
function prev() {
  if (step.value > 1)
    step.value--
}

function regenerateSummary() {
  const variants = [
    'مطوّر واجهات أمامية مبدع يجمع بين الإتقان التقني وحس التصميم، مع سجلّ حافل في تسليم منتجات رقمية أثّرت في تجربة آلاف المستخدمين.',
    'خبير واجهات أمامية متخصص في Vue.js، قاد فرقاً تقنية وحسّن أداء التطبيقات بنسبة تجاوزت 40%.',
    'مطوّر شغوف بالتقنيات الحديثة، يركّز على الجودة وقابلية الصيانة وسرعة الإنجاز.',
  ]
  summary.value = variants[Math.floor(Math.random() * variants.length)]
}

// ————— Live preview: template + colours + fonts + sections applied instantly —————
const SCHEME_COLORS: Record<string, string> = { blue: '#2563eb', green: '#16a34a', orange: '#ea580c', dark: '#334155' }
const accentColor = computed(() => SCHEME_COLORS[colorScheme.value] ?? SCHEME_COLORS.blue)
const fontPx = computed(() => ({ small: '13px', medium: '14.5px', large: '16px' }[fontSize.value] ?? '14.5px'))
const isRtl = computed(() => language.value !== 'en')

// Header layout variant per template
const HEADER_MOD: Record<string, string> = { classic: 'line', modern: 'band', creative: 'band creative', academic: 'center line', executive: 'dark' }
const headerMod = computed(() => (HEADER_MOD[selectedTemplate.value] ?? 'band').split(' ').map(m => `rp-header--${m}`).join(' '))

const enabled = computed(() => Object.fromEntries(sections.value.map(s => [s.key, s.enabled])) as Record<string, boolean>)

// Bilingual section labels — the language toggle updates the preview live
const AR_L = { summary: 'الملخص المهني', skills: 'المهارات', experience: 'الخبرات العملية', education: 'التعليم', projects: 'المشاريع', certificates: 'الشهادات', languages: 'اللغات', hobbies: 'الاهتمامات', title: 'مطوّر واجهات أمامية' }
const EN_L = { summary: 'Professional Summary', skills: 'Skills', experience: 'Experience', education: 'Education', projects: 'Projects', certificates: 'Certificates', languages: 'Languages', hobbies: 'Interests', title: 'Frontend Developer' }
const L = computed(() => (language.value === 'en' ? EN_L : AR_L))

// Real data from the candidate's profile (falls back to samples so the preview always looks complete)
const displayName = computed(() => auth.authUser?.name ?? 'أحمد محمد')
const headline = computed(() => profile.headline || L.value.title)
const previewSkills = computed(() => (profile.skills.length ? profile.skills.map(s => s.name) : ['Vue.js', 'TypeScript', 'UI/UX', 'Node.js']))
const previewExperiences = computed(() =>
  profile.experiences.length
    ? profile.experiences
    : [{ id: 0, title: 'مطوّر واجهات أمامية أول', company: 'شركة تقنية', period: '2021 - الآن', desc: 'قيادة تطوير واجهات منتجات SaaS.' }],
)
const previewCertificates = computed(() =>
  profile.certificates.length
    ? profile.certificates
    : [{ id: 0, name: 'Vue.js المحترف', issuer: 'منصّة تدريب', date: '2024' }],
)
const previewEducation = [{ degree: 'بكالوريوس علوم حاسب', school: 'جامعة الملك سعود', year: '2019' }]
const previewProjects = [{ name: 'نظام تصميم موحّد', desc: 'مكتبة مكوّنات Vue قابلة لإعادة الاستخدام عبر 6 منتجات.' }]
const previewLanguages = ['العربية — الأم', 'English — متقدّم']
const previewHobbies = ['القراءة التقنية', 'التصوير', 'الشطرنج']
</script>

<template>
  <div>
    <PageHeader
      title="منشئ السيرة الذاتية الذكي"
      subtitle="أنشئ سيرة احترافية من بيانات ملفك — بمعاينة حيّة تتحدّث فورًا"
      icon="mdi-file-account-outline"
    />

    <VRow>
      <!-- Left: wizard -->
      <VCol cols="12" md="7">
    <!-- Stepper progress -->
    <VCard class="pa-4 mb-4">
      <div class="d-flex justify-space-between mb-2">
        <span class="text-body-2 font-weight-bold">{{ stepTitles[step - 1] }}</span>
        <span class="text-caption text-medium-emphasis">الخطوة {{ step }} من {{ totalSteps }}</span>
      </div>
      <VProgressLinear :model-value="(step / totalSteps) * 100" color="accent" height="8" rounded />
    </VCard>

    <VCard class="pa-5 mb-4" min-height="380">
      <!-- Step 1: Template -->
      <div v-if="step === 1">
        <h3 class="text-subtitle-1 font-weight-bold mb-4">اختر قالباً</h3>
        <VRow>
          <VCol v-for="tpl in templates" :key="tpl.id" cols="6" md="4" lg="2">
            <VCard
              :variant="selectedTemplate === tpl.id ? 'flat' : 'outlined'"
              :color="selectedTemplate === tpl.id ? 'primary' : undefined"
              class="pa-3 text-center cursor-pointer"
              height="100%"
              @click="selectedTemplate = tpl.id"
            >
              <VIcon :icon="tpl.icon" size="40" :color="selectedTemplate === tpl.id ? 'white' : tpl.color" />
              <div class="text-body-2 font-weight-bold mt-2" :class="selectedTemplate === tpl.id ? 'text-white' : ''">
                {{ tpl.name }}
              </div>
              <div class="text-caption" :class="selectedTemplate === tpl.id ? 'text-white' : 'text-medium-emphasis'">
                {{ tpl.desc }}
              </div>
            </VCard>
          </VCol>
        </VRow>
      </div>

      <!-- Step 2: Sections -->
      <div v-else-if="step === 2">
        <h3 class="text-subtitle-1 font-weight-bold mb-1">خصّص الأقسام</h3>
        <p class="text-caption text-medium-emphasis mb-4">فعّل الأقسام التي تريد إدراجها في سيرتك</p>
        <VRow>
          <VCol v-for="sec in sections" :key="sec.key" cols="12" sm="6">
            <VCard variant="outlined" class="pa-3 d-flex align-center justify-space-between">
              <span class="text-body-2">{{ sec.name }}</span>
              <VSwitch v-model="sec.enabled" color="secondary" hide-details density="compact" />
            </VCard>
          </VCol>
        </VRow>
      </div>

      <!-- Step 3: Language & format -->
      <div v-else-if="step === 3">
        <h3 class="text-subtitle-1 font-weight-bold mb-4">اللغة والتنسيق</h3>
        <VRow>
          <VCol cols="12" md="6">
            <VSelect
              v-model="language"
              label="اللغة"
              :items="[{ value: 'ar', title: 'العربية' }, { value: 'en', title: 'الإنجليزية' }, { value: 'bi', title: 'ثنائي اللغة' }]"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSelect
              v-model="colorScheme"
              label="نظام الألوان"
              :items="[{ value: 'blue', title: 'أزرق' }, { value: 'green', title: 'أخضر' }, { value: 'orange', title: 'برتقالي' }, { value: 'dark', title: 'غامق' }]"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VSelect
              v-model="fontSize"
              label="حجم الخط"
              :items="[{ value: 'small', title: 'صغير' }, { value: 'medium', title: 'متوسط' }, { value: 'large', title: 'كبير' }]"
            />
          </VCol>
          <VCol cols="12" md="6" class="d-flex align-center">
            <VSwitch v-model="withPhoto" label="إضافة صورة شخصية" color="secondary" hide-details />
          </VCol>
        </VRow>
      </div>

      <!-- Step 4: Summary -->
      <div v-else-if="step === 4">
        <div class="d-flex justify-space-between align-center mb-3 flex-wrap ga-2">
          <h3 class="text-subtitle-1 font-weight-bold">الملخص المهني</h3>
          <div class="d-flex ga-2">
            <VMenu>
              <template #activator="{ props }">
                <VBtn v-bind="props" color="secondary" variant="tonal" size="small" prepend-icon="mdi-translate">ترجمة</VBtn>
              </template>
              <VList density="compact">
                <VListItem title="إلى الإنجليزية" prepend-icon="mdi-alphabet-latin" @click="translateSummary('en')" />
                <VListItem title="إلى العربية" prepend-icon="mdi-abjad-arabic" @click="translateSummary('ar')" />
              </VList>
            </VMenu>
            <VBtn color="secondary" variant="tonal" size="small" prepend-icon="mdi-refresh" @click="regenerateSummary">
              إعادة توليد ذكي
            </VBtn>
          </div>
        </div>
        <VChipGroup v-model="summaryStyle" mandatory color="primary" class="mb-2">
          <VChip value="professional" filter>احترافي</VChip>
          <VChip value="creative" filter>إبداعي</VChip>
          <VChip value="brief" filter>موجز</VChip>
          <VChip value="detailed" filter>مفصّل</VChip>
        </VChipGroup>
        <VTextarea v-model="summary" rows="5" auto-grow />
      </div>

      <!-- Step 5: Achievements -->
      <div v-else-if="step === 5">
        <h3 class="text-subtitle-1 font-weight-bold mb-1">مراجعة الإنجازات</h3>
        <p class="text-caption text-medium-emphasis mb-4">أعد صياغة إنجازاتك بأسلوب احترافي بنقرة واحدة</p>
        <VCard variant="outlined" class="pa-3 mb-3">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-body-2 font-weight-bold">قيادة تطوير منصة الويب</span>
            <VBtn size="x-small" variant="tonal" color="secondary" prepend-icon="mdi-auto-fix">إعادة صياغة</VBtn>
          </div>
          <p class="text-body-2 text-medium-emphasis mb-0">
            قاد فريقاً من 4 مطوّرين لإطلاق منصة ويب جديدة، محقّقاً تحسيناً في الأداء بنسبة 40% وزيادة رضا المستخدمين.
          </p>
        </VCard>
        <VCard variant="outlined" class="pa-3">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-body-2 font-weight-bold">تحسين أداء التطبيق</span>
            <VBtn size="x-small" variant="tonal" color="secondary" prepend-icon="mdi-auto-fix">إعادة صياغة</VBtn>
          </div>
          <p class="text-body-2 text-medium-emphasis mb-0">
            صمّم وطبّق استراتيجية تحميل كسول قلّصت زمن التحميل الأولي من 4 ثوانٍ إلى 1.2 ثانية.
          </p>
        </VCard>
      </div>

      <!-- Step 6: AI review (the visual resume is live on the right) -->
      <div v-else-if="step === 6">
        <h3 class="text-subtitle-1 font-weight-bold mb-1">تحليل ورؤى الـ AI</h3>
        <p class="text-caption text-medium-emphasis mb-4">راجع سيرتك الحيّة على اليمين، وحسّنها حسب توصيات الـ AI.</p>

        <!-- AI analysis -->
        <VCard variant="tonal" color="secondary" class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
            <div class="d-flex align-center ga-2">
              <VIcon icon="mdi-robot-happy-outline" />
              <span class="text-subtitle-2 font-weight-bold">تحليل الـ AI للسيرة</span>
            </div>
            <VChip :color="aiReview.score >= 80 ? 'success' : aiReview.score >= 60 ? 'warning' : 'error'" label>قوة السيرة {{ aiReview.score }}%</VChip>
          </div>

          <div class="d-flex flex-column flex-md-row ga-4 mb-3">
            <div class="flex-grow-1">
              <div class="text-caption font-weight-bold text-success mb-1"><VIcon icon="mdi-thumb-up-outline" size="14" /> نقاط القوة</div>
              <ul class="text-caption ps-4 mb-0">
                <li v-for="(s, i) in aiReview.strengths" :key="i">{{ s }}</li>
              </ul>
            </div>
            <div class="flex-grow-1">
              <div class="text-caption font-weight-bold text-warning mb-1"><VIcon icon="mdi-alert-outline" size="14" /> فرص التحسين</div>
              <ul class="text-caption ps-4 mb-0">
                <li v-for="(w, i) in aiReview.weaknesses" :key="i">{{ w }}</li>
              </ul>
            </div>
          </div>

          <div class="text-caption font-weight-bold mb-1"><VIcon icon="mdi-tag-multiple-outline" size="14" /> كلمات مفتاحية (ATS)</div>
          <div class="d-flex flex-wrap ga-1 mb-3">
            <VChip v-for="k in aiReview.atsKeywords" :key="k" size="x-small" color="surface" variant="flat" label>{{ k }}</VChip>
          </div>

          <VDivider class="mb-3" />
          <div class="text-caption font-weight-bold mb-2"><VIcon icon="mdi-target" size="14" /> تحليل مقابل فرصة</div>
          <VSelect v-model="selectedOpportunity" :items="opportunities" density="compact" variant="outlined" hide-details class="mb-2" />
          <ul class="text-caption ps-4 mb-0">
            <li v-for="(s, i) in vsSuggestions" :key="i">{{ s }}</li>
          </ul>
        </VCard>
      </div>

      <!-- Step 7: Export -->
      <div v-else-if="step === 7" class="text-center py-6">
        <VAvatar color="success" variant="tonal" size="80" class="mb-3">
          <VIcon icon="mdi-check-circle-outline" size="48" />
        </VAvatar>
        <h3 class="text-h6 font-weight-bold mb-1">سيرتك جاهزة!</h3>
        <p class="text-body-2 text-medium-emphasis mb-4">سمِّ سيرتك ثم احفظها أو صدّرها</p>
        <VTextField
          v-model="resumeName"
          :placeholder="`سيرة ${templateName}`"
          label="اسم السيرة"
          class="mx-auto mb-4"
          style="max-width: 360px"
          prepend-inner-icon="mdi-file-account-outline"
        />
        <!-- File exports -->
        <div class="text-caption font-weight-bold text-medium-emphasis mb-2">تصدير كملف</div>
        <VRow class="mb-2" style="max-width: 560px; margin-inline: auto">
          <VCol v-for="f in exportFormats" :key="f.fmt" cols="6" sm="3">
            <VCard variant="outlined" class="pa-3 text-center cursor-pointer h-100" @click="exportResume(f.fmt)">
              <VIcon :icon="f.icon" :color="f.color" size="30" />
              <div class="text-caption font-weight-bold mt-1">{{ f.label }}</div>
            </VCard>
          </VCol>
        </VRow>

        <!-- Share -->
        <div class="text-caption font-weight-bold text-medium-emphasis mb-2 mt-4">مشاركة</div>
        <div class="d-flex flex-wrap justify-center ga-2">
          <VBtn color="secondary" variant="tonal" prepend-icon="mdi-link-variant" @click="copyPublicLink">رابط عام</VBtn>
          <VBtn color="secondary" variant="tonal" prepend-icon="mdi-lock-outline" @click="openPrivateLink">رابط خاص</VBtn>
          <VBtn color="secondary" variant="tonal" prepend-icon="mdi-qrcode" @click="qrDialog = true">رمز QR</VBtn>
        </div>
      </div>
    </VCard>

        <!-- Navigation -->
        <div class="d-flex justify-space-between">
          <VBtn variant="outlined" :disabled="step === 1" prepend-icon="mdi-arrow-right" @click="prev">
            السابق
          </VBtn>
          <VBtn v-if="step < totalSteps" color="accent" append-icon="mdi-arrow-left" @click="next">
            التالي
          </VBtn>
          <VBtn v-else color="success" prepend-icon="mdi-content-save" @click="saveResume">
            حفظ في حسابي
          </VBtn>
        </div>
      </VCol>

      <!-- Right: live preview -->
      <VCol cols="12" md="5">
        <div class="preview-panel">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="d-flex align-center ga-2">
              <VIcon icon="mdi-eye-outline" color="accent" size="18" />
              <span class="text-subtitle-2 font-weight-bold">معاينة حيّة</span>
              <VChip size="x-small" color="accent" variant="tonal" label>{{ templateName }}</VChip>
            </div>
            <span class="text-caption text-medium-emphasis">تتحدّث فورًا</span>
          </div>

          <div class="resume-preview resume-print-target" :style="{ '--rp-accent': accentColor, fontSize: fontPx }" :dir="isRtl ? 'rtl' : 'ltr'">
            <!-- Header -->
            <div class="rp-header" :class="headerMod">
              <div class="d-flex align-center ga-3" :class="{ 'justify-center': selectedTemplate === 'academic' }">
                <div v-if="withPhoto" class="rp-photo"><VIcon icon="mdi-account" /></div>
                <div>
                  <div class="rp-name">{{ displayName }}</div>
                  <div class="rp-title">{{ headline }}</div>
                  <div class="rp-contact">الرياض · {{ auth.authUser?.email || 'name@email.com' }}</div>
                </div>
              </div>
            </div>

            <div class="rp-body">
              <template v-if="enabled.summary">
                <div class="rp-section-title">{{ L.summary }}</div>
                <p class="rp-text">{{ summary }}</p>
              </template>

              <template v-if="enabled.skills">
                <div class="rp-section-title">{{ L.skills }}</div>
                <div class="rp-chips">
                  <span v-for="s in previewSkills" :key="s" class="rp-chip">{{ s }}</span>
                </div>
              </template>

              <template v-if="enabled.experience">
                <div class="rp-section-title">{{ L.experience }}</div>
                <div v-for="e in previewExperiences" :key="e.id" class="rp-item">
                  <div class="rp-item-head">{{ e.title }} — {{ e.company }}</div>
                  <div class="rp-item-sub">{{ e.period }}</div>
                  <div v-if="e.desc" class="rp-text">{{ e.desc }}</div>
                </div>
              </template>

              <template v-if="enabled.education">
                <div class="rp-section-title">{{ L.education }}</div>
                <div v-for="ed in previewEducation" :key="ed.degree" class="rp-item">
                  <div class="rp-item-head">{{ ed.degree }}</div>
                  <div class="rp-item-sub">{{ ed.school }} · {{ ed.year }}</div>
                </div>
              </template>

              <template v-if="enabled.projects">
                <div class="rp-section-title">{{ L.projects }}</div>
                <div v-for="p in previewProjects" :key="p.name" class="rp-item">
                  <div class="rp-item-head">{{ p.name }}</div>
                  <div class="rp-text">{{ p.desc }}</div>
                </div>
              </template>

              <template v-if="enabled.certificates">
                <div class="rp-section-title">{{ L.certificates }}</div>
                <div v-for="c in previewCertificates" :key="c.id" class="rp-item">
                  <div class="rp-item-head">{{ c.name }}</div>
                  <div class="rp-item-sub">{{ c.issuer }} · {{ c.date }}</div>
                </div>
              </template>

              <template v-if="enabled.languages">
                <div class="rp-section-title">{{ L.languages }}</div>
                <div class="rp-chips">
                  <span v-for="lang in previewLanguages" :key="lang" class="rp-chip">{{ lang }}</span>
                </div>
              </template>

              <template v-if="enabled.hobbies">
                <div class="rp-section-title">{{ L.hobbies }}</div>
                <div class="rp-chips">
                  <span v-for="h in previewHobbies" :key="h" class="rp-chip">{{ h }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </VCol>
    </VRow>

    <!-- QR dialog -->
    <VDialog v-model="qrDialog" max-width="320">
      <VCard class="pa-4 text-center">
        <VCardTitle class="text-subtitle-1">رمز QR للسيرة</VCardTitle>
        <VImg :src="qrUrl" width="200" height="200" class="mx-auto my-2" cover>
          <template #error>
            <div class="d-flex align-center justify-center fill-height text-caption text-medium-emphasis pa-4">
              يتطلب اتصالاً بالإنترنت لعرض الرمز.
            </div>
          </template>
        </VImg>
        <div class="text-caption text-medium-emphasis mb-3">امسح الرمز لفتح السيرة على الجوال.</div>
        <VBtn color="primary" variant="text" block @click="qrDialog = false">إغلاق</VBtn>
      </VCard>
    </VDialog>

    <!-- Private link dialog -->
    <VDialog v-model="privateDialog" max-width="440">
      <VCard class="pa-2">
        <VCardTitle class="text-subtitle-1">رابط خاص محمي بكلمة مرور</VCardTitle>
        <VCardText>
          <VTextField :model-value="publicLink" label="الرابط" readonly density="compact" class="mb-2" />
          <VTextField :model-value="privatePassword" label="كلمة المرور" readonly density="compact" append-inner-icon="mdi-refresh" @click:append-inner="genPassword" />
          <VAlert type="info" variant="tonal" density="compact" class="mt-2 text-caption">
            شارك الرابط وكلمة المرور مع الجهات المحددة فقط.
          </VAlert>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="privateDialog = false">إغلاق</VBtn>
          <VBtn color="accent" prepend-icon="mdi-content-copy" @click="copyPrivate">نسخ الرابط وكلمة المرور</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar :model-value="!!toastMsg" color="primary" location="top" timeout="3500" @update:model-value="toastMsg = ''">
      {{ toastMsg }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.preview-panel {
  position: sticky;
  top: 84px;
}
@media (max-width: 959px) {
  .preview-panel {
    position: static;
    margin-top: 8px;
  }
}

/* The resume is a white "paper" document — fixed light colours in both app themes */
.resume-preview {
  background: #ffffff;
  color: #1f2430;
  border-radius: 12px;
  overflow: hidden auto;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.16);
  line-height: 1.5;
  max-height: 78vh;
}
.rp-header {
  padding: 18px 20px;
}
.rp-header--band {
  background: var(--rp-accent);
  color: #fff;
}
.rp-header--creative {
  border-bottom-left-radius: 26px;
}
.rp-header--dark {
  background: #1f2937;
  color: #fff;
}
.rp-header--dark .rp-name {
  color: var(--rp-accent);
}
.rp-header--line {
  border-bottom: 3px solid var(--rp-accent);
}
.rp-header--center {
  text-align: center;
}
.rp-name {
  font-size: 1.4em;
  font-weight: 800;
}
.rp-title {
  font-size: 0.95em;
  opacity: 0.9;
}
.rp-header--line .rp-title,
.rp-header--center .rp-title {
  color: var(--rp-accent);
  opacity: 1;
}
.rp-contact {
  font-size: 0.72em;
  opacity: 0.8;
  margin-top: 2px;
}
.rp-photo {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #eef1f6;
  color: var(--rp-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rp-header--band .rp-photo,
.rp-header--dark .rp-photo {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}
.rp-body {
  padding: 6px 20px 20px;
}
.rp-section-title {
  color: var(--rp-accent);
  font-weight: 800;
  font-size: 0.72em;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  margin: 15px 0 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 3px;
}
.rp-text {
  font-size: 0.86em;
  color: #444b58;
  margin: 0 0 4px;
}
.rp-item {
  margin-bottom: 8px;
}
.rp-item-head {
  font-weight: 700;
  font-size: 0.9em;
}
.rp-item-sub {
  font-size: 0.76em;
  color: #6b7280;
}
.rp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.rp-chip {
  font-size: 0.74em;
  border: 1px solid var(--rp-accent);
  color: var(--rp-accent);
  border-radius: 999px;
  padding: 1px 9px;
}
</style>
