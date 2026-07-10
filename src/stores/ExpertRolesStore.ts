import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { ExpertSpecialty } from '@/services/personas'
import { syncPrivateDoc } from '@/services/cloudSync'
import { useNotificationsStore } from '@/stores/NotificationsStore'
import { useWalletStore } from '@/stores/WalletStore'

// ===== أدوار توسعة النظام البيئي: المرشد المهني + المدرب التقني + المستشار المهني =====
// (وثيقة «شريك النجاح» — الأدوار 7-9 من خارطة الطريق)

// —— المرشد المهني (Career Coach) ——
export interface CoachProgram {
  id: number
  name: string
  duration: string // شهري / ربع سنوي...
  price: number // شهريًا
  seats: number
  enrolled: number
}
export interface CoachClient {
  id: number
  name: string
  initial: string
  goal: string
  program: string
  progress: number // 0-100
  nextSession: string
}

// —— المدرب التقني (Tech Trainer) ——
export interface Course {
  id: number
  title: string
  skill: string
  kind: 'دورة مكثفة' | 'ورشة عمل'
  price: number
  seats: number
  enrolled: number
  status: 'open' | 'running' | 'done'
}
export interface TraineeReferral {
  id: number
  name: string
  initial: string
  gap: string // الفجوة المكتشفة من نتائج التقييم
  source: string // من رشّحه
  status: 'new' | 'enrolled' | 'declined'
}

// —— المستشار المهني (Industry Consultant) ——
export interface ConsultingRequest {
  id: number
  company: string
  topic: string
  scope: 'بالساعة' | 'مشروع'
  budget: string
  status: 'new' | 'accepted' | 'in_progress' | 'done' | 'declined'
  date: string
}

// —— جانب الطلب: دليل الخبراء في السوق الموحّد ——
export type MarketExpertRole = 'coach' | 'trainer' | 'consultant'

// نظام درجات الخبراء (مماثل لدرجات المقيّم المعتمد) — يعكس حجم الأثر والخبرة
export type ExpertTier = 'rising' | 'established' | 'certified' | 'master'
export const EXPERT_TIER_META: Record<ExpertTier, { label: string, color: string, icon: string, min: number }> = {
  rising: { label: 'خبير صاعد', color: 'info', icon: 'mdi-trending-up', min: 0 },
  established: { label: 'خبير راسخ', color: 'secondary', icon: 'mdi-star-outline', min: 40 },
  certified: { label: 'خبير معتمد', color: 'primary', icon: 'mdi-shield-star-outline', min: 90 },
  master: { label: 'خبير ماسي', color: 'accent', icon: 'mdi-diamond-stone', min: 180 },
}
/** الدرجة المشتقّة من عدد العملاء/المتدربين */
export function expertTier(engagements: number): ExpertTier {
  if (engagements >= EXPERT_TIER_META.master.min)
    return 'master'
  if (engagements >= EXPERT_TIER_META.certified.min)
    return 'certified'
  if (engagements >= EXPERT_TIER_META.established.min)
    return 'established'
  return 'rising'
}

// —— عناصر ملف الخبير النموذجي (نظير بيانات المقيّم الغنية) ——
export interface ExpertReview {
  id: number
  author: string
  initial: string
  rating: number // 1-5
  date: string
  service: string // البرنامج/الدورة/الاستشارة التي يخصّها التقييم
  text: string
  reply?: string // ردّ الخبير
}
export interface ExpertSuccessStory {
  id: number
  client: string
  headline: string
  outcome: string
  metric: string // "‎+120% راتب" · "وظيفة خلال 6 أسابيع"
}
export interface ExpertServiceElement {
  id: number
  label: string
  desc: string
  price: number // مقابل إضافي اختياري
}
export interface ExpertArticle {
  id: number
  title: string
  excerpt: string
  readMinutes: number
  date: string
}
export interface ExpertOffer {
  id: number
  label: string
  desc: string
  active: boolean
}
export interface ExpertMarketingStats {
  views: number
  shares: number
  saves: number
  referrals: number
}

