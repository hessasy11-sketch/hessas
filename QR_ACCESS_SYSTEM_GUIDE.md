# دليل نظام التحقق من الدخول بالباركود الذكي

## نظرة عامة

تم تنفيذ نظام قراءة باركود ذكي (AI QR Reader) + نظام تحقق آمن للسماح للموظفين بالدخول للمنصة.

---

## المميزات المنفذة

### 1. قارئ باركود ذكي (SmartQRScanner)

#### التحسينات التلقائية:
- **سرعة عالية**: 30 إطار/ثانية
- **تركيز مستمر**: Continuous focus mode
- **تعديل إضاءة تلقائي**: Continuous exposure mode
- **قراءة من جميع الزوايا**: Multi-angle support

#### ذكاء محدود لكشف التلاعب:
- **كشف الصور الثابتة**: تحليل التباين في السطوع عبر الإطارات
- **كشف الشاشات**: فحص السطوع العالي + تباين منخفض (< 20)
- **تحليل جودة الصورة**: رفض الصور ذات جودة رديئة
- **تحليل السلوك**: مراقبة محاولات المسح المتكررة
- **حساب إحصائي**: معادلات التباين والانحراف المعياري

#### Debounce ومنع التكرار:
- منع قراءة نفس الكود خلال 3 ثواني
- تخزين محاولات المسح الأخيرة
- تنظيف تلقائي للبيانات

---

### 2. نظام التحقق من الدخول

#### المصدر الوحيد للحقيقة:
الدخول مرتبط فقط بجدول `platform_staff` في قاعدة البيانات

#### شروط السماح بالدخول:
1. الموظف موجود في `platform_staff`
2. `is_active = true`
3. `qr_is_active = true` (البركود نشط)
4. الدور محدد (`role` not null)
5. القسم محدد (`department` not null)

#### عند عدم انطباق الشروط:
- رفض بصمت
- رسالة لطيفة: "لا تملك صلاحية دخول"
- لا يتم كشف السبب الحقيقي للمستخدم (أمان)

---

## الحقول الجديدة في platform_staff

```sql
- qr_token (text, unique) - رمز QR فريد لكل موظف
- qr_is_active (boolean) - حالة تفعيل/إيقاف البركود
- qr_generated_at (timestamptz) - تاريخ توليد البركود
- qr_last_scanned_at (timestamptz) - آخر مرة تم مسح البركود
```

---

## الدوال المتاحة

### 1. توليد QR Token للموظف

```sql
SELECT generate_staff_qr_token('staff_id_uuid');
```

**الناتج:**
```json
{
  "success": true,
  "token": "اا3kd9fj2...",
  "staff_id": "uuid",
  "staff_name": "اسم الموظف",
  "generated_at": "2026-01-03T..."
}
```

**ملاحظة**: يمكن فقط لـ Platform Admins استدعاء هذه الدالة

---

### 2. التحقق من صلاحية الدخول

```sql
SELECT verify_qr_access('qr_token_string');
```

**ناتج النجاح:**
```json
{
  "success": true,
  "message": "مرحباً بك",
  "staff": {
    "id": "uuid",
    "user_id": "uuid",
    "full_name": "محمد أحمد",
    "phone": "+966...",
    "role": "manager",
    "role_title": "مدير عام B2F",
    "department": "B2F",
    "permissions": {...},
    "scope_farms": [...]
  }
}
```

**ناتج الفشل:**
```json
{
  "success": false,
  "message": "لا تملك صلاحية دخول",
  "reason": "invalid_token" | "staff_inactive" | "qr_inactive" | "no_role" | "no_department"
}
```

---

### 3. تفعيل/إيقاف QR للموظف

```sql
SELECT toggle_staff_qr_status('staff_id_uuid', true);
SELECT toggle_staff_qr_status('staff_id_uuid', false);
```

---

## Edge Function API

### Endpoint
```
POST {SUPABASE_URL}/functions/v1/verify-qr-access
```

### Request
```json
{
  "qr_token": "string"
}
```

### Response (Success - 200)
```json
{
  "success": true,
  "message": "مرحباً بك",
  "staff": { ... }
}
```

