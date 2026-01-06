# 🛡️ اختبار Route Guards
## Route Guards Testing Guide

---

## ✅ ما تم تنفيذه

تم تطبيق **Route Guards** على جميع مسارات `/admin/*` حسب قَسْمَة البطاقات:

### التحديثات:
1. ✅ تحديث `gatewayRoutes.ts` مع البطاقات الجديدة والأدوار
2. ✅ تحديث `GatewayGuard.tsx` ليستخدم staff_session
3. ✅ إضافة دالة `isRouteAllowedForRole()` للتحقق المباشر من الدور
4. ✅ GM Bypass دائماً نشط
5. ✅ رسائل console واضحة للتتبع

---

## 🧪 سيناريوهات الاختبار الإجبارية

### السيناريو 1: موظف B2F

**الدور:** `b2f_assistant`

**الاختبار:**

```bash
# 1. سجل دخول كـ b2f_assistant من /admin/gateway
# 2. انقر على بطاقة "B2F Operations Room"
# 3. تحقق أنك في: /admin/operations-room/b2f
# التوقع: ✅ الدخول ناجح

# 4. اكتب في المتصفح يدوياً: /admin/operations-room/b2b
# التوقع: ❌ إعادة توجيه إلى /admin/gateway?error=access_denied

# 5. اكتب في المتصفح يدوياً: /admin/my-work
# التوقع: ✅ الدخول ناجح (متاح للجميع)

# 6. اكتب في المتصفح يدوياً: /admin/finance
# التوقع: ❌ إعادة توجيه إلى /admin/gateway?error=access_denied
```

**Console Logs المتوقعة:**

```javascript
// عند محاولة /admin/operations-room/b2f
✅ ACCESS GRANTED: {
  role: 'b2f_assistant',
  path: '/admin/operations-room/b2f'
}

// عند محاولة /admin/operations-room/b2b
🚫 ACCESS DENIED: {
  role: 'b2f_assistant',
  path: '/admin/operations-room/b2b',
  reason: 'Route not allowed for this role'
}

// عند محاولة /admin/my-work
✅ ACCESS GRANTED: {
  role: 'b2f_assistant',
  path: '/admin/my-work'
}
```

---

### السيناريو 2: محاسب

**الدور:** `accountant`

**الاختبار:**

```bash
# 1. سجل دخول كـ accountant من /admin/gateway
# 2. انقر على بطاقة "المالية"
# 3. تحقق أنك في: /admin/finance
# التوقع: ✅ الدخول ناجح

# 4. اكتب في المتصفح يدوياً: /admin/b2f/farm-command
# التوقع: ❌ إعادة توجيه إلى /admin/gateway?error=access_denied

# 5. اكتب في المتصفح يدوياً: /admin/settings
# التوقع: ❌ إعادة توجيه إلى /admin/gateway?error=access_denied

# 6. اكتب في المتصفح يدوياً: /admin/my-work
# التوقع: ✅ الدخول ناجح (متاح للجميع)
```

**Console Logs المتوقعة:**

```javascript
// عند محاولة /admin/finance
✅ ACCESS GRANTED: {
  role: 'accountant',
  path: '/admin/finance'
}

// عند محاولة /admin/b2f/farm-command
🚫 ACCESS DENIED: {
  role: 'accountant',
  path: '/admin/b2f/farm-command',
  reason: 'Route not allowed for this role'
}
```

---

### السيناريو 3: المدير العام (GM)

**الدور:** `general_manager`

**الاختبار:**

```bash
# 1. سجل دخول كـ general_manager من /admin/gateway
# 2. يجب أن ترى جميع البطاقات الـ 11

# 3. اكتب أي مسار يدوياً:
/admin/operations-room/global ✅
/admin/operations-room/b2f ✅
/admin/operations-room/b2b ✅
/admin/b2f/farm-command ✅
/admin/finance ✅
/admin/marketing ✅
/admin/settings ✅
/admin/settings/staff ✅
/admin/my-work ✅

# جميع المسارات يجب أن تعمل بدون منع
```

**Console Logs المتوقعة:**

```javascript
// عند أي مسار
✅ GM BYPASS - Full access granted
```

---

### السيناريو 4: بدون Session

**الاختبار:**

```bash
# 1. افتح متصفح Incognito أو امسح localStorage
# 2. اكتب في المتصفح: /admin/operations-room/b2f
# التوقع: ❌ إعادة توجيه إلى /admin/gateway?error=no_session

# 3. اكتب في المتصفح: /admin/my-work
# التوقع: ❌ إعادة توجيه إلى /admin/gateway?error=no_session

# 4. اكتب في المتصفح: /admin/settings
# التوقع: ❌ إعادة توجيه إلى /admin/gateway?error=no_session
```

**Console Logs المتوقعة:**

```javascript
🚫 NO SESSION - Redirecting to gateway
```

---

### السيناريو 5: مدير مزرعة

**الدور:** `farm_manager`

**الاختبار:**

```bash
# 1. سجل دخول كـ farm_manager من /admin/gateway
# 2. يجب أن ترى بطاقة "لوحة المزرعة" + "عملي اليوم"

# 3. اكتب في المتصفح: /admin/b2f/farms
# التوقع: ✅ الدخول ناجح

# 4. اكتب في المتصفح: /admin/b2f/farm-command
# التوقع: ❌ إعادة توجيه (ليس ضمن صلاحيات farm_manager)

# 5. اكتب في المتصفح: /admin/operations-room/b2f
# التوقع: ❌ إعادة توجيه (ليس ضمن صلاحيات farm_manager)
```

