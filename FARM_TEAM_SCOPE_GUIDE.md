# Farm Team Scope System - دليل نظام النطاق للمزارع

## 📋 نظرة عامة

نظام النطاق (Scope System) يربط الموظف تلقائيًا بالمزارع التي يحق له الوصول إليها، بدون الحاجة لاختيار يدوي في كل صفحة.

### أنواع النطاقات

| النطاق | الوصف | من يملكه | الوصول |
|--------|-------|----------|--------|
| **GLOBAL** | وصول كامل لكل شيء | General Manager | جميع المزارع والأقسام |
| **DEPARTMENT** | وصول لقسم كامل | مساعد B2F، المالية، التسويق | جميع مزارع القسم (مثلاً: كل مزارع B2F) |
| **FARM** | وصول لمزارع محددة | مدير مزرعة، مهندس، مشرف، عامل | المزارع المعينة له فقط في `farm_team` |

---

## 🗄️ قاعدة البيانات

### جدول `platform_staff` - حقول جديدة

```sql
scope_type text DEFAULT 'FARM' CHECK (scope_type IN ('GLOBAL', 'DEPARTMENT', 'FARM'))
scope_board text CHECK (scope_board IN ('B2F', 'B2B', 'Finance', 'Marketing', NULL))
```

### Functions

#### 1. `get_staff_scope(staff_id)`
يعيد معلومات النطاق الكاملة:
```typescript
{
  scopeType: 'GLOBAL' | 'DEPARTMENT' | 'FARM',
  scopeBoard: 'B2F' | 'B2B' | 'Finance' | 'Marketing' | null,
  role: string,
  department: string | null,
  farmIds: string[],  // قائمة IDs المزارع المسموح بها
  isGlobal: boolean,
  canAccessAllFarms: boolean
}
```

#### 2. `get_staff_farms(staff_id)`
يعيد قائمة المزارع التي يمكن الوصول إليها:
```typescript
[
  {
    farm_id: string,
    farm_name: string,
    farm_code: string,
    user_role: string,  // دوره في المزرعة
    is_manager: boolean
  }
]
```

#### 3. `check_farm_access(staff_id, farm_id)`
يتحقق من صلاحية الوصول لمزرعة محددة:
```typescript
boolean  // true = لديه صلاحية، false = ليس لديه صلاحية
```

---

## ⚛️ Frontend - الاستخدام

### Hook: `useStaffScope()`

```typescript
import { useStaffScope } from '../hooks/useStaffScope';

function MyComponent() {
  const {
    scope,           // معلومات النطاق الكاملة
    farms,           // قائمة المزارع المتاحة
    loading,
    error,

    // Helper Functions
    canAccessFarm,   // (farmId) => boolean
    checkFarmAccess, // async (farmId) => boolean
    getFarmFilter,   // () => string[] | null (للـ queries)
    isFarmManager,   // (farmId) => boolean
    getFarmRole,     // (farmId) => string | null

    // Quick Access
    isGlobal,        // boolean
    scopeType,       // 'GLOBAL' | 'DEPARTMENT' | 'FARM'
    farmIds,         // string[]
    canAccessAllFarms, // boolean
  } = useStaffScope();

  return (
    // استخدم البيانات هنا
  );
}
```

### أمثلة الاستخدام

#### مثال 1: فلترة قائمة المزارع
```typescript
function FarmsList() {
  const { isGlobal, farmIds } = useStaffScope();
  const [farms, setFarms] = useState([]);

  useEffect(() => {
    const fetchFarms = async () => {
      let query = supabase.from('b2f_farms').select('*');

      // فلترة حسب النطاق
      if (!isGlobal && farmIds.length > 0) {
        query = query.in('id', farmIds);
      }

      const { data } = await query;
      setFarms(data || []);
    };

    fetchFarms();
  }, [isGlobal, farmIds]);

  return (
    <div>
      {farms.map(farm => (
        <FarmCard key={farm.id} farm={farm} />
      ))}
    </div>
  );
}
```

#### مثال 2: التحقق من الوصول قبل عرض زر
```typescript
function FarmActions({ farmId }: { farmId: string }) {
  const { canAccessFarm, isFarmManager } = useStaffScope();

  if (!canAccessFarm(farmId)) {
    return null; // لا يمكن الوصول
  }

  return (
    <div className="flex gap-2">
      <button>عرض التفاصيل</button>

      {isFarmManager(farmId) && (
        <button>تعديل المزرعة</button>
      )}
    </div>
  );
}
```

#### مثال 3: استخدام getFarmFilter في queries
```typescript
function FarmTasksList() {
  const { getFarmFilter } = useStaffScope();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      let query = supabase.from('farm_tasks').select('*');

      const farmFilter = getFarmFilter();
      if (farmFilter) {
        // المستخدم FARM أو DEPARTMENT - فلترة
        query = query.in('farm_id', farmFilter);
      }
      // GLOBAL - لا فلترة

      const { data } = await query;
      setTasks(data || []);
    };

    fetchTasks();
  }, [getFarmFilter]);

  return (
    // عرض المهام
  );
}
```

---

## 🛡️ Route Guard: `FarmScopeGuard`

لحماية صفحات المزارع:

```typescript
import FarmScopeGuard from '../components/guards/FarmScopeGuard';

// في App.tsx
<Route
  path="/admin/b2f/farms/:farmId"
  element={
    <FarmScopeGuard>
      <FarmDetailPage />
    </FarmScopeGuard>
  }
/>

// أو مع خيارات مخصصة
<Route
  path="/admin/b2f/farm-command/:farmId"
  element={
    <FarmScopeGuard
      farmIdParam="farmId"
      redirectTo="/admin/b2f"
      showError={true}
    >
      <FarmCommandPage />
    </FarmScopeGuard>
  }
/>
```

