<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { api, type CvExtractionData } from '@/services/api'
import { useProfileStore } from '@/stores/ProfileStore'
import { useAuthStore } from '@/stores/AuthStore'
import { useResumesStore } from '@/stores/ResumesStore'
import { qrSvg } from '@/services/qr'
import PageHeader from '@/components/shared/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'

const profile = useProfileStore()
const auth = useAuthStore()

const snack = reactive({ show: false, text: '' })
function toast(text: string) { snack.text = text; snack.show = true }

// ——— الطول والصياغة بالذكاء ———
type Length = 'short' | 'medium' | 'expanded'
const length = ref<Length>('medium')
const composing = ref(false)
const draft = reactive<{ headline: string, summary: string, highlights: string[], live: boolean, provider: string }>({
  headline: profile.headline,
  summary: profile.summary,
  highlights: [],
  live: false,
  provider: '',
})

function profilePayload() {
  return {
    headline: profile.headline,
    field: profile.headline,
    skills: skills.value.map(s => ({ name: s.name, level: s.level })),
    experiences: experiences.value.map(e => ({ title: e.title, org: e.org, years: 0, summary: e.desc })),
    certificates: certificates.value.map(c => ({ name: c.name, issuer: c.issuer, year: c.date })),
  }
}

let composeSeq = 0
async function compose(len: Length) {
  length.value = len
  composing.value = true
  const seq = ++composeSeq
  try {
    const res = await api.assistant.composeCv(len, profilePayload())
    if (seq !== composeSeq)
      return // طلب أحدث سبقه — تجاهل هذه الاستجابة القديمة (منع السباق)
    draft.headline = res.data.headline || profile.headline
    draft.summary = res.data.summary || profile.summary
    draft.highlights = res.data.highlights || []
    draft.live = res.live
    draft.provider = res.meta?.provider ? `${res.meta.provider}` : ''
    toast(res.live ? `صيغت بالذكاء (${res.meta.provider}) — طول: ${lengthLabel(len)}` : `صيغت (محاكاة) — طول: ${lengthLabel(len)}`)
  }
  catch (e) { if (seq === composeSeq) toast((e as { message?: string })?.message ?? 'تعذّرت الصياغة') }
  finally { if (seq === composeSeq) composing.value = false }
}
function lengthLabel(l: Length) { return l === 'short' ? 'مختصر' : l === 'expanded' ? 'موسّع' : 'متوسّط' }
onMounted(() => compose('medium'))

// ——— معماريّة الثيمات: تخطيط أساسيّ × نمط عرض (variant) × ضوابط مستقلّة ———
interface BaseLayout { key: 'single' | 'sidebar' | 'band' | 'timeline', name: string, icon: string, desc: string }
const BASE_LAYOUTS: BaseLayout[] = [
  { key: 'single', name: 'عموديّ', icon: 'mdi-view-sequential-outline', desc: 'عمود واحد كلاسيكيّ' },
  { key: 'sidebar', name: 'جانبيّ', icon: 'mdi-view-split-vertical', desc: 'عمود جانبيّ ملوّن' },
  { key: 'band', name: 'ترويسة', icon: 'mdi-view-headline', desc: 'شريط ترويسة بارز' },
  { key: 'timeline', name: 'خطّ زمنيّ', icon: 'mdi-timeline-outline', desc: 'الخبرات كخطّ زمنيّ' },
]
const baseLayout = ref<BaseLayout>(BASE_LAYOUTS[1])
// نمط العرض داخل كلّ تخطيط — يغيّر معالجة العناوين والترويسة والفواصل
interface Variant { key: 'minimal' | 'classic' | 'bold' | 'outline', name: string }
const VARIANTS: Variant[] = [
  { key: 'minimal', name: 'مينيمال' },
  { key: 'classic', name: 'كلاسيكيّ' },
  { key: 'bold', name: 'جريء' },
  { key: 'outline', name: 'مؤطّر' },
]
const variant = ref<Variant>(VARIANTS[1])

// ——— ضوابط مستقلّة: لون · خطّ · كثافة · تنسيق ———
const ACCENTS = ['#0f6e56', '#185fa5', '#534ab7', '#993c1d', '#0d9488', '#b45309', '#be185d', '#111827']
const accent = ref(ACCENTS[0])
const DENSITIES = [{ key: 'compact', name: 'مضغوط', scale: 0.88 }, { key: 'cozy', name: 'متوسّط', scale: 1 }, { key: 'spacious', name: 'مريح', scale: 1.12 }]
const density = ref(DENSITIES[1])
const FONTS = [{ key: 'tajawal', name: 'Tajawal', css: `'Tajawal', sans-serif` }, { key: 'cairo', name: 'Cairo', css: `'Cairo', 'Tajawal', sans-serif` }, { key: 'amiri', name: 'Amiri', css: `'Amiri', 'Tajawal', serif` }]
const font = ref(FONTS[0])
const headerAlign = ref<'start' | 'center'>('start')
// التنسيق: شكل شرائح المهارات
const CHIP_STYLES = [{ key: 'pill', name: 'حبّة' }, { key: 'plain', name: 'بسيط' }, { key: 'bar', name: 'شريط' }]
const chipStyle = ref(CHIP_STYLES[0])
const pageStyle = computed(() => ({
  '--accent': accent.value,
  '--scale': String(density.value.scale),
  'fontFamily': font.value.css,
}))

// ——— الأقسام: ترتيب + إظهار (سحب) ———
interface Section { key: string, label: string, visible: boolean }
const sections = ref<Section[]>([
  { key: 'summary', label: 'النبذة', visible: true },
  { key: 'highlights', label: 'أبرز النقاط', visible: true },
  { key: 'skills', label: 'المهارات', visible: true },
  { key: 'experiences', label: 'الخبرات', visible: true },
  { key: 'education', label: 'التعليم', visible: true },
  { key: 'languages', label: 'اللغات', visible: true },
  { key: 'certificates', label: 'الشهادات', visible: true },
  { key: 'links', label: 'الروابط', visible: true },
])

