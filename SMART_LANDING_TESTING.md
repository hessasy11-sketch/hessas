# 🧪 Smart Landing - دليل الاختبار
## Smart Landing Testing Guide

---

## 🎯 الهدف من الاختبار

التأكد من أن:
1. GM يذهب تلقائياً إلى غرفة القيادة
2. الموظفين يذهبون تلقائياً إلى "عملي اليوم"
3. زر "بوابة الإدارة" يعمل من جميع الصفحات
4. Route Guards تحمي المسارات

---

## ⚡ اختبار سريع (5 دقائق)

### اختبار 1: GM Landing

```bash
# 1. سجل دخول كـ GM من /admin/gateway
   Role: general_manager

# 2. بعد الدخول مباشرة، تحقق:
   → تم التوجيه تلقائياً إلى: /admin/operations-room/global ✅
   → ترى لوحة المؤشرات العليا ✅
   → زر "بوابة الإدارة" موجود في أعلى اليمين ✅

# 3. افتح Console (F12):
   🎯 SMART LANDING - Role: general_manager
   👑 GM detected - Navigating to Command Room
   ✅ GM BYPASS - Full access granted

# 4. انقر على زر "بوابة الإدارة":
   → يرجع إلى /admin/gateway ✅
   → ترى جميع البطاقات (11 بطاقة) ✅
```

**النتيجة المتوقعة:** نجاح ✅

---

### اختبار 2: B2F Assistant Landing

```bash
# 1. سجل دخول كـ B2F Assistant من /admin/gateway
   Role: b2f_assistant

# 2. بعد الدخول مباشرة، تحقق:
   → تم التوجيه تلقائياً إلى: /admin/my-work ✅
   → ترى صفحة "عملي اليوم" ✅
   → زر "بوابة الإدارة" موجود في أعلى اليمين ✅

# 3. افتح Console (F12):
   🎯 SMART LANDING - Role: b2f_assistant
   👤 Staff detected - Navigating to My Work
   ✅ ACCESS GRANTED: { role: 'b2f_assistant', path: '/admin/my-work' }

# 4. انقر على زر "بوابة الإدارة":
   → يرجع إلى /admin/gateway ✅
   → ترى بطاقتين فقط:
      - B2F Operations Room ✅
      - عملي اليوم ✅
```

**النتيجة المتوقعة:** نجاح ✅

---

### اختبار 3: Accountant Landing

```bash
# 1. سجل دخول كـ Accountant من /admin/gateway
   Role: accountant

# 2. بعد الدخول مباشرة، تحقق:
   → تم التوجيه تلقائياً إلى: /admin/my-work ✅
   → ترى صفحة "عملي اليوم" ✅

# 3. انقر على زر "بوابة الإدارة":
   → يرجع إلى /admin/gateway ✅
   → ترى بطاقتين فقط:
      - المالية ✅
      - عملي اليوم ✅

# 4. من البوابة، انقر على "المالية":
   → يدخل إلى /admin/finance ✅
   → زر "بوابة الإدارة" موجود ✅

# 5. من صفحة المالية، انقر على زر "بوابة الإدارة":
   → يرجع إلى /admin/gateway ✅
```

**النتيجة المتوقعة:** نجاح ✅

---

## 🔍 اختبار شامل (15 دقيقة)

### السيناريو 1: GM Full Journey

```bash
1. افتح /admin/gateway
2. سجل دخول كـ GM (general_manager)
3. تحقق من التوجيه التلقائي → /admin/operations-room/global
4. افتح Console وتحقق من Logs
5. انقر على زر "بوابة الإدارة"
6. تحقق أنك في /admin/gateway
7. انقر على بطاقة "B2F Operations Room"
8. تحقق أنك في /admin/operations-room/b2f
9. انقر على زر "بوابة الإدارة"
10. انقر على بطاقة "B2B Auctions Room"
11. تحقق أنك في /admin/operations-room/b2b
12. انقر على زر "بوابة الإدارة"
13. انقر على بطاقة "قيادة المزارع"
14. تحقق أنك في /admin/b2f/farm-command
15. انقر على زر "بوابة الإدارة"
```

**كل الخطوات يجب أن تعمل بدون أخطاء** ✅

---

### السيناريو 2: B2F Staff Journey

```bash
1. افتح /admin/gateway
2. سجل دخول كـ B2F Assistant (b2f_assistant)
3. تحقق من التوجيه التلقائي → /admin/my-work
4. افتح Console وتحقق من Logs
5. انقر على زر "بوابة الإدارة"
6. تحقق أنك ترى بطاقتين فقط
7. انقر على بطاقة "B2F Operations Room"
8. تحقق أنك في /admin/operations-room/b2f
9. زر "بوابة الإدارة" موجود
10. انقر على زر "بوابة الإدارة"

# محاولة وصول غير مصرح:
11. في شريط العنوان، اكتب يدوياً: /admin/operations-room/b2b
12. تحقق أنك رجعت إلى /admin/gateway?error=access_denied
13. ترى رسالة خطأ: "تم رفض الوصول"
14. Console يظهر: 🚫 ACCESS DENIED
```

**التوقع:**
- ✅ البطاقات المصرح بها تعمل
- ❌ المسارات غير المصرح بها ممنوعة

---

### السيناريو 3: Finance Staff Journey

