# سجلّ حالات الاختبار الشامل (Comprehensive Test Cases Registry)

> ملفّ حيّ. كلّ **حالة** = سيناريو (Given→When→Then) مربوط باختباره الآليّ (✅) أو مُعلَّم كفجوة (⬜) تُنفَّذ.
> يمنع CI (م0) دمج ما يكسر أيّ اختبار مربوط. من هذا السجلّ تُشتقّ اليونت/الفيتشر تست.
> بُني منهجيًّا بمسح كامل سطح المنصّة (189 راوت باك + 97 واجهة + 35 متجرًا + 24 خدمة).
> راجع [DOC/QUALITY_SYSTEM_PLAN.md](QUALITY_SYSTEM_PLAN.md).

## المفاتيح
- **الحالة:** ✅ مؤتمَت (مربوط باختبار) · ⬜ فجوة (يُنفَّذ)
- **النوع:** `U` وحدويّ (دالة/متجر، vitest/Pest Unit) · `F` فيتشر (endpoint عبر HTTP، Pest) · `E` تدفّق صفحة (E2E، Playwright لاحقًا)
- **الأولويّة:** 🔴 حرِج · 🟠 مهمّ · ⚪ عاديّ

## اصطلاح تنفيذ الاختبارات
- **واجهة — منطق/خدمات/أدوات نقيّة** (`src/services`, `src/utils`, `src/composables`) → `vitest` استدعاء مباشر.
- **واجهة — متاجر Pinia** → `createPinia()/setActivePinia()` + تأكيد الحالة/الأفعال.
- **واجهة — صفحات/تدفّقات** → E2E (Playwright، م5) — لا يوجد منها اختبار بعد.
- **باك-إند — endpoints/خدمات** → Pest feature (`RefreshDatabase` + `Sanctum::actingAs` + `Http::fake` للمزوّدات).
- كلّ سطر ⬜ يُصبح اختبارًا في الملفّ المشار إليه → يتحوّل ✅ ويحرسه CI.

---
# الباك-إند (Backend)

## 1) الهويّة والماليّة — User(auth) · Account · AccountState · Wallet · Treasury · Plan · Billing

### User (المصادقة)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| AUTH-01 | دخول صحيح → 200 + token + user | F | 🔴 | ✅ | AuthTest |
| AUTH-02 | كلمة خاطئة → 401 بلا توكن | F | 🔴 | ✅ | AuthTest |
| AUTH-03 | توكن صالح → me + logout ينجحان | F | 🔴 | ✅ | AuthTest |
| AUTH-04 | بلا توكن → me → 401 | F | 🔴 | ✅ | AuthTest |
| AUTH-05 | تسجيل صحيح → 201 + token + بريد ترحيب | F | 🔴 | ✅ | WelcomeEmailTest |
| AUTH-06 | التسجيل معطّل → register → 403 بلا بريد | F | 🟠 | ✅ | WelcomeEmailTest |
| AUTH-07 | register بلا name/email/password → 422 | F | 🔴 | ✅ | AuthTest |
| AUTH-08 | register ببريد مكرّر → 422 (unique) | F | 🔴 | ✅ | AuthTest |
| AUTH-09 | register بكلمة مرور < 6 → 422 | F | 🟠 | ✅ | AuthTest |
| AUTH-10 | register بـ role/kind خارج القائمة → 422 | F | ⚪ | ✅ | AuthTest |
| AUTH-11 | register بلا role/kind → 201 بالافتراضيّ (seeker/individual) | F | ⚪ | ✅ | AuthTest |
| AUTH-12 | login ببريد غير صالح أو بلا password → 422 | F | 🟠 | ✅ | AuthTest |
| AUTH-13 | حساب مُعلَّق ببيانات صحيحة → login → 403 «موقوف» | F | 🔴 | ✅ | AuthTest |
| AUTH-14 | logout بلا توكن → 401 | F | 🟠 | ⬜ | AuthTest |
| AUTH-15 | حافّة: بريد بحروف كبيرة/مسافات → سلوك متّسق | F | ⚪ | ⬜ | AuthTest |

### Account (المحفظة والباقة v1)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| ACCT-01 | أوّل وصول → wallet → رصيد ترحيبيّ 100 + حركة | F | 🔴 | ✅ | AccountTest |
| ACCT-02 | مستخدم جديد → account/plan → tier=free | F | 🟠 | ✅ | AccountTest |
| ACCT-03 | رصيد كافٍ → PUT plan pro → خصم الفرق | F | 🔴 | ✅ | AccountTest |
| ACCT-04 | رصيد غير كافٍ (elite) → 402 | F | 🔴 | ✅ | AccountTest |
| ACCT-05 | تخفيض pro→free → بلا خصم | F | 🟠 | ✅ | AccountTest |
| ACCT-06 | PUT plan tier خارج القائمة → 422 | F | 🔴 | ✅ | AccountTest |
| ACCT-07 | بلا توكن → wallet/plan/PUT plan → 401 | F | 🔴 | ⬜ | AccountTest |
| ACCT-08 | PUT plan بلا tier → 422 (required) | F | 🟠 | ⬜ | AccountTest |
| ACCT-09 | ترقية لنفس الباقة → 200 بلا خصم (cost=0) | F | 🟠 | ⬜ | AccountTest |
| ACCT-10 | ترقية → فاتورة paid + إيراد خزينة | F | 🔴 | ✅ | AdminBillingTest/AdminTreasuryTest |
| ACCT-11 | ترقية بلا كتالوج plans → أسعار احتياطيّة (0/50/150) | U | ⚪ | ⬜ | AccountServiceTest |
| ACCT-12 | حافّة: زيارة wallet مرّتين → لا يُعاد الإنشاء | F | ⚪ | ⬜ | AccountTest |

### AccountState (حالة الحساب v1)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| ASTATE-01 | مخزن غير محفوظ → GET → data=null | F | 🟠 | ✅ | AccountStateTest |
| ASTATE-02 | PUT ثمّ GET → روند-تريب | F | 🔴 | ✅ | AccountStateTest |
| ASTATE-03 | PUT مرّتين → الأخيرة تكتب فوق (upsert) | F | 🟠 | ✅ | AccountStateTest |
| ASTATE-04 | معزول لكلّ مستخدم (B لا يرى مخزن A) | F | 🔴 | ✅ | AccountStateTest |
| ASTATE-05 | بلا توكن → GET/PUT → 401 | F | 🔴 | ⬜ | AccountStateTest |
| ASTATE-06 | PUT data=null → يُخزَّن null | F | ⚪ | ⬜ | AccountStateTest |
| ASTATE-07 | حافّة: بنية متداخلة كبيرة → تُعاد سليمة | F | ⚪ | ⬜ | AccountStateTest |
| ASTATE-08 | مخزنان مختلفان لنفس المستخدم مستقلّان | F | ⚪ | ⬜ | AccountStateTest |

### Wallet (أدمن: admin/wallets)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| WALLET-01 | أدمن → GET wallets → قائمة + meta | F | 🟠 | ✅ | AdminSurveyWalletTest |
| WALLET-02 | POST adjust +250 → رصيد 350 + حركة | F | 🔴 | ✅ | AdminSurveyWalletTest |
| WALLET-03 | خصم يتجاوز الرصيد → 403/405 | F | 🔴 | ✅ | AdminSurveyWalletTest |
| WALLET-04 | غير أدمن → GET wallets → 403 | F | 🔴 | ✅ | AdminSurveyWalletTest |
| WALLET-05 | GET wallets/stats → بنية إحصاءات | F | 🟠 | ✅ | AdminTreasuryTest |
| WALLET-06 | adjust amount=0/بلا amount → 422 | F | 🔴 | ⬜ | AdminSurveyWalletTest |
| WALLET-07 | adjust note > 120 → 422 | F | ⚪ | ⬜ | AdminSurveyWalletTest |
| WALLET-08 | q/tier/balance/sort → تصفية وفرز | F | ⚪ | ⬜ | AdminSurveyWalletTest |
| WALLET-09 | بلا توكن → wallets/stats/adjust → 401 | F | 🟠 | ⬜ | AdminSurveyWalletTest |
| WALLET-10 | أدمن بلا adjust_wallets → 403 | F | 🟠 | ⬜ | AdminSurveyWalletTest |
| WALLET-11 | adjust لمحفظة غير موجودة → 404 | F | ⚪ | ⬜ | AdminSurveyWalletTest |

### Treasury (أدمن: admin/platform-accounts)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| TREAS-01 | GET platform-accounts → قائمة + meta | F | 🟠 | ✅ | AdminTreasuryTest |
| TREAS-02 | POST (bank) → 201 رصيد 0 | F | 🔴 | ✅ | AdminTreasuryTest |
| TREAS-03 | adjust +500 → رصيد 500 + حركة | F | 🔴 | ✅ | AdminTreasuryTest |
| TREAS-04 | adjust يُنزل الرصيد سالبًا → 405/403 | F | 🔴 | ✅ | AdminTreasuryTest |
| TREAS-05 | DELETE الحساب الافتراضيّ → 405 | F | 🔴 | ✅ | AdminTreasuryTest |
| TREAS-06 | DELETE حساب بحركة → 405؛ فارغ → 200 | F | 🔴 | ✅ | AdminTreasuryTest |
| TREAS-07 | GET stats → بنية كاملة | F | 🟠 | ✅ | AdminTreasuryTest |
| TREAS-08 | غير أدمن → 403 | F | 🔴 | ✅ | AdminTreasuryTest |
| TREAS-09 | POST بلا name/type أو type خارج القائمة → 422 | F | 🔴 | ⬜ | AdminTreasuryTest |
| TREAS-10 | GET {account}/transactions → ترقيم + أحدث أولًا | F | 🟠 | ⬜ | AdminTreasuryTest |
| TREAS-11 | PUT {account} (اسم/نوع/notes) بلا مسّ الرصيد | F | 🟠 | ⬜ | AdminTreasuryTest |
| TREAS-12 | adjust type خارج القائمة أو amount=0 → 422 | F | 🟠 | ⬜ | AdminTreasuryTest |
| TREAS-13 | أدمن بلا manage_platform_accounts → 403 | F | 🟠 | ⬜ | AdminTreasuryTest |
| TREAS-14 | بلا توكن → 401 | F | 🟠 | ⬜ | AdminTreasuryTest |
| TREAS-15 | حافّة: adjust يساوي سالب الرصيد → 0 مسموح | F | ⚪ | ⬜ | AdminTreasuryTest |
| TREAS-16 | transactions لحساب غير موجود → 404 | F | ⚪ | ⬜ | AdminTreasuryTest |

### Plan (أدمن: admin/plans)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| PLAN-01 | GET plans مرتّبة بـ sort + meta.total=3 | F | 🟠 | ✅ | AdminPlanTest |
| PLAN-02 | PUT plan (price/active/features) → محدَّث | F | 🔴 | ✅ | AdminPlanTest |
| PLAN-03 | POST plan → 201؛ key مكرّر → 422 | F | 🔴 | ✅ | AdminPlanTest |
| PLAN-04 | DELETE بلا مشتركين → 200؛ بمشتركين → 405 | F | 🔴 | ✅ | AdminPlanTest |
| PLAN-05 | غير أدمن → 403 | F | 🔴 | ✅ | AdminPlanTest |
| PLAN-06 | GET plans/stats → mrr/distribution | F | 🟠 | ✅ | AdminPlanTest |
| PLAN-07 | POST بـ key غير alpha_dash أو بلا name/price → 422 | F | 🟠 | ⬜ | AdminPlanTest |
| PLAN-08 | POST price سالب أو feature > 200 → 422 | F | ⚪ | ⬜ | AdminPlanTest |
| PLAN-09 | أدمن بلا create/update/delete_plans → 403 | F | 🟠 | ⬜ | AdminPlanTest |
| PLAN-10 | بلا توكن → 401 | F | 🟠 | ⬜ | AdminPlanTest |
| PLAN-11 | حافّة: POST بلا sort → max(sort)+1 | F | ⚪ | ⬜ | AdminPlanTest |

### Billing (أدمن: admin/invoices)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| BILL-01 | GET invoices → قائمة + meta | F | 🟠 | ✅ | AdminBillingTest |
| BILL-02 | GET invoices/stats → revenue صحيح | F | 🟠 | ✅ | AdminBillingTest |
| BILL-03 | refund فاتورة paid → عكس المحفظة والخزينة | F | 🔴 | ✅ | AdminBillingTest |
| BILL-04 | refund لغير paid → 405 | F | 🔴 | ✅ | AdminBillingTest |
| BILL-05 | غير أدمن → 403 | F | 🔴 | ✅ | AdminBillingTest |
| BILL-06 | q/status/plan_key/sort → تصفية وفرز | F | ⚪ | ⬜ | AdminBillingTest |
| BILL-07 | أدمن view_billing فقط يحاول refund → 403 | F | 🟠 | ⬜ | AdminBillingTest |
| BILL-08 | بلا توكن → 401 | F | 🟠 | ⬜ | AdminBillingTest |
| BILL-09 | refund لفاتورة غير موجودة → 404 | F | ⚪ | ⬜ | AdminBillingTest |
| BILL-10 | حافّة: refund بـ user_id=null → خصم الخزينة فقط | F | ⚪ | ⬜ | AdminBillingTest |

## 2) السوق — Opportunities · Requests · Applications · Pipeline · Matching · Interview · Interviewer

