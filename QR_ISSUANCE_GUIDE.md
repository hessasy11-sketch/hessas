# دليل نظام إصدار الباركود وإدارة الدخول

## نظرة عامة

نظام متكامل لإدارة دخول الموظفين عبر QR Code مع دعم:
- ✅ توليد باركود فريد لكل موظف
- ✅ إدارة PIN اختياري (4 أرقام)
- ✅ إيقاف/تفعيل الباركود فورياً (Kill Switch)
- ✅ طباعة بطاقات دخول رسمية
- ✅ دعم رفع صورة الباركود (للكمبيوتر)
- ✅ تسجيل الأجهزة المعروفة
- ✅ توجيه ذكي تلقائي بعد الدخول

---

## 1. إصدار الباركود من الإدارة العليا

### الموقع في المنصة

```
/hq → الهيكلة والصلاحيات → ملف الموظف → إدارة الباركود
```

### الوظائف المتاحة

#### 1.1 توليد باركود جديد

```typescript
// SQL Function
SELECT generate_staff_qr_token('staff_id_uuid');

// Returns
{
  "success": true,
  "qr_token": "unique_token_string",
  "generated_at": "2026-01-03T..."
}
```

**ملاحظات:**
- يُولَّد رمز فريد مُشفَّر
- الرمز لا ينتهي إلا بالإيقاف اليدوي
- يُحفظ في `platform_staff.qr_token`
- يُفعَّل تلقائياً (`qr_is_active = true`)

#### 1.2 إيقاف الباركود فوراً (Kill Switch)

```typescript
// SQL Function
SELECT toggle_staff_qr_status('staff_id_uuid', false);
```

**السيناريو:**
1. موظف يفقد بطاقته
2. Admin يضغط "إيقاف فوري"
3. الباركود يُعطَّل على الفور
4. أي محاولة دخول تُرفض بصمت
5. يُمكن إعادة التفعيل لاحقاً بدون توليد باركود جديد

#### 1.3 تعيين PIN (اختياري)

```typescript
// SQL Function
SELECT set_staff_pin('staff_id_uuid', '1234', true);
```

**متى يُستخدم PIN:**
- المدراء والمشرفون
- الأدوار الحساسة
- موظفو المالية
- موظفو العمليات

**ميزات PIN:**
- 4 أرقام فقط
- مُشفَّر باستخدام bcrypt
- 3 محاولات قبل القفل
- قفل 30 دقيقة بعد 3 محاولات فاشلة

#### 1.4 تغيير PIN

```typescript
// بدون تغيير الباركود
SELECT set_staff_pin('staff_id_uuid', '5678', true);
```

#### 1.5 إلغاء PIN

```typescript
SELECT remove_staff_pin('staff_id_uuid');
```

---

## 2. بطاقة الدخول الرسمية

### محتويات البطاقة

```
┌─────────────────────────────────┐
│  🛡️  بوابة الدخول الذكي       │
│     Platform Access System      │
├─────────────────────────────────┤
│                                 │
│      محمد أحمد السالم         │
│    مدير العمليات الزراعية     │
│         قسم B2F                │
│                                 │
│      ┌─────────────┐           │
│      │  QR CODE    │           │
│      │  [QR Image] │           │
│      │             │           │
│      └─────────────┘           │
│                                 │
│  ⚠️  يتطلب رمز PIN للدخول    │
│                                 │
│  تعليمات الاستخدام:           │
│  • امسح الباركود عند البوابة   │
│  • أدخل رمز PIN المخصص لك     │
│  • احتفظ بالبطاقة في مكان آمن │
│  • لا تشارك بطاقتك مع أحد     │
│                                 │
│  © 2026 Platform Security      │
└─────────────────────────────────┘
```

### طباعة البطاقة

1. Admin يختار الموظف
2. يضغط "طباعة البطاقة"
3. تظهر البطاقة بتصميم احترافي
4. جاهزة للطباعة مباشرة
5. يتم تسليمها للموظف

