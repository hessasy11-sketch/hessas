# دليل نظام الصلاحيات - خطوة بخطوة

## 📚 فهم مفتاح الصلاحية (Permission Key)

**مفتاح الصلاحية** هو معرف فريد بالإنجليزية يحدد نوع الصلاحية.

### أمثلة على مفاتيح الصلاحيات:
```
manage_farms        → إدارة المزارع
manage_operations   → إدارة العمليات
manage_tasks        → إدارة المهام
manage_reports      → إدارة التقارير
execute_tasks       → تنفيذ المهام
view_data          → عرض البيانات
approve_payments   → اعتماد المدفوعات
manage_employees   → إدارة الموظفين
```

---

## 🔧 كيفية إضافة دور جديد (خطوة بخطوة)

### الخطوة 1: إضافة تعريف الدور

```sql
INSERT INTO role_definitions (
  role_key,           -- المفتاح الفريد (إنجليزي)
  role_name_ar,       -- الاسم العربي
  role_name_en,       -- الاسم الإنجليزي
  description,        -- الوصف
  hierarchy_level     -- المستوى الهرمي (1-10)
)
VALUES (
  'accountant',
  'محاسب',
  'Accountant',
  'إدارة الحسابات والمدفوعات',
  6
);
```

### الخطوة 2: إعدادات الدخول

```sql
INSERT INTO role_access_settings (
  role_key,
  requires_qr,              -- يحتاج QR؟
  requires_pin,             -- يحتاج PIN؟
  session_duration_minutes, -- مدة الجلسة
  qr_type,                 -- نوع QR
  allow_multi_device       -- أجهزة متعددة؟
)
VALUES (
  'accountant',
  true,           -- نعم يحتاج QR
  true,           -- نعم يحتاج PIN
  45,            -- جلسة 45 دقيقة
  'permanent',   -- QR دائم
  false          -- جهاز واحد فقط
);
```

### الخطوة 3: إضافة الصلاحيات التشغيلية

```sql
INSERT INTO role_operational_permissions (
  role_key,
  permission_key,        -- مفتاح الصلاحية
  permission_name_ar,    -- اسم الصلاحية
  permission_category,   -- الفئة
  can_create,           -- يمكنه الإنشاء
  can_view,             -- يمكنه العرض
  can_edit,             -- يمكنه التعديل
  can_delete,           -- يمكنه الحذف
  can_approve,          -- يمكنه الاعتماد
  can_reject            -- يمكنه الرفض
)
VALUES
  -- صلاحية المدفوعات
  ('accountant', 'manage_payments', 'إدارة المدفوعات', 'finance',
   true, true, true, false, true, true),

  -- صلاحية التقارير المالية
  ('accountant', 'financial_reports', 'التقارير المالية', 'reports',
   true, true, false, false, false, false),

  -- صلاحية عرض العمليات
  ('accountant', 'view_operations', 'عرض العمليات', 'operations',
   false, true, false, false, false, false);
```

### الخطوة 4: تحديد النطاق

```sql
INSERT INTO role_scope_permissions (
  role_key,
  scope_type,      -- platform/section/farm
  scope_value,     -- قيمة محددة (أو NULL للكل)
  applies_to_all   -- ينطبق على الكل؟
)
VALUES
  -- ينطبق على قسم المالية فقط
  ('accountant', 'section', 'finance', false),

  -- أو ينطبق على جميع الأقسام
  ('accountant', 'platform', NULL, true);
```

---

## 🎯 مثال عملي كامل: إضافة دور "مشرف مخزن"

