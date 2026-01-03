# 🔐 نظام صلاحيات Root Access - التوثيق الكامل

## نظرة عامة

تم تطبيق نظام صلاحيات مطلقة (Root Access) لصاحب المنصة/المدير العام بنجاح. هذا النظام يعطي صلاحيات كاملة بدون أي قيود أو فلاتر.

---

## ✅ ما تم تنفيذه

### 1. قاعدة البيانات (Database Layer)

#### أ) الحقول المضافة
- **profiles.is_platform_owner** (boolean)
  - القيمة الافتراضية: `false`
  - يتم تعيينها لـ `true` لصاحب المنصة فقط

- **profiles.current_plan_type** (text)
  - القيم: `free`, `silver`, `gold`, `premium`, `vip`
  - تم إصلاحها لتجنب أخطاء الإدراج

#### ب) الدوال (Functions)

**`is_platform_owner()`**
```sql
-- التحقق من كون المستخدم الحالي صاحب المنصة
RETURNS boolean
-- يتحقق من:
-- 1. is_platform_owner = true
-- 2. user_type IN ('platform_owner', 'general_manager')
```

**`is_user_platform_owner(user_uuid)`**
```sql
-- التحقق من كون مستخدم معين صاحب المنصة
RETURNS boolean
```

**`log_platform_owner_action(...)`**
```sql
-- تسجيل جميع إجراءات صاحب المنصة في audit_logs
RETURNS uuid (معرف السجل)
-- يضيف: is_root_access: true إلى التغييرات
```

**`has_admin_access()`**
```sql
-- التحقق من صلاحيات الإدارة
-- صاحب المنصة = true مباشرة
-- باقي المستخدمين يتم فحصهم من platform_administrators
```

**`has_b2f_access()`**
```sql
-- التحقق من صلاحيات B2F
-- صاحب المنصة = true مباشرة
-- باقي المستخدمين يتم فحصهم من platform_staff
```

**`has_b2b_access()`**
```sql
-- التحقق من صلاحيات B2B
-- صاحب المنصة = true مباشرة
-- باقي المستخدمين يتم فحصهم من platform_staff
```

#### ج) سياسات RLS

تم إضافة سياسة "Platform owner full access" على جميع الجداول المهمة:
- ✅ b2f_farms
- ✅ platform_staff
- ✅ roles_catalog
- ✅ auctions
- ✅ profiles
- ✅ subscription_plans
- ✅ user_subscriptions
- ✅ notifications
- ✅ wallets
- ✅ transactions
- ✅ dashboard_sections
- ✅ categories
- ✅ farm_team
- ✅ bids
- ✅ chat_messages
- ✅ user_favorites
- ✅ user_followers
- ✅ وجميع الجداول الأخرى

**صيغة السياسة:**
```sql
CREATE POLICY "Platform owner full access"
ON table_name FOR ALL
USING (is_platform_owner())
WITH CHECK (is_platform_owner());
```

---

### 2. Frontend Layer

#### أ) Context (AuthContext)
تم تحديث `AuthContext.tsx` لتتبع حالة Root Access:

```typescript
interface AuthContextType {
  // ... باقي الحقول
  isPlatformOwner: boolean;
  hasRootAccess: boolean;
}
```

- يتم التحقق تلقائياً عند تحميل الملف الشخصي
- `hasRootAccess` = نفس قيمة `isPlatformOwner`

#### ب) Custom Hook
**`usePlatformOwner.ts`**
```typescript
export function usePlatformOwner() {
  return {
    isPlatformOwner,
    loading,
    logRootAction,
    hasRootAccess
  };
}
```

#### ج) Components

**`RootAccessBadge.tsx`** - شارة مرئية
```tsx
<div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600">
  <Shield /> صلاحيات مطلقة (Root Access)
</div>
```

**تم التكامل مع:**
1. ✅ Header.tsx - يظهر في الهيدر
2. ✅ PlatformCommandCenterV2.tsx - يظهر في لوحة القيادة
3. ✅ يمكن إضافته في أي مكان حسب الحاجة

---

## 🎯 كيفية الاستخدام

### التحقق من الصلاحيات في Frontend

```typescript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { isPlatformOwner, hasRootAccess } = useAuth();

  if (isPlatformOwner) {
    // عرض كل شيء بدون قيود
    return <FullAccessView />;
  }

  // عرض محدود للمستخدمين العاديين
  return <LimitedView />;
}
```

### تسجيل الإجراءات الحساسة

```typescript
import { usePlatformOwner } from './hooks/usePlatformOwner';

function AdminPanel() {
  const { logRootAction } = usePlatformOwner();

  const handleDeleteFarm = async (farmId: string) => {
    // حذف المزرعة
    await supabase.from('b2f_farms').delete().eq('id', farmId);

    // تسجيل الإجراء
    await logRootAction(
      'delete_farm',
      'farm',
      farmId,
      { farm_name: 'اسم المزرعة' },
      { reason: 'سبب الحذف' }
    );
  };
}
```

