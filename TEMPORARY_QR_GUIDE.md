# دليل نظام الباركود المؤقت للمدير العام

## نظرة عامة

نظام حل انتقالي يسمح للمدير العام بالدخول فوراً إلى لوحة الإدارة العليا باستخدام باركود مؤقت، مع إمكانية استبداله بباركود دائم بعد أول دخول ناجح.

---

## المشكلة التي يحلها

قبل هذا النظام، كان المدير العام لا يستطيع الدخول إلى /hq لأنه لم يكن لديه باركود QR. هذا النظام يحل المشكلة بـ:

1. **باركود مؤقت**: تم توليده تلقائياً وجاهز للاستخدام فوراً
2. **تنبيه واضح**: يظهر داخل /hq بعد الدخول
3. **استبدال سهل**: زر واحد لتوليد باركود دائم جديد

---

## معلومات المدير العام

### بيانات الدخول

```
رقم الهاتف: 0500000001
PIN المؤقت: 123456
```

**الباركود المؤقت:**
سيظهر في الـ console عند تطبيق migration `add_super_admin_role_and_create_gm.sql`

---

## كيف يعمل النظام

### 1. التسجيل التلقائي

عند تطبيق الـ migration، يتم:

```sql
-- إنشاء profile للمدير العام
INSERT INTO profiles (
  phone_number: '0500000001',
  display_name: 'المدير العام',
  user_type: 'general_manager'
);

-- إنشاء platform_staff
INSERT INTO platform_staff (
  role: 'super_admin',
  department: 'HQ',
  job_title: 'المدير العام',
  requires_pin: true,
  is_temporary_qr: true  ← جديد
);

-- توليد باركود مؤقت
UPDATE platform_staff SET
  qr_token = 'TEMP_GM_xxxxx...',
  pin_code = crypt('123456', gen_salt('bf')),
  temporary_qr_created_at = now();
```

### 2. الدخول الأول

1. المدير العام يمسح الباركود المؤقت
2. يدخل PIN المؤقت (123456)
3. يتم التحقق عبر `verify_qr_access`
4. يتم التوجيه إلى /hq

### 3. التنبيه

بمجرد الدخول إلى /hq، يظهر تنبيه برتقالي كبير في أعلى الصفحة:

```
⚠️ تنبيه: باركود مؤقت
أنت تستخدم باركود مؤقت للدخول.
يرجى استبداله بباركود دائم للأمان.

[استبدال الباركود الآن]
```

### 4. الاستبدال

عند الضغط على "استبدال الباركود الآن":

1. يتم استدعاء `replace_temporary_qr()`
2. يتم توليد باركود دائم جديد
3. يتم تحديث الحساب:
   ```sql
   UPDATE platform_staff SET
     qr_token = 'STAFF_new_token...',
     is_temporary_qr = false,
     temporary_qr_created_at = NULL;
   ```
4. يتم تسجيل العملية في Audit Log
5. يظهر نافذة نجاح مع:
   - صورة QR Code (يمكن تحميلها)
   - زر نسخ Token
   - تعليمات حفظ الباركود

---

## البنية التقنية

### 1. قاعدة البيانات

#### حقول جديدة في `platform_staff`:

```sql
ALTER TABLE platform_staff
  ADD COLUMN is_temporary_qr boolean DEFAULT false,
  ADD COLUMN temporary_qr_created_at timestamptz;
```

#### دوال جديدة:

**1. `replace_temporary_qr()`**

```sql
CREATE FUNCTION replace_temporary_qr()
RETURNS jsonb;
```

**الاستخدام:**
```sql
SELECT replace_temporary_qr();
```

**المُرجع:**
```json
{
  "success": true,
  "message": "تم استبدال الباركود المؤقت بنجاح",
  "qr_token": "STAFF_new_permanent_token...",
  "generated_at": "2026-01-03T12:00:00Z"
}
```

**2. `check_temporary_qr_status()`**

```sql
CREATE FUNCTION check_temporary_qr_status()
RETURNS jsonb;
```

