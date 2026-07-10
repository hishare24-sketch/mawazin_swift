// ============================================================================
// المصدر الموحّد لتصنيف المنصّة — مصفوفة القطاعات المشتركة (21 قطاعًا · 96 تخصّصًا)
// ----------------------------------------------------------------------------
// المبنيّ على `job_platform_classification_matrix.xlsx` (تصنيف المالك). الفلسفة:
// القطاع «محور مشترك» بين الأطراف الثلاثة (باحث/جهة/خبير)، لا يملكه طرف واحد؛
// والمطابقة عبر مفاتيح مشتركة: القطاع + التخصّص + المسمّى + المهارات + الموقع + نوع الفرصة.
//
// ثلاثة محاور متعامدة لا تختلط:
//   1) مَن الطرف        → `personas.ts` (شخصيّات/أنواع/تخصّصات خبراء/حوكمة) — يبقى كما هو
//   2) أي مجال (هنا)     → قطاع → تخصّص فرعي → مهارة
//   3) أي شكل فرصة       → `OPPORTUNITY_TYPES` (حقل مستقل)
//
// المرحلة 0: هذا الملف مصدر حقيقة قائم بذاته ومختبَر، وغير مستهلَك من الواجهة بعد.
// توحيد `taxonomy.ts` (الـ8 قطاعات القديمة) فيه يتمّ في المرحلة 2 عند إعادة توصيل
// المستهلكين. حتى ذلك الحين يتعايش الملفّان بلا تعارض (`taxonomy.ts` لم يُلمَس).
// المرجع الحيّ للخطة: DOC/TAXONOMY_PLAN.md
// ============================================================================

/** نوع عنصر التصنيف الفرعي (عمود «نوع العنصر» في المصفوفة) */
export type SubType = 'specialty' | 'title' | 'sub_sector' | 'opportunity_tag'

export interface SubSpecialty {
  /** مُعرّف ثابت (slug) فريد داخل القطاع */
  id: string
  label: string
  en: string
  type: SubType
  /** كلمات بحث عربي+إنجليزي — تُغذّي البحث الشامل والتصنيف الآلي */
  keywords: string[]
  /** أمثلة مسمّيات أو خدمات تندرج تحت هذا التخصّص */
  sampleTitles: string[]
  /** مهارات ملموسة مربوطة بالتخصّص (مدموجة من taxonomy.ts القديم + قابلة للتوسّع) */
  skills: string[]
  /** هل مصدره «التصنيف المرفق» الأصلي؟ (لقياس تغطية القائمة الأصلية) */
  fromMatrix: boolean
  note?: string
}

export interface Sector {
  /** كود المصفوفة S01..S21 (مفتاح ثابت) */
  code: string
  /** slug ثابت للتوافق الخلفي (7 من الـ8 القديمة تحتفظ بـslugها) */
  id: string
  label: string
  en: string
  icon: string
  /** رمز لون دلالي بمفردات مكوّنات الأساس (brand/emerald/accent/success/info/warning/error/neutral) */
  color: string
  /** أولوية الظهور 1..21 — أهمّ القطاعات تظهر أولًا؛ البقية تحت «المزيد» */
  priority: number
  description: string
  subs: SubSpecialty[]
}

