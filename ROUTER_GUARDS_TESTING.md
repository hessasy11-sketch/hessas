# Router Guards - دليل الاختبار السريع 🧪

## اختبارات سريعة للتحقق من عمل Guards

---

## 1️⃣ اختبار SessionGuard

### اختبار 1: بدون session
```bash
# الخطوات
1. افتح DevTools Console
2. احذف session:
   localStorage.removeItem('platform_staff_session')
3. حاول الوصول إلى:
   /admin/operations-room

# النتيجة المتوقعة
❌ SessionGuard: No session found
→ Redirect to "/"
→ رسالة: "يجب تسجيل الدخول للوصول إلى هذه الصفحة"
```

### اختبار 2: مع session صالحة
```bash
# الخطوات
1. امسح QR code صحيح
2. تأكد من نجاح تسجيل الدخول
3. حاول الوصول إلى:
   /admin/operations-room

# النتيجة المتوقعة
✅ SessionGuard: Session valid
→ عرض الصفحة بنجاح
```

### اختبار 3: session منتهية
```bash
# الخطوات
1. في DevTools Console:
   const session = JSON.parse(localStorage.getItem('platform_staff_session'));
   session.last_activity_at = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
   localStorage.setItem('platform_staff_session', JSON.stringify(session));
2. حاول الوصول إلى:
   /admin/operations-room

# النتيجة المتوقعة
⏱️ Session expired - clearing
→ Redirect to "/"
```

---

## 2️⃣ اختبار DepartmentGuard

### اختبار 1: موظف B2F يحاول دخول B2B
```bash
# Setup
Staff: { department: 'b2f' }

# الخطوات
1. سجل دخول كموظف B2F
2. حاول الوصول إلى:
   /admin/auctions  (B2B only)

# النتيجة المتوقعة
✅ SessionGuard: Pass
❌ DepartmentGuard: Department mismatch
   Expected: ['b2b', 'B2B', 'مزادات']
   Actual: 'b2f'
→ Redirect to "/admin"
→ رسالة: "ليس لديك صلاحية الوصول إلى هذا القسم"
```

### اختبار 2: موظف B2B يحاول دخول B2F
```bash
# Setup
Staff: { department: 'b2b' }

# الخطوات
1. سجل دخول كموظف B2B
2. حاول الوصول إلى:
   /admin/b2f  (B2F only)

# النتيجة المتوقعة
✅ SessionGuard: Pass
❌ DepartmentGuard: Department mismatch
   Expected: ['b2f', 'B2F', 'مزارع']
   Actual: 'b2b'
→ Redirect to "/admin"
```

### اختبار 3: موظف B2F يدخل صفحة B2F
```bash
# Setup
Staff: { department: 'b2f' }

# الخطوات
1. سجل دخول كموظف B2F
2. حاول الوصول إلى:
   /admin/b2f  (B2F only)

# النتيجة المتوقعة
✅ SessionGuard: Pass
✅ DepartmentGuard: Access granted (Department match)
→ عرض الصفحة
```

### اختبار 4: Super Admin يدخل أي قسم
```bash
# Setup
Staff: { role: 'super_admin', is_super_admin: true }

# الخطوات
1. سجل دخول كـ Super Admin
2. حاول الوصول إلى:
   /admin/b2f      → ✅
   /admin/auctions → ✅

# النتيجة المتوقعة
✅ SessionGuard: Pass
✅ DepartmentGuard: Access granted (Super Admin/Owner)
→ عرض الصفحة (كل الأقسام)
```

---

## 3️⃣ اختبار FarmScopeGuard

### اختبار 1: مدير مزرعة يحاول دخول مزرعة أخرى
```bash
# Setup
Staff: { staff_id: '456', department: 'b2f' }
Farm Team: [{ farm_id: 'farm-1', staff_id: '456', role: 'farm_manager' }]

# الخطوات
1. سجل دخول كمدير مزرعة #1
2. حاول الوصول إلى:
   /admin/b2f/farm-command/farms/farm-2

# النتيجة المتوقعة
✅ SessionGuard: Pass
✅ DepartmentGuard: Pass
❌ FarmScopeGuard: No farm membership found
   Query: b2f_farm_team WHERE farm_id='farm-2' AND staff_id='456'
   Result: NULL
→ Redirect to "/admin/b2f/farm-command"
→ رسالة: "ليس لديك صلاحية الوصول إلى هذه المزرعة"
```

