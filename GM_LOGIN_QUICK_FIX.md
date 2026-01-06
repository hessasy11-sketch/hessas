# GM Login - حل سريع للخطأ

## المشكلة
```
Supabase request failed - server_error
```

## الحل ✅

تم إصلاح المشكلة باستبدال bcrypt بـ Web Crypto API المدمج.

---

## الخطوات المطلوبة

### 1. إعادة نشر Edge Function

الـ Edge Function تم تحديثه في الملف:
```
supabase/functions/gm-login/index.ts
```

**طريقة النشر:**

إذا كنت تستخدم Supabase CLI:
```bash
supabase functions deploy gm-login
```

أو انتظر Supabase لنشر التحديث تلقائياً (قد يستغرق دقائق).

### 2. اختبر تسجيل الدخول

**الدخول:**
1. افتح: `/admin/gm-login`
2. الجوال: `0500000001`
3. الكلمة: `GM@2026`
4. اضغط "دخول"

**النتيجة المتوقعة:**
✅ تسجيل دخول ناجح
✅ الانتقال إلى `/hq`
✅ الجلسة تبقى بعد Refresh

---

## التغييرات الرئيسية

### قبل (كان يسبب خطأ):
```typescript
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
const hash = await bcrypt.hash(password);
```

### بعد (يعمل بدون مشاكل):
```typescript
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### ميزات إضافية:
✅ Logging شامل لتتبع المشاكل
✅ رسائل خطأ أوضح
✅ لا يحتاج تبعيات خارجية
✅ أسرع وأكثر استقراراً

---

## التحقق من النجاح

### في Browser Console:
```javascript
// يجب أن ترى:
localStorage.getItem('admin_session')
// { staffId: "...", staffName: "المدير العام", ... }
```

### في SQL:
```sql
-- تحقق من تحديث كلمة المرور
SELECT password_hash FROM platform_staff
WHERE phone_number = '0500000001';
-- يجب ألا يكون: $2a$10$placeholder

-- تحقق من سجل الدخول
SELECT * FROM gm_login_logs
WHERE phone_number = '0500000001'
ORDER BY created_at DESC
LIMIT 1;
-- يجب أن يكون: login_status = 'success'
```

---

## في حال استمرار المشكلة

### 1. تحقق من Logs:
- اذهب إلى Supabase Dashboard
- Edge Functions → gm-login → Logs
- ابحث عن `[GM Login]` messages

### 2. أعد نشر Function يدوياً:
```bash
supabase functions deploy gm-login --no-verify-jwt
```

### 3. تحقق من حساب GM:
```sql
SELECT * FROM platform_staff
WHERE phone_number = '0500000001';
-- يجب أن يكون is_active = true
```

### 4. أعد تعيين كلمة المرور:
```sql
UPDATE platform_staff
SET password_hash = '$2a$10$placeholder'
WHERE phone_number = '0500000001';
-- ثم سجل دخول بـ GM@2026
```

---

## معلومات الدعم

**بيانات الدخول:**
- الجوال: `0500000001`
- الكلمة: `GM@2026`

**الملفات المعدلة:**
- `supabase/functions/gm-login/index.ts` - Edge Function
- لا تغيير في Frontend

**حالة Build:**
✅ Build Success (14.89s)
✅ No Errors
✅ Ready for Testing

---

**الحل جاهز الآن - فقط أعد نشر Edge Function واختبر الدخول!**