```sql
-- الخطوة 1: التعريف
INSERT INTO role_definitions
  (role_key, role_name_ar, role_name_en, description, hierarchy_level)
VALUES
  ('warehouse_supervisor', 'مشرف مخزن', 'Warehouse Supervisor',
   'إدارة المخزون والإمدادات', 7);

-- الخطوة 2: إعدادات الدخول
INSERT INTO role_access_settings
  (role_key, requires_qr, requires_pin, session_duration_minutes, qr_type)
VALUES
  ('warehouse_supervisor', true, true, 30, 'permanent');

-- الخطوة 3: الصلاحيات
INSERT INTO role_operational_permissions
  (role_key, permission_key, permission_name_ar, permission_category,
   can_create, can_view, can_edit, can_delete, can_approve, can_upload_proof)
VALUES
  -- إدارة المخزون
  ('warehouse_supervisor', 'manage_inventory', 'إدارة المخزون', 'inventory',
   true, true, true, false, true, true),

  -- طلبات الإمداد
  ('warehouse_supervisor', 'supply_requests', 'طلبات الإمداد', 'supplies',
   true, true, true, false, true, true),

  -- تقارير المخزن
  ('warehouse_supervisor', 'warehouse_reports', 'تقارير المخزن', 'reports',
   true, true, false, false, false, false);

-- الخطوة 4: النطاق
INSERT INTO role_scope_permissions
  (role_key, scope_type, applies_to_all)
VALUES
  ('warehouse_supervisor', 'section', true);
```

---

## 🔍 كيفية التحقق من الصلاحيات في الكود

### 1. الحصول على كل صلاحيات دور معين:

```typescript
const { data } = await supabase
  .rpc('get_role_full_permissions', {
    p_role_key: 'farm_manager'
  });

console.log(data);
// {
//   definition: { role_key, role_name_ar, ... },
//   access_settings: { requires_qr, requires_pin, ... },
//   operational_permissions: [...],
//   scope_permissions: [...]
// }
```

### 2. التحقق من صلاحية محددة:

```typescript
const { data: hasPermission } = await supabase
  .rpc('check_role_permission', {
    p_role_key: 'farm_manager',
    p_permission_key: 'manage_operations',
    p_action: 'create'  // create/view/edit/delete/approve/reject
  });

if (hasPermission) {
  // السماح بالإجراء
}
```

### 3. في الواجهة (React Component):

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function OperationsPanel() {
  const [permissions, setPermissions] = useState({
    canCreate: false,
    canEdit: false,
    canApprove: false
  });

  useEffect(() => {
    async function checkPermissions() {
      const role = localStorage.getItem('staff_role');

      const canCreate = await supabase.rpc('check_role_permission', {
        p_role_key: role,
        p_permission_key: 'manage_operations',
        p_action: 'create'
      });

      const canEdit = await supabase.rpc('check_role_permission', {
        p_role_key: role,
        p_permission_key: 'manage_operations',
        p_action: 'edit'
      });

      setPermissions({
        canCreate: canCreate.data,
        canEdit: canEdit.data,
        canApprove: true
      });
    }

    checkPermissions();
  }, []);

  return (
    <div>
      {permissions.canCreate && (
        <button>إنشاء عملية جديدة</button>
      )}
      {permissions.canEdit && (
        <button>تعديل</button>
      )}
    </div>
  );
}
```

---

## 📊 جدول الصلاحيات الحالية

| role_key | الاسم العربي | المستوى | QR | PIN | الجلسة |
|----------|-------------|---------|-----|-----|--------|
| platform_owner | مالك المنصة | 1 | ✅ | ✅ | 60 دقيقة |
| super_admin | مدير عام | 2 | ✅ | ✅ | 60 دقيقة |
| general_manager | المدير العام | 3 | ✅ | ✅ | 60 دقيقة |
| section_manager | مدير قسم | 4 | ✅ | ✅ | 45 دقيقة |
| farm_manager | مدير مزرعة | 5 | ✅ | ✅ | 45 دقيقة |
| farm_supervisor | مشرف مزرعة | 6 | ✅ | ❌ | 30 دقيقة |
| operations_supervisor | مشرف عمليات | 7 | ✅ | ❌ | 30 دقيقة |
| task_executor | منفذ مهام | 8 | ✅ | ❌ | 30 دقيقة |
| viewer | مشاهد | 9 | ✅ | ❌ | 30 دقيقة |

---

## 🎨 فئات الصلاحيات (Categories)

```
users      → إدارة المستخدمين
roles      → إدارة الأدوار
farms      → إدارة المزارع
operations → إدارة العمليات
tasks      → إدارة المهام
reports    → إدارة التقارير
auctions   → إدارة المزادات
finance    → الشؤون المالية
team       → إدارة الفريق
general    → عام
```

---

## ⚠️ نصائح مهمة

1. **مفتاح الدور (role_key)** يجب أن يكون:
   - بالإنجليزية فقط
   - صغيرة (lowercase)
   - بدون مسافات (استخدم _ بدلاً)
   - فريد (لا يتكرر)

2. **مفتاح الصلاحية (permission_key)** نفس القواعد

3. **المستوى الهرمي (hierarchy_level)**:
   - 1 = أعلى صلاحية (المالك)
   - 10 = أقل صلاحية

4. **النطاق (Scope)**:
   - `platform` = على مستوى المنصة كاملة
   - `section` = على مستوى قسم محدد
   - `farm` = على مستوى مزرعة محددة
   - `auction` = على مستوى مزاد محدد

---

## 🔐 أمثلة على استخدامات عملية

### مثال 1: موظف يمكنه فقط تنفيذ المهام

```sql
INSERT INTO role_operational_permissions
  (role_key, permission_key, permission_name_ar, permission_category,
   can_create, can_view, can_edit, can_delete, can_approve, can_upload_proof)
