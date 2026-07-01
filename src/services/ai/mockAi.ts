import type {
  AiService,
  AnswerEvaluation,
  GeneratedFaq,
  InterviewLevel,
  InterviewQuestion,
  InterviewRecommendation,
  InterviewType,
  ProactiveNudge,
  EvaluationReview,
  InterviewerEligibility,
  InterviewerRank,
  AttachmentsInsight,
  EvalElementSuggestion,
  PricingSuggestion,
  RequestPerformance,
  ReviewsDigest,
  SkillInsight,
  SkillLevelResult,
  TrustTip,
  UploadAnalysis,
  VideoAnalysis,
} from './types'

// Convincing mock implementation. Deterministic where useful, varied where natural.

function skillLevel(proofScore: number): SkillLevelResult {
  let level: SkillLevelResult['level'] = 'entry'
  if (proofScore >= 80)
    level = 'expert'
  else if (proofScore >= 55)
    level = 'advanced'
  else if (proofScore >= 30)
    level = 'mid'

  const rationaleByLevel: Record<SkillLevelResult['level'], string> = {
    entry: 'إثباتات محدودة — أضف اختباراً أو مشروعاً لرفع المستوى.',
    mid: 'إثباتات جيدة — توصية موثّقة سترفعك للمستوى المتقدم.',
    advanced: 'إثباتات قوية متعددة المصادر تدعم هذا المستوى.',
    expert: 'إثباتات ممتازة (اختبارات + توصيات + مشاريع) تؤكد الخبرة.',
  }
  return { level, confidence: Math.min(100, Math.round(proofScore)), rationale: rationaleByLevel[level] }
}

function trustAnalysis(factors: { key: string, label: string, value: number }[]): TrustTip[] {
  const tips: TrustTip[] = []
  const byKey = Object.fromEntries(factors.map(f => [f.key, f]))

  if ((byKey.endorsements?.value ?? 100) < 80)
    tips.push({ text: 'أضف توصيتين موثّقتين من مدراء سابقين لرفع مصداقيتك.', gain: 6, action: 'profile', actionLabel: 'طلب توصية' })
  if ((byKey.assessments?.value ?? 100) < 75)
    tips.push({ text: 'أكمل اختبار مهارة في مجالك لإثبات قدراتك.', gain: 5, action: 'assessments', actionLabel: 'مركز التقييم' })
  if ((byKey.skills?.value ?? 100) < 70)
    tips.push({ text: 'أضف إثباتاً لمهاراتك غير الموثّقة (مشروع أو شهادة).', gain: 4, action: 'profile', actionLabel: 'ملفي' })
  if ((byKey.interviews?.value ?? 100) < 50)
    tips.push({ text: 'أجرِ مقابلة AI لتحديد مستواك ورفع الثقة.', gain: 5, action: 'interviews', actionLabel: 'المقابلات' })
  if ((byKey.completeness?.value ?? 100) < 90)
    tips.push({ text: 'أكمل بيانات ملفك (خبرات وتعليم) للوصول لاكتمال أعلى.', gain: 3, action: 'profile', actionLabel: 'ملفي' })

  return tips.length ? tips : [{ text: 'ملفك قوي! حافظ على تحديثه دوريًا للإبقاء على نسبة ثقتك.', gain: 0 }]
}

const QUESTION_BANK: Record<string, InterviewQuestion[]> = {
  basic: [
    { id: 1, text: 'عرّف بنفسك وخبرتك المهنية باختصار.', competency: 'التواصل' },
    { id: 2, text: 'ما أبرز المهارات التي تتقنها في مجالك؟', competency: 'المعرفة التقنية' },
    { id: 3, text: 'صف مشروعاً فخور بإنجازه ودورك فيه.', competency: 'الإنجاز' },
  ],
  intermediate: [
    { id: 1, text: 'كيف تعاملت مع مشكلة تقنية معقّدة مؤخراً؟ وما الحل؟', competency: 'حل المشكلات' },
    { id: 2, text: 'اشرح كيف تضمن جودة عملك وقابليته للصيانة.', competency: 'الجودة' },
    { id: 3, text: 'كيف تتعامل مع تعارض الأولويات تحت ضغط الوقت؟', competency: 'إدارة الوقت' },
    { id: 4, text: 'صف موقفاً تعاونت فيه مع فريق لتحقيق هدف.', competency: 'العمل الجماعي' },
  ],
  advanced: [
    { id: 1, text: 'كيف تصمّم نظاماً قابلاً للتوسّع من الصفر؟', competency: 'التصميم المعماري' },
    { id: 2, text: 'اشرح قراراً تقنياً استراتيجياً اتخذته وأثره.', competency: 'التفكير الاستراتيجي' },
    { id: 3, text: 'كيف تقود فريقاً تقنياً وتطوّر أفراده؟', competency: 'القيادة' },
    { id: 4, text: 'حلّل حالة: تراجع أداء منتج بنسبة 40% — ما خطتك؟', competency: 'تحليل الحالات' },
  ],
  expert: [
    { id: 1, text: 'كيف تبني رؤية تقنية طويلة المدى تتماشى مع أهداف العمل؟', competency: 'الرؤية' },
    { id: 2, text: 'صف تحوّلاً مؤسسياً قدته وكيف أدرت مقاومته.', competency: 'إدارة التغيير' },
    { id: 3, text: 'كيف توازن بين الابتكار والاستقرار في أنظمة حرجة؟', competency: 'الحوكمة' },
    { id: 4, text: 'قيّم مقايضة معمارية معقّدة اتخذتها ونتائجها.', competency: 'الحكم الهندسي' },
  ],
}