### التحقق في Backend (RPC Functions)

```sql
CREATE FUNCTION my_sensitive_function()
RETURNS void AS $$
BEGIN
  -- التحقق من الصلاحيات
  IF NOT is_platform_owner() THEN
    RAISE EXCEPTION 'غير مصرح - يتطلب صلاحيات مطلقة';
  END IF;

  -- تنفيذ العملية
  -- ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📋 الحسابات الحالية

تم تعيين الحسابات التالية كأصحاب منصة:

| الاسم | رقم الهاتف | is_platform_owner |
|------|------------|------------------|
| مدير النظام | 0500000000 | ✅ true |
| المسؤول الرئيسي | 0511111110 | ✅ true |

---

## 🔍 التدقيق والأمان

### تسجيل الإجراءات

جميع إجراءات صاحب المنصة تُسجل في `platform_audit_logs` مع:
- ✅ نوع الإجراء (action_type)
- ✅ الهدف (target_type, target_id)
- ✅ التغييرات (changes + is_root_access: true)
- ✅ البيانات الوصفية (metadata + timestamp)
- ✅ معرف المنفذ (performed_by)

### عرض سجلات التدقيق

```typescript
// في لوحة الإدارة
const { data: auditLogs } = await supabase
  .from('platform_audit_logs')
  .select('*')
  .order('created_at', { ascending: false });

// فلترة إجراءات Root فقط
const rootActions = auditLogs.filter(log =>
  log.changes?.is_root_access === true
);
```

---

## 🧪 اختبار النظام

### 1. تسجيل الدخول كصاحب المنصة
```
رقم الهاتف: 0500000000
(استخدام نظام المصادقة الحالي)
```

### 2. التحقق من الشارة
- ✅ يجب أن تظهر شارة "صلاحيات مطلقة" في:
  - الهيدر (Header)
  - لوحة قيادة المنصة (Command Center)

### 3. اختبار الصلاحيات
- ✅ الوصول لجميع الأقسام بدون قيود:
  - بوابة الإدارة العليا
  - بوابة B2F
  - بوابة B2B
  - الهيكل التنظيمي
  - كل الإعدادات

- ✅ إجراءات حساسة:
  - إضافة/تعديل/حذف مزارع
  - إيقاف/تفعيل موظفين
  - تعديل الأدوار والصلاحيات
  - الوصول لكل البيانات المالية

### 4. التحقق من التسجيل
```sql
-- عرض آخر 10 إجراءات لصاحب المنصة
SELECT
  action_type,
  target_type,
  changes->>'is_root_access' as is_root,
  created_at
FROM platform_audit_logs
WHERE performed_by = 'USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚀 الميزات الرئيسية

### ✅ الصلاحيات المطلقة تشمل:

1. **الوصول الكامل**
   - جميع الأقسام والبوابات
   - كل البيانات بدون فلاتر
   - كل الإعدادات والتحكم

2. **تجاوز القيود**
   - لا فحص للـ Scope
   - لا فحص للقسم
   - لا فحص للتسلسل الهرمي
   - لا بوابات اختيار

3. **الإدارة الكاملة**
   - إضافة/تعديل/حذف أي شيء
   - إيقاف/تفعيل موظفين
   - تعديل الهيكل التنظيمي
   - الوصول للبيانات المالية

4. **الأمان والشفافية**
   - تسجيل كامل لكل إجراء
   - علامة واضحة في السجلات
   - تتبع دقيق للتغييرات

---

## ⚠️ ملاحظات مهمة

1. **الحسابات المحمية**
   - لا يمكن حذف أو إيقاف حساب صاحب المنصة
   - يجب تعيين صاحب منصة بديل قبل الحذف

2. **الفصل الواضح**
   - باقي المستخدمين مقيدين بسياساتهم
   - الموظفين لا يتأثرون بنظام Root
   - كل فريق له صلاحياته المحددة

3. **التوثيق الإلزامي**
   - كل إجراء حساس يُسجل
   - السجلات محمية ولا يمكن حذفها
   - عرض واضح لإجراءات Root

4. **الأداء**
   - الدوال محسّنة بـ SECURITY DEFINER
   - Indexes على الحقول المهمة
   - لا تأثير على الأداء

---

## 📝 الخلاصة

✅ **النظام مكتمل ويعمل بكفاءة**
- قاعدة البيانات: سياسات RLS شاملة
- Backend: دوال محسّنة وآمنة
- Frontend: تكامل كامل مع الواجهات
- التدقيق: تسجيل شامل لكل إجراء

🎯 **صاحب المنصة = Root Access الكامل**
- لا قيود ولا فلاتر
- وصول مطلق لكل شيء
- تسجيل كامل للشفافية
