import { defineStore } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import type { SeekerPrefs } from '@/interfaces/RoleProfiles'
import { ai } from '@/services/ai'
import { syncPrivateDoc } from '@/services/cloudSync'
import { USE_REAL_API, api } from '@/services/api'
import { useGamificationStore } from '@/stores/GamificationStore'

export type ProofType = 'assessment' | 'endorsement' | 'project' | 'certificate' | 'self'

export interface SkillProof {
  id: number
  type: ProofType
  label: string
  date: string
}

export interface Skill {
  id: number
  name: string
  selfLevel: number
  proofs: SkillProof[]
  category?: string // taxonomy category id
}

export interface Experience { id: number, title: string, company: string, period: string, desc: string }
export interface Certificate { id: number, name: string, issuer: string, date: string }
export interface ProofRequest { id: number, from: string, relation: string, skill: string, date: string }

export const PROOF_META: Record<ProofType, { label: string, icon: string, weight: number, color: string }> = {
  assessment: { label: 'اختبار', icon: 'mdi-clipboard-check-outline', weight: 35, color: 'success' },
  endorsement: { label: 'توصية', icon: 'mdi-account-star-outline', weight: 25, color: 'secondary' },
  project: { label: 'مشروع', icon: 'mdi-rocket-launch-outline', weight: 20, color: 'accent' },
  certificate: { label: 'شهادة', icon: 'mdi-certificate-outline', weight: 15, color: 'info' },
  self: { label: 'تقييم ذاتي', icon: 'mdi-account-outline', weight: 5, color: 'medium-emphasis' },
}

export function skillConfidence(skill: Skill): number {
  // المهارات الآتية من الباك-إند (استخراج CV/مزامنة) قد تصل بلا مصفوفة proofs — تحصّن.
  const raw = (skill.proofs ?? []).reduce((sum, p) => sum + (PROOF_META[p.type]?.weight ?? 0), 0)
  return Math.min(100, raw)
}

export function skillLevelLabel(skill: Skill): string {
  const { level } = ai.skillLevel(skillConfidence(skill))
  return ({ entry: 'مبتدئ', mid: 'متوسط', advanced: 'متقدم', expert: 'خبير' })[level]
}

const STORAGE_KEY = 'profileData'

interface ProfileState {
  headline: string
  summary: string
  skills: Skill[]
  experiences: Experience[]
  certificates: Certificate[]
  prefs: SeekerPrefs
}

const seed: ProfileState = {
  headline: 'مطوّر واجهات أمامية · الرياض',
  summary: 'مطوّر شغوف ببناء تجارب مستخدم سلسة وأنظمة قابلة للتوسّع. خبرة 5 سنوات في تطوير الواجهات الأمامية الحديثة.',
  skills: [
    { id: 1, name: 'Vue.js', selfLevel: 5, proofs: [
      { id: 1, type: 'assessment', label: 'اختبار Vue.js المتقدم — 92%', date: '2026-06' },
      { id: 2, type: 'endorsement', label: 'توصية من أحمد المنصور', date: '2026-05' },
      { id: 3, type: 'project', label: 'منصة spaces-vue', date: '2026-04' },
    ] },
    { id: 2, name: 'TypeScript', selfLevel: 4, proofs: [
      { id: 4, type: 'assessment', label: 'اختبار TypeScript — 85%', date: '2026-03' },
      { id: 5, type: 'certificate', label: 'TypeScript Deep Dive', date: '2022' },
    ] },
    { id: 3, name: 'UI/UX', selfLevel: 4, proofs: [
      { id: 6, type: 'project', label: 'إعادة تصميم لوحة تحكم', date: '2026-02' },
      { id: 7, type: 'self', label: 'تقييم ذاتي', date: '2026-01' },
    ] },
    { id: 4, name: 'Node.js', selfLevel: 3, proofs: [
      { id: 8, type: 'self', label: 'تقييم ذاتي', date: '2026-01' },
    ] },
  ],
  experiences: [
    { id: 1, title: 'مطوّر واجهات أمامية أول', company: 'شركة تقنية المستقبل', period: '2022 - الآن', desc: 'قيادة تطوير منصات الويب باستخدام Vue 3.' },
    { id: 2, title: 'مطوّر ويب', company: 'استوديو رؤية', period: '2019 - 2022', desc: 'بناء واجهات تفاعلية وتحسين الأداء.' },
  ],
  certificates: [
    { id: 1, name: 'Vue.js Professional', issuer: 'Vue School', date: '2023' },
    { id: 2, name: 'TypeScript Deep Dive', issuer: 'Frontend Masters', date: '2022' },
  ],
  // Mirrors the seeker_profiles preference columns
  prefs: {
    location: 'الرياض',
    availability: 'within_month',
    expected_salary: null,
    preferred_employment_types: ['full_time'],
    preferred_fields: [],
    preferred_locations: [],
    self_offer_active: false,
  },
}