function interviewQuestions(_type: InterviewType, level: InterviewLevel): InterviewQuestion[] {
  return QUESTION_BANK[level] ?? QUESTION_BANK.basic
}

function evaluateAnswer(_question: string, answer: string): AnswerEvaluation {
  // Heuristic scoring by answer richness (length + keyword variety) — feels reasonable
  const len = answer.trim().length
  const words = new Set(answer.trim().split(/\s+/).filter(Boolean)).size
  let score = Math.min(100, Math.round(len / 4 + words * 2))
  if (len === 0)
    score = 0
  score = Math.max(score, len > 0 ? 45 : 0)

  let feedback = 'إجابة مختصرة — أضف مثالاً ملموساً وأرقاماً لتعزيزها.'
  if (score >= 80)
    feedback = 'إجابة قوية وواضحة مع أمثلة ملموسة.'
  else if (score >= 60)
    feedback = 'إجابة جيدة — يمكن دعمها بنتائج قابلة للقياس.'
  return { score, feedback }
}

function videoAnalysis(): VideoAnalysis {
  return {
    bodyLanguage: 82,
    tone: 78,
    confidence: 85,
    pace: 74,
    eyeContact: 80,
    note: 'حضور واثق ونبرة متزنة. لغة جسدك داعمة لرسالتك، مع فرصة لتحسين وتيرة الكلام قليلًا.',
    tips: [
      'أبطئ وتيرة كلامك 10% عند شرح النقاط التقنية لزيادة الوضوح.',
      'حافظ على التواصل البصري مع الكاميرا عند بداية كل إجابة.',
      'استخدم وقفات قصيرة بدل كلمات الحشو لتعزيز الثقة.',
    ],
  }
}

function suggestProofRequest(skillName: string): string {
  return `اطلب من مديرك أو زميلك السابق تأكيد مهارتك في «${skillName}» عبر توصية موثّقة مرتبطة بها.`
}

// — Extended AI (batch 1) — narrative rationale for a single skill based on its proof mix
function skillRationale(skillName: string, proofSummary: { type: string, weight: number }[], confidence: number): string {
  const labels: Record<string, string> = {
    assessment: 'اختبار مُجتاز',
    endorsement: 'توصية موثّقة',
    project: 'مشروع منفّذ',
    certificate: 'شهادة معتمدة',
    self: 'تقييم ذاتي',
  }
  if (!proofSummary.length)
    return `مهارة «${skillName}» بلا إثباتات بعد — نسبة الثقة ${confidence}%. أضف اختباراً أو مشروعاً لتوثيقها.`
  const strongest = [...proofSummary].sort((a, b) => b.weight - a.weight)[0]
  const parts = proofSummary.map(p => labels[p.type] ?? p.type)
  const missing = ['assessment', 'endorsement', 'project'].filter(t => !proofSummary.some(p => p.type === t))
  const nextHint = missing.length
    ? ` لرفعها أكثر، أضف ${labels[missing[0]]}.`
    : ' تنوّع الإثبات ممتاز ويؤكد إتقانك.'
  return `نسبة الثقة ${confidence}% في «${skillName}» تستند إلى ${proofSummary.length} إثبات (${parts.join('، ')})، وأقواها ${labels[strongest.type] ?? strongest.type}.${nextHint}`
}

