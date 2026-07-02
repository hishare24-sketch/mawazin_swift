// «ما الجديد» — يُعرض تلقائيًا مرة واحدة عند أول فتح بعد كل نشر
// (مرتبط بمعرّف البناء، فلا يعتمد على تذكّر المستخدم للتحديث القسري)

export interface ChangeItem {
  icon: string
  text: string
  /** route name للتجربة المباشرة */
  to?: string
}

export const LATEST_CHANGES: { title: string, items: ChangeItem[] } = {
  title: 'تحديثات كبيرة وصلت للتو',
  items: [
    { icon: 'mdi-compass-outline', text: 'ثلاثة أدوار جديدة: مرشد مهني، مدرب تقني، مستشار مهني — اطلبها من قائمة حسابك ← «طلب دور جديد»' },
    { icon: 'mdi-shield-check-outline', text: 'اعتماد الأدوار الجديدة صار بموافقة المنصة — تابع حالة طلبك من قائمة أدوارك' },
    { icon: 'mdi-account-star-outline', text: 'ملف عام تسويقي للمقيّم قابل للمشاركة خارج المنصة + لوحة تسويق شخصي بالإحالات والعروض', to: 'interviewer-dashboard' },
    { icon: 'mdi-wallet-outline', text: 'محفظة مالية كاملة: شحن وسحب ووسائل دفع وتقارير إحصائية', to: 'wallet' },
    { icon: 'mdi-palette-outline', text: '5 ثيمات ديناميكية وألوان مخصصة — أيقونة اللوحة 🎨 في الشريط العلوي' },
    { icon: 'mdi-poll', text: 'استبيانات بعشرة أنماط أسئلة ونقاط تحفيزية + قسم «استبيانات للمشاركة» للجميع', to: 'surveys-participate' },
  ],
}
