// Shared AI service contracts — mock now, Claude API later (same interface)

export interface SkillLevelResult {
  level: 'entry' | 'mid' | 'advanced' | 'expert'
  confidence: number // 0-100
  rationale: string
}

export interface TrustTip {
  text: string
  gain: number // estimated % gain
  action?: string // route name to deep-link
  actionLabel?: string
}

export interface InterviewQuestion {
  id: number
  text: string
  competency: string
}

export interface AnswerEvaluation {
  score: number // 0-100
  feedback: string
}

export interface VideoAnalysis {
  bodyLanguage: number // 0-100
  tone: number // 0-100
  confidence: number // 0-100
  pace: number // 0-100 speaking pace suitability
  eyeContact: number // 0-100
  note: string
  tips: string[] // actionable delivery tips
}

export interface UploadAnalysis {
  fileName: string
  summary: string
  strengths: string[]
  improvements: string[]
  atsKeywords: string[]
}

// — Certified Interviewers Marketplace (phase 5) —
export interface InterviewerEligibility {
  score: number // 0-100 initial eligibility
  strengths: string[]
  gaps: string[]
  recommendation: 'accept' | 'review' | 'reject'
  note: string
}

export interface PricingSuggestion {
  min: number
  max: number
  note: string
}

export interface InterviewerRank {
  id: number
  match: number // 0-100
  reason: string
}

export interface EvaluationReview {
  summary: string
  suggestions: string[]
}

// — Public reviews (dual rating) —
export interface ReviewsDigest {
  summary: string // one-line AI summary of the review body
  traits: string[] // most-frequent traits/keywords extracted from comments
}

export interface SkillInsight {
  skill: string // weakest verified skill name
  confidence: number
  message: string // AI comparison / focus advice
}

export interface InterviewRecommendation {
  level: InterviewLevel
  skill: string
  reason: string
  trustGain: number // estimated % gain
}

export interface ProactiveNudge {
  icon: string
  text: string
  action?: string // route name to deep-link
  actionLabel?: string
  tone: 'info' | 'success' | 'warning'
}

export interface GeneratedFaq {
  question: string
  answer: string
}

export interface RequestPerformance {
  message: string
  bestCategory: string
  acceptRate: number
}

export type InterviewType = 'ai_text' | 'ai_video' | 'external' | 'expert'
export type InterviewLevel = 'basic' | 'intermediate' | 'advanced' | 'expert'

export interface AiService {
  skillLevel: (proofScore: number) => SkillLevelResult
  trustAnalysis: (factors: { key: string, label: string, value: number }[]) => TrustTip[]
  interviewQuestions: (type: InterviewType, level: InterviewLevel) => InterviewQuestion[]
  evaluateAnswer: (question: string, answer: string) => AnswerEvaluation
  videoAnalysis: () => VideoAnalysis
  suggestProofRequest: (skillName: string) => string
  // — extended contracts (batch 1) —
  skillRationale: (skillName: string, proofSummary: { type: string, weight: number }[], confidence: number) => string
  skillInsight: (skills: { name: string, confidence: number }[]) => SkillInsight | null
  trustMotivation: (delta: number, score: number) => string
  interviewHint: (questionText: string, competency: string) => string
  recommendInterview: (unverifiedSkills: string[]) => InterviewRecommendation | null
  proactiveNudges: (ctx: { trust: number, trustDelta: number, pendingProofs: number, unverifiedSkills: string[], route?: string }) => ProactiveNudge[]
  // — requests marketplace (batch 2) —
  searchSuggestions: (query: string) => string[]
  negotiationDraft: (requestTitle: string, org: string, strengths: string[]) => string
  generatedFaqs: (requestTitle: string, requestType: string) => GeneratedFaq[]
  applicationForecast: (org: string, avgResponseDays: number) => string
  requestPerformance: (stats: { category: string, applied: number, accepted: number }[]) => RequestPerformance
  // — deeper AI (batch 3) —
  assistantReply: (question: string, ctx: { trust: number, unverifiedSkills: string[], lastInterviewScore: number | null, route?: string }) => string
  assistantSuggestions: (ctx: { unverifiedSkills: string[], pendingProofs: number, route?: string }) => string[]
  analyzeUpload: (fileName: string) => UploadAnalysis
  // — certified interviewers marketplace (phase 5) —
  interviewerEligibility: (quals: { years: number, certs: number, endorsements: number, hasLicense?: boolean }) => InterviewerEligibility
  suggestInterviewerPricing: (kind: string, years: number) => PricingSuggestion
  interviewerMatch: (candidate: { field: string, skills: string[] }, interviewer: { type: string, specialties: string[] }) => number
  recommendInterviewers: (candidate: { field: string, skills: string[] }, interviewers: { id: number, type: string, specialties: string[] }[]) => InterviewerRank[]
  suggestEvaluationQuestions: (kind: string) => string[]
  reviewEvaluationReport: (draft: { strengths: string, improvements: string, level: string }) => EvaluationReview
  // — public reviews (dual rating) —
  reviewsDigest: (comments: string[]) => ReviewsDigest
  suggestReviewReply: (stars: number, comment: string) => string
}
