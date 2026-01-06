# Router Guards Implementation - Frontend Protection 🛡️

## النظام المنفذ

تم تنفيذ نظام Router Guards شامل لحماية المسارات الإدارية في Frontend قبل RLS.

---

## الهدف الحرج

### 1️⃣ منع الدخول بدون Session
```
❌ لا يمكن الوصول إلى /admin/* بدون session نشط
✅ يجب تسجيل الدخول بـ QR/PIN أولاً
```

### 2️⃣ منع خلط B2F/B2B
```
❌ موظف B2F لا يمكنه الوصول إلى صفحات B2B
❌ موظف B2B لا يمكنه الوصول إلى صفحات B2F
✅ كل قسم معزول عن الآخر
```

### 3️⃣ منع Farm Roles من فتح مزرعة خارج Scope
```
❌ مدير مزرعة #1 لا يمكنه فتح مزرعة #2
✅ يمكن الوصول فقط للمزارع المسجل بها في b2f_farm_team
```

---

## المكونات المنفذة

### 1. SessionGuard

**الموقع:** `src/components/guards/SessionGuard.tsx`

**الوظيفة:**
```typescript
- يتحقق من وجود session في localStorage
- يتحقق من صلاحية session من قاعدة البيانات
- يتحقق من عدم انتهاء session (idle timeout)
- يعيد التوجيه إلى / إذا لم توجد session صالحة
```

**الاستخدام:**
```tsx
<Route
  path="/admin/something"
  element={
    <SessionGuard>
      <SomePage />
    </SessionGuard>
  }
/>
```

**السلوك:**
```
1. جاري التحقق من الجلسة... (Loading spinner)
2. إذا لا توجد session:
   → Redirect to "/"
   → State: { reason: 'session_required', message: 'يجب تسجيل الدخول' }
3. إذا session صالحة:
   → عرض المحتوى المحمي
```

**الفحوصات:**
- ✅ Local session exists
- ✅ DB session valid
- ✅ Session not expired
- ✅ is_active = true
- ✅ Staff still exists

---

### 2. DepartmentGuard

**الموقع:** `src/components/guards/DepartmentGuard.tsx`

**الوظيفة:**
```typescript
- يتحقق من أن department الموظف يطابق allowedDepartments
- يسمح لـ Super Admin و Platform Owner بالوصول لكل شيء
- يتحقق بشكل مرن (يشمل b2f, B2F, مزارع)
```

**الاستخدام:**
```tsx
<Route
  path="/admin/b2f"
  element={
    <SessionGuard>
      <DepartmentGuard allowedDepartments={['b2f', 'B2F', 'مزارع']}>
        <B2FPage />
      </DepartmentGuard>
    </SessionGuard>
  }
/>
```

**السلوك:**
```
1. جاري التحقق من الصلاحيات... (Loading spinner)
2. إذا Department لا يطابق:
   → Redirect to "/admin" (or custom redirectTo)
   → State: {
       reason: 'department_mismatch',
       userDepartment: 'b2b',
       requiredDepartments: ['b2f'],
       message: 'ليس لديك صلاحية الوصول'
     }
3. إذا يطابق:
   → عرض المحتوى
```

**الفحوصات:**
- ✅ Session exists
- ✅ is_super_admin → bypass
- ✅ is_platform_owner → bypass
- ✅ department matches one of allowed
- ✅ Normalized matching (case-insensitive, includes)

**أمثلة:**
```typescript
// B2F-only routes
allowedDepartments={['b2f', 'B2F', 'مزارع']}

// B2B-only routes
allowedDepartments={['b2b', 'B2B', 'مزادات']}

// Multiple departments
allowedDepartments={['finance', 'مالية', 'accounting']}
```

---

### 3. FarmScopeGuard

**الموقع:** `src/components/guards/FarmScopeGuard.tsx`

**الوظيفة:**
```typescript
- يتحقق من أن الموظف عضو في b2f_farm_team للمزرعة المطلوبة
- يسمح لـ Super Admin و Platform Owner بالوصول لكل المزارع
- يستخرج farmId من URL params
- يحدث current_farm_id في session عند النجاح
```

**الاستخدام:**
```tsx
<Route
  path="/admin/b2f/farm-command/farms/:farmId"
  element={
    <SessionGuard>
      <DepartmentGuard allowedDepartments={['b2f']}>
        <FarmScopeGuard farmIdParam="farmId" redirectTo="/admin/b2f">
          <FarmDetailPage />
        </FarmScopeGuard>
      </DepartmentGuard>
    </SessionGuard>
  }
/>
```

