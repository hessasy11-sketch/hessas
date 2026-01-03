# نظام الباركود والصلاحيات - دليل شامل

**الإصدار:** 1.0.0
**التاريخ:** 3 يناير 2026
**الحالة:** ✅ معتمد للإنتاج

---

## نظرة عامة سريعة

نظام متكامل لإدارة دخول الموظفين إلى المنصة باستخدام QR Codes مع PIN اختياري حسب الصلاحية.

### الميزات الرئيسية

✅ **دخول آمن بالباركود** - QR Code لكل موظف
✅ **PIN اختياري** - حسب الدور والصلاحية
✅ **إدارة كاملة** - إصدار، إبطال، تجديد من /hq
✅ **توجيه ذكي** - تلقائياً حسب الدور والقسم
✅ **سجل تدقيق** - كل عملية مُسجلة ومؤرخة
✅ **باركود مؤقت للمدير العام** - حل انتقالي آمن

---

## البدء السريع

### للمدير العام (أول استخدام)

```
1. افتح ملف: GENERAL_MANAGER_TEMPORARY_QR.md
2. استخدم البيانات:
   - Phone: 0500000001
   - PIN: 123456
   - QR Token: موجود في الملف
3. امسح الباركود أو ارفع صورته
4. أدخل PIN
5. ستُوجه إلى /hq
6. اضغط "استبدال الباركود الآن" فوراً
7. احفظ الباركود الجديد في مكان آمن
```

### لإضافة موظف جديد

```
1. اذهب إلى /hq → الهيكلة والصلاحيات
2. اضغط "إضافة موظف"
3. أدخل البيانات:
   - رقم الهاتف
   - الاسم
   - الدور (Role)
   - القسم (Department)
   - المنصب
   - هل يتطلب PIN؟
4. اضغط "توليد QR و PIN"
5. احفظ الباركود وسلمه للموظف شخصياً
```

---

## البنية التقنية

### 1. قاعدة البيانات

#### الجداول الرئيسية

**`profiles`**
```sql
id                  uuid PRIMARY KEY
phone_number        text UNIQUE
display_name        text
user_type           text  -- 'general_manager', 'user', etc.
```

**`platform_staff`**
```sql
id                       uuid PRIMARY KEY
user_id                  uuid REFERENCES profiles(id)
role                     text  -- 'super_admin', 'manager', 'agent', etc.
department               text  -- 'HQ', 'B2F', 'Support', etc.
job_title                text
qr_token                 text UNIQUE
qr_is_active             boolean DEFAULT true
requires_pin             boolean DEFAULT false
pin_code                 text  -- bcrypt hashed
is_temporary_qr          boolean DEFAULT false  ← جديد
temporary_qr_created_at  timestamptz             ← جديد
```

#### الدوال الرئيسية

**`verify_qr_access(qr_token)`**
```sql
-- التحقق من صلاحية الباركود
-- إرجاع بيانات الموظف وتوجيه تلقائي
RETURNS jsonb {
  success: boolean,
  staff: { ... },
  redirect_to: string
}
```

**`verify_staff_pin(staff_id, pin)`**
```sql
-- التحقق من صحة PIN
-- تتبع المحاولات الفاشلة
RETURNS jsonb {
  success: boolean,
  message: string
}
```

**`replace_temporary_qr()`**
```sql
-- استبدال الباركود المؤقت بدائم
-- تسجيل في Audit Log
RETURNS jsonb {
  success: boolean,
  qr_token: string
}
```

**`check_temporary_qr_status()`**
```sql
-- التحقق من حالة الباركود المؤقت
RETURNS jsonb {
  has_temporary_qr: boolean,
  ...
}
```

### 2. الواجهة

#### المكونات الرئيسية

**`AdminSmartAccessGate`** - بوابة الدخول الذكية
```typescript
// يدعم 3 طرق للدخول:
1. QR Scanner - مسح مباشر
2. QR Upload - رفع صورة
3. Manual Entry - إدخال يدوي
```

