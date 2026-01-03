# دليل اختبار نظام الجلسات الإدارية
**التاريخ**: 2026-01-03

---

## 🎯 الاختبارات المطلوبة

### ✅ اختبار 1: تسجيل الدخول والثبات

**الخطوات:**
1. افتح `/admin/access`
2. امسح QR Code للمدير العام
3. أدخل PIN إذا لزم الأمر
4. انتقل إلى `/hq`
5. انتقل إلى الصفحة الرئيسية `/`
6. انقر على زر الدخول للإدارة مرة أخرى أو `/hq`

**النتيجة المتوقعة:**
- ✅ دخول مباشر بدون طلب QR مرة أخرى
- ✅ عرض معلومات المدير في الرأس

**كيفية التحقق:**
```javascript
// افتح Console في المتصفح
console.log(localStorage.getItem('platform_staff_session'));
// يجب أن تظهر بيانات الجلسة
```

---

### ✅ اختبار 2: تتبع النشاط

**الخطوات:**
1. سجل دخول كمدير
2. افتح Console في المتصفح
3. شغل هذا الكود:
```javascript
setInterval(() => {
  const session = JSON.parse(localStorage.getItem('platform_staff_session'));
  const now = Date.now();
  const idleTime = Math.floor((now - session.last_activity_at) / 1000);
  console.log('Idle Time:', idleTime, 'seconds');
}, 5000);
```
4. اترك الصفحة بدون نشاط لـ 30 ثانية
5. انقر في أي مكان
6. راقب Console

**النتيجة المتوقعة:**
- ✅ Idle Time يزيد تدريجياً عند عدم النشاط
- ✅ Idle Time يُعاد تعيينه لـ 0-5 ثواني عند أي نشاط

---

### ✅ اختبار 3: تحذير انتهاء الجلسة

**الخطوات:**
1. سجل دخول كمدير
2. في Console، قلل المدة الزمنية مؤقتاً للاختبار:
```javascript
// هذا للاختبار فقط - لا تستخدمه في الإنتاج!
const session = JSON.parse(localStorage.getItem('platform_staff_session'));
session.last_activity_at = Date.now() - (25 * 60 * 1000); // 25 دقيقة مضت
localStorage.setItem('platform_staff_session', JSON.stringify(session));
```
3. انتظر 10 ثواني
4. راقب الشاشة

**النتيجة المتوقعة:**
- ✅ ظهور تحذير برتقالي في الزاوية العلوية اليمنى
- ✅ رسالة "تحذير: الجلسة ستنتهي قريباً"
- ✅ عداد تنازلي يُظهر الدقائق المتبقية

---

### ✅ اختبار 4: انتهاء الجلسة تلقائياً

**الخطوات:**
1. سجل دخول كمدير
2. في Console، انتهي الجلسة للاختبار:
```javascript
// هذا للاختبار فقط!
const session = JSON.parse(localStorage.getItem('platform_staff_session'));
session.last_activity_at = Date.now() - (31 * 60 * 1000); // 31 دقيقة مضت
localStorage.setItem('platform_staff_session', JSON.stringify(session));
```
3. انتظر 10 ثواني
4. راقب التطبيق

**النتيجة المتوقعة:**
- ✅ إعادة توجيه تلقائية لـ `/admin/access`
- ✅ حذف الجلسة من localStorage
- ✅ طلب تسجيل دخول جديد

---

### ✅ اختبار 5: تسجيل الخروج الصريح

**الخطوات:**
1. سجل دخول كمدير
2. انقر على زر "تسجيل الخروج" أو "خروج"
3. أكد الخروج في النافذة المنبثقة
4. حاول الدخول لـ `/hq`

**النتيجة المتوقعة:**
- ✅ إعادة توجيه لـ `/admin/access`
- ✅ حذف الجلسة من localStorage
- ✅ طلب تسجيل دخول جديد

**كيفية التحقق:**
```javascript
// بعد تسجيل الخروج
console.log(localStorage.getItem('platform_staff_session'));
// يجب أن تكون النتيجة: null
```

---

### ✅ اختبار 6: الانتقال بين الأقسام

**الخطوات:**
1. سجل دخول كمدير
2. انتقل بين الصفحات التالية:
   - `/hq` (لوحة الإدارة)
   - `/admin/auctions` (إدارة المزادات)
   - `/admin/b2f` (إدارة المزارع)
   - `/` (الصفحة الرئيسية)
   - `/hq` مرة أخرى
3. في كل صفحة، تحقق من الـ Console

**النتيجة المتوقعة:**
- ✅ الجلسة موجودة في جميع الصفحات
- ✅ لا يُطلب تسجيل دخول مرة أخرى
- ✅ `last_activity_at` يتحدث تلقائياً