### اختبار 2: مدير مزرعة يدخل مزرعته
```bash
# Setup
Staff: { staff_id: '789', department: 'b2f' }
Farm Team: [{ farm_id: 'farm-3', staff_id: '789', role: 'farm_manager' }]

# الخطوات
1. سجل دخول كمدير مزرعة #3
2. حاول الوصول إلى:
   /admin/b2f/farm-command/farms/farm-3

# النتيجة المتوقعة
✅ SessionGuard: Pass
✅ DepartmentGuard: Pass
✅ FarmScopeGuard: Access granted
   Query: b2f_farm_team WHERE farm_id='farm-3' AND staff_id='789'
   Result: { id: 'xxx', role: 'farm_manager' }
   Action: adminSessionManager.setCurrentFarm('farm-3')
→ عرض الصفحة
```

### اختبار 3: Super Admin يدخل أي مزرعة
```bash
# Setup
Staff: { role: 'super_admin', is_super_admin: true }

# الخطوات
1. سجل دخول كـ Super Admin
2. حاول الوصول إلى:
   /admin/b2f/farm-command/farms/any-farm-id

# النتيجة المتوقعة
✅ SessionGuard: Pass
✅ DepartmentGuard: Pass (Super Admin)
✅ FarmScopeGuard: Access granted (Super Admin bypass)
→ عرض الصفحة
→ لا يتحقق من b2f_farm_team
```

---

## 4️⃣ اختبار Nested Guards (تدريج الحماية)

### اختبار 1: كل المستويات تنجح
```bash
# Setup
Staff: { staff_id: '123', department: 'b2f' }
Farm Team: [{ farm_id: 'farm-1', staff_id: '123', role: 'supervisor' }]

# المسار
/admin/b2f/farm-command/farms/farm-1

# التدريج
1. SessionGuard → ✅ Pass (session exists)
2. DepartmentGuard → ✅ Pass (b2f matches)
3. FarmScopeGuard → ✅ Pass (membership found)

# النتيجة
→ عرض الصفحة
```

### اختبار 2: فشل في المستوى الأول
```bash
# Setup
No session

# المسار
/admin/b2f/farm-command/farms/farm-1

# التدريج
1. SessionGuard → ❌ FAIL (no session)
→ Redirect to "/"
→ DepartmentGuard لا يتم فحصه
→ FarmScopeGuard لا يتم فحصه
```

### اختبار 3: فشل في المستوى الثاني
```bash
# Setup
Staff: { staff_id: '456', department: 'b2b' }

# المسار
/admin/b2f/farm-command/farms/farm-1

# التدريج
1. SessionGuard → ✅ Pass
2. DepartmentGuard → ❌ FAIL (b2b ≠ b2f)
→ Redirect to "/admin"
→ FarmScopeGuard لا يتم فحصه
```

### اختبار 4: فشل في المستوى الثالث
```bash
# Setup
Staff: { staff_id: '789', department: 'b2f' }
Farm Team: [] (no memberships)

# المسار
/admin/b2f/farm-command/farms/farm-1

# التدريج
1. SessionGuard → ✅ Pass
2. DepartmentGuard → ✅ Pass
3. FarmScopeGuard → ❌ FAIL (no membership)
→ Redirect to "/admin/b2f/farm-command"
```

---

## 5️⃣ اختبار Console Logs

### ما يجب أن تراه في Console

#### عند النجاح الكامل
```javascript
🔐 SessionGuard: Checking session for: /admin/b2f/farm-command/farms/farm-1
✅ SessionGuard: Local session exists
✅ SessionGuard: Session valid
   - Staff ID: 123
   - Role: farm_manager
   - Department: b2f
✅ SessionGuard: Access granted

🏢 DepartmentGuard: Checking access for: /admin/b2f/farm-command/farms/farm-1
   Allowed departments: ['b2f', 'B2F', 'مزارع']
   User department: b2f
   User role: farm_manager
✅ DepartmentGuard: Access granted (Department match)
✅ DepartmentGuard: Access granted

🌾 FarmScopeGuard: Checking farm access
   Route: /admin/b2f/farm-command/farms/farm-1
   Target Farm ID: farm-1
   Staff ID: 123
✅ FarmScopeGuard: Access granted
   Membership ID: xxx
   Farm Role: farm_manager
✅ FarmScopeGuard: Rendering protected content
```

#### عند الفشل
```javascript
🔐 SessionGuard: Checking session for: /admin/operations-room
❌ SessionGuard: No local session found
🚫 SessionGuard: Access denied - no valid session
   Redirecting to: /
```

