<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { DEFAULT_SETTINGS, FREE_SURVEY_LIMIT, QUESTION_TYPE_META, SURVEY_STATUS_META, generateQuestions, useSurveysStore } from '@/stores/SurveysStore'
import type { Survey, SurveyQuestion, SurveyQuestionType, SurveySettings } from '@/stores/SurveysStore'
import { bankFor } from '../services/questionBanks'

// embedded: تُعرض داخل مركز الاستبيانات الموحّد بلا ترويسة مكررة
withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })

const router = useRouter()
const store = useSurveysStore()

const surveyTypes = [
  { id: 1, name: 'تقييم وظيفي', desc: 'تقييم أداء المرشح من مديره السابق', icon: 'mdi-star-check-outline', color: 'primary' },
  { id: 2, name: 'توصية مهنية', desc: 'جمع توصيات من زملاء العمل', icon: 'mdi-account-star-outline', color: 'secondary' },
  { id: 3, name: 'رضا المرشح', desc: 'انطباع المرشح عن عملية التوظيف', icon: 'mdi-emoticon-happy-outline', color: 'success' },
  { id: 4, name: 'رضا جهة التوظيف', desc: 'تقييم جودة الترشيحات وسرعة الإنجاز', icon: 'mdi-domain', color: 'info' },
  { id: 5, name: 'تحليل شخصية', desc: 'فهم السمات الشخصية للباحث', icon: 'mdi-head-cog-outline', color: 'accent' },
  { id: 6, name: 'احتياجات السوق', desc: 'مهارات مطلوبة، رواتب، اتجاهات', icon: 'mdi-chart-line', color: 'warning' },
  { id: 7, name: 'جودة الخدمة', desc: 'تقييم تجربة المستخدم مع المنصة', icon: 'mdi-thumb-up-outline', color: 'primary' },
  { id: 8, name: 'التدريب والتطوير', desc: 'احتياجات المستخدمين من دورات', icon: 'mdi-school-outline', color: 'secondary' },
]

const QUESTION_TYPES = Object.entries(QUESTION_TYPE_META).map(([value, m]) => ({ value: value as SurveyQuestionType, title: m.label, props: { prependIcon: m.icon, subtitle: m.hint } }))
const needsOptions = (t: SurveyQuestionType) => ['single', 'multiple', 'dropdown', 'ranking'].includes(t)

// ===== Builder (3 steps: أساسي → أسئلة → إعدادات) =====
const dialog = ref(false)
const step = ref(1)
const selectedType = ref('')
const surveyTitle = ref('')
const audience = ref<Survey['audience']>('both')
const questions = ref<SurveyQuestion[]>([])
const settings = ref<SurveySettings>({ ...DEFAULT_SETTINGS })
const editingId = ref<number | null>(null) // null = إنشاء جديد
let qId = 1

const AUDIENCES = [
  { value: 'internal', title: 'داخل المنصة فقط' },
  { value: 'external', title: 'رابط خارجي فقط' },
  { value: 'both', title: 'داخل المنصة + رابط خارجي' },
]

// بوابة خطة الاشتراك: المجانية = 3 استبيانات
const upgradeDialog = ref(false)
function guardPlan(): boolean {
  if (store.canCreate)
    return true
  upgradeDialog.value = true
  return false
}
function upgradeNow() {
  store.upgradePlan()
  upgradeDialog.value = false
  snackbar.value = 'تمت الترقية للخطة الاحترافية — استبيانات بلا حدود'
}

function createSurvey(name: string) {
  if (!guardPlan())
    return
  editingId.value = null
  selectedType.value = name
  surveyTitle.value = `استبيان ${name}`
  audience.value = 'both'
  questions.value = generateQuestions(name).map(q => ({ ...q, id: qId++ }))
  settings.value = { ...DEFAULT_SETTINGS }
  step.value = 1
  dialog.value = true
}

// [+] استبيان فارغ من الصفر
function createBlank() {
  if (!guardPlan())
    return
  editingId.value = null
  selectedType.value = 'مخصص'
  surveyTitle.value = ''
  audience.value = 'both'
  questions.value = []
  settings.value = { ...DEFAULT_SETTINGS }
  step.value = 1
  dialog.value = true
}