**الاستخدام:**
```sql
SELECT check_temporary_qr_status();
```

**المُرجع:**
```json
{
  "has_temporary_qr": true,
  "created_at": "2026-01-03T10:00:00Z",
  "job_title": "المدير العام",
  "role": "super_admin",
  "staff_id": "uuid",
  "qr_token": "TEMP_GM_..."
}
```

### 2. المكونات الجديدة

#### `TemporaryQRAlert.tsx`

مكون تنبيه يظهر في /hq:

**الميزات:**
- يتحقق تلقائياً من حالة الباركود عند التحميل
- تنبيه برتقالي متحرك (animated) لجذب الانتباه
- زر استبدال فوري
- نافذة نجاح مع QR Code قابل للتحميل
- زر نسخ Token
- يمكن إغلاقه مؤقتاً (dismiss)

**الاستخدام:**
```tsx
import { TemporaryQRAlert } from './TemporaryQRAlert';

function OrgStructureView() {
  return (
    <div>
      <TemporaryQRAlert />
      {/* باقي المحتوى */}
    </div>
  );
}
```

### 3. التحديثات على `verify_qr_access`

تم تحديث الدالة لإرجاع حالة الباركود:

```sql
RETURN jsonb_build_object(
  'success', true,
  'staff', jsonb_build_object(
    'is_temporary_qr', COALESCE(v_staff.is_temporary_qr, false),
    -- باقي البيانات
  )
);
```

---

## سيناريوهات الاستخدام

### سيناريو 1: الدخول الأول

```
1. المدير العام يستلم:
   - رقم الهاتف: 0500000001
   - PIN: 123456
   - QR Token: TEMP_GM_xxxxx...

2. يمسح الباركود أو يرفع صورته
3. يدخل PIN (123456)
4. يتم التوجيه إلى /hq
5. يرى تنبيه برتقالي كبير: "باركود مؤقت - يرجى استبداله"
```

### سيناريو 2: استبدال الباركود

```
1. المدير العام يضغط "استبدال الباركود الآن"
2. النظام يولد باركود دائم جديد
3. تظهر نافذة نجاح مع:
   - صورة QR Code
   - زر تحميل
   - زر نسخ Token
4. المدير العام يحمل الصورة أو ينسخ Token
5. يحفظه في مكان آمن
6. يغلق النافذة
7. التنبيه البرتقالي يختفي نهائياً
```

### سيناريو 3: الدخول بالباركود الدائم

```
1. المدير العام يستخدم الباركود الجديد
2. يدخل PIN (123456 أو PIN جديد إذا تم تغييره)
3. يتم التوجيه إلى /hq
4. لا يظهر أي تنبيه (لأن is_temporary_qr = false)
5. يعمل بشكل طبيعي
```

---

## الأمان

### 1. الباركود المؤقت

- يبدأ بـ `TEMP_GM_` للتعرف عليه
- يعمل تماماً مثل الباركود الدائم (نفس الصلاحيات)
- يتطلب PIN إلزامي
- يُسجل في Audit Logs

### 2. الباركود الدائم

- يبدأ بـ `STAFF_`
- أكثر أماناً (تم توليده من قبل المدير نفسه)
- يحل محل المؤقت بشكل نهائي
- لا يمكن الرجوع للمؤقت بعد الاستبدال

### 3. تسجيل العمليات

كل عملية استبدال تُسجل في `admin_operations_audit`:

```sql
INSERT INTO admin_operations_audit (
  admin_staff_id: v_staff_id,
  target_staff_id: v_staff_id,
  operation_type: 'generate_qr',
  operation_details: {
    "action": "replace_temporary_qr",
    "old_token_prefix": "TEMP_GM_...",
    "new_token_prefix": "STAFF_..."
  }
);
```

---

## Best Practices

### 1. للمدير العام

✅ **افعل:**
- استبدل الباركود المؤقت فوراً بعد أول دخول
- احفظ الباركود الدائم في مكان آمن جداً
- لا تشارك الباركود مع أحد
- غير PIN بعد الاستبدال

