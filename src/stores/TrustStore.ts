import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useProfileStore, skillConfidence } from '@/stores/ProfileStore'
import { useApplicationsStore } from '@/stores/ApplicationsStore'
import { useMessagesStore } from '@/stores/MessagesStore'
import { ai } from '@/services/ai'

export interface TrustFactor {
  key: string
  label: string
  weight: number // percentage weight
  value: number // 0-100 current value
}

export const useTrustStore = defineStore('trust', () => {
  const profile = useProfileStore()
  const applications = useApplicationsStore()
  const messages = useMessagesStore()

  // Each factor computed from real store data where possible, else a stable mock value
  const factors = computed<TrustFactor[]>(() => {
    // Completeness: sections filled
    let completeness = 40
    if (profile.skills.length >= 3)
      completeness += 20
    if (profile.experiences.length >= 1)
      completeness += 20
    if (profile.certificates.length >= 1)
      completeness += 20
    completeness = Math.min(100, completeness)

    // Skills proof: avg confidence across skills
    const skillsProof = profile.skills.length
      ? Math.round(profile.skills.reduce((s, k) => s + skillConfidence(k), 0) / profile.skills.length)
      : 0

    // Interaction: applications + conversations
    const interaction = Math.min(100, applications.count * 12 + messages.conversations.length * 8)

    return [
      { key: 'completeness', label: 'اكتمال البيانات', weight: 20, value: completeness },
      { key: 'endorsements', label: 'التوصيات', weight: 25, value: 80 },
      { key: 'assessments', label: 'نتائج الاختبارات', weight: 20, value: 75 },
      { key: 'skills', label: 'إثبات المهارات', weight: 15, value: skillsProof },
      { key: 'interaction', label: 'حجم التفاعل', weight: 5, value: interaction },
      { key: 'recency', label: 'حداثة البيانات', weight: 5, value: 90 },
      { key: 'activity', label: 'النشاط والاستجابة', weight: 5, value: 70 },
      { key: 'interviews', label: 'المقابلات المُنجزة', weight: 5, value: 40 },
    ]
  })

  const score = computed(() =>
    Math.round(factors.value.reduce((sum, f) => sum + (f.value * f.weight) / 100, 0)),
  )

  const level = computed<{ label: string, color: string }>(() => {
    if (score.value >= 70)
      return { label: 'موثوق', color: 'success' }
    if (score.value >= 40)
      return { label: 'متوسط', color: 'warning' }
    return { label: 'منخفض', color: 'error' }
  })

  const tips = computed(() =>
    ai.trustAnalysis(factors.value.map(f => ({ key: f.key, label: f.label, value: f.value }))),
  )

  return { factors, score, level, tips }
})