**ملاحظة:** الموظف مسؤول عن بطاقته

---

## 3. نظام الدخول بالباركود

### 3.1 الدخول من الموبايل

```
📱 الموبايل → يفتح /admin/access → مسح بالكاميرا فقط
```

**السيناريو:**
1. يفتح المتصفح
2. يدخل على `/admin/access`
3. يُمسح الباركود بالكاميرا
4. تحقق فوري
5. إذا يتطلب PIN → يُدخل PIN
6. توجيه تلقائي إلى لوحة التحكم

### 3.2 الدخول من الكمبيوتر

```
💻 الكمبيوتر → يفتح /admin/access → خيارين:
   1. مسح بالكاميرا
   2. رفع صورة الباركود
```

**رفع صورة الباركود:**

#### لماذا؟
- ليس كل كمبيوتر لديه كاميرا
- بعض الموظفين يعملون من المنزل
- يمكن حفظ صورة الباركود في الهاتف
- رفعها من الكمبيوتر للدخول

#### كيف يعمل؟
1. الموظف يختار "رفع صورة"
2. يختار صورة الباركود من جهازه
3. الصورة تُقرأ في الذاكرة فقط (لا تُحفظ)
4. يُستخرج الباركود من الصورة
5. تحقق مثل المسح العادي

#### تسجيل الأجهزة:
- عند أول دخول من كمبيوتر → يُسجَّل كـ "جهاز معروف"
- عند الدخول من كمبيوتر آخر → يُسجَّل "جهاز جديد" في السجل
- لا يُمنع الدخول تلقائياً
- المراقبة والتعطيل بيد الإدارة العليا فقط

---

## 4. جدول الأجهزة المعروفة

### الجدول: `staff_access_devices`

```sql
CREATE TABLE staff_access_devices (
  id uuid PRIMARY KEY,
  staff_id uuid REFERENCES platform_staff(id),
  device_fingerprint text,  -- بصمة الجهاز
  device_type text,  -- mobile/desktop/tablet
  device_info jsonb,  -- معلومات الجهاز
  access_method text,  -- camera_scan/image_upload
  first_access_at timestamptz,
  last_access_at timestamptz,
  access_count integer,
  is_trusted boolean
);
```

### الجدول: `staff_access_log`

```sql
CREATE TABLE staff_access_log (
  id uuid PRIMARY KEY,
  staff_id uuid,
  device_id uuid,
  device_fingerprint text,
  access_method text,
  is_new_device boolean,  -- 🔔 هل جهاز جديد؟
  requires_pin boolean,
  pin_verified boolean,
  success boolean,
  ip_address text,
  user_agent text,
  created_at timestamptz
);
```

---

## 5. الدوال المساعدة

### 5.1 تسجيل دخول من جهاز

```sql
SELECT register_device_access(
  p_staff_id => 'uuid',
  p_device_fingerprint => 'device_hash',
  p_device_type => 'desktop',
  p_device_info => '{"os": "Windows", "browser": "Chrome"}'::jsonb,
  p_access_method => 'image_upload',
  p_requires_pin => true,
  p_pin_verified => true
);

-- Returns
{
  "success": true,
  "is_new_device": false,
  "device_id": "uuid",
  "device_trusted": false,
  "access_count": 5
}
```

### 5.2 جلب أجهزة الموظف

```sql
SELECT * FROM get_staff_devices('staff_id_uuid');
```

### 5.3 تعيين جهاز كموثوق

```sql
SELECT trust_device('device_id_uuid', true);
```

### 5.4 إلغاء جهاز

```sql
SELECT revoke_device('device_id_uuid');
```

---

## 6. مسار التوجيه بعد الدخول

### Auto Routing Rules