// Compares verified skills and points to the weakest one to focus on
function skillInsight(skills: { name: string, confidence: number }[]): SkillInsight | null {
  if (skills.length < 2)
    return null
  const sorted = [...skills].sort((a, b) => a.confidence - b.confidence)
  const weakest = sorted[0]
  const strongest = sorted[sorted.length - 1]
  if (strongest.confidence - weakest.confidence < 15)
    return null
  return {
    skill: weakest.name,
    confidence: weakest.confidence,
    message: `مهاراتك في «${strongest.name}» مثبتة بنسبة ${strongest.confidence}%، بينما «${weakest.name}» ${weakest.confidence}% فقط — ننصحك بالتركيز على إثباتها لرفع نسبة الثقة الكلية.`,
  }
}

function trustMotivation(delta: number, score: number): string {
  if (delta > 0)
    return `رائع! ارتفعت نسبة ثقتك ${delta}% لتصل إلى ${score}%. استمر — كل إثبات يقرّبك من فرص أفضل.`
  if (delta < 0)
    return `انخفضت نسبة ثقتك ${Math.abs(delta)}% إلى ${score}%. حدّث ملفك أو أضف إثباتاً لاستعادتها.`
  return `نسبة ثقتك ${score}% — أضف إثباتاً جديداً لرفعها.`
}

const HINT_BANK = [
  'فكّر في موقف حقيقي واجهته، واذكر: التحدي، ما فعلته، والنتيجة القابلة للقياس.',
  'ادعم إجابتك بمثال ملموس ورقم (نسبة تحسّن، وقت موفّر، حجم فريق).',
  'ابدأ بخلاصة قصيرة ثم فصّل — هذا يُظهر وضوح التفكير.',
]
function interviewHint(_questionText: string, competency: string): string {
  const base = HINT_BANK[Math.min(competency.length % HINT_BANK.length, HINT_BANK.length - 1)]
  return `تلميح (${competency}): ${base}`
}

function recommendInterview(unverifiedSkills: string[]): InterviewRecommendation | null {
  if (!unverifiedSkills.length)
    return null
  const skill = unverifiedSkills[0]
  return {
    level: unverifiedSkills.length > 2 ? 'advanced' : 'intermediate',
    skill,
    reason: `مهارة «${skill}» غير مُثبتة كفاية — مقابلة AI ${unverifiedSkills.length > 2 ? 'متقدمة' : 'متوسطة'} ستوثّق مستواك وترفع نسبة الثقة.`,
    trustGain: unverifiedSkills.length > 2 ? 8 : 5,
  }
}

function proactiveNudges(ctx: { trust: number, trustDelta: number, pendingProofs: number, unverifiedSkills: string[], route?: string }): ProactiveNudge[] {
  const nudges: ProactiveNudge[] = []
  if (ctx.pendingProofs > 0) {
    nudges.push({
      icon: 'mdi-account-star-outline',
      text: `لديك ${ctx.pendingProofs} طلب إثبات معلّق من آخرين — راجعها لتعزيز مهاراتك.`,
      action: 'profile',
      actionLabel: 'مراجعة',
      tone: 'info',
    })
  }
  if (ctx.trustDelta < 0) {
    nudges.push({
      icon: 'mdi-trending-down',
      text: `لاحظت انخفاض نسبة ثقتك ${Math.abs(ctx.trustDelta)}% بسبب عدم تحديث الملف — هل تريد تحديثه؟`,
      action: 'profile',
      actionLabel: 'تحديث الملف',
      tone: 'warning',
    })
  }
  if (ctx.unverifiedSkills.length) {
    nudges.push({
      icon: 'mdi-account-tie-voice-outline',
      text: `مهارة «${ctx.unverifiedSkills[0]}» غير مثبتة — أنصحك بمقابلة AI لتثبيتها.`,
      action: 'interviews',
      actionLabel: 'ابدأ مقابلة',
      tone: 'info',
    })
  }
  if (ctx.trust >= 85) {
    nudges.push({
      icon: 'mdi-trophy-outline',
      text: `نسبة ثقتك ${ctx.trust}% ممتازة! أنت ضمن أعلى المرشحين — تقدّم للفرص المميزة بثقة.`,
      action: 'opportunities',
      actionLabel: 'استعرض الفرص',
      tone: 'success',
    })
  }
  return nudges
}