// ————————————————————————————————————————————————————————————————
// القطاعات الـ21 (كل تخصّص: كلمات بحث + أمثلة مسمّيات + مهارات + مصدر + ملاحظة)
// ————————————————————————————————————————————————————————————————
export const SECTORS: Sector[] = [
  {
    code: 'S01', id: 'technology', label: 'التقنية وتكنولوجيا المعلومات', en: 'IT & Technology',
    icon: 'mdi-code-tags', color: 'brand', priority: 1,
    description: 'البرمجيات، الشبكات، الدعم الفني، البيانات، الأمن السيبراني والذكاء الاصطناعي.',
    subs: [
      { id: 'software_development', label: 'تطوير البرمجيات', en: 'Software Development', type: 'specialty', keywords: ['برمجة', 'مطور', 'software', 'laravel', 'flutter'], sampleTitles: ['مطور Backend', 'مطور Frontend', 'مطور Mobile', 'مطور Laravel', 'مطور Flutter'], skills: ['PHP', 'Python', 'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Node.js', 'Laravel', 'Flutter'], fromMatrix: true, note: 'بديل احترافي لتصنيف برمجة.' },
      { id: 'web_dev', label: 'تصميم وتطوير المواقع', en: 'Web Design & Development', type: 'specialty', keywords: ['تصميم مواقع', 'web design', 'wordpress'], sampleTitles: ['مصمم مواقع', 'مطور WordPress', 'Frontend Developer'], skills: [], fromMatrix: true, note: 'يندرج تحت التقنية لا التصميم العام فقط.' },
      { id: 'networks_infra', label: 'الشبكات والبنية التحتية', en: 'Networks & Infrastructure', type: 'specialty', keywords: ['كمبيوتر وشبكات', 'network', 'system admin'], sampleTitles: ['مهندس شبكات', 'فني شبكات', 'مسؤول أنظمة'], skills: ['AWS', 'Docker', 'Kubernetes'], fromMatrix: true, note: 'من التصنيف الأصلي كمبيوتر وشبكات.' },
      { id: 'it_support', label: 'الدعم الفني وتقنية الحاسب', en: 'IT Support & Computer Technician', type: 'specialty', keywords: ['تقني', 'دعم فني', 'computer technician'], sampleTitles: ['فني دعم', 'تقني حاسب', 'فني صيانة أجهزة'], skills: [], fromMatrix: true, note: 'مصطلح تقني يتحول لتخصص واضح.' },
      { id: 'data_entry', label: 'إدخال البيانات والعمليات الرقمية', en: 'Data Entry & Digital Operations', type: 'title', keywords: ['مدخل بيانات', 'data entry'], sampleTitles: ['مدخل بيانات', 'منسق بيانات', 'مشغل نظام'], skills: [], fromMatrix: true, note: 'قد يظهر أيضًا تحت الإدارة حسب طبيعة العمل.' },
      { id: 'data_ai', label: 'تحليل البيانات والذكاء الاصطناعي', en: 'Data & AI', type: 'specialty', keywords: ['data analyst', 'AI', 'machine learning', 'تحليل البيانات'], sampleTitles: ['محلل بيانات', 'عالم بيانات', 'مهندس تعلم آلة'], skills: ['SQL', 'تحليل البيانات'], fromMatrix: false, note: 'إضافة احترافية مهمة.' },
      { id: 'cybersecurity', label: 'الأمن السيبراني', en: 'Cybersecurity', type: 'specialty', keywords: ['security', 'cybersecurity', 'SOC'], sampleTitles: ['أخصائي أمن سيبراني', 'محلل SOC', 'مهندس أمن'], skills: [], fromMatrix: false, note: 'يوصى بإضافته كفرع مستقل.' },
    ],
  },
  {
    code: 'S02', id: 'administration', label: 'الإدارة والموارد البشرية', en: 'Administration & HR',
    icon: 'mdi-briefcase-outline', color: 'accent', priority: 2,
    description: 'إدارة الأعمال، الموارد البشرية، التوظيف، السكرتارية، والعمليات الإدارية.',
    subs: [
      { id: 'business_admin', label: 'إدارة الأعمال', en: 'Business Administration', type: 'specialty', keywords: ['إدارة', 'admin', 'operations'], sampleTitles: ['مدير إداري', 'مدير عمليات', 'منسق إداري'], skills: ['PMP', 'Agile', 'إدارة المشاريع', 'القيادة'], fromMatrix: true, note: 'ينظّم تصنيف إدارة.' },
      { id: 'hr_recruitment', label: 'الموارد البشرية والتوظيف', en: 'Human Resources & Recruitment', type: 'specialty', keywords: ['موارد بشرية', 'HR', 'recruitment'], sampleTitles: ['أخصائي موارد بشرية', 'مسؤول توظيف', 'Talent Acquisition'], skills: [], fromMatrix: true, note: 'مهم لربط الجهات والخبراء.' },
      { id: 'secretarial', label: 'السكرتارية والمساندة المكتبية', en: 'Secretarial & Office Support', type: 'specialty', keywords: ['سكرتارية', 'assistant', 'office'], sampleTitles: ['سكرتير', 'مساعد إداري', 'منسق مكتب'], skills: [], fromMatrix: true, note: 'تصنيف مكتبي واضح.' },
      { id: 'operations_mgmt', label: 'الإدارة التشغيلية', en: 'Operations Management', type: 'specialty', keywords: ['operations', 'تشغيل', 'إدارة'], sampleTitles: ['مشرف عمليات', 'منسق عمليات', 'مدير تشغيل'], skills: [], fromMatrix: false, note: 'يفيد جهات التوظيف.' },
      { id: 'admin_affairs', label: 'الشؤون الإدارية', en: 'Administrative Affairs', type: 'specialty', keywords: ['موظفين', 'إداري', 'admin officer'], sampleTitles: ['مسؤول شؤون إدارية', 'موظف إداري'], skills: [], fromMatrix: true, note: 'بديل أفضل لكلمة موظفين العامة.' },
    ],
  },
  {
    code: 'S03', id: 'finance', label: 'المالية والمحاسبة', en: 'Finance & Accounting',
    icon: 'mdi-finance', color: 'success', priority: 3,
    description: 'المحاسبة، التدقيق، التحليل المالي، المصارف، الضرائب والزكاة.',
    subs: [
      { id: 'accounting', label: 'المحاسبة', en: 'Accounting', type: 'specialty', keywords: ['حسابات', 'محاسبة', 'accountant'], sampleTitles: ['محاسب', 'محاسب رواتب', 'محاسب تكاليف'], skills: [], fromMatrix: true, note: 'تحويل حسابات إلى محاسبة.' },
      { id: 'auditing', label: 'التدقيق المالي', en: 'Auditing', type: 'specialty', keywords: ['audit', 'تدقيق', 'مراجعة'], sampleTitles: ['مدقق داخلي', 'مدقق خارجي', 'مراجع مالي'], skills: [], fromMatrix: false, note: 'فرع مالي أساسي.' },
      { id: 'financial_analysis', label: 'التحليل المالي', en: 'Financial Analysis', type: 'specialty', keywords: ['financial analyst', 'budget'], sampleTitles: ['محلل مالي', 'أخصائي ميزانية'], skills: [], fromMatrix: false, note: 'مناسب للخبرات المتقدمة.' },
      { id: 'tax_zakat', label: 'الضرائب والزكاة', en: 'Tax & Zakat', type: 'specialty', keywords: ['tax', 'VAT', 'زكاة'], sampleTitles: ['خبير ضرائب', 'أخصائي زكاة وضريبة'], skills: [], fromMatrix: false, note: 'مهم في السوق السعودي.' },
      { id: 'banking_finance', label: 'المصارف والتمويل', en: 'Banking & Finance', type: 'specialty', keywords: ['banking', 'finance', 'credit'], sampleTitles: ['مصرفي', 'مسؤول تمويل', 'محلل ائتمان'], skills: [], fromMatrix: false, note: 'قطاع فرعي قابل للتوسع.' },
    ],
  },
  {
    code: 'S04', id: 'sales_marketing', label: 'المبيعات والتسويق وخدمة العملاء', en: 'Sales, Marketing & Customer Experience',
    icon: 'mdi-bullhorn-outline', color: 'warning', priority: 4,
    description: 'المبيعات، التسويق الرقمي، العلاقات العامة، خدمة العملاء وإدارة الحسابات.',
    subs: [
      { id: 'sales', label: 'المبيعات', en: 'Sales', type: 'specialty', keywords: ['مبيعات', 'sales', 'account executive'], sampleTitles: ['مندوب مبيعات', 'مدير مبيعات', 'مشرف مبيعات'], skills: ['التفاوض'], fromMatrix: true, note: 'يفصل عن التسويق عند البحث.' },
      { id: 'digital_marketing', label: 'التسويق الرقمي', en: 'Digital Marketing', type: 'specialty', keywords: ['تسويق', 'marketing', 'ads', 'SEO'], sampleTitles: ['مسوق رقمي', 'أخصائي إعلانات', 'SEO', 'Social Media'], skills: ['التسويق الرقمي'], fromMatrix: true, note: 'جزء من مبيعات وتسويق.' },
      { id: 'customer_service', label: 'خدمة العملاء', en: 'Customer Service', type: 'specialty', keywords: ['خدمة الزبائن', 'customer service'], sampleTitles: ['ممثل خدمة عملاء', 'مشرف كول سنتر', 'دعم عملاء'], skills: [], fromMatrix: true, note: 'واجهة سعودية أوضح من خدمة الزبائن.' },
      { id: 'public_relations', label: 'العلاقات العامة والاتصال', en: 'Public Relations & Communications', type: 'specialty', keywords: ['علاقات عامة', 'PR', 'communications'], sampleTitles: ['مسؤول علاقات عامة', 'أخصائي اتصال', 'متحدث رسمي'], skills: [], fromMatrix: true, note: 'يمكن ربطه بالإعلام أيضًا.' },
      { id: 'account_management', label: 'إدارة الحسابات التجارية', en: 'Account Management', type: 'specialty', keywords: ['account manager', 'key accounts'], sampleTitles: ['مدير حسابات', 'مسؤول عملاء رئيسيين'], skills: [], fromMatrix: false, note: 'يناسب B2B والمبيعات الاحترافية.' },
    ],
  },
  {
    code: 'S05', id: 'engineering', label: 'الهندسة والمقاولات والبناء', en: 'Engineering & Construction',
    icon: 'mdi-ruler-square-compass', color: 'info', priority: 5,
    description: 'الهندسة المدنية والمعمارية والكهربائية والميكانيكية، المقاولات وإدارة المشاريع.',
    subs: [
      { id: 'civil_structural', label: 'الهندسة المدنية والإنشائية', en: 'Civil & Structural Engineering', type: 'specialty', keywords: ['مهندس', 'مدني', 'construction'], sampleTitles: ['مهندس مدني', 'مهندس إنشائي', 'مشرف موقع'], skills: ['AutoCAD', 'Civil 3D'], fromMatrix: true, note: 'ضمن هندسة ومقاولات.' },
      { id: 'architecture', label: 'الهندسة المعمارية', en: 'Architecture', type: 'specialty', keywords: ['architecture', 'معماري', 'autocad'], sampleTitles: ['مهندس معماري', 'مصمم معماري', 'رسام أوتوكاد'], skills: ['Revit'], fromMatrix: false, note: 'فرع هندسي مستقل.' },
      { id: 'electrical_mechanical', label: 'الهندسة الكهربائية والميكانيكية', en: 'Electrical & Mechanical Engineering', type: 'specialty', keywords: ['MEP', 'كهرباء', 'ميكانيكا'], sampleTitles: ['مهندس كهرباء', 'مهندس ميكانيكا', 'MEP'], skills: ['SolidWorks', 'MATLAB', 'ANSYS'], fromMatrix: false, note: 'يرتبط بالمشاريع والمصانع.' },
      { id: 'engineering_pm', label: 'إدارة المشاريع الهندسية', en: 'Engineering Project Management', type: 'specialty', keywords: ['project manager', 'planning', 'PMP'], sampleTitles: ['مدير مشروع', 'مهندس تخطيط', 'مراقب تكلفة'], skills: [], fromMatrix: false, note: 'مهم لجهات التوظيف.' },
      { id: 'contracting', label: 'المقاولات والتشييد', en: 'Contracting & Construction', type: 'sub_sector', keywords: ['مقاولات', 'construction', 'contractor'], sampleTitles: ['مقاول', 'مشرف مقاولات', 'مراقب إنشاءات'], skills: [], fromMatrix: true, note: 'مصدره تصنيف مقاولات.' },
    ],
  },
  {
    code: 'S06', id: 'trades', label: 'التشغيل والصيانة والحرف الفنية', en: 'Skilled Trades & Maintenance',
    icon: 'mdi-wrench-outline', color: 'emerald', priority: 6,
    description: 'المهن الفنية والحرفية، الصيانة العامة، التكييف والتبريد، الكهرباء والسباكة والنجارة.',
    subs: [
      { id: 'hvac', label: 'التكييف والتبريد', en: 'HVAC', type: 'specialty', keywords: ['تقنيين تكييف وتبريد', 'HVAC'], sampleTitles: ['فني تكييف', 'فني تبريد', 'مشرف HVAC'], skills: [], fromMatrix: true, note: 'صياغة مهنية لتصنيف تقنيين تكييف وتبريد.' },
      { id: 'general_maintenance', label: 'الصيانة العامة', en: 'General Maintenance', type: 'specialty', keywords: ['صيانة', 'فني', 'maintenance'], sampleTitles: ['فني صيانة', 'مشرف صيانة', 'فني مرافق'], skills: [], fromMatrix: false, note: 'يرتبط بإدارة المرافق أيضًا.' },
      { id: 'electrical_plumbing_carpentry', label: 'الكهرباء والسباكة والنجارة', en: 'Electrical, Plumbing & Carpentry', type: 'specialty', keywords: ['حرفيين', 'كهربائي', 'سباك', 'نجار'], sampleTitles: ['كهربائي', 'سباك', 'نجار', 'فني تركيب'], skills: [], fromMatrix: true, note: 'تفصيل تصنيف حرفيين.' },
      { id: 'technical_operations', label: 'التشغيل الفني', en: 'Technical Operations', type: 'specialty', keywords: ['تقني', 'تشغيل', 'operator'], sampleTitles: ['فني تشغيل', 'مشغل معدات', 'مراقب تشغيل'], skills: [], fromMatrix: true, note: 'بديل أدق لكلمة تقني.' },
      { id: 'professional_crafts', label: 'الحرف المهنية', en: 'Professional Crafts', type: 'sub_sector', keywords: ['حرفيين', 'crafts'], sampleTitles: ['حرفي', 'فني تركيب', 'فني ورش'], skills: [], fromMatrix: true, note: 'للمهن التي لا تقع في فرع محدد.' },
    ],
  },
  {
    code: 'S07', id: 'logistics', label: 'النقل والتوصيل والخدمات اللوجستية', en: 'Logistics, Transport & Delivery',
    icon: 'mdi-truck-outline', color: 'brand', priority: 7,
    description: 'السائقون، التوصيل، الشحن، المستودعات، وسلاسل الإمداد.',
    subs: [
      { id: 'drivers', label: 'السائقون', en: 'Drivers', type: 'title', keywords: ['سائق', 'driver'], sampleTitles: ['سائق خاص', 'سائق نقل', 'سائق شاحنة'], skills: [], fromMatrix: true, note: 'فرع واضح من النقل.' },
      { id: 'delivery', label: 'التوصيل والدليفري', en: 'Delivery', type: 'specialty', keywords: ['عمال دليفري', 'delivery'], sampleTitles: ['مندوب توصيل', 'عامل دليفري', 'كابتن توصيل'], skills: [], fromMatrix: true, note: 'واجهة المستخدم: مندوب توصيل.' },
      { id: 'shipping_transport', label: 'الشحن والنقل', en: 'Shipping & Transport', type: 'specialty', keywords: ['شحن', 'نقل', 'fleet'], sampleTitles: ['منسق شحن', 'مشرف نقل', 'مسؤول أسطول'], skills: [], fromMatrix: false, note: 'مناسب للشركات اللوجستية.' },
      { id: 'warehousing', label: 'المستودعات', en: 'Warehousing', type: 'specialty', keywords: ['warehouse', 'مخزن', 'مستودع'], sampleTitles: ['مشرف مستودع', 'أمين مخزن', 'عامل مستودع'], skills: ['إدارة المخزون'], fromMatrix: false, note: 'يندرج تحت اللوجستيات.' },
      { id: 'supply_chain', label: 'سلاسل الإمداد', en: 'Supply Chain', type: 'specialty', keywords: ['supply chain', 'procurement'], sampleTitles: ['مخطط طلب', 'أخصائي سلسلة إمداد', 'مشتريات'], skills: ['التخطيط اللوجستي', 'تحسين سلاسل التوريد'], fromMatrix: false, note: 'فرع احترافي إضافي.' },
    ],
  },
  {
    code: 'S08', id: 'health', label: 'الصحة والرعاية الطبية', en: 'Healthcare & Medical',
    icon: 'mdi-heart-pulse', color: 'error', priority: 8,
    description: 'الطب، التمريض، الصيدلة، المختبرات، الأشعة، والإدارة الصحية.',
    subs: [
      { id: 'medicine_nursing', label: 'الطب والتمريض', en: 'Medicine & Nursing', type: 'specialty', keywords: ['طب وتمريض', 'doctor', 'nurse'], sampleTitles: ['طبيب', 'ممرض', 'مساعد طبي'], skills: ['التمريض السريري', 'الأبحاث السريرية', 'التغذية العلاجية'], fromMatrix: true, note: 'من التصنيف الأصلي.' },
      { id: 'pharmacy', label: 'الصيدلة', en: 'Pharmacy', type: 'specialty', keywords: ['pharmacy', 'صيدلة'], sampleTitles: ['صيدلي', 'مساعد صيدلي', 'أخصائي دواء'], skills: [], fromMatrix: false, note: 'إضافة ضرورية للقطاع الصحي.' },
      { id: 'labs_radiology', label: 'المختبرات والأشعة', en: 'Labs & Radiology', type: 'specialty', keywords: ['lab', 'radiology', 'مختبر'], sampleTitles: ['فني مختبر', 'أخصائي أشعة', 'فني تحاليل'], skills: ['التحاليل الطبية'], fromMatrix: false, note: 'تخصصات صحية شائعة.' },
      { id: 'healthcare_admin', label: 'الإدارة الصحية', en: 'Healthcare Administration', type: 'specialty', keywords: ['health admin', 'إدارة صحية'], sampleTitles: ['إداري صحي', 'منسق عيادات', 'مدير مركز طبي'], skills: [], fromMatrix: false, note: 'مهم لجهات طبية.' },
      { id: 'home_healthcare', label: 'الرعاية الصحية المنزلية', en: 'Home Healthcare', type: 'specialty', keywords: ['رعاية', 'home care'], sampleTitles: ['مقدم رعاية صحية', 'ممرض منزلي'], skills: [], fromMatrix: false, note: 'يفصل عن العمالة المنزلية.' },
    ],
  },
  {
    code: 'S09', id: 'education', label: 'التعليم والتدريب', en: 'Education & Training',
    icon: 'mdi-school-outline', color: 'success', priority: 9,
    description: 'التعليم الأكاديمي، التدريب المهني، تطوير المهارات، والتعليم الإلكتروني.',
    subs: [
      { id: 'school_education', label: 'التعليم المدرسي', en: 'School Education', type: 'specialty', keywords: ['تعليم وتدريس', 'teacher'], sampleTitles: ['معلم', 'معلمة', 'مشرف تربوي'], skills: ['تصميم مناهج'], fromMatrix: true, note: 'فرع أساسي.' },
      { id: 'vocational_training', label: 'التدريب المهني', en: 'Vocational Training', type: 'specialty', keywords: ['training', 'vocational'], sampleTitles: ['مدرب مهني', 'مدرب تقني', 'مدرب مهارات'], skills: ['تدريب المدربين', 'تدريب قيادي'], fromMatrix: false, note: 'يربط الخبراء والداعمين.' },
      { id: 'higher_education', label: 'التعليم العالي', en: 'Higher Education', type: 'specialty', keywords: ['university', 'lecturer'], sampleTitles: ['أستاذ جامعي', 'محاضر', 'باحث أكاديمي'], skills: [], fromMatrix: false, note: 'للمؤسسات التعليمية.' },
      { id: 'e_learning', label: 'التعليم الإلكتروني', en: 'E-learning', type: 'specialty', keywords: ['e-learning', 'online course'], sampleTitles: ['مصمم تعليمي', 'مدرب أونلاين', 'مطور محتوى تعليمي'], skills: ['التعليم الإلكتروني'], fromMatrix: false, note: 'مهم للتدريب الحديث.' },
      { id: 'early_childhood', label: 'الطفولة المبكرة والتعليم التمهيدي', en: 'Early Childhood Education', type: 'specialty', keywords: ['حضانة أطفال', 'nursery'], sampleTitles: ['معلمة حضانة', 'مشرفة حضانة', 'جليسة أطفال تعليمية'], skills: [], fromMatrix: true, note: 'يختلف عن الرعاية المنزلية حسب طبيعة الجهة.' },
    ],
  },
  {
    code: 'S10', id: 'hospitality', label: 'الضيافة والسياحة والمطاعم', en: 'Hospitality, Tourism & Restaurants',
    icon: 'mdi-silverware-fork-knife', color: 'warning', priority: 10,
    description: 'الفنادق، المطاعم، المقاهي، السفر، السياحة، والفعاليات.',
    subs: [
      { id: 'restaurants_cafes', label: 'المطاعم والمقاهي', en: 'Restaurants & Cafes', type: 'specialty', keywords: ['سياحة ومطاعم', 'restaurant', 'chef'], sampleTitles: ['طاهي', 'باريستا', 'مقدم طعام', 'مدير مطعم'], skills: [], fromMatrix: true, note: 'جزء من الضيافة.' },
      { id: 'hotels_reception', label: 'الفنادق والاستقبال', en: 'Hotels & Reception', type: 'specialty', keywords: ['hotel', 'reception'], sampleTitles: ['موظف استقبال', 'مدير فندق', 'مشرف ضيافة'], skills: [], fromMatrix: false, note: 'فرع ضيافة شائع.' },
      { id: 'tourism_travel', label: 'السياحة والسفر', en: 'Tourism & Travel', type: 'specialty', keywords: ['سياحة وسفر', 'travel', 'tourism'], sampleTitles: ['مرشد سياحي', 'موظف حجوزات', 'مستشار سفر'], skills: [], fromMatrix: true, note: 'مصدره تصنيف سياحة وسفر.' },
      { id: 'events_management', label: 'تنظيم الفعاليات', en: 'Events Management', type: 'specialty', keywords: ['events', 'فعاليات'], sampleTitles: ['منظم فعاليات', 'منسق مؤتمرات', 'مشرف فعالية'], skills: [], fromMatrix: false, note: 'يرتبط بالترفيه أيضًا.' },
      { id: 'culinary_hospitality', label: 'الطهي والضيافة', en: 'Culinary & Hospitality', type: 'specialty', keywords: ['culinary', 'hospitality'], sampleTitles: ['شيف', 'مساعد شيف', 'مضيف'], skills: [], fromMatrix: false, note: 'للمسميات داخل المطاعم والفنادق.' },
    ],
  },
  {
    code: 'S11', id: 'design', label: 'التصميم والفنون والإبداع', en: 'Creative, Arts & Design',
    icon: 'mdi-palette-outline', color: 'emerald', priority: 11,
    description: 'التصميم الجرافيكي، الفنون، الأزياء، الخياطة، التصوير، والمونتاج الإبداعي.',
    subs: [
      { id: 'graphic_design', label: 'التصميم الجرافيكي', en: 'Graphic Design', type: 'specialty', keywords: ['تصميم', 'graphic design'], sampleTitles: ['مصمم جرافيك', 'مصمم هوية', 'مصمم إعلانات'], skills: ['Figma', 'Adobe Suite', 'Sketch', 'UI/UX'], fromMatrix: true, note: 'يندرج تحت الإبداع.' },
      { id: 'fashion_design', label: 'تصميم الأزياء والخياطة', en: 'Fashion Design & Tailoring', type: 'specialty', keywords: ['أزياء', 'خياطين', 'fashion'], sampleTitles: ['مصمم أزياء', 'خياط', 'باترون', 'مشرف إنتاج أزياء'], skills: [], fromMatrix: true, note: 'يجمع أزياء وخياطين.' },
      { id: 'fine_arts', label: 'الفنون الجميلة', en: 'Fine Arts', type: 'specialty', keywords: ['فنون جميلة', 'artist'], sampleTitles: ['فنان تشكيلي', 'رسام', 'نحات'], skills: [], fromMatrix: true, note: 'من التصنيف الأصلي.' },
      { id: 'editing_directing', label: 'المونتاج والإخراج', en: 'Editing & Directing', type: 'specialty', keywords: ['مونتاج وإخراج', 'video editing'], sampleTitles: ['مونتير', 'مخرج', 'محرر فيديو', 'صانع فيديو'], skills: ['المونتاج'], fromMatrix: true, note: 'قد يرتبط بالإعلام أيضًا.' },
      { id: 'photography_creative', label: 'التصوير والإنتاج الإبداعي', en: 'Photography & Creative Production', type: 'specialty', keywords: ['photography', 'production'], sampleTitles: ['مصور', 'منتج محتوى بصري', 'مصور منتجات'], skills: ['التصوير الفوتوغرافي'], fromMatrix: false, note: 'إضافة عملية.' },
    ],
  },
  {
    code: 'S12', id: 'media', label: 'الإعلام والكتابة والترجمة', en: 'Media, Content & Translation',
    icon: 'mdi-newspaper-variant-outline', color: 'info', priority: 12,
    description: 'الصحافة، التحرير، صناعة المحتوى، الترجمة، والاتصال المؤسسي.',
    subs: [
      { id: 'editing_writing', label: 'التحرير والكتابة', en: 'Editing & Writing', type: 'specialty', keywords: ['محررين', 'writing', 'editor'], sampleTitles: ['محرر', 'كاتب محتوى', 'Copywriter', 'مدقق لغوي'], skills: ['كتابة المحتوى'], fromMatrix: true, note: 'صياغة أوسع من محررين.' },
      { id: 'translation', label: 'الترجمة', en: 'Translation', type: 'specialty', keywords: ['مترجمين', 'translation'], sampleTitles: ['مترجم', 'مترجم فوري', 'مترجم قانوني'], skills: [], fromMatrix: true, note: 'من التصنيف الأصلي.' },
      { id: 'content_creation', label: 'صناعة المحتوى', en: 'Content Creation', type: 'specialty', keywords: ['content', 'social content'], sampleTitles: ['صانع محتوى', 'مدير محتوى', 'كاتب منصات'], skills: [], fromMatrix: false, note: 'يرتبط بالتسويق.' },
      { id: 'journalism_media', label: 'الصحافة والإعلام', en: 'Journalism & Media', type: 'specialty', keywords: ['media', 'journalism'], sampleTitles: ['صحفي', 'معد برامج', 'مراسل', 'منتج إعلامي'], skills: [], fromMatrix: false, note: 'قطاع إعلامي واضح.' },
      { id: 'corporate_communications', label: 'الاتصال المؤسسي', en: 'Corporate Communications', type: 'specialty', keywords: ['علاقات عامة', 'communications'], sampleTitles: ['أخصائي اتصال', 'مسؤول علاقات عامة', 'متحدث رسمي'], skills: [], fromMatrix: true, note: 'يمكن أن يظهر ضمن التسويق أيضًا.' },
    ],
  },
  {
    code: 'S13', id: 'legal', label: 'القانون والاستشارات', en: 'Legal & Consulting',
    icon: 'mdi-scale-balance', color: 'warning', priority: 13,
    description: 'المحاماة، الشؤون القانونية، العقود، الامتثال، والاستشارات الإدارية.',
    subs: [
      { id: 'legal_practice', label: 'المحاماة', en: 'Legal Practice', type: 'specialty', keywords: ['محاماة وقانون', 'lawyer'], sampleTitles: ['محامي', 'متدرب قانوني', 'وكيل شرعي'], skills: ['القضايا التجارية', 'التحكيم الدولي'], fromMatrix: true, note: 'من التصنيف الأصلي.' },
      { id: 'legal_consulting', label: 'الاستشارات القانونية', en: 'Legal Consulting', type: 'specialty', keywords: ['legal consultant'], sampleTitles: ['مستشار قانوني', 'مستشار عقود', 'أخصائي أنظمة'], skills: ['الملكية الفكرية'], fromMatrix: false, note: 'فرع احترافي.' },
      { id: 'business_consulting', label: 'الاستشارات الإدارية والأعمال', en: 'Business & Management Consulting', type: 'specialty', keywords: ['consulting', 'business'], sampleTitles: ['مستشار أعمال', 'مستشار إداري', 'مستشار تحول'], skills: [], fromMatrix: false, note: 'يربط الخبراء والداعمين.' },
      { id: 'contracts_compliance', label: 'العقود والامتثال', en: 'Contracts & Compliance', type: 'specialty', keywords: ['compliance', 'contracts'], sampleTitles: ['أخصائي امتثال', 'مسؤول عقود', 'مسؤول حوكمة'], skills: ['العقود التجارية'], fromMatrix: false, note: 'مهم للشركات.' },
    ],
  },
  {
    code: 'S14', id: 'security', label: 'الأمن والسلامة', en: 'Security & Safety',
    icon: 'mdi-shield-account-outline', color: 'error', priority: 14,
    description: 'الحراسة، الأمن، السلامة المهنية، مكافحة الحرائق، وإدارة المخاطر.',
    subs: [
      { id: 'security_guarding', label: 'الأمن والحراسة', en: 'Security Guarding', type: 'specialty', keywords: ['حراسة وأمن', 'security guard'], sampleTitles: ['رجل أمن', 'مشرف أمن', 'حارس أمن'], skills: [], fromMatrix: true, note: 'من التصنيف الأصلي.' },
      { id: 'hse', label: 'السلامة المهنية', en: 'HSE', type: 'specialty', keywords: ['safety', 'HSE'], sampleTitles: ['أخصائي سلامة', 'مشرف HSE', 'فني سلامة'], skills: [], fromMatrix: false, note: 'تخصص مطلوب في المشاريع.' },
      { id: 'risk_emergency', label: 'إدارة المخاطر والطوارئ', en: 'Risk & Emergency Management', type: 'specialty', keywords: ['risk', 'emergency', 'fire'], sampleTitles: ['مسؤول طوارئ', 'أخصائي مخاطر', 'فني إطفاء'], skills: [], fromMatrix: false, note: 'فرع احترافي.' },
    ],
  },
  {
    code: 'S15', id: 'home_services', label: 'الخدمات المنزلية والعناية الشخصية', en: 'Home & Personal Services',
    icon: 'mdi-home-account', color: 'accent', priority: 15,
    description: 'التنظيف، العمالة المنزلية، العناية الشخصية، التجميل، ورعاية الأطفال المنزلية.',
    subs: [
      { id: 'cleaning', label: 'التنظيف', en: 'Cleaning Services', type: 'specialty', keywords: ['عمال تنظيف', 'cleaning'], sampleTitles: ['عامل تنظيف', 'مشرف نظافة', 'عاملة تنظيف'], skills: [], fromMatrix: true, note: 'فرع من الخدمات المنزلية والتشغيلية.' },
      { id: 'domestic_work', label: 'العمالة المنزلية', en: 'Domestic Work', type: 'specialty', keywords: ['عمالة منزلية', 'domestic worker'], sampleTitles: ['عاملة منزلية', 'عامل منزلي', 'مساعد منزلي'], skills: [], fromMatrix: true, note: 'قد يحتاج ضوابط امتثال محلية.' },
      { id: 'beauty_personal_care', label: 'التجميل والعناية الشخصية', en: 'Beauty & Personal Care', type: 'specialty', keywords: ['تزيين وتجميل', 'beauty'], sampleTitles: ['خبيرة تجميل', 'حلاق', 'مصفف شعر', 'أخصائي عناية'], skills: [], fromMatrix: true, note: 'واجهة المستخدم: التجميل والعناية الشخصية.' },
      { id: 'childcare', label: 'حضانة ورعاية الأطفال', en: 'Childcare', type: 'specialty', keywords: ['حضانة أطفال', 'childcare'], sampleTitles: ['جليسة أطفال', 'مشرفة حضانة', 'مربية'], skills: [], fromMatrix: true, note: 'قد تصنف تعليمية أو منزلية حسب السياق.' },
      { id: 'gardening', label: 'الحدائق والمناظر الطبيعية', en: 'Gardening & Landscaping', type: 'specialty', keywords: ['حدائق ومناظر طبيعية', 'landscaping'], sampleTitles: ['عامل حدائق', 'منسق حدائق', 'مشرف زراعة'], skills: [], fromMatrix: true, note: 'قد يظهر أيضًا في الزراعة والبيئة.' },
    ],
  },
  {
    code: 'S16', id: 'agriculture', label: 'الزراعة والبيئة والاستدامة', en: 'Agriculture, Environment & Sustainability',
    icon: 'mdi-sprout-outline', color: 'success', priority: 16,
    description: 'الزراعة، تنسيق الحدائق، البيئة، الاستدامة، والطاقة المتجددة.',
    subs: [
      { id: 'farming', label: 'الزراعة', en: 'Agriculture', type: 'specialty', keywords: ['زراعة', 'farm', 'agriculture'], sampleTitles: ['مهندس زراعي', 'عامل مزرعة', 'مشرف مزرعة'], skills: [], fromMatrix: false, note: 'إضافة لتغطية القطاع.' },
      { id: 'environment_sustainability', label: 'البيئة والاستدامة', en: 'Environment & Sustainability', type: 'specialty', keywords: ['environment', 'sustainability', 'ESG'], sampleTitles: ['أخصائي بيئي', 'أخصائي استدامة', 'مسؤول ESG'], skills: [], fromMatrix: false, note: 'قطاع حديث ومهم.' },
      { id: 'landscaping', label: 'تنسيق الحدائق', en: 'Landscaping', type: 'specialty', keywords: ['حدائق ومناظر طبيعية', 'landscaping'], sampleTitles: ['منسق حدائق', 'مصمم حدائق', 'عامل مناظر طبيعية'], skills: [], fromMatrix: true, note: 'رابط مباشر مع التصنيف المرفق.' },
      { id: 'renewable_energy', label: 'الطاقة المتجددة', en: 'Renewable Energy', type: 'specialty', keywords: ['renewable', 'solar'], sampleTitles: ['أخصائي طاقة شمسية', 'مهندس طاقة متجددة'], skills: [], fromMatrix: false, note: 'قد ينقل لقطاع الطاقة عند التوسع.' },
    ],
  },
  {
    code: 'S17', id: 'sports', label: 'الرياضة واللياقة والترفيه', en: 'Sports, Fitness & Entertainment',
    icon: 'mdi-dumbbell', color: 'info', priority: 17,
    description: 'التدريب الرياضي، اللياقة البدنية، الترفيه، والأنشطة الجماهيرية.',
    subs: [
      { id: 'sports_coaching', label: 'التدريب الرياضي', en: 'Sports Coaching', type: 'specialty', keywords: ['coach', 'sport'], sampleTitles: ['مدرب رياضي', 'مدرب كرة', 'مدرب شخصي'], skills: [], fromMatrix: false, note: 'يرتبط باللياقة.' },
      { id: 'fitness', label: 'اللياقة البدنية', en: 'Fitness', type: 'specialty', keywords: ['لياقة بدنية', 'fitness'], sampleTitles: ['مدرب لياقة', 'مدرب شخصي', 'أخصائي تغذية رياضية'], skills: [], fromMatrix: true, note: 'من التصنيف المرفق.' },
      { id: 'entertainment_activities', label: 'الترفيه والأنشطة', en: 'Entertainment & Activities', type: 'specialty', keywords: ['entertainment', 'activity'], sampleTitles: ['مشرف ترفيه', 'منسق نشاط', 'منظم ألعاب'], skills: [], fromMatrix: false, note: 'للفعاليات والترفيه.' },
      { id: 'sports_events', label: 'إدارة الفعاليات الرياضية', en: 'Sports Events Management', type: 'specialty', keywords: ['sports event'], sampleTitles: ['منسق بطولة', 'مدير فعالية رياضية'], skills: [], fromMatrix: false, note: 'مناسب للأندية والمنظمين.' },
    ],
  },
  {
    code: 'S18', id: 'manufacturing', label: 'التصنيع والإنتاج والوظائف التشغيلية', en: 'Manufacturing, Production & Operations',
    icon: 'mdi-factory', color: 'emerald', priority: 18,
    description: 'المصانع، الإنتاج، التعبئة، الجودة، التشغيل، والوظائف العمالية المنظمة.',
    subs: [
      { id: 'production_packing', label: 'عمال الإنتاج والتعبئة', en: 'Production & Packing Workers', type: 'title', keywords: ['عمال', 'production worker'], sampleTitles: ['عامل إنتاج', 'عامل تعبئة', 'عامل مستودع إنتاج'], skills: [], fromMatrix: true, note: 'بديل منظم لكلمة عمال.' },
      { id: 'industrial_operations', label: 'التشغيل الصناعي', en: 'Industrial Operations', type: 'specialty', keywords: ['operator', 'factory'], sampleTitles: ['مشغل خط', 'مشرف تشغيل', 'فني مصنع'], skills: [], fromMatrix: false, note: 'يفصل عن الصيانة العامة.' },
      { id: 'industrial_quality', label: 'الجودة الصناعية', en: 'Industrial Quality', type: 'specialty', keywords: ['quality', 'QC'], sampleTitles: ['مراقب جودة', 'أخصائي جودة', 'QC Inspector'], skills: [], fromMatrix: false, note: 'مهم للصناعة.' },
      { id: 'industrial_maintenance', label: 'الصيانة الصناعية', en: 'Industrial Maintenance', type: 'specialty', keywords: ['industrial maintenance'], sampleTitles: ['فني صيانة صناعية', 'مهندس صيانة'], skills: [], fromMatrix: false, note: 'يرتبط بالقطاع الفني.' },
    ],
  },
  {
    code: 'S19', id: 'real_estate', label: 'العقار وإدارة المرافق', en: 'Real Estate & Facilities Management',
    icon: 'mdi-home-city-outline', color: 'brand', priority: 19,
    description: 'العقارات، إدارة المباني، إدارة المرافق، التشغيل والصيانة للمواقع.',
    subs: [
      { id: 'facilities_management', label: 'إدارة المرافق', en: 'Facilities Management', type: 'specialty', keywords: ['facilities', 'مرافق'], sampleTitles: ['مدير مرافق', 'مشرف مرافق', 'منسق خدمات'], skills: [], fromMatrix: false, note: 'قطاع تنظيمي مهم.' },
      { id: 'real_estate_brokerage', label: 'الوساطة العقارية', en: 'Real Estate Brokerage', type: 'specialty', keywords: ['real estate', 'عقار'], sampleTitles: ['وسيط عقاري', 'مستشار عقاري', 'مسؤول مبيعات عقار'], skills: [], fromMatrix: false, note: 'إضافة لتغطية السوق.' },
      { id: 'building_management', label: 'إدارة المباني', en: 'Building Management', type: 'specialty', keywords: ['building management'], sampleTitles: ['مشرف مبنى', 'مدير مجمع', 'مسؤول تشغيل موقع'], skills: [], fromMatrix: false, note: 'يرتبط بالمرافق.' },
      { id: 'building_maintenance', label: 'صيانة المباني', en: 'Building Maintenance', type: 'specialty', keywords: ['صيانة', 'مباني'], sampleTitles: ['مشرف صيانة مباني', 'فني مرافق', 'عامل صيانة'], skills: [], fromMatrix: false, note: 'يرتبط بالصيانة والحرف.' },
    ],
  },
  {
    code: 'S20', id: 'entrepreneurship', label: 'ريادة الأعمال والشراكات', en: 'Entrepreneurship & Partnerships',
    icon: 'mdi-rocket-launch-outline', color: 'accent', priority: 20,
    description: 'الشراكات، تأسيس الأعمال، الفرص التعاونية، والشريك المؤسس.',
    subs: [
      { id: 'business_partnerships', label: 'شراكات أعمال', en: 'Business Partnerships', type: 'opportunity_tag', keywords: ['شراكة', 'partnership'], sampleTitles: ['شريك تجاري', 'شريك تشغيل', 'شريك مبيعات'], skills: [], fromMatrix: true, note: 'لا يفضل أن تكون قطاعًا مهنيًا رئيسيًا في كل الصفحات.' },
      { id: 'collaboration_opps', label: 'فرص تعاون', en: 'Collaboration Opportunities', type: 'opportunity_tag', keywords: ['collaboration', 'تعاون'], sampleTitles: ['تعاون حر', 'مشروع مشترك', 'فرصة تعاون'], skills: [], fromMatrix: false, note: 'تظهر في نوع الفرصة أو الوسوم.' },
      { id: 'cofounder', label: 'شريك مؤسس', en: 'Co-founder', type: 'opportunity_tag', keywords: ['co-founder', 'founder'], sampleTitles: ['Co-founder', 'شريك تقني', 'شريك تسويق'], skills: [], fromMatrix: false, note: 'مهم للشركات الناشئة.' },
      { id: 'business_development', label: 'تطوير الأعمال', en: 'Business Development', type: 'specialty', keywords: ['business development', 'partnerships'], sampleTitles: ['مسؤول تطوير أعمال', 'مدير شراكات', 'Growth Manager'], skills: [], fromMatrix: false, note: 'قد يتبع المبيعات والإدارة أيضًا.' },
    ],
  },
  {
    code: 'S21', id: 'other', label: 'أخرى / يحتاج تصنيف', en: 'Other / Needs Classification',
    icon: 'mdi-dots-horizontal-circle-outline', color: 'neutral', priority: 21,
    description: 'خيار احتياطي للعناصر التي لا تنتمي بوضوح لأي قطاع، مع مراجعة دورية.',
    subs: [
      { id: 'unclassified', label: 'أخرى / غير مصنف', en: 'Other / Unclassified', type: 'specialty', keywords: ['متفرقات', 'other'], sampleTitles: ['أخرى', 'متفرقات', 'غير محدد'], skills: [], fromMatrix: true, note: 'يستخدم عند عدم وضوح التصنيف.' },
      { id: 'needs_review', label: 'يحتاج مراجعة إدارية', en: 'Needs Admin Review', type: 'sub_sector', keywords: ['review', 'needs classification'], sampleTitles: ['تصنيف مكرر', 'مسمى غير واضح', 'قطاع غير مناسب'], skills: [], fromMatrix: false, note: 'يوصى بمراجعته دوريًا لتقليل متفرقات.' },
    ],
  },
]

