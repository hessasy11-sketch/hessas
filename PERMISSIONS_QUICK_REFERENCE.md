# 📌 دليل الصلاحيات السريع

## 🔑 مفتاح الصلاحية (Permission Key)

**التعريف**: هو معرف فريد بالإنجليزية يحدد نوع الصلاحية

**قواعد التسمية**:
- ✅ إنجليزي فقط: `manage_farms`
- ✅ أحرف صغيرة: `manage_tasks`
- ✅ استخدم `_` للفصل: `financial_reports`
- ❌ لا مسافات: ~~`manage tasks`~~
- ❌ لا أحرف كبيرة: ~~`ManageFarms`~~
- ❌ لا عربي: ~~`ادارة_المزارع`~~

---

## 📋 الجداول الأربعة

| الجدول | الوظيفة | مثال |
|--------|---------|------|
| `role_definitions` | تعريف الدور | `role_key: 'farm_manager'` |
| `role_access_settings` | إعدادات الدخول | `requires_qr: true, requires_pin: true` |
| `role_operational_permissions` | الصلاحيات التشغيلية | `can_create: true, can_approve: true` |
| `role_scope_permissions` | النطاق | `scope_type: 'platform', applies_to_all: true` |

---

## ⚡ إضافة دور جديد (4 خطوات)

```sql
-- 1. التعريف
INSERT INTO role_definitions (role_key, role_name_ar, role_name_en, hierarchy_level)
VALUES ('new_role', 'اسم الدور', 'Role Name', 7);

-- 2. إعدادات الدخول
INSERT INTO role_access_settings (role_key, requires_qr, requires_pin, session_duration_minutes)
VALUES ('new_role', true, true, 30);

-- 3. الصلاحيات
INSERT INTO role_operational_permissions (role_key, permission_key, permission_name_ar, permission_category, can_create, can_view, can_approve)
VALUES ('new_role', 'manage_something', 'إدارة شيء', 'category', true, true, true);

-- 4. النطاق
INSERT INTO role_scope_permissions (role_key, scope_type, applies_to_all)
VALUES ('new_role', 'platform', true);
```

---

## 🎯 الصلاحيات التشغيلية (10 أنواع)

| الصلاحية | الاسم | الوصف |
|---------|-------|-------|
| `can_create` | إنشاء | إنشاء سجلات جديدة |
| `can_view` | عرض | قراءة/عرض البيانات |
| `can_edit` | تعديل | تعديل السجلات |
| `can_delete` | حذف | حذف السجلات |
| `can_approve` | اعتماد | الموافقة على الطلبات |
| `can_reject` | رفض | رفض الطلبات |
| `can_assign` | تعيين | تعيين المهام للآخرين |
| `can_upload_proof` | رفع إثبات | رفع مستندات وإثباتات |
| `can_review_reports` | مراجعة تقارير | مراجعة التقارير |
| `can_send_to_management` | إرسال للإدارة | إرسال للإدارة العليا |

---

## 🏢 فئات الصلاحيات (Categories)

```
users       → إدارة المستخدمين
roles       → إدارة الأدوار
farms       → إدارة المزارع
operations  → إدارة العمليات
tasks       → إدارة المهام
reports     → إدارة التقارير
auctions    → إدارة المزادات
finance     → الشؤون المالية
team        → إدارة الفريق
inventory   → إدارة المخزون
supplies    → إدارة الإمدادات
general     → عام
```

---

## 🎭 المستوى الهرمي (Hierarchy)

```
1  → platform_owner      (أعلى صلاحية)
2  → super_admin
3  → general_manager
4  → section_manager
5  → farm_manager
6  → farm_supervisor
7  → operations_supervisor
8  → task_executor
9  → viewer
10 → (أقل صلاحية)
```

**القاعدة**: كلما قل الرقم، زادت الصلاحيات

---

## 🔐 إعدادات الدخول

| الإعداد | القيم | الوصف |
|--------|------|-------|
| `requires_qr` | true/false | يحتاج QR للدخول؟ |
| `requires_pin` | true/false | يحتاج PIN للأمان؟ |
| `qr_type` | permanent/temporary/both | نوع QR |
| `session_duration_minutes` | 30/45/60 | مدة الجلسة |
| `allow_multi_device` | true/false | أجهزة متعددة؟ |

