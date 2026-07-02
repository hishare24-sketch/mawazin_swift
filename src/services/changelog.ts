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
    { icon: 'mdi-storefront-outline', text: 'سوق الخبراء الموحّد: اكتشف المرشدين والمدربين والمستشارين واطلب خدمتهم مباشرة', to: 'experts-market' },
    { icon: 'mdi-bell-badge-outline', text: 'إجراء مباشر من الإشعار: قدّم على الفرصة أو أكّد الموعد بزر واحد داخل الإشعارات', to: 'notifications' },
    { icon: 'mdi-account-heart-outline', text: 'توصيات زملاء المهنة المتبادلة بين المقيّمين — تظهر في ملفك العام بشارة «متبادلة»', to: 'interviewer-dashboard' },
    { icon: 'mdi-trophy-variant-outline', text: 'قصص نجاح مرشحيك في ملفك العام — لا تُنشر إلا بموافقة صاحبها الصريحة', to: 'interviewer-dashboard' },
    { icon: 'mdi-linkedin', text: 'شارك ملفك العام وشهاداتك على LinkedIn بنقرة من لوحة التسويق الشخصي' },
  ],
}
