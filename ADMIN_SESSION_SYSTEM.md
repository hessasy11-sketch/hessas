# نظام الجلسات الإدارية الثابتة
**التاريخ**: 2026-01-03
**الحالة**: ✅ مكتمل ومُختبر

---

## 🎯 الهدف من النظام

إنشاء نظام جلسات إدارية ثابتة يحافظ على تسجيل دخول المدراء حتى عند التنقل بين الصفحات، ولا ينتهي إلا بـ:
1. تسجيل خروج صريح
2. انقضاء 30 دقيقة من عدم النشاط

---

## 📋 المتطلبات المحققة

### ✅ 1. جلسة إدارية طويلة نسبياً
- تخزين الجلسة في `localStorage`
- معلومات الجلسة:
  - `staff_id`: معرف الموظف
  - `user_id`: معرف المستخدم
  - `full_name`: الاسم الكامل
  - `role`: الدور (platform_owner, super_admin, general_manager)
  - `role_title`: المسمى الوظيفي
  - `department`: القسم
  - `is_super_admin`: هل مدير عام
  - `is_platform_owner`: هل مالك المنصة
  - `created_at`: تاريخ إنشاء الجلسة
  - `last_activity_at`: آخر نشاط

### ✅ 2. عدم تدمير الجلسة عند الانتقال
- الجلسة لا تُحذف عند زيارة:
  - `/` (الصفحة الرئيسية)
  - أي صفحة عامة
  - صفحات المستخدمين
- الجلسة الإدارية **مستقلة تماماً** عن جلسة المستخدمين

### ✅ 3. إعادة استخدام الجلسة عند العودة
- عند العودة لـ `/hq` أو `/admin/*`:
  - التحقق من وجود جلسة صالحة
  - إذا وُجدت: دخول مباشر بدون QR/PIN
  - إذا انتهت: توجيه لـ `/admin/access`

### ✅ 4. مهلة انتهاء الجلسة (30 دقيقة)
- استخدام `Idle Timeout` وليس وقت ثابت
- تحديث `last_activity_at` عند:
  - Click
  - Keyboard Input
  - Scroll
  - Mouse Movement
  - Touch (للأجهزة اللوحية)
- التحقق كل 10 ثواني من صلاحية الجلسة

### ✅ 5. Logout صريح فقط ينهي الجلسة
- زر "تسجيل الخروج" واضح في:
  - HQDashboard
  - PlatformCommandCenter
  - جميع صفحات الإدارة
- عند الضغط:
  - حذف الجلسة من `localStorage`
  - إعادة التوجيه لـ `/admin/access`

### ✅ 6. فصل الجلسة الإدارية عن جلسة المستخدم
- Admin Session **مستقلة تماماً**
- لا تتأثر بـ:
  - تسجيل دخول المستثمر
  - تسجيل خروج المستخدم العام
  - زيارة الواجهة الرئيسية

---

## 🗂️ الملفات المُنشأة / المُعدلة

### 1. الملفات الجديدة

#### `src/utils/adminSessionManager.ts`
نظام إدارة الجلسات الإدارية:
- **createSession()**: إنشاء جلسة جديدة
- **getSession()**: جلب الجلسة الحالية
- **isSessionExpired()**: التحقق من انتهاء الجلسة
- **updateActivity()**: تحديث وقت آخر نشاط
- **destroySession()**: حذف الجلسة
- **isAuthenticated()**: التحقق من تسجيل الدخول
- **getRole()**: جلب دور المستخدم
- **isSuperAdmin()**: هل مدير عام
- **isPlatformOwner()**: هل مالك المنصة
- **getRemainingTime()**: الوقت المتبقي بالميلي ثانية
- **getRemainingMinutes()**: الوقت المتبقي بالدقائق
- **initActivityTracking()**: تهيئة تتبع النشاط

#### `src/components/platform/SessionTracker.tsx`
مُراقب الجلسة:
- عرض تحذير عند بقاء 5 دقائق أو أقل
- إنهاء الجلسة تلقائياً عند انتهاء الوقت
- تحديث العداد التنازلي كل 10 ثواني

### 2. الملفات المُعدلة

#### `src/components/platform/AdminSmartAccessGateV3.tsx`
- إضافة `import { adminSessionManager }`
- استخدام `adminSessionManager.createSession()` بدلاً من `localStorage`
- التحقق من وجود جلسة صالحة عند تحميل الصفحة
- إعادة التوجيه لـ `/hq` إذا كان المدير مُسجل الدخول

#### `src/components/platform/HQDashboard.tsx`
- إضافة `import { SessionTracker }`
- إضافة `import { adminSessionManager }`
- استخدام `adminSessionManager.getSession()` للتحقق من الجلسة
- استخدام `adminSessionManager.destroySession()` عند تسجيل الخروج
- إضافة `<SessionTracker />` في الـ JSX

#### `src/components/platform/PlatformCommandCenter.tsx`
- إضافة `import { SessionTracker }`
- إضافة `import { adminSessionManager }`
- استخدام `adminSessionManager.getSession()` للتحقق من الجلسة
- استخدام `adminSessionManager.destroySession()` عند تسجيل الخروج
- إضافة `<SessionTracker />` في الـ JSX

---

## 🔄 آلية العمل

### 1. تسجيل الدخول (QR/PIN)
```
المستخدم → QR Scan/PIN Entry
    ↓
التحقق من الصلاحيات
    ↓
adminSessionManager.createSession({
  staff_id, user_id, full_name,
  role, role_title, department,
  is_super_admin, is_platform_owner
})
    ↓
حفظ في localStorage
    ↓
تفعيل Activity Tracking
    ↓
توجيه لـ /hq
```

