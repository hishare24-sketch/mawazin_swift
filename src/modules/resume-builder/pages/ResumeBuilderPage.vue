<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { useResumesStore } from '@/stores/ResumesStore'

const router = useRouter()
const resumesStore = useResumesStore()

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
function exportResume(format: string) {
  toastMsg.value = `جارٍ تصدير «${currentName()}» بصيغة ${format}...`
}
function shareResumeLink() {
  const url = `${window.location.origin}/resume/preview`
  navigator.clipboard?.writeText(url)
  toastMsg.value = 'تم نسخ رابط المشاركة العام للسيرة.'
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
</script>

<template>
  <div>
    <PageHeader
      title="منشئ السيرة الذاتية الذكي"
      subtitle="أنشئ سيرة احترافية من بيانات ملفك في خطوات قليلة"
      icon="mdi-file-account-outline"
    />

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
        <div class="d-flex justify-space-between align-center mb-3">
          <h3 class="text-subtitle-1 font-weight-bold">الملخص المهني</h3>
          <VBtn color="secondary" variant="tonal" size="small" prepend-icon="mdi-refresh" @click="regenerateSummary">
            إعادة توليد ذكي
          </VBtn>
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

      <!-- Step 6: Preview -->
      <div v-else-if="step === 6">
        <h3 class="text-subtitle-1 font-weight-bold mb-4">المعاينة النهائية</h3>
        <VCard variant="outlined" class="pa-6 mx-auto" max-width="600">
          <div class="d-flex align-center ga-4 mb-4">
            <VAvatar v-if="withPhoto" color="primary" size="72">
              <VIcon icon="mdi-account" size="40" color="white" />
            </VAvatar>
            <div>
              <div class="text-h6 font-weight-bold">أحمد محمد</div>
              <div class="text-body-2 text-secondary">مطوّر واجهات أمامية</div>
            </div>
          </div>
          <VDivider class="mb-3" />
          <div class="text-caption font-weight-bold text-primary mb-1">الملخص المهني</div>
          <p class="text-body-2 text-medium-emphasis">{{ summary }}</p>
          <div class="text-caption font-weight-bold text-primary mb-1 mt-3">المهارات</div>
          <div class="d-flex flex-wrap ga-1">
            <VChip v-for="s in ['Vue.js', 'TypeScript', 'UI/UX', 'Node.js']" :key="s" size="x-small" color="secondary" variant="tonal">
              {{ s }}
            </VChip>
          </div>
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
        <div class="d-flex flex-wrap justify-center ga-3">
          <VBtn color="error" prepend-icon="mdi-file-pdf-box" @click="exportResume('PDF')">تصدير PDF</VBtn>
          <VBtn color="primary" prepend-icon="mdi-file-word-box" @click="exportResume('DOCX')">تصدير DOCX</VBtn>
          <VBtn color="secondary" variant="tonal" prepend-icon="mdi-link-variant" @click="shareResumeLink">مشاركة الرابط</VBtn>
        </div>
      </div>
    </VCard>

    <VSnackbar :model-value="!!toastMsg" color="primary" location="top" timeout="3500" @update:model-value="toastMsg = ''">
      {{ toastMsg }}
    </VSnackbar>

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
  </div>
</template>
