# دليل نظام الجلسات الشامل

## ✅ ما تم إنجازه

### 1. الجدول الرئيسي
- **platform_staff_sessions**: جدول لتتبع جميع جلسات تسجيل الدخول

### 2. الحقول الرئيسية
```sql
- id: معرف الجلسة
- staff_id: معرف الموظف
- session_token: رمز الجلسة الفريد
- login_method: طريقة تسجيل الدخول (qr, pin, qr_pin, password)
- is_active: حالة الجلسة (نشطة/منتهية)
- started_at: وقت بداية الجلسة
- last_activity_at: آخر نشاط
- ended_at: وقت انتهاء الجلسة
- landing_route: المسار الذي يتم التوجيه إليه
```

### 3. الدوال المتاحة

#### create_staff_session()
إنشاء جلسة جديدة للموظف
```sql
SELECT create_staff_session(
  staff_id,
  'qr',           -- طريقة الدخول
  '/hq',          -- المسار
  '{}'::jsonb,    -- معلومات الجهاز
  NULL,           -- IP
  NULL            -- User Agent
);
```

#### get_active_staff_session()
جلب الجلسة النشطة والتحقق من صلاحيتها
```sql
SELECT get_active_staff_session('session-token-here');
```

#### end_staff_session()
إنهاء جلسة موظف
```sql
SELECT end_staff_session('session-token-here');
```

#### cleanup_expired_sessions()
تنظيف الجلسات المنتهية (أكثر من 24 ساعة)
```sql
SELECT cleanup_expired_sessions();
```

### 4. التكامل مع QR و PIN

#### ✅ verify_qr_access
- عند التحقق من QR بنجاح وعدم الحاجة لـ PIN، يتم إنشاء جلسة تلقائياً
- يتم إرجاع `session_token` في النتيجة

#### ✅ verify_staff_pin
- عند التحقق من PIN بنجاح، يتم إنشاء جلسة تلقائياً
- يتم إرجاع `session_token` في النتيجة

## 🔒 الأمان

### RLS Policies
1. **الموظفون**: يمكنهم رؤية جلساتهم فقط
2. **الإداريون**: يمكنهم رؤية جميع الجلسات
3. **النظام**: يمكنه إنشاء وتحديث الجلسات

### انتهاء الصلاحية
- الجلسات تنتهي تلقائياً بعد 24 ساعة من آخر نشاط
- عند محاولة استخدام جلسة منتهية، يتم إنهاؤها تلقائياً

## 📊 تتبع الجلسات

### عرض الجلسات النشطة
```sql
SELECT
  s.id,
  s.session_token,
  p.full_name,
  p.role,
  s.login_method,
  s.started_at,
  s.last_activity_at,
  (now() - s.started_at) as duration
FROM platform_staff_sessions s
JOIN platform_staff p ON p.id = s.staff_id
WHERE s.is_active = true
ORDER BY s.started_at DESC;
```

### عرض تاريخ الجلسات
```sql
SELECT
  s.id,
  p.full_name,
  p.role,
  s.login_method,
  s.started_at,
  s.ended_at,
  (s.ended_at - s.started_at) as duration
FROM platform_staff_sessions s
JOIN platform_staff p ON p.id = s.staff_id
WHERE s.is_active = false
ORDER BY s.started_at DESC
LIMIT 50;
```

## 🔄 سير العمل

### 1. تسجيل الدخول عبر QR (بدون PIN)
```
QR Scan → verify_qr_access() → create_staff_session() → session_token
```

### 2. تسجيل الدخول عبر QR + PIN
```
QR Scan → verify_qr_access() → requires_pin = true
          ↓
User enters PIN → verify_staff_pin() → create_staff_session() → session_token
```

### 3. استخدام الجلسة
```
كل طلب → get_active_staff_session(token) → تحديث last_activity_at
```

### 4. تسجيل الخروج
```
Logout → end_staff_session(token) → is_active = false
```

## 📝 Audit Log

جميع عمليات الجلسات يتم تسجيلها في `platform_audit_logs`:
- إنشاء جلسة: action_type = 'login'
- إنهاء جلسة: action_type = 'logout'

## ⚙️ الصيانة

### تنظيف دوري
يُنصح بتشغيل دالة التنظيف بشكل دوري (مثلاً كل ساعة):
```sql
SELECT cleanup_expired_sessions();
```

### مراقبة الجلسات
```sql
-- عدد الجلسات النشطة
SELECT count(*) FROM platform_staff_sessions WHERE is_active = true;

-- متوسط مدة الجلسات
SELECT avg(ended_at - started_at) as avg_duration
FROM platform_staff_sessions
WHERE ended_at IS NOT NULL;
```

## ✅ الحالة الحالية

- ✅ الجدول موجود
- ✅ الدوال الأربع موجودة
- ✅ RLS مفعل
- ✅ التكامل مع QR
- ✅ التكامل مع PIN
- ✅ Audit Logging

## 🎯 الخطوة التالية

يجب التأكد من أن الواجهة الأمامية:
1. تحفظ `session_token` في localStorage أو sessionStorage
2. ترسل `session_token` مع كل طلب
3. تستدعي `get_active_staff_session()` للتحقق من الجلسة
4. تستدعي `end_staff_session()` عند تسجيل الخروج