```bash
1. افتح /admin/gateway
2. سجل دخول كـ Accountant (accountant)
3. تحقق من التوجيه التلقائي → /admin/my-work
4. انقر على زر "بوابة الإدارة"
5. تحقق أنك ترى بطاقتين فقط:
   - المالية
   - عملي اليوم
6. انقر على بطاقة "المالية"
7. تحقق أنك في /admin/finance
8. زر "بوابة الإدارة" موجود

# محاولة وصول غير مصرح:
9. في شريط العنوان، اكتب يدوياً: /admin/b2f/farm-command
10. تحقق أنك رجعت إلى /admin/gateway?error=access_denied
11. Console يظهر: 🚫 ACCESS DENIED
```

**التوقع:** نفس النتيجة كـ B2F Staff

---

## 🎨 اختبار الزر "بوابة الإدارة"

تأكد من وجود الزر في هذه الصفحات:

```bash
# غرف العمليات:
/admin/operations-room/global
→ ابحث عن زر ذهبي في أعلى اليمين ✅

/admin/operations-room/b2f
→ ابحث عن زر ذهبي في أعلى اليمين ✅

/admin/operations-room/b2b
→ ابحث عن زر ذهبي في أعلى اليمين ✅

# الأقسام:
/admin/b2f/farm-command
→ ابحث عن زر ذهبي في أعلى اليمين ✅

/admin/finance
→ ابحث عن زر ذهبي في أعلى اليمين ✅

/admin/marketing
→ ابحث عن زر ذهبي في أعلى اليمين ✅

/admin/partners
→ ابحث عن زر ذهبي في أعلى اليمين ✅

# صفحات إضافية:
/admin/my-work
→ ابحث عن زر ذهبي في أعلى اليمين ✅

/admin/settings/staff
→ ابحث عن زر ذهبي في أعلى اليمين ✅
```

**كل الصفحات يجب أن تحتوي على الزر** ✅

---

## 📊 جدول النتائج

| الاختبار | GM | B2F Assistant | Accountant | النتيجة |
|----------|:--:|:-------------:|:----------:|:-------:|
| التوجيه التلقائي | `/admin/operations-room/global` | `/admin/my-work` | `/admin/my-work` | ✅ |
| Console Logs | 👑 GM detected | 👤 Staff detected | 👤 Staff detected | ✅ |
| زر البوابة موجود | ✅ | ✅ | ✅ | ✅ |
| زر البوابة يعمل | ✅ | ✅ | ✅ | ✅ |
| عدد البطاقات | 11 | 2 | 2 | ✅ |
| منع الوصول غير المصرح | - | ✅ | ✅ | ✅ |

---

## 🐛 مشاكل محتملة وحلولها

### المشكلة 1: "لا يتم التوجيه تلقائياً"

**الحل:**
```javascript
// 1. افتح Console
// 2. ابحث عن رسالة: 🎯 SMART LANDING
// 3. إذا لم تظهر، تحقق من localStorage:
localStorage.getItem('staff_session')
// يجب أن يحتوي على role صحيح
```

---

### المشكلة 2: "يتم التوجيه ثم يرجع للبوابة"

**الحل:**
```javascript
// 1. افتح Console
// 2. ابحث عن رسالة: 🚫 ACCESS DENIED
// 3. تحقق من القَسْمَة في gatewayRoutes.ts
// 4. تأكد أن الدور في allowed_roles
```

---

### المشكلة 3: "زر البوابة لا يظهر"

**الحل:**
```bash
# 1. تحقق من import في أعلى الملف:
import BackToGatewayButton from './BackToGatewayButton';

# 2. تحقق من وجوده في return:
<BackToGatewayButton />

# 3. إذا غير موجود، أضفه
```

---

### المشكلة 4: "البطاقات لا تظهر في البوابة"

**الحل:**
```javascript
// 1. افتح Console في صفحة البوابة
// 2. ابحث عن: Cards Count
// 3. إذا كان 0، تحقق من جدول gateway_cards في DB
// 4. تأكد أن staff_id موجود في الجدول
```

---

## ✅ قائمة التحقق النهائية

قبل إنهاء الاختبار، تأكد من:

- [ ] GM يذهب تلقائياً إلى `/admin/operations-room/global`
- [ ] B2F Assistant يذهب تلقائياً إلى `/admin/my-work`
- [ ] Accountant يذهب تلقائياً إلى `/admin/my-work`
- [ ] زر "بوابة الإدارة" موجود في ExecutivePulse
- [ ] زر "بوابة الإدارة" موجود في B2FOperationsRoom
- [ ] زر "بوابة الإدارة" موجود في B2BAuctionsOpsRoom
- [ ] زر "بوابة الإدارة" موجود في FarmCommandCenter
- [ ] زر "بوابة الإدارة" موجود في FinanceSection
- [ ] زر "بوابة الإدارة" موجود في MarketingSection
- [ ] زر "بوابة الإدارة" موجود في PartnersSection
- [ ] زر "بوابة الإدارة" يعمل ويرجع إلى `/admin/gateway`
- [ ] Console Logs واضحة ومفيدة
- [ ] Route Guards تمنع الوصول غير المصرح
- [ ] GM له Bypass كامل
- [ ] الموظفين يرون بطاقاتهم فقط

---

## 🎯 النتيجة النهائية

إذا نجحت جميع الاختبارات أعلاه:

```
✅ Smart Landing نشط وجاهز
✅ Route Guards تحمي المسارات
✅ زر البوابة موجود في كل مكان
✅ تجربة المستخدم ممتازة

النظام جاهز للإنتاج! 🚀
```

---

**تاريخ الإنشاء:** 2026-01-06
**الإصدار:** 1.0
**الوضع:** جاهز للاختبار

ابدأ الاختبار الآن! 🧪