// — Requests marketplace AI (batch 2) —
function searchSuggestions(query: string): string[] {
  const q = query.trim()
  if (!q)
    return ['مشاريع تقنية قصيرة المدة', 'طلبات تناسب مهاراتي في Vue', 'استشارات عن بُعد', 'مهمات بمقابل مرتفع']
  return [
    `${q} — عن بُعد`,
    `${q} بمقابل مرتفع`,
    `${q} قصير المدة`,
    `مشاريع مشابهة لـ «${q}» تناسب ملفك`,
  ]
}

function negotiationDraft(requestTitle: string, org: string, strengths: string[]): string {
  const s = strengths.length ? strengths.slice(0, 2).join(' و') : 'خبرتي العملية'
  return `السادة ${org} المحترمون،\n\nيسعدني اهتمامي بـ«${requestTitle}». بناءً على ${s}، أثق أنني أضيف قيمة ملموسة لهذا الطلب. أقترح مناقشة النطاق والمقابل بما يحقق مصلحة الطرفين — ولديّ مرونة في الجدول الزمني.\n\nهل يمكننا تحديد مكالمة قصيرة لمواءمة التوقعات؟\n\nمع التقدير،`
}

function generatedFaqs(requestTitle: string, requestType: string): GeneratedFaq[] {
  return [
    {
      question: `ما نطاق العمل المتوقّع في «${requestTitle}»؟`,
      answer: `يشمل ${requestType === 'project' ? 'تسليم مراحل محددة مع مراجعات دورية' : 'مهامّ واضحة بمخرجات قابلة للقياس'}. أنصحك بطلب وثيقة نطاق مفصّلة قبل البدء.`,
    },
    {
      question: 'كيف أبرز نقاط قوتي في التقديم؟',
      answer: 'اربط كل متطلب بمشروع منفّذ لديك مع رقم أثر (نسبة تحسّن، وقت موفّر). المهارات المُثبتة في ملفك ترفع أولويتك لدى الجهة.',
    },
    {
      question: 'هل المقابل قابل للتفاوض؟',
      answer: 'غالبًا نعم. استخدم «التفاوض المدعوم من AI» لصياغة عرض مهني متوازن يستند إلى قيمتك الفعلية.',
    },
  ]
}

function applicationForecast(org: string, avgResponseDays: number): string {
  return `من المتوقع رد ${org} خلال ${avgResponseDays} ${avgResponseDays <= 2 ? 'يومين' : 'أيام'} بناءً على متوسط استجابتها السابق.`
}

function requestPerformance(stats: { category: string, applied: number, accepted: number }[]): RequestPerformance {
  const withRate = stats
    .filter(s => s.applied > 0)
    .map(s => ({ ...s, rate: Math.round((s.accepted / s.applied) * 100) }))
  if (!withRate.length)
    return { message: 'ابدأ بالتقديم على طلبات تناسب مهاراتك لبناء سجل أداء.', bestCategory: '—', acceptRate: 0 }
  const best = [...withRate].sort((a, b) => b.rate - a.rate)[0]
  return {
    message: `نسبة قبولك في «${best.category}» ${best.rate}% — الأعلى لديك. ننصحك بالتركيز على هذه الفئة لرفع فرص القبول.`,
    bestCategory: best.category,
    acceptRate: best.rate,
  }
}

