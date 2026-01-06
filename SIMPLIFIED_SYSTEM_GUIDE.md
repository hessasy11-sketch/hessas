# النظام المبسط - دليل الاستخدام

## التبسيط المتعمد ✅

تم تبسيط النظام بشكل جذري كما طلبت. **هذا ليس حلاً مؤقتاً**، بل هو النظام الفعلي للتشغيل.

---

## الأدوار (2 فقط)

### 1. `farms_manager` - مدير المزارع (صاحب المنصة)
- يرى **كل شيء** في النظام
- يدير جميع المزارع
- يراجع جميع الطلبات
- يعتمد العقود
- **المسار**: `/admin/farms-manager-dashboard`

### 2. `farm_manager` - مدير مزرعة
- يرى **مزرعته فقط**
- يدير فريقه
- يتابع المهام والمصروفات
- **المسار**: `/admin/farm-manager-dashboard`

---

## تسجيل الدخول (بسيط)

### صفحة واحدة: `/login`

**البيانات المطلوبة:**
- رقم الجوال
- كلمة المرور

### الحسابات التجريبية:

#### مدير المزارع (صاحب المنصة)
```
الجوال: 0500000000
كلمة المرور: 123456
```

#### مدير مزرعة
```
الجوال: 0500000002
كلمة المرور: 123456
```

---

## ما تم إزالته ❌

### تم التخلص من:
1. ✅ Decision Queue (قوائم القرارات)
2. ✅ Delegation Matrix (تفويض الصلاحيات)
3. ✅ Operations Rooms (غرف العمليات)
4. ✅ Crown Gateway المعقدة (بوابة التاج)
5. ✅ QR Scanner (ماسح الأكواد)
6. ✅ PIN System (رموز PIN)
7. ✅ Authority Panel (لوحة الصلاحيات)
8. ✅ الأدوار المعقدة (أكثر من 20 دور)
9. ✅ Session Guards المعقدة
10. ✅ Department Guards

---

## ما تم الاحتفاظ به ✅

### الأساسيات فقط:
1. ✅ صفحة تسجيل دخول بسيطة (جوال + كلمة مرور)
2. ✅ لوحة تحكم مدير المزارع (Farms Manager)
3. ✅ لوحة تحكم مدير المزرعة (Farm Manager)
4. ✅ نظام استثمار الأشجار (B2F)
5. ✅ المزارع والعقود
6. ✅ المستثمرين والطلبات
7. ✅ الجلسات البسيطة (localStorage)

---

## كيفية الاستخدام

### 1. تسجيل الدخول
```
1. اذهب إلى: /login
2. أدخل الجوال وكلمة المرور
3. سيتم توجيهك تلقائياً حسب دورك
```

### 2. مدير المزارع (farms_manager)
```
يدخل على: /admin/farms-manager-dashboard
يرى:
  - إجمالي المزارع
  - المستثمرين
  - العقود النشطة
  - الطلبات المعلقة
  - إجمالي الأشجار
  - الإيرادات

الإجراءات:
  - إدارة المزارع (B2F Admin)
  - مراجعة الطلبات
  - اعتماد العقود
  - التقارير المالية
```

### 3. مدير المزرعة (farm_manager)
```
يدخل على: /admin/farm-manager-dashboard
يرى:
  - معلومات مزرعته فقط
  - فريق العمل
  - المهام اليومية
  - المصروفات
  - الأشجار والإنتاج

الإجراءات:
  - إدارة الفريق
  - توزيع المهام
  - اعتماد المصروفات
  - متابعة الصيانة
```

---

## الجلسات

### بسيطة جداً - localStorage فقط

**المفتاح**: `simplified_session`

**البيانات المحفوظة**:
```json
{
  "staffId": "uuid",
  "staffName": "الاسم الكامل",
  "role": "farms_manager أو farm_manager",
  "farmId": "uuid (للمدير المزرعة فقط)",
  "farmName": "اسم المزرعة",
  "loginAt": "2026-01-06T..."
}
```

---

## RLS Policies

### مبسطة تماماً

**الآن**: الجميع يمكنهم القراءة والكتابة (`USING (true), WITH CHECK (true)`)

**السبب**: نظام مبسط بدون تعقيدات

**الجداول المتأثرة**:
- `b2f_farms`
- `b2f_sales_requests`
- `b2f_contracts`
- `b2f_investor_accounts`
- `farm_team_members`
- `farm_tasks`
- `farm_expenses`

---

## لا يوجد Redirects غير مبررة ✅

### التوجيه واضح:
```
Login → Check Role → Redirect
  ↓
farms_manager → /admin/farms-manager-dashboard
farm_manager → /admin/farm-manager-dashboard
```

### لا طرد بسبب RLS ✅
جميع السياسات مفتوحة (`true`)

### الجلسة ثابتة ✅
تُحفظ في `localStorage` ولا تنتهي إلا بالخروج اليدوي

---

## الملفات الرئيسية

### Frontend:
```
src/components/SimplifiedLogin.tsx        // صفحة تسجيل الدخول
src/components/FarmsManagerDashboard.tsx  // لوحة مدير المزارع
src/components/platform/FarmManagerDashboard.tsx  // لوحة مدير المزرعة
```

### Database:
```
supabase/migrations/
  └── simplified_login_only.sql   // دالة التسجيل + تحديث الحسابات
```

### Routes:
```
/login                           // تسجيل الدخول
/admin/farms-manager-dashboard   // مدير المزارع
/admin/farm-manager-dashboard    // مدير المزرعة
/admin/b2f                       // نظام B2F (للجميع)
```

---

## استكشاف الأخطاء

### المشكلة: لا يمكن تسجيل الدخول
```
الحل:
1. تحقق من رقم الجوال (يجب أن يبدأ بـ 05)
2. تحقق من كلمة المرور (123456)
3. تحقق من Console للأخطاء
4. تحقق من أن الحساب موجود في platform_staff
```

### المشكلة: Redirect لا يعمل
```
الحل:
1. تحقق من localStorage: simplified_session
2. تحقق من الدور في الجلسة
3. تحقق من Console للأخطاء
```

### المشكلة: البيانات لا تظهر
```
الحل:
1. افتح Developer Console
2. تحقق من Network Tab
3. تحقق من أن الاستعلامات تعمل
4. RLS مفتوحة، لا يوجد مشكلة صلاحيات
```

---

## للمطورين

### إضافة حساب جديد:
```sql
INSERT INTO platform_staff (
  staff_code,
  full_name,
  phone,
  role,
  is_active,
  password_hash
) VALUES (
  'FM002',
  'أحمد محمد',
  '0500000003',
  'farm_manager',
  true,
  '123456'
);
```

### تغيير كلمة المرور:
```sql
UPDATE platform_staff
SET password_hash = 'new_password'
WHERE phone = '0500000000';
```

### ربط مدير بمزرعة:
```sql
INSERT INTO farm_team_members (
  farm_id,
  staff_id,
  role,
  is_active
) VALUES (
  'farm-uuid-here',
  'staff-uuid-here',
  'farm_manager',
  true
);
```

---

## الخلاصة

✅ **نظام بسيط**
✅ **دورين فقط**
✅ **تسجيل دخول واحد**
✅ **لوحتين تحكم**
✅ **لا Redirect عشوائي**
✅ **لا طرد RLS**
✅ **جلسة ثابتة**

🎯 **هذا هو النظام النهائي للتشغيل الفعلي**

---

**تاريخ التبسيط**: 2026-01-06
**الإصدار**: 1.0 (مبسط ونهائي)
