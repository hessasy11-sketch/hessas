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

### 3. نظام PIN الاختياري (للمدراء والمشرفين)

#### متى يظهر PIN:
- بعد التحقق الناجح من QR
- إذا كان `requires_pin = true` للموظف
- يظهر modal لإدخال PIN من 4 أرقام

#### ميزات نظام PIN:
- **4 خانات فقط**: PIN مكون من 4 أرقام
- **إدخال تلقائي**: ينتقل تلقائياً للخانة التالية
- **تحقق فوري**: يتحقق تلقائياً عند إدخال الرقم الرابع
- **3 محاولات**: فقط 3 محاولات قبل القفل
- **قفل 30 دقيقة**: بعد 3 محاولات فاشلة
- **تشفير آمن**: PIN مشفر باستخدام bcrypt

#### سيناريو العمل:
1. موظف يمسح QR → نجاح
2. إذا `requires_pin = true` → يظهر modal PIN
3. يدخل PIN → تحقق
4. إذا صحيح → دخول مباشر
5. إذا خاطئ → يحذف الإدخال ويتيح محاولة جديدة
6. بعد 3 محاولات → قفل 30 دقيقة

#### إذا `requires_pin = false`:
- دخول مباشر بدون أي خطوة إضافية

---

## الحقول الجديدة في platform_staff

### حقول QR:
```sql
- qr_token (text, unique) - رمز QR فريد لكل موظف
- qr_is_active (boolean) - حالة تفعيل/إيقاف البركود
- qr_generated_at (timestamptz) - تاريخ توليد البركود
- qr_last_scanned_at (timestamptz) - آخر مرة تم مسح البركود
```

### حقول PIN:
```sql
- requires_pin (boolean) - هل يتطلب PIN للدخول
- pin_code (text) - رمز PIN المشفر (bcrypt)
- pin_attempts (integer) - عدد المحاولات الفاشلة
- pin_locked_until (timestamptz) - تاريخ القفل (إن وجد)
- pin_last_verified_at (timestamptz) - آخر تحقق ناجح
```

---

## الدوال المتاحة

### دوال QR

#### 1. توليد QR Token للموظف

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

#### 3. تفعيل/إيقاف QR للموظف

```sql
SELECT toggle_staff_qr_status('staff_id_uuid', true);
SELECT toggle_staff_qr_status('staff_id_uuid', false);
```

---

### دوال PIN

#### 1. تعيين PIN للموظف

```sql
SELECT set_staff_pin('staff_id_uuid', '1234', true);
```

**المعاملات:**
- `staff_id`: UUID الموظف
- `pin_code`: رمز PIN (4 أرقام فقط)
- `requires_pin`: هل يتطلب PIN (default: true)

**الناتج:**
```json
{
  "success": true,
  "staff_id": "uuid",
  "requires_pin": true,
  "message": "تم تعيين PIN بنجاح"
}
```

**ملاحظة**: يمكن فقط لـ Platform Admins استدعاء هذه الدالة

---

#### 2. التحقق من PIN (تستخدمها Edge Function)

```sql
SELECT verify_staff_pin('staff_id_uuid', '1234');
```

**ناتج النجاح:**
```json
{
  "success": true,
  "message": "تم التحقق بنجاح",
  "staff_id": "uuid"
}
```

**ناتج الفشل:**
```json
{
  "success": false,
  "message": "PIN غير صحيح",
  "reason": "invalid_pin",
  "attempts_remaining": 2
}
```

**ناتج القفل:**
```json
{
  "success": false,
  "message": "تم قفل PIN لمدة 30 دقيقة",
  "reason": "pin_locked",
  "locked_until": "2026-01-03T12:30:00Z",
  "attempts_remaining": 0
}
```

---

#### 3. إعادة تعيين محاولات PIN

```sql
SELECT reset_pin_attempts('staff_id_uuid');
```

**يستخدم عندما:**
- Admin يريد إلغاء القفل للموظف
- إعادة ضبط العداد بعد فترة القفل

---

#### 4. إزالة PIN من موظف

```sql
SELECT remove_staff_pin('staff_id_uuid');
```

**يستخدم عندما:**
- Admin يريد إلغاء تفعيل PIN للموظف
- يصبح الموظف لا يحتاج PIN

---

## Edge Function APIs

### 1. QR Verification API

#### Endpoint
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

#### Response (Rejected - 403)
```json
{
  "success": false,
  "message": "لا تملك صلاحية دخول",
  "reason": "invalid_token"
}
```

#### Response (Requires PIN - 200)
```json
{
  "success": true,
  "message": "مرحباً بك",
  "requires_pin": true,
  "staff": { ... }
}
```

---

### 2. PIN Verification API

#### Endpoint
```
POST {SUPABASE_URL}/functions/v1/verify-staff-pin
```