**كيفية التحقق:**
```javascript
// في كل صفحة
const session = JSON.parse(localStorage.getItem('platform_staff_session'));
console.log('Session exists:', !!session);
console.log('Staff Name:', session?.full_name);
console.log('Role:', session?.role);
```

---

### ✅ اختبار 7: فصل الجلسات (إداري/مستخدم)

**الخطوات:**
1. في نافذة متصفح عادية:
   - سجل دخول كمدير
   - افتح `/hq`
2. في نافذة Incognito:
   - سجل دخول كمستثمر عادي
   - افتح صفحة استثمار
3. ارجع للنافذة الأولى وحدث الصفحة

**النتيجة المتوقعة:**
- ✅ المدير لا يزال مُسجل الدخول
- ✅ لا تأثير لتسجيل دخول المستثمر على جلسة المدير
- ✅ كل جلسة مستقلة تماماً

---

## 🛠️ أدوات الاختبار

### 1. فحص الجلسة الحالية
```javascript
const session = JSON.parse(localStorage.getItem('platform_staff_session'));
console.table(session);
```

### 2. حساب الوقت المتبقي
```javascript
const session = JSON.parse(localStorage.getItem('platform_staff_session'));
const now = Date.now();
const idleTime = now - session.last_activity_at;
const remaining = (30 * 60 * 1000) - idleTime;
console.log('Remaining minutes:', Math.floor(remaining / 60000));
```

### 3. اختبار انتهاء الجلسة فوراً
```javascript
// للاختبار فقط!
const session = JSON.parse(localStorage.getItem('platform_staff_session'));
session.last_activity_at = Date.now() - (31 * 60 * 1000);
localStorage.setItem('platform_staff_session', JSON.stringify(session));
// انتظر 10 ثواني
```

### 4. اختبار التحذير
```javascript
// للاختبار فقط!
const session = JSON.parse(localStorage.getItem('platform_staff_session'));
session.last_activity_at = Date.now() - (26 * 60 * 1000);
localStorage.setItem('platform_staff_session', JSON.stringify(session));
// انتظر 10 ثواني
```

---

## 📊 جدول الاختبار

| # | الاختبار | الحالة | الملاحظات |
|---|---------|--------|-----------|
| 1 | ثبات الجلسة | ⏳ | يجب اختباره |
| 2 | تتبع النشاط | ⏳ | يجب اختباره |
| 3 | تحذير الانتهاء | ⏳ | يجب اختباره |
| 4 | انتهاء تلقائي | ⏳ | يجب اختباره |
| 5 | خروج صريح | ⏳ | يجب اختباره |
| 6 | انتقال بين الأقسام | ⏳ | يجب اختباره |
| 7 | فصل الجلسات | ⏳ | يجب اختباره |

---

## 🐛 مشاكل محتملة وحلولها

### المشكلة 1: الجلسة تنتهي بسرعة
**السبب المحتمل:** `IDLE_TIMEOUT_MS` قصير جداً
**الحل:**
```typescript
// في src/utils/adminSessionManager.ts
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 دقيقة
```

### المشكلة 2: Activity Tracking لا يعمل
**السبب المحتمل:** لم يتم استدعاء `initActivityTracking()`
**الحل:** تأكد من استدعائها في `SessionTracker`

### المشكلة 3: التحذير لا يظهر
**السبب المحتمل:** `SessionTracker` غير مضاف في الصفحة
**الحل:** أضف `<SessionTracker />` في جميع صفحات الإدارة

### المشكلة 4: الجلسة تُحذف عند الانتقال
**السبب المحتمل:** استخدام `localStorage.removeItem()` مباشرة
**الحل:** استخدم `adminSessionManager.destroySession()` دائماً

---

## ✅ معايير النجاح

النظام يُعتبر ناجحاً إذا:
- ✅ جميع الاختبارات السبعة تنجح
- ✅ لا يُطلب تسجيل دخول عند التنقل بين الصفحات
- ✅ الجلسة تنتهي بعد 30 دقيقة من عدم النشاط
- ✅ التحذير يظهر عند بقاء 5 دقائق
- ✅ تسجيل الخروج يعمل بشكل صحيح
- ✅ النشاط يُحدث الجلسة تلقائياً

---

## 📝 ملاحظات نهائية

1. **لا تختبر في بيئة الإنتاج**: استخدم بيئة التطوير أو Staging
2. **احفظ البيانات**: قبل الاختبار، احفظ أي بيانات مهمة
3. **استخدم Incognito**: للاختبارات المتعددة بدون تأثير بعضها على بعض
4. **راقب Console**: دائماً افتح Console للتحقق من الأخطاء
5. **وثق النتائج**: سجل نتيجة كل اختبار في الجدول أعلاه

---

**جاهز للاختبار!** 🧪