// ——— أقسام إضافيّة قابلة للتحرير (من القديم: تعليم/لغات) ———
interface Education { id: number, degree: string, org: string, year: string }
interface Language { id: number, name: string, level: string }
const education = ref<Education[]>([{ id: 1, degree: 'بكالوريوس علوم حاسب', org: 'جامعة الملك سعود', year: '2020' }])
const languages = ref<Language[]>([{ id: 1, name: 'العربية', level: 'اللغة الأم' }, { id: 2, name: 'الإنجليزية', level: 'متقدّم' }])
const newEdu = reactive({ degree: '', org: '', year: '' })
const newLang = reactive({ name: '', level: 'متقدّم' })
function addEdu() { if (!newEdu.degree.trim()) return; education.value.push({ id: Date.now(), degree: newEdu.degree.trim(), org: newEdu.org.trim(), year: newEdu.year.trim() }); newEdu.degree = ''; newEdu.org = ''; newEdu.year = '' }
function addLang() { if (!newLang.name.trim()) return; languages.value.push({ id: Date.now(), name: newLang.name.trim(), level: newLang.level }); newLang.name = '' }
function removeEdu(id: number) { education.value = education.value.filter(e => e.id !== id) }
function removeLang(id: number) { languages.value = languages.value.filter(l => l.id !== id) }

// ——— محتوى قابل للتحرير داخل الاستوديو (مبذور من الملف، مع إضافة لكلّ قسم) ———
interface SkillItem { id: number, name: string, level: number }
interface ExpItem { id: number, title: string, org: string, period: string, desc: string, link?: string }
interface CertItem { id: number, name: string, issuer: string, date: string, link?: string }
const skills = ref<SkillItem[]>(profile.skills.map(s => ({ id: s.id, name: s.name, level: s.selfLevel })))
const experiences = ref<ExpItem[]>(profile.experiences.map(e => ({ id: e.id, title: e.title, org: e.company, period: e.period, desc: e.desc })))
const certificates = ref<CertItem[]>(profile.certificates.map(c => ({ id: c.id, name: c.name, issuer: c.issuer, date: c.date })))
const newSkill = reactive({ name: '', level: 3 })
const newExp = reactive({ title: '', org: '', period: '', desc: '', link: '' })
const newCert = reactive({ name: '', issuer: '', date: '', link: '' })
function addSkill() { if (!newSkill.name.trim()) return; skills.value.push({ id: Date.now(), name: newSkill.name.trim(), level: Number(newSkill.level) || 3 }); newSkill.name = '' }
function addExp() { if (!newExp.title.trim()) return; experiences.value.push({ id: Date.now(), title: newExp.title.trim(), org: newExp.org.trim(), period: newExp.period.trim(), desc: newExp.desc.trim(), link: newExp.link.trim() || undefined }); newExp.title = ''; newExp.org = ''; newExp.period = ''; newExp.desc = ''; newExp.link = '' }
function addCert() { if (!newCert.name.trim()) return; certificates.value.push({ id: Date.now(), name: newCert.name.trim(), issuer: newCert.issuer.trim(), date: newCert.date.trim(), link: newCert.link.trim() || undefined }); newCert.name = ''; newCert.issuer = ''; newCert.date = ''; newCert.link = '' }
function removeSkill(id: number) { skills.value = skills.value.filter(s => s.id !== id) }
function removeExp(id: number) { experiences.value = experiences.value.filter(e => e.id !== id) }
function removeCert(id: number) { certificates.value = certificates.value.filter(c => c.id !== id) }

// ——— الصورة الشخصيّة + QR للمرفقات ———
const photo = ref<string>('') // base64 data-URL
const showPhoto = ref(true)
const photoInput = ref<HTMLInputElement | null>(null)
function pickPhoto() { photoInput.value?.click() }
function onPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 3 * 1024 * 1024) { toast('حجم الصورة يتجاوز 3 ميجابايت'); return }
  const reader = new FileReader()
  reader.onload = () => { photo.value = String(reader.result) }
  reader.readAsDataURL(file)
  if (photoInput.value) photoInput.value.value = ''
}
function qr(url?: string) { return url ? qrSvg(url, 64) : '' }
const dragIndex = ref<number | null>(null)
function onDragStart(i: number) { dragIndex.value = i }
function onDrop(i: number) {
  if (dragIndex.value === null || dragIndex.value === i) return
  const arr = sections.value
  const [moved] = arr.splice(dragIndex.value, 1)
  arr.splice(i, 0, moved)
  dragIndex.value = null
}
function move(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= sections.value.length) return
  const arr = sections.value
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}
const visibleOrdered = computed(() => sections.value.filter(s => s.visible))
function has(key: string) { return visibleOrdered.value.some(s => s.key === key) }
function orderIndex(key: string) { return visibleOrdered.value.findIndex(s => s.key === key) }

// ——— الروابط التفاعليّة ———
interface Link { id: number, label: string, url: string, icon: string }
const links = ref<Link[]>([
  { id: 1, label: 'LinkedIn', url: 'https://linkedin.com/in/', icon: 'mdi-linkedin' },
  { id: 2, label: 'GitHub', url: 'https://github.com/', icon: 'mdi-github' },
])
const newLink = reactive({ label: '', url: '' })
function addLink() {
  if (!newLink.label.trim() || !newLink.url.trim()) return
  links.value.push({ id: Date.now(), label: newLink.label.trim(), url: newLink.url.trim(), icon: guessIcon(newLink.url) })
  newLink.label = ''; newLink.url = ''
}
function guessIcon(url: string) {
  if (/linkedin/i.test(url)) return 'mdi-linkedin'
  if (/github/i.test(url)) return 'mdi-github'
  if (/behance|dribbble|portfolio/i.test(url)) return 'mdi-palette-outline'
  if (/twitter|x\.com/i.test(url)) return 'mdi-twitter'
  return 'mdi-link-variant'
}
function removeLink(id: number) { links.value = links.value.filter(l => l.id !== id) }