### Opportunities
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| OPP-01 | GET opportunities → قائمة ببذر تلقائيّ | F | 🔴 | ✅ | MarketplaceTest |
| OPP-02 | فلترة ?category | F | 🟠 | ✅ | MarketplaceTest |
| OPP-03 | بحث ?q بالعنوان/الشركة | F | 🟠 | ✅ | MarketplaceTest |
| OPP-04 | البحث غير حسّاس للأحرف عبر المحرّكات | F | 🟠 | ✅ | MarketplaceTest |
| OPP-05 | ترقيم perPage/page + meta | F | 🟠 | ✅ | MarketplaceTest |
| OPP-06 | POST opportunities → 201 + skills | F | 🔴 | ✅ | MarketplaceTest |
| OPP-07 | إنشاء بلا title → 422 | F | 🔴 | ⬜ | MarketplaceTest |
| OPP-08 | title > 255 → 422 | F | ⚪ | ⬜ | MarketplaceTest |
| OPP-09 | skills ليست مصفوفة/عنصر غير نصّ → 422 | F | 🟠 | ⬜ | MarketplaceTest |
| OPP-10 | حقول اختياريّة تُخزَّن فارغة عند غيابها | F | ⚪ | ⬜ | MarketplaceTest |
| OPP-11 | الفرصة تُنسب لـ user_id الحاليّ | F | 🟠 | ⬜ | MarketplaceTest |
| OPP-12 | list/create بلا مصادقة → 401 | F | 🔴 | ⬜ | MarketplaceTest |
| OPP-13 | فلترة بلا نتائج → data فارغ + total=0 | F | ⚪ | ⬜ | MarketplaceTest |
| OPP-14 | admin/opportunities → قائمة + meta | F | 🟠 | ✅ | AdminMarketplaceTest |
| OPP-15 | admin: بحث/فلترة قطاع | F | 🟠 | ⬜ | AdminMarketplaceTest |
| OPP-16 | admin: فرز على أعمدة SORTABLE فقط (رفض غيرها) | F | 🟠 | ⬜ | AdminMarketplaceTest |
| OPP-17 | admin/opportunities/stats → بنية + total | F | 🟠 | ✅ | AdminMarketplaceTest |
| OPP-18 | stats سلسلة 14 يومًا مكتملة | F | ⚪ | ⬜ | AdminMarketplaceTest |
| OPP-19 | DELETE admin/opportunities/{id} حذف ناعم | F | 🔴 | ✅ | AdminMarketplaceTest |
| OPP-20 | حذف فرصة غير موجودة → 404 | F | 🟠 | ⬜ | AdminMarketplaceTest |
| OPP-21 | غير أدمن → 403 | F | 🔴 | ✅ | AdminMarketplaceTest |
| OPP-22 | أدمن بلا delete_opportunities → 403 | F | 🟠 | ⬜ | AdminMarketplaceTest |
| OPP-23 | أدمن بلا view_opportunities → 403 | F | 🟠 | ⬜ | AdminMarketplaceTest |

### Requests
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| REQ-01 | GET requests بذر + فلترة ?type | F | 🔴 | ✅ | MarketplaceTest |
| REQ-02 | GET requests/mine طلباتي | F | 🟠 | ✅ | MarketplaceTest |
| REQ-03 | requests/mine معزول للمالك | F | 🔴 | ⬜ | MarketplaceTest |
| REQ-04 | ترقيم + meta | F | ⚪ | ⬜ | MarketplaceTest |
| REQ-05 | فلترة بنوع غير موجود → فارغ | F | ⚪ | ⬜ | MarketplaceTest |
| REQ-06 | بلا مصادقة → 401 | F | 🔴 | ⬜ | MarketplaceTest |
| REQ-07 | admin/requests قائمة + فلترة type + meta | F | 🟠 | ✅ | AdminMarketplaceTest |
| REQ-08 | فلترة ?state + بحث ?q | F | 🟠 | ⬜ | AdminMarketplaceTest |
| REQ-09 | فرز على SORTABLE فقط | F | ⚪ | ⬜ | AdminMarketplaceTest |
| REQ-10 | requests/stats بنية + open | F | 🟠 | ✅ | AdminMarketplaceTest |
| REQ-11 | توزيع byType/byState + سلسلة | F | ⚪ | ⬜ | AdminMarketplaceTest |
| REQ-12 | DELETE admin/requests/{id} حذف ناعم | F | 🔴 | ✅ | AdminMarketplaceTest |
| REQ-13 | حذف غير موجود → 404 | F | 🟠 | ⬜ | AdminMarketplaceTest |
| REQ-14 | غير أدمن → 403 | F | 🔴 | ⬜ | AdminMarketplaceTest |
| REQ-15 | أدمن بلا view/delete_requests → 403 | F | 🟠 | ⬜ | AdminMarketplaceTest |

### Applications
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| APP-01 | POST opportunities/{id}/apply → 201 | F | 🔴 | ✅ | MarketplaceTest |
| APP-02 | التقديم idempotent لنفس المستخدم/الفرصة | F | 🔴 | ✅ | MarketplaceTest |
| APP-03 | تقديم على فرصة غير موجودة → 404 | F | 🔴 | ✅ | MarketplaceTest |
| APP-04 | مستخدمان → سجلّان | F | 🟠 | ⬜ | MarketplaceTest |
| APP-05 | التقديم بمرحلة ابتدائيّة applied | F | 🟠 | ⬜ | MarketplaceTest |
| APP-06 | بلا مصادقة → 401 | F | 🔴 | ⬜ | MarketplaceTest |
| APP-07 | معرّف غير رقميّ → 404/422 | F | ⚪ | ⬜ | MarketplaceTest |

### Pipeline
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| PIPE-01 | GET pipeline/board تجميع بالمراحل الستّ | F | 🔴 | ✅ | AdminPipelineTest |
| PIPE-02 | فلترة ?opportunity_id | F | 🟠 | ⬜ | AdminPipelineTest |
| PIPE-03 | مرحلة غير معروفة تُطبَّع applied | F | ⚪ | ⬜ | AdminPipelineTest |
| PIPE-04 | POST move نقل + تسجيل حدث | F | 🔴 | ✅ | AdminPipelineTest |
| PIPE-05 | نقل بمرحلة غير صالحة → 422 | F | 🔴 | ✅ | AdminPipelineTest |
| PIPE-06 | نقل note > 500 → 422 | F | ⚪ | ⬜ | AdminPipelineTest |
| PIPE-07 | نقل بنفس المرحلة بلا ملاحظة → لا حدث | F | 🟠 | ⬜ | AdminPipelineTest |
| PIPE-08 | نقل تقديم غير موجود → 404 | F | 🟠 | ⬜ | AdminPipelineTest |
| PIPE-09 | الحدث يسجّل actor + stage_changed_at | F | 🟠 | ⬜ | AdminPipelineTest |
| PIPE-10 | bulk-move + عدّاد moved | F | 🔴 | ✅ | AdminPipelineTest |
| PIPE-11 | bulk-move ids فارغة/غير مصفوفة → 422 | F | 🟠 | ⬜ | AdminPipelineTest |
| PIPE-12 | bulk-move مرحلة غير صالحة → 422 | F | 🟠 | ⬜ | AdminPipelineTest |
| PIPE-13 | bulk-move يتجاهل معرّفات غير موجودة | F | ⚪ | ⬜ | AdminPipelineTest |
| PIPE-14 | pipeline/stats عدّ + hireRate + active | F | 🔴 | ✅ | AdminPipelineTest |
| PIPE-15 | stats فارغة → hireRate=0 (قسمة آمنة) | F | ⚪ | ⬜ | AdminPipelineTest |
| PIPE-16 | stats مفلترة ?opportunity_id | F | ⚪ | ⬜ | AdminPipelineTest |
| PIPE-17 | pipeline/opportunities بعدد المتقدّمين | F | 🟠 | ✅ | AdminPipelineTest |
| PIPE-18 | غير أدمن → 403 | F | 🔴 | ✅ | AdminPipelineTest |
| PIPE-19 | أدمن بلا manage_pipeline → 403 (move/bulk) | F | 🟠 | ⬜ | AdminPipelineTest |
| PIPE-20 | أدمن بلا view_pipeline → 403 (board/stats) | F | 🟠 | ⬜ | AdminPipelineTest |

### Matching / Explain / Why-match
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| MATCH-01 | GET matching/settings أوزان + حالة الذكاء | F | 🔴 | ✅ | AdminMatchTest |
| MATCH-02 | تعطيل candidate_matching يوقف aiActive | F | 🟠 | ✅ | AdminMatchTest |
| MATCH-03 | PUT matching/settings تحديث جزئيّ | F | 🔴 | ✅ | AdminMatchTest |
| MATCH-04 | وزن خارج 0..100 → 422 | F | 🟠 | ⬜ | AdminMatchTest |
| MATCH-05 | ai_boost غير منطقيّ → 422 | F | ⚪ | ⬜ | AdminMatchTest |
| MATCH-06 | shortlist ترتيب تنازليّ (القويّ أوّلًا) | F | 🔴 | ✅ | AdminMatchTest |
| MATCH-07 | shortlist بلا opportunity_id → 422 | F | 🟠 | ⬜ | AdminMatchTest |
| MATCH-08 | shortlist لفرصة غير موجودة → 404 | F | 🟠 | ⬜ | AdminMatchTest |
| MATCH-09 | shortlist بلا متقدّمين → فارغ | F | ⚪ | ⬜ | AdminMatchTest |
| MATCH-10 | shortlist يشمل breakdown + matchedSkills | F | 🟠 | ✅ | AdminMatchTest |
| MATCH-11 | explain heuristic بلا مفتاح (live=false) | F | 🔴 | ✅ | AdminMatchTest |
| MATCH-12 | explain مزوّد حيّ (live=true) | F | 🔴 | ✅ | AdminMatchTest |
| MATCH-13 | explain fallback عند خطأ المزوّد | F | 🔴 | ✅ | AdminMatchTest |
| MATCH-14 | explain بلا opportunity_id/application_id → 422 | F | 🟠 | ⬜ | AdminMatchTest |
| MATCH-15 | explain لتقديم لا يخصّ الفرصة → 404 | F | 🟠 | ⬜ | AdminMatchTest |
| MATCH-16 | explain الحيّ يسجّل التوكن | F | 🟠 | ⬜ | AdminMatchTest |
| MATCH-17 | غير أدمن ممنوع (explain/settings/shortlist) → 403 | F | 🔴 | ✅ | AdminMatchTest |
| MATCH-18 | أدمن بلا manage_matching → 403 | F | 🟠 | ⬜ | AdminMatchTest |
| MATCH-19 | why-match heuristic للباحث (live=false) | F | 🔴 | ✅ | WhyMatchTest |
| MATCH-20 | why-match مزوّد حيّ (live=true) | F | 🔴 | ✅ | WhyMatchTest |
| MATCH-21 | why-match يتطلّب مصادقة → 401 | F | 🔴 | ✅ | WhyMatchTest |
| MATCH-22 | why-match بلا title → 422 | F | 🔴 | ✅ | WhyMatchTest |
| MATCH-23 | why-match لمستخدم بلا Profile لا ينهار | F | 🟠 | ⬜ | WhyMatchTest |
| MATCH-24 | why-match الحيّ يسجّل التوكن | F | ⚪ | ⬜ | WhyMatchTest |
| MATCH-25 | why-match skills غير نصّ/category > max → 422 | F | ⚪ | ⬜ | WhyMatchTest |

### Interview + Interviewer
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| INTV-01 | POST interviews → 201 حالة scheduled | F | 🔴 | ✅ | InterviewerInterviewTest |
| INTV-02 | إنشاء بـ track غير مسموح → 422 | F | 🔴 | ✅ | InterviewerInterviewTest |
| INTV-03 | إنشاء بلا track → 422 | F | 🟠 | ⬜ | InterviewerInterviewTest |
| INTV-04 | GET interviews مقابلات المستخدم فقط | F | 🔴 | ⬜ | InterviewerInterviewTest |
| INTV-05 | قائمة + meta | F | 🟠 | ✅ | InterviewerInterviewTest |
| INTV-06 | score/integrity اختياريّة تُخزَّن | F | ⚪ | ⬜ | InterviewerInterviewTest |
| INTV-07 | index/store بلا مصادقة → 401 | F | 🔴 | ⬜ | InterviewerInterviewTest |
| INTV-08 | admin/interview-quality طابور + نزاهة | F | 🔴 | ✅ | AdminInterviewQualityTest |
| INTV-09 | فلترة ?integrity | F | 🟠 | ✅ | AdminInterviewQualityTest |
| INTV-10 | فلترة track/review_status + q | F | 🟠 | ⬜ | AdminInterviewQualityTest |
| INTV-11 | فرز BOARD_SORTABLE فقط | F | ⚪ | ⬜ | AdminInterviewQualityTest |
| INTV-12 | show تفكيك المعايير + weightedScore | F | 🔴 | ✅ | AdminInterviewQualityTest |
| INTV-13 | show لغير موجود → 404 | F | 🟠 | ⬜ | AdminInterviewQualityTest |
| INTV-14 | review تعليم + تسجيل المُراجِع | F | 🔴 | ✅ | AdminInterviewQualityTest |
| INTV-15 | review بحالة غير مسموحة → 422 | F | 🟠 | ⬜ | AdminInterviewQualityTest |
| INTV-16 | stats عدّادات + متوسّط + highRisk | F | 🟠 | ✅ | AdminInterviewQualityTest |
| INTV-17 | calibration تحيّز المسارات | F | 🟠 | ✅ | AdminInterviewQualityTest |
| INTV-18 | rubrics قائمة | F | 🟠 | ✅ | AdminInterviewQualityTest |
| INTV-19 | POST rubric → 201 | F | 🔴 | ✅ | AdminInterviewQualityTest |
| INTV-20 | rubric criteria فارغة → 422 | F | 🟠 | ⬜ | AdminInterviewQualityTest |
| INTV-21 | وزن معيار خارج 0..100 → 422 | F | ⚪ | ⬜ | AdminInterviewQualityTest |
| INTV-22 | PUT rubric تحديث | F | 🟠 | ✅ | AdminInterviewQualityTest |
| INTV-23 | DELETE rubric مخصّص | F | 🟠 | ✅ | AdminInterviewQualityTest |
| INTV-24 | حذف rubric نظاميّ → 405 | F | 🔴 | ✅ | AdminInterviewQualityTest |
| INTV-25 | غير أدمن → 403 | F | 🔴 | ✅ | AdminInterviewQualityTest |
| INTV-26 | أدمن بلا manage_interview_quality → 403 | F | 🟠 | ⬜ | AdminInterviewQualityTest |
| INTV-27 | weightedScore صحيح (وحدويّ) | U | 🟠 | ⬜ | InterviewQualityServiceTest |
| INTV-28 | اشتقاق مستوى النزاهة (وحدويّ) | U | 🟠 | ⬜ | InterviewQualityServiceTest |
| INTV-29 | GET interviewers المعتمدون مرتّبون بالتقييم | F | 🔴 | ✅ | InterviewerInterviewTest |
| INTV-30 | القائمة تستثني pending | F | 🔴 | ⬜ | InterviewerInterviewTest |
| INTV-31 | ترقيم + meta | F | 🟠 | ✅ | InterviewerInterviewTest |
| INTV-32 | POST bookings حجز pending → 201 | F | 🔴 | ✅ | InterviewerInterviewTest |
| INTV-33 | حجز على مقيّم غير موجود → 404 | F | 🔴 | ✅ | InterviewerInterviewTest |
| INTV-34 | حجز بلا day/slot → 422 | F | 🟠 | ⬜ | InterviewerInterviewTest |
| INTV-35 | elements غير مصفوفة/عنصر > max → 422 | F | ⚪ | ⬜ | InterviewerInterviewTest |
| INTV-36 | حجز بلا مصادقة → 401 | F | 🟠 | ⬜ | InterviewerInterviewTest |
| INTV-37 | PATCH booking: المالك يُكمِل بتقرير | F | 🔴 | ✅ | InterviewerInterviewTest |
| INTV-38 | مستخدم آخر لا يحدّث → 403 | F | 🔴 | ✅ | InterviewerInterviewTest |
| INTV-39 | المقيّم يحدّث حالة الحجز | F | 🟠 | ⬜ | InterviewerInterviewTest |
| INTV-40 | تحديث حجز غير موجود → 404 | F | 🟠 | ⬜ | InterviewerInterviewTest |
| INTV-41 | status خارج القائمة → 422 | F | 🟠 | ⬜ | InterviewerInterviewTest |
| INTV-42 | report=null مسموح | F | ⚪ | ⬜ | InterviewerInterviewTest |
| INTV-43 | admin/interviewers قائمة + فلترة + meta | F | 🟠 | ✅ | AdminInterviewerTest |
| INTV-44 | بحث/فلترة specialty + فرز | F | 🟠 | ⬜ | AdminInterviewerTest |
| INTV-45 | POST admin/interviewers → 201 approved | F | 🔴 | ✅ | AdminInterviewerTest |
| INTV-46 | إنشاء بلا name/specialty → 422 | F | 🟠 | ⬜ | AdminInterviewerTest |
| INTV-47 | rating خارج 0..5 أو status غير مسموح → 422 | F | ⚪ | ⬜ | AdminInterviewerTest |
| INTV-48 | approve → approved | F | 🔴 | ✅ | AdminInterviewerTest |
| INTV-49 | reject → rejected | F | 🔴 | ✅ | AdminInterviewerTest |
| INTV-50 | DELETE interviewer | F | 🟠 | ✅ | AdminInterviewerTest |
| INTV-51 | approve/reject/destroy لغير موجود → 404 | F | 🟠 | ⬜ | AdminInterviewerTest |
| INTV-52 | admin/interviewers/stats متوسّط التقييم | F | 🟠 | ✅ | AdminInterviewerTest |
| INTV-53 | avgRating=0 عند الغياب (قسمة آمنة) | F | ⚪ | ⬜ | AdminInterviewerTest |
| INTV-54 | غير أدمن → 403 | F | 🔴 | ✅ | AdminInterviewerTest |
| INTV-55 | أدمن بلا approve/update_interviewers → 403 | F | 🟠 | ⬜ | AdminInterviewerTest |