**`TemporaryQRAlert`** - تنبيه الباركود المؤقت
```typescript
// يظهر تلقائياً في /hq للمدير العام
// يوفر زر استبدال فوري
// يعرض QR Code الجديد قابل للتحميل
```

**`OrgStructureView`** - الإدارة العليا
```typescript
// إدارة الموظفين
// توليد/إبطال الباركودات
// إدارة الأدوار والصلاحيات
```

### 3. Edge Functions

**`verify-qr-access`**
```typescript
// POST /functions/v1/verify-qr-access
// Body: { qr_token: string }
// Returns: QR verification result
```

**`verify-staff-pin`**
```typescript
// POST /functions/v1/verify-staff-pin
// Body: { staff_id: string, pin_code: string }
// Returns: PIN verification result
```

---

## تدفق العمل

### سيناريو 1: موظف بدون PIN

```
1. الموظف يمسح QR Code
   ↓
2. verify_qr_access(qr_token)
   ↓
3. success: true, requires_pin: false
   ↓
4. توجيه فوري إلى القسم المخصص
   ✅ دخول ناجح
```

### سيناريو 2: مشرف مع PIN

```
1. المشرف يمسح QR Code
   ↓
2. verify_qr_access(qr_token)
   ↓
3. success: true, requires_pin: true
   ↓
4. عرض شاشة إدخال PIN
   ↓
5. المشرف يدخل PIN
   ↓
6. verify_staff_pin(staff_id, pin)
   ↓
7. success: true
   ↓
8. توجيه إلى القسم المخصص
   ✅ دخول ناجح
```

### سيناريو 3: المدير العام (أول مرة)

```
1. المدير يمسح الباركود المؤقت
   ↓
2. verify_qr_access(temp_qr_token)
   ↓
3. success: true, is_temporary_qr: true
   ↓
4. توجيه إلى /hq
   ↓
5. يظهر TemporaryQRAlert تلقائياً
   ⚠️  "باركود مؤقت - يرجى استبداله"
   ↓
6. المدير يضغط "استبدال الباركود الآن"
   ↓
7. replace_temporary_qr()
   ↓
8. success: true, qr_token: "STAFF_new..."
   ↓
9. عرض QR Code جديد قابل للتحميل
   ↓
10. المدير يحفظ الباركود الجديد
   ✅ استبدال ناجح
```

---

## الأدوار والصلاحيات

### الأدوار المتاحة

| الدور | Department | Requires PIN | Redirect To |
|-------|-----------|--------------|-------------|
| `platform_owner` | HQ | ✅ | /hq |
| `super_admin` | HQ | ✅ | /hq |
| `manager` | B2F, B2B | ✅ | /b2f أو /companies |
| `supervisor` | B2F | ✅ | /b2f |
| `finance` | Finance | ✅ | /finance |
| `agent` | Support | ❌ | /dashboard |
| `operations` | B2F | ❌ | /b2f |
| `support` | Support | ❌ | /support |

### مصفوفة الصلاحيات

| العملية | Platform Owner | Super Admin | Manager | Supervisor | Agent |
|---------|---------------|-------------|---------|-----------|-------|
| إضافة موظف | ✅ | ✅ | ❌ | ❌ | ❌ |
| توليد QR | ✅ | ✅ | ❌ | ❌ | ❌ |
| إبطال QR | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| تعديل دور | ✅ | ✅ | ❌ | ❌ | ❌ |
| عرض Audit Logs | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| إدارة الأقسام | ✅ | ✅ | ❌ | ❌ | ❌ |

⚠️ = صلاحية محدودة (فقط لقسمه)

---

## الأمان

### 1. تشفير البيانات

```sql
-- QR Tokens
qr_token = encode(gen_random_bytes(32), 'base64')
-- Result: STAFF_xxxxx... (فريد ومشفر)

-- PIN Codes
pin_code = crypt(user_pin, gen_salt('bf'))
-- Result: bcrypt hash (لا يمكن فك التشفير)
```

