// Assessment center — polymorphic question model supporting 10 question types,
// test-size generation, daily/weekly challenges, leaderboard and points.

export type QuestionType =
  | 'mcq' // اختيار من متعدد
  | 'truefalse' // صح/خطأ مع تبرير
  | 'open' // سؤال مفتوح تحليلي
  | 'sequencing' // ترتيب تسلسلي
  | 'matching' // مطابقة عمودين
  | 'fileupload' // تحميل ملف وتحليل
  | 'recording' // تسجيل صوتي/فيديو
  | 'imageanalysis' // تحليل صورة/رسم بياني
  | 'mindmap' // خريطة ذهنية
  | 'rank' // تحديد الأولويات

export interface MatchPair { left: string, right: string }

export interface AssessmentQuestion {
  id: number
  type: QuestionType
  text: string
  hint?: string
  options?: string[] // mcq / truefalse
  correctIndex?: number // mcq / truefalse
  items?: string[] // sequencing / rank
  correctOrder?: number[] // sequencing: correct order of item indices
  pairs?: MatchPair[] // matching
  imageLabel?: string // imageanalysis (mock chart label)
  placeholder?: string // open / fileupload / recording / mindmap
}

export interface Assessment {
  id: number
  name: string
  type: string
  duration: string
  durationMinutes: number
  questionsCount: number
  icon: string
  color: string
  pool: AssessmentQuestion[]
}

export interface CompletedAssessment {
  id: number
  name: string
  date: string
  score: number
  level: string
}

export const QUESTION_TYPE_META: Record<QuestionType, { label: string, icon: string }> = {
  mcq: { label: 'اختيار من متعدد', icon: 'mdi-format-list-bulleted' },
  truefalse: { label: 'صح/خطأ مع تبرير', icon: 'mdi-check-circle-outline' },
  open: { label: 'سؤال تحليلي', icon: 'mdi-text-long' },
  sequencing: { label: 'ترتيب تسلسلي', icon: 'mdi-sort' },
  matching: { label: 'مطابقة', icon: 'mdi-vector-link' },
  fileupload: { label: 'تحميل وتحليل', icon: 'mdi-upload-outline' },
  recording: { label: 'تسجيل صوتي', icon: 'mdi-microphone-outline' },
  imageanalysis: { label: 'تحليل رسم بياني', icon: 'mdi-chart-line' },
  mindmap: { label: 'خريطة ذهنية', icon: 'mdi-sitemap-outline' },
  rank: { label: 'ترتيب الأولويات', icon: 'mdi-priority-high' },
}

// A mixed pool touching all 10 question types.
const WEB_POOL: AssessmentQuestion[] = [
  { id: 1, type: 'mcq', text: 'ما الناتج عن التعبير typeof null في JavaScript؟', options: ['"null"', '"object"', '"undefined"', '"number"'], correctIndex: 1, hint: 'خطأ تاريخي شهير في اللغة منذ نشأتها.' },
  { id: 2, type: 'truefalse', text: 'يمكن استخدام JavaScript لتطوير تطبيقات سطح المكتب. برّر إجابتك.', options: ['صحيح', 'خطأ'], correctIndex: 0, hint: 'فكّر في Electron.' },
  { id: 3, type: 'open', text: 'كيف تتعامل مع تحسين أداء تطبيق Vue يعاني من إعادة رسم زائدة؟ اشرح خطتك.', placeholder: 'اذكر أدوات القياس ثم خطوات التحسين...', hint: 'ابدأ بالقياس (DevTools) قبل التحسين.' },
  { id: 4, type: 'sequencing', text: 'رتّب خطوات بناء تطبيق React/Vue من الفكرة إلى النشر.', items: ['التخطيط', 'التصميم', 'البرمجة', 'الاختبار', 'النشر'], correctOrder: [0, 1, 2, 3, 4], hint: 'الاختبار يسبق النشر دائمًا.' },
  { id: 5, type: 'matching', text: 'طابِق كل تقنية بالأداة/الإطار المناسب.', pairs: [{ left: 'PHP', right: 'Laravel' }, { left: 'JavaScript', right: 'Vue.js' }, { left: 'Python', right: 'Django' }], hint: 'اربط كل لغة بإطارها الأشهر.' },
  { id: 6, type: 'fileupload', text: 'ارفع ملف كود JavaScript وحدّد الأخطاء المحتملة وحلولها.', placeholder: 'صف الأخطاء التي رصدتها والحلول المقترحة...', hint: 'ابحث عن تسريبات الذاكرة والحلقات غير المنتهية.' },
  { id: 7, type: 'recording', text: 'تحدّث عن أكبر إنجاز تقني لك خلال 60 ثانية.', placeholder: 'لخّص ما ستقوله (يُحاكى التسجيل الصوتي)...', hint: 'ابدأ بالسياق، ثم دورك، ثم الأثر القابل للقياس.' },
  { id: 8, type: 'imageanalysis', text: 'حلّل الرسم البياني التالي واستنتج اتجاه الأداء وسببه.', imageLabel: 'زمن الاستجابة (ms) عبر آخر 6 إصدارات', placeholder: 'صف الاتجاه العام والسبب المحتمل والتوصية...', hint: 'انظر إلى الاتجاه لا إلى نقطة واحدة.' },
  { id: 9, type: 'mindmap', text: 'أنشئ خريطة ذهنية لخطة إطلاق منتج رقمي جديد.', placeholder: 'أضف العُقد الرئيسية (تسويق، تطوير، دعم...)', hint: 'ابدأ بـ 4 فروع رئيسية ثم تفرّع.' },
  { id: 10, type: 'rank', text: 'رتّب مهامك اليومية كمدير مشروع وفق الأولوية.', items: ['حل عائق حرج يوقف الفريق', 'مراجعة تقدم السباق', 'الرد على بريد غير عاجل', 'تخطيط السباق القادم'], hint: 'ما الذي يوقف الفريق الآن؟' },
]

