# استخدام نظام الصلاحيات في الكود

## 🎯 دليل التطبيق العملي

---

## 1️⃣ كيفية التحقق من الصلاحيات في React Components

### الطريقة الأولى: استخدام Hook مخصص

أنشئ Hook للتحقق من الصلاحيات:

```typescript
// src/hooks/usePermissions.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { adminSessionManager } from '../utils/adminSessionManager';

export function usePermissions() {
  const [permissions, setPermissions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      const session = adminSessionManager.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.rpc('get_role_full_permissions', {
        p_role_key: session.role
      });

      setPermissions(data);
      setLoading(false);
    }

    loadPermissions();
  }, []);

  const can = (permissionKey: string, action: string): boolean => {
    if (!permissions?.operational_permissions) return false;

    const perm = permissions.operational_permissions.find(
      (p: any) => p.permission_key === permissionKey
    );

    if (!perm) return false;

    switch (action) {
      case 'create': return perm.can_create;
      case 'view': return perm.can_view;
      case 'edit': return perm.can_edit;
      case 'delete': return perm.can_delete;
      case 'approve': return perm.can_approve;
      case 'reject': return perm.can_reject;
      case 'assign': return perm.can_assign;
      case 'upload_proof': return perm.can_upload_proof;
      case 'review_reports': return perm.can_review_reports;
      case 'send_to_management': return perm.can_send_to_management;
      default: return false;
    }
  };

  return { permissions, loading, can };
}
```

### استخدام الـ Hook في Component:

```typescript
// src/components/PaymentsManager.tsx
import { usePermissions } from '../hooks/usePermissions';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

export function PaymentsManager() {
  const { can, loading } = usePermissions();

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <h2>إدارة المدفوعات</h2>

      {/* عرض زر الاعتماد فقط إذا كان لديه صلاحية */}
      {can('manage_payments', 'approve') && (
        <button className="bg-green-600 text-white px-4 py-2 rounded">
          <CheckCircle className="w-4 h-4 mr-2" />
          اعتماد المدفوعات
        </button>
      )}

      {/* عرض زر الرفض فقط إذا كان لديه صلاحية */}
      {can('manage_payments', 'reject') && (
        <button className="bg-red-600 text-white px-4 py-2 rounded">
          <XCircle className="w-4 h-4 mr-2" />
          رفض
        </button>
      )}

      {/* الجميع يمكنهم العرض */}
      {can('manage_payments', 'view') && (
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          <Eye className="w-4 h-4 mr-2" />
          عرض المدفوعات
        </button>
      )}

      {/* رسالة إذا لم يكن لديه صلاحية */}
      {!can('manage_payments', 'view') && (
        <div className="bg-red-100 text-red-800 p-4 rounded">
          ليس لديك صلاحية عرض المدفوعات
        </div>
      )}
    </div>
  );
}
```

---

## 2️⃣ التحقق من الصلاحية باستخدام RPC مباشرة

```typescript
// التحقق من صلاحية واحدة
async function checkPermission(action: string) {
  const session = adminSessionManager.getSession();
  if (!session) return false;

  const { data } = await supabase.rpc('check_role_permission', {
    p_role_key: session.role,
    p_permission_key: 'manage_payments',
    p_action: action
  });

  return data || false;
}

// الاستخدام
const canApprove = await checkPermission('approve');
if (canApprove) {
  // اعتماد المدفوعات
}
```

---

## 3️⃣ إنشاء Component للحماية (Permission Guard)

```typescript
// src/components/PermissionGuard.tsx
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGuardProps {
  permissionKey: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  permissionKey,
  action,
  children,
  fallback = null
}: PermissionGuardProps) {
  const { can, loading } = usePermissions();

  if (loading) return null;

  if (!can(permissionKey, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### الاستخدام:

```typescript
import { PermissionGuard } from './PermissionGuard';