## 3) الذكاء والاتصالات — Ai(assistant/cv/providers/admin) · Chat · Support · Notification

### Ai — المساعد (assistant)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| ASST-001 | GET context → governance+context+suggestions+nudges+quota | F | 🔴 | ✅ | AssistantTest |
| ASST-002 | context quota snapshot | F | 🟠 | ✅ | AssistantTest |
| ASST-003 | context persona=organization | F | ⚪ | ✅ | AssistantTest |
| ASST-004 | context بلا مصادقة → 401 | F | 🔴 | ⬜ | AssistantTest |
| ASST-005 | dataAccess=off يُخفي activity | F | 🔴 | ✅ | AssistantTest |
| ASST-006 | dataAccess=on يُضمّن activity | F | 🟠 | ⬜ | AssistantTest |
| ASST-007 | suggestions تطابق persona (وحدويّ) | U | ⚪ | ⬜ | AssistantServiceTest |
| ASST-008 | POST message ردّ + حفظ محادثة | F | 🔴 | ✅ | AssistantTest |
| ASST-009 | message مطلوب → 422 | F | 🟠 | ⬜ | AssistantTest |
| ASST-010 | message > 2000 → 422 | F | 🟠 | ⬜ | AssistantTest |
| ASST-011 | conversationId غير صحيح → 422 | F | ⚪ | ⬜ | AssistantTest |
| ASST-012 | conversationId لمستخدم آخر → محادثة جديدة | F | 🔴 | ⬜ | AssistantTest |
| ASST-013 | message بلا مصادقة → 401 | F | 🔴 | ⬜ | AssistantTest |
| ASST-014 | حجب حوكمة (AI مغلق) → blocked+canEscalate | F | 🔴 | ✅ | AssistantTest |
| ASST-015 | حجب capability معطّلة → blocked | F | 🟠 | ⬜ | AssistantTest |
| ASST-016 | حجب chat.assistant_enabled=off → blocked | F | 🟠 | ⬜ | AssistantTest |
| ASST-017 | رسالة المحجوب توسَم ولا تدخل التاريخ | F | ⚪ | ⬜ | AssistantTest |
| ASST-018 | حجب حصّة يوميّة → quotaBlocked=daily | F | 🔴 | ✅ | AssistantTest |
| ASST-019 | حجب حدّ الطلب → quotaBlocked=perRequest | F | 🔴 | ✅ | AssistantTest |
| ASST-020 | حجب أسبوعيّ | F | 🟠 | ⬜ | AssistantTest |
| ASST-021 | حجب شهريّ | F | 🟠 | ⬜ | AssistantTest |
| ASST-022 | quota=0 → بلا حدّ | F | 🟠 | ⬜ | AssistantTest |
| ASST-023 | يسجّل استهلاك التوكن | F | 🔴 | ✅ | AssistantTest |
| ASST-024 | المستوى 3 يذكر «كباحث» | F | ⚪ | ✅ | AssistantTest |
| ASST-025 | مزوّد Claude حيّ + توكن حقيقيّ | F | 🔴 | ✅ | AssistantTest |
| ASST-026 | مزوّد OpenAI حيّ + توكن | F | 🔴 | ✅ | AssistantTest |
| ASST-027 | تمرير ذاكرة المحادثة | F | 🟠 | ✅ | AssistantTest |
| ASST-028 | أدوات (Claude) get_my_applications | F | 🟠 | ✅ | AssistantTest |
| ASST-029 | أدوات (OpenAI) tool_calls | F | 🟠 | ✅ | AssistantTest |
| ASST-030 | أداة get_recommended_opportunities | F | ⚪ | ✅ | AssistantTest |
| ASST-031 | dataAccess=off يُخفي الأدوات الشخصيّة | F | 🔴 | ✅ | AssistantTest |
| ASST-032 | فشل المزوّد → fallback | F | 🔴 | ✅ | AssistantTest |
| ASST-033 | رفض المزوّد → fallback + reason | F | 🔴 | ✅ | AssistantTest |
| ASST-034 | فشل OpenAI (429) → fallback | F | 🟠 | ✅ | AssistantTest |
| ASST-035 | ردّ فارغ بعد الأدوات → fallback | F | 🟠 | ⬜ | AssistantTest |
| ASST-036 | حلقة الأدوات ≤ جولتين (وحدويّ) | U | ⚪ | ⬜ | AssistantServiceTest |
| ASST-037 | conversations قائمتي مرتّبة بحدّ 50 | F | 🟠 | ⬜ | AssistantTest |
| ASST-038 | conversations للمستخدم فقط | F | 🔴 | ⬜ | AssistantTest |
| ASST-039 | conversations/{id} محادثتي + رسائل | F | 🟠 | ⬜ | AssistantTest |
| ASST-040 | conversations/{id} للغير → 403 | F | 🔴 | ✅ | AssistantTest |
| ASST-041 | conversations/{id} غير موجود → 404 | F | ⚪ | ⬜ | AssistantTest |
| ASST-042 | GET settings يعيد prefs | F | 🟠 | ⬜ | AssistantTest |
| ASST-043 | PUT settings تحديث data_access/proactive | F | 🟠 | ✅ | AssistantTest |
| ASST-044 | PUT settings قيمة غير boolean → 422 | F | ⚪ | ⬜ | AssistantTest |
| ASST-045 | escalate ينشئ تذكرة يملكها المستخدم | F | 🔴 | ✅ | AssistantTest |
| ASST-046 | escalate بلا conversationId → افتراضيّ | F | 🟠 | ⬜ | AssistantTest |
| ASST-047 | escalate priority خارج القائمة → 422 | F | ⚪ | ⬜ | AssistantTest |
| ASST-048 | escalate يبثّ support.admin | F | 🟠 | ⬜ | AssistantTest |
| ASST-049 | escalate conversation الغير يُتجاهل | F | 🟠 | ⬜ | AssistantTest |

### Ai — استوديو السيرة (extract-cv / compose-cv)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| CV-001 | extract-cv OpenAI → ملف مُهيكل + توكن | F | 🔴 | ✅ | AssistantTest |
| CV-002 | extract-cv Claude (tool_use) → مُهيكل | F | 🔴 | ✅ | AssistantTest |
| CV-003 | extract-cv بلا مزوّد → live=false فارغ | F | 🔴 | ✅ | AssistantTest |
| CV-004 | mediaType غير مدعوم → 422 | F | 🟠 | ✅ | AssistantTest |
| CV-005 | base64 مطلوب → 422 | F | 🟠 | ⬜ | AssistantTest |
| CV-006 | base64 > 14MB → 422 | F | ⚪ | ⬜ | AssistantTest |
| CV-007 | فشل المزوّد → live=false+fallback | F | 🟠 | ⬜ | AssistantTest |
| CV-008 | تطبيع المهارات/المستوى/الثقة (وحدويّ) | U | ⚪ | ⬜ | AssistantServiceTest |
| CV-009 | بلا مزوّد لا يُسجَّل استهلاك | F | ⚪ | ⬜ | AssistantTest |
| CV-010 | extract-cv بلا مصادقة → 401 | F | 🟠 | ⬜ | AssistantTest |
| CV-011 | compose-cv محاكاة تحترم الطول | F | 🔴 | ✅ | AssistantTest |
| CV-012 | compose-cv مزوّد حيّ JSON مُهيكل | F | 🔴 | ✅ | AssistantTest |
| CV-013 | length خارج القائمة → 422 | F | 🟠 | ✅ | AssistantTest |
| CV-014 | profile مطلوب → 422 | F | 🟠 | ⬜ | AssistantTest |
| CV-015 | JSON غير قابل للتحليل → fallback | F | 🟠 | ⬜ | AssistantTest |
| CV-016 | حصر highlights حسب الطول (وحدويّ) | U | ⚪ | ⬜ | AssistantServiceTest |
| CV-017 | تسجيل توكن عند مزوّد حيّ فقط | F | ⚪ | ⬜ | AssistantTest |

### Ai — المزوّدات (ProviderFactory / Usage / History)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| PROV-01 | Factory بلا api_key → null | U | 🟠 | ⬜ | ProviderFactoryTest |
| PROV-02 | Factory claude → ClaudeProvider | U | 🟠 | ⬜ | ProviderFactoryTest |
| PROV-03 | Factory openai/custom → OpenAiProvider | U | 🟠 | ⬜ | ProviderFactoryTest |
| PROV-04 | Factory simulation/غير معروف → null | U | ⚪ | ⬜ | ProviderFactoryTest |
| PROV-05 | Usage.estimate ~4 محارف/توكن (≥1) | U | ⚪ | ⬜ | AiUsageServiceTest |
| PROV-06 | Usage.check نوافذ + حدّ الطلب | U | 🟠 | ⬜ | AiUsageServiceTest |
| PROV-07 | sanitizeHistory user/assistant فقط آخر 10 | U | ⚪ | ⬜ | AssistantServiceTest |

### Ai — الأدمن (admin ai)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| AIADM-001 | GET ai تهيئة كاملة | F | 🔴 | ✅ | AdminAiTest |
| AIADM-002 | GET ai بلا بذر يُنشئ singleton | F | 🟠 | ✅ | AdminAiTest |
| AIADM-003 | GET ai غير أدمن → 403 | F | 🔴 | ✅ | AdminAiTest |
| AIADM-004 | بلا view_ai → 403 | F | 🔴 | ⬜ | AdminAiTest |
| AIADM-005 | GET ai بلا مصادقة → 401 | F | 🟠 | ⬜ | AdminAiTest |
| AIADM-006 | GET ai/stats عدّادات + توزيع | F | 🟠 | ✅ | AdminAiTest |
| AIADM-007 | stats بلا صلاحيّة → 403 | F | 🟠 | ⬜ | AdminAiTest |
| AIADM-008 | stats يستبعد باقات بحدّ 0 (وحدويّ) | U | ⚪ | ⬜ | AdminAiTest |
| AIADM-009 | PUT settings تحديث جزئيّ | F | 🔴 | ✅ | AdminAiTest |
| AIADM-010 | provider غير صالح → 422 | F | 🟠 | ✅ | AdminAiTest |
| AIADM-011 | temperature خارج 0..1 → 422 | F | 🟠 | ⬜ | AdminAiTest |
| AIADM-012 | max_tokens خارج 256..8192 → 422 | F | ⚪ | ⬜ | AdminAiTest |
| AIADM-013 | assistant_level خارج {1,2,3} → 422 | F | ⚪ | ⬜ | AdminAiTest |
| AIADM-014 | language خارج {ar,en,auto} → 422 | F | ⚪ | ⬜ | AdminAiTest |
| AIADM-015 | PUT settings بلا manage_ai → 403 | F | 🔴 | ✅ | AdminAiTest |
| AIADM-016 | PUT quotas تحديث + doc_max_reads | F | 🔴 | ✅ | AdminAiTest |
| AIADM-017 | quotas سالبة تُقصّ 0 (وحدويّ) | U | 🟠 | ⬜ | AdminAiTest |
| AIADM-018 | doc_max_reads خارج 1..10 → 422 | F | ⚪ | ⬜ | AdminAiTest |
| AIADM-019 | quotas بلا صلاحيّة → 403 | F | 🟠 | ⬜ | AdminAiTest |
| AIADM-020 | toggle capability | F | 🔴 | ✅ | AdminAiTest |
| AIADM-021 | toggle capability غير موجودة → 404 | F | ⚪ | ⬜ | AdminAiTest |
| AIADM-022 | toggle بلا صلاحيّة → 403 | F | 🟠 | ⬜ | AdminAiTest |
| AIADM-023 | POST knowledge إنشاء | F | 🔴 | ✅ | AdminAiTest |
| AIADM-024 | knowledge بلا title/content → 422 | F | 🟠 | ⬜ | AdminAiTest |
| AIADM-025 | knowledge content > 4000 → 422 | F | ⚪ | ⬜ | AdminAiTest |
| AIADM-026 | PUT knowledge تعديل | F | 🟠 | ✅ | AdminAiTest |
| AIADM-027 | PUT knowledge غير موجود → 404 | F | ⚪ | ⬜ | AdminAiTest |
| AIADM-028 | DELETE knowledge | F | 🟠 | ✅ | AdminAiTest |
| AIADM-029 | DELETE knowledge بلا صلاحيّة → 403 | F | 🟠 | ⬜ | AdminAiTest |
| AIADM-030 | planQuotas fallback بلا باقات مبذورة | F | ⚪ | ⬜ | AdminAiTest |