### 2. Row Level Security (RLS)

```sql
-- الموظفون يمكنهم قراءة بياناتهم فقط
CREATE POLICY "staff_read_own_data"
  ON platform_staff FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin فقط يمكنه التعديل
CREATE POLICY "admin_modify_staff"
  ON platform_staff FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()));
```

### 3. Audit Logging

كل عملية حساسة مُسجلة:

```sql
INSERT INTO admin_operations_audit (
  admin_staff_id,      -- من قام بالعملية
  target_staff_id,     -- على من تمت العملية
  operation_type,      -- نوع العملية
  operation_details,   -- تفاصيل JSON
  created_at          -- التاريخ والوقت
);
```

أمثلة العمليات المُسجلة:
- `generate_qr` - توليد باركود
- `revoke_qr` - إبطال باركود
- `replace_temporary_qr` - استبدال مؤقت
- `modify_staff` - تعديل بيانات
- `change_pin` - تغيير PIN

### 4. PIN Security

```typescript
// تتبع المحاولات الفاشلة
pin_attempts: number   // عدد المحاولات الخاطئة

// قفل تلقائي بعد 5 محاولات
pin_locked_until: timestamptz  // قفل لمدة 15 دقيقة

// Reset عند نجاح
pin_attempts = 0
pin_locked_until = NULL
```

---

## الاختبارات

### نتائج الاختبار الشامل

```
✅ TEST 1: موظف بدون PIN → PASS
✅ TEST 2: مشرف مع PIN → PASS
✅ TEST 3: إبطال باركود → PASS
✅ TEST 4: تعطيل موظف → PASS
✅ TEST 5: المدير العام المؤقت → PASS

النتيجة: 5/5 (100%)
```

### لتشغيل الاختبارات يدوياً

```sql
-- تشغيل جميع الاختبارات
\i supabase/migrations/comprehensive_qr_system_test.sql

-- سترى نتائج مفصلة في console
```

---

## الملفات التوثيقية

### 1. للمستخدمين

```
📄 GENERAL_MANAGER_TEMPORARY_QR.md
   بيانات الدخول المؤقتة للمدير العام (سري)

📄 TEMPORARY_QR_GUIDE.md
   دليل شامل لنظام الباركود المؤقت
```

### 2. للمطورين

```
📄 COMPREHENSIVE_TEST_REPORT.md
   تقرير اختبار شامل مع جميع النتائج

📄 DELIVERY_CHECKLIST.md
   قائمة التسليم النهائية

📄 QR_SYSTEM_COMPLETE.md (هذا الملف)
   دليل شامل للنظام بالكامل
```

### 3. للإدارة

```
📄 ROOT_ACCESS_DOCUMENTATION.md
   توثيق صلاحيات الإدارة العليا

📄 AUDIT_LOGS_GUIDE.md
   دليل سجلات التدقيق

📄 QR_ISSUANCE_GUIDE.md
   دليل إصدار الباركودات
```

---

## API Reference

### Frontend (TypeScript)

```typescript
import { supabase } from './lib/supabase';

// التحقق من QR
const verifyQR = async (qrToken: string) => {
  const { data, error } = await supabase.rpc('verify_qr_access', {
    p_qr_token: qrToken
  });
  return data;
};

// التحقق من PIN
const verifyPIN = async (staffId: string, pin: string) => {
  const { data, error } = await supabase.rpc('verify_staff_pin', {
    p_staff_id: staffId,
    p_pin_code: pin
  });
  return data;
};

// استبدال الباركود المؤقت
const replaceTemporaryQR = async () => {
  const { data, error } = await supabase.rpc('replace_temporary_qr');
  return data;
};

// التحقق من حالة الباركود المؤقت
const checkTemporaryQR = async () => {
  const { data, error } = await supabase.rpc('check_temporary_qr_status');
  return data;
};
```