export const availableAssessments: Assessment[] = [
  { id: 1, name: 'تقييم تطوير الويب الشامل', type: 'مهاري', duration: 'مرن', durationMinutes: 20, questionsCount: 10, icon: 'mdi-vuejs', color: 'success', pool: WEB_POOL },
  { id: 2, name: 'تحليل الشخصية المهنية', type: 'شخصي', duration: 'مرن', durationMinutes: 15, questionsCount: 10, icon: 'mdi-head-cog-outline', color: 'secondary', pool: WEB_POOL },
  { id: 3, name: 'لعبة المنطق والذكاء', type: 'لعبة', duration: 'مرن', durationMinutes: 10, questionsCount: 10, icon: 'mdi-puzzle-outline', color: 'accent', pool: WEB_POOL },
  { id: 4, name: 'أساسيات JavaScript', type: 'مهاري', duration: 'مرن', durationMinutes: 20, questionsCount: 10, icon: 'mdi-language-javascript', color: 'warning', pool: WEB_POOL },
]

// Test sizes (doc §7.1): quick / medium / full with a time estimate.
export const TEST_SIZES = [
  { value: 10, label: 'سريع', minutes: 10 },
  { value: 25, label: 'متوسط', minutes: 25 },
  { value: 50, label: 'شامل', minutes: 50 },
] as const

// Build a unique question set of the requested size by cycling + reindexing the
// pool (mock of "توليد فريد لكل محاولة"). A seed varies the starting offset.
export function buildQuestions(pool: AssessmentQuestion[], size: number, seed = 0): AssessmentQuestion[] {
  const out: AssessmentQuestion[] = []
  for (let i = 0; i < size; i++) {
    const base = pool[(i + seed) % pool.length]
    out.push({ ...base, id: i + 1 })
  }
  return out
}

// Score a completed attempt. Objective types check the key; subjective types
// earn credit for a genuine (non-empty) answer.
export function scoreAnswer(q: AssessmentQuestion, answer: unknown): boolean {
  switch (q.type) {
    case 'mcq':
    case 'truefalse':
      return answer === q.correctIndex
    case 'sequencing':
      return Array.isArray(answer) && q.correctOrder != null && answer.join(',') === q.correctOrder.join(',')
    case 'matching': {
      if (typeof answer !== 'object' || answer == null || !q.pairs)
        return false
      const map = answer as Record<number, number>
      return q.pairs.every((_, i) => map[i] === i)
    }
    case 'rank':
      return Array.isArray(answer) && answer.length > 0
    default: {
      // open / fileupload / recording / imageanalysis / mindmap
      if (typeof answer === 'string')
        return answer.trim().length > 0
      return Array.isArray(answer) ? answer.length > 0 : !!answer
    }
  }
}

export function getAssessmentById(id: number): Assessment | undefined {
  return availableAssessments.find(a => a.id === id)
}

// — Daily / weekly challenges (doc §7.1) —
export interface Challenge {
  id: number
  title: string
  cadence: 'daily' | 'weekly'
  reward: number // points
  icon: string
  progress: number // 0-100
}
export const challenges: Challenge[] = [
  { id: 1, title: 'أكمل اختبارًا سريعًا اليوم', cadence: 'daily', reward: 50, icon: 'mdi-flash-outline', progress: 0 },
  { id: 2, title: 'أجب 3 أسئلة تحليلية مفتوحة', cadence: 'daily', reward: 40, icon: 'mdi-text-long', progress: 33 },
  { id: 3, title: 'حقّق 80%+ في اختبار شامل هذا الأسبوع', cadence: 'weekly', reward: 200, icon: 'mdi-trophy-outline', progress: 60 },
  { id: 4, title: 'جرّب 5 أنماط أسئلة مختلفة', cadence: 'weekly', reward: 120, icon: 'mdi-shape-outline', progress: 40 },
]

// — Leaderboard + points (doc §7.1) —
export interface LeaderRow {
  rank: number
  name: string
  initial: string
  points: number
  you?: boolean
}
export const leaderboard: LeaderRow[] = [
  { rank: 1, name: 'ليان الحربي', initial: 'ل', points: 4820 },
  { rank: 2, name: 'محمد القرني', initial: 'م', points: 4310 },
  { rank: 3, name: 'أحمد (أنت)', initial: 'أ', points: 3980, you: true },
  { rank: 4, name: 'سارة الزهراني', initial: 'س', points: 3640 },
  { rank: 5, name: 'عبدالله المالكي', initial: 'ع', points: 3110 },
]
export const myPoints = 3980

export const completedAssessments: CompletedAssessment[] = [
  { id: 101, name: 'أساسيات HTML & CSS', date: '2026-06-12', score: 92, level: 'متقدم' },
  { id: 102, name: 'مهارات التواصل', date: '2026-05-28', score: 78, level: 'متوسط' },
]