### Chat (direct-messages)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| DM-001 | POST direct-messages → 201 | F | 🔴 | ✅ | ChatTest |
| DM-002 | يبثّ MessageSent لقناة المستقبِل | F | 🟠 | ✅ | ChatTest |
| DM-003 | يدفع إشعارًا مستديمًا | F | 🟠 | ⬜ | ChatTest |
| DM-004 | حجب direct_messages_enabled=off → 403 | F | 🔴 | ⬜ | ChatTest |
| DM-005 | recipientId/body مطلوبان → 422 | F | 🟠 | ⬜ | ChatTest |
| DM-006 | body > 5000 → 422 | F | ⚪ | ⬜ | ChatTest |
| DM-007 | مستقبِل غير موجود → لا إشعار | F | ⚪ | ⬜ | ChatTest |
| DM-008 | بلا مصادقة → 401 | F | 🔴 | ⬜ | ChatTest |
| DM-009 | GET direct-messages مرسَل+مستقبَل مرتّب | F | 🟠 | ✅ | ChatTest |
| DM-010 | GET مقصور على المستخدم | F | 🔴 | ⬜ | ChatTest |
| DM-011 | POST read الوارد من النظير → 204 | F | 🟠 | ✅ | ChatTest |
| DM-012 | read بلا peerId → 422 | F | ⚪ | ⬜ | ChatTest |
| DM-013 | read لا يعلّم نظيرًا آخر | F | 🟠 | ⬜ | ChatTest |
| DM-014 | resolve/{slug} حلّ المالك | F | 🟠 | ✅ | ChatTest |
| DM-015 | resolve slug غير موجود → 404 | F | ⚪ | ⬜ | ChatTest |

### Support (tickets/replies)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| SUP-001 | GET tickets تذاكري مرتّبة | F | 🔴 | ✅ | AssistantTest |
| SUP-002 | GET tickets مقصور على المستخدم | F | 🔴 | ⬜ | SupportTest |
| SUP-003 | GET tickets بلا مصادقة → 401 | F | 🟠 | ⬜ | SupportTest |
| SUP-004 | POST tickets فتح + أوّل ردّ → 201 | F | 🔴 | ✅ | AssistantTest |
| SUP-005 | subject/body مطلوبان → 422 | F | 🟠 | ⬜ | SupportTest |
| SUP-006 | category خارج القائمة → 422 | F | ⚪ | ⬜ | SupportTest |
| SUP-007 | priority خارج القائمة → 422 | F | ⚪ | ⬜ | SupportTest |
| SUP-008 | افتراضات (other/normal/open) | F | ⚪ | ⬜ | SupportTest |
| SUP-009 | يبثّ لـ support.admin | F | 🟠 | ⬜ | SupportTest |
| SUP-010 | GET tickets/{id} تذكرتي بالمحادثة | F | 🟠 | ⬜ | SupportTest |
| SUP-011 | tickets/{id} للغير → 403 | F | 🔴 | ✅ | AssistantTest |
| SUP-012 | tickets/{id} غير موجود → 404 | F | ⚪ | ⬜ | SupportTest |
| SUP-013 | reply يزيد العدّاد | F | 🔴 | ✅ | AssistantTest |
| SUP-014 | reply للغير → 403 | F | 🔴 | ⬜ | SupportTest |
| SUP-015 | reply body مطلوب → 422 | F | 🟠 | ⬜ | SupportTest |
| SUP-016 | reply يعيد فتح تذكرة محلولة | F | 🟠 | ⬜ | SupportTest |
| SUP-017 | reply يبثّ isStaff=false | F | 🟠 | ✅ | AssistantTest |

### Notification (+ device-tokens/FCM)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| NOTIF-001 | GET notifications أوّل استدعاء يبذر الترحيب | F | 🟠 | ✅ | NotificationTest |
| NOTIF-002 | يعيد unread + meta | F | 🟠 | ✅ | NotificationTest |
| NOTIF-003 | ترقيم يحفظ إجماليّ unread | F | ⚪ | ✅ | NotificationTest |
| NOTIF-004 | مقصور على المستخدم | F | 🔴 | ✅ | NotificationTest |
| NOTIF-005 | بلا مصادقة → 401 | F | 🟠 | ⬜ | NotificationTest |
| NOTIF-006 | read-all → 204 | F | 🟠 | ✅ | NotificationTest |
| NOTIF-007 | read-all مقصور على المستخدم | F | 🟠 | ⬜ | NotificationTest |
| NOTIF-008 | {id}/read + إنفاذ الملكيّة (غير المالك 403) | F | 🔴 | ✅ | NotificationTest |
| NOTIF-009 | {id}/read غير موجود → 404 | F | ⚪ | ⬜ | NotificationTest |
| NOTIF-010 | push يبثّ NotificationSent | F | 🟠 | ✅ | NotificationTest |
| NOTIF-011 | POST device-tokens تسجيل + upsert | F | 🔴 | ✅ | DeviceTokenFcmTest |
| NOTIF-012 | token مطلوب → 422 | F | 🟠 | ✅ | DeviceTokenFcmTest |
| NOTIF-013 | platform خارج {web,android,ios} → 422 | F | ⚪ | ⬜ | DeviceTokenFcmTest |
| NOTIF-014 | DELETE device-tokens → 204 | F | 🟠 | ✅ | DeviceTokenFcmTest |
| NOTIF-015 | DELETE مقصور على المستخدم | F | 🟠 | ⬜ | DeviceTokenFcmTest |
| NOTIF-016 | FCM no-op آمن حين غير مهيّأ | F | ⚪ | ✅ | DeviceTokenFcmTest |
| NOTIF-017 | FCM push يستدعي sendToUser | F | ⚪ | ✅ | DeviceTokenFcmTest |

## 3-ب) الأدمن والحوكمة — Admin · Roles · Audit · Governance · Compliance · Settings · Branding · Broadcast · Archive · System/Realtime · Reports · Survey · Profile · Interviewer · Interview · PublicProfile

> كلّ `api/admin/*` خلف `[auth:sanctum, admin, AuditMiddleware]` → كلّ فعل مُعدِّل يُدقَّق تلقائيًّا. أغلب هذه الموديولات لها اختبارات happy-path؛ الفجوات ⬜ هي 422/403 الدقيقة و404.

