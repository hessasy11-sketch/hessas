# Farm Team Scope - ملخص التطبيق

## ✅ ما تم تنفيذه

تم تطبيق نظام نطاق شامل يربط الموظف تلقائياً بالمزارع التي يحق له الوصول إليها.

---

## 📦 المكونات المطورة

### 1. قاعدة البيانات ✅

**ملف:** `supabase/migrations/create_staff_scope_system.sql`

#### أ. حقول جديدة في `platform_staff`
```sql
scope_type text DEFAULT 'FARM'  -- GLOBAL | DEPARTMENT | FARM
scope_board text                 -- B2F | B2B | Finance | Marketing | NULL
```

#### ب. Functions جديدة

1. **`get_staff_scope(staff_id)`**
   - يعيد معلومات النطاق الكاملة
   - يتضمن: scopeType, scopeBoard, role, farmIds, isGlobal, canAccessAllFarms

2. **`get_staff_farms(staff_id)`**
   - يعيد قائمة المزارع المتاحة
   - يتضمن: farm details + user role + is_manager flag

3. **`check_farm_access(staff_id, farm_id)`**
   - يتحقق من صلاحية الوصول لمزرعة محددة
   - يعيد true/false

#### ج. تحديث `get_my_work()`
- تطبيق فلترة تلقائية حسب النطاق على:
  - farm_tasks
  - decision_queue
  - farm_expenses
  - approvals
  - alerts
- إضافة `scope` object في النتيجة المرجعة

---

### 2. Frontend Hooks ✅

#### أ. Hook جديد: `useStaffScope`

**ملف:** `src/hooks/useStaffScope.ts`

```typescript
const {
  scope,              // معلومات النطاق الكاملة
  farms,              // قائمة المزارع المتاحة
  loading,
  error,

  // Helper Functions
  canAccessFarm,      // (farmId) => boolean
  checkFarmAccess,    // async (farmId) => boolean
  getFarmFilter,      // () => string[] | null
  isFarmManager,      // (farmId) => boolean
  getFarmRole,        // (farmId) => string | null

  // Quick Access
  isGlobal,
  scopeType,
  farmIds,
  canAccessAllFarms,
} = useStaffScope();
```

**الميزات:**
- ✅ يحدد نطاق الموظف تلقائياً
- ✅ يجلب قائمة المزارع المتاحة
- ✅ يوفر helper functions للتحقق من الصلاحيات
- ✅ يدعم الأنواع الثلاثة: GLOBAL, DEPARTMENT, FARM

#### ب. Hook محدث: `useMyWork`

**ملف:** `src/hooks/useMyWork.ts`

**التحديثات:**
- ✅ إضافة interface `StaffScope`
- ✅ إضافة `scope` في `MyWorkData`
- ✅ تضمين `scope` في البيانات المرجعة من API

---

### 3. Route Guard محدث ✅

**ملف:** `src/components/guards/FarmScopeGuard.tsx`

**التحديثات الرئيسية:**
- ✅ استخدام `useStaffScope` بدلاً من query مباشر
- ✅ دعم الأنواع الثلاثة للنطاق
- ✅ التحقق من `check_farm_access` RPC
- ✅ رسائل خطأ محسنة
- ✅ خيار `showError` لعرض رسالة بدلاً من التحويل

**الاستخدام:**
```tsx
<Route path="/admin/b2f/farms/:farmId" element={
  <FarmScopeGuard>
    <FarmDetailPage />
  </FarmScopeGuard>
} />
```

---

## 🎯 أنواع النطاقات المطبقة

### 1. GLOBAL (عام)
- **من:** General Manager
- **الوصول:** جميع المزارع والأقسام بدون فلترة
- **التطبيق:** تلقائي لكل من `role = 'general_manager'`

### 2. DEPARTMENT (قسم)
- **من:** مدير المزارع الوطني، مساعد B2F/B2B، المالية، التسويق
- **الوصول:** جميع مزارع القسم (مثلاً: كل مزارع B2F)
- **التطبيق:** يدوي عبر `scope_type = 'DEPARTMENT'` و `scope_board = 'B2F'`

### 3. FARM (مزرعة)
- **من:** مدير مزرعة، مهندس، مشرف، عامل
- **الوصول:** المزارع المعينة له في `farm_team` فقط
- **التطبيق:** تلقائي (default) + ربط في `farm_team`

---

## 🔄 تدفق العمل

### عند تسجيل الدخول:
1. النظام يستدعي `get_staff_scope(staff_id)`
2. يحدد نوع النطاق (GLOBAL/DEPARTMENT/FARM)
3. يجلب قائمة المزارع المتاحة
4. يحفظ المعلومات في state

### عند فتح صفحة:
1. إذا كانت صفحة محمية بـ `FarmScopeGuard`:
   - يتحقق من `farmId` في URL
   - يستدعي `check_farm_access(staff_id, farm_id)`
   - يسمح/يرفض الوصول

2. إذا كانت صفحة قائمة (list):
   - يستخدم `getFarmFilter()` للفلترة
   - GLOBAL → لا فلترة
   - DEPARTMENT → جميع مزارع القسم
   - FARM → farmIds المعينة

### عند جلب البيانات:
1. `get_my_work()` تطبق الفلترة تلقائياً
2. Queries الأخرى تستخدم `getFarmFilter()` للفلترة اليدوية

---

## 📝 أمثلة الاستخدام