export interface MarketExpert {
  id: number
  slug: string
  name: string
  initial: string
  role: MarketExpertRole
  specialtyKey: ExpertSpecialty
  title: string
  specialty: string
  rating: number
  reviewsCount: number
  clients: number // عدد العملاء/المتدربين (يحدّد الدرجة)
  years: number
  priceFrom: number
  priceUnit: string
  verified: boolean
  languages: string[]
  location: string
  bio: string
  specialties: string[]
  serviceElements: ExpertServiceElement[]
  reviews: ExpertReview[]
  successStories: ExpertSuccessStory[]
  articles: ExpertArticle[]
  offers: ExpertOffer[]
  stats: ExpertMarketingStats
}

export const MARKET_ROLE_META: Record<MarketExpertRole, { label: string, icon: string, color: string, service: string }> = {
  coach: { label: 'مرشد مهني', icon: 'mdi-compass-outline', color: 'primary', service: 'برنامج إرشاد دوري' },
  trainer: { label: 'مدرب تقني', icon: 'mdi-school-outline', color: 'teal', service: 'دورة أو ورشة تدريبية' },
  consultant: { label: 'مستشار مهني', icon: 'mdi-lightbulb-on-outline', color: 'warning', service: 'استشارة متخصصة' },
}

export const MARKET_EXPERTS: MarketExpert[] = [
  {
    id: 1,
    slug: 'hind-alzahrani',
    name: 'أ. هند الزهراني',
    initial: 'ه',
    role: 'coach',
    specialtyKey: 'career_coach',
    title: 'مرشدة مسارات تقنية',
    specialty: 'التحول الوظيفي إلى التقنية',
    rating: 4.9,
    reviewsCount: 38,
    clients: 46,
    years: 12,
    priceFrom: 450,
    priceUnit: 'شهريًا',
    verified: true,
    languages: ['العربية', 'الإنجليزية'],
    location: 'الرياض · عن بُعد',
    bio: 'مرشدة مهنية معتمدة (ICF) بخبرة 12 عامًا في قيادة فرق المنتجات التقنية، رافقت أكثر من 40 محترفًا في انتقالهم من مجالات غير تقنية إلى أدوار في تطوير الويب وتحليل البيانات. أبني مع كل عميل خطة 90 يومًا قابلة للقياس تنتهي بمقابلة حقيقية.',
    specialties: ['التحول الوظيفي', 'بناء الحضور المهني', 'التحضير للمقابلات', 'خطة 90 يومًا'],
    serviceElements: [
      { id: 1, label: 'جلسة مراجعة سيرة مكثّفة', desc: 'مراجعة سطرًا بسطر + إعادة صياغة موجّهة لوظيفة مستهدفة', price: 120 },
      { id: 2, label: 'محاكاة مقابلة مسجّلة', desc: 'مقابلة كاملة مع تقرير نقاط قوة ومجالات تحسين', price: 150 },
    ],
    reviews: [
      { id: 1, author: 'نورة المطيري', initial: 'ن', rating: 5, date: 'قبل 3 أسابيع', service: 'برنامج التحول الوظيفي الشامل', text: 'برنامج غيّر مساري فعلًا — انتقلت من الدعم الفني إلى محلّلة بيانات براتب أعلى بـ40%. الخطة كانت واضحة وكل جلسة تنتهي بمهمة عملية.', reply: 'فخورة بك يا نورة، الانضباط كان منكِ!' },
      { id: 2, author: 'عبدالله المالكي', initial: 'ع', rating: 5, date: 'قبل شهرين', service: 'مسار الانطلاق المهني', text: 'كخريج جديد، ساعدتني على ترتيب أولوياتي والحصول على أول عرض عمل خلال 6 أسابيع.' },
    ],
    successStories: [
      { id: 1, client: 'نورة المطيري', headline: 'من الدعم الفني إلى تحليل البيانات', outcome: 'حصلت على وظيفة محلّلة بيانات في شركة تقنية كبرى بعد 5 أشهر من الإرشاد.', metric: '‎+40% راتب' },
    ],
    articles: [
      { id: 1, title: 'خطة 90 يومًا للانتقال إلى التقنية', excerpt: 'إطار عملي مقسّم لثلاث مراحل: الأساس، البناء، ثم الإطلاق نحو المقابلات.', readMinutes: 7, date: 'قبل شهر' },
    ],
    offers: [
      { id: 1, label: 'جلسة تعارف مجانية (20 دقيقة)', desc: 'نحدّد فيها هدفك ومدى ملاءمة البرنامج لك', active: true },
    ],
    stats: { views: 412, shares: 24, saves: 31, referrals: 5 },
  },
  {
    id: 2,
    slug: 'fahad-aldosari-coach',
    name: 'م. فهد الدوسري',
    initial: 'ف',
    role: 'coach',
    specialtyKey: 'mentor',
    title: 'مرشد خريجين ومبتدئين',
    specialty: 'أول وظيفة تقنية',
    rating: 4.7,
    reviewsCount: 61,
    clients: 120,
    years: 8,
    priceFrom: 300,
    priceUnit: 'شهريًا',
    verified: true,
    languages: ['العربية', 'الإنجليزية'],
    location: 'جدة · عن بُعد',
    bio: 'مهندس برمجيات ومرشد للخريجين الجدد، أرشدت أكثر من 120 مبتدئًا للحصول على أول وظيفة تقنية عبر مشاريع محفظة عملية ومراجعات أسبوعية. تركيزي على تحويل المتعلّم النظري إلى مرشّح جاهز للسوق.',
    specialties: ['أول وظيفة', 'بناء محفظة أعمال', 'أساسيات مقابلات الأكواد', 'التوجيه للخريجين'],
    serviceElements: [
      { id: 1, label: 'مراجعة مشروع محفظة', desc: 'تدقيق كود مشروعك مع توصيات لرفع جودته', price: 100 },
    ],
    reviews: [
      { id: 1, author: 'ريان الشهراني', initial: 'ر', rating: 5, date: 'قبل أسبوع', service: 'مسار الانطلاق المهني', text: 'المتابعة الأسبوعية أبقتني منضبطًا. حصلت على تدريب منتهٍ بالتوظيف.' },
      { id: 2, author: 'لمى الغامدي', initial: 'ل', rating: 4, date: 'قبل شهر', service: 'مسار الانطلاق المهني', text: 'محتوى عملي ممتاز، تمنيت لو الجلسات أطول قليلًا.' },
    ],
    successStories: [
      { id: 1, client: 'ريان الشهراني', headline: 'من متعلّم ذاتي إلى مطوّر موظّف', outcome: 'بنى 3 مشاريع محفظة وحصل على تدريب منتهٍ بالتوظيف خلال 4 أشهر.', metric: 'وظيفة خلال 4 أشهر' },
    ],
    articles: [],
    offers: [
      { id: 1, label: 'مراجعة محفظة مجانية للطلاب', desc: 'مراجعة سريعة 15 دقيقة لطلاب السنة الأخيرة', active: true },
    ],
    stats: { views: 688, shares: 41, saves: 52, referrals: 9 },
  },
  {
    id: 3,
    slug: 'nouf-alshehri',
    name: 'م. نوف الشهري',
    initial: 'ن',
    role: 'trainer',
    specialtyKey: 'technical_trainer',
    title: 'مدربة TypeScript معتمدة',
    specialty: 'TypeScript وأنماط Vue المتقدمة',
    rating: 4.8,
    reviewsCount: 94,
    clients: 210,
    years: 9,
    priceFrom: 180,
    priceUnit: 'للورشة',
    verified: true,
    languages: ['العربية', 'الإنجليزية'],
    location: 'الرياض · حضوري وعن بُعد',
    bio: 'مهندسة واجهات أولى ومدرّبة معتمدة، درّبت أكثر من 200 مطوّر على TypeScript وأنماط Vue المتقدمة عبر ورش عملية قائمة على مشاريع حقيقية. أصمّم كل ورشة لتنتهي بمخرَج قابل للاستخدام في العمل مباشرة.',
    specialties: ['TypeScript متقدم', 'Composition API', 'أنماط قابلية إعادة الاستخدام', 'أداء الواجهات'],
    serviceElements: [
      { id: 1, label: 'جلسة تصحيح مشاريع فردية', desc: 'مراجعة كود مشروعك الخاص بعد الورشة', price: 90 },
      { id: 2, label: 'شهادة إتمام موثّقة', desc: 'شهادة برقم تحقّق قابلة للمشاركة', price: 40 },
    ],
    reviews: [
      { id: 1, author: 'خالد الحربي', initial: 'خ', rating: 5, date: 'قبل أسبوعين', service: 'TypeScript المتقدم لمطوري Vue', text: 'أفضل ورشة حضرتها — أمثلة من مشاريع حقيقية وليست نظرية. طبّقت ما تعلّمته في عملي فورًا.' },
      { id: 2, author: 'مها القرني', initial: 'م', rating: 5, date: 'قبل شهر', service: 'أساسيات اختبار الواجهات بـ Vitest', text: 'شرح واضح وصبر كبير مع الأسئلة. رفعت تغطية اختباراتنا من 20% إلى 75%.', reply: 'رائع يا مها، التغطية استثمار طويل الأمد.' },
    ],
    successStories: [
      { id: 1, client: 'فريق منتج «رواء»', headline: 'رفع جودة قاعدة كود كاملة', outcome: 'بعد ورشتين، تبنّى الفريق TypeScript الصارم وقلّل أخطاء الإنتاج بشكل ملحوظ.', metric: '‎-60% أخطاء إنتاج' },
    ],
    articles: [
      { id: 1, title: '5 أنماط Composition API تكتب كودًا أنظف', excerpt: 'أنماط عملية لفصل المنطق وإعادة استخدامه دون تكرار.', readMinutes: 6, date: 'قبل 3 أسابيع' },
    ],
    offers: [
      { id: 1, label: 'خصم 20% للمجموعات (3+)', desc: 'خصم لتسجيل فريق كامل في الورشة نفسها', active: true },
    ],
    stats: { views: 1024, shares: 78, saves: 96, referrals: 14 },
  },
  {
    id: 4,
    slug: 'sultan-alomari',
    name: 'م. سلطان العمري',
    initial: 'س',
    role: 'trainer',
    specialtyKey: 'technical_trainer',
    title: 'مدرب اختبارات وجودة',
    specialty: 'Vitest وتغطية الاختبارات',
    rating: 4.6,
    reviewsCount: 47,
    clients: 95,
    years: 7,
    priceFrom: 220,
    priceUnit: 'للدورة',
    verified: false,
    languages: ['العربية'],
    location: 'الدمام · عن بُعد',
    bio: 'مهندس ضمان جودة ومدرّب، متخصّص في بناء ثقافة الاختبار داخل الفرق. درّبت 95 مطوّرًا على كتابة اختبارات موثوقة بـVitest وتصميم استراتيجيات تغطية عملية بلا هدر.',
    specialties: ['Vitest', 'اختبارات التكامل', 'استراتيجية التغطية', 'أتمتة CI'],
    serviceElements: [
      { id: 1, label: 'تدقيق استراتيجية اختبار الفريق', desc: 'مراجعة إعداد الاختبارات الحالي وخطة تحسين', price: 150 },
    ],
    reviews: [
      { id: 1, author: 'سارة العتيبي', initial: 'س', rating: 5, date: 'قبل أسبوع', service: 'أساسيات اختبار الواجهات بـ Vitest', text: 'دورة عملية جدًا، أزالت رهبة الاختبارات تمامًا.' },
      { id: 2, author: 'ثامر السبيعي', initial: 'ث', rating: 4, date: 'قبل شهرين', service: 'أساسيات اختبار الواجهات بـ Vitest', text: 'مفيدة، وأتمنى إضافة جزء عن اختبارات E2E.' },
    ],
    successStories: [],
    articles: [],
    offers: [],
    stats: { views: 296, shares: 12, saves: 19, referrals: 3 },
  },
  {
    id: 5,
    slug: 'reem-alqahtani',
    name: 'د. ريم القحطاني',
    initial: 'ر',
    role: 'consultant',
    specialtyKey: 'career_consultant',
    title: 'مستشارة قيادة وموارد بشرية',
    specialty: 'هيكلة الفرق ورواتب السوق',
    rating: 4.8,
    reviewsCount: 29,
    clients: 38,
    years: 14,
    priceFrom: 600,
    priceUnit: 'للساعة',
    verified: true,
    languages: ['العربية', 'الإنجليزية'],
    location: 'الرياض · حضوري وعن بُعد',
    bio: 'مستشارة قيادة بخبرة 14 عامًا في بناء وهيكلة فرق التقنية، ساعدت 38 جهة على تصميم مساراتها الوظيفية وسلالمها للرواتب بما يتماشى مع السوق. أعمل بالبيانات لا بالانطباعات.',
    specialties: ['هيكلة الفرق', 'سلالم الرواتب', 'مسارات التطور', 'تقييم الأداء'],
    serviceElements: [
      { id: 1, label: 'تقرير مكتوب شامل', desc: 'تقرير نهائي بالتوصيات وخطة التنفيذ', price: 250 },
      { id: 2, label: 'جلسة عرض للإدارة التنفيذية', desc: 'عرض النتائج على القيادة مع نقاش', price: 300 },
    ],
    reviews: [
      { id: 1, author: 'شركة تقنية المستقبل', initial: 'ت', rating: 5, date: 'قبل شهر', service: 'هيكلة فريق الواجهات', text: 'استشارة رفعت وضوح المسارات الوظيفية لدينا وخفّضت دوران الموظفين. توصيات عملية وقابلة للتطبيق فورًا.', reply: 'سعدت بالعمل معكم، التطبيق السريع صنع الفرق.' },
    ],
    successStories: [
      { id: 1, client: 'شركة تقنية المستقبل', headline: 'إعادة هيكلة مسارات فريق الهندسة', outcome: 'صمّمنا سلّم رواتب ومسار تطور واضحًا خفّض دوران الموظفين خلال ربعين.', metric: '‎-30% دوران موظفين' },
    ],
    articles: [
      { id: 1, title: 'كيف تبني سلّم رواتب عادلًا ومنافسًا', excerpt: 'منهجية لربط الرواتب بمستويات الأثر لا بسنوات الخبرة فقط.', readMinutes: 9, date: 'قبل شهرين' },
    ],
    offers: [
      { id: 1, label: 'جلسة استكشافية مخفّضة', desc: 'أول 30 دقيقة بنصف السعر لتقييم الاحتياج', active: true },
    ],
    stats: { views: 534, shares: 33, saves: 40, referrals: 6 },
  },
  {
    id: 6,
    slug: 'omar-bawazir',
    name: 'م. عمر باوزير',
    initial: 'ع',
    role: 'consultant',
    specialtyKey: 'market_analyst',
    title: 'مستشار هندسة بيانات',
    specialty: 'اتجاهات سوق البيانات والرواتب',
    rating: 4.5,
    reviewsCount: 18,
    clients: 22,
    years: 10,
    priceFrom: 500,
    priceUnit: 'للساعة',
    verified: true,
    languages: ['العربية', 'الإنجليزية'],
    location: 'جدة · عن بُعد',
    bio: 'مهندس بيانات أول ومستشار، أساعد الجهات على اتخاذ قرارات مبنية على اتجاهات السوق: من تصميم فرق البيانات إلى معايير الرواتب واختيار المكدّس التقني المناسب لمرحلتها.',
    specialties: ['فرق البيانات', 'معايير الرواتب', 'اختيار المكدّس التقني', 'خارطة طريق البيانات'],
    serviceElements: [
      { id: 1, label: 'خارطة طريق بيانات ربع سنوية', desc: 'خطة أولويات مرتّبة حسب الأثر', price: 200 },
    ],
    reviews: [
      { id: 1, author: 'مؤسسة البناء الرقمي', initial: 'ب', rating: 5, date: 'قبل أسبوعين', service: 'اتجاهات رواتب مطوري البيانات', text: 'أرقام دقيقة ورؤية واضحة ساعدتنا على تعديل عروضنا وكسب مرشّحين أفضل.' },
      { id: 2, author: 'فريق تحليلات «نُهى»', initial: 'ن', rating: 4, date: 'قبل شهر', service: 'استشارة اختيار مكدّس', text: 'نصائح جيدة، والقرار النهائي كان أسهل بكثير بعد الجلسة.' },
    ],
    successStories: [],
    articles: [
      { id: 1, title: 'مكدّس البيانات المناسب لمرحلة شركتك', excerpt: 'دليل لاختيار الأدوات حسب حجم الفريق والميزانية بدل تقليد الكبار.', readMinutes: 8, date: 'قبل 3 أسابيع' },
    ],
    offers: [],
    stats: { views: 318, shares: 15, saves: 21, referrals: 2 },
  },
  {
    id: 7,
    slug: 'lama-alsubaie',
    name: 'أ. لمى السبيعي',
    initial: 'ل',
    role: 'coach',
    specialtyKey: 'interview_coach',
    title: 'مدرّبة مقابلات وظيفية',
    specialty: 'إتقان المقابلات السلوكية والتقنية',
    rating: 4.8,
    reviewsCount: 41,
    clients: 58,
    years: 8,
    priceFrom: 180,
    priceUnit: 'للجلسة',
    verified: true,
    languages: ['العربية', 'الإنجليزية'],
    location: 'الرياض · عن بُعد',
    bio: 'مدرّبة مقابلات متخصّصة، رافقت أكثر من 50 مرشّحًا للاستعداد لمقابلات الشركات الكبرى عبر محاكاة واقعية وتغذية راجعة بنيوية ترفع الثقة والأداء.',
    specialties: ['المقابلات السلوكية', 'محاكاة المقابلات', 'التفاوض على العرض', 'لغة الجسد'],
    serviceElements: [
      { id: 1, label: 'محاكاة مقابلة كاملة مسجّلة', desc: 'مقابلة واقعية مع تقرير نقاط قوة ومجالات تحسين', price: 160 },
    ],
    reviews: [
      { id: 1, author: 'وليد الحارثي', initial: 'و', rating: 5, date: 'قبل أسبوعين', service: 'محاكاة مقابلة تقنية', text: 'المحاكاة كانت أصعب من المقابلة الحقيقية — دخلت واثقًا وحصلت على العرض.' },
    ],
    successStories: [],
    articles: [],
    offers: [],
    stats: { views: 214, shares: 9, saves: 17, referrals: 4 },
  },
  {
    id: 8,
    slug: 'faisal-alqahtani',
    name: 'أ. فيصل القحطاني',
    initial: 'ف',
    role: 'coach',
    specialtyKey: 'cv_specialist',
    title: 'أخصائي سير ذاتية وحضور مهني',
    specialty: 'سير ذاتية تجتاز أنظمة ATS',
    rating: 4.7,
    reviewsCount: 63,
    clients: 120,
    years: 6,
    priceFrom: 90,
    priceUnit: 'للسيرة',
    verified: false,
    languages: ['العربية', 'الإنجليزية'],
    location: 'جدة · عن بُعد',
    bio: 'متخصّص في صياغة السير الذاتية وملفات LinkedIn التي تجتاز أنظمة الفرز الآلي (ATS) وتلفت المسؤولين، أعدت صياغة أكثر من 100 سيرة برفع ملحوظ في معدّل الدعوات للمقابلات.',
    specialties: ['تحسين ATS', 'صياغة الإنجازات', 'ملف LinkedIn', 'الخطاب التعريفي'],
    serviceElements: [
      { id: 1, label: 'إعادة صياغة سيرة شاملة', desc: 'إعادة بناء السيرة موجّهة لوظيفة مستهدفة + نصائح ATS', price: 90 },
    ],
    reviews: [
      { id: 1, author: 'أمل الشهري', initial: 'أ', rating: 5, date: 'قبل شهر', service: 'إعادة صياغة سيرة', text: 'تضاعفت دعوات المقابلات خلال أسبوعين — فرق واضح في الصياغة والترتيب.' },
    ],
    successStories: [],
    articles: [],
    offers: [],
    stats: { views: 402, shares: 22, saves: 38, referrals: 6 },
  },
  {
    id: 9,
    slug: 'noura-aldosari',
    name: 'أ. نورة الدوسري',
    initial: 'ن',
    role: 'trainer',
    specialtyKey: 'skills_trainer',
    title: 'مدرّبة مهارات تواصل وعرض',
    specialty: 'مهارات العرض والتواصل الاحترافي',
    rating: 4.9,
    reviewsCount: 52,
    clients: 88,
    years: 9,
    priceFrom: 260,
    priceUnit: 'للورشة',
    verified: true,
    languages: ['العربية'],
    location: 'الدمام · حضوري وعن بُعد',
    bio: 'مدرّبة معتمدة في مهارات التواصل والعرض، صمّمت ورشًا عملية لفرق ومحترفين لبناء حضور واثق في الاجتماعات والعروض التقديمية والمقابلات.',
    specialties: ['مهارات العرض', 'التواصل الفعّال', 'إدارة الاجتماعات', 'الحضور المهني'],
    serviceElements: [
      { id: 1, label: 'ورشة مهارات عرض للفرق', desc: 'ورشة تفاعلية نصف يوم مع تمارين وتغذية راجعة', price: 220 },
    ],
    reviews: [
      { id: 1, author: 'فريق منتجات «واصل»', initial: 'و', rating: 5, date: 'قبل 3 أسابيع', service: 'ورشة مهارات العرض', text: 'ورشة عملية رفعت ثقة الفريق في العروض أمام العملاء بشكل ملموس.' },
    ],
    successStories: [],
    articles: [],
    offers: [],
    stats: { views: 271, shares: 14, saves: 25, referrals: 5 },
  },
  {
    id: 10,
    slug: 'tariq-almansour',
    name: 'د. طارق المنصور',
    initial: 'ط',
    role: 'consultant',
    specialtyKey: 'transition_consultant',
    title: 'مستشار تحوّل مهني للتنفيذيين',
    specialty: 'انتقالات مهنية للأدوار القيادية',
    rating: 4.8,
    reviewsCount: 24,
    clients: 31,
    years: 16,
    priceFrom: 700,
    priceUnit: 'للساعة',
    verified: true,
    languages: ['العربية', 'الإنجليزية'],
    location: 'الرياض · حضوري',
    bio: 'مستشار تحوّل مهني للمديرين والتنفيذيين، أساعد القادة على التنقّل بين القطاعات والأدوار عبر تقييم نقاط القوة وتصميم مسار انتقال مدروس يحفظ الزخم والقيمة السوقية.',
    specialties: ['الانتقال التنفيذي', 'التموضع القيادي', 'التفاوض على الحزم', 'تغيير القطاع'],
    serviceElements: [
      { id: 1, label: 'جلسة استراتيجية تحوّل مهني', desc: 'تقييم الوضع الحالي وخطة انتقال بمراحل واضحة', price: 650 },
    ],
    reviews: [
      { id: 1, author: 'مدير تنفيذي — قطاع التقنية', initial: 'م', rating: 5, date: 'قبل شهرين', service: 'جلسة استراتيجية تحوّل', text: 'رؤية ناضجة ساعدتني على الانتقال من التقنية إلى دور تنفيذي في قطاع مختلف بثقة.' },
    ],
    successStories: [],
    articles: [],
    offers: [],
    stats: { views: 189, shares: 7, saves: 14, referrals: 3 },
  },
]