**السلوك:**
```
1. جاري التحقق من صلاحية الوصول للمزرعة... (Loading)
2. إذا لا يوجد farm membership:
   → Query: b2f_farm_team
   → WHERE farm_id = :farmId AND staff_id = :staffId
   → If no record found:
     → Redirect to redirectTo
     → State: {
         reason: 'farm_access_denied',
         message: 'ليس لديك صلاحية الوصول',
         farmId: 'xxx'
       }
3. إذا membership exists:
   → Set current_farm_id in session
   → عرض المحتوى
```

**الفحوصات:**
- ✅ Session exists
- ✅ is_super_admin → bypass
- ✅ is_platform_owner → bypass
- ✅ farmId exists in URL
- ✅ b2f_farm_team membership exists
- ✅ Sets current farm context

**Parameters:**
```typescript
interface FarmScopeGuardProps {
  children: React.ReactNode;
  farmIdParam?: string;        // Default: 'farmId'
  redirectTo?: string;          // Default: '/admin/b2f'
}
```

---

## تطبيق Guards على المسارات

### مستويات الحماية

#### Level 1: Session Only
```tsx
// Finance, Marketing, Partners
<SessionGuard>
  <Page />
</SessionGuard>
```

#### Level 2: Session + Department
```tsx
// B2F Admin, B2B Auctions Admin
<SessionGuard>
  <DepartmentGuard allowedDepartments={['b2f']}>
    <Page />
  </DepartmentGuard>
</SessionGuard>
```

#### Level 3: Session + Department + Farm Scope
```tsx
// Farm Detail Pages
<SessionGuard>
  <DepartmentGuard allowedDepartments={['b2f']}>
    <FarmScopeGuard farmIdParam="farmId">
      <Page />
    </FarmScopeGuard>
  </DepartmentGuard>
</SessionGuard>
```

---

## المسارات المحمية

### Operations Room (Executive/GM)

| المسار | الحماية | السماح لـ |
|--------|---------|-----------|
| `/admin/operations-room` | Session | All authenticated staff |
| `/admin/operations-room/logs` | Session | All authenticated staff |
| `/admin/operations-room/sensitive-commands` | Session | All authenticated staff |

### Operations Room - Department Specific

| المسار | الحماية | السماح لـ |
|--------|---------|-----------|
| `/admin/operations-room/b2f` | Session + B2F Dept | B2F staff only |
| `/admin/operations-room/b2f/farms/:farmId` | Session + B2F + Farm | Farm team members only |
| `/admin/operations-room/b2b` | Session + B2B Dept | B2B staff only |

### Admin Sections

| المسار | الحماية | السماح لـ |
|--------|---------|-----------|
| `/admin/auctions` | Session + B2B Dept | B2B staff only |
| `/admin/b2f` | Session + B2F Dept | B2F staff only |
| `/admin/b2f/farm-command` | Session + B2F Dept | B2F staff only |
| `/admin/b2f/farm-command/farms/:farmId` | Session + B2F + Farm | Farm team only |
| `/farms/:farmId` | Session + Farm | Farm team only |
| `/admin/settings` | Session | All authenticated staff |

### HQ Aliases

| المسار | الحماية | السماح لـ |
|--------|---------|-----------|
| `/hq` | Session | All authenticated staff |
| `/hq/*` | Session | All authenticated staff |

---

## سيناريوهات الاختبار

### 1️⃣ بدون Session

```bash
# المحاولة
GET /admin/operations-room

# النتيجة
❌ SessionGuard: No session found
→ Redirect to "/"
→ Console: "🚫 SessionGuard: Access denied - no valid session"
```

### 2️⃣ موظف B2B يحاول الدخول لصفحة B2F

```bash
# المحاولة
Staff: { staff_id: '123', department: 'b2b' }
GET /admin/b2f

# النتيجة
✅ SessionGuard: Pass
❌ DepartmentGuard: Department mismatch
   Expected: ['b2f']
   Actual: 'b2b'
→ Redirect to "/admin"
→ Console: "🚫 DepartmentGuard: Access denied (Department mismatch)"
```

### 3️⃣ مدير مزرعة #1 يحاول فتح مزرعة #2

