import type { MarketExpertRole } from '@/stores/ExpertRolesStore'

// ===== التصنيف المتكامل لمسمّيات وأدوار المنصة =====
// (وفق تصنيف المالك، 5 يوليو 2026) — مصدر الحقيقة الوحيد للمسمّيات.
// المبدأ المعتمد: الفئتان 1 و2 «شخصيّات/أنواع» (صفات على الملف، لا أدوار)،
// والفئة 3 «تخصّصات» تندرج تحت أدوار الخبراء الحالية، والحوكمة مجموعة منفصلة.

// —— 1) شخصيّات الباحث (Personas) — صفة على ملف الباحث (نفس الدور واللوحة) ——
export type SeekerPersona
  = | 'job_seeker'
    | 'fresh_graduate'
    | 'internship_seeker'
    | 'career_transitioner'
    | 'freelancer'
    | 'distinguished_graduate'
    | 'active_retiree'

export const SEEKER_PERSONA_META: Record<SeekerPersona, { label: string, en: string, icon: string, desc: string }> = {
  job_seeker: { label: 'باحث عن عمل', en: 'Job Seeker', icon: 'mdi-account-search-outline', desc: 'يبحث عن فرصة عمل بدوام كامل أو جزئي.' },
  fresh_graduate: { label: 'خريج جديد', en: 'Fresh Graduate', icon: 'mdi-school-outline', desc: 'حديث التخرج يبحث عن أول فرصة مهنية.' },
  internship_seeker: { label: 'باحث عن تدريب', en: 'Internship Seeker', icon: 'mdi-clipboard-account-outline', desc: 'طالب أو خريج يبحث عن تدريب عملي لاكتساب الخبرة.' },
  career_transitioner: { label: 'باحث عن انتقال مهني', en: 'Career Transitioner', icon: 'mdi-swap-horizontal-bold', desc: 'محترف يسعى لتغيير مساره أو مجاله المهني.' },
  freelancer: { label: 'مستقل', en: 'Freelancer', icon: 'mdi-laptop-account', desc: 'يقدّم خدماته عبر مشاريع قصيرة أو متوسطة المدى.' },
  distinguished_graduate: { label: 'خريج متميّز', en: 'Distinguished Graduate', icon: 'mdi-medal-outline', desc: 'خريج بتقدير امتياز أو إنجازات مبكرة.' },
  active_retiree: { label: 'متقاعد نشط', en: 'Active Retiree', icon: 'mdi-account-clock-outline', desc: 'خبير سابق يرغب بعمل جزئي أو استشارات مهنية.' },
}
export const SEEKER_PERSONAS = Object.keys(SEEKER_PERSONA_META) as SeekerPersona[]

// —— 2) أنواع جهات التوظيف (Employer Types) — صفة على ملف الشركة ——
export type OrgType
  = | 'enterprise'
    | 'sme'
    | 'startup'
    | 'government'
    | 'nonprofit'
    | 'recruitment_agency'

export const ORG_TYPE_META: Record<OrgType, { label: string, en: string, icon: string, desc: string }> = {
  enterprise: { label: 'شركة كبرى', en: 'Enterprise', icon: 'mdi-office-building-outline', desc: 'منظمة كبيرة متعددة الأقسام والفروع.' },
  sme: { label: 'منشأة صغيرة أو متوسطة', en: 'SME', icon: 'mdi-store-outline', desc: 'شركة بحجم صغير أو متوسط في نطاق محلي أو إقليمي.' },
  startup: { label: 'شركة ناشئة', en: 'Startup', icon: 'mdi-rocket-launch-outline', desc: 'منشأة حديثة التأسيس ذات نمو متسارع.' },
  government: { label: 'جهة حكومية / شبه حكومية', en: 'Government', icon: 'mdi-bank-outline', desc: 'مؤسسة تابعة للدولة أو ذات ملكية مشتركة.' },
  nonprofit: { label: 'منظمة غير ربحية', en: 'Nonprofit / NGO', icon: 'mdi-hand-heart-outline', desc: 'تعمل لأهداف إنسانية أو اجتماعية أو بيئية دون ربح.' },
  recruitment_agency: { label: 'وكالة توظيف واستقطاب', en: 'Recruitment Agency', icon: 'mdi-account-tie-outline', desc: 'وسيط مهني بين الباحثين وجهات التوظيف.' },
}
export const ORG_TYPES = Object.keys(ORG_TYPE_META) as OrgType[]

// —— 3) تخصّصات الخبراء (Specialties) — تندرج تحت أدوار الخبراء الحالية ——
export type ExpertSpecialty
  = | 'career_coach'
    | 'mentor'
    | 'interview_coach'
    | 'cv_specialist'
    | 'technical_trainer'
    | 'skills_trainer'
    | 'career_consultant'
    | 'transition_consultant'
    | 'recruitment_expert'
    | 'market_analyst'
    | 'certified_evaluator'