export function getExpertBySlug(slug: string): MarketExpert | undefined {
  return MARKET_EXPERTS.find(e => e.slug === slug)
}
export function getExpertById(id: number): MarketExpert | undefined {
  return MARKET_EXPERTS.find(e => e.id === id)
}

interface ExpertState {
  coachPrograms: CoachProgram[]
  coachClients: CoachClient[]
  courses: Course[]
  trainees: TraineeReferral[]
  consulting: ConsultingRequest[]
}

const STORAGE_KEY = 'expertRoles'

const seed: ExpertState = {
  coachPrograms: [
    { id: 1, name: 'مسار الانطلاق المهني', duration: 'شهري', price: 450, seats: 10, enrolled: 6 },
    { id: 2, name: 'برنامج التحول الوظيفي الشامل', duration: 'ربع سنوي', price: 1100, seats: 5, enrolled: 3 },
  ],
  coachClients: [
    { id: 1, name: 'نورة المطيري', initial: 'ن', goal: 'الانتقال من الدعم الفني إلى تحليل البيانات', program: 'برنامج التحول الوظيفي الشامل', progress: 62, nextSession: 'الخميس 20:00' },
    { id: 2, name: 'عبدالله المالكي', initial: 'ع', goal: 'أول وظيفة بعد التخرج في تطوير الويب', program: 'مسار الانطلاق المهني', progress: 35, nextSession: 'السبت 18:30' },
  ],
  courses: [
    { id: 1, title: 'أساسيات اختبار الواجهات بـ Vitest', skill: 'الاختبارات', kind: 'ورشة عمل', price: 180, seats: 20, enrolled: 14, status: 'open' },
    { id: 2, title: 'TypeScript المتقدم لمطوري Vue', skill: 'TypeScript', kind: 'دورة مكثفة', price: 650, seats: 12, enrolled: 12, status: 'running' },
  ],
  trainees: [
    { id: 1, name: 'خالد الحربي', initial: 'خ', gap: 'ضعف في تغطية الاختبارات (من تقرير مقيّم)', source: 'ترشيح مقيّم معتمد', status: 'new' },
    { id: 2, name: 'سارة العتيبي', initial: 'س', gap: 'أنماط TypeScript المتقدمة (نتيجة اختبار 58%)', source: 'مركز التقييم', status: 'new' },
  ],
  consulting: [
    { id: 1, company: 'شركة تقنية المستقبل', topic: 'هيكلة فريق الواجهات لعام 2027', scope: 'مشروع', budget: '18,000 ر.س', status: 'new', date: 'قبل يومين' },
    { id: 2, company: 'مؤسسة البناء الرقمي', topic: 'اتجاهات رواتب مطوري البيانات', scope: 'بالساعة', budget: '600 ر.س/ساعة', status: 'in_progress', date: 'قبل أسبوع' },
  ],
}