---

## 🌍 النطاق (Scope)

| نوع النطاق | الوصف | مثال |
|-----------|-------|------|
| `platform` | المنصة كاملة | الوصول لكل شيء |
| `section` | قسم محدد | `scope_value: 'b2f'` |
| `farm` | مزرعة محددة | `scope_value: 'farm_id_123'` |
| `auction` | مزاد محدد | `scope_value: 'auction_id_456'` |

---

## 💻 الاستخدام في الكود (سريع)

### 1. التحقق من صلاحية واحدة

```typescript
const { data } = await supabase.rpc('check_role_permission', {
  p_role_key: 'farm_manager',
  p_permission_key: 'manage_farms',
  p_action: 'create'
});

if (data) {
  // لديه صلاحية الإنشاء
}
```

### 2. الحصول على كل الصلاحيات

```typescript
const { data } = await supabase.rpc('get_role_full_permissions', {
  p_role_key: 'farm_manager'
});

console.log(data);
// {
//   definition: {...},
//   access_settings: {...},
//   operational_permissions: [...],
//   scope_permissions: [...]
// }
```

### 3. في Component (React)

```typescript
import { usePermissions } from '../hooks/usePermissions';

function MyComponent() {
  const { can } = usePermissions();

  return (
    <div>
      {can('manage_farms', 'create') && (
        <button>إنشاء مزرعة</button>
      )}

      {can('manage_farms', 'edit') && (
        <button>تعديل</button>
      )}

      {can('manage_farms', 'delete') && (
        <button>حذف</button>
      )}
    </div>
  );
}
```

---

## 🎨 أمثلة على مفاتيح الصلاحيات

```
manage_users           → إدارة المستخدمين
manage_roles           → إدارة الأدوار
manage_farms           → إدارة المزارع
manage_operations      → إدارة العمليات
manage_tasks           → إدارة المهام
manage_reports         → إدارة التقارير
manage_auctions        → إدارة المزادات
manage_payments        → إدارة المدفوعات
manage_invoices        → إدارة الفواتير
manage_inventory       → إدارة المخزون
manage_team            → إدارة الفريق
view_data             → عرض البيانات
execute_tasks         → تنفيذ المهام
approve_payments      → اعتماد المدفوعات
financial_reports     → التقارير المالية
review_receipts       → مراجعة الإيصالات
```

---

## ✅ نصائح سريعة

1. **الأدوار المالية والإدارية**: يجب أن يكون `requires_pin = true`

2. **الأدوار الحساسة**: جلسة قصيرة (30-45 دقيقة)

3. **التسلسل الهرمي**: تأكد من أن المستوى الهرمي منطقي

4. **النطاق**: حدده بوضوح (platform/section/farm)

5. **الأمان**: التحقق على 3 مستويات (Frontend + Backend + Database)

---

## 📂 الملفات المرجعية

- `PERMISSIONS_SYSTEM_GUIDE.md` → شرح مفصل للنظام
- `EXAMPLE_ADD_NEW_ROLE.sql` → مثال عملي كامل
- `PERMISSIONS_IN_CODE_GUIDE.md` → كيفية الاستخدام في الكود

---

## 🔍 التحقق من النجاح

```sql
-- التحقق من التعريف
SELECT * FROM role_definitions WHERE role_key = 'your_role';

-- التحقق من الصلاحيات
SELECT * FROM role_operational_permissions WHERE role_key = 'your_role';

-- الحصول على كل شيء
SELECT * FROM get_role_full_permissions('your_role');
```

---

## 🆘 مشاكل شائعة وحلولها

| المشكلة | السبب | الحل |
|---------|-------|-----|
| `role_key already exists` | المفتاح مكرر | استخدم مفتاح فريد |
| `foreign key violation` | الدور غير موجود | أنشئ الدور في `role_definitions` أولاً |
| `permission denied` | RLS يمنع | استخدم حساب admin أو `service_role` |

---

## 📞 تواصل

للمساعدة أو الاستفسار، راجع الملفات المرجعية أو اسأل المطور!
