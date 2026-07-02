// «ما الجديد» — يُعرض تلقائيًا مرة واحدة عند أول فتح بعد كل نشر
// (مرتبط بمعرّف البناء، فلا يعتمد على تذكّر المستخدم للتحديث القسري)

export interface ChangeItem {
  icon: string
  text: string
  /** route name للتجربة المباشرة */
  to?: string
}

export const LATEST_CHANGES: { title: string, items: ChangeItem[] } = {
  title: 'تحديثات جديدة وصلت للتو',
  items: [
    { icon: 'mdi-card-account-details-star-outline', text: 'صفحتك التعريفية العامة /u/…: متابعون وتقييم وتعليقات بإشرافك + قصة وإنجازات ومعرض أعمال — والباقة (أساسية/احترافية/نخبة) تحدد ما يظهر', to: 'public-profile-manage' },
    { icon: 'mdi-view-dashboard-variant-outline', text: 'المركز الموحّد: كل أدوارك في شاشة واحدة — قرارات فورية ومواعيد ومؤشرات مع فلترة وفرز وتجميع وطرق عرض محفوظة', to: 'unified-hub' },
    { icon: 'mdi-storefront-outline', text: 'سوق الخبراء الموحّد: اكتشف المرشدين والمدربين والمستشارين واطلب خدمتهم مباشرة', to: 'experts-market' },
    { icon: 'mdi-bell-badge-outline', text: 'إجراء مباشر من الإشعار: قدّم على الفرصة أو أكّد الموعد بزر واحد داخل الإشعارات', to: 'notifications' },
    { icon: 'mdi-account-heart-outline', text: 'توصيات زملاء المهنة المتبادلة + قصص نجاح بموافقة أصحابها في ملفك العام', to: 'interviewer-dashboard' },
    { icon: 'mdi-linkedin', text: 'شارك ملفك العام وشهاداتك على LinkedIn بنقرة من لوحة التسويق الشخصي' },
  ],
}