// — Deeper assistant AI (batch 3): context-aware replies grounded in real profile data —
function assistantReply(question: string, ctx: { trust: number, unverifiedSkills: string[], lastInterviewScore: number | null, route?: string }): string {
  const q = question
  const unproven = ctx.unverifiedSkills[0]
  if (q.includes('نسبة الثقة') || q.includes('نسبتي') || q.includes('حلل نسبتي'))
    return `نسبة ثقتك الحالية ${ctx.trust}/100. ${ctx.trust >= 70 ? 'ملفك موثوق' : 'ملفك يحتاج تعزيزًا'}. لرفعها: ${ctx.unverifiedSkills.length ? `أثبت مهارة «${unproven}» عبر اختبار أو مقابلة (+5%)` : 'أضف توصيتين موثّقتين (+6%)'}، وحدّث بياناتك دوريًا. افتح ملفك ثم «عرض التفاصيل» لخطة كاملة.`
  if (q.includes('اقترح') && q.includes('مقابلة'))
    return ctx.unverifiedSkills.length
      ? `أقترح مقابلة AI بمستوى «متقدم» لتثبيت مهارة «${unproven}» غير المُثبتة — سترفع نسبة ثقتك ~8%. توجّه إلى «المقابلات» لبدئها فورًا.`
      : 'مهاراتك مُثبتة جيدًا! أقترح مقابلة «خبير» لتوثيق مستواك القيادي والوصول لفرص أعلى.'
  if (q.includes('أثبت') || q.includes('إثبات'))
    return ctx.unverifiedSkills.length
      ? `أضعف مهاراتك توثيقًا: «${ctx.unverifiedSkills.join('»، «')}». لكلٍّ منها: اجتز اختبارها، أضف مشروعًا منفّذًا، أو اطلب توصية موثّقة. كل إثبات يرفع نسبة الثقة والمستوى.`
      : 'جميع مهاراتك مُثبتة بمصادر متعددة — عمل ممتاز! حافظ على تحديثها بمشاريع جديدة.'
  if (q.includes('مقابلاتي') || q.includes('حلّل مقابلاتي'))
    return ctx.lastInterviewScore != null
      ? `في آخر مقابلة حصلت على ${ctx.lastInterviewScore}%. نقاط قوتك: وضوح الحلول والأمثلة. للتحسّن: ادعم إجاباتك بأرقام قابلة للقياس، وجرّب مستوى أعلى لإثبات القيادة.`
      : 'لم تُجرِ أي مقابلة بعد. ابدأ بمقابلة AI أساسية مجانية لتحديد مستواك ورفع نسبة ثقتك.'
  if (q.includes('سيرة'))
    return 'توجّه إلى «منشئ السيرة الذاتية» واختر القالب المناسب — سأتولّى إعادة الصياغة الذكية وإبراز إنجازاتك بكلمات مفتاحية ATS.'
  if (q.includes('مقيّم') || q.includes('مقيم') || q.includes('تقييم معتمد') || q.includes('خبير'))
    return ctx.unverifiedSkills.length
      ? `لتوثيق «${unproven}» بمصداقية عالية، أنصحك بحجز مقابلة مع مقيّم معتمد في «سوق المقيّمين» — تقريره يُضاف لملفك ويرفع ثقتك أكثر من مقابلة AI. المقيّم «م. خالد الشمري» (تقني، 4.9★) مناسب لك.`
      : 'مهاراتك موثّقة جيدًا. لرفع مصداقيتك أمام الجهات، مقابلة مع مقيّم معتمد في «سوق المقيّمين» تمنحك شهادة موثّقة وتقريرًا تفصيليًا.'
  if (q.includes('فرص') || q.includes('طلبات') || q.includes('سوق'))
    return 'في «سوق الطلبات» لديك طلبات بنسبة تطابق تتجاوز 90% أبرزها «تطوير لوحة تحكم Vue 3» (94%). أستطيع صياغة رسالة تفاوض احترافية عند فتح أي طلب.'
  return 'سؤال جيد! بناءً على ملفك، أنصحك بالتركيز على إثبات مهاراتك وإضافة توصيات موثّقة. هل تريد أن أحلّل نسبة ثقتك أو أقترح مقابلة مناسبة؟'
}

function assistantSuggestions(ctx: { unverifiedSkills: string[], pendingProofs: number, route?: string }): string[] {
  const base = ['حلّل نسبة الثقة في ملفي', 'حلّل مقابلاتي السابقة']
  if (ctx.unverifiedSkills.length)
    base.unshift(`كيف أثبت مهارة «${ctx.unverifiedSkills[0]}»؟`)
  if (ctx.pendingProofs > 0)
    base.push('لديّ طلبات إثبات معلّقة — ماذا أفعل؟')
  base.push('أي مقيّم معتمد يناسبني؟', 'اقترح لي مقابلة مناسبة', 'أنشئ لي سيرة ذاتية')
  return base.slice(0, 6)
}

function analyzeUpload(fileName: string): UploadAnalysis {
  const isImage = /\.(png|jpe?g|webp)$/i.test(fileName)
  return {
    fileName,
    summary: isImage
      ? `حلّلت الصورة «${fileName}». استخرجت العناصر المرئية الأساسية — إن كانت شهادة أو مشروعًا يمكنني ربطها كإثبات لمهاراتك.`
      : `حلّلت الملف «${fileName}». بنيته واضحة وأقسامه مكتملة، مع فرص لتقوية أثر الإنجازات وملاءمة أنظمة ATS.`,
    strengths: ['خبرات تقنية واضحة ومرتّبة زمنيًا', 'تنوّع في المهارات ذات الصلة بالمجال'],
    improvements: ['أضف أرقامًا ونتائج ملموسة لكل إنجاز (نسبة تحسّن، وقت موفّر)', 'وحّد تنسيق التواريخ وعناوين الأقسام'],
    atsKeywords: ['Vue.js', 'TypeScript', 'REST API', 'CI/CD', 'Unit Testing'],
  }
}

