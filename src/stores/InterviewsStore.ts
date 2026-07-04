import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { InterviewLevel, InterviewTrack, InterviewType } from '@/services/ai'
import { syncPrivateDoc } from '@/services/cloudSync'
import { useGamificationStore } from '@/stores/GamificationStore'

export interface CompetencyScore { name: string, score: number }

export interface InterviewResult {
  score: number
  level: string
  competencies: CompetencyScore[]
  strengths: string[]
  improvements: string[]
  recommendations: string[]
  video?: { bodyLanguage: number, tone: number, confidence: number, pace: number, eyeContact: number, note: string, tips: string[] }
}

export interface Interview {
  id: number
  type: InterviewType
  level: InterviewLevel
  track?: InterviewTrack
  status: 'scheduled' | 'in_progress' | 'completed'
  date: string
  cost: number
  result?: InterviewResult
}

export const TYPE_META: Record<InterviewType, { label: string, icon: string, desc: string }> = {
  ai_text: { label: 'مقابلة AI نصية', icon: 'mdi-message-text-outline', desc: 'أسئلة تفاعلية يُقيّمها الذكاء الاصطناعي' },
  ai_video: { label: 'مقابلة AI بالفيديو', icon: 'mdi-video-outline', desc: 'تحليل لغة الجسد ونبرة الصوت' },
  external: { label: 'مقابلة خارجية', icon: 'mdi-domain', desc: 'مع جهة توظيف (تُوثّق في النظام)' },
  expert: { label: 'مقابلة مع خبير', icon: 'mdi-account-tie', desc: 'تقييم معمّق من خبير معتمد' },
}

export const LEVEL_META: Record<InterviewLevel, { label: string, cost: number, color: string }> = {
  basic: { label: 'أساسي', cost: 0, color: 'info' },
  intermediate: { label: 'متوسط', cost: 49, color: 'secondary' },
  advanced: { label: 'متقدم', cost: 149, color: 'accent' },
  expert: { label: 'خبير', cost: 299, color: 'primary' },
}

const STORAGE_KEY = 'interviews'

const seed: Interview[] = [
  {
    id: 1,
    type: 'ai_text',
    level: 'intermediate',
    status: 'completed',
    date: '2026-06-18',
    cost: 49,
    result: {
      score: 82,
      level: 'متوسط',
      competencies: [
        { name: 'حل المشكلات', score: 85 },
        { name: 'الجودة', score: 80 },
        { name: 'إدارة الوقت', score: 78 },
        { name: 'العمل الجماعي', score: 84 },
      ],
      strengths: ['وضوح في شرح الحلول', 'أمثلة عملية ملموسة'],
      improvements: ['دعم الإجابات بأرقام قابلة للقياس'],
      recommendations: ['جرّب مقابلة متقدمة لإثبات المهارات القيادية'],
    },
  },
]

function load(): Interview[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return seed.map(i => ({ ...i }))
  try {
    return JSON.parse(raw) as Interview[]
  }
  catch {
    return seed.map(i => ({ ...i }))
  }
}

let nextId = 400

export const useInterviewsStore = defineStore('interviews', () => {
  const interviews = ref<Interview[]>(load())

  watch(interviews, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'interviews',
    snapshot: () => interviews.value,
    apply: (incoming) => {
      if (Array.isArray(incoming))
        interviews.value = incoming as Interview[]
    },
    source: interviews,
  })

  const completed = computed(() => interviews.value.filter(i => i.status === 'completed'))
  const count = computed(() => interviews.value.length)

  // Trust factor value (0-100): avg of completed scores, else 0
  const trustValue = computed(() => {
    if (!completed.value.length)
      return 0
    return Math.round(completed.value.reduce((s, i) => s + (i.result?.score ?? 0), 0) / completed.value.length)
  })

  const highestLevel = computed(() => {
    const order: InterviewLevel[] = ['basic', 'intermediate', 'advanced', 'expert']
    let best = -1
    completed.value.forEach((i) => {
      best = Math.max(best, order.indexOf(i.level))
    })
    return best >= 0 ? LEVEL_META[order[best]].label : 'لا يوجد'
  })

  function start(type: InterviewType, level: InterviewLevel, track?: InterviewTrack): number {
    const id = nextId++
    interviews.value.unshift({
      id,
      type,
      level,
      track,
      status: 'in_progress',
      date: 'الآن',
      cost: LEVEL_META[level].cost,
    })
    return id
  }

  function complete(id: number, result: InterviewResult) {
    const iv = interviews.value.find(x => x.id === id)
    if (iv) {
      iv.status = 'completed'
      iv.result = result
      useGamificationStore().record(iv.type === 'expert' ? 'expertInterview' : 'aiInterview', 'أنجزت مقابلة')
    }
  }

  function getById(id: number) {
    return interviews.value.find(i => i.id === id)
  }

  return { interviews, syncStatus, completed, count, trustValue, highestLevel, start, complete, getById }
})
