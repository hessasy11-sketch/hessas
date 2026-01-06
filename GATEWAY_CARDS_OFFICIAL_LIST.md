# بطاقات بوابة التاج - القائمة الرسمية

## نظرة عامة

تم تحديث نظام بطاقات البوابة ليشمل **11 بطاقة رسمية** مرتبة حسب الأولوية. كل بطاقة تمثل بوابة دخول إلى قسم أو غرفة عمليات محددة في المنصة.

---

## 🎯 آلية العمل

### للمدير العام (GM)
- يرى **جميع البطاقات** تلقائياً (Bypass كامل)
- لا يحتاج إلى منح صلاحيات
- `get_user_gateway_cards` تعيد كل البطاقات النشطة

### للموظفين الآخرين
- يرى فقط البطاقات الممنوحة له من GM
- بطاقة "عملي اليوم" متاحة للجميع تلقائياً
- عند تسجيل الدخول، يتم توجيههم إلى `/admin/my-work` مباشرة

---

## 📋 البطاقات الـ 11

### 1️⃣ غرفة القيادة العليا
```json
{
  "card_key": "executive_command",
  "title_ar": "غرفة القيادة العليا",
  "icon": "Crown",
  "color": "purple",
  "route": "/admin/operations-room/global",
  "access": "GM Only",
  "description": "نظرة شاملة + قرارات + سجل قيادي + تحكم كامل"
}
```

**المحتوى:**
- Executive Pulse Dashboard
- Decision Queue
- Executive Logs
- Full Platform Control

---

### 2️⃣ غرفة استثمار أشجار المزارع (B2F)
```json
{
  "card_key": "b2f_operations_room",
  "title_ar": "غرفة استثمار أشجار المزارع",
  "icon": "Sprout",
  "color": "green",
  "route": "/admin/operations-room/b2f",
  "access": "GM + B2F Team + Finance (read)",
  "description": "إدارة فرص الاستثمار والمستثمرين والعمليات"
}
```

**الأدوار المصرح لها:**
- المدير العام
- مساعد B2F
- مدير المزارع الوطني
- المالية (قراءة فقط)

---

### 3️⃣ غرفة مزاد الشركات (B2B)
```json
{
  "card_key": "b2b_operations_room",
  "title_ar": "غرفة مزاد الشركات",
  "icon": "Gavel",
  "color": "blue",
  "route": "/admin/operations-room/b2b",
  "access": "GM + B2B Team + Auction Supervisors",
  "description": "إدارة المزادات بين الشركات والإشراف"
}
```

---

### 4️⃣ قيادة المزارع
```json
{
  "card_key": "farm_command",
  "title_ar": "قيادة المزارع",
  "icon": "Tractor",
  "color": "amber",
  "route": "/admin/b2f/farm-command",
  "access": "GM + National Farm Manager + Farm Managers + Operations",
  "description": "قيادة شاملة للمزارع + فرقها + تشغيلها"
}
```

**ملاحظة:** ليست مجرد "إضافة مزرعة" - هذه قيادة كاملة تشمل:
- إدارة جميع المزارع
- فرق العمل
- العمليات التشغيلية
- التقارير والإحصائيات

---

### 5️⃣ لوحة المزرعة (ديناميكية)
```json
{
  "card_key": "farm_workspace",
  "title_ar": "لوحة المزرعة",
  "icon": "Leaf",
  "color": "lime",
  "route": "/admin/b2f/farms/:farmId",
  "access": "Farm Manager + Farm Team (per farm_id) + GM",
  "description": "لوحة العمل الخاصة بمزرعة محددة"
}
```

**آلية الظهور:**
- إذا كان المستخدم مرتبط بمزرعة واحدة → افتحها مباشرة
- إذا كان مرتبط بعدة مزارع → افتح Farm Command أولاً
- GM يرى كل المزارع

---

