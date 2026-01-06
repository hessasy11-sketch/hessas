# البدء السريع - النظام المبسط

## 🚀 خطوات التشغيل

### 1. ابدأ السيرفر
```bash
npm run dev
```

### 2. افتح المتصفح
```
http://localhost:5173/login
```

### 3. سجل دخول

#### مدير المزارع (كل شيء)
```
الجوال: 0500000000
كلمة المرور: 123456
```

#### مدير مزرعة (مزرعة واحدة)
```
الجوال: 0500000002
كلمة المرور: 123456
```

---

## 🎯 المسارات الرئيسية

| المسار | الوصف |
|--------|-------|
| `/login` | تسجيل الدخول |
| `/admin/farms-manager-dashboard` | لوحة مدير المزارع |
| `/admin/farm-manager-dashboard` | لوحة مدير المزرعة |
| `/admin/b2f` | نظام استثمار الأشجار |

---

## ✅ ما تم عمله

1. ✅ صفحة تسجيل دخول مبسطة
2. ✅ دورين فقط (farms_manager + farm_manager)
3. ✅ لوحتين تحكم منفصلتين
4. ✅ جلسة بسيطة في localStorage
5. ✅ RLS مفتوحة (لا طرد)
6. ✅ توجيه تلقائي حسب الدور
7. ✅ قاعدة بيانات مُحدّثة

---

## 🗑️ ما تم إزالته

1. ❌ Decision Queue
2. ❌ Delegation Matrix
3. ❌ Operations Rooms
4. ❌ Crown Gateway
5. ❌ QR Scanner
6. ❌ PIN System
7. ❌ 20+ أدوار معقدة
8. ❌ Guards معقدة

---

## 🔍 الفحص السريع

### تحقق من تسجيل الدخول
```javascript
// افتح Console
localStorage.getItem('simplified_session')
```

يجب أن ترى:
```json
{
  "staffId": "uuid",
  "staffName": "محمد العتيبي",
  "role": "farms_manager",
  "loginAt": "..."
}
```

### تحقق من القاعدة
```sql
-- في Supabase SQL Editor
SELECT phone, full_name, role, password_hash
FROM platform_staff
WHERE is_active = true;
```

---

## 💡 نصائح

### 1. تغيير كلمة المرور
```sql
UPDATE platform_staff
SET password_hash = 'new_password'
WHERE phone = '0500000000';
```

### 2. إضافة مدير مزرعة جديد
```sql
-- الخطوة 1: أضف الموظف
INSERT INTO platform_staff (
  staff_code, full_name, phone, role, is_active, password_hash
) VALUES (
  'FM003', 'سعد الغامدي', '0500000003', 'farm_manager', true, '123456'
);

-- الخطوة 2: اربطه بمزرعة
INSERT INTO farm_team_members (
  farm_id, staff_id, role, is_active
) VALUES (
  'farm-uuid', 'staff-uuid', 'farm_manager', true
);
```

### 3. تسجيل الخروج
```javascript
localStorage.removeItem('simplified_session');
window.location.href = '/login';
```

---

## 🐛 استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| صفحة بيضاء | افحص Console للأخطاء |
| لا يمكن الدخول | تحقق من الجوال وكلمة المرور |
| Redirect خاطئ | امسح localStorage وسجل دخول مرة أخرى |
| البيانات لا تظهر | تحقق من Network Tab في Developer Tools |

---

## 📝 ملاحظات مهمة

1. **كلمات المرور بسيطة**: (123456) للتجربة فقط
2. **RLS مفتوحة**: لا قيود على الوصول للبيانات
3. **الجلسة في localStorage**: لا تنتهي إلا بالخروج اليدوي
4. **لا guards معقدة**: الحماية بسيطة فقط

---

## 🎉 كل شيء جاهز!

النظام **بسيط** و**مباشر** و**يعمل**.

لا تعقيدات، لا طرد، لا مشاكل.

**ابدأ الآن**: `npm run dev` ثم افتح `/login`