function PaymentActions() {
  return (
    <div>
      <PermissionGuard
        permissionKey="manage_payments"
        action="approve"
        fallback={<p className="text-gray-500">ليس لديك صلاحية الاعتماد</p>}
      >
        <button className="bg-green-600 text-white px-4 py-2 rounded">
          اعتماد
        </button>
      </PermissionGuard>

      <PermissionGuard
        permissionKey="manage_payments"
        action="reject"
      >
        <button className="bg-red-600 text-white px-4 py-2 rounded">
          رفض
        </button>
      </PermissionGuard>
    </div>
  );
}
```

---

## 4️⃣ التحقق من النطاق (Scope)

```typescript
// Hook للتحقق من النطاق
export function useScope() {
  const [scope, setScope] = useState<any>(null);

  useEffect(() => {
    async function loadScope() {
      const session = adminSessionManager.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('role_scope_permissions')
        .select('*')
        .eq('role_key', session.role);

      setScope(data);
    }

    loadScope();
  }, []);

  const hasAccessTo = (scopeType: string, scopeValue?: string): boolean => {
    if (!scope) return false;

    const permission = scope.find((s: any) => s.scope_type === scopeType);
    if (!permission) return false;

    // إذا كان ينطبق على الكل
    if (permission.applies_to_all) return true;

    // إذا كان محدد بقيمة معينة
    if (scopeValue) {
      return permission.scope_value === scopeValue;
    }

    return false;
  };

  return { scope, hasAccessTo };
}
```

### الاستخدام:

```typescript
function FarmsList() {
  const { hasAccessTo } = useScope();

  // التحقق من الوصول لقسم B2F
  if (!hasAccessTo('section', 'b2f')) {
    return <div>ليس لديك صلاحية الوصول لهذا القسم</div>;
  }

  return <div>قائمة المزارع...</div>;
}
```

---

## 5️⃣ التحقق من المستوى الهرمي

```typescript
async function isHigherRank(myRole: string, targetRole: string): Promise<boolean> {
  const { data: myRoleData } = await supabase
    .from('role_definitions')
    .select('hierarchy_level')
    .eq('role_key', myRole)
    .single();

  const { data: targetRoleData } = await supabase
    .from('role_definitions')
    .select('hierarchy_level')
    .eq('role_key', targetRole)
    .single();

  if (!myRoleData || !targetRoleData) return false;

  // المستوى الأقل رقماً = أعلى صلاحية
  return myRoleData.hierarchy_level < targetRoleData.hierarchy_level;
}

// الاستخدام
const canEdit = await isHigherRank('general_manager', 'farm_manager');
if (canEdit) {
  // يمكنه تعديل موظف أقل رتبة
}
```

---

## 6️⃣ استخدام Context للصلاحيات

```typescript
// src/contexts/PermissionsContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { adminSessionManager } from '../utils/adminSessionManager';