// تعديل استبيان قائم في صفحته المستقلة (المنشئ نفسه)
function editSurvey(s: Survey) {
  editingId.value = s.id
  selectedType.value = s.type
  surveyTitle.value = s.title
  audience.value = s.audience
  questions.value = JSON.parse(JSON.stringify(s.questions))
  qId = Math.max(0, ...questions.value.map(q => q.id)) + 1
  settings.value = { ...DEFAULT_SETTINGS, ...JSON.parse(JSON.stringify(s.settings)) }
  step.value = 2
  dialog.value = true
}

// بنك الأسئلة الثابت (20 سؤالًا لكل نموذج) — يضاف كنسخة قابلة للتعديل
const bankOpen = ref(false)
const bankQuestions = computed(() => bankFor(selectedType.value))
function addFromBank(i: number) {
  const q = bankQuestions.value[i]
  questions.value.push({ ...JSON.parse(JSON.stringify(q)), id: qId++ })
}
function addAllFromBank() {
  bankQuestions.value.forEach((_, i) => addFromBank(i))
}
function inSurvey(text: string): boolean {
  return questions.value.some(q => q.text === text)
}

function addQuestion(type: SurveyQuestionType = 'single') {
  questions.value.push({
    id: qId++,
    text: '',
    type,
    options: needsOptions(type) ? ['خيار 1', 'خيار 2'] : undefined,
    rows: type === 'matrix' ? ['عنصر 1', 'عنصر 2'] : undefined,
  })
}
function onTypeChange(q: SurveyQuestion) {
  q.options = needsOptions(q.type) ? (q.options ?? ['خيار 1', 'خيار 2']) : undefined
  q.rows = q.type === 'matrix' ? (q.rows ?? ['عنصر 1', 'عنصر 2']) : undefined
}
function removeQuestion(id: number) {
  questions.value = questions.value.filter(q => q.id !== id)
}
function moveQuestion(i: number, dir: -1 | 1) {
  const t = i + dir
  if (t < 0 || t >= questions.value.length)
    return
  ;[questions.value[i], questions.value[t]] = [questions.value[t], questions.value[i]]
}
function aiGenerate() {
  questions.value = generateQuestions(selectedType.value).map(q => ({ ...q, id: qId++ }))
}

const savedSurvey = ref<Survey | null>(null)
function saveSurvey(status: 'active' | 'draft') {
  const payload = {
    title: surveyTitle.value || `استبيان ${selectedType.value}`,
    type: selectedType.value,
    audience: audience.value,
    questions: questions.value.filter(q => q.text.trim()),
    settings: { ...settings.value },
    status,
  }
  let s: Survey
  if (editingId.value !== null) {
    store.update(editingId.value, payload)
    s = store.byId(editingId.value)!
    snackbar.value = 'حُفظت تعديلات الاستبيان'
  }
  else {
    s = store.add({ ...payload, owner: 'me' })
  }
  dialog.value = false
  if (editingId.value === null && status === 'active' && s.audience !== 'internal') {
    savedSurvey.value = s
    shareDialog.value = true
  }
}