// ————————————————————————————————————————————————————————————————
// المحور 3: أنواع الفرص — حقل مستقل تمامًا عن القطاع (قاعدة الحوكمة 3)
// ————————————————————————————————————————————————————————————————
export type OpportunityTypeId
  = | 'full_time'
    | 'part_time'
    | 'internship'
    | 'freelance'
    | 'temp_contract'
    | 'remote'
    | 'partnership'
    | 'volunteer'

export interface OpportunityType { id: OpportunityTypeId, label: string, en: string, icon: string }
export const OPPORTUNITY_TYPES: OpportunityType[] = [
  { id: 'full_time', label: 'وظيفة دوام كامل', en: 'Full-time Job', icon: 'mdi-briefcase' },
  { id: 'part_time', label: 'وظيفة دوام جزئي', en: 'Part-time Job', icon: 'mdi-briefcase-outline' },
  { id: 'internship', label: 'تدريب', en: 'Internship', icon: 'mdi-clipboard-account-outline' },
  { id: 'freelance', label: 'عمل حر', en: 'Freelance', icon: 'mdi-laptop-account' },
  { id: 'temp_contract', label: 'عقد مؤقت', en: 'Temporary Contract', icon: 'mdi-file-clock-outline' },
  { id: 'remote', label: 'عمل عن بُعد', en: 'Remote Work', icon: 'mdi-home-city-outline' },
  { id: 'partnership', label: 'شراكة', en: 'Partnership', icon: 'mdi-handshake-outline' },
  { id: 'volunteer', label: 'تطوّع', en: 'Volunteering', icon: 'mdi-hand-heart-outline' },
]