### 6️⃣ عملي اليوم (Default Landing)
```json
{
  "card_key": "my_work",
  "title_ar": "عملي اليوم",
  "icon": "Briefcase",
  "color": "slate",
  "route": "/admin/my-work",
  "access": "All Staff + GM",
  "description": "مساحة العمل اليومية - المهام والإشعارات"
}
```

**خاص:**
- متاح لجميع الموظفين تلقائياً
- الصفحة الافتراضية عند تسجيل الدخول (لغير GM)
- GM يراها اختيارياً

---

### 7️⃣ المالية والمحاسبة
```json
{
  "card_key": "finance_center",
  "title_ar": "المالية والمحاسبة",
  "icon": "DollarSign",
  "color": "red",
  "route": "/admin/finance",
  "access": "GM + Finance Manager + Accountants + Finance Assistants",
  "description": "إدارة الحسابات والمدفوعات والتقارير المالية"
}
```

---

### 8️⃣ التسويق
```json
{
  "card_key": "marketing_center",
  "title_ar": "التسويق",
  "icon": "TrendingUp",
  "color": "yellow",
  "route": "/admin/marketing",
  "access": "GM + Marketing Manager + Marketing Team",
  "description": "إدارة الحملات التسويقية والمحتوى"
}
```

---

### 9️⃣ الشركاء وكبار المستثمرين
```json
{
  "card_key": "partners_vip",
  "title_ar": "الشركاء وكبار المستثمرين",
  "icon": "Handshake",
  "color": "indigo",
  "route": "/admin/partners",
  "access": "GM + Partners Manager + VIP Relations (later)",
  "description": "إدارة الشراكات والعلاقات مع كبار المستثمرين"
}
```

**ملاحظة:** إذا لم تُبنَ بعد، اجعلها "Coming Soon"

---

### 🔟 إدارة الموظفين والصلاحيات
```json
{
  "card_key": "staff_permissions",
  "title_ar": "إدارة الموظفين والصلاحيات",
  "icon": "Users",
  "color": "teal",
  "route": "/admin/settings/staff",
  "access": "GM Only (or GM + super_admin)",
  "description": "إنشاء وإدارة الموظفين ومنح الصلاحيات"
}
```

**الوظائف:**
- إنشاء موظفين جدد
- تعيين الأدوار والأقسام
- منح صلاحيات البطاقات
- إيقاف/تفعيل الحسابات
- إعادة تعيين كلمات المرور

---

### 1️⃣1️⃣ إعدادات المنصة
```json
{
  "card_key": "platform_settings",
  "title_ar": "إعدادات المنصة",
  "icon": "Settings",
  "color": "gray",
  "route": "/admin/settings",
  "access": "GM Only",
  "description": "إعدادات النظام والتخصيص والتحكم الكامل"
}
```

---

## 🔐 نظام الصلاحيات

### مستويات الوصول
```typescript
type AccessLevel = 'view' | 'operate' | 'manage' | 'full';
```

- **view**: عرض فقط
- **operate**: تشغيل وعمليات أساسية
- **manage**: إدارة كاملة
- **full**: تحكم كامل (GM level)

### منح الصلاحيات
من `/admin/settings/staff`:
1. اضغط على القائمة بجانب اسم الموظف
2. اختر "منح صلاحيات الوصول"
3. حدد البطاقات المراد منحها
4. اختر مستوى الوصول
5. احفظ

```sql
-- مثال: منح صلاحية B2F Operations
SELECT grant_gateway_access(
  p_user_id := 'staff-uuid',
  p_card_key := 'b2f_operations_room',
  p_access_level := 'manage',
  p_granted_by := 'gm-uuid',
  p_valid_until := NULL,
  p_notes := 'منح من المدير العام'
);
```

---

## 🧪 الاختبار

### كمدير عام:
```bash
1. سجل دخول من /admin/gateway
2. تحقق من ظهور جميع البطاقات الـ 11
3. افتح Console وراجع Debug logs
4. تأكد من is_gm_access: true
```