interface PermissionsContextType {
  permissions: any;
  loading: boolean;
  can: (permissionKey: string, action: string) => boolean;
  hasAccessTo: (scopeType: string, scopeValue?: string) => boolean;
  reload: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<any>(null);
  const [scope, setScope] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadPermissions = async () => {
    const session = adminSessionManager.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const [permsData, scopeData] = await Promise.all([
      supabase.rpc('get_role_full_permissions', { p_role_key: session.role }),
      supabase
        .from('role_scope_permissions')
        .select('*')
        .eq('role_key', session.role)
    ]);

    setPermissions(permsData.data);
    setScope(scopeData.data);
    setLoading(false);
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const can = (permissionKey: string, action: string): boolean => {
    if (!permissions?.operational_permissions) return false;

    const perm = permissions.operational_permissions.find(
      (p: any) => p.permission_key === permissionKey
    );

    if (!perm) return false;

    const actionKey = `can_${action}`;
    return perm[actionKey] || false;
  };

  const hasAccessTo = (scopeType: string, scopeValue?: string): boolean => {
    if (!scope) return false;

    const permission = scope.find((s: any) => s.scope_type === scopeType);
    if (!permission) return false;

    if (permission.applies_to_all) return true;

    if (scopeValue) {
      return permission.scope_value === scopeValue;
    }

    return false;
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        loading,
        can,
        hasAccessTo,
        reload: loadPermissions
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissionsContext must be used within PermissionsProvider');
  }
  return context;
}
```

### استخدام Context في App.tsx:

```typescript
import { PermissionsProvider } from './contexts/PermissionsContext';

function App() {
  return (
    <PermissionsProvider>
      <YourApp />
    </PermissionsProvider>
  );
}
```

### الاستخدام في أي Component:

```typescript
import { usePermissionsContext } from '../contexts/PermissionsContext';

function AnyComponent() {
  const { can, hasAccessTo } = usePermissionsContext();

  return (
    <div>
      {can('manage_farms', 'create') && (
        <button>إنشاء مزرعة</button>
      )}

      {hasAccessTo('section', 'b2f') && (
        <div>محتوى قسم B2F</div>
      )}
    </div>
  );
}
```

---

## 7️⃣ التحقق من الصلاحيات في RLS (Database Level)

```sql
-- مثال: سياسة RLS تتحقق من الصلاحية
CREATE POLICY "Users can edit if they have permission"
  ON farms
  FOR UPDATE
  TO authenticated
  USING (
    -- التحقق من أن المستخدم لديه صلاحية edit
    EXISTS (
      SELECT 1
      FROM platform_staff ps
      JOIN role_operational_permissions rop
        ON ps.role = rop.role_key
      WHERE ps.user_id = auth.uid()
        AND rop.permission_key = 'manage_farms'
        AND rop.can_edit = true
    )
  );
```

---

## 8️⃣ أمثلة عملية متقدمة

### مثال 1: صفحة إدارة المزارع

```typescript
import { usePermissions } from '../hooks/usePermissions';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';

export function FarmsManagement() {
  const { can, loading } = usePermissions();
  const [farms, setFarms] = useState([]);

  if (loading) return <div>جاري التحميل...</div>;

  // التحقق من الوصول للصفحة
  if (!can('manage_farms', 'view')) {
    return (
      <div className="p-8 bg-red-100 text-red-800 rounded">
        ليس لديك صلاحية الوصول لهذه الصفحة
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة المزارع</h1>

        {/* زر إنشاء مزرعة فقط لمن لديه صلاحية */}
        {can('manage_farms', 'create') && (
          <button className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إضافة مزرعة
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {farms.map((farm: any) => (
          <div key={farm.id} className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-2">{farm.name}</h3>
            <p className="text-gray-600 mb-4">{farm.location}</p>

            <div className="flex gap-2">
              {/* عرض التفاصيل - الجميع يمكنهم */}
              {can('manage_farms', 'view') && (
                <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded flex items-center justify-center gap-1">
                  <Eye className="w-4 h-4" />
                  عرض
                </button>
              )}

              {/* التعديل - فقط لمن لديه صلاحية */}
              {can('manage_farms', 'edit') && (
                <button className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded flex items-center justify-center gap-1">
                  <Edit className="w-4 h-4" />
                  تعديل
                </button>
              )}

              {/* الحذف - فقط لمن لديه صلاحية */}
              {can('manage_farms', 'delete') && (
                <button className="flex-1 bg-red-600 text-white px-3 py-2 rounded flex items-center justify-center gap-1">
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### مثال 2: نظام اعتماد المهام

```typescript
import { usePermissions } from '../hooks/usePermissions';
import { CheckCircle, XCircle } from 'lucide-react';

export function TaskApproval({ task }: { task: any }) {
  const { can } = usePermissions();

  const handleApprove = async () => {
    if (!can('manage_tasks', 'approve')) {
      alert('ليس لديك صلاحية اعتماد المهام');
      return;
    }

    await supabase
      .from('tasks')
      .update({ status: 'approved' })
      .eq('id', task.id);
  };

  const handleReject = async () => {
    if (!can('manage_tasks', 'reject')) {
      alert('ليس لديك صلاحية رفض المهام');
      return;
    }

    await supabase
      .from('tasks')
      .update({ status: 'rejected' })
      .eq('id', task.id);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="font-bold text-xl mb-4">{task.title}</h3>
      <p className="text-gray-600 mb-6">{task.description}</p>

      {/* الأزرار تظهر فقط لمن لديه صلاحية */}
      <div className="flex gap-4">
        {can('manage_tasks', 'approve') && (
          <button
            onClick={handleApprove}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700"
          >
            <CheckCircle className="w-5 h-5" />
            اعتماد المهمة
          </button>
        )}

        {can('manage_tasks', 'reject') && (
          <button
            onClick={handleReject}
            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700"
          >
            <XCircle className="w-5 h-5" />
            رفض المهمة
          </button>
        )}
      </div>

      {!can('manage_tasks', 'approve') && !can('manage_tasks', 'reject') && (
        <div className="bg-gray-100 text-gray-600 p-4 rounded text-center">
          ليس لديك صلاحية اعتماد أو رفض المهام
        </div>
      )}
    </div>
  );
}
```

---

## ✅ الخلاصة

النظام يعمل على 3 مستويات:

1. **Frontend (React)**: التحقق من الصلاحيات لإظهار/إخفاء العناصر
2. **Backend (Functions)**: التحقق من الصلاحيات قبل تنفيذ العمليات
3. **Database (RLS)**: التحقق من الصلاحيات على مستوى قاعدة البيانات

هذا يضمن الأمان الكامل على جميع المستويات!