export const OPPORTUNITY_TYPE_IDS = OPPORTUNITY_TYPES.map(o => o.id)

/** تسمية عربية لنوع فرصة عبر مُعرّفه (أو المُعرّف نفسه إن لم يُعرف) */
export function opportunityTypeLabel(id: string): string {
  return OPPORTUNITY_TYPES.find(o => o.id === id)?.label ?? id
}

/** توفيق مع `RequestKind` الحالي (job|project|consultation|task) — للترحيل التدريجي */
export const OPP_TYPE_FROM_REQUEST_KIND: Record<string, OpportunityTypeId> = {
  job: 'full_time',
  project: 'freelance',
  consultation: 'freelance',
  task: 'temp_contract',
}

// ————————————————————————————————————————————————————————————————
// قوائم مرجعية مشتركة (مفاتيح المطابقة الإضافية — ورقة 06)
// ————————————————————————————————————————————————————————————————
export const EXPERIENCE_LEVELS = ['بدون خبرة', 'مبتدئ', 'متوسط', 'خبير', 'إدارة عليا'] as const
export const WORK_ARRANGEMENTS = ['حضوري', 'عن بُعد', 'هجين', 'ميداني', 'مناوبات'] as const

// ————————————————————————————————————————————————————————————————
// جدول ترحيل القطاعات القديمة (taxonomy.ts) → الأكواد الجديدة
// 7 من الـ8 تحتفظ بـslugها 1:1؛ management ينقسم (افتراضي administration + مراجعة)
// ————————————————————————————————————————————————————————————————
export const LEGACY_SECTOR_MAP: Record<string, string> = {
  technology: 'S01',
  management: 'S02', // ينقسم فعليًّا إلى S02/S03/S04 — الافتراضي S02 مع وسم مراجعة عند الترحيل الفعلي
  design: 'S11',
  engineering: 'S05',
  health: 'S08',
  legal: 'S13',
  education: 'S09',
  logistics: 'S07',
}