```bash
# المحاولة
Staff: { staff_id: '456', department: 'b2f' }
Farm Memberships: [{ farm_id: 'farm-1', role: 'farm_manager' }]
GET /admin/b2f/farm-command/farms/farm-2

# النتيجة
✅ SessionGuard: Pass
✅ DepartmentGuard: Pass (B2F matches)
❌ FarmScopeGuard: No membership found
   Query: SELECT * FROM b2f_farm_team
          WHERE farm_id = 'farm-2' AND staff_id = '456'
   Result: NULL
→ Redirect to "/admin/b2f/farm-command"
→ Console: "🚫 FarmScopeGuard: No farm membership found"
```

### 4️⃣ Super Admin يدخل أي مسار

```bash
# المحاولة
Staff: { staff_id: '999', role: 'super_admin', is_super_admin: true }
GET /admin/b2f/farm-command/farms/any-farm

# النتيجة
✅ SessionGuard: Pass
✅ DepartmentGuard: Pass (Super Admin bypass)
✅ FarmScopeGuard: Pass (Super Admin bypass)
→ عرض الصفحة
→ Console: "✅ All Guards: Access granted (Super Admin)"
```

### 5️⃣ مدير مزرعة يدخل مزرعته

```bash
# المحاولة
Staff: { staff_id: '789', department: 'b2f' }
Farm Memberships: [{ farm_id: 'farm-3', role: 'farm_manager' }]
GET /admin/b2f/farm-command/farms/farm-3

# النتيجة
✅ SessionGuard: Pass
✅ DepartmentGuard: Pass (B2F matches)
✅ FarmScopeGuard: Pass (Membership found)
   Query: SELECT * FROM b2f_farm_team
          WHERE farm_id = 'farm-3' AND staff_id = '789'
   Result: { id: 'xxx', role: 'farm_manager' }
   Action: Set current_farm_id = 'farm-3'
→ عرض الصفحة
→ Console: "✅ All Guards: Access granted"
```

---

## Console Logging للتشخيص

### SessionGuard
```javascript
console.log('🔐 SessionGuard: Checking session for:', location.pathname);
console.log('✅ SessionGuard: Local session exists');
console.log('✅ SessionGuard: Session valid');
console.log('   - Staff ID:', dbSession.staff_id);
console.log('   - Role:', dbSession.role);
console.log('   - Department:', dbSession.department);
console.log('🚫 SessionGuard: Access denied - no valid session');
```

### DepartmentGuard
```javascript
console.log('🏢 DepartmentGuard: Checking access for:', location.pathname);
console.log('   Allowed departments:', allowedDepartments);
console.log('   User department:', department);
console.log('   User role:', session.role);
console.log('✅ DepartmentGuard: Access granted (Super Admin/Owner)');
console.log('✅ DepartmentGuard: Access granted (Department match)');
console.log('🚫 DepartmentGuard: Access denied (Department mismatch)');
console.log(`   Expected: ${allowedDepartments.join(' or ')}`);
console.log(`   Actual: ${department}`);
```

### FarmScopeGuard
```javascript
console.log('🌾 FarmScopeGuard: Checking farm access');
console.log('   Route:', location.pathname);
console.log('   Target Farm ID:', targetFarmId);
console.log('   Staff ID:', session.staff_id);
console.log('✅ FarmScopeGuard: Access granted (Super Admin/Owner)');
console.log('✅ FarmScopeGuard: Access granted');
console.log('   Membership ID:', membership.id);
console.log('   Farm Role:', membership.role);
console.log('🚫 FarmScopeGuard: No farm membership found');
console.log(`   Staff ${session.staff_id} is NOT a member of farm ${targetFarmId}`);
```

---

## الميزات التقنية

### 1. Nested Guards (تدريج الحماية)
```tsx
// كل guard يفحص شرط محدد
<SessionGuard>           {/* مستوى 1: session */}
  <DepartmentGuard>      {/* مستوى 2: department */}
    <FarmScopeGuard>     {/* مستوى 3: farm scope */}
      <Page />
    </FarmScopeGuard>
  </DepartmentGuard>
</SessionGuard>
```

### 2. Bypass للصلاحيات العليا
```typescript
// Super Admin و Platform Owner يتجاوزون كل الفحوصات
if (session.is_super_admin || session.is_platform_owner) {
  console.log('✅ Access granted (Super Admin/Owner)');
  setHasAccess(true);
  return;
}
```

### 3. Flexible Department Matching
```typescript
// يدعم multiple variations
allowedDepartments={['b2f', 'B2F', 'مزارع']}

// Normalization
const normalized = department.toLowerCase().trim();
const allowedNormalized = allowed.toLowerCase().trim();

// Matching
normalized === allowedNormalized ||
normalized.includes(allowedNormalized) ||
allowedNormalized.includes(normalized)
```

