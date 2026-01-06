# بيانات الدخول - النظام المبسط

## 🔐 حسابات التجربة

### 1. مدير المزارع (صاحب المنصة)
```
الدور: farms_manager
الجوال: 0500000000
كلمة المرور: 123456
الوصول: كل شيء في المنصة
```

**يدخل على**: `/admin/farms-manager-dashboard`

**يرى**:
- جميع المزارع
- جميع المستثمرين
- جميع العقود
- جميع الطلبات
- جميع الإحصائيات

---

### 2. مدير المزرعة
```
الدور: farm_manager
الجوال: 0500000002
كلمة المرور: 123456
الوصول: مزرعته فقط
```

**يدخل على**: `/admin/farm-manager-dashboard`

**يرى**:
- معلومات مزرعته
- فريق عمله
- المهام والمصروفات
- الأشجار والإنتاج

---

## 📱 صفحة تسجيل الدخول

### المسار
```
http://localhost:5173/login
```

### الحقول
1. رقم الجوال (05xxxxxxxx)
2. كلمة المرور

### التوجيه التلقائي
```
farms_manager → /admin/farms-manager-dashboard
farm_manager → /admin/farm-manager-dashboard
```

---

## 🗄️ قاعدة البيانات

### الجدول: `platform_staff`

```sql
-- عرض الحسابات النشطة
SELECT
  phone,
  full_name,
  role,
  password_hash,
  is_active
FROM platform_staff
WHERE is_active = true
  AND role IN ('farms_manager', 'farm_manager');
```

### دالة تسجيل الدخول

```sql
-- الاستدعاء
SELECT simplified_login('0500000000', '123456');

-- النتيجة
{
  "staff_id": "uuid",
  "full_name": "محمد العتيبي - مدير المزارع",
  "role": "farms_manager"
}
```

---

## 🔧 إدارة الحسابات

### إنشاء حساب جديد

```sql
-- مدير مزارع جديد
INSERT INTO platform_staff (
  staff_code,
  full_name,
  phone,
  role,
  department,
  is_active,
  password_hash
) VALUES (
  'FM003',
  'سعد الغامدي - مدير المزارع',
  '0500000003',
  'farms_manager',
  'management',
  true,
  '123456'
);

-- مدير مزرعة جديد
INSERT INTO platform_staff (
  staff_code,
  full_name,
  phone,
  role,
  department,
  is_active,
  password_hash
) VALUES (
  'FMG003',
  'خالد العنزي - مدير المزرعة',
  '0500000004',
  'farm_manager',
  'operations',
  true,
  '123456'
);

-- ربط مدير المزرعة بمزرعة
INSERT INTO farm_team_members (
  farm_id,
  staff_id,
  role,
  is_active
) VALUES (
  'farm-uuid-here',
  (SELECT id FROM platform_staff WHERE phone = '0500000004'),
  'farm_manager',
  true
);
```

### تغيير كلمة المرور

```sql
UPDATE platform_staff
SET password_hash = 'new_password'
WHERE phone = '0500000000';
```

### تعطيل حساب

```sql
UPDATE platform_staff
SET is_active = false
WHERE phone = '0500000000';
```

### تفعيل حساب

```sql
UPDATE platform_staff
SET is_active = true
WHERE phone = '0500000000';
```

---

## 🔒 ملاحظات الأمان

### كلمات المرور
- حالياً: نص عادي (`123456`)
- للإنتاج: استخدم bcrypt أو pgcrypto

### الجلسات
- التخزين: localStorage
- المفتاح: `simplified_session`
- المدة: لا تنتهي إلا بتسجيل الخروج

### RLS
- حالياً: مفتوحة للجميع (`true`)
- للإنتاج: يمكن تشديد الصلاحيات

---

## 🧪 الاختبار

### تسجيل دخول ناجح

```javascript
// 1. افتح /login
// 2. أدخل: 0500000000 / 123456
// 3. تحقق من localStorage
localStorage.getItem('simplified_session')

// يجب أن ترى:
{
  "staffId": "uuid",
  "staffName": "محمد العتيبي - مدير المزارع",
  "role": "farms_manager",
  "loginAt": "2026-01-06T..."
}

// 4. تحقق من الـ URL
// يجب أن تكون: /admin/farms-manager-dashboard
```

### تسجيل خروج

```javascript
// في Console
localStorage.removeItem('simplified_session');
window.location.href = '/login';
```

---

## 📊 الأدوار والصلاحيات

| الدور | الوصول | الصلاحيات |
|-------|--------|-----------|
| `farms_manager` | كل شيء | قراءة وكتابة كل شيء |
| `farm_manager` | مزرعة واحدة | قراءة وكتابة مزرعته فقط |

---

## 🚀 البدء السريع

```bash
# 1. شغل السيرفر
npm run dev

# 2. افتح المتصفح
http://localhost:5173/login

# 3. جرب الحسابين
- مدير المزارع: 0500000000 / 123456
- مدير المزرعة: 0500000002 / 123456
```

---

**تنبيه**: هذه بيانات تجريبية. للإنتاج، غير كلمات المرور وشدد الأمان.

**تاريخ الإنشاء**: 2026-01-06