/** يعيد كود القطاع الجديد لمُعرّف قديم (أو undefined إن لم يُعرف) */
export function migrateSector(oldId: string): string | undefined {
  return LEGACY_SECTOR_MAP[oldId]
}

// ————————————————————————————————————————————————————————————————
// ترحيل حقول القطاع الحرّة في البذور (department/field العربية) → slug قانوني.
// نموذج «التطبيع عند القراءة»: البذور تحتفظ بنصّها للعرض، وتُربط بالقطاع عبر resolver
// (بلا تعديل كل سجلّ). يغطّي كل قيم البذور الحالية (mockOpportunities · Requests ·
// PostedOpportunities · Interviewers). المرجع: DOC/TAXONOMY_PLAN.md
// ————————————————————————————————————————————————————————————————
export const FIELD_TO_SECTOR: Record<string, string> = {
  'التقنية': 'technology',
  'تطوير الويب': 'technology',
  'العمارة التقنية': 'technology',
  'البنية التحتية': 'technology',
  'البيانات': 'technology',
  'الأمن': 'technology', // سياق: أمن سيبراني
  'التصميم': 'design',
  'واجهات المستخدم': 'design',
  'أنظمة التصميم': 'design',
  'التسويق': 'sales_marketing',
  'المبيعات': 'sales_marketing',
  'الموارد البشرية': 'administration',
  'الإدارة': 'administration',
  'إدارة المشاريع': 'administration',
  'السلوكي': 'administration', // مقابلات سلوكية — سياق موارد بشرية
  'المالية': 'finance',
}