VALUES
  ('task_executor', 'execute_tasks', 'تنفيذ المهام', 'tasks',
   false, true, false, false, false, true);
```

### مثال 2: مدير يمكنه كل شيء في قسمه فقط

```sql
-- الصلاحيات
INSERT INTO role_operational_permissions VALUES
  ('section_manager', 'manage_section', 'إدارة القسم', 'section',
   true, true, true, true, true, true, true, true, true, true);

-- النطاق محدود بقسم واحد
INSERT INTO role_scope_permissions
  (role_key, scope_type, scope_value, applies_to_all)
VALUES
  ('section_manager', 'section', 'b2f', false);
```

### مثال 3: مشرف عمليات يمكنه فقط الاعتماد والرفض

```sql
INSERT INTO role_operational_permissions VALUES
  ('operations_supervisor', 'approve_operations', 'اعتماد العمليات', 'operations',
   false, true, false, false, true, true, false, false, false, false);
```

---

## 📝 نموذج Migration كامل

احفظ هذا الكود في ملف migration جديد:

```sql
/*
  # إضافة دور جديد: [اسم الدور]

  1. التعريف
  2. إعدادات الدخول
  3. الصلاحيات التشغيلية
  4. النطاق
*/

-- 1. التعريف
INSERT INTO role_definitions
  (role_key, role_name_ar, role_name_en, description, hierarchy_level)
VALUES
  ('new_role', 'الدور الجديد', 'New Role', 'وصف الدور', 8)
ON CONFLICT (role_key) DO NOTHING;

-- 2. إعدادات الدخول
INSERT INTO role_access_settings
  (role_key, requires_qr, requires_pin, session_duration_minutes, qr_type)
VALUES
  ('new_role', true, false, 30, 'permanent')
ON CONFLICT (role_key) DO NOTHING;

-- 3. الصلاحيات
INSERT INTO role_operational_permissions
  (role_key, permission_key, permission_name_ar, permission_category,
   can_create, can_view, can_edit, can_delete, can_approve)
VALUES
  ('new_role', 'permission_1', 'صلاحية 1', 'category',
   true, true, false, false, false)
ON CONFLICT (role_key, permission_key) DO NOTHING;

-- 4. النطاق
INSERT INTO role_scope_permissions
  (role_key, scope_type, applies_to_all)
VALUES
  ('new_role', 'platform', true)
ON CONFLICT (role_key, scope_type, scope_value) DO NOTHING;
```

---

## 🚀 الخطوات السريعة

1. **حدد اسم الدور** (عربي وإنجليزي)
2. **حدد المفتاح** (role_key بالإنجليزية)
3. **حدد المستوى الهرمي** (1-10)
4. **حدد إعدادات الدخول** (QR, PIN, مدة الجلسة)
5. **حدد الصلاحيات التشغيلية** (ماذا يستطيع أن يفعل)
6. **حدد النطاق** (أين يستطيع أن يعمل)
7. **أنشئ migration وطبقه**

---

هل تحتاج مساعدة في إضافة دور معين؟ أخبرني بالتفاصيل!