// — Certified Interviewers Marketplace AI (phase 5) —
function interviewerEligibility(quals: { years: number, certs: number, endorsements: number, hasLicense?: boolean }): InterviewerEligibility {
  let score = 20
  score += Math.min(40, quals.years * 5) // up to 40 for 8+ years
  score += Math.min(25, quals.certs * 8) // up to 25 for certificates
  score += Math.min(15, quals.endorsements * 5) // up to 15 for endorsements
  if (quals.hasLicense)
    score = Math.min(100, score + 5)
  score = Math.min(100, score)

  const strengths: string[] = []
  const gaps: string[] = []
  if (quals.years >= 5)
    strengths.push(`خبرة عملية قوية (${quals.years} سنوات)`)
  else gaps.push('الخبرة العملية أقل من 5 سنوات المطلوبة')
  if (quals.certs >= 2)
    strengths.push('شهادات معتمدة متعددة')
  else gaps.push('أضف شهادات معتمدة لتعزيز أهليتك')
  if (quals.endorsements >= 2)
    strengths.push('توصيات موثّقة من جهات معترف بها')
  else gaps.push('توصيتان موثّقتان على الأقل تعزّزان القبول')

  const recommendation: InterviewerEligibility['recommendation'] = score >= 70 ? 'accept' : score >= 45 ? 'review' : 'reject'
  const noteByRec: Record<InterviewerEligibility['recommendation'], string> = {
    accept: 'مؤهلاتك تستوفي معايير المنصة — يُوصى بالقبول كمقيّم معتمد.',
    review: 'مؤهلات واعدة تحتاج مراجعة إدارية — عزّز النقاط الناقصة لرفع فرص القبول.',
    reject: 'المؤهلات الحالية دون الحدّ الأدنى — استكمل الخبرة والشهادات ثم أعد التقديم.',
  }
  return { score, strengths, gaps, recommendation, note: noteByRec[recommendation] }
}

const PRICE_BANDS: Record<string, [number, number]> = {
  skills: [50, 300],
  level: [30, 150],
  leadership: [100, 500],
  behavioral: [40, 200],
  comprehensive: [150, 800],
}
function suggestInterviewerPricing(kind: string, years: number): PricingSuggestion {
  const [floor, ceil] = PRICE_BANDS[kind] ?? [50, 300]
  const experienceFactor = Math.min(1, years / 12)
  const mid = Math.round(floor + (ceil - floor) * (0.35 + 0.4 * experienceFactor))
  const min = Math.round(mid * 0.8 / 5) * 5
  const max = Math.round(mid * 1.25 / 5) * 5
  return { min, max, note: `بناءً على خبرتك (${years} سنوات) ومتوسط السوق لهذا النوع، النطاق ${min}–${max} ريال تنافسي.` }
}

function interviewerMatch(candidate: { field: string, skills: string[] }, interviewer: { type: string, specialties: string[] }): number {
  const overlap = interviewer.specialties.filter(s =>
    candidate.skills.some(k => k.toLowerCase() === s.toLowerCase()) || candidate.field.includes(s),
  ).length
  const base = interviewer.specialties.some(s => candidate.field.includes(s) || s.includes(candidate.field)) ? 65 : 45
  return Math.min(98, base + overlap * 12)
}

function recommendInterviewers(candidate: { field: string, skills: string[] }, interviewers: { id: number, type: string, specialties: string[] }[]): InterviewerRank[] {
  return interviewers
    .map((iv) => {
      const match = interviewerMatch(candidate, iv)
      return { id: iv.id, match, reason: `توافق ${match}% مع مجالك «${candidate.field}» ومهاراتك المُثبتة.` }
    })
    .sort((a, b) => b.match - a.match)
    .slice(0, 3)
}