/** يحلّ قيمة حقل قطاع حرّة (slug/code/تسمية كاملة/سلسلة قديمة) إلى قطاع قانوني */
export function sectorForField(raw?: string): Sector | undefined {
  if (!raw)
    return undefined
  const t = raw.trim()
  const direct = getSector(t)
  if (direct)
    return direct
  const byLabel = SECTORS.find(s => s.label === t)
  if (byLabel)
    return byLabel
  const slug = FIELD_TO_SECTOR[t]
  return slug ? getSector(slug) : undefined
}

// ————————————————————————————————————————————————————————————————
// حوكمة: كلمات عامة يُمنع أن تكون قطاعًا (قاعدة الحوكمة 4)
// ————————————————————————————————————————————————————————————————
export const GENERIC_BLOCKLIST = ['عمال', 'عمالة', 'موظفين', 'موظف', 'تقني', 'متفرقات', 'عام', 'أخرى']

/** هل التسمية كلمة عامة لا تصلح قطاعًا رئيسيًّا؟ */
export function isGenericLabel(label: string): boolean {
  const n = label.trim()
  return GENERIC_BLOCKLIST.includes(n)
}

/** قواعد الحوكمة السبع (ورقة 07) — مرجع + المفروضة آليًّا معلّمة `enforced` */
export const GOVERNANCE_RULES: { id: string, rule: string, example: string, enforced: boolean }[] = [
  { id: 'shared_sectors', rule: 'الأقسام القطاعية مشتركة بين الباحثين والجهات والخبراء.', example: 'قطاع التقنية يستخدمه الجميع.', enforced: true },
  { id: 'sector_vs_title', rule: 'الفصل بين القطاع (مستوى أعلى) والمسمّى/التخصّص (مستوى أدق).', example: 'التقنية ← تطوير البرمجيات ← مطور Laravel', enforced: true },
  { id: 'type_vs_sector', rule: 'نوع الفرصة حقل مستقل عن القطاع.', example: 'شراكة نوع فرصة لا قطاع.', enforced: true },
  { id: 'no_generic', rule: 'لا تظهر كلمات عامة كأقسام رئيسية.', example: 'عمال/موظفين/تقني/متفرقات → تخصّص أو مراجعة.', enforced: true },
  { id: 'user_vs_sector', rule: 'مسمّى المستخدم (الطرف) منفصل عن قطاعه.', example: 'خبير مهني + قطاع الموارد البشرية.', enforced: false },
  { id: 'dual_context', rule: 'التصنيفات المزدوجة عبر وسم ثانوي حسب السياق.', example: 'حدائق: خدمات منزلية أو زراعة.', enforced: false },
  { id: 'other_hidden', rule: '«أخرى» ليست خيارًا بارزًا؛ تُراجَع دوريًّا.', example: 'متفرقات تُحوَّل لقطاعات فعلية.', enforced: true },
]