### 2. تتبع النشاط
```
Event (click, scroll, keydown, etc.)
    ↓
Throttle (5 ثواني)
    ↓
adminSessionManager.updateActivity()
    ↓
تحديث last_activity_at
```

### 3. التحقق من الجلسة (كل 10 ثواني)
```
SessionTracker → checkInterval
    ↓
getRemainingMinutes()
    ↓
minutes <= 0? → destroySession() → navigate('/admin/access')
    ↓
minutes <= 5? → show warning
    ↓
minutes > 5? → hide warning
```

### 4. الانتقال بين الصفحات
```
المدير في /hq → ينتقل لـ /
    ↓
الجلسة باقية في localStorage
    ↓
المدير يعود لـ /hq
    ↓
adminSessionManager.getSession()
    ↓
جلسة صالحة؟ → دخول مباشر ✅
    ↓
جلسة منتهية؟ → /admin/access ❌
```

### 5. تسجيل الخروج
```
المدير يضغط "تسجيل الخروج"
    ↓
confirm()
    ↓
adminSessionManager.destroySession()
    ↓
حذف من localStorage
    ↓
navigate('/admin/access')
```

---

## 🧪 اختبارات التسليم

### ✅ اختبار 1: الجلسة الثابتة
```
1. دخول المدير العام عبر QR
2. الدخول إلى /hq
3. الانتقال إلى /
4. الرجوع إلى /hq
➡️ النتيجة: دخول مباشر بدون طلب QR ✅
```

### ✅ اختبار 2: Idle Timeout
```
1. دخول المدير العام عبر QR
2. عدم النشاط لمدة 31 دقيقة
3. محاولة الدخول لـ /hq
➡️ النتيجة: يُطلب تسجيل دخول جديد ✅
```

### ✅ اختبار 3: Logout صريح
```
1. دخول المدير العام عبر QR
2. الضغط على "تسجيل الخروج"
3. محاولة الدخول لـ /hq
➡️ النتيجة: يُطلب تسجيل دخول جديد ✅
```

### ✅ اختبار 4: Activity Tracking
```
1. دخول المدير العام عبر QR
2. عدم النشاط لـ 25 دقيقة
3. Click على الصفحة
4. الانتظار 25 دقيقة أخرى
➡️ النتيجة: الجلسة باقية (تم تحديث last_activity_at) ✅
```

### ✅ اختبار 5: تحذير انتهاء الجلسة
```
1. دخول المدير العام عبر QR
2. عدم النشاط لـ 25 دقيقة
➡️ النتيجة: ظهور تحذير "5 دقائق متبقية" ✅
```

### ✅ اختبار 6: الانتقال بين الأقسام
```
1. دخول المدير العام عبر QR
2. الانتقال بين:
   - /hq
   - /admin/auctions
   - /admin/b2f
   - /
   - /hq مرة أخرى
➡️ النتيجة: الجلسة باقية في جميع الحالات ✅
```

---

## 📊 التحسينات المُطبقة

### 1. الأداء
- Throttling لتحديثات النشاط (5 ثواني)
- Passive Event Listeners
- التحقق من الجلسة كل 10 ثواني (وليس كل ثانية)

### 2. الأمان
- الجلسة مُشفرة في localStorage
- التحقق من صلاحية الجلسة عند كل طلب
- فصل تام بين جلسات الإدارة والمستخدمين

### 3. تجربة المستخدم
- تحذير قبل 5 دقائق من انتهاء الجلسة
- رسالة تأكيد عند تسجيل الخروج
- دخول سلس بدون طلب QR المتكرر

---

## 🔮 التحسينات المستقبلية المقترحة

### 1. Session Refresh Token
- إضافة نظام Refresh Token
- تجديد الجلسة تلقائياً عند الاقتراب من الانتهاء

### 2. Multi-Device Session Management
- عرض الأجهزة المُسجل دخولها
- إمكانية تسجيل الخروج من جهاز معين
- حد أقصى للأجهزة النشطة

### 3. Session Analytics
- تسجيل أوقات الدخول والخروج
- تتبع نشاط المدراء
- تقارير الجلسات الإدارية

### 4. Enhanced Security
- Two-Factor Authentication (2FA) optional
- IP Whitelisting للمدراء
- Geo-Location Verification

---

## 📝 ملاحظات مهمة

### ⚠️ نقاط حرجة
1. **لا تُعدل** `IDLE_TIMEOUT_MS` بدون تنسيق (حالياً 30 دقيقة)
2. **لا تُعدل** `UPDATE_THROTTLE` بدون تنسيق (حالياً 5 ثواني)
3. **لا تستخدم** `localStorage.removeItem('platform_staff_session')` مباشرة
   - استخدم `adminSessionManager.destroySession()` دائماً

### ✅ أفضل الممارسات
1. دائماً استخدم `adminSessionManager` للتعامل مع الجلسات
2. أضف `<SessionTracker />` في جميع صفحات الإدارة
3. استخدم `adminSessionManager.getSession()` للتحقق من الجلسة
4. لا تعتمد على `localStorage` مباشرة

---

## 🎉 الخلاصة

تم بنجاح تطبيق نظام الجلسات الإدارية الثابتة الذي:
- ✅ يحافظ على تسجيل دخول المدراء
- ✅ لا ينتهي عند التنقل بين الصفحات
- ✅ ينتهي فقط بتسجيل خروج صريح أو 30 دقيقة عدم نشاط
- ✅ منفصل تماماً عن جلسات المستخدمين
- ✅ يعرض تحذيرات قبل انتهاء الجلسة
- ✅ يتتبع النشاط بكفاءة

**النظام جاهز للإنتاج والاستخدام!** 🚀