const EVAL_QUESTIONS: Record<string, string[]> = {
  skills: ['حلّل مشكلة تقنية حقيقية واجهتها وكيف وصلت للحل.', 'ما المقايضات التي توازنها عند اختيار حلٍّ تقني؟', 'اكتب/اشرح خوارزمية لحالة عملية محددة.'],
  level: ['صف أكثر مشروع فخور به ودورك التفصيلي فيه.', 'كيف تقيس جودة عملك وتضمن قابليته للصيانة؟', 'ما الفجوة الأكبر في مهاراتك وخطتك لسدّها؟'],
  leadership: ['صف تحوّلاً قدته وكيف أدرت مقاومة التغيير.', 'كيف تطوّر أفراد فريقك وتتعامل مع ضعف الأداء؟', 'حلّل قرارًا استراتيجيًا صعبًا اتخذته وأثره.'],
  behavioral: ['أخبرني عن موقف تعارضت فيه مع زميل وكيف حللته.', 'كيف تتعامل مع ضغط المواعيد وتعارض الأولويات؟', 'ما القيم التي توجّه قراراتك المهنية؟'],
  comprehensive: ['ابدأ بنبذة عن مسارك ثم أعمق إنجاز تقني لك.', 'صف موقف قيادة أو تأثير على فريق.', 'كيف توازن بين الابتكار والاستقرار في عملك؟'],
}
function suggestEvaluationQuestions(kind: string): string[] {
  return EVAL_QUESTIONS[kind] ?? EVAL_QUESTIONS.level
}

function reviewEvaluationReport(draft: { strengths: string, improvements: string, level: string }): EvaluationReview {
  const suggestions: string[] = []
  if (draft.strengths.trim().length < 40)
    suggestions.push('وسّع نقاط القوة بأمثلة ملموسة من المقابلة.')
  if (draft.improvements.trim().length < 40)
    suggestions.push('اربط كل نقطة تحسين بتوصية تطويرية قابلة للتنفيذ.')
  if (!/\d/.test(draft.strengths + draft.improvements))
    suggestions.push('ادعم التقييم بمؤشرات قابلة للقياس (نسب، أمثلة رقمية).')
  return {
    summary: `تقرير متماسك يحدّد المستوى «${draft.level}». ${suggestions.length ? 'أضف اللمسات المقترحة لرفع جودته.' : 'جاهز للإضافة إلى ملف المرشح.'}`,
    suggestions,
  }
}

// Extract the most-frequent traits from a set of review comments + summarize.
const TRAIT_LEXICON: { word: RegExp, label: string }[] = [
  { word: /احترافي|احتراف/, label: 'احترافي' },
  { word: /دقيق|دقة/, label: 'دقيق' },
  { word: /واضح|وضوح|شرح/, label: 'واضح' },
  { word: /صبور|صبر/, label: 'صبور' },
  { word: /عملي|تطبيقي/, label: 'عملي' },
  { word: /عميق|عمق|معمّق/, label: 'تحليل عميق' },
  { word: /استراتيج/, label: 'استراتيجي' },
  { word: /منظّم|منظم|ترتيب/, label: 'منظّم' },
  { word: /متعاون|تعاون/, label: 'متعاون' },
  { word: /ملاحظات|تغذية راجعة|توصيات/, label: 'ملاحظات مفيدة' },
]
function reviewsDigest(comments: string[]): ReviewsDigest {
  if (!comments.length)
    return { summary: 'لا توجد تقييمات بعد لتحليلها.', traits: [] }
  const counts = new Map<string, number>()
  for (const c of comments) {
    for (const t of TRAIT_LEXICON) {
      if (t.word.test(c))
        counts.set(t.label, (counts.get(t.label) ?? 0) + 1)
    }
  }
  const traits = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0])
  const top = traits.slice(0, 2)
  const summary = top.length
    ? `تُجمع التقييمات على أنّ الأبرز: ${top.join(' و')} — انطباع إيجابي متكرر عبر ${comments.length} تقييمًا.`
    : `${comments.length} تقييمًا تعكس تجربة إيجابية بملاحظات متنوّعة.`
  return { summary, traits }
}

function suggestReviewReply(stars: number, comment: string): string {
  const snippet = comment.trim().slice(0, 24)
  if (stars >= 4)
    return `شكرًا جزيلًا على كلماتك اللطيفة${snippet ? ` بخصوص «${snippet}…»` : ''}. سعدتُ بالتجربة وأتمنى لك كل التوفيق في مسارك المهني!`
  if (stars === 3)
    return 'أقدّر تقييمك الصادق وملاحظاتك. سآخذها بعين الاعتبار لتطوير التجربة مستقبلًا، وأشكرك على وقتك.'
  return 'أشكرك على صراحتك، وأعتذر إن لم ترقَ التجربة لتوقعاتك. ملاحظاتك مهمة وسأعمل على تحسينها — يسعدني التواصل لأي توضيح.'
}