### Response (Rejected - 403)
```json
{
  "success": false,
  "message": "لا تملك صلاحية دخول",
  "reason": "invalid_token"
}
```

---

## الملفات المنشأة

1. **SmartQRScanner Component**: `src/components/platform/SmartQRScanner.tsx`
   - قارئ QR ذكي مع AI للكشف عن التلاعب

2. **useQRVerification Hook**: `src/hooks/useQRVerification.ts`
   - Custom hook للتحقق من QR tokens

3. **AdminSmartAccessGate Component**: `src/components/platform/AdminSmartAccessGate.tsx`
   - واجهة بوابة الدخول الكاملة

4. **Edge Function**: `supabase/functions/verify-qr-access/index.ts`
   - API للتحقق من الصلاحيات

5. **Migration**: `supabase/migrations/add_qr_access_system_to_platform_staff.sql`
   - إضافة حقول QR لجدول platform_staff

---

## سيناريوهات الاستخدام

### السيناريو 1: إضافة موظف جديد

```sql
-- 1. إضافة الموظف إلى platform_staff
INSERT INTO platform_staff (user_id, role, department, job_title, is_active)
VALUES ('user_uuid', 'manager', 'B2F', 'مدير قسم المزارع', true);

-- 2. توليد QR Token
SELECT generate_staff_qr_token('staff_id_uuid');

-- 3. إنشاء QR Code من الـ token وطباعته للموظف
```

### السيناريو 2: إيقاف موظف مؤقتاً

```sql
-- إيقاف البركود فقط (الموظف يبقى نشطاً في النظام)
SELECT toggle_staff_qr_status('staff_id_uuid', false);
```

### السيناريو 3: إعادة توليد QR

```sql
-- توليد token جديد (يلغي القديم)
SELECT generate_staff_qr_token('staff_id_uuid');
```

---

## أمثلة لحالات الرفض

### 1. رمز QR غير صحيح
```
السبب: invalid_token
الرسالة: "لا تملك صلاحية دخول"
```

### 2. الموظف غير نشط
```
السبب: staff_inactive
الرسالة: "لا تملك صلاحية دخول"
```

### 3. البركود موقوف
```
السبب: qr_inactive
الرسالة: "لا تملك صلاحية دخول"
```

### 4. لا يوجد دور وظيفي
```
السبب: no_role
الرسالة: "لا تملك صلاحية دخول"
```

### 5. لا يوجد قسم
```
السبب: no_department
الرسالة: "لا تملك صلاحية دخول"
```

---

## سجل التدقيق

جميع عمليات توليد وتفعيل/إيقاف QR يتم تسجيلها في:
```
platform_audit_logs
```

ويمكن الاستعلام عنها:
```sql
SELECT * FROM platform_audit_logs
WHERE target_type = 'staff'
AND action_type IN ('create_staff', 'activate_staff', 'deactivate_staff')
ORDER BY created_at DESC;
```

---

## ملاحظات أمنية

1. **الرموز عشوائية**: يتم توليد QR tokens بطريقة عشوائية آمنة (32 byte)
2. **رفض بصمت**: لا يتم كشف السبب الحقيقي للرفض للمستخدم
3. **تسجيل كامل**: جميع محاولات المسح يتم تسجيلها
4. **صلاحيات محدودة**: فقط Platform Admins يمكنهم إدارة QR tokens
5. **Edge Function عام**: API متاح بدون JWT للسماح بالمسح من أي جهاز
6. **AI للكشف عن التلاعب**: منع استخدام صور أو شاشات

---

## الاختبار

1. قم بتشغيل المشروع: `npm run dev`
2. افتح بوابة الدخول في المتصفح
3. قم بمسح QR code لموظف صالح
4. يجب أن تظهر رسالة الترحيب مع معلومات الموظف

---

## خطوات لاحقة مقترحة

1. إضافة QR Code Generator في واجهة الإدارة
2. إضافة صفحة طباعة بطاقات الموظفين مع QR
3. إضافة إحصائيات الدخول (من دخل، متى، من أين)
4. إضافة تنبيهات عند محاولات دخول مشبوهة
5. إضافة PIN code إضافي للأدوار الحساسة