let _visible: Sector[] | null = null
/** القطاعات المرئية للمنتقيات — تُخفي «أخرى/S21» افتراضيًّا (قاعدة other_hidden) */
export function visibleSectors(includeOther = false): Sector[] {
  if (includeOther)
    return sectorsByPriority()
  if (!_visible)
    _visible = sectorsByPriority().filter(s => s.code !== 'S21')
  return _visible
}

export interface ClassificationResult {
  /** كود القطاع المُقترَح (قد يكون S21 عند الحاجة للمراجعة) */
  sectorCode?: string
  sectorId?: string
  /** يحتاج مراجعة إدارية؟ (كلمة عامة · بلا تطابق · غموض · أخرى) */
  needsReview: boolean
  reason?: string
}

/**
 * تصنيف نصّ حرّ إلى قطاع مع تطبيق الحوكمة: الكلمات العامة وعدم التطابق والغموض
 * و«أخرى» تُوجَّه للمراجعة الإدارية بدل قبولها بصمت.
 */
export function classifyText(text: string): ClassificationResult {
  const raw = (text ?? '').trim()
  if (!raw)
    return { needsReview: true, reason: 'نصّ فارغ' }
  if (isGenericLabel(raw))
    return { sectorCode: 'S21', sectorId: 'other', needsReview: true, reason: `كلمة عامة «${raw}» تحتاج تصنيفًا دقيقًا` }

  const t = raw.toLowerCase()
  const counts = new Map<string, number>()
  const bump = (code: string, n: number) => counts.set(code, (counts.get(code) ?? 0) + n)
  for (const s of SECTORS) {
    if (raw.includes(s.label))
      bump(s.code, 2)
    for (const sub of s.subs) {
      if (raw.includes(sub.label))
        bump(s.code, 2)
      for (const kw of sub.keywords) {
        if (t.includes(kw.toLowerCase()))
          bump(s.code, 1)
      }
      for (const sk of sub.skills) {
        if (t.includes(sk.toLowerCase()))
          bump(s.code, 1)
      }
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (!sorted.length)
    return { sectorCode: 'S21', sectorId: 'other', needsReview: true, reason: 'لم يُطابَق أي قطاع' }

  const [topCode, topScore] = sorted[0]
  if (topCode === 'S21')
    return { sectorCode: 'S21', sectorId: 'other', needsReview: true, reason: 'مصنّف كأخرى' }

  const ambiguous = sorted.length > 1 && sorted[1][1] === topScore
  return {
    sectorCode: topCode,
    sectorId: getSector(topCode)?.id,
    needsReview: ambiguous,
    reason: ambiguous ? 'تصنيف غامض (تعادل قطاعين) — يُنصح بالمراجعة' : undefined,
  }
}

// ————————————————————————————————————————————————————————————————
// مساعدات الوصول والبحث
// ————————————————————————————————————————————————————————————————
/** قطاع عبر كوده (S01) أو slugه (technology) أو مُعرّف قديم (management→administration) */
export function getSector(codeOrId: string | undefined): Sector | undefined {
  if (!codeOrId)
    return undefined
  const direct = SECTORS.find(s => s.code === codeOrId || s.id === codeOrId)
  if (direct)
    return direct
  // مرونة تجاه المعرّفات القديمة (taxonomy.ts) كي تبقى البيانات المخزّنة مربوطة
  const migrated = LEGACY_SECTOR_MAP[codeOrId]
  return migrated ? SECTORS.find(s => s.code === migrated) : undefined
}

/** كل التخصّصات الفرعية مسطّحة مع كود قطاعها الأب */
export const ALL_SUBS: { sector: string, sub: SubSpecialty }[]
  = SECTORS.flatMap(s => s.subs.map(sub => ({ sector: s.code, sub })))

/** كل المهارات المعروفة عبر المصفوفة (للإكمال التلقائي والفلاتر) — بلا تكرار مرتّبة */
export const ALL_SECTOR_SKILLS: string[]
  = [...new Set(SECTORS.flatMap(s => s.subs.flatMap(sub => sub.skills)))].sort()

/** تصنيف مهارة نصّية حرّة إلى كود قطاع (مطابقة تامّة ثم احتواء) */
export function sectorForSkill(name: string): string | undefined {
  const n = name.trim().toLowerCase()
  if (!n)
    return undefined
  for (const s of SECTORS) {
    for (const sub of s.subs) {
      if (sub.skills.some(sk => sk.toLowerCase() === n))
        return s.code
    }
  }
  for (const s of SECTORS) {
    for (const sub of s.subs) {
      if (sub.skills.some(sk => n.includes(sk.toLowerCase()) || sk.toLowerCase().includes(n)))
        return s.code
    }
  }
  return undefined
}

// مذكَّرة: SECTORS ثابتة، فنفرزها مرّة واحدة (تُستدعى كثيرًا في العرض عبر كل الأسواق)
let _byPriority: Sector[] | null = null
/** القطاعات مرتّبة بأولوية العرض؛ يمكن قصّها لأهمّ N في الواجهة */
export function sectorsByPriority(): Sector[] {
  if (!_byPriority)
    _byPriority = [...SECTORS].sort((a, b) => a.priority - b.priority)
  return _byPriority
}

/** أهمّ N قطاعًا (لعرض «أهمّ القطاعات» + «المزيد») */
export function topSectors(n = 8): Sector[] {
  return sectorsByPriority().slice(0, n)
}