// Suggest custom evaluation elements based on the interviewer's type + specialties
const ELEMENT_LIBRARY: Record<string, EvalElementSuggestion[]> = {
  technical: [
    { name: 'مراجعة كود معمّقة', description: 'تحليل كود حقيقي مرفوع مع كشف الثغرات وفرص التحسين', price: 100 },
    { name: 'تصميم نظام (System Design)', description: 'سيناريو تصميم معماري لنظام قابل للتوسّع', price: 130 },
    { name: 'تقرير تقني مفصّل', description: 'تقرير مكتوب بنقاط القوة والفجوات وخطة تطوير', price: 60 },
  ],
  leadership: [
    { name: 'التقييم القيادي', description: 'سيناريوهات قيادية لقياس اتخاذ القرار وإدارة الفرق', price: 150 },
    { name: 'تقييم التفكير الاستراتيجي', description: 'دراسة حالة استراتيجية مع تحليل المقايضات', price: 120 },
  ],
  behavioral: [
    { name: 'التقييم السلوكي الشامل', description: 'تحليل الشخصية والذكاء العاطفي والتوافق الثقافي', price: 80 },
    { name: 'تقرير توافق ثقافي', description: 'تقييم ملاءمة المرشح لثقافة فريق محدّد', price: 70 },
  ],
  specialist: [
    { name: 'تدقيق متخصّص', description: 'مراجعة معمّقة في مجال تخصّصك مع توصيات', price: 90 },
    { name: 'خطة تطوير مخصّصة', description: 'خارطة طريق مهنية مبنية على نتائج التقييم', price: 60 },
  ],
}
function suggestEvalElements(type: string, specialties: string[]): EvalElementSuggestion[] {
  const base = ELEMENT_LIBRARY[type] ?? ELEMENT_LIBRARY.specialist
  const spec = specialties[0]
  // Tailor the first suggestion's wording to the interviewer's top specialty
  return base.map((e, i) => (i === 0 && spec ? { ...e, description: `${e.description} — بتركيز على ${spec}` } : e))
}

// Summarize pre-interview materials and suggest what the interviewer should focus on
function attachmentsInsight(items: { name: string, kind: 'file' | 'link', fileType?: string }[]): AttachmentsInsight {
  if (!items.length)
    return { summary: 'لم يُرسل المرشح أي مواد تحضيرية بعد.', tips: [] }
  const files = items.filter(i => i.kind === 'file')
  const links = items.filter(i => i.kind === 'link')
  const hasCode = items.some(i => /github|gitlab|bitbucket|\.zip|\.js|\.ts|\.py/i.test(i.name + (i.fileType ?? '')))
  const hasDesign = items.some(i => /behance|dribbble|figma|\.png|\.jpg|\.psd|image/i.test(i.name + (i.fileType ?? '')))
  const hasPdf = items.some(i => /\.pdf|pdf/i.test(i.name + (i.fileType ?? '')))
  const tips: string[] = []
  if (hasCode)
    tips.push('راجع الكود/المستودع قبل الجلسة وحضّر أسئلة عن قرارات التصميم وتحسين الأداء.')
  if (hasDesign)
    tips.push('اطّلع على الأعمال البصرية واسأل عن منهجية التصميم وقرارات تجربة المستخدم.')
  if (hasPdf)
    tips.push('اقرأ السيرة/المستندات لربط الأسئلة بخبرات المرشح الفعلية.')
  if (!tips.length)
    tips.push('اطّلع على المواد المرفقة لتخصيص أسئلة المقابلة.')
  const parts = [files.length ? `${files.length} ملفًا` : '', links.length ? `${links.length} رابطًا` : ''].filter(Boolean)
  return {
    summary: `أرسل المرشح ${parts.join(' و')}${hasCode ? ' تتضمّن مشروعًا برمجيًا' : ''}. يُنصح بالاطّلاع عليها لرفع دقة التقييم.`,
    tips,
  }
}

export const mockAi: AiService = {
  skillLevel,
  trustAnalysis,
  interviewQuestions,
  evaluateAnswer,
  videoAnalysis,
  suggestProofRequest,
  skillRationale,
  skillInsight,
  trustMotivation,
  interviewHint,
  recommendInterview,
  proactiveNudges,
  searchSuggestions,
  negotiationDraft,
  generatedFaqs,
  applicationForecast,
  requestPerformance,
  assistantReply,
  assistantSuggestions,
  analyzeUpload,
  interviewerEligibility,
  suggestInterviewerPricing,
  interviewerMatch,
  recommendInterviewers,
  suggestEvaluationQuestions,
  reviewEvaluationReport,
  reviewsDigest,
  suggestReviewReply,
  suggestEvalElements,
  attachmentsInsight,
}