// ——— بيانات الترويسة ———
const person = computed(() => ({
  name: auth.authUser?.name ?? 'اسمك',
  email: auth.authUser?.email ?? '',
  phone: (auth.authUser as { phone?: string })?.phone ?? '',
}))

// ——— النسخ المحفوظة (توحيد مع «منشئ السيرة» القديم) ———
const resumes = useResumesStore()
const versionName = ref('')
function buildConfig() {
  return {
    length: length.value, layout: baseLayout.value.key, variant: variant.value.key, accent: accent.value,
    density: density.value.key, font: font.value.key, headerAlign: headerAlign.value, chip: chipStyle.value.key,
    photo: photo.value, showPhoto: showPhoto.value,
    sections: sections.value, links: links.value, education: education.value, languages: languages.value,
    skills: skills.value, experiences: experiences.value, certificates: certificates.value,
    draft: { headline: draft.headline, summary: draft.summary, highlights: draft.highlights },
  }
}
function saveVersion() {
  const name = versionName.value.trim() || `سيرة ${baseLayout.value.name} · ${variant.value.name}`
  resumes.saveVersion(name, buildConfig())
  versionName.value = ''
  toast(`حُفظت النسخة: ${name}`)
}
function loadVersion(r: { id: number, name: string, config?: unknown }) {
  const c = r.config as ReturnType<typeof buildConfig> | undefined
  if (!c) { toast('نسخة قديمة بلا إعداد استوديو'); return }
  length.value = c.length
  baseLayout.value = BASE_LAYOUTS.find(l => l.key === (c as { layout?: string }).layout) ?? baseLayout.value
  variant.value = VARIANTS.find(v => v.key === (c as { variant?: string }).variant) ?? variant.value
  accent.value = c.accent
  density.value = DENSITIES.find(d => d.key === (c as { density?: string }).density) ?? density.value
  font.value = FONTS.find(f => f.key === (c as { font?: string }).font) ?? font.value
  chipStyle.value = CHIP_STYLES.find(s => s.key === (c as { chip?: string }).chip) ?? chipStyle.value
  headerAlign.value = (c as { headerAlign?: 'start' | 'center' }).headerAlign ?? headerAlign.value
  photo.value = (c as { photo?: string }).photo ?? photo.value
  showPhoto.value = (c as { showPhoto?: boolean }).showPhoto ?? showPhoto.value
  sections.value = c.sections
  links.value = c.links
  education.value = c.education ?? education.value
  languages.value = c.languages ?? languages.value
  skills.value = (c as { skills?: typeof skills.value }).skills ?? skills.value
  experiences.value = (c as { experiences?: typeof experiences.value }).experiences ?? experiences.value
  certificates.value = (c as { certificates?: typeof certificates.value }).certificates ?? certificates.value
  draft.headline = c.draft.headline; draft.summary = c.draft.summary; draft.highlights = c.draft.highlights
  resumes.setActive(r.id)
  toast(`فُتحت النسخة: ${r.name}`)
}

// ——— التصدير ———
function exportPdf() {
  toast('جارٍ فتح نافذة الطباعة — اختر «حفظ كـPDF». الروابط ستبقى قابلة للنقر.')
  setTimeout(() => window.print(), 400)
}
function exportWord() {
  const node = document.querySelector('.page') as HTMLElement | null
  if (!node) return
  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:'Tajawal',Arial,sans-serif}a{color:${accent.value};text-decoration:none}</style></head><body dir="rtl">${node.outerHTML}</body></html>`
  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${(versionName.value.trim() || person.value.name || 'resume')}.doc`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  toast('نُزّلت السيرة بصيغة Word (.doc) — الروابط قابلة للنقر.')
}
</script>