// ===== Share (external link + QR) =====
const shareDialog = ref(false)
const shareTarget = computed(() => savedSurvey.value)
const shareLink = computed(() => (shareTarget.value ? `${window.location.origin}${import.meta.env.BASE_URL}survey/${shareTarget.value.token}` : ''))
const qrUrl = computed(() => (shareLink.value ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareLink.value)}` : ''))
const copied = ref(false)
function openShare(s: Survey) {
  savedSurvey.value = s
  shareDialog.value = true
}
function copyLink() {
  navigator.clipboard?.writeText(shareLink.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1600)
}
function simulate() {
  if (shareTarget.value)
    store.simulateResponses(shareTarget.value.id, 4)
  snackbar.value = 'بدأ وصول استجابات تجريبية عبر الرابط — تابع الإشعارات والتحليل'
}

const snackbar = ref('')
const STATUS_META = SURVEY_STATUS_META
</script>

<template>
  <div>
    <PageHeader v-if="!embedded" title="الاستبيانات التفاعلية" subtitle="منشئ احترافي بعشرة أنماط أسئلة، نشر داخلي وخارجي، وتحليل ذكي للنتائج" icon="mdi-poll" />

    <h3 class="text-h6 font-weight-bold mb-3">أنشئ استبياناً جديداً</h3>
    <VRow class="mb-5">
      <!-- [+] استبيان فارغ ببنك الأنماط العشرة -->
      <VCol cols="12" sm="6" md="3">
        <VCard class="pa-4 text-center cursor-pointer h-100 d-flex flex-column justify-center blank-card" variant="outlined" @click="createBlank">
          <VAvatar color="primary" size="52" rounded="lg" class="mb-2 mx-auto"><VIcon icon="mdi-plus" size="30" /></VAvatar>
          <div class="text-subtitle-2 font-weight-bold">استبيان جديد فارغ</div>
          <div class="text-caption text-medium-emphasis">ابنِه من الصفر بأنماط الأسئلة العشرة</div>
        </VCard>
      </VCol>
      <VCol v-for="s in surveyTypes" :key="s.id" cols="12" sm="6" md="3">
        <VCard class="pa-4 text-center cursor-pointer h-100" @click="createSurvey(s.name)">
          <VAvatar :color="s.color" variant="tonal" size="52" rounded="lg" class="mb-2"><VIcon :icon="s.icon" size="28" /></VAvatar>
          <div class="text-subtitle-2 font-weight-bold">{{ s.name }}</div>
          <div class="text-caption text-medium-emphasis">{{ s.desc }}</div>
          <VChip size="x-small" variant="tonal" color="secondary" label class="mt-1">بنك 20 سؤالًا</VChip>
        </VCard>
      </VCol>
    </VRow>

    <div class="d-flex align-center ga-2 mb-3 flex-wrap">
      <h3 class="text-h6 font-weight-bold">استبياناتي ({{ store.mySurveys.length }})</h3>
      <VChip size="small" :color="store.plan === 'pro' ? 'success' : 'warning'" label variant="tonal">
        {{ store.plan === 'pro' ? 'الخطة الاحترافية — بلا حدود' : `الخطة المجانية — ${store.mySurveys.length}/${FREE_SURVEY_LIMIT}` }}
      </VChip>
      <VBtn v-if="store.plan === 'free'" size="x-small" color="secondary" variant="tonal" prepend-icon="mdi-arrow-up-bold-circle-outline" @click="upgradeDialog = true">
        ترقية
      </VBtn>
    </div>
    <VCard>
      <VTable>
        <thead>
          <tr>
            <th class="text-start">الاستبيان</th>
            <th class="text-start">الحالة</th>
            <th class="text-start">الأسئلة</th>
            <th class="text-start">المستجيبون</th>
            <th class="text-start">نسبة الإكمال</th>
            <th class="text-start">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in store.mySurveys" :key="s.id">
            <td>
              <div class="font-weight-bold">{{ s.title }}</div>
              <div class="text-caption text-medium-emphasis">{{ s.type }} · {{ s.createdAt }}</div>
            </td>
            <td><VChip :color="STATUS_META[s.status].color" size="small" label>{{ STATUS_META[s.status].label }}</VChip></td>
            <td>{{ s.questions.length || '—' }}</td>
            <td>
              {{ store.statsFor(s.id).responses }}
              <span class="text-caption text-medium-emphasis">({{ store.statsFor(s.id).external }} خارجي)</span>
            </td>
            <td style="min-width: 140px">
              <VProgressLinear :model-value="store.statsFor(s.id).completion" color="success" height="16" rounded>
                <span class="text-caption on-success">{{ store.statsFor(s.id).completion }}%</span>
              </VProgressLinear>
            </td>
            <td class="text-no-wrap">
              <VBtn variant="text" size="small" color="primary" prepend-icon="mdi-chart-box-outline" @click="router.push({ name: 'survey-analysis', params: { id: s.id } })">التحليل</VBtn>
              <VTooltip text="الإدارة الاحترافية: الجدولة والاستهداف والحوافز والمستبينون" location="top">
                <template #activator="{ props }">
                  <VBtn v-bind="props" icon="mdi-cog-transfer-outline" variant="text" size="small" color="accent" @click="router.push({ name: 'survey-admin', params: { id: s.id } })" />
                </template>
              </VTooltip>
              <VTooltip text="تعديل الأسئلة والإعدادات" location="top">
                <template #activator="{ props }">
                  <VBtn v-bind="props" icon="mdi-pencil-outline" variant="text" size="small" @click="editSurvey(s)" />
                </template>
              </VTooltip>
              <VTooltip text="مشاركة الرابط الخارجي" location="top">
                <template #activator="{ props }">
                  <VBtn v-bind="props" icon="mdi-share-variant-outline" variant="text" size="small" color="secondary" :disabled="s.audience === 'internal'" @click="openShare(s)" />
                </template>
              </VTooltip>
              <VTooltip text="معاينة" location="top">
                <template #activator="{ props }">
                  <VBtn v-bind="props" icon="mdi-eye-outline" variant="text" size="small" @click="router.push({ name: 'survey-answer', params: { token: s.token }, query: { src: 'in' } })" />
                </template>
              </VTooltip>
              <VTooltip text="نسخ" location="top">
                <template #activator="{ props }">
                  <VBtn v-bind="props" icon="mdi-content-copy" variant="text" size="small" @click="store.duplicate(s.id); snackbar = 'أُنشئت نسخة كمسودة'" />
                </template>
              </VTooltip>
              <VTooltip :text="s.status === 'active' ? 'إغلاق الاستقبال' : 'تفعيل'" location="top">
                <template #activator="{ props }">
                  <VBtn v-bind="props" :icon="s.status === 'active' ? 'mdi-lock-outline' : 'mdi-lock-open-variant-outline'" variant="text" size="small" color="warning" @click="store.setStatus(s.id, s.status === 'active' ? 'closed' : 'active')" />
                </template>
              </VTooltip>
              <VBtn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="store.remove(s.id)" />
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <!-- ===== Builder dialog (3 steps) ===== -->
    <VDialog v-model="dialog" max-width="760" scrollable persistent>
      <VCard>
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>منشئ الاستبيان: {{ selectedType }}</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="dialog = false" />
        </VCardTitle>

        <VTabs v-model="step" color="primary" density="comfortable" class="px-4">
          <VTab :value="1" prepend-icon="mdi-information-outline">أساسي</VTab>
          <VTab :value="2" prepend-icon="mdi-format-list-numbered">الأسئلة ({{ questions.length }})</VTab>
          <VTab :value="3" prepend-icon="mdi-cog-outline">إعدادات احترافية</VTab>
        </VTabs>
        <VDivider />

        <VCardText style="max-height: 62vh">
          <VWindow v-model="step">
            <!-- Step 1: basics -->
            <VWindowItem :value="1">
              <VTextField v-model="surveyTitle" label="عنوان الاستبيان" class="mb-3" />
              <VSelect v-model="audience" label="قنوات النشر" :items="AUDIENCES" class="mb-3" />
              <VAlert color="secondary" variant="tonal" density="compact" border="start">
                النشر الخارجي يولّد رابط مشاركة عامًا — كل استجابة عبره تصل مباشرة لحسابك مع إشعار.
              </VAlert>
            </VWindowItem>

            <!-- Step 2: questions (10 types) -->
            <VWindowItem :value="2">
              <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
                <span class="text-caption text-medium-emphasis">10 أنماط أسئلة متاحة — اختر النمط لكل سؤال</span>
                <VBtn color="secondary" variant="tonal" size="small" prepend-icon="mdi-robot-happy-outline" @click="aiGenerate">توليد بالذكاء الاصطناعي</VBtn>
              </div>

              <!-- بنك الأسئلة الثابت (20 سؤالًا) -->
              <VCard v-if="bankQuestions.length" variant="tonal" color="secondary" class="mb-3">
                <div class="d-flex align-center pa-3 cursor-pointer" @click="bankOpen = !bankOpen">
                  <VIcon icon="mdi-bank-outline" class="me-2" />
                  <span class="text-body-2 font-weight-bold">بنك أسئلة «{{ selectedType }}» ({{ bankQuestions.length }} سؤالًا جاهزًا)</span>
                  <VSpacer />
                  <VBtn size="x-small" variant="flat" color="secondary" class="me-2" @click.stop="addAllFromBank">إضافة الكل</VBtn>
                  <VIcon :icon="bankOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
                </div>
                <VExpandTransition>
                  <div v-show="bankOpen" class="px-3 pb-3" style="max-height: 260px; overflow-y: auto">
                    <div v-for="(bq, bi) in bankQuestions" :key="bi" class="d-flex align-center ga-2 py-1">
                      <VChip size="x-small" variant="tonal" label :prepend-icon="QUESTION_TYPE_META[bq.type].icon">{{ QUESTION_TYPE_META[bq.type].label }}</VChip>
                      <span class="text-caption flex-grow-1">{{ bq.text }}</span>
                      <VBtn :icon="inSurvey(bq.text) ? 'mdi-check' : 'mdi-plus'" size="x-small" variant="tonal" :color="inSurvey(bq.text) ? 'success' : 'primary'" :disabled="inSurvey(bq.text)" @click="addFromBank(bi)" />
                    </div>
                  </div>
                </VExpandTransition>
              </VCard>

              <VCard v-for="(q, i) in questions" :key="q.id" variant="outlined" class="pa-3 mb-2">
                <div class="d-flex align-center ga-2 mb-2">
                  <div class="d-flex flex-column">
                    <VBtn icon="mdi-chevron-up" variant="text" size="x-small" :disabled="i === 0" @click="moveQuestion(i, -1)" />
                    <VBtn icon="mdi-chevron-down" variant="text" size="x-small" :disabled="i === questions.length - 1" @click="moveQuestion(i, 1)" />
                  </div>
                  <span class="text-body-2 font-weight-bold">{{ i + 1 }}.</span>
                  <VTextField v-model="q.text" placeholder="نص السؤال" hide-details density="compact" class="flex-grow-1" />
                  <VBtn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="removeQuestion(q.id)" />
                </div>
                <div class="d-flex align-center flex-wrap ga-3">
                  <VSelect
                    v-model="q.type"
                    :items="QUESTION_TYPES"
                    density="compact"
                    hide-details
                    style="max-width: 230px"
                    @update:model-value="onTypeChange(q)"
                  />
                  <VSwitch v-model="q.required" label="إلزامي" color="primary" hide-details density="compact" />
                </div>
                <VCombobox
                  v-if="q.options"
                  v-model="q.options"
                  label="الخيارات"
                  multiple
                  chips
                  closable-chips
                  density="compact"
                  hide-details
                  class="mt-2"
                />
                <VCombobox
                  v-if="q.rows"
                  v-model="q.rows"
                  label="عناصر المصفوفة (كل عنصر يُقيَّم على حدة)"
                  multiple
                  chips
                  closable-chips
                  density="compact"
                  hide-details
                  class="mt-2"
                />
                <div v-if="q.type === 'scale'" class="d-flex ga-2 mt-2">
                  <VTextField v-model="q.scaleMin" label="تسمية الطرف الأدنى" density="compact" hide-details />
                  <VTextField v-model="q.scaleMax" label="تسمية الطرف الأعلى" density="compact" hide-details />
                </div>
              </VCard>

              <div class="d-flex flex-wrap ga-1 mt-3">
                <VBtn
                  v-for="qt in QUESTION_TYPES"
                  :key="qt.value"
                  variant="tonal"
                  size="x-small"
                  :prepend-icon="QUESTION_TYPE_META[qt.value].icon"
                  @click="addQuestion(qt.value)"
                >
                  {{ qt.title }}
                </VBtn>
              </div>
            </VWindowItem>

            <!-- Step 3: professional settings -->
            <VWindowItem :value="3">
              <VTextarea v-model="settings.welcomeMessage" label="رسالة الترحيب" rows="2" auto-grow class="mb-2" />
              <VTextarea v-model="settings.thanksMessage" label="رسالة الشكر" rows="2" auto-grow class="mb-3" />
              <VRow dense>
                <VCol cols="12" sm="6"><VSwitch v-model="settings.anonymous" label="استجابات مجهولة الهوية" color="primary" hide-details /></VCol>
                <VCol cols="12" sm="6"><VSwitch v-model="settings.showProgress" label="إظهار شريط التقدم" color="primary" hide-details /></VCol>
                <VCol cols="12" sm="6"><VSwitch v-model="settings.oneQuestionPerPage" label="سؤال واحد لكل صفحة" color="primary" hide-details /></VCol>
                <VCol cols="12" sm="6"><VSwitch v-model="settings.shuffleQuestions" label="ترتيب عشوائي للأسئلة" color="primary" hide-details /></VCol>
                <VCol cols="12" sm="6">
                  <VTextField v-model.number="settings.responseLimit" type="number" label="حد أقصى للاستجابات (اختياري)" clearable density="compact" />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField v-model="settings.closesAt" type="date" label="تاريخ الإغلاق التلقائي (اختياري)" clearable density="compact" />
                </VCol>
              </VRow>
              <VDivider class="my-3" />
              <div class="d-flex align-center ga-2 mb-1">
                <VIcon icon="mdi-gift-outline" color="accent" size="20" />
                <span class="text-body-2 font-weight-bold">نقاط تحفيزية للمشاركين</span>
              </div>
              <p class="text-caption text-medium-emphasis mb-2">تُمنح لكل مشارك داخل المنصة وتُخصم من محفظة نقاطك تلقائيًا — تزيد نسبة المشاركة بوضوح.</p>
              <VTextField v-model.number="settings.rewardPoints" type="number" min="0" label="النقاط لكل مشارك (0 = بدون مكافأة)" prepend-inner-icon="mdi-star-circle-outline" density="compact" style="max-width: 320px" />
            </VWindowItem>
          </VWindow>
        </VCardText>

        <VCardActions class="justify-end">
          <VBtn variant="text" @click="dialog = false">إلغاء</VBtn>
          <VBtn variant="tonal" prepend-icon="mdi-content-save-outline" @click="saveSurvey('draft')">حفظ كمسودة</VBtn>
          <VBtn color="accent" :disabled="!questions.some(q => q.text.trim())" prepend-icon="mdi-send" @click="saveSurvey('active')">نشر الاستبيان</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ===== Share dialog ===== -->
    <VDialog v-model="shareDialog" max-width="440">
      <VCard class="pa-2 text-center">
        <VCardTitle>مشاركة «{{ shareTarget?.title }}»</VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-3">كل من يفتح الرابط يمكنه الإجابة — حتى من خارج المنصة — وتصلك النتيجة فورًا.</p>
          <VTextField :model-value="shareLink" readonly density="compact" dir="ltr" class="mb-2">
            <template #append-inner>
              <VBtn :icon="copied ? 'mdi-check' : 'mdi-content-copy'" :color="copied ? 'success' : undefined" variant="text" size="small" @click="copyLink" />
            </template>
          </VTextField>
          <img v-if="qrUrl" :src="qrUrl" alt="QR" width="140" height="140" class="rounded-lg my-2">
          <div class="d-flex ga-2 justify-center mt-2">
            <VBtn color="secondary" variant="tonal" size="small" prepend-icon="mdi-account-multiple-plus-outline" @click="simulate">محاكاة مستجيبين</VBtn>
            <VBtn variant="tonal" size="small" prepend-icon="mdi-open-in-new" :href="shareLink" target="_blank">فتح الرابط</VBtn>
          </div>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="shareDialog = false">إغلاق</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Upgrade plan dialog (mock subscription) -->
    <VDialog v-model="upgradeDialog" max-width="420">
      <VCard class="pa-2 text-center">
        <VCardTitle>الترقية للخطة الاحترافية</VCardTitle>
        <VCardText>
          <VIcon icon="mdi-arrow-up-bold-circle-outline" size="48" color="secondary" class="mb-2" />
          <p class="text-body-2 mb-3">وصلت حدّ الخطة المجانية ({{ FREE_SURVEY_LIMIT }} استبيانات). الخطة الاحترافية تمنحك استبيانات بلا حدود مع كل أدوات التحليل.</p>
          <div class="d-flex flex-column ga-1 text-body-2 text-start mx-auto" style="max-width: 260px">
            <span><VIcon icon="mdi-check" color="success" size="16" /> استبيانات غير محدودة</span>
            <span><VIcon icon="mdi-check" color="success" size="16" /> نشر خارجي + QR</span>
            <span><VIcon icon="mdi-check" color="success" size="16" /> تحليل AI وتصدير CSV</span>
          </div>
        </VCardText>
        <VCardActions class="justify-center pb-4">
          <VBtn variant="text" @click="upgradeDialog = false">لاحقًا</VBtn>
          <VBtn color="accent" variant="flat" prepend-icon="mdi-rocket-launch-outline" @click="upgradeNow">رقِّ الآن (تجريبي)</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar :model-value="!!snackbar" color="primary" location="top" timeout="3500" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.blank-card {
  border-style: dashed;
}
</style>