function load(): ExpertState {
  try {
    return { ...structuredClone(seed), ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  }
  catch {
    return structuredClone(seed)
  }
}

let nextId = 700

export const useExpertRolesStore = defineStore('expertRoles', () => {
  const state = ref<ExpertState>(load())
  watch(state, v => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

  // مزامنة سحابية خاصة — بجلسة حقيقية فقط (DOC/CLOUD_SYNC.md)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'expertRoles',
    snapshot: () => state.value,
    apply: (incoming) => {
      if (incoming && typeof incoming === 'object')
        state.value = { ...state.value, ...(incoming as Partial<ExpertState>) }
    },
    source: state,
  })

  const notifications = useNotificationsStore()

  // —— المرشد ——
  const coachStats = computed(() => ({
    clients: state.value.coachClients.length,
    monthlyRecurring: state.value.coachPrograms.reduce((s, p) => s + p.price * p.enrolled, 0),
    avgProgress: state.value.coachClients.length
      ? Math.round(state.value.coachClients.reduce((s, c) => s + c.progress, 0) / state.value.coachClients.length)
      : 0,
  }))
  function addProgram(p: Omit<CoachProgram, 'id' | 'enrolled'>) {
    state.value.coachPrograms.push({ ...p, id: nextId++, enrolled: 0 })
  }
  function bumpClientProgress(id: number, delta = 10) {
    const c = state.value.coachClients.find(x => x.id === id)
    if (c)
      c.progress = Math.min(100, c.progress + delta)
  }

  // —— المدرب ——
  const trainerStats = computed(() => ({
    courses: state.value.courses.length,
    trainees: state.value.courses.reduce((s, c) => s + c.enrolled, 0),
    revenue: state.value.courses.reduce((s, c) => s + c.price * c.enrolled, 0),
    newReferrals: state.value.trainees.filter(t => t.status === 'new').length,
  }))
  function addCourse(c: Omit<Course, 'id' | 'enrolled' | 'status'>) {
    state.value.courses.push({ ...c, id: nextId++, enrolled: 0, status: 'open' })
  }
  /** قبول مرشح مُحال من نتائج التقييم إلى دورة — حلقة تقييم→تدريب→توظيف */
  function enrollTrainee(traineeId: number, courseId: number) {
    const t = state.value.trainees.find(x => x.id === traineeId)
    const c = state.value.courses.find(x => x.id === courseId)
    if (!t || t.status !== 'new' || !c || c.enrolled >= c.seats)
      return false
    t.status = 'enrolled'
    c.enrolled++
    useWalletStore().credit(c.price, `تسجيل ${t.name} في «${c.title}»`, { pending: true })
    notifications.push({ icon: 'mdi-school-outline', color: 'success', title: 'متدرب جديد', body: `${t.name} انضم إلى «${c.title}»`, category: 'system' })
    return true
  }

  // —— المستشار ——
  const consultantStats = computed(() => ({
    active: state.value.consulting.filter(c => c.status === 'in_progress' || c.status === 'accepted').length,
    newRequests: state.value.consulting.filter(c => c.status === 'new').length,
    done: state.value.consulting.filter(c => c.status === 'done').length,
  }))
  function respondConsulting(id: number, accept: boolean) {
    const r = state.value.consulting.find(x => x.id === id)
    if (!r)
      return
    r.status = accept ? 'accepted' : 'declined'
    notifications.push({
      icon: accept ? 'mdi-handshake-outline' : 'mdi-close-circle-outline',
      color: accept ? 'success' : 'error',
      title: accept ? 'قبلت طلب استشارة' : 'اعتذرت عن طلب استشارة',
      body: `${r.company} — ${r.topic}`,
      category: 'system',
    })
  }
  function completeConsulting(id: number, fee: number) {
    const r = state.value.consulting.find(x => x.id === id)
    if (!r)
      return
    r.status = 'done'
    useWalletStore().credit(fee, `أتعاب استشارة — ${r.company}`, { pending: true })
  }

  return {
    state, syncStatus,
    coachStats, addProgram, bumpClientProgress,
    trainerStats, addCourse, enrollTrainee,
    consultantStats, respondConsulting, completeConsulting,
  }
})