<template>
  <div class="cv-studio">
    <PageHeader title="منشئ السيرة الذاتيّة — استوديو ذكيّ" subtitle="صياغة بالذكاء · ثيمات · ترتيب مرن · روابط تفاعليّة · نسخ محفوظة · تصدير PDF/Word" icon="mdi-file-star-outline">
      <template #actions>
        <BaseButton variant="ghost" size="sm" @click="exportWord"><BaseIcon name="mdi-file-word-box" :size="18" />Word</BaseButton>
        <BaseButton variant="brand" size="sm" @click="exportPdf"><BaseIcon name="mdi-file-pdf-box" :size="18" />تصدير PDF</BaseButton>
      </template>
    </PageHeader>

    <div class="studio-grid">
      <!-- لوحة التحكّم -->
      <div class="controls no-print">
        <!-- الطول -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-robot-outline" :size="18" class="text-brand" /><h3>الصياغة بالذكاء</h3></div>
          <div class="seg">
            <button v-for="l in (['short','medium','expanded'] as Length[])" :key="l" class="seg-btn" :class="{ active: length === l }" :disabled="composing" @click="compose(l)">
              {{ lengthLabel(l) }}
            </button>
          </div>
          <div class="hint">
            <BaseIcon :name="composing ? 'mdi-loading' : (draft.live ? 'mdi-check-decagram' : 'mdi-information-outline')" :size="14" :class="composing ? 'animate-spin' : ''" />
            {{ composing ? 'يصوغ…' : (draft.live ? `مصاغ حيًّا (${draft.provider})` : 'محاكاة — فعّل مزوّدًا في حوكمة الذكاء لصياغة حقيقيّة') }}
          </div>
        </BaseCard>

        <!-- الصورة الشخصيّة -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-account-circle-outline" :size="18" class="text-brand" /><h3>الصورة الشخصيّة</h3></div>
          <div class="photo-ctl">
            <div class="photo-prev" :style="photo ? { backgroundImage: `url(${photo})` } : {}">
              <BaseIcon v-if="!photo" name="mdi-account" :size="26" class="text-muted" />
            </div>
            <div class="photo-actions">
              <BaseButton variant="tonal-accent" size="sm" @click="pickPhoto"><BaseIcon name="mdi-upload-outline" :size="16" />{{ photo ? 'تغيير' : 'رفع صورة' }}</BaseButton>
              <label class="photo-toggle"><input type="checkbox" v-model="showPhoto"> إظهار في السيرة</label>
              <button v-if="photo" class="mini" @click="photo = ''"><BaseIcon name="mdi-delete-outline" :size="16" /> حذف</button>
            </div>
            <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="onPhoto">
          </div>
        </BaseCard>

        <!-- التخطيط الأساسيّ + نمط العرض -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-view-dashboard-outline" :size="18" class="text-brand" /><h3>التخطيط والهويّة</h3></div>

          <div class="disp-tag mb">التخطيط الأساسيّ</div>
          <div class="layout-grid">
            <button v-for="l in BASE_LAYOUTS" :key="l.key" class="layout-tile" :class="{ active: baseLayout.key === l.key }" @click="baseLayout = l">
              <BaseIcon :name="l.icon" :size="22" />
              <span>{{ l.name }}</span>
            </button>
          </div>

          <div class="disp-tag mb mt">نمط العرض</div>
          <div class="seg sm wrap">
            <button v-for="v in VARIANTS" :key="v.key" class="seg-btn" :class="{ active: variant.key === v.key }" @click="variant = v">{{ v.name }}</button>
          </div>

          <div class="disp-tag mb mt">اللون</div>
          <div class="swatches">
            <button v-for="c in ACCENTS" :key="c" class="swatch" :class="{ active: accent === c }" :style="{ background: c }" @click="accent = c" :aria-label="c" />
          </div>

          <div class="disp-label">التحكّم بالتنسيق</div>
          <div class="disp-row">
            <span class="disp-tag">الكثافة</span>
            <div class="seg sm">
              <button v-for="d in DENSITIES" :key="d.key" class="seg-btn" :class="{ active: density.key === d.key }" @click="density = d">{{ d.name }}</button>
            </div>
          </div>
          <div class="disp-row">
            <span class="disp-tag">الخطّ</span>
            <div class="seg sm">
              <button v-for="f in FONTS" :key="f.key" class="seg-btn" :class="{ active: font.key === f.key }" @click="font = f">{{ f.name }}</button>
            </div>
          </div>
          <div class="disp-row">
            <span class="disp-tag">المهارات</span>
            <div class="seg sm">
              <button v-for="cs in CHIP_STYLES" :key="cs.key" class="seg-btn" :class="{ active: chipStyle.key === cs.key }" @click="chipStyle = cs">{{ cs.name }}</button>
            </div>
          </div>
          <div class="disp-row">
            <span class="disp-tag">الترويسة</span>
            <div class="seg sm">
              <button class="seg-btn" :class="{ active: headerAlign === 'start' }" @click="headerAlign = 'start'">لليمين</button>
              <button class="seg-btn" :class="{ active: headerAlign === 'center' }" @click="headerAlign = 'center'">توسيط</button>
            </div>
          </div>
        </BaseCard>

        <!-- ترتيب الأقسام -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-sort-variant" :size="18" class="text-brand" /><h3>ترتيب الأقسام</h3></div>
          <ul class="sec-list">
            <li v-for="(s, i) in sections" :key="s.key" class="sec-item" draggable="true" @dragstart="onDragStart(i)" @dragover.prevent @drop="onDrop(i)">
              <BaseIcon name="mdi-drag-vertical" :size="18" class="drag" />
              <input type="checkbox" v-model="s.visible" :aria-label="s.label">
              <span class="sec-label">{{ s.label }}</span>
              <button class="mini" :disabled="i === 0" @click="move(i, -1)"><BaseIcon name="mdi-chevron-up" :size="16" /></button>
              <button class="mini" :disabled="i === sections.length - 1" @click="move(i, 1)"><BaseIcon name="mdi-chevron-down" :size="16" /></button>
            </li>
          </ul>
        </BaseCard>

        <!-- المهارات -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-star-outline" :size="18" class="text-brand" /><h3>المهارات</h3></div>
          <div v-for="s in skills" :key="s.id" class="link-row">
            <span class="link-label">{{ s.name }}</span>
            <span class="link-url">مستوى {{ s.level }}/5</span>
            <button class="mini" @click="removeSkill(s.id)"><BaseIcon name="mdi-close" :size="14" /></button>
          </div>
          <div class="link-add" style="grid-template-columns: 1fr 70px auto;">
            <BaseInput v-model="newSkill.name" placeholder="المهارة" />
            <BaseInput v-model.number="newSkill.level" type="number" placeholder="1-5" />
            <BaseButton variant="tonal-accent" size="sm" @click="addSkill"><BaseIcon name="mdi-plus" :size="16" /></BaseButton>
          </div>
        </BaseCard>

        <!-- الخبرات -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-briefcase-outline" :size="18" class="text-brand" /><h3>الخبرات</h3></div>
          <div v-for="e in experiences" :key="e.id" class="link-row">
            <span class="link-label">{{ e.title }}</span>
            <span class="link-url">{{ e.org }}</span>
            <button class="mini" @click="removeExp(e.id)"><BaseIcon name="mdi-close" :size="14" /></button>
          </div>
          <div class="link-add">
            <BaseInput v-model="newExp.title" placeholder="المسمّى" />
            <BaseInput v-model="newExp.org" placeholder="الجهة" />
            <BaseInput v-model="newExp.period" placeholder="المدّة (2022 - الآن)" />
            <BaseInput v-model="newExp.desc" placeholder="وصف موجز" />
            <BaseInput v-model="newExp.link" placeholder="مرفق/رابط (يظهر كـQR) https://" dir="ltr" />
            <BaseButton variant="tonal-accent" size="sm" @click="addExp"><BaseIcon name="mdi-plus" :size="16" />إضافة خبرة</BaseButton>
          </div>
        </BaseCard>

        <!-- الشهادات -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-certificate-outline" :size="18" class="text-brand" /><h3>الشهادات</h3></div>
          <div v-for="c in certificates" :key="c.id" class="link-row">
            <span class="link-label">{{ c.name }}</span>
            <span class="link-url">{{ c.issuer }}</span>
            <button class="mini" @click="removeCert(c.id)"><BaseIcon name="mdi-close" :size="14" /></button>
          </div>
          <div class="link-add">
            <BaseInput v-model="newCert.name" placeholder="اسم الشهادة" />
            <BaseInput v-model="newCert.issuer" placeholder="الجهة المانحة" />
            <BaseInput v-model="newCert.date" placeholder="السنة" />
            <BaseInput v-model="newCert.link" placeholder="رابط تحقّق (يظهر كـQR) https://" dir="ltr" />
            <BaseButton variant="tonal-accent" size="sm" @click="addCert"><BaseIcon name="mdi-plus" :size="16" />إضافة شهادة</BaseButton>
          </div>
        </BaseCard>

        <!-- الروابط -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-link-variant" :size="18" class="text-brand" /><h3>روابط تفاعليّة</h3></div>
          <div v-for="l in links" :key="l.id" class="link-row">
            <BaseIcon :name="l.icon" :size="16" class="text-brand" />
            <span class="link-label">{{ l.label }}</span>
            <span class="link-url" dir="ltr">{{ l.url }}</span>
            <button class="mini" @click="removeLink(l.id)"><BaseIcon name="mdi-close" :size="14" /></button>
          </div>
          <div class="link-add">
            <BaseInput v-model="newLink.label" placeholder="التسمية (مثل: أعمالي)" />
            <BaseInput v-model="newLink.url" placeholder="https://" dir="ltr" />
            <BaseButton variant="tonal-accent" size="sm" @click="addLink"><BaseIcon name="mdi-plus" :size="16" />إضافة</BaseButton>
          </div>
        </BaseCard>

        <!-- التعليم -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-school-outline" :size="18" class="text-brand" /><h3>التعليم</h3></div>
          <div v-for="e in education" :key="e.id" class="link-row">
            <span class="link-label">{{ e.degree }}</span>
            <span class="link-url">{{ e.org }} · {{ e.year }}</span>
            <button class="mini" @click="removeEdu(e.id)"><BaseIcon name="mdi-close" :size="14" /></button>
          </div>
          <div class="link-add">
            <BaseInput v-model="newEdu.degree" placeholder="الدرجة/التخصّص" />
            <BaseInput v-model="newEdu.org" placeholder="الجهة" />
            <BaseInput v-model="newEdu.year" placeholder="السنة" />
            <BaseButton variant="tonal-accent" size="sm" @click="addEdu"><BaseIcon name="mdi-plus" :size="16" />إضافة</BaseButton>
          </div>
        </BaseCard>

        <!-- اللغات -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-translate" :size="18" class="text-brand" /><h3>اللغات</h3></div>
          <div v-for="l in languages" :key="l.id" class="link-row">
            <span class="link-label">{{ l.name }}</span>
            <span class="link-url">{{ l.level }}</span>
            <button class="mini" @click="removeLang(l.id)"><BaseIcon name="mdi-close" :size="14" /></button>
          </div>
          <div class="link-add">
            <BaseInput v-model="newLang.name" placeholder="اللغة" />
            <BaseButton variant="tonal-accent" size="sm" @click="addLang"><BaseIcon name="mdi-plus" :size="16" />إضافة</BaseButton>
          </div>
        </BaseCard>

        <!-- النسخ المحفوظة -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-content-save-outline" :size="18" class="text-brand" /><h3>نسخي المحفوظة</h3></div>
          <div class="link-add" style="grid-template-columns: 1fr auto;">
            <BaseInput v-model="versionName" placeholder="اسم النسخة (اختياريّ)" />
            <BaseButton variant="brand" size="sm" @click="saveVersion"><BaseIcon name="mdi-content-save-outline" :size="16" />احفظ</BaseButton>
          </div>
          <div v-for="r in resumes.resumes" :key="r.id" class="ver-row" :class="{ active: r.active }">
            <BaseIcon name="mdi-file-outline" :size="15" :class="r.active ? 'text-brand' : 'text-muted'" />
            <span class="ver-name">{{ r.name }}</span>
            <span class="ver-date">{{ r.updatedAt }}</span>
            <button class="mini" title="فتح" @click="loadVersion(r)"><BaseIcon name="mdi-folder-open-outline" :size="15" /></button>
            <button class="mini" title="حذف" @click="resumes.remove(r.id)"><BaseIcon name="mdi-close" :size="14" /></button>
          </div>
        </BaseCard>
      </div>

      <!-- المعاينة الحيّة (A4) -->
      <div class="preview-wrap">
        <div class="page" :class="[`layout-${baseLayout.key}`, `variant-${variant.key}`, `hdr-${headerAlign}`, `chip-${chipStyle.key}`]" :style="pageStyle">
          <!-- ترويسة -->
          <header class="cv-head">
            <div v-if="showPhoto && photo" class="cv-photo" :style="{ backgroundImage: `url(${photo})` }" />
            <div class="cv-identity">
              <h1 class="cv-name">{{ person.name }}</h1>
              <p class="cv-headline">{{ draft.headline || profile.headline }}</p>
              <div v-if="person.email || person.phone" class="cv-contact">
                <span v-if="person.email" dir="ltr"><BaseIcon name="mdi-email-outline" :size="13" /> {{ person.email }}</span>
                <span v-if="person.phone" dir="ltr"><BaseIcon name="mdi-phone-outline" :size="13" /> {{ person.phone }}</span>
              </div>
            </div>
          </header>

          <div class="cv-body">
            <!-- عمود جانبيّ (للثيم الجانبيّ) -->
            <aside v-if="baseLayout.key === 'sidebar'" class="cv-aside">
              <template v-for="s in visibleOrdered" :key="`a-${s.key}`">
                <section v-if="s.key === 'skills' && skills.length" class="cv-sec">
                  <h2>المهارات</h2>
                  <div class="chips">
                    <span v-for="sk in skills" :key="sk.id" class="chip">{{ sk.name }}</span>
                  </div>
                </section>
                <section v-else-if="s.key === 'languages' && languages.length" class="cv-sec">
                  <h2>اللغات</h2>
                  <div v-for="l in languages" :key="l.id" class="cert"><b>{{ l.name }}</b><span>{{ l.level }}</span></div>
                </section>
                <section v-else-if="s.key === 'education' && education.length" class="cv-sec">
                  <h2>التعليم</h2>
                  <div v-for="e in education" :key="e.id" class="cert"><b>{{ e.degree }}</b><span>{{ e.org }} · {{ e.year }}</span></div>
                </section>
                <section v-else-if="s.key === 'certificates' && certificates.length" class="cv-sec">
                  <h2>الشهادات</h2>
                  <div v-for="c in certificates" :key="c.id" class="cert">
                    <div class="cert-body"><b>{{ c.name }}</b><span>{{ c.issuer }} · {{ c.date }}</span><a v-if="c.link" class="cv-link sm" :href="c.link" target="_blank" rel="noopener"><BaseIcon name="mdi-shield-check-outline" :size="12" /> تحقّق</a></div>
                    <a v-if="c.link" class="cv-qr sm" :href="c.link" target="_blank" rel="noopener" v-html="qr(c.link)" />
                  </div>
                </section>
                <section v-else-if="s.key === 'links' && links.length" class="cv-sec">
                  <h2>روابط</h2>
                  <a v-for="l in links" :key="l.id" class="cv-link" :href="l.url" target="_blank" rel="noopener"><BaseIcon :name="l.icon" :size="13" /> {{ l.label }}</a>
                </section>
              </template>
            </aside>

            <!-- العمود الرئيس -->
            <main class="cv-main">
              <template v-for="s in visibleOrdered" :key="`m-${s.key}`">
                <section v-if="s.key === 'summary' && draft.summary" class="cv-sec">
                  <h2>نبذة</h2>
                  <p class="cv-summary">{{ draft.summary }}</p>
                </section>

                <section v-else-if="s.key === 'highlights' && draft.highlights.length" class="cv-sec">
                  <h2>أبرز النقاط</h2>
                  <ul class="cv-highlights">
                    <li v-for="(h, hi) in draft.highlights" :key="hi">{{ h }}</li>
                  </ul>
                </section>

                <section v-else-if="s.key === 'experiences' && experiences.length" class="cv-sec">
                  <h2>الخبرات</h2>
                  <div v-for="e in experiences" :key="e.id" class="cv-exp">
                    <div class="cv-exp-body">
                      <div class="cv-exp-top"><b>{{ e.title }}</b><span class="cv-exp-org">{{ e.org }}</span></div>
                      <span class="cv-exp-period">{{ e.period }}</span>
                      <p v-if="e.desc">{{ e.desc }}</p>
                      <a v-if="e.link" class="cv-link sm" :href="e.link" target="_blank" rel="noopener"><BaseIcon name="mdi-paperclip" :size="12" /> مرفق / رابط</a>
                    </div>
                    <a v-if="e.link" class="cv-qr" :href="e.link" target="_blank" rel="noopener" v-html="qr(e.link)" />
                  </div>
                </section>

                <!-- في الثيمات غير الجانبيّة تظهر المهارات/الشهادات/الروابط في الرئيس -->
                <section v-else-if="s.key === 'skills' && baseLayout.key !== 'sidebar' && skills.length" class="cv-sec">
                  <h2>المهارات</h2>
                  <div class="chips">
                    <span v-for="sk in skills" :key="sk.id" class="chip">{{ sk.name }}</span>
                  </div>
                </section>
                <section v-else-if="s.key === 'education' && baseLayout.key !== 'sidebar' && education.length" class="cv-sec">
                  <h2>التعليم</h2>
                  <div v-for="e in education" :key="e.id" class="cv-exp">
                    <div class="cv-exp-top"><b>{{ e.degree }}</b><span class="cv-exp-org">{{ e.org }}</span></div>
                    <span class="cv-exp-period">{{ e.year }}</span>
                  </div>
                </section>
                <section v-else-if="s.key === 'languages' && baseLayout.key !== 'sidebar' && languages.length" class="cv-sec">
                  <h2>اللغات</h2>
                  <div class="chips">
                    <span v-for="l in languages" :key="l.id" class="chip">{{ l.name }} · {{ l.level }}</span>
                  </div>
                </section>
                <section v-else-if="s.key === 'certificates' && baseLayout.key !== 'sidebar' && certificates.length" class="cv-sec">
                  <h2>الشهادات</h2>
                  <div v-for="c in certificates" :key="c.id" class="cert">
                    <div class="cert-body"><b>{{ c.name }}</b><span>{{ c.issuer }} · {{ c.date }}</span><a v-if="c.link" class="cv-link sm" :href="c.link" target="_blank" rel="noopener"><BaseIcon name="mdi-shield-check-outline" :size="12" /> تحقّق</a></div>
                    <a v-if="c.link" class="cv-qr sm" :href="c.link" target="_blank" rel="noopener" v-html="qr(c.link)" />
                  </div>
                </section>
                <section v-else-if="s.key === 'links' && baseLayout.key !== 'sidebar' && links.length" class="cv-sec">
                  <h2>روابط</h2>
                  <div class="link-inline">
                    <a v-for="l in links" :key="l.id" class="cv-link" :href="l.url" target="_blank" rel="noopener"><BaseIcon :name="l.icon" :size="13" /> {{ l.label }}</a>
                  </div>
                </section>
              </template>
            </main>
          </div>
        </div>
      </div>
    </div>

    <BaseSnackbar v-model="snack.show" color="success">{{ snack.text }}</BaseSnackbar>
  </div>