---

## 6️⃣ اختبار الـ Redirect State

### التحقق من معلومات Redirect

```typescript
// في الصفحة المعاد التوجيه إليها
import { useLocation } from 'react-router-dom';

const location = useLocation();

// عرض رسالة الخطأ
if (location.state?.reason === 'session_required') {
  console.log('Message:', location.state.message);
  // "يجب تسجيل الدخول للوصول إلى هذه الصفحة"
}

if (location.state?.reason === 'department_mismatch') {
  console.log('User Dept:', location.state.userDepartment);
  console.log('Required:', location.state.requiredDepartments);
  console.log('Message:', location.state.message);
  // "ليس لديك صلاحية الوصول إلى هذا القسم"
}

if (location.state?.reason === 'farm_access_denied') {
  console.log('Farm ID:', location.state.farmId);
  console.log('Message:', location.state.message);
  // "ليس لديك صلاحية الوصول إلى هذه المزرعة"
}
```

---

## 7️⃣ اختبار Performance

### Loading States

```bash
# يجب أن ترى Loading spinner لمدة قصيرة (<1 ثانية)
1. SessionGuard: "جاري التحقق من الجلسة..."
2. DepartmentGuard: "جاري التحقق من الصلاحيات..."
3. FarmScopeGuard: "جاري التحقق من صلاحية الوصول للمزرعة..."
```

### Database Queries

```bash
# عدد الـ queries المتوقع
SessionGuard:
  - 1 query to platform_staff_sessions (restore session)

DepartmentGuard:
  - 0 queries (يستخدم session data فقط)

FarmScopeGuard:
  - 1 query to b2f_farm_team (check membership)

# Total: 2 queries max للمسار المحمي بالكامل
```

---

## 8️⃣ اختبار Edge Cases

### Case 1: URL manipulation
```bash
# المحاولة
تغيير farmId في URL يدوياً
/admin/b2f/farm-command/farms/farm-1
→ /admin/b2f/farm-command/farms/farm-999

# النتيجة
FarmScopeGuard يعيد التحقق من كل farm_id جديد
إذا لا توجد membership → Redirect
```

### Case 2: Session expired mid-navigation
```bash
# المحاولة
session valid → navigate → session expires → navigate

# النتيجة
SessionGuard يتحقق في كل navigation
إذا expired → Redirect to "/"
```

### Case 3: Department changed in DB
```bash
# المحاولة
User logged in as B2F → Admin changes to B2B in DB → User navigates

# النتيجة
DepartmentGuard يستخدم cached session
لا يرى التغيير حتى logout/login

# الحل (في RLS لاحقاً)
RLS يتحقق من DB مباشرة في كل request
```

---

## Quick Test Script

```typescript
// نسخ ولصق في DevTools Console

// 1. Test Session
console.log('=== SESSION TEST ===');
const session = JSON.parse(localStorage.getItem('platform_staff_session'));
console.log('Session:', session);
console.log('Staff ID:', session?.staff_id);
console.log('Department:', session?.department);
console.log('Role:', session?.role);
console.log('Is Super Admin:', session?.is_super_admin);

// 2. Test Farm Context
console.log('\n=== FARM CONTEXT ===');
console.log('Current Farm:', session?.current_farm_id);
console.log('Available Farms:', session?.available_farms);

// 3. Clear session (للاختبار)
console.log('\n=== CLEAR SESSION ===');
// localStorage.removeItem('platform_staff_session');
// console.log('Session cleared - refresh page to see SessionGuard');

// 4. Simulate expired session (للاختبار)
console.log('\n=== EXPIRE SESSION ===');
// session.last_activity_at = Date.now() - (2 * 60 * 60 * 1000);
// localStorage.setItem('platform_staff_session', JSON.stringify(session));
// console.log('Session expired - refresh page to see SessionGuard');
```

---

## Expected Results Summary

| الاختبار | المتوقع |
|----------|---------|
| بدون session | Redirect to "/" |
| B2F → B2B page | Redirect to "/admin" |
| B2B → B2F page | Redirect to "/admin" |
| مدير مزرعة → مزرعة أخرى | Redirect to farm list |
| مدير مزرعة → مزرعته | عرض الصفحة |
| Super Admin → أي مكان | عرض الصفحة |
| Console logs | واضحة ومفصلة |
| Loading states | سريعة (<1s) |
| Redirect state | معلومات غنية |

---

**كل الاختبارات يجب أن تنجح قبل الانتقال لـ RLS!**