| ID (النطاق) | الموديول | الحالات | حالة الغالب | الاختبار |
|-------------|---------|--------|-------------|----------|
| ADM-001..029 | Admin/Users | stats+توزيعات · users ترقيم/بحث/فلاتر/فرز آمن · users/stats · إنشاء+تحقّق+افتراضات+403 · تفصيل مُثرًى/404 · patch · suspend (+منع الذات+منع دخول المعلّق) · activate · admin-role (ترقية/إزالة/422/403) · 401/403 عامّ | ✅ الأساس (AdminAccessTest) · ⬜ 422/فلاتر (AdminUserTest مفقود) | AdminAccessTest / AdminUserTest |
| ADM-030..050 | Admin/Roles | مصفوفة · stats · إنشاء+قابل للإسناد · regex/مكرّر/تصفية/403 · حذف (نظاميّ/مأهول/404) · permissions+تدقيق · حظر super_admin · أعضاء · assign/revoke · **منع نزع آخر super_admin** | ✅ الأساس (AdminRoleTest) · ⬜ 422 فرعيّة | AdminRoleTest |
| AUDIT-001..017 | Audit | تسجيل تلقائيّ · اشتقاق الفعل · GET لا يُسجَّل · target_id · فشل التدقيق لا يكسر · meta قبل/بعد · list/stats · فلاتر/مدى/بحث/فرز · **export CSV بثّ+BOM+فلاتر** · 403 | ✅ الأغلب (AdminAuditTest) · ⬜ 003/004/010/012/016 | AdminAuditTest |
| GOV-001..018 | Governance | reports (بلاغ/401/regex/subject/type/dedup/**بثّ admin.governance**) · moderation قائمة/فلاتر/stats/تفصيل+لقطة · resolve (+حارس ازدواج/422/403) · approved يُزيل+يُخطر · bulk-resolve (معلّق فقط) · 403 | ✅ الأغلب (AdminGovernanceTest) · ⬜ 004/005/013/015/017 | AdminGovernanceTest |
| COMP-001..007 | Compliance | overview · **قاعدة الأربعة أخماس** (adverse-impact) · funnel · ai-oversight · audit-trail · 403 | ✅ الأغلب (AdminComplianceTest) · ⬜ 003 | AdminComplianceTest |
| SET-001..016 | Settings | list مرتّب · علم modified · حفظ جماعيّ+تدقيق · array/مجهولة/تطبيع · welcome_balance يحكم المحافظ · تعطيل التسجيل · fallback · reset (كلّ/group/keys) · overview · 403 (view/manage) | ✅ الأغلب (AdminSettingTest) · ⬜ 004/005/006/012/013/016 | AdminSettingTest |
| BRND-001..007 | Branding | read · تحديث+تطبيع hex · preset/color/mode 422 · **عامّ بلا مصادقة** · fallback · 403 | ✅ الأغلب (AdminBrandingTest) · ⬜ 004/006 | AdminBrandingTest |
| BCAST-001..012 | Broadcast | إرسال للكلّ/موجّه · notification يُنشئ+يبثّ · banner لا يُنشئ · 422 (حقول/قناة/جمهور/audience_value) · **FANOUT_CAP 1000** · audience/stats · list/بحث/فلاتر · 403 (create/view) | ✅ الأساس (AdminBroadcastTest) · ⬜ 004..007/010/011 | AdminBroadcastTest |
| ARCH-001..011 | Archive | حذف يؤرشف · list موحّد+ترقيم · فلتر type/مجهول · stats · restore · purge · 422 (type/id/مجهول) · 404 · 403 (manage/view) | ✅ الأساس (AdminArchiveTest) · ⬜ 004/007/008/009/010 | AdminArchiveTest |
| SYS-001..005 / RT-001..007 | System/Realtime | health (services/metrics/overall) · فحص DB/cache/queue/ai · down cascade · recentErrors · 403 · **قنوات Reverb** (user.{uuid}/support.admin/admin.governance تخويل بالصلاحيّة/Bearer/رفض) | ✅ health أساس · ✅ **BroadcastChannelsTest (6 اختبارات: مالك/غير 403/صلاحيّات أدمن/401/قناة مجهولة)** | AdminSystemHealthTest / BroadcastChannelsTest |
| REP-001..010 | Reports | overview (قمع/تحويل/kpis) · report بالنطاق (growth/funnel/finance/engagement/quality) · domain 422 · مدى زمنيّ · تجميع دفاعيّ · 403 | ✅ الأساس (AdminReportTest) · ⬜ 004/005/006/008/009 | AdminReportTest |
| SURV-001..022 | Survey (عميل+أدمن+نماذج) | عميل list/create/responses/401/422 · admin list/close/delete/403 · stats · **survey-templates** CRUD+فلاتر+نظاميّ محميّ · 422 (category/type) · 403 | ✅ النماذج+stats (AdminSurveyTemplateTest, SurveyTest) · ✅ **AdminSurveyTest أُنشئ (5 اختبارات: list/فلتر/stats/close/delete/403)** | SurveyTest / AdminSurveyTemplateTest / AdminSurveyTest |
| PROF-001..011 | Profile (عميل) | get/patch · skills إضافة/حذف/422 · proofs (+404/422) · proof-requests/resolve · 401 | ✅ الأساس (ProfileTest) · ⬜ 422/404 الفرعيّة | ProfileTest |
| EXP-001..015 | Interviewer (عميل+أدمن) | عميل list/bookings/PATCH/422/401 · admin list/فلاتر/stats/create/approve/reject/delete/403 | ✅ الأساس (InterviewerInterviewTest, AdminInterviewerTest) · ⬜ 422/403 الفرعيّة | InterviewerInterviewTest / AdminInterviewerTest |
| INTVQ-001..013 | Interview (عميل+جودة) | عميل index/store/track 422/401 · جودة board/detail/review/stats/calibration/rubrics CRUD+نظاميّ · 422/403 | ✅ الجودة (AdminInterviewQualityTest) · ✅ **InterviewTest أُنشئ (4 اختبارات: store افتراضيّات/عزل index/422 track/401)** | InterviewTest / AdminInterviewQualityTest |
| PUB-001..014 | PublicProfile | me (get/patch/401) · {slug} عرض/404/ترتيب me أوّلًا · view/follow/rate/comments/contact/schedule/testimonials/proof-requests (+422) | ✅ الأساس (PublicProfileTest) · ⬜ 401/404/422 الفرعيّة | PublicProfileTest |
| ACCS-001..006 | AccountState | get/put · **عزل لكلّ مستخدم/store** · 401 · upsert | ✅ الأساس (AccountStateTest) · ⬜ العزل/401 | AccountStateTest |

**اختبارات باك-إند موجودة اكتُشِفت هنا:** AdminAccessTest · AdminRoleTest · AdminAuditTest · AdminGovernanceTest · AdminComplianceTest · AdminSettingTest · AdminBrandingTest · AdminBroadcastTest · AdminArchiveTest · AdminSystemHealthTest · AdminReportTest · AdminSurveyTemplateTest · SurveyTest · ProfileTest · PublicProfileTest · AccountStateTest.
**ملفّات هدف مفقودة كليًّا — أُغلقت كلّها ✅:** ~~AdminUserTest~~ ✅ (13) · ~~AdminSurveyTest~~ ✅ (5) · ~~InterviewTest~~ ✅ (4) · ~~BroadcastChannelsTest~~ ✅ **حُسم وفُعّل (6 اختبارات خضراء)** — التحقيق الأمنيّ انتهى: الـ«200 لقناة الغير» كان **أثر بيئة اختبار لا ثغرة** (phpunit يضبط `BROADCAST_CONNECTION=null` وNullBroadcaster يقبل الجميع)؛ الحلّ: تبديل المذيع إلى reverb ببيانات وهميّة + **إعادة تسجيل قنوات channels.php على المذيع الجديد** (القنوات تُسجَّل عند الإقلاع على مذيع null فقط).

### Quality (مركز قيادة الجودة — اللوحة الذرّية)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| QCC-01 | المحلّل يوزّع جدول 6-أعمدة → طبقة/قسم/موديول/نوع/أولويّة/حالة/ملفّ | U | 🔴 | ✅ | TestCaseRegistryParserTest |
| QCC-02 | جدول 4-أعمدة (بلا حالة/اختبار) → فجوة بلا ملفّ | U | 🟠 | ✅ | TestCaseRegistryParserTest |
| QCC-03 | تفكيك نطاق «FE-OPP-01..09» → 9 ذرّات + أعلى أولويّة | U | 🔴 | ✅ | TestCaseRegistryParserTest |
| QCC-04 | جدول ملخّص (أعمدة مختلفة) + مركّب نطاق «SYS../RT..» → توزيع صحيح + مختلط⇒فجوة | U | 🔴 | ✅ | TestCaseRegistryParserTest |
| QCC-05 | تجاهل صفوف الرأس/الفاصل والنصّ خارج الجداول | U | 🟠 | ✅ | TestCaseRegistryParserTest |
| QCC-06 | quality:import يملأ الذرّات من السجلّ (>300، الطبقتان) | F | 🔴 | ✅ | AdminQualityTest |
| QCC-07 | الاستيراد idempotent (تشغيلان → نفس العدد) | F | 🟠 | ✅ | AdminQualityTest |
| QCC-08 | overview → عدّادات + توزيعات + سلسلة + تناسق التغطية | F | 🔴 | ✅ | AdminQualityTest |
| QCC-09 | atoms → تقسيم صفحات + فلترة layer/status | F | 🔴 | ✅ | AdminQualityTest |
| QCC-10 | atoms → بحث بالمعرّف (q) | F | 🟠 | ✅ | AdminQualityTest |
| QCC-11 | غير أدمن → overview/atoms → 403 | F | 🔴 | ✅ | AdminQualityTest |
| QCC-12 | board → كلّ الأقسام (6) والحالات (4) + total=0 ابتداءً | F | 🔴 | ✅ | AdminQualityTest |
| QCC-13 | dispatch ينشئ بطاقة على مسار القسم + عدّاد يزيد | F | 🔴 | ✅ | AdminQualityTest |
| QCC-14 | تحويل واحد نشط لكلّ ذرّة (تكرار → تحديث لا تكرار) | F | 🟠 | ✅ | AdminQualityTest |
| QCC-15 | move يغيّر القسم والحالة | F | 🔴 | ✅ | AdminQualityTest |
| QCC-16 | destroy يزيل البطاقة من اللوحة | F | 🟠 | ✅ | AdminQualityTest |
| QCC-17 | dispatch بقسم غير صالح → 422 | F | 🟠 | ✅ | AdminQualityTest |
| QCC-18 | عارض (view_quality فقط) يقرأ اللوحة لكن لا يحوّل → 403 | F | 🔴 | ✅ | AdminQualityTest |
| QCC-19 | RuleEngine: البصمة تجمّع رسائل تختلف بالأرقام فقط | U | 🔴 | ✅ | RuleEngineTest |
| QCC-20 | البصمة تختلف باختلاف النوع أو المسار | U | 🟠 | ✅ | RuleEngineTest |
| QCC-21 | قواعد الخطورة الثابتة (5xx/unhandled=high · 401=info · 403=warning · render+blank=critical) | U | 🔴 | ✅ | RuleEngineTest |
| QCC-22 | نوع مجهول → console + اشتقاق النطاق (/admin → admin) | U | 🟠 | ✅ | RuleEngineTest |
| QCC-23 | استيعاب عامّ POST /v1/observe ينشئ خطأً مجمّعًا (new · count 1) | F | 🔴 | ✅ | ObserveTest |
| QCC-24 | تكرار (رسالة تختلف بالأرقام) → count++ + ongoing | F | 🔴 | ✅ | ObserveTest |
| QCC-25 | خطأ محلول يعود عند تكراره → regressed | F | 🟠 | ✅ | ObserveTest |
| QCC-26 | استيعاب بلا type/message → 422 | F | 🟠 | ✅ | ObserveTest |
| QCC-27 | أدمن runtime → قائمة مقسّمة + فلترة الخطورة | F | 🔴 | ✅ | ObserveTest |
| QCC-28 | overview يضمّ ملخّص runtime (open/critical/today) | F | 🟠 | ✅ | ObserveTest |
| QCC-29 | غير أدمن → runtime → 403 | F | 🔴 | ✅ | ObserveTest |
| QCC-30 | GithubCiService يخرّط تشغيلات GitHub + ملخّص (passRate/lastConclusion) | F | 🔴 | ✅ | AdminQualityCiTest |
| QCC-31 | تدهور لطيف عند خطأ GitHub (5xx) → available=false | F | 🟠 | ✅ | AdminQualityCiTest |
| QCC-32 | بلا مستودع مضبوط → available=false · reason=no_repo | F | 🟠 | ✅ | AdminQualityCiTest |
| QCC-33 | غير أدمن → ci → 403 | F | 🔴 | ✅ | AdminQualityCiTest |
| QCC-34 | مولّد الهيكل: باك F → PHPUnit feature (class + RefreshDatabase + method) | U | 🔴 | ✅ | TestScaffoldGeneratorTest |
| QCC-35 | باك U → PHPUnit unit نقيّ (بلا RefreshDatabase) | U | 🟠 | ✅ | TestScaffoldGeneratorTest |
| QCC-36 | واجهة U → هيكل vitest | U | 🟠 | ✅ | TestScaffoldGeneratorTest |
| QCC-37 | E → هيكل Playwright | U | ⚪ | ✅ | TestScaffoldGeneratorTest |
| QCC-38 | endpoint scaffold يعيد code+framework+filename من ذرّة | F | 🔴 | ✅ | AdminQualityTest |
| QCC-39 | غير أدمن → scaffold → 403 | F | 🔴 | ✅ | AdminQualityTest |
| QCC-40 | الوكيل L1: توجيه 5xx→backend · render→frontend · slow→ops | U | 🔴 | ✅ | QualityAgentTriageTest |
| QCC-41 | L1: حرِج→تصعيد · high متكرّر (≥5)→تصعيد | U | 🟠 | ✅ | QualityAgentTriageTest |
| QCC-42 | L1: رسالة filter→قسم الفلاتر · info→تجاهل | U | 🟠 | ✅ | QualityAgentTriageTest |
| QCC-43 | قائمة runtime تضمّ اقتراح L1 (suggested.department) | F | 🔴 | ✅ | ObserveTest |
| QCC-44 | L2/L3 diagnose يحفظ التشخيص (سبب/إصلاح/مصدر/ثقة) ويعيده | F | 🔴 | ✅ | ObserveTest |
| QCC-45 | quality:resolve-stale يحلّ الإشارات الصامتة منذ N ساعة | F | 🟠 | ✅ | ObserveTest |
| QCC-46 | غير أدمن → diagnose → 403 | F | 🔴 | ✅ | ObserveTest |
| QCC-47 | quality:snapshot يكتب لقطة تغطية يوميّة من الذرّات (total/automated/gap) | F | 🟠 | ✅ | AdminQualityTest |

---
# الواجهة (Frontend)

## 4) الأساسيّات — Auth · Dashboard · Hub · Profile · CV · Settings · Reviews · Search + المتاجر

### Auth pages + Router guards (E2E/Unit)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| FE-AUTH-01 | تصيير LoginPage كاملًا | E | 🟠 | ⬜ | LoginPage.test |
| FE-AUTH-02 | دخول ناجح → setAuthUser + توجيه | E | 🔴 | ⬜ | LoginPage.test |
| FE-AUTH-03 | حقول فارغة → رسالة بلا نداء الخدمة | E | 🔴 | ⬜ | LoginPage.test |
| FE-AUTH-04 | بريد غير مطابق بعد touched → خطأ | E | 🟠 | ⬜ | LoginPage.test |
| FE-AUTH-05 | رفض الخدمة → رسالة + إيقاف التحميل | E | 🔴 | ⬜ | LoginPage.test |
| FE-AUTH-06 | redirect في الرابط يُتبع | E | 🟠 | ⬜ | LoginPage.test |
| FE-AUTH-07 | زرّ إظهار المرور يبدّل type | E | ⚪ | ⬜ | LoginPage.test |
| FE-AUTH-08 | لافتة realAuthEnabled | E | ⚪ | ⬜ | LoginPage.test |
| FE-AUTH-09 | dev-login يشتقّ الدور من البريد (وحدويّ) | U | 🔴 | ⬜ | AuthService.test |
| FE-AUTH-10 | buildMockUser token+roles+permissions | U | 🟠 | ⬜ | AuthService.test |
| FE-AUTH-11 | تصيير RegisterPage (نوع الحساب) | E | 🟠 | ⬜ | RegisterPage.test |
| FE-AUTH-12 | تسجيل ناجح → onboarding | E | 🔴 | ⬜ | RegisterPage.test |
| FE-AUTH-13 | حقول مطلوبة فارغة → رسالة | E | 🔴 | ⬜ | RegisterPage.test |
| FE-AUTH-14 | كلمتا مرور غير متطابقتين → رسالة | E | 🔴 | ⬜ | RegisterPage.test |
| FE-AUTH-15 | ref في الرابط يستدعي creditReferral | E | ⚪ | ⬜ | RegisterPage.test |
| FE-AUTH-16 | فشل register → رسالة | E | 🟠 | ⬜ | RegisterPage.test |
| FE-AUTH-17 | تبديل نوع الحساب يحدّث kind | E | ⚪ | ⬜ | RegisterPage.test |
| FE-AUTH-18 | Logout (DefaultLayout) → clearAuthUser + login | E | 🔴 | ⬜ | DefaultLayout.test |
| FE-AUTH-19 | Logout (AdminLayout) → login | E | 🟠 | ⬜ | AdminLayout.test |
| FE-AUTH-20 | حارس: مسار محميّ بلا جلسة → login+redirect | U | 🔴 | ⬜ | router/index.test |
| FE-AUTH-21 | حارس: مسجّل على login/register/home → landingFor | U | 🔴 | ⬜ | router/index.test |
| FE-AUTH-22 | حارس دور: مسار لا يملكه → roleHome | U | 🔴 | ⬜ | router/index.test |
| FE-AUTH-23 | حارس دور: دور مطلوب غير نشط → switchRole ضمنيّ | U | 🟠 | ⬜ | router/index.test |
| FE-AUTH-24 | حارس صلاحيّة أدمن: نقص permission → admin-overview | U | 🟠 | ⬜ | router/index.test |
| FE-AUTH-25 | onError chunk يعيد التحميل مرّة (حارس) | U | ⚪ | ⬜ | router/index.test |

### Pages (Dashboard/Hub/Profile/CV/Settings/Reviews/Search) — E2E
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| FE-DASH-01 | ترحيب باسم المستخدم | E | 🟠 | ⬜ | DashboardPage.test |
| FE-DASH-02 | فرع الباحث مقابل الشركة (isCompany) | E | 🔴 | ⬜ | DashboardPage.test |
| FE-DASH-03 | «موصى به» ترتيب matchScore→boost→matchRate | E | 🟠 | ⬜ | DashboardPage.test |
| FE-DASH-04 | «أفضل المرشّحين» فرز matchRate (شركة) | E | 🟠 | ⬜ | DashboardPage.test |
| FE-DASH-05 | ودجات الباحث (إثبات/مقابلة/nudges) | E | 🟠 | ⬜ | DashboardPage.test |
| FE-DASH-06 | حالة فارغة بلا خطأ | E | 🟠 | ⬜ | DashboardPage.test |
| FE-DASH-07 | حارس مصادقة | E | 🔴 | ⬜ | router/index.test |
| FE-DASH-08 | ملف فارغ بلا سياق قطاع لا يرمي (real-API) | E | 🟠 | ⬜ | DashboardPage.test |
| FE-HUB-01 | بطاقات الأدوار + kpis | E | 🔴 | ⬜ | UnifiedHubPage.test |
| FE-HUB-02 | groupItems حسب الاستعجال/الدور/النوع | E | 🔴 | ⬜ | UnifiedHubPage.test |
| FE-HUB-03 | فلترة الأدوار/الاستعجال + بحث | E | 🔴 | ⬜ | UnifiedHubPage.test |
| FE-HUB-04 | فرز (أولويّة/قيمة/أحدث) | E | 🟠 | ⬜ | UnifiedHubPage.test |
| FE-HUB-05 | قبول/رفض عنصر عبر resolveItem | E | 🔴 | ⬜ | UnifiedHubPage.test |
| FE-HUB-06 | عنصر يحتاج سياقًا يفتح صفحته | E | 🟠 | ⬜ | UnifiedHubPage.test |
| FE-HUB-07 | حالة فارغة | E | 🟠 | ⬜ | UnifiedHubPage.test |
| FE-HUB-08 | كثافة العرض comfortable/compact | E | ⚪ | ⬜ | UnifiedHubPage.test |
| FE-HUB-09 | حارس مصادقة | E | 🔴 | ⬜ | router/index.test |
| FE-PROF-01 | تصيير القصة/المهارات/الخبرات/الشهادات | E | 🔴 | ⬜ | ProfilePage.test |
| FE-PROF-02 | شارة الثقة skillConfidence/Label | E | 🟠 | ⬜ | ProfilePage.test |
| FE-PROF-03 | إضافة مهارة → ظهور + نقاط | E | 🔴 | ⬜ | ProfilePage.test |
| FE-PROF-04 | حذف مهارة/خبرة/شهادة | E | 🟠 | ⬜ | ProfilePage.test |
| FE-PROF-05 | طلبات إثبات: قبول/رفض | E | 🟠 | ⬜ | ProfilePage.test |
| FE-PROF-06 | الشخصيّة/نوع المنشأة | E | 🟠 | ⬜ | ProfilePage.test |
| FE-PROF-07 | استيراد CV يملأ الحقول | E | 🟠 | ⬜ | ProfilePage.test |
| FE-PROF-08 | شهادة مقيّم معتمد | E | ⚪ | ⬜ | ProfilePage.test |
| FE-PROF-09 | حالة فارغة بلا خطأ | E | 🟠 | ⬜ | ProfilePage.test |
| FE-PROF-10 | حارس مصادقة | E | 🔴 | ⬜ | router/index.test |
| FE-CV-01 | تصيير الاستوديو + منتقي التخطيط | E | 🟠 | ⬜ | CvStudioPage.test |
| FE-CV-02 | onMounted compose('medium') | E | 🔴 | ⬜ | CvStudioPage.test |
| FE-CV-03 | تبديل الطول يعيد compose | E | 🔴 | ⬜ | CvStudioPage.test |
| FE-CV-04 | حماية السباق (composeSeq) | U | 🟠 | ⬜ | CvStudioPage.test |
| FE-CV-05 | فشل composeCv → توست | E | 🔴 | ⬜ | CvStudioPage.test |
| FE-CV-06 | فرق live/محاكاة في التوست | E | ⚪ | ⬜ | CvStudioPage.test |
| FE-CV-07 | تبديل التخطيط يبدّل القالب | E | 🟠 | ⬜ | CvStudioPage.test |
| FE-CV-08 | QR للسيرة العامّة | E | ⚪ | ⬜ | CvStudioPage.test |
| FE-CV-09 | ملف فارغ → مسودّة البذرة | E | 🟠 | ⬜ | CvStudioPage.test |
| FE-CV-10 | حارس دور seeker | E | 🔴 | ⬜ | router/index.test |
| FE-SET-01 | تبويبات + شارات حيّة | E | 🟠 | ⬜ | SettingsPage.test |
| FE-SET-02 | ?tab=plan يفتح الباقة، غير صالح→general | E | 🔴 | ⬜ | SettingsPage.test |
| FE-SET-03 | تزامن ثنائيّ tab↔route.query | E | 🟠 | ⬜ | SettingsPage.test |
| FE-SET-04 | بحث الإعدادات + القفز للقسم | E | 🟠 | ⬜ | SettingsPage.test |
| FE-SET-05 | مساران قديمان يُعاد توجيههما | U | 🟠 | ⬜ | router/index.test |
| FE-SET-06 | تبويب الباقة (ACCOUNT_TIER_META) | E | 🟠 | ⬜ | SettingsPage.test |
| FE-SET-07 | تبويب التفضيلات (لغة/خط/ثيم) | E | 🟠 | ⬜ | SettingsPage.test |
| FE-SET-08 | تبويب الخصوصيّة | E | ⚪ | ⬜ | SettingsPage.test |
| FE-SET-09 | حارس مصادقة | E | 🔴 | ⬜ | router/index.test |
| FE-REV-01 | عنوان يتبدّل بـ direction | E | 🟠 | ⬜ | ReviewsPage.test |
| FE-REV-02 | المتوسّط والتوزيع النجميّ | E | 🟠 | ⬜ | ReviewsPage.test |
| FE-REV-03 | تصفية النجوم + فرز | E | 🔴 | ⬜ | ReviewsPage.test |
| FE-REV-04 | canReply فقط للمقيّم عن نفسه | E | 🔴 | ⬜ | ReviewsPage.test |
| FE-REV-05 | اقتراح ردّ بالذكاء + submit | E | 🟠 | ⬜ | ReviewsPage.test |
| FE-REV-06 | خلاصة الذكاء reviewsDigest | E | ⚪ | ⬜ | ReviewsPage.test |
| FE-REV-07 | حالة فارغة بلا قسمة على صفر | E | 🟠 | ⬜ | ReviewsPage.test |
| FE-REV-08 | حارس مصادقة | E | 🔴 | ⬜ | router/index.test |
| FE-SRCH-01 | تبويبات النطاق بالعدّادات | E | 🔴 | ⬜ | SearchResultsPage.test |
| FE-SRCH-02 | قراءة q/scope/category من الرابط | E | 🔴 | ⬜ | SearchResultsPage.test |
| FE-SRCH-03 | تسجيل البحث في التاريخ | E | 🟠 | ⬜ | SearchResultsPage.test |
| FE-SRCH-04 | حفظ/إلغاء حفظ البحث | E | 🟠 | ⬜ | SearchResultsPage.test |
| FE-SRCH-05 | «ضمن قطاعاتي» onlyMine | E | 🟠 | ⬜ | SearchResultsPage.test |
| FE-SRCH-06 | مساعدات الذكاء (intent/alternatives) | E | ⚪ | ⬜ | SearchResultsPage.test |
| FE-SRCH-07 | تشغيل بحث محفوظ | E | ⚪ | ⬜ | SearchResultsPage.test |
| FE-SRCH-08 | totalCount=0 → EmptyState | E | 🔴 | ⬜ | SearchResultsPage.test |
| FE-SRCH-09 | حارس مصادقة | E | 🟠 | ⬜ | router/index.test |

### Stores (Auth/Profile/AccountPlan/UnifiedHub/Wallet/Gamification/Delegation)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| ST-AUTH-01 | setAuthUser + أدوار افتراضيّة + persist | U | 🔴 | ✅ | AuthStore.test |
| ST-AUTH-02 | activeRoles/hasRole/ownsRole/roleStatus | U | 🔴 | ✅ | AuthStore.test |
| ST-AUTH-03 | switchRole يبدّل ويرفض غير المملوك | U | 🔴 | ✅ | AuthStore.test |
| ST-AUTH-04 | requestRole فوريّ نشط بلا تكرار | U | 🔴 | ✅ | AuthStore.test |
| ST-AUTH-05 | activateRole يقلب المعلّق نشطًا | U | 🟠 | ✅ | AuthStore.test |
| ST-AUTH-06 | ترحيل جلسة أحاديّة الدور | U | 🟠 | ✅ | AuthStore.test |
| ST-AUTH-07 | hasPermission '*' + المركّبة | U | 🔴 | ⬜ | AuthStore.test |
| ST-AUTH-08 | clearAuthUser يمسح localStorage | U | 🟠 | ⬜ | AuthStore.test |
| ST-AUTH-09 | setUserPermissions + persist | U | ⚪ | ⬜ | AuthStore.test |
| ST-AUTH-10 | syncPermissions (أدمن/آمن الفشل) | U | 🟠 | ⬜ | AuthStore.test |
| ST-AUTH-11 | loadUser مع JSON تالف → null | U | 🟠 | ⬜ | AuthStore.test |
| ST-PROF-01 | skillConfidence يجمع ويسقّف 100 | U | 🔴 | ✅ | ProfileStore.test |
| ST-PROF-02 | skillConfidence حصانة proofs مفقودة | U | 🔴 | ✅ | ProfileStore.test |
| ST-PROF-03 | addSkill + نقاط | U | 🔴 | ✅ | ProfileStore.test |
| ST-PROF-04 | unverifiedSkills | U | 🟠 | ✅ | ProfileStore.test |
| ST-PROF-05 | resolveProofRequest(accept) | U | 🟠 | ✅ | ProfileStore.test |
| ST-PROF-06 | addProof/Experience/Certificate CRUD | U | 🟠 | ⬜ | ProfileStore.test |
| ST-PROF-07 | skillLevelLabel | U | ⚪ | ⬜ | ProfileStore.test |
| ST-PROF-08 | addProofRequest | U | ⚪ | ⬜ | ProfileStore.test |
| ST-PROF-09 | persist/watch | U | 🟠 | ⬜ | ProfileStore.test |
| ST-PROF-10 | hydrate يعيد الفارغ للبذرة (real-API) | U | 🟠 | ⬜ | ProfileStore.test |
| ST-PROF-11 | load مع JSON تالف → بذرة | U | ⚪ | ⬜ | ProfileStore.test |
| ST-PLAN-01 | ترحيل أعلى باقة + تثبيت | U | 🔴 | ✅ | AccountPlanStore.test |
| ST-PLAN-02 | بوّابات surveyLimit/canDelegate/atLeast | U | 🔴 | ✅ | AccountPlanStore.test |
| ST-PLAN-03 | setTier خصم/حجب/تخفيض مجاني | U | 🔴 | ✅ | AccountPlanStore.test |
| ST-PLAN-04 | setTier ناجح يدفع إشعارًا | U | 🟠 | ⬜ | AccountPlanStore.test |
| ST-PLAN-05 | setTier نفس الباقة بلا خصم | U | ⚪ | ⬜ | AccountPlanStore.test |
| ST-PLAN-06 | watch(tier) persist sync | U | ⚪ | ⬜ | AccountPlanStore.test |
| ST-PLAN-07 | migrate مع publicProfile تالف | U | 🟠 | ⬜ | AccountPlanStore.test |
| ST-HUB-01 | تجميع لغير المسجّل (peer فقط) | U | 🔴 | ✅ | UnifiedHubStore.test |
| ST-HUB-02 | بوّابة المحوّلات بالأدوار | U | 🔴 | ✅ | UnifiedHubStore.test |
| ST-HUB-03 | تجميع بمعرّفات مركّبة فريدة | U | 🔴 | ✅ | UnifiedHubStore.test |
| ST-HUB-04 | kpis عابرة للأدوار | U | 🔴 | ✅ | UnifiedHubStore.test |
| ST-HUB-05 | resolveItem يفوّض/يعيد false | U | 🔴 | ✅ | UnifiedHubStore.test |
| ST-HUB-06 | roleSummaries | U | 🟠 | ✅ | UnifiedHubStore.test |
| ST-HUB-07 | parseAmount | U | 🟠 | ✅ | UnifiedHubStore.test |
| ST-HUB-08 | filterItems مجتمعة | U | 🔴 | ✅ | UnifiedHubStore.test |
| ST-HUB-09 | sortItems بلا تعديل الأصل | U | 🟠 | ✅ | UnifiedHubStore.test |
| ST-HUB-10 | groupItems + دلو none | U | 🟠 | ✅ | UnifiedHubStore.test |
| ST-HUB-11 | actionItems/upcomingItems | U | 🟠 | ⬜ | UnifiedHubStore.test |
| ST-HUB-12 | إسناد دور peer + fallback | U | 🟠 | ⬜ | UnifiedHubStore.test |
| ST-HUB-13 | resolveItem استشارة in_progress → false | U | 🟠 | ⬜ | UnifiedHubStore.test |
| ST-WALLET-01 | available/pending/processing | U | 🔴 | ✅ | WalletStore.test |
| ST-WALLET-02 | deposit فوري يرفض ≤0 | U | 🔴 | ✅ | WalletStore.test |
| ST-WALLET-03 | withdraw برسوم + تسوية | U | 🔴 | ✅ | WalletStore.test |
| ST-WALLET-04 | withdraw يرفض تجاوز المتاح | U | 🔴 | ✅ | WalletStore.test |
| ST-WALLET-05 | credit(pending) أرباح تُسوّى | U | 🟠 | ✅ | WalletStore.test |
| ST-WALLET-06 | convertPoints يرفض <10 | U | 🔴 | ✅ | WalletStore.test |
| ST-WALLET-07 | addCard/addBank/setDefault/remove | U | 🟠 | ✅ | WalletStore.test |
| ST-WALLET-08 | pay يخصم/يرفض/يُشعر | U | 🔴 | ⬜ | WalletStore.test |
| ST-WALLET-09 | monthlyFlow/byType/balanceSeries | U | 🟠 | ⬜ | WalletStore.test |
| ST-WALLET-10 | totalIn/totalOut/defaultMethod | U | ⚪ | ⬜ | WalletStore.test |
| ST-WALLET-11 | loadList مع JSON تالف → بذرة | U | ⚪ | ⬜ | WalletStore.test |
| ST-WALLET-12 | محفظة فارغة → أصفار (real-API) | U | 🟠 | ⬜ | WalletStore.test |
| ST-GAME-01 | record نقاط + عدّاد + lastReward | U | 🔴 | ✅ | GamificationStore.test |
| ST-GAME-02 | bumpChallenges + شارة | U | 🔴 | ✅ | GamificationStore.test |
| ST-GAME-03 | checkIn مرّة واحدة (idempotent) | U | 🟠 | ✅ | GamificationStore.test |
| ST-GAME-04 | tier/nextTier من العتبات | U | 🟠 | ✅ | GamificationStore.test |
| ST-GAME-05 | leaderboard/myRank | U | 🟠 | ✅ | GamificationStore.test |
| ST-GAME-06 | شارة multi_expert (تكامل Auth) | U | 🟠 | ✅ | GamificationStore.test |
| ST-GAME-07 | award(amount) يتجاهل ≤0 | U | 🟠 | ⬜ | GamificationStore.test |
| ST-GAME-08 | spend يرفض عدم الكفاية | U | 🔴 | ⬜ | GamificationStore.test |
| ST-GAME-09 | tierProgress عند القمّة | U | ⚪ | ⬜ | GamificationStore.test |
| ST-GAME-10 | checkIn بعد فجوة يعيد السلسلة 1 | U | 🟠 | ⬜ | GamificationStore.test |
| ST-GAME-11 | load JSON تالف → افتراضيّ | U | ⚪ | ⬜ | GamificationStore.test |
| ST-DELEG-01 | enterAccount/exitDelegation | U | 🔴 | ✅ | DelegationStore.test |
| ST-DELEG-02 | منع التداخل + exit عاطل | U | 🔴 | ✅ | DelegationStore.test |
| ST-DELEG-03 | النجاة من إعادة التحميل | U | 🟠 | ✅ | DelegationStore.test |
| ST-DELEG-04 | حارس الباقة canDelegate | U | 🔴 | ⬜ | DelegationStore.test |
| ST-DELEG-05 | enterAccount يرفض معرّفًا غير موجود | U | 🟠 | ⬜ | DelegationStore.test |
| ST-DELEG-06 | isDelegating/activeAccount | U | 🟠 | ⬜ | DelegationStore.test |
| ST-DELEG-07 | loadOriginal JSON تالف → null | U | ⚪ | ⬜ | DelegationStore.test |

## 5) السوق والاكتشاف (واجهة) — الفرص/الطلبات/التقديمات/المقيّمون/الخبراء/الرغبات/الأقران/الإنجازات/التقييمات/المقابلات/المرشّحون + الخدمات والمتاجر

> كلّ صفحات هذا النطاق **بلا اختبار تصيير** (E) — المُغطّى فقط الخدمات والمتاجر و`useFacetedList`. الملفّ الهدف = `*.test.ts` مجاور.

### الصفحات (E — كلّها ⬜)
| ID | الحالة | نوع | أولويّة |
|----|--------|-----|--------|
| FE-OPP-01..09 | OpportunitiesPage: شبكة FacetedList · فاسِتات (قطاع/دولة/مدينة/نوع/مستوى/راتب) · فرز · رقائق ذكيّة · «المحفوظة فقط» · شبكة/قائمة · بانر الأعلى تطابقًا · حالة فارغة · اشتقاق القطاع | E | 🔴🟠 |
| FE-OPPD-01..09 | OpportunityDetailsPage: تفاصيل · حلقة التطابق · «لماذا أنا مطابق؟» whyMatch · حوار التقديم/apply · تعطيل عند applied · حفظ/إلغاء · فرص مشابهة · غير موجودة · سناكبار | E | 🔴🟠⚪ |
| FE-REQ-01..08 | RequestsFeedPage: قائمة · فاسِتات · فرز · رقائق ذكيّة · بطاقة KIND/STATE + «تمّ التقديم» · فتح التفاصيل · بانر · حالة فارغة | E | 🔴🟠⚪ |
| FE-REQM-01..06 | MyRequestsPage: قائمة mine + عدّادات · فلترة الحالة · أداء AI · تقييم الجهة · طلب تحديث · حالة فارغة | E | 🔴🟠⚪ |
| FE-REQD-01..07 | RequestDetailsPage: تفاصيل · تطابق + سرد · FAQ/توقّع AI · حوار التقديم · تفاوض AI · مشابهة · غير موجود | E | 🔴🟠⚪ |
| FE-APP-01..06 | ApplicationsPage: قائمة + إحصاء · فلترة الحالة · statusMeta · عرض الفرصة · سحب الطلب · حالة فارغة | E | 🔴🟠 |
| FE-INT-01..09 | InterviewersMarketplacePage: شبكة · فاسِتات · فرز · موصى بهم · رقائق · حجوزاتي · إعادة جدولة AI · درجات الاعتماد · حالة فارغة | E | 🔴🟠⚪ |
| FE-INTR-01..06 | InterviewerRegisterPage: خطوة النوع/المنزلقات · أهليّة AI + منع reject · تسعير AI · finish يفعّل الدور · إشعار+توجيه · تعطيل بلا أنواع | E | 🔴🟠⚪ |
| FE-INTP-01..08 | InterviewerProfilePage: تصيير · حوار حجز + أوقات AI · allowedDates · taken · حساب السعر · confirmBooking · تعطيل canConfirm · غير موجود | E/U | 🔴🟠⚪ |
| FE-INTD-01..08 | InterviewerDashboardPage: إحصاء+أجندة · قبول/رفض طلب · حالات فارغة · عناصر تقييم AI · أسعار · تسويق/brand · حوارات العلامة · نموّ AI | E | 🔴🟠⚪ |
| FE-EXP-01..07 | ExpertsMarketPage: شبكة · فاسِتات الدور/التخصّص · فرز · طلب خدمة peerRequests · تعطيل+إشعار · دعوة الانضمام · حالة فارغة | E | 🔴🟠⚪ |
| FE-EXPP-01..05 | ExpertProfilePage: تصيير+درجة · أقسام مشروطة · طلب خدمة · مشاركة · غير موجود | E | 🔴🟠⚪ |
| FE-WISH-01..05 | WishesPage: بطاقات+إحصاء · قبول/رفض · تفاوض · تراجع · statusMeta | E/U | 🔴🟠⚪ |
| FE-CWISH-01..07 | CompanyWishesPage: جدول مرسلة+إحصاء · تبويب مرسلة/مستلمة · تعديل/سحب/إعادة إرسال · عروض واردة · حالتان فارغتان | E | 🔴🟠 |
| FE-PEER-01..07 | PeerRequestsPage: تبويب وارد/صادر · طلب جديد · تعطيل canSend · انتقالات الحالة · إلغاء صادر · تلميح AI · حالتان فارغتان | E | 🔴🟠⚪ |
| FE-ACH-01..04 | AchievementsPage: GamificationCard+صدارة · سمعة موحّدة (>1 دور) · رحلة البداية · إخفاء للشركة | E/U | 🟠⚪ |
| FE-ASMT-01..04 | AssessmentsPage: متاح/منجز/تحديات · حوار الحجم+توجيه · تحليل · متصدّرون | E | 🔴🟠⚪ |
| FE-ASMTT-01..06 | TakeAssessmentPage: بناء أسئلة من size · تنقّل+تقدّم · مؤقّت ينهي تلقائيًّا · حساب الدرجة+توجيه · تلميح AI · غير موجود | E/U | 🔴🟠⚪ |
| FE-ASMTR-01..04 | AssessmentResultPage: حلقة المستوى · مشاركة · إعادة canRetake · حالة hasResult | E/U | 🔴🟠⚪ |
| FE-IVW-01..06 | InterviewsPage: جدول موحّد مفروز زمنيًّا · تسميات نسبيّة · شريط أسبوعيّ · حوار الإعداد+start · سجلّ · حالة فارغة | E/U | 🔴🟠⚪ |
| FE-IVWR-01..04 | InterviewResultPage: نتيجة+رادار · تحليل فيديو مشروط · levelColor · غير متاحة | E/U | 🔴🟠⚪ |
| FE-CAND-01..06 | CandidatesPage: بطاقات+إحصاء · filtered (بحث/حالة/ثقة/مستوى) · فرز · إجراءات جماعيّة · إجراءات فرديّة · حالة فارغة | E/U | 🔴🟠 |

### الخدمات (U — مُغطّاة غالبًا)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| SVC-MATCH-01..07 | matching.ts: تطابق تامّ · حلّ القطاع · عقوبة الصفر · تجاهل المفاتيح الغائبة+تطبيع · موقع جزئيّ 0.5 · Jaccard غير حسّاس | U | 🔴🟠 | ✅ | matching.test |
| SVC-MATCH-08 | مصفوفة مهارات فارغة تُستبعد بلا خطأ | U | 🟠 | ⬜ | matching.test |
| SVC-MP-01..08 | matchProfile.ts: dominantSector · حصانة undefined · seeker/opportunity/request profiles · نقاط حيّة | U | 🔴🟠 | ✅ | matchProfile.test |
| SVC-SECT-01..13 | sectors.ts: 21 قطاعًا · 96 تخصّصًا · getSector · sectorForSkill · migrateSector · حوكمة · classifyText · أنواع الفرص | U | 🔴🟠 | ✅ | sectors.test |
| SVC-SECT-14 | classifyText غموض التعادل يعلّم needsReview | U | ⚪ | ⬜ | sectors.test |
| SVC-TAX-01..04 | taxonomy.ts: TAXONOMY · categorizeSkill · getCategory · ALL_SKILLS | U | 🟠⚪ | ✅ | taxonomy.test |

### المتاجر (U)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| ST-REQ-01..03 | بذر · apply idempotent · opportunityTypeOf | U | 🔴🟠 | ✅ | RequestsStore.test |
| ST-REQ-04..08 | getById/similar · rateOrg · perfStats/counts · fields · تلف JSON | U | 🟠⚪ | ⬜ | RequestsStore.test |
| ST-WISH-01..05 | sendWish · تعديل/سحب/إعادة · acceptanceRate · respondOffer · negotiate | U | 🔴🟠 | ✅ | WishesStore.test |
| ST-WISH-06..07 | جانب الباحث setStatus+عدّادات · تلف JSON | U | 🟠 | ⬜ | WishesStore.test |
| ST-APP-01..05 | apply/hasApplied · withdraw · byStatus/count · persist · تلف JSON | U | 🔴🟠⚪ | ✅ | ApplicationsStore.test |
| ST-INT-01..07 | بذر · book · recommendedFor · trustValue · عناصر التقييم · مرفقات · قبول/إكمال | U | 🔴🟠 | ✅ | InterviewersStore.test |
| ST-INT-08..11 | reschedule · interviewerTier · matchFor/setPrice/stats · تلف JSON | U | 🟠 | ⬜ | InterviewersStore.test |
| ST-EXP-01..04 | تسجيل الأدوار · مرشد/برامج · مدرب/إحالة · مستشار/طلبات | U | 🔴🟠 | ✅ | ExpertRolesStore.test |
| ST-EXP-05..08 | expertTier · getBySlug/إحصاءات · enrollTrainee حافّة · دمج البذرة | U | 🟠 | ⬜ | ExpertRolesStore.test |
| ST-SAVED-01..03 | toggle/isSaved/count · بذرة [6,11] · تلف JSON | U | 🟠⚪ | ⬜ | SavedStore.test |
| ST-CAND-01..04 | دمج التجاوزات · setStatus بالمعرّف · عدّادات/getById · تلف JSON | U | 🔴🟠 | ✅ | CandidatesStore.test |

### مكوّن الاكتشاف
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| CMP-FL-01..08 | useFacetedList: بلا فلاتر · OR داخل الفاسِت · AND بين الفاسِتات · منطقيّ · مدى min · مدى max · بحث · فرز+سقوط | U | 🔴🟠 | ✅ | useFacetedList.test |
| CMP-FL-09..13 | FacetedList (تصيير): الشريط المحوريّ · الرقائق+مسح · حالة فارغة · العروض المحفوظة · فاسِت باحث | E | 🔴🟠⚪ | ⬜ | FacetedList.test |

## 6) المساعد/الدعم/الاستبيانات/الرسائل/الإشعارات (واجهة) + ويدجت الشات

### الصفحات (E — كلّها ⬜، ملفّ هدف مجاور)
| ID | الحالة | نوع | أولويّة |
|----|--------|-----|--------|
| FE-ASST-01..15 | AssistantPage: تصيير+تبويبان · onMounted loaders · إرسال+فقاعات+ميتا · اقتراح · شريط التصعيد · تصعيد→تذكرة · فتح محادثة · حالات فارغة · إنشاء/ردّ تذكرة · خطأ · بثّ ردود الدعم · إلغاء الاشتراك · حفظ الخصوصيّة · quotaRemaining | E/U | 🔴🟠⚪ |
| FE-ASST-PUB-01..05 | PublicAssistantPage: تصيير الزائر · إرسال+ردّ محاكى · حثّ التسجيل بعد 3 · فارغ لا يُرسل · زرّ التسجيل | E/U | 🟠⚪ |
| FE-SURV-HUB-01..03 | SurveysHubPage: تبويبان+عدّاد · شارة المتاح · تبديل embedded | E | 🟠⚪ |
| FE-SURV-PART-01..04 | SurveysParticipatePage: بطاقات · «شارك»→survey-answer · «شاركت» معطّل · حالة فارغة | E | 🔴🟠⚪ |
| FE-SURV-ANS-01..09 | SurveyAnswerPage: توكن غير صالح→closed · already · ترحيب+حافز · سؤال/صفحة+تقدّم · canProceed · missingRequired · finish→submitResponse · shuffle · answered (نص/مصفوفة/matrix) | E/U | 🔴🟠⚪ |
| FE-SURV-ADM-01..10 | SurveysPage/SurveyAdminPage: جدولي · guardPlan · أزرار الصفّ · بانئ الأسئلة+AI · مشاركة+simulate · مقاييس adminFor · allowedNext · استيراد CSV · دعوات+قمع · id غير موجود | E/U | 🔴🟠⚪ |
| FE-MSG-01..06 | MessagesPage: قائمة+شارة · اختيار+markRead · إرسال · onMounted · فارغ · بثّ وارد | E | 🟠⚪ |
| FE-NOTIF-01..06 | NotificationsPage: قائمة+mapColor · مرشّح غير مقروء · toggleRead · تعليم الكلّ · runAction · فارغ | E | 🟠⚪ |

### ويدجت الشات (فرع feat/floating-chat-widget — كلّها ⬜)
| ID | الحالة | نوع | أولويّة | الاختبار |
|----|--------|-----|--------|----------|
| FE-CHATW-01..12 | ChatWidget: FAB+شارة · فتح→init+markRead · تبويبان · linkify آمن · إرسال/Enter · nudges قابلة للنقر≤2 · showSuggestions · شريط التصعيد · نقطة online · وضع الدعم · توسعة · خلفية الموبايل | E/U | 🔴🟠⚪ | ChatWidget.spec |
| FE-CHATW-HOOK-01..05 | useAssistantChat: init كسول مرّة · bumpUnread عند ردّ دعم مغلق · send يمنع الفارغ/المتزامن · escalate/create/reply · onUnmounted يلغي | U | 🔴🟠⚪ | useAssistantChat.test |
| UTIL-LINK-01..08 | chatLinks: nudgeRoute(معروف/مجهول/null) · linkifyParts (رابط/عدّة/بلا) · http/https فقط ووقف الترقيم · **لا حقن HTML** | U | 🔴🟠⚪ | chatLinks.test |
| ST-CHATW-01..05 | ChatWidgetStore: openWidget · closeWidget · toggle · markRead · bumpUnread (مغلق فقط) | U | 🟠⚪ | ChatWidgetStore.test |

### المتاجر والخدمات
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| ST-SURV-01..17 | SurveysStore: بذر+byToken · statsFor · CRUD · submitResponse (نشط/مغلق/ممتلئ) · simulate · ترحيل · participatable/mySurveys · مكافأة+منع مزدوج · خصم المحفظة · canCreate/plan · انتقالات · syncLifecycle · إغلاق تلقائيّ · invitees · inviteAll · adminFor · generateQuestions | U | 🔴🟠 | ✅ | SurveysStore.test |
| ST-SURV-18..19 | إشعارات دورة الحياة · مزامنة سحابيّة خاصّة | U | ⚪ | ⬜ | SurveysStore.test |
| ST-NOTIF-01..05 | NotificationsStore (محليّ): بذر+unreadCount · push · mark(All/toggle/one) · ترحيل actionTo · تلف JSON | U | 🟠⚪ | ✅ | NotificationsStore.test |
| ST-NOTIF-06..08 | NotificationsStore (real-API): mapRow · hydrate · start/stopRealtime · نداء API | U | ⚪ | ⬜ | NotificationsStore.test |
| ST-MSG-01..05 | MessagesStore (محليّ): بذر+totalUnread · markRead · send (+تجاهل الفارغ) · startConversation · تلف JSON | U | 🔴🟠 | ✅ | MessagesStore.test |
| ST-MSG-06..08 | MessagesStore (real-API): send peer · ingest (منع mid مكرّر) · بثّ وارد/إعادة التوصيل | U | 🟠⚪ | ⬜ | MessagesStore.test |
| SVC-RT-01..06 | البثّ: subscribeUserTickets/AdminSupport/Notifications/AdminModeration محايدة في المحاكاة · makeEcho/serverBase | U | 🟠⚪ | ⬜ | supportRealtime/echo.test |
| SVC-RT-07..11 | directMessages (flag off): send/fetch/resolve/markRead/subscribe محايدة | U | 🟠⚪ | ✅ | directMessages.test |
| SVC-RT-12 | toRow يحوّل camelCase→snake_case | U | ⚪ | ⬜ | directMessages.test |

## 7) كونسول الأدمن + الصفحات العامّة (واجهة)

> **تغطية صفر** لكلّ صفحات الأدمن والعامّة. حرّاس الصلاحيّة على مستويين: meta المسار (حارس الراوتر) + `hasPermission` داخل الصفحة (تزييف AuthStore). 15 صفحة جدوليّة تشترك في `useAdminResource`+`ResourceScaffold` — اختبار البنية المشتركة مرّة يغطّي الجلب/الفلترة للكلّ.

### البنية المشتركة (U — ⬜)
| ID | الحالة | نوع | أولويّة | الاختبار |
|----|--------|-----|--------|----------|
| FE-ADM-RES-01..06 | useAdminResource: load أوّليّ · setSearch مُمهَّل+تصفير · setFilter · setSort/perPage/page · فشل fetcher→error · clearSelection | U | 🔴🟠 | useAdminResource.test |
| FE-ADM-SCF-01..06 | ResourceScaffold: BaseTable+عدّاد · بحث/فلاتر events · رقائق+مسح الكلّ · شريط جماعيّ · exportCsv+هروب · ترقيم/rowClick مشروط | U | 🔴🟠 | ResourceScaffold.test |
| FE-ADM-TBL-01..03 | BaseTable: أعمدة/صفوف/loading · حالة فارغة · فرز+تحديد events | U | 🟠 | BaseTable.test |

### صفحات الأدمن (E — كلّها ⬜، ملفّ هدف مجاور لكلّ صفحة)
| ID (النطاق) | الصفحة | الحالات المغطّاة | أولويّة |
|-------------|--------|------------------|--------|
| FE-ADM-OVR-01..03 | Overview /admin | stats+بطاقات · حارس view_analytics · فارغ | 🔴🟠 |
| FE-ADM-USR-01..08 | Users | جدول+إحصاء · فلاتر · إنشاء+تحقّق · تعديل+setAdminRole · تعليق/تفعيل+منع الذات · جماعيّ · حارس create_users · فارغ/خطأ | 🔴🟠⚪ |
| FE-ADM-ROL-01..08 | Roles | مصفوفة الصلاحيّات · تبديل+حفظ الفرق · إنشاء · حذف+منع النظام · أعضاء+بحث · assign/revoke · حرّاس · فارغ | 🔴🟠⚪ |
| FE-ADM-OPP-01..04 | Opportunities | جدول+إحصاء · فلاتر · حذف مفرد/جماعيّ · فارغ | 🔴🟠⚪ |
| FE-ADM-REQ-01..04 | Requests | جدول+إحصاء · فلاتر · حذف · فارغ | 🔴🟠⚪ |
| FE-ADM-PIP-01..04 | Pipeline | لوحة+أعمدة · نقل · حارس manage_pipeline · فارغ | 🔴🟠⚪ |
| FE-ADM-MAT-01..05 | Matching | إعدادات+shortlist · explainMatch · حفظ الأوزان · حارس manage_matching · فارغ | 🔴🟠⚪ |
| FE-ADM-SRV-01..05 | Surveys | جدول+إحصاء · فلاتر · إغلاق · حذف · فارغ | 🔴🟠⚪ |
| FE-ADM-SRT-01..05 | Survey Templates | جدول+إحصاء · إنشاء/تعديل/حذف · فارغ | 🔴🟠⚪ |
| FE-ADM-WAL-01..04 | Wallets | جدول+إحصاء · فلاتر · adjust+تحقّق · فارغ | 🔴🟠⚪ |
| FE-ADM-TRE-01..05 | Platform Accounts | جدول+إحصاء · إنشاء · adjust+حركات · حذف · فارغ | 🔴🟠⚪ |
| FE-ADM-BIL-01..04 | Billing | جدول+إحصاء · فلاتر · refund+حارس manage_billing · فارغ | 🔴🟠⚪ |
| FE-ADM-PLN-01..05 | Plans | جدول+إحصاء · إنشاء/تعديل/حذف · فارغ | 🔴🟠⚪ |
| FE-ADM-AUD-01..04 | Audit | جدول+إحصاء · فلاتر · تصدير · فارغ | 🔴🟠⚪ |
| FE-ADM-SET-01..04 | Settings | overview+مجموعات · تعديل · إعادة · حارس manage_settings | 🔴🟠 |
| FE-ADM-CUS-01..04 | Customization | معاينة+علامة · حفظ+إعادة تحميل · حارس manage_branding · فشل | 🔴🟠⚪ |
| FE-ADM-ARC-01..04 | Archive | قائمة+إحصاء · استعادة · حذف نهائيّ+حارس · فارغ | 🔴🟠⚪ |
| FE-ADM-BRD-01..04 | Broadcast | جدول+إحصاء · حساب الجمهور · إرسال+حارس · فارغ | 🔴🟠⚪ |
| FE-ADM-SUP-01..05 | Support | جدول+إحصاء · فلاتر · ردّ · حالة/إسناد+حارس · فارغ | 🔴🟠⚪ |
| FE-ADM-SUH-01..03 | Support Hub | تجميع (tickets/chat/ai) · حارس view_support · فارغ | 🔴⚪ |
| FE-ADM-INT-01..05 | Interviewers | جدول+إحصاء · فلاتر · approve/reject · إنشاء/حذف · فارغ | 🔴🟠⚪ |
| FE-ADM-IQ-01..05 | Interview Quality | جدول+معايرة+rubrics · مراجعة · CRUD rubrics · حارس · فارغ | 🔴🟠⚪ |
| FE-ADM-GOV-01..08 | Governance | جدول+إحصاء · فلاتر · قرار · جماعيّ · تفصيل الهدف · بثّ لحظيّ · حارس manage_governance · فارغ | 🔴🟠⚪ |
| FE-ADM-CMP-01..04 | Compliance | overview+قمع+أثر+تدقيق · تصيير المؤشّرات · حارس view_compliance · فارغ | 🔴🟠⚪ |
| FE-ADM-AI-01..06 | AI | config+stats · تعديل · قدرات/حصص · CRUD معرفة · حارس manage_ai · فارغ | 🔴🟠⚪ |
| FE-ADM-CHT-01..04 | Chat | config+stats+محادثات · تعديل+حارس · thread+معاينة · فارغ | 🔴🟠⚪ |
| FE-ADM-RPT-01..04 | Reports | overview+بطاقات · تقرير محدّد · حارس view_reports · فارغ | 🔴🟠⚪ |
| FE-ADM-SYS-01..03 | System Health | مؤشّرات · حارس view_health · فشل | 🔴⚪ |

### الصفحات العامّة للزائر (E — ⬜)
| ID | الصفحة | الحالات | أولويّة |
|----|--------|--------|--------|
| FE-PUB-LAND-01..02 | Landing / | تصيير بلا مصادقة · روابط CTA | 🔴⚪ |
| FE-PUB-OPP-01..03 | Explore Opportunities | قائمة بلا مصادقة · فلترة · فارغ | 🔴🟠⚪ |
| FE-PUB-AST-01..03 | Explore Assistant | تصيير · إرسال+ردّ · ترحيب | 🔴🟠⚪ |
| FE-PUB-EXP-01..03 | Expert /expert/:slug | slug مطابق · غير موجود · تنزيل البطاقة/isMe | 🔴⚪ |
| FE-PUB-USR-01..03 | User /u/:slug | isFound · غير موجود · resolveOwner+تنزيل | 🔴⚪ |
| FE-PUB-RES-01..02 | Resume /resume/:token | تصيير · **⚠️ فجوة: لا يقرأ :token — كلّ الروابط تعرض نفس السيرة** | 🔴⚪ |
| FE-PUB-PPL-01..04 | People Explorer | شبكة بلا مصادقة · فاسِت القطاع · فتح /u/{slug} · فارغ | 🔴🟠⚪ |
| FE-PUB-SRV-01..04 | Survey /survey/:token | active→welcome/questions · token غير موجود→closed · مغلق/already · إرسال+تحقّق | 🔴🟠 |

> **فجوة منتَج مرصودة أثناء التعداد:** `PublicResumePage.vue` لا يستخدم `useRoute` ولا يقرأ `:token` — يعرض سيرة ثابتة لكلّ الروابط. تحتاج ربطًا بالتوكن (FE-PUB-RES-02).

### E2E دخانيّ (Playwright — م5) — يعمل مقابل بناء الإنتاج في وضع المحاكاة (بلا باك-إند)
| ID | الحالة | نوع | أولويّة | حالة | الاختبار |
|----|--------|-----|--------|------|----------|
| FE-E2E-01 | الهبوط / يُصيَّر (هيرو + CTA دخول يوجّه لـ/login) | E | 🔴 | ✅ | smoke.spec |
| FE-E2E-02 | صفحة /login تُصيّر الحقول والزرّ | E | 🔴 | ✅ | smoke.spec |
| FE-E2E-03 | حارس الراوتر: زائر → /dashboard → إعادة توجيه لـ/login | E | 🔴 | ✅ | smoke.spec |
| FE-E2E-04 | تحقّق الدخول: إرسال فارغ يُحبَط برسالة | E | 🟠 | ✅ | smoke.spec |
| FE-E2E-05 | باحث يدخل (dev-login) → يهبط على /dashboard | E | 🔴 | ✅ | seeker.spec |
| FE-E2E-06 | /opportunities يعرض بطاقات مبذورة | E | 🔴 | ✅ | seeker.spec |
| FE-E2E-07 | فتح /opportunities/:id يعرض التفاصيل | E | 🟠 | ✅ | seeker.spec |
| FE-E2E-08 | الجلسة تُحفَظ عبر إعادة التحميل (localStorage) | E | 🟠 | ✅ | seeker.spec |
| FE-E2E-09 | أدمن يدخل → كونسول الأدمن (/admin) | E | 🔴 | ✅ | admin.spec |
| FE-E2E-10 | فتح /admin/quality-command يُصيّر العنوان + لوحات (تحويل/رصد) | E | 🔴 | ✅ | admin.spec |
| FE-E2E-11 | تنقّل الأدمن يُظهر رابط «مركز قيادة الجودة» | E | 🟠 | ✅ | admin.spec |

---
## ملخّص التغطية
**الحجم:** ~**775 حالة** مشتقّة منهجيًّا من كامل السطح (189 راوت باك + 97 راوت واجهة + 35 متجرًا + 24 خدمة + المكوّنات المشتركة).

**مؤتمَت (✅) الآن — الباك-إند قويّ:** ~40 ملفّ اختبار تغطّي المسار السعيد وأغلب الصلاحيّات عبر: Auth · Account/AccountState/Wallet/Treasury/Plan/Billing · Marketplace/Pipeline/Matching/WhyMatch · Interview/Interviewer · Assistant/CV/Chat/Support/Notification/FCM. وفي الواجهة: **طبقة المنطق فقط** — خدمات (matching/matchProfile/sectors/taxonomy) + ~12 متجرًا + `useFacetedList`.

**الفجوات (⬜) ذات الأولويّة (بالترتيب):**
1. 🟠 **الواجهة — E2E:** ✅ **البنية أُسّست (م5): Playwright + 11 تدفّقًا دخانيًّا حرِجًا (FE-E2E-01..11) في CI** ضدّ بناء المحاكاة. المتبقّي: توسيع التغطية للصفحات العميقة (مساعد/استبيانات/تدفّق التقديم الكامل/29 صفحة أدمن).
2. ~~ملفّات مفقودة كليًّا~~ ✅ **أُغلقت (دفعة أ):** AuthTest+7 (AUTH-07..13) · AdminSurveyTest (5) · InterviewTest (4) · BroadcastChannelsTest (6، **حُسم التحقيق: لا ثغرة — NullBroadcaster في بيئة الاختبار**). يبقى: 401/422/404 التفصيليّة عبر الموديولات المُغطّاة جزئيًّا.
3. 🔴 **أدوات الشات وحدويًّا** (`chatLinks`: منع حقن HTML · `nudgeRoute` · `ChatWidgetStore`) — **على فرع feat/floating-chat-widget غير المدموج؛ تُختبَر عند دمجه.**
4. ~~متاجر بلا اختبار~~ ✅ **أُغلقت (دفعة ب):** المتاجر الأربعة (Applications/Candidates/Notifications/Messages) بـ19 اختبارًا شاملة تلف JSON. يبقى الجزء real-API (ST-NOTIF-06..08 · ST-MSG-06..08).
5. 🟠 **حالات الحافّة:** صنف «الشاشة الفارغة» (real-API) في الصفحات.

**فجوة منتَج مرصودة (لا اختباريّة):** `PublicResumePage.vue` لا يقرأ `:token` — يعرض سيرة ثابتة لكلّ الروابط.

**الخطوة التالية للتنفيذ:** م5 Playwright E2E (التأسيس + أوّل 10 تدفّقات حرِجة) — أو 401/422/404 التفصيليّة المتبقّية.