### مثال 1: فلترة قائمة المزارع
```typescript
function FarmsList() {
  const { isGlobal, farmIds } = useStaffScope();
  const [farms, setFarms] = useState([]);

  useEffect(() => {
    const fetchFarms = async () => {
      let query = supabase.from('b2f_farms').select('*');

      if (!isGlobal && farmIds.length > 0) {
        query = query.in('id', farmIds);
      }

      const { data } = await query;
      setFarms(data || []);
    };

    fetchFarms();
  }, [isGlobal, farmIds]);

  return (/* ... */);
}
```

### مثال 2: عرض أزرار حسب الصلاحية
```typescript
function FarmActions({ farmId }) {
  const { canAccessFarm, isFarmManager } = useStaffScope();

  if (!canAccessFarm(farmId)) return null;

  return (
    <div>
      <button>عرض التفاصيل</button>
      {isFarmManager(farmId) && (
        <button>تعديل</button>
      )}
    </div>
  );
}
```

### مثال 3: حماية صفحة
```tsx
<Route path="/admin/b2f/farms/:farmId" element={
  <FarmScopeGuard>
    <FarmDetailPage />
  </FarmScopeGuard>
} />
```

---

## 🔧 إعداد النطاقات

### إعداد GM (تلقائي)
```sql
-- GM تلقائياً GLOBAL
UPDATE platform_staff
SET scope_type = 'GLOBAL'
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
-- 1. تعيين النطاق
UPDATE platform_staff
SET scope_type = 'FARM'
WHERE id = 'staff-uuid';

-- 2. ربطه بالمزرعة
INSERT INTO farm_team (user_id, farm_id, role, is_active)
VALUES ('staff-uuid', 'farm-uuid', 'farm_manager', true);
```

---

## 📊 الصفحات المتأثرة

الصفحات التالية تطبق فلترة النطاق تلقائياً:

### صفحات محمية بـ Guard:
- ✅ `/admin/b2f/farms/:farmId` - تفاصيل المزرعة
- ✅ `/admin/b2f/farm-command/:farmId` - مركز قيادة المزرعة

### صفحات تطبق الفلترة:
- ✅ `/admin/my-work` - صفحة العمل (via `get_my_work`)
- ✅ `/admin/tasks/:taskType/:taskId` - تفاصيل المهمة
- ✅ Farm Tasks - المهام الزراعية
- ✅ Farm Expenses - المصروفات
- ✅ Decision Queue - قائمة القرارات

---

## 🧪 اختبار النظام

### سيناريوهات الاختبار الأساسية:

1. **GM يرى الجميع** ✅
   - `scopeType = 'GLOBAL'`
   - `isGlobal = true`
   - `canAccessFarm(anyFarmId) = true`

2. **مدير المزارع الوطني يرى جميع B2F** ✅
   - `scopeType = 'DEPARTMENT'`
   - `scopeBoard = 'B2F'`
   - `canAccessAllFarms = true`

3. **مدير مزرعة يرى مزرعته فقط** ✅
   - `scopeType = 'FARM'`
   - `farmIds = ['his-farm-id']`
   - `isFarmManager(hisFarmId) = true`

4. **مهندس يرى مزرعته فقط** ✅
   - `scopeType = 'FARM'`
   - `getFarmRole(hisFarmId) = 'engineer'`
   - `isFarmManager(hisFarmId) = false`

---

## 📚 الملفات المطورة

### قاعدة البيانات:
- `supabase/migrations/create_staff_scope_system.sql`

### Frontend:
- `src/hooks/useStaffScope.ts` (جديد)
- `src/hooks/useMyWork.ts` (محدث)
- `src/components/guards/FarmScopeGuard.tsx` (محدث)

### Documentation:
- `FARM_TEAM_SCOPE_GUIDE.md` - دليل شامل
- `FARM_SCOPE_TESTING.md` - دليل الاختبار
- `FARM_SCOPE_IMPLEMENTATION_SUMMARY.md` (هذا الملف)

---

## ⚡ الأداء

### قبل:
- كل صفحة تحتاج استعلام منفصل للتحقق من الصلاحيات
- فلترة في Frontend (غير آمن)
- queries متكررة

### بعد:
- استعلام واحد عند التسجيل (`get_staff_scope`)
- فلترة في SQL (آمن)
- النتائج محفوظة في state
- `get_my_work` يطبق الفلترة تلقائياً

---

## 🔒 الأمان

### نقاط القوة:
- ✅ جميع الـ functions تستخدم `SECURITY DEFINER`
- ✅ الفلترة تطبق في SQL (ليس في Frontend)
- ✅ GM لا يمكن تغيير scope_type له
- ✅ `check_farm_access` RPC للتحقق الآمن
- ✅ Route Guard يمنع الوصول غير المصرح

---

## 🚀 الخطوات التالية (اختيارية)

### تحسينات مستقبلية:
1. إضافة نطاق REGION للمناطق الجغرافية
2. نظام صلاحيات دقيق داخل المزرعة (CRUD permissions)
3. تتبع تاريخ التعيينات في farm_team
4. Dashboard لإدارة النطاقات بصرياً

---

## ✅ حالة التطبيق

- ✅ قاعدة البيانات: تم التطبيق
- ✅ Frontend Hooks: تم التطبيق
- ✅ Route Guards: تم التحديث
- ✅ Documentation: تم الإنشاء
- ✅ Build: ناجح (15.23s)

---

## 📞 للدعم

راجع الملفات:
- `FARM_TEAM_SCOPE_GUIDE.md` - للاستخدام
- `FARM_SCOPE_TESTING.md` - للاختبار

---

**تم التطبيق بنجاح** ✅
**التاريخ:** 2026-01-06
**Build Time:** 15.23s
**Modules:** 1792