#### Request
```json
{
  "staff_id": "uuid",
  "pin_code": "1234"
}
```

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "تم التحقق بنجاح",
  "staff_id": "uuid"
}
```

#### Response (Invalid PIN - 403)
```json
{
  "success": false,
  "message": "PIN غير صحيح",
  "reason": "invalid_pin",
  "attempts_remaining": 2
}
```

#### Response (Locked - 403)
```json
{
  "success": false,
  "message": "تم قفل PIN لمدة 30 دقيقة",
  "reason": "pin_locked",
  "locked_until": "2026-01-03T12:30:00Z",
  "attempts_remaining": 0
}
```

---

## الملفات المنشأة

### QR System Files

1. **SmartQRScanner Component**: `src/components/platform/SmartQRScanner.tsx`
   - قارئ QR ذكي مع AI للكشف عن التلاعب

2. **useQRVerification Hook**: `src/hooks/useQRVerification.ts`
   - Custom hook للتحقق من QR tokens و PIN

3. **AdminSmartAccessGate Component**: `src/components/platform/AdminSmartAccessGate.tsx`
   - واجهة بوابة الدخول الكاملة مع دعم PIN

4. **Edge Function (QR)**: `supabase/functions/verify-qr-access/index.ts`
   - API للتحقق من الصلاحيات عبر QR

5. **Migration (QR)**: `supabase/migrations/add_qr_access_system_to_platform_staff.sql`
   - إضافة حقول QR لجدول platform_staff

### PIN System Files

6. **PinInputModal Component**: `src/components/platform/PinInputModal.tsx`
   - Modal لإدخال PIN مع تصميم احترافي

7. **Edge Function (PIN)**: `supabase/functions/verify-staff-pin/index.ts`
   - API للتحقق من PIN

8. **Migration (PIN)**: `supabase/migrations/add_pin_system_to_platform_staff.sql`
   - إضافة حقول PIN ودوال الإدارة

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

### السيناريو 4: إضافة PIN لمدير

```sql
-- 1. تعيين PIN للمدير
SELECT set_staff_pin('manager_staff_id', '1234', true);

-- 2. المدير يمسح QR → نجاح
-- 3. يظهر modal PIN
-- 4. يدخل 1234 → دخول مباشر
```

### السيناريو 5: موظف ينسى PIN

```sql
-- Admin يعيد تعيين PIN جديد
SELECT set_staff_pin('staff_id_uuid', '5678', true);

-- أو يلغي PIN تماماً
SELECT remove_staff_pin('staff_id_uuid');
```

### السيناريو 6: محاولات فاشلة متكررة

```sql
-- محاولة 1: خطأ → 2 محاولات متبقية
-- محاولة 2: خطأ → 1 محاولة متبقية
-- محاولة 3: خطأ → قفل لمدة 30 دقيقة

-- Admin يفتح القفل
SELECT reset_pin_attempts('staff_id_uuid');
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

### أمان QR
1. **الرموز عشوائية**: يتم توليد QR tokens بطريقة عشوائية آمنة (32 byte)
2. **رفض بصمت**: لا يتم كشف السبب الحقيقي للرفض للمستخدم
3. **تسجيل كامل**: جميع محاولات المسح يتم تسجيلها
4. **صلاحيات محدودة**: فقط Platform Admins يمكنهم إدارة QR tokens
5. **Edge Function عام**: API متاح بدون JWT للسماح بالمسح من أي جهاز
6. **AI للكشف عن التلاعب**: منع استخدام صور أو شاشات

### أمان PIN
1. **تشفير قوي**: PIN مشفر باستخدام bcrypt (8 rounds)
2. **محاولات محدودة**: 3 محاولات فقط قبل القفل
3. **قفل تلقائي**: 30 دقيقة قفل بعد 3 محاولات فاشلة
4. **تسجيل كامل**: جميع محاولات التحقق تسجل في Audit Log
5. **إدارة Admin فقط**: فقط Platform Admins يمكنهم تعيين/إزالة PIN
6. **التحقق من الشكل**: يجب أن يكون PIN 4 أرقام بالضبط
7. **عدم كشف المعلومات**: لا يتم كشف معلومات إضافية عند الفشل

---

## الاختبار

### اختبار QR فقط (بدون PIN)
1. قم بتشغيل المشروع: `npm run dev`
2. أضف موظف جديد مع `requires_pin = false`
3. ولد QR token له
4. امسح QR code
5. يجب أن تظهر رسالة الترحيب مباشرة

### اختبار QR + PIN
1. أضف موظف جديد
2. ولد QR token له
3. عيّن PIN له: `SELECT set_staff_pin('staff_id', '1234', true);`
4. امسح QR code → نجاح
5. يجب أن يظهر modal PIN
6. أدخل 1234 → دخول مباشر
7. اختبر محاولات فاشلة:
   - أدخل 0000 → خطأ (2 محاولات متبقية)
   - أدخل 1111 → خطأ (1 محاولة متبقية)
   - أدخل 2222 → قفل لمدة 30 دقيقة

---

## خطوات لاحقة مقترحة

1. ✅ إضافة QR Code Generator في واجهة الإدارة
2. ✅ إضافة PIN system للأدوار الحساسة
3. إضافة صفحة طباعة بطاقات الموظفين مع QR
4. إضافة إحصائيات الدخول (من دخل، متى، من أين)
5. إضافة تنبيهات عند محاولات دخول مشبوهة
6. إضافة لوحة تحكم Admin لإدارة QR و PIN
7. إضافة تقارير Audit Log للأمان