function load(): ProfileState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return structuredClone(seed)
  try {
    return { ...structuredClone(seed), ...JSON.parse(raw) } as ProfileState
  }
  catch {
    return structuredClone(seed)
  }
}

let nextId = 1000
let nextProofId = 2000

export const useProfileStore = defineStore('profile', () => {
  const state = load()
  const headline = ref(state.headline)
  const summary = ref(state.summary)
  const skills = ref<Skill[]>(state.skills)
  const experiences = ref<Experience[]>(state.experiences)
  const certificates = ref<Certificate[]>(state.certificates)
  const prefs = ref<SeekerPrefs>({ ...structuredClone(seed.prefs), ...state.prefs })

  // Pending proof requests others sent to me (e.g. a manager asking me to verify a skill)
  const pendingProofRequests = ref<ProofRequest[]>([
    { id: 1, from: 'أحمد المنصور', relation: 'مدير سابق', skill: 'القيادة', date: 'قبل يومين' },
    { id: 2, from: 'شركة تقنية المستقبل', relation: 'جهة توظيف', skill: 'Vue.js', date: 'قبل 4 أيام' },
  ])
  let nextRequestId = 100
  /** طلب إثبات وارد (من زائر الصفحة العامة أو زميل) ينتظر قرار صاحب الملف */
  function addProofRequest(from: string, relation: string, skill: string) {
    pendingProofRequests.value.unshift({ id: nextRequestId++, from, relation, skill, date: 'الآن' })
  }
  function resolveProofRequest(id: number, accept: boolean) {
    // الخادم يزيل الطلب (وقد يضيف توصية على المهارة المطابقة)؛ المنطق المحلي أدناه
    // يبقى تفاؤليًا وتزامنه لقطة persist للوثيقة الكاملة.
    if (USE_REAL_API)
      api.profile.resolveProofRequest(id, accept).catch(() => { /* المحلي كافٍ */ })
    const req = pendingProofRequests.value.find(r => r.id === id)
    if (req && accept) {
      const skill = skills.value.find(s => s.name.toLowerCase() === req.skill.toLowerCase())
      if (skill)
        skill.proofs.push({ id: nextProofId++, type: 'endorsement', label: `توصية من ${req.from}`, date: 'الآن' })
    }
    pendingProofRequests.value = pendingProofRequests.value.filter(r => r.id !== id)
  }

  // Skills that lack strong verification (confidence below 50 or self-assessment only)
  const unverifiedSkills = computed(() =>
    skills.value
      .filter(s => skillConfidence(s) < 50 || (s.proofs ?? []).every(p => p.type === 'self'))
      .map(s => s.name),
  )

  function snapshot() {
    return {
      headline: headline.value,
      summary: summary.value,
      skills: skills.value,
      experiences: experiences.value,
      certificates: certificates.value,
      prefs: prefs.value,
    }
  }

  // ===== الربط الخلفي (NestJS) خلف المفتاح — بلا تغيير في واجهة المخزن =====
  // `ready` يمنع دفع لقطة الإماهة الأولى للخادم (تُطبَّق قبل رفع العلَم).
  let ready = !USE_REAL_API
  let serverSaveTimer: ReturnType<typeof setTimeout> | null = null
  function pushToServer() {
    if (serverSaveTimer)
      clearTimeout(serverSaveTimer)
    serverSaveTimer = setTimeout(() => { api.profile.update(snapshot()).catch(() => { /* الكاش المحلي كافٍ */ }) }, 600)
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()))
    if (USE_REAL_API && ready)
      pushToServer()
  }
  watch([headline, summary, skills, experiences, certificates, prefs], persist, { deep: true })

  /**
   * إماهة الوثيقة الخاصة من الخادم عند الدخول (الوضع الحقيقي فقط).
   * الخادم مرجع الحقيقة؛ الحقول الفارغة تعود للبذرة (تفادي تسرّب كاش مستخدم سابق).
   */
  async function hydrate() {
    if (!USE_REAL_API)
      return
    try {
      const p = await api.profile.get() as Partial<ProfileState> | null
      if (p) {
        headline.value = p.headline || seed.headline
        summary.value = p.summary || seed.summary
        skills.value = p.skills?.length ? p.skills : structuredClone(seed.skills)
        experiences.value = p.experiences?.length ? p.experiences : structuredClone(seed.experiences)
        certificates.value = p.certificates?.length ? p.certificates : structuredClone(seed.certificates)
        prefs.value = { ...structuredClone(seed.prefs), ...(p.prefs ?? {}) }
      }
      const reqs = await api.profile.proofRequests() as ProofRequest[]
      if (Array.isArray(reqs))
        pendingProofRequests.value = reqs
    }
    catch { /* يبقى البذر المحلي */ }
    // ننتظر تفريغ مراقبات الإماهة (ready=false) ثم نسمح بالدفع للخادم بعدها
    await nextTick()
    ready = true
  }
  if (USE_REAL_API)
    hydrate()

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'profile',
    snapshot: () => ({
      headline: headline.value,
      summary: summary.value,
      skills: skills.value,
      experiences: experiences.value,
      certificates: certificates.value,
      prefs: prefs.value,
    }),
    apply: (incoming) => {
      const d = incoming as Partial<{ headline: string, summary: string, skills: Skill[], experiences: Experience[], certificates: Certificate[], prefs: SeekerPrefs }>
      if (typeof d.headline === 'string')
        headline.value = d.headline
      if (typeof d.summary === 'string')
        summary.value = d.summary
      if (Array.isArray(d.skills))
        skills.value = d.skills
      if (Array.isArray(d.experiences))
        experiences.value = d.experiences
      if (Array.isArray(d.certificates))
        certificates.value = d.certificates
      if (d.prefs)
        prefs.value = { ...structuredClone(seed.prefs), ...d.prefs }
    },
    source: [headline, summary, skills, experiences, certificates, prefs],
  })

  function addSkill(name: string, selfLevel: number, category?: string) {
    if (!name.trim())
      return
    skills.value.push({
      id: nextId++,
      name: name.trim(),
      selfLevel,
      category,
      proofs: [{ id: nextProofId++, type: 'self', label: 'تقييم ذاتي', date: 'الآن' }],
    })
    useGamificationStore().record('skill', `أضفت مهارة «${name.trim()}»`)
  }
  function removeSkill(id: number) {
    skills.value = skills.value.filter(s => s.id !== id)
  }
  function addProof(skillId: number, type: ProofType, label: string) {
    const skill = skills.value.find(s => s.id === skillId)
    if (skill)
      skill.proofs.push({ id: nextProofId++, type, label, date: 'الآن' })
  }
  function addExperience(exp: Omit<Experience, 'id'>) {
    experiences.value.unshift({ id: nextId++, ...exp })
  }
  function removeExperience(id: number) {
    experiences.value = experiences.value.filter(e => e.id !== id)
  }
  function addCertificate(cert: Omit<Certificate, 'id'>) {
    certificates.value.push({ id: nextId++, ...cert })
  }
  function removeCertificate(id: number) {
    certificates.value = certificates.value.filter(c => c.id !== id)
  }

  return {
    headline, summary, skills, experiences, certificates, prefs, syncStatus,
    pendingProofRequests, unverifiedSkills, addProofRequest, resolveProofRequest,
    addSkill, removeSkill, addProof, addExperience, removeExperience, addCertificate, removeCertificate,
  }
})