### 4. Session Context Update
```typescript
// FarmScopeGuard يحدث current farm في session
adminSessionManager.setCurrentFarm(targetFarmId);

// يمكن استخدامه لاحقاً في أي مكان
const currentFarm = adminSessionManager.getCurrentFarm();
```

### 5. Rich Redirect State
```typescript
// يمرر معلومات للصفحة المعاد التوجيه إليها
<Navigate
  to={redirectTo}
  replace
  state={{
    from: location.pathname,
    reason: 'farm_access_denied',
    message: 'ليس لديك صلاحية الوصول',
    farmId: params[farmIdParam]
  }}
/>

// يمكن عرض رسالة خطأ واضحة للمستخدم
const location = useLocation();
if (location.state?.reason === 'farm_access_denied') {
  showToast(location.state.message);
}
```

---

## الفرق بين Frontend Guards و RLS

### Frontend Guards (المنفذ الآن)
```
✅ منع الوصول إلى المسارات
✅ منع عرض الواجهات
✅ توجيه المستخدم للمكان الصحيح
✅ تجربة مستخدم أفضل (رسائل واضحة)
❌ لا يحمي API calls المباشرة
❌ يمكن تجاوزه بالـ DevTools
```

### RLS (التالي)
```
✅ حماية قاعدة البيانات نفسها
✅ يمنع API calls المباشرة
✅ لا يمكن تجاوزه
❌ لا يمنع الوصول للواجهة (404/error فقط)
```

### الحماية المثالية = Frontend Guards + RLS
```
Frontend Guards:
- منع الوصول للواجهة
- رسائل واضحة
- تجربة مستخدم جيدة

RLS:
- حماية البيانات
- منع API bypassing
- طبقة أمان نهائية
```

---

## Build Status

```bash
$ npm run build

✓ 1746 modules transformed
✓ built in 17.56s
✅ NO ERRORS
```

---

## الملفات المنشأة

```
src/components/guards/
├── SessionGuard.tsx          ✅ جاهز
├── DepartmentGuard.tsx       ✅ جاهز
├── FarmScopeGuard.tsx        ✅ جاهز
└── index.ts                  ✅ جاهز

src/App.tsx                   ✅ محدث بالـ Guards
```

---

## الحالة النهائية

```
✅ SessionGuard             IMPLEMENTED
✅ DepartmentGuard          IMPLEMENTED
✅ FarmScopeGuard           IMPLEMENTED
✅ Applied to Routes        COMPLETE
✅ Console Logging          COMPREHENSIVE
✅ Error Messages           ARABIC + ENGLISH
✅ Redirect State           RICH INFO
✅ Build                    PASSED
✅ Documentation            COMPLETE
```

---

## Next Steps

### المرحلة التالية: RLS Implementation

```sql
-- 1. Session validation in RLS
CREATE POLICY "Require valid session" ON platform_staff_sessions
  FOR ALL
  USING (
    is_active = true
    AND (NOW() - last_activity_at) < INTERVAL '1 hour'
  );

-- 2. Department-based RLS
CREATE POLICY "B2F staff only" ON b2f_farms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = auth.uid()
      AND department IN ('b2f', 'B2F', 'مزارع')
    )
  );

-- 3. Farm-scoped RLS
CREATE POLICY "Farm team members only" ON b2f_farm_operations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM b2f_farm_team
      WHERE farm_id = b2f_farm_operations.farm_id
      AND staff_id = auth.uid()
    )
  );
```

---

## الملخص

| المطلوب | الحالة | التفاصيل |
|---------|--------|----------|
| منع الدخول بدون session | ✅ | SessionGuard على كل /admin/* |
| منع خلط B2F/B2B | ✅ | DepartmentGuard على كل قسم |
| منع Farm roles خارج scope | ✅ | FarmScopeGuard على /farms/:farmId |
| Nested protection | ✅ | Session → Department → Farm |
| Super Admin bypass | ✅ | يتجاوز كل الفحوصات |
| Console logging | ✅ | شامل لكل guard |
| Error messages | ✅ | عربي + إنجليزي |
| Redirect state | ✅ | معلومات غنية |
| Build | ✅ | لا أخطاء |

---

**Router Guards جاهزة 100% - Frontend Protection Complete!**

**التالي:** RLS Implementation للحماية الكاملة