| الدور | القسم | المسار |
|-------|-------|--------|
| `super_admin` | أي قسم | `/hq` |
| `b2f_admin` | `b2f` | `/admin/b2f` |
| `b2f_manager` | `b2f` | `/admin/b2f` |
| `farm_manager` | `b2f/operations` | `/admin/operations` |
| `farm_supervisor` | `b2f/operations` | `/admin/my-tasks` |
| `b2b_admin` | `b2b` | `/admin/b2b` |
| أي دور | `finance` | `/admin/finance2` |
| أي دور | `support` | `/admin/investor-services` |

---

## 7. الأمان

### 7.1 منع التلاعب

- AI Anti-Tampering في SmartQRScanner
- كشف الصور الثابتة
- كشف الشاشات
- تحليل جودة الصورة
- مراقبة السلوك المشبوه

### 7.2 التشفير

- QR Token: مُشفَّر وفريد
- PIN: bcrypt مع salt
- Device Fingerprint: hash آمن
- كل الاتصالات عبر HTTPS

### 7.3 الصلاحيات

```sql
-- فقط platform_staff يمكنهم الدخول
-- فقط الإدارة العليا يمكنها إصدار الباركود
-- فقط الإدارة العليا يمكنها إيقاف الباركود
-- كل دخول مُسجَّل في staff_access_log
```

### 7.4 RLS Policies

```sql
-- staff_access_devices
-- الموظف يرى أجهزته فقط
-- Admin يرى كل الأجهزة

-- staff_access_log
-- الموظف يرى سجله فقط
-- Admin يرى كل السجلات
```

---

## 8. سيناريوهات الاستخدام

### سيناريو 1: إضافة موظف جديد

```
1. Admin يدخل على /hq → الهيكلة والصلاحيات
2. يختار الموظف
3. يضغط "توليد باركود"
4. يقرر: هل يتطلب PIN؟
5. إذا نعم → يُعيِّن PIN (1234)
6. يضغط "طباعة البطاقة"
7. يُطبع البطاقة
8. يُسلِّمها للموظف
```

### سيناريو 2: موظف يفقد بطاقته

```
1. موظف يبلِّغ Admin
2. Admin يدخل على ملف الموظف
3. يضغط "إيقاف فوري" (Kill Switch)
4. الباركود يُعطَّل فوراً
5. Admin يُولِّد باركود جديد
6. يُطبع بطاقة جديدة
7. يُسلِّمها للموظف
```

### سيناريو 3: موظف ينسى PIN

```
1. موظف يُخطئ 3 مرات
2. الحساب يُقفل 30 دقيقة
3. Admin يُفتح القفل:
   SELECT reset_pin_attempts('staff_id');
4. Admin يُغيِّر PIN:
   SELECT set_staff_pin('staff_id', '5678', true);
5. موظف يُحاول مرة أخرى
```

### سيناريو 4: موظف يعمل من المنزل

```
1. موظف لديه كمبيوتر بدون كاميرا
2. يحفظ صورة الباركود في هاتفه
3. يُرسلها لنفسه عبر WhatsApp
4. يُحمِّلها على الكمبيوتر
5. يفتح /admin/access
6. يختار "رفع صورة"
7. يختار الصورة
8. يُقرأ الباركود
9. يُدخل PIN (إن وجد)
10. يُوجَّه تلقائياً إلى لوحة التحكم
```

### سيناريو 5: موظف يستخدم جهاز جديد

```
1. موظف يدخل من كمبيوتر جديد
2. النظام يُسجِّل "جهاز جديد"
3. يُضاف في staff_access_log مع is_new_device = true
4. Admin يُراجع السجل لاحقاً
5. إذا مشبوه → Admin يُوقف الباركود
```

---

## 9. الملفات المنفذة

### Database

1. **Migration**: `create_qr_access_devices_system.sql`
   - `staff_access_devices` table
   - `staff_access_log` table
   - `register_device_access()` function
   - `get_staff_devices()` function
   - `trust_device()` function
   - `revoke_device()` function

### Frontend Components

2. **AdminSmartAccessGateV2.tsx**
   - دعم رفع الصور للكمبيوتر
   - تسجيل الأجهزة تلقائياً
   - توجيه ذكي بعد الدخول