### خصائص `FarmScopeGuard`

| الخاصية | النوع | الافتراضي | الوصف |
|---------|------|----------|-------|
| `farmIdParam` | string | 'farmId' | اسم المعامل في URL |
| `redirectTo` | string | '/admin/my-work' | صفحة التحويل عند رفض الوصول |
| `showError` | boolean | false | عرض رسالة خطأ بدلاً من التحويل |

---

## 🔄 تكامل مع `get_my_work`

الـ function `get_my_work` تم تحديثه ليطبق فلترة النطاق تلقائيًا:

```typescript
const { data } = useMyWork();

// البيانات المرجعة تحتوي على scope
console.log(data.scope);
// {
//   scopeType: 'FARM',
//   farmIds: ['uuid1', 'uuid2'],
//   ...
// }
```

الفلترة تطبق على:
- ✅ `farm_tasks` - المهام الزراعية
- ✅ `decision_queue` - قائمة القرارات
- ✅ `farm_expenses` - المصروفات
- ✅ Approvals - الموافقات
- ✅ Alerts - التنبيهات

---

## 📝 سيناريوهات الاختبار

### 1. General Manager (GLOBAL)
```typescript
// GM يجب أن يرى كل شيء
scope.scopeType === 'GLOBAL'
scope.isGlobal === true
scope.canAccessAllFarms === true
canAccessFarm(anyFarmId) === true
```

### 2. مدير المزارع الوطني (DEPARTMENT: B2F)
```typescript
// يرى جميع مزارع B2F
scope.scopeType === 'DEPARTMENT'
scope.scopeBoard === 'B2F'
scope.canAccessAllFarms === true
farms.length === (عدد جميع مزارع B2F)
```

### 3. مدير مزرعة (FARM)
```typescript
// يرى مزرعته فقط
scope.scopeType === 'FARM'
scope.farmIds.length === 1  // (أو أكثر إذا كان مدير عدة مزارع)
canAccessFarm(hisFarmId) === true
canAccessFarm(otherFarmId) === false
isFarmManager(hisFarmId) === true
```

### 4. مهندس/مشرف مزرعة (FARM)
```typescript
// يرى مزرعته فقط
scope.scopeType === 'FARM'
scope.farmIds.includes(hisFarmId) === true
isFarmManager(hisFarmId) === false
getFarmRole(hisFarmId) === 'engineer' | 'supervisor'
```

---

## 🔧 إعداد النطاق للموظفين

### إعداد GM (تلقائي)
```sql
-- GM تلقائياً GLOBAL
UPDATE platform_staff
SET scope_type = 'GLOBAL', scope_board = NULL
WHERE role = 'general_manager';
```

### إعداد مدير المزارع الوطني
```sql
UPDATE platform_staff
SET scope_type = 'DEPARTMENT', scope_board = 'B2F'
WHERE staff_name = 'مدير المزارع الوطني';
```

### إعداد مدير مزرعة
```sql
-- 1. تعيين النطاق في platform_staff
UPDATE platform_staff
SET scope_type = 'FARM'
WHERE id = 'staff-uuid';

-- 2. إضافة للمزرعة في farm_team
INSERT INTO farm_team (user_id, farm_id, role, is_active)
VALUES ('staff-uuid', 'farm-uuid', 'farm_manager', true);
```

### إعداد مهندس/مشرف
```sql
-- مثل مدير المزرعة، لكن مع role مختلف
INSERT INTO farm_team (user_id, farm_id, role, is_active)
VALUES ('staff-uuid', 'farm-uuid', 'engineer', true);
-- أو 'supervisor', 'worker', 'factory_supervisor'
```

---

## ⚠️ ملاحظات مهمة

1. **GM دائماً GLOBAL**: لا يمكن تغيير scope_type للـ GM
2. **farm_team هو المرجع**: للموظفين من نوع FARM، البيانات تأتي من `farm_team`
3. **النطاق الافتراضي**: إذا لم يتم تعيين scope_type، الافتراضي هو 'FARM'
4. **التحديث التلقائي**: `get_my_work` تطبق الفلترة تلقائياً بناءً على النطاق
5. **الأمان**: جميع الـ functions تستخدم `SECURITY DEFINER` للتحقق الآمن

---

## 🚀 الصفحات المتأثرة

الصفحات التالية تطبق فلترة النطاق تلقائياً:

- ✅ `/admin/my-work` - صفحة العمل
- ✅ `/admin/b2f/farm-command` - مركز قيادة المزارع
- ✅ `/admin/b2f/farms/:farmId` - تفاصيل المزرعة
- ✅ `/admin/tasks/:taskType/:taskId` - تفاصيل المهمة
- ✅ Farm Expenses - المصروفات
- ✅ Decision Queue - قائمة القرارات
- ✅ Farm Operations - العمليات الزراعية

---

## 📚 الملفات ذات الصلة

### قاعدة البيانات
- `supabase/migrations/create_staff_scope_system.sql`

### Frontend
- `src/hooks/useStaffScope.ts` - Hook أساسي
- `src/hooks/useMyWork.ts` - محدث مع scope
- `src/components/guards/FarmScopeGuard.tsx` - Route Guard

### Documentation
- `FARM_TEAM_SCOPE_GUIDE.md` (هذا الملف)

---

تم التطبيق بنجاح ✅