/** لكل تخصّص: مسمّاه ودلوه (الدور الأب) — لتجميعه في السوق والاختيار */
export const EXPERT_SPECIALTY_META: Record<ExpertSpecialty, { label: string, en: string, icon: string, bucket: MarketExpertRole | 'interviewer', desc: string }> = {
  career_coach: { label: 'مرشد مهني', en: 'Career Coach', icon: 'mdi-compass-outline', bucket: 'coach', desc: 'إرشاد فردي لتحديد المسار وتحقيق الأهداف.' },
  mentor: { label: 'موجّه مهني', en: 'Mentor', icon: 'mdi-account-supervisor-outline', bucket: 'coach', desc: 'توجيه طويل الأمد لشخص أو مجموعة صغيرة.' },
  interview_coach: { label: 'مدرب مقابلات', en: 'Interview Coach', icon: 'mdi-account-voice', bucket: 'coach', desc: 'تدريب على اجتياز المقابلات من التحضير للمتابعة.' },
  cv_specialist: { label: 'أخصائي سيرة ذاتية', en: 'CV / Resume Specialist', icon: 'mdi-file-account-outline', bucket: 'coach', desc: 'كتابة وتحسين السير والملفات المهنية.' },
  technical_trainer: { label: 'مدرب تقني', en: 'Technical Trainer', icon: 'mdi-laptop', bucket: 'trainer', desc: 'برامج تدريبية في مجالات تقنية محددة.' },
  skills_trainer: { label: 'مدرب مهارات مهنية', en: 'Professional Skills Trainer', icon: 'mdi-account-star-outline', bucket: 'trainer', desc: 'تطوير مهارات عامة كالتواصل والقيادة وإدارة الوقت.' },
  career_consultant: { label: 'مستشار مهني', en: 'Career Consultant', icon: 'mdi-lightbulb-on-outline', bucket: 'consultant', desc: 'استشارات استراتيجية للأفراد والمؤسسات حول المسار وهيكلة المواهب.' },
  transition_consultant: { label: 'مستشار انتقال مهني', en: 'Career Transition Consultant', icon: 'mdi-transit-connection-variant', bucket: 'consultant', desc: 'يدعم المحترفين الراغبين بتغيير مجالاتهم بالكامل.' },
  recruitment_expert: { label: 'خبير توظيف واستقطاب', en: 'Recruitment Expert', icon: 'mdi-account-search', bucket: 'consultant', desc: 'استراتيجيات جذب المواهب وبناء علامة جهة التوظيف واختيار المرشحين.' },
  market_analyst: { label: 'محلل سوق العمل', en: 'Job Market Analyst', icon: 'mdi-chart-timeline-variant', bucket: 'consultant', desc: 'دراسات عن اتجاهات السوق والمهارات المطلوبة والرواتب.' },
  certified_evaluator: { label: 'مقيّم مهني معتمد', en: 'Certified Career Evaluator', icon: 'mdi-star-check-outline', bucket: 'interviewer', desc: 'يقيّم الكفاءات وفق معايير معتمدة ويصدر تقارير معتمدة.' },
}
export const EXPERT_SPECIALTIES = Object.keys(EXPERT_SPECIALTY_META) as ExpertSpecialty[]

/** تخصّصات دلو (دور) معيّن */
export function specialtiesForBucket(bucket: MarketExpertRole | 'interviewer'): ExpertSpecialty[] {
  return EXPERT_SPECIALTIES.filter(s => EXPERT_SPECIALTY_META[s].bucket === bucket)
}

// —— 4) مجموعة الحوكمة (Governance) — إدارة منصة لا خدمة فردية، قرب admin ——
export type GovernanceRole = 'content_reviewer' | 'community_guide'
export const GOVERNANCE_META: Record<GovernanceRole, { label: string, en: string, icon: string, desc: string }> = {
  content_reviewer: { label: 'مراجع محتوى مهني', en: 'Professional Content Reviewer', icon: 'mdi-file-check-outline', desc: 'يراجع ويدقّق المحتوى المهني المنشور (مواد تدريبية، مقالات، أدلة).' },
  community_guide: { label: 'موجّه مجتمع مهني', en: 'Professional Community Guide', icon: 'mdi-account-group-outline', desc: 'يدير تفاعلات المجتمع المهني وينظّم الفعاليات والنقاشات.' },
}
export const GOVERNANCE_ROLES = Object.keys(GOVERNANCE_META) as GovernanceRole[]