3. **ImageQRUploader.tsx**
   - مكون رفع صورة الباركود
   - قراءة QR من الصورة في الذاكرة
   - معالجة الأخطاء

4. **StaffQRManagement.tsx**
   - لوحة إدارة الباركود في HQ
   - توليد/إيقاف/تفعيل
   - إدارة PIN
   - طباعة البطاقة

5. **StaffAccessCard.tsx**
   - بطاقة دخول احترافية
   - جاهزة للطباعة
   - تحتوي على QR + معلومات الموظف

### Hooks

6. **useDeviceFingerprint.ts**
   - توليد بصمة الجهاز
   - كشف نوع الجهاز (mobile/desktop/tablet)
   - جمع معلومات الجهاز

7. **useQRVerification.ts (محدث)**
   - إضافة `registerDeviceAccess()`
   - دعم تسجيل الأجهزة

---

## 10. الاختبار

### اختبار توليد الباركود

```sql
-- 1. اختر موظف
SELECT * FROM platform_staff LIMIT 1;

-- 2. ولِّد باركود
SELECT generate_staff_qr_token('staff_id_uuid');

-- 3. تحقق
SELECT qr_token, qr_is_active FROM platform_staff WHERE id = 'staff_id_uuid';
```

### اختبار PIN

```sql
-- 1. عيِّن PIN
SELECT set_staff_pin('staff_id_uuid', '1234', true);

-- 2. تحقق
SELECT requires_pin FROM platform_staff WHERE id = 'staff_id_uuid';
-- Should return: true
```

### اختبار رفع الصورة

```
1. احفظ QR code كصورة
2. افتح /admin/access من كمبيوتر
3. اختر "رفع صورة"
4. ارفع الصورة
5. يجب أن يُقرأ الباركود
6. يجب أن يُسجَّل في staff_access_log
```

### اختبار الأجهزة

```sql
-- بعد الدخول من جهازين مختلفين
SELECT * FROM get_staff_devices('staff_id_uuid');
-- Should return 2 rows
```

---

## 11. Best Practices

### للإدارة

1. ✅ ولِّد باركود لكل موظف
2. ✅ عيِّن PIN للأدوار الحساسة
3. ✅ راجع staff_access_log يومياً
4. ✅ راقب is_new_device = true
5. ✅ وقِّف الباركود فوراً عند فقدان البطاقة

### للموظف

1. ✅ احتفظ بالبطاقة في مكان آمن
2. ✅ لا تشارك بطاقتك مع أحد
3. ✅ لا تُصوِّر الباركود وتنشره
4. ✅ بلِّغ Admin فوراً عند فقدان البطاقة
5. ✅ احفظ PIN في مكان آمن

---

## 12. الدعم والصيانة

### إذا كان هناك مشكلة

1. تحقق من `staff_access_log`
2. تحقق من `qr_is_active`
3. تحقق من `requires_pin` و `pin_locked_until`
4. راجع `staff_access_devices`

### Troubleshooting

```sql
-- موظف لا يستطيع الدخول
SELECT
  qr_token,
  qr_is_active,
  requires_pin,
  pin_locked_until
FROM platform_staff
WHERE id = 'staff_id_uuid';

-- آخر محاولات الدخول
SELECT * FROM staff_access_log
WHERE staff_id = 'staff_id_uuid'
ORDER BY created_at DESC
LIMIT 10;
```

---

## خلاصة

نظام متكامل وآمن لإدارة دخول الموظفين مع:
- ✅ QR Code فريد لكل موظف
- ✅ PIN اختياري مُشفَّر
- ✅ Kill Switch فوري
- ✅ بطاقات دخول احترافية
- ✅ دعم الموبايل والكمبيوتر
- ✅ رفع صورة الباركود
- ✅ تسجيل الأجهزة
- ✅ توجيه ذكي تلقائي
- ✅ AI Anti-Tampering
- ✅ Audit Log كامل

النظام جاهز للإنتاج ويعمل بكفاءة عالية!
