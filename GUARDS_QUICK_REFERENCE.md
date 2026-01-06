# Router Guards - مرجع سريع ⚡

## استخدام Guards في 3 خطوات

### 1️⃣ Import
```tsx
import { SessionGuard, DepartmentGuard, FarmScopeGuard } from './components/guards';
```

### 2️⃣ Wrap Route
```tsx
<Route
  path="/your-path"
  element={
    <Guard>
      <YourComponent />
    </Guard>
  }
/>
```

### 3️⃣ Done! ✅

---

## أمثلة سريعة

### Session فقط
```tsx
<Route
  path="/admin/settings"
  element={
    <SessionGuard>
      <SettingsPage />
    </SessionGuard>
  }
/>
```

### Session + Department
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

### Session + Department + Farm Scope
```tsx
<Route
  path="/admin/b2f/farms/:farmId"
  element={
    <SessionGuard>
      <DepartmentGuard allowedDepartments={['b2f']}>
        <FarmScopeGuard farmIdParam="farmId">
          <FarmPage />
        </FarmScopeGuard>
      </DepartmentGuard>
    </SessionGuard>
  }
/>
```

---

## Department Names Reference

### B2F Department
```typescript
['b2f', 'B2F', 'مزارع']
```

### B2B Department
```typescript
['b2b', 'B2B', 'مزادات']
```

### Finance
```typescript
['finance', 'مالية']
```

### Marketing
```typescript
['marketing', 'تسويق']
```

---

## Props Reference

### DepartmentGuard
```typescript
{
  children: ReactNode;
  allowedDepartments: string[];
  redirectTo?: string;  // Default: "/admin"
}
```

### FarmScopeGuard
```typescript
{
  children: ReactNode;
  farmIdParam?: string;    // Default: "farmId"
  redirectTo?: string;     // Default: "/admin/b2f"
}
```

---

## Bypass Rules

### Who bypasses all guards?
```typescript
session.is_super_admin === true
session.is_platform_owner === true
```

### Who can access B2F?
```typescript
department in ['b2f', 'B2F', 'مزارع']
OR is_super_admin
OR is_platform_owner
```

### Who can access specific farm?
```typescript
EXISTS (
  SELECT 1 FROM b2f_farm_team
  WHERE farm_id = :farmId AND staff_id = :staffId
)
OR is_super_admin
OR is_platform_owner
```

---

## Console Output Cheat Sheet

### Success
```
✅ SessionGuard: Session valid
✅ DepartmentGuard: Access granted
✅ FarmScopeGuard: Access granted
```

### Failure
```
❌ SessionGuard: No session found
🚫 DepartmentGuard: Department mismatch
🚫 FarmScopeGuard: No farm membership found
```

---

## Common Redirects

| Guard | Condition | Redirect To |
|-------|-----------|-------------|
| SessionGuard | No session | `/` |
| DepartmentGuard | B2F → B2B | `/admin` |
| DepartmentGuard | B2B → B2F | `/admin` |
| FarmScopeGuard | No membership | `/admin/b2f` |

---

## Testing في DevTools

### Clear Session
```javascript
localStorage.removeItem('platform_staff_session');
```

### Check Session
```javascript
JSON.parse(localStorage.getItem('platform_staff_session'));
```

### Expire Session
```javascript
const s = JSON.parse(localStorage.getItem('platform_staff_session'));
s.last_activity_at = Date.now() - (2*60*60*1000);
localStorage.setItem('platform_staff_session', JSON.stringify(s));
```

---

## Decision Tree

```
┌─────────────────┐
│  Access Route   │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Session?│
    └────┬────┘
         │ No → Redirect "/"
         │ Yes
    ┌────▼────────┐
    │ Department? │
    └────┬────────┘
         │ No → Redirect "/admin"
         │ Yes
    ┌────▼───────┐
    │ Farm Scope?│
    └────┬───────┘
         │ No → Redirect farm list
         │ Yes
    ┌────▼────┐
    │  ALLOW  │
    └─────────┘
```

---

**Copy-paste ready!** 📋