❌ **لا تفعل:**
- لا تتجاهل التنبيه
- لا تستخدم الباركود المؤقت لفترة طويلة
- لا تفقد الباركود الدائم بعد الاستبدال

### 2. للمطورين

✅ **افعل:**
- تأكد من تطبيق migration قبل الإنتاج
- احفظ QR Token في مكان آمن للطوارئ
- تحقق من Audit Logs بانتظام

❌ **لا تفعل:**
- لا تحذف `is_temporary_qr` من الجدول
- لا تعطل التنبيه
- لا توزع الباركود المؤقت لأحد غير المدير العام

---

## Troubleshooting

### مشكلة: التنبيه لا يظهر

```typescript
// تحقق من حالة الباركود
const { data } = await supabase.rpc('check_temporary_qr_status');
console.log(data);
```

**الحل:**
- تأكد من تطبيق migration
- تحقق من أن `is_temporary_qr = true`
- أعد تحميل الصفحة

### مشكلة: فشل الاستبدال

```sql
-- تحقق من الصلاحيات
SELECT * FROM platform_staff WHERE user_id = auth.uid();
```

**الحل:**
- تأكد من أن المستخدم لديه `is_temporary_qr = true`
- تحقق من database logs
- حاول مرة أخرى

### مشكلة: لا يمكن تحميل QR Code

**الحل:**
- الصورة تُولد من API خارجي: `https://api.qrserver.com`
- تحقق من الاتصال بالإنترنت
- انسخ Token واستخدم أي QR generator

---

## API Reference

### Frontend

```typescript
// التحقق من حالة الباركود المؤقت
const checkStatus = async () => {
  const { data, error } = await supabase
    .rpc('check_temporary_qr_status');
  return data;
};

// استبدال الباركود المؤقت
const replaceQR = async () => {
  const { data, error } = await supabase
    .rpc('replace_temporary_qr');
  return data;
};
```

### Backend

```sql
-- التحقق يدوياً
SELECT
  id,
  qr_token,
  is_temporary_qr,
  temporary_qr_created_at
FROM platform_staff
WHERE user_id = 'uuid';

-- استبدال يدوي (طوارئ فقط)
UPDATE platform_staff
SET
  qr_token = 'STAFF_new_token',
  is_temporary_qr = false,
  temporary_qr_created_at = NULL
WHERE user_id = 'uuid';
```

---

## التوسع المستقبلي

### أفكار للتطوير

1. **تاريخ انتهاء الباركود المؤقت:**
   - الباركود المؤقت ينتهي بعد 7 أيام
   - إجبار المدير على الاستبدال

2. **تذكيرات:**
   - إرسال notification بعد 24 ساعة
   - email reminder بعد 3 أيام

3. **Multi-factor:**
   - طلب رمز تحقق SMS عند الاستبدال
   - Biometric authentication للباركود الدائم

4. **Backup QR:**
   - توليد backup QR code تلقائياً
   - حفظه مشفر في قاعدة البيانات

---

## الخلاصة

نظام الباركود المؤقت يحل مشكلة الدخول الفوري للمدير العام بطريقة:

✅ **آمنة:**
- يتطلب PIN إلزامي
- يُسجل في Audit Logs
- يمكن استبداله بسهولة

✅ **سهلة:**
- زر واحد للاستبدال
- واجهة واضحة
- تعليمات مفصلة

✅ **فعالة:**
- جاهز للاستخدام فوراً
- لا حاجة لتدخل يدوي
- انتقال سلس للباركود الدائم

**الخطوات التالية للمدير العام:**

1. استلم بيانات الدخول من الفريق التقني
2. امسح الباركود المؤقت وادخل PIN
3. ادخل إلى /hq
4. اضغط "استبدال الباركود الآن"
5. احفظ الباركود الدائم في مكان آمن
6. غير PIN للأمان
7. ابدأ العمل!