</template>

<style scoped>
.studio-grid { display: grid; grid-template-columns: 320px 1fr; gap: 1.25rem; align-items: start; }
@media (max-width: 900px) { .studio-grid { grid-template-columns: 1fr; } }
.controls { display: flex; flex-direction: column; gap: 1rem; }
.ctl-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.ctl-head h3 { font-size: 14px; font-weight: 700; color: var(--v-text-content, inherit); }
.hint { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 12px; color: rgba(var(--v-theme-on-surface), 0.6); }

.seg { display: flex; gap: 4px; background: rgba(var(--v-theme-on-surface), 0.05); border-radius: 10px; padding: 4px; }
.seg-btn { flex: 1; padding: 7px; border-radius: 7px; font-size: 13px; font-weight: 600; color: rgba(var(--v-theme-on-surface), 0.7); transition: all .15s; }
.seg-btn.active { background: rgb(var(--v-theme-brand, 16 110 86)); color: #fff; }

.theme-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; }
.theme-chip { padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1.5px solid rgba(var(--v-theme-on-surface), 0.12); color: rgba(var(--v-theme-on-surface), 0.75); }
.theme-chip.active { border-color: rgb(var(--v-theme-brand, 16 110 86)); color: rgb(var(--v-theme-brand, 16 110 86)); }
.swatches { display: flex; gap: 8px; }
.swatch { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; }
.swatch.active { border-color: rgba(var(--v-theme-on-surface), 0.5); outline: 2px solid #fff; }

.sec-list { display: flex; flex-direction: column; gap: 4px; }
.sec-item { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 8px; background: rgba(var(--v-theme-on-surface), 0.03); cursor: grab; }
.sec-item .drag { color: rgba(var(--v-theme-on-surface), 0.35); }
.sec-label { flex: 1; font-size: 13px; }
.mini { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; color: rgba(var(--v-theme-on-surface), 0.6); }
.mini:hover:not(:disabled) { background: rgba(var(--v-theme-on-surface), 0.08); }
.mini:disabled { opacity: .3; }

.link-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 12px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06); }
.link-label { font-weight: 600; }
.link-url { flex: 1; color: rgba(var(--v-theme-on-surface), 0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-add { display: grid; gap: 6px; margin-top: 10px; }
.ver-row { display: flex; align-items: center; gap: 8px; padding: 7px 0; font-size: 12.5px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06); }
.ver-row.active { color: rgb(var(--v-theme-brand, 16 110 86)); font-weight: 600; }
.ver-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ver-date { font-size: 11px; color: rgba(var(--v-theme-on-surface), 0.4); }

/* ============ المعاينة A4 ============ */
.preview-wrap { display: flex; justify-content: center; }
.page {
  width: 210mm; max-width: 100%; min-height: 297mm; background: #fff; color: #1a1a1a;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18); border-radius: 6px; overflow: hidden;
  font-family: 'Tajawal', sans-serif; --ink: #1f2937; --muted: #6b7280;
}
.cv-head { padding: 28px 34px; }
.cv-name { font-size: 30px; font-weight: 800; color: var(--accent); line-height: 1.15; }
.cv-headline { font-size: 15px; color: var(--muted); margin-top: 4px; }
.cv-contact { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; font-size: 12px; color: var(--muted); }
.cv-contact span { display: inline-flex; align-items: center; gap: 4px; }
.cv-body { display: block; }
.cv-main, .cv-aside { padding: 0 34px 30px; }
.cv-sec { margin-bottom: 18px; }
.cv-sec h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: var(--accent); margin-bottom: 8px; }
.cv-summary { font-size: 13.5px; line-height: 1.85; color: var(--ink); }
.cv-highlights { list-style: none; display: flex; flex-direction: column; gap: 5px; }
.cv-highlights li { position: relative; padding-inline-start: 16px; font-size: 13px; line-height: 1.7; color: var(--ink); }
.cv-highlights li::before { content: ''; position: absolute; inline-size: 6px; block-size: 6px; border-radius: 50%; background: var(--accent); inset-inline-start: 0; inset-block-start: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 12px; padding: 3px 10px; border-radius: 20px; background: color-mix(in srgb, var(--accent) 12%, #fff); color: var(--accent); font-weight: 600; }
.cv-exp { margin-bottom: 12px; }
.cv-exp-top { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.cv-exp-top b { font-size: 14px; color: var(--ink); }
.cv-exp-org { font-size: 12.5px; color: var(--accent); font-weight: 600; }
.cv-exp-period { font-size: 11.5px; color: var(--muted); }
.cv-exp p { font-size: 12.5px; line-height: 1.7; color: var(--ink); margin-top: 3px; }
.cert { margin-bottom: 7px; font-size: 12.5px; }
.cert b { display: block; color: var(--ink); }
.cert span { color: var(--muted); font-size: 11.5px; }
.cv-link { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--accent); text-decoration: none; margin-inline-end: 14px; }
.cv-link:hover { text-decoration: underline; }
.link-inline { display: flex; flex-wrap: wrap; gap: 6px; }

/* ===== الترويسة: صورة + هويّة ===== */
.cv-head { display: flex; align-items: center; gap: 18px; }
.cv-identity { min-width: 0; }
.cv-photo { inline-size: 78px; block-size: 78px; border-radius: 50%; background-size: cover; background-position: center; flex: none; border: 3px solid rgba(255, 255, 255, 0.55); }
.hdr-center .cv-head { flex-direction: column; text-align: center; }
.hdr-center .cv-contact { justify-content: center; }

/* ===== التخطيطات الأساسيّة (بنية + معالجة لون) ===== */
.layout-single .cv-name, .layout-timeline .cv-name { color: var(--accent); }
.layout-single .cv-photo, .layout-timeline .cv-photo { border-color: color-mix(in srgb, var(--accent) 35%, #fff); }

.layout-sidebar .cv-body { display: grid; grid-template-columns: 34% 1fr; }
.layout-sidebar .cv-head { background: var(--accent); }
.layout-sidebar .cv-name, .layout-sidebar .cv-headline, .layout-sidebar .cv-contact { color: #fff; }
.layout-sidebar .cv-headline, .layout-sidebar .cv-contact { opacity: 0.92; }
.layout-sidebar .cv-aside { background: color-mix(in srgb, var(--accent) 8%, #fff); padding-top: 24px; }
.layout-sidebar .cv-aside .cv-sec h2 { color: var(--accent); }
.layout-sidebar .cv-main { padding-top: 24px; }

.layout-band .cv-head { background: var(--accent); }
.layout-band .cv-name { color: #fff; }
.layout-band .cv-headline { color: rgba(255, 255, 255, 0.92); }
.layout-band .cv-contact { color: rgba(255, 255, 255, 0.86); }
.layout-band .cv-main { padding-top: 24px; }

.layout-timeline .cv-main .cv-exp { border-inline-start: 2px solid color-mix(in srgb, var(--accent) 30%, #fff); padding-inline-start: 16px; }
.layout-timeline .cv-main .cv-exp::before { content: ''; position: absolute; inline-size: 9px; block-size: 9px; border-radius: 50%; background: var(--accent); inset-inline-start: -5px; inset-block-start: 4px; }
.layout-timeline .cv-main .cv-exp { position: relative; }

/* ===== أنماط العرض (variant) — معالجة العناوين ===== */
.variant-classic .cv-sec h2 { border-bottom: 1px solid color-mix(in srgb, var(--accent) 25%, #e5e7eb); padding-bottom: 4px; }
.variant-classic .cv-headline { color: var(--accent); font-weight: 600; }
.variant-minimal .cv-sec h2 { font-weight: 700; letter-spacing: 1.5px; font-size: 11px; opacity: 0.85; }
.variant-bold .cv-name { font-weight: 800; }
.variant-bold .cv-sec h2 { font-weight: 800; font-size: 14px; display: flex; align-items: center; gap: 7px; }
.variant-bold .cv-sec h2::before { content: ''; inline-size: 16px; block-size: 3px; background: var(--accent); border-radius: 2px; }
.variant-outline .cv-main .cv-sec { border: 1px solid color-mix(in srgb, var(--accent) 18%, #e5e7eb); border-radius: 8px; padding: 10px 12px; }
.variant-outline .cv-sec h2 { margin-bottom: 6px; }

/* ===== تنسيق شرائح المهارات ===== */
.chip-plain .chip { background: transparent; padding: 1px 0; color: var(--ink); font-weight: 500; }
.chip-plain .chip:not(:last-child)::after { content: '•'; margin-inline-start: 8px; color: var(--muted); }
.chip-bar .chip { background: transparent; border-radius: 0; border-inline-start: 3px solid var(--accent); padding: 1px 8px; color: var(--ink); }

/* ===== الرابط/QR في الخبرات والشهادات ===== */
.cv-exp { display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; }
.cv-exp-body { flex: 1; min-width: 0; }
.cv-qr { flex: none; inline-size: 50px; block-size: 50px; display: block; }
.cv-qr.sm { inline-size: 42px; block-size: 42px; }
.cv-qr :deep(svg) { inline-size: 100%; block-size: 100%; display: block; border-radius: 3px; }
.cv-link.sm { font-size: 11px; margin-top: 3px; }
.cert { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.cert-body { flex: 1; min-width: 0; }

/* الكثافة — تُقاس نسبةً إلى --scale */
.page .cv-head { padding: calc(28px * var(--scale, 1)) calc(34px * var(--scale, 1)); }
.page .cv-main, .page .cv-aside { padding-inline: calc(34px * var(--scale, 1)); padding-bottom: calc(30px * var(--scale, 1)); }
.page .cv-sec { margin-bottom: calc(18px * var(--scale, 1)); }
.page .cv-name { font-size: calc(30px * var(--scale, 1)); }
.page .cv-summary, .page .cv-highlights li, .page .cv-exp p { font-size: calc(13px * var(--scale, 1)); }

/* ===== عناصر لوحة التحكّم الجديدة ===== */
.disp-label { margin-top: 14px; margin-bottom: 6px; font-size: 12px; font-weight: 700; color: rgba(var(--v-theme-on-surface), 0.6); }
.disp-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.disp-tag { font-size: 11px; color: rgba(var(--v-theme-on-surface), 0.55); min-width: 46px; }
.disp-tag.mb { display: block; margin-bottom: 6px; }
.disp-tag.mt { margin-top: 12px; }
.seg.sm { flex: 1; padding: 3px; }
.seg.sm.wrap { flex-wrap: wrap; }
.seg.sm .seg-btn { padding: 5px; font-size: 11.5px; }
.layout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.layout-tile { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 12px 8px; border-radius: 10px; border: 1.5px solid rgba(var(--v-theme-on-surface), 0.12); color: rgba(var(--v-theme-on-surface), 0.7); font-size: 12px; font-weight: 600; }
.layout-tile.active { border-color: rgb(var(--v-theme-brand, 16 110 86)); color: rgb(var(--v-theme-brand, 16 110 86)); background: rgba(var(--v-theme-brand, 16 110 86), 0.06); }
.photo-ctl { display: flex; align-items: center; gap: 14px; }
.photo-prev { inline-size: 58px; block-size: 58px; border-radius: 50%; background-size: cover; background-position: center; background-color: rgba(var(--v-theme-on-surface), 0.06); display: flex; align-items: center; justify-content: center; flex: none; }
.photo-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.photo-toggle { font-size: 12px; display: flex; align-items: center; gap: 6px; color: rgba(var(--v-theme-on-surface), 0.75); }

/* ============ الطباعة ============ */
@media print {
  .no-print, :global(.app-sidebar), :global(.app-header), :global(header.banner) { display: none !important; }
  .studio-grid { grid-template-columns: 1fr !important; }
  .preview-wrap { display: block; }
  .page { box-shadow: none !important; border-radius: 0 !important; width: 100% !important; min-height: auto !important; }
}
</style>