### Backend (SQL)

```sql
-- التحقق يدوياً من قاعدة البيانات
SELECT * FROM platform_staff
WHERE qr_token = 'STAFF_xxx...';

-- توليد باركود جديد يدوياً (طوارئ فقط)
UPDATE platform_staff
SET
  qr_token = 'STAFF_new_token...',
  qr_generated_at = now()
WHERE id = 'staff_uuid';

-- إبطال باركود
UPDATE platform_staff
SET qr_is_active = false
WHERE id = 'staff_uuid';

-- إعادة تعيين PIN
UPDATE platform_staff
SET
  pin_code = crypt('new_pin', gen_salt('bf')),
  pin_attempts = 0,
  pin_locked_until = NULL
WHERE id = 'staff_uuid';
```

---

## Troubleshooting

### مشكلة: الباركود لا يعمل

```
الأسباب المحتملة:
❌ qr_is_active = false → أعد تفعيل الباركود
❌ is_active = false → أعد تفعيل الموظف
❌ الباركود منتهي → ولد باركود جديد
❌ القسم مفقود → أضف department للموظف

الحل:
SELECT * FROM platform_staff WHERE qr_token = 'xxx';
-- تحقق من الحقول أعلاه
```

### مشكلة: PIN خاطئ دائماً

```
الأسباب المحتملة:
❌ PIN مقفل بعد 5 محاولات
❌ PIN غير مُعين
❌ database hash غير صحيح

الحل:
-- تحقق من القفل
SELECT pin_locked_until FROM platform_staff WHERE id = 'xxx';

-- إعادة تعيين
UPDATE platform_staff SET
  pin_code = crypt('123456', gen_salt('bf')),
  pin_attempts = 0,
  pin_locked_until = NULL
WHERE id = 'xxx';
```

### مشكلة: التنبيه لا يظهر للمدير العام

```
الأسباب المحتملة:
❌ is_temporary_qr = false
❌ TemporaryQRAlert غير مُضاف للصفحة
❌ المستخدم ليس المدير العام

الحل:
-- تحقق من الحالة
SELECT is_temporary_qr FROM platform_staff
WHERE role = 'super_admin';

-- إعادة تعيين (إذا لزم الأمر)
UPDATE platform_staff SET is_temporary_qr = true
WHERE role = 'super_admin';
```

---

## الخلاصة

### ما تم إنجازه

```
✅ نظام QR متكامل وآمن
✅ PIN اختياري ومشفر
✅ إدارة كاملة من /hq
✅ توجيه ذكي وتلقائي
✅ Audit logs شامل
✅ باركود مؤقت للمدير العام
✅ اختبار شامل (5/5 نجح)
✅ توثيق كامل
✅ صفر أخطاء معروفة
```

### الحالة النهائية

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              ✅ النظام جاهز للإنتاج 100%                 ║
║                                                           ║
║   جميع المكونات تعمل بشكل صحيح                          ║
║   جميع الاختبارات نجحت بدون أخطاء                       ║
║   التوثيق شامل وكامل                                    ║
║   يمكن البدء بالاستخدام فوراً                          ║
║                                                           ║
║   تاريخ الإصدار: 3 يناير 2026                           ║
║   الإصدار: 1.0.0                                         ║
║   الحالة: معتمد ✅                                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## الدعم والتواصل

### للمدير العام

راجع ملف: `GENERAL_MANAGER_TEMPORARY_QR.md`

### للفريق التقني

راجع ملفات:
- `COMPREHENSIVE_TEST_REPORT.md`
- `DELIVERY_CHECKLIST.md`
- `TEMPORARY_QR_GUIDE.md`

### للإدارة

راجع ملفات:
- `ROOT_ACCESS_DOCUMENTATION.md`
- `AUDIT_LOGS_GUIDE.md`
- `QR_ISSUANCE_GUIDE.md`

---

**تم بحمد الله**

**الفريق التقني - 3 يناير 2026**