---

### السيناريو 6: موظف تسويق

**الدور:** `marketing_staff`

**الاختبار:**

```bash
# 1. سجل دخول كـ marketing_staff من /admin/gateway
# 2. يجب أن ترى بطاقة "التسويق" + "عملي اليوم"

# 3. اكتب في المتصفح: /admin/marketing
# التوقع: ✅ الدخول ناجح

# 4. اكتب في المتصفح: /admin/finance
# التوقع: ❌ إعادة توجيه

# 5. اكتب في المتصفح: /admin/b2f/farm-command
# التوقع: ❌ إعادة توجيه
```

---

## 🔍 كيفية متابعة الـ Console

افتح Chrome DevTools (F12) → Console

ستظهر لك رسائل واضحة عند كل محاولة وصول:

```javascript
// ✅ نجاح
✅ ACCESS GRANTED: { role: 'b2f_assistant', path: '/admin/operations-room/b2f' }

// ❌ فشل
🚫 ACCESS DENIED: { role: 'b2f_assistant', path: '/admin/operations-room/b2b', reason: 'Route not allowed for this role' }

// GM Bypass
✅ GM BYPASS - Full access granted

// لا توجد جلسة
🚫 NO SESSION - Redirecting to gateway
```

---

## 📋 جدول المسارات والأدوار

| المسار | GM | B2F Assistant | B2B Assistant | Accountant | Marketing Staff | Farm Manager |
|--------|:--:|:-------------:|:-------------:|:----------:|:---------------:|:------------:|
| `/admin/operations-room/global` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/operations-room/b2f` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/admin/operations-room/b2b` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/admin/b2f/farm-command` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/b2f/farms` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/admin/my-work` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/admin/finance` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/admin/marketing` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/admin/settings` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/settings/staff` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🛠️ استكشاف الأخطاء

### المشكلة: "Cannot read property 'role' of undefined"

**السبب:** staff_session غير موجود في localStorage

**الحل:**
```javascript
// تحقق من الـ session
console.log(localStorage.getItem('staff_session'));

// إذا كان null، سجل دخول من /admin/gateway
```

---

### المشكلة: "دائماً يعيد توجيهي إلى /admin/gateway"

**السبب:** الـ Guard لا يجد session أو الدور غير صحيح

**الحل:**
```javascript
// 1. تحقق من الـ session
const session = JSON.parse(localStorage.getItem('staff_session'));
console.log('Session:', session);

// 2. تحقق من الدور
console.log('Role:', session.role);

// 3. تحقق من المسار المطلوب
console.log('Current path:', window.location.pathname);

// 4. تحقق من التحقق من الصلاحية
import { isRouteAllowedForRole } from './utils/gatewayRoutes';
console.log('Has Access:', isRouteAllowedForRole(window.location.pathname, session.role));
```

---

### المشكلة: "GM لا يستطيع الدخول"

**السبب:** الدور ليس 'general_manager' بالضبط

**الحل:**
```javascript
// تحقق من الدور
const session = JSON.parse(localStorage.getItem('staff_session'));
console.log('Role:', session.role);
console.log('Is GM:', session.role === 'general_manager');

// يجب أن يكون بالضبط: 'general_manager'
// وليس: 'General_Manager' أو 'generalManager' أو أي شيء آخر
```

---

## 📊 معايير النجاح

✅ **يعتبر الاختبار ناجحاً إذا:**

1. GM يدخل جميع المسارات بدون منع
2. B2F Assistant يدخل فقط مسارات B2F + my_work
3. Accountant يدخل فقط مسارات Finance + my_work
4. أي دور آخر يدخل فقط المسارات المصرح له بها
5. بدون session → إعادة توجيه فورية
6. محاولة الوصول اليدوي لمسار ممنوع → إعادة توجيه
7. Console logs واضحة ومفيدة

---

## 🎯 الخطوة التالية

بعد نجاح جميع الاختبارات أعلاه، يمكنك الانتقال إلى:

### 1. Permission Checks داخل الأقسام

```typescript
// مثال: داخل B2FOperationsRoom
const { hasPermission } = useRolePermissions();

{hasPermission('approve_investment') && (
  <button onClick={handleApprove}>اعتماد الطلب</button>
)}
```

### 2. Audit Logs لتتبع محاولات الوصول

```sql
CREATE TABLE gateway_access_logs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  route_path text NOT NULL,
  access_granted boolean NOT NULL,
  user_role text,
  reason text,
  created_at timestamptz DEFAULT now()
);
```

### 3. Real-time Guards

تحديث الـ Guards عند تغيير الدور أو الصلاحيات بدون الحاجة لتسجيل خروج/دخول.

---

**تم التنفيذ:** ✅
**التاريخ:** 2026-01-06
**الإصدار:** 1.0

**الملفات المعدلة:**
- `src/utils/gatewayRoutes.ts` - تحديث القَسْمَة
- `src/components/guards/GatewayGuard.tsx` - تحديث المنطق
- `src/guards/AdminRouteGuard.tsx` - Guard بديل (optional)
