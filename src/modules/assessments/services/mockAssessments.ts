export interface AssessmentQuestion {
  id: number
  text: string
  options: string[]
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
  questions: AssessmentQuestion[]
}

export interface CompletedAssessment {
  id: number
  name: string
  date: string
  score: number
  level: string
}

const SAMPLE_QUESTIONS: AssessmentQuestion[] = [
  { id: 1, text: 'ما الناتج عن التعبير: typeof null في JavaScript؟', options: ['"null"', '"object"', '"undefined"', '"number"'] },
  { id: 2, text: 'أي طريقة تُستخدم لإضافة عنصر لنهاية المصفوفة؟', options: ['push()', 'pop()', 'shift()', 'unshift()'] },
  { id: 3, text: 'ما الكلمة المفتاحية التي تُنشئ متغيراً لا يمكن إعادة تعيينه؟', options: ['let', 'var', 'const', 'static'] },
  { id: 4, text: 'ماذا يُعيد Promise عند نجاحه؟', options: ['reject', 'resolve', 'throw', 'catch'] },
  { id: 5, text: 'أي مما يلي ليس نوعاً بدائياً (primitive) في JavaScript؟', options: ['string', 'number', 'array', 'boolean'] },
]

export const availableAssessments: Assessment[] = [
  { id: 1, name: 'أساسيات JavaScript', type: 'مهاري', duration: '20 دقيقة', durationMinutes: 20, questionsCount: 5, icon: 'mdi-language-javascript', color: 'warning', questions: SAMPLE_QUESTIONS },
  { id: 2, name: 'تحليل الشخصية المهنية', type: 'شخصي', duration: '15 دقيقة', durationMinutes: 15, questionsCount: 5, icon: 'mdi-head-cog-outline', color: 'secondary', questions: SAMPLE_QUESTIONS },
  { id: 3, name: 'لعبة المنطق والذكاء', type: 'لعبة', duration: '10 دقائق', durationMinutes: 10, questionsCount: 5, icon: 'mdi-puzzle-outline', color: 'accent', questions: SAMPLE_QUESTIONS },
  { id: 4, name: 'مهارات Vue.js المتقدمة', type: 'مهاري', duration: '30 دقيقة', durationMinutes: 30, questionsCount: 5, icon: 'mdi-vuejs', color: 'success', questions: SAMPLE_QUESTIONS },
]

export const completedAssessments: CompletedAssessment[] = [
  { id: 101, name: 'أساسيات HTML & CSS', date: '2026-06-12', score: 92, level: 'متقدم' },
  { id: 102, name: 'مهارات التواصل', date: '2026-05-28', score: 78, level: 'متوسط' },
]

export function getAssessmentById(id: number): Assessment | undefined {
  return availableAssessments.find(a => a.id === id)
}