### كموظف عادي:
```bash
1. أنشئ موظف من /admin/settings/staff
2. امنحه صلاحية واحدة (مثلاً: my_work + b2f_operations_room)
3. سجل خروج وادخل بحساب الموظف
4. يجب أن يذهب تلقائياً إلى /admin/my-work
5. اضغط على زر التاج
6. يجب أن يرى بطاقتين فقط
```

---

## 📊 الدوال المتاحة

### `get_user_gateway_cards(p_user_id uuid)`
تعيد بطاقات المستخدم حسب دوره وصلاحياته.

```sql
-- مثال
SELECT * FROM get_user_gateway_cards('staff-uuid');
```

### `get_user_cards_with_farms(p_user_id uuid)`
تعيد بطاقات المستخدم + قائمة المزارع المعين عليها.

```json
{
  "cards": [...],
  "user_farms": [
    {
      "farm_id": "uuid",
      "farm_name": "مزرعة النخيل",
      "role": "farm_manager"
    }
  ]
}
```

### `grant_gateway_access(...)`
منح صلاحية بطاقة لمستخدم.

### `revoke_gateway_access(...)`
إلغاء صلاحية بطاقة من مستخدم.

### `check_gateway_access(p_user_id uuid, p_card_key text)`
التحقق من صلاحية وصول المستخدم لبطاقة معينة.

---

## 🚀 التحديثات المطبقة

### ✅ تم التنفيذ:
- [x] حذف زر التاج القديم (HiddenAdminButton)
- [x] بقاء زر واحد فقط يفتح `/admin/gateway`
- [x] إضافة Debug logging في البوابة
- [x] إصلاح `get_user_gateway_cards` لتعيد RETURNS TABLE
- [x] GM Bypass - يرى كل البطاقات تلقائياً
- [x] تحديث SessionGuard للتوجيه إلى `/admin/gateway`
- [x] Landing page لغير GM → `/admin/my-work`
- [x] إنشاء GrantAccessModal لربط الصلاحيات
- [x] تحديث البطاقات إلى القائمة الرسمية (11 بطاقة)
- [x] إضافة دالة `get_user_cards_with_farms` للبطاقات الديناميكية

---

## 🎨 الألوان والأيقونات

| البطاقة | اللون | الأيقونة | التدرج |
|---------|-------|----------|--------|
| غرفة القيادة | purple | Crown | purple-600 → indigo-700 |
| B2F Operations | green | Sprout | green-500 → emerald-600 |
| B2B Auctions | blue | Gavel | blue-500 → cyan-600 |
| قيادة المزارع | amber | Tractor | amber-500 → orange-600 |
| لوحة المزرعة | lime | Leaf | lime-500 → green-600 |
| عملي اليوم | slate | Briefcase | slate-500 → gray-600 |
| المالية | red | DollarSign | red-500 → pink-600 |
| التسويق | yellow | TrendingUp | yellow-500 → amber-600 |
| الشركاء | indigo | Handshake | indigo-500 → purple-600 |
| إدارة الموظفين | teal | Users | teal-500 → cyan-600 |
| الإعدادات | gray | Settings | gray-600 → slate-700 |

---

## 📝 ملاحظات مهمة

1. **لا تسجيل ذاتي**: جميع الحسابات تُنشأ من GM فقط
2. **my_work متاح للجميع**: لا يحتاج إلى منح صلاحية
3. **GM له صلاحية كاملة**: bypass على كل شيء
4. **البطاقات الديناميكية**: farm_workspace تظهر حسب التعيين
5. **الصلاحيات تُورث**: إذا منحت full access، المستخدم يمكنه كل شيء

---

## 🔗 المسارات المحمية

جميع مسارات `/admin/*` و `/hq/*` محمية بـ:
- `SessionGuard`: التحقق من وجود جلسة نشطة
- `GatewayGuard`: التحقق من صلاحية الوصول للبطاقة
- `DepartmentGuard`: التحقق من القسم (لبعض المسارات)
- `FarmScopeGuard`: التحقق من التعيين على مزرعة (للمسارات الخاصة بالمزارع)

---

تم التحديث: 2026-01-06
الإصدار: 2.0 (القائمة الرسمية)
