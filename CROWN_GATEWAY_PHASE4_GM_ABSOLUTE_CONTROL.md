# بوابة الدخول الذكية - المرحلة 4: صلاحية المدير العام المطلقة + وضع المراقبة

## 🎯 هدف المرحلة

```
GM يدخل كل لوحات المنصة بدون حدود (Absolute Access)
GM يقدر يشوف لوحة أي موظف "كما يراها الموظف" (View-As)
بدون تغيير الجلسة الأساسية
مع تسجيل كامل لجميع الأحداث
```

---

## ✅ ما تم تنفيذه في المرحلة 4

### 1️⃣ Absolute GM Access (Bypass كامل)

**المبدأ:**
- GM له وصول مطلق لكل المسارات الإدارية
- لا Guards تمنعه
- لا قيود صلاحية
- لا Redirect

**التطبيق:**
- ✅ موجود بالفعل في `GatewayGuard` (خطوة 6)
- GM Bypass يعمل على جميع المسارات

```typescript
// 6. إذا كان GM: سماح فوري
if (userIsGM) {
  setChecking(false);
  return;
}
```

---

### 2️⃣ View-As System (وضع المراقبة)

**المسار:** `/admin/settings/gm-control`

**الفكرة:**
- GM يبقى GM
- لكن يقدر مؤقتًا يعرض الواجهة كموظف آخر
- هذا "عرض" وليس "تنفيذ"

---

## 📊 النظام الكامل

### Architecture (البنية):

```
┌─────────────────────────────────────────────┐
│         ImpersonationProvider               │
│  (Context عام في كل التطبيق)               │
│                                             │
│  - isActive: boolean                        │
│  - targetStaffId: string                    │
│  - targetStaffName: string                  │
│  - targetRole: string                       │
│  - targetDepartment: string                 │
│  - startedAt: timestamp                     │
│                                             │
│  Functions:                                 │
│  - startImpersonation()                     │
│  - stopImpersonation()                      │
└─────────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌──────────────────┐   ┌──────────────────┐
│  ViewAsBanner    │   │  GMControlPanel  │
│  (شريط ثابت)    │   │  (لوحة تحكم)    │
│                  │   │                  │
│  - Target info   │   │  - Staff list    │
│  - Duration      │   │  - Active        │
│  - Stop button   │   │  - Logs          │
└──────────────────┘   └──────────────────┘
```

---

## 🗄️ Database Schema

### Table: executive_impersonation_logs

```sql
CREATE TABLE executive_impersonation_logs (
  id uuid PRIMARY KEY,
  gm_id uuid NOT NULL,
  action text NOT NULL,  -- 'started' | 'stopped'
  target_staff_id uuid,
  target_staff_name text,
  current_path text,
  created_at timestamptz
);
```

**الحقول:**

| حقل | نوع | وصف |
|-----|-----|-----|
| id | uuid | معرف السجل |
| gm_id | uuid | معرف GM |
| action | text | started أو stopped |
| target_staff_id | uuid | معرف الموظف المستهدف |
| target_staff_name | text | اسم الموظف |
| current_path | text | المسار الحالي |
| created_at | timestamptz | وقت الحدث |

---

### Functions:

#### 1. get_impersonation_logs()

**الوظيفة:** جلب سجلات View-As

**المدخلات:**
- `p_gm_id` (uuid) - اختياري: معرف GM محدد
- `p_limit` (int) - اختياري: عدد السجلات (افتراضي 50)

**المخرجات:**
```typescript
{
  id: uuid,
  gm_id: uuid,
  action: 'started' | 'stopped',
  target_staff_id: uuid,
  target_staff_name: string,
  current_path: string,
  created_at: timestamp
}[]
```

**الاستعلام:**
```sql
SELECT * FROM executive_impersonation_logs
WHERE (p_gm_id IS NULL OR gm_id = p_gm_id)
ORDER BY created_at DESC
LIMIT p_limit;
```

---

#### 2. get_active_impersonations()

**الوظيفة:** جلب جلسات View-As النشطة

**المنطق:**
- يبحث عن `started` بدون `stopped` مقابل
- يحسب المدة بالدقائق

**المدخلات:**
- `p_gm_id` (uuid) - اختياري

**المخرجات:**
```typescript
{
  gm_id: uuid,
  target_staff_id: uuid,
  target_staff_name: string,
  started_at: timestamp,
  duration_minutes: int
}[]
```

**الاستعلام:**
```sql
WITH starts AS (
  SELECT * FROM executive_impersonation_logs
  WHERE action = 'started'
),
stops AS (
  SELECT * FROM executive_impersonation_logs
  WHERE action = 'stopped'
)
SELECT
  s.gm_id,
  s.target_staff_id,
  s.target_staff_name,
  s.created_at as started_at,
  EXTRACT(EPOCH FROM (now() - s.created_at))::int / 60 as duration_minutes
FROM starts s
LEFT JOIN stops st ON (
  st.gm_id = s.gm_id
  AND st.target_staff_id = s.target_staff_id
  AND st.created_at > s.created_at
)
WHERE st.created_at IS NULL;
```

---

## 🎨 المكونات (Components)

### 1. ImpersonationContext

**الملف:** `src/contexts/ImpersonationContext.tsx`

**الوظيفة:** Context عام لإدارة حالة View-As

#### State:

```typescript
interface ImpersonationState {
  isActive: boolean;
  targetStaffId: string | null;
  targetStaffName: string | null;
  targetRole: string | null;
  targetDepartment: string | null;
  startedAt: string | null;
}
```

#### Functions:

**startImpersonation():**
```typescript
const startImpersonation = async (
  staffId: string,
  staffName: string,
  role?: string,
  department?: string
) => {
  // 1. التحقق من GM
  if (!isGM) return;

  // 2. تفعيل الحالة
  setImpersonation({
    isActive: true,
    targetStaffId: staffId,
    targetStaffName: staffName,
    targetRole: role,
    targetDepartment: department,
    startedAt: new Date().toISOString()
  });

  // 3. تسجيل في DB
  await logImpersonationEvent('started', staffId, staffName);
};
```

**stopImpersonation():**
```typescript
const stopImpersonation = async () => {
  // 1. تسجيل الإيقاف
  await logImpersonationEvent('stopped', ...);

  // 2. إلغاء الحالة
  setImpersonation({
    isActive: false,
    targetStaffId: null,
    targetStaffName: null,
    ...
  });
};
```

**logImpersonationEvent():**
```typescript
const logImpersonationEvent = async (action, staffId, staffName) => {
  await supabase.from('executive_impersonation_logs').insert({
    gm_id: realGMId,
    action: action,
    target_staff_id: staffId,
    target_staff_name: staffName,
    current_path: window.location.pathname
  });
};
```

#### Exports:

```typescript
export function useImpersonation() {
  return {
    impersonation,      // الحالة الحالية
    startImpersonation, // بدء المراقبة
    stopImpersonation,  // إيقاف المراقبة
    isGM,               // هل GM؟
    effectiveStaffId,   // المعرف الفعّال (target أو GM)
    effectiveRole,      // الدور الفعّال
    realGMId            // معرف GM الحقيقي
  };
}
```

---

### 2. ViewAsBanner

**الملف:** `src/components/platform/ViewAsBanner.tsx`

**الوظيفة:** شريط تنبيه ثابت يظهر عندما يكون GM في وضع View-As

#### الموقع:
```
┌──────────────────────────────────────────────┐
│  ⚠️ وضع المراقبة النشط  [View-As Mode]     │
│  👤 تعرض كـ: أحمد محمد  [مدير عمليات]      │
│  ⏱️ 5:32                    [إيقاف المراقبة] │
└──────────────────────────────────────────────┘
```

**الميزات:**
- fixed top (z-index: 9999)
- لون برتقالي/أحمر تحذيري
- معلومات الموظف المستهدف
- مؤقت مباشر (Live Timer)
- زر إيقاف فوري

**الكود:**
```typescript
export default function ViewAsBanner() {
  const { impersonation, stopImpersonation, isGM } = useImpersonation();
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (!impersonation.isActive) return;

    const updateDuration = () => {
      const diff = now - startedAt;
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setDuration(`${minutes}:${seconds.padStart(2, '0')}`);
    };

    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [impersonation]);

  if (!isGM || !impersonation.isActive) return null;

  return (
    <div className="fixed top-0 z-[9999] bg-gradient-to-r from-amber-500 to-red-500">
      {/* محتوى الشريط */}
    </div>
  );
}
```

**الشروط:**
- يظهر فقط إذا `isGM = true`
- يظهر فقط إذا `impersonation.isActive = true`

---

### 3. GMControlPanel

**الملف:** `src/components/platform/GMControlPanel.tsx`

**المسار:** `/admin/settings/gm-control`

**الوظيفة:** لوحة التحكم الكاملة للمدير العام

#### الأقسام (3 Tabs):

##### Tab 1: الموظفين

```
┌─────────────────────────────────────────┐
│  🔍 بحث بالاسم أو الدور أو القسم...     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  👤  أحمد محمد                          │
│      [مدير عمليات] [قسم الإنتاج]       │
│                          [👁️ مراقبة]    │
├─────────────────────────────────────────┤
│  👤  فاطمة علي                          │
│      [مشرف] [قسم المالية]              │
│                          [👁️ مراقبة]    │
└─────────────────────────────────────────┘
```

**الميزات:**
- قائمة جميع الموظفين
- بحث ديناميكي
- معلومات الموظف (اسم، دور، قسم)
- زر "مراقبة" لكل موظف
- Click → `startImpersonation()` → redirect to `/admin/my-work`

---

##### Tab 2: جلسات نشطة

```
┌─────────────────────────────────────────┐
│  👁️  أحمد محمد                         │
│      بدأت: 2024-01-15 10:30            │
│      ⏱️ 15 دقيقة                       │
├─────────────────────────────────────────┤
│  👁️  فاطمة علي                         │
│      بدأت: 2024-01-15 11:00            │
│      ⏱️ 5 دقائق                        │
└─────────────────────────────────────────┘
```

**الميزات:**
- عرض جلسات View-As النشطة حالياً
- معلومات كل جلسة (موظف، وقت البدء، المدة)
- تحديث ديناميكي
- لون برتقالي تحذيري

---

##### Tab 3: السجلات

```
┌─────────────────────────────────────────┐
│  ✓  بدء المراقبة                       │
│      أحمد محمد                          │
│      2024-01-15 10:30                   │
│      [/admin/my-work]                   │
├─────────────────────────────────────────┤
│  ✗  إيقاف المراقبة                     │
│      أحمد محمد                          │
│      2024-01-15 10:45                   │
│      [/admin/tasks/123]                 │
└─────────────────────────────────────────┘
```

**الميزات:**
- سجل كامل لجميع أحداث View-As
- started (أخضر) و stopped (أحمر)
- معلومات كاملة (موظف، وقت، مسار)
- آخر 100 سجل

---

#### Dashboard Stats:

```
┌──────────────┬──────────────┬──────────────┐
│ 👥 إجمالي    │ 👁️ جلسات    │ 📊 سجلات     │
│ الموظفين     │ نشطة         │ اليوم        │
│    25        │    2         │    8         │
└──────────────┴──────────────┴──────────────┘
```

---

### 4. useImpersonationControl Hook

**الملف:** `src/hooks/useImpersonationControl.ts`

**الوظيفة:** Hook لجلب بيانات GM Control Panel

#### Returns:

```typescript
{
  isGM: boolean,                    // هل GM؟
  gmId: string | null,              // معرف GM
  staffMembers: StaffMember[],      // قائمة الموظفين
  logs: ImpersonationLog[],         // السجلات
  activeImpersonations: Active[],   // الجلسات النشطة
  loading: boolean,                 // حالة التحميل
  error: string | null,             // خطأ
  refresh: () => Promise<void>      // تحديث
}
```

#### Functions:

**fetchStaffMembers():**
```sql
SELECT id, name_ar, role, department
FROM platform_staff
ORDER BY name_ar ASC;
```

**fetchLogs():**
```typescript
const { data } = await supabase.rpc('get_impersonation_logs', {
  p_gm_id: gmId,
  p_limit: 100
});
```

**fetchActiveImpersonations():**
```typescript
const { data } = await supabase.rpc('get_active_impersonations', {
  p_gm_id: gmId
});
```

---

## 🔄 سيناريوهات الاستخدام

### سيناريو 1: GM يبدأ View-As

```
1. GM يفتح: /admin/settings/gm-control
2. يبحث عن موظف: "أحمد"
3. يجد: "أحمد محمد - مدير عمليات"
4. يضغط: "مراقبة"
5. startImpersonation() يُستدعى:
   - Context يُحدّث
   - Log يُسجّل في DB (action: started)
6. Navigate إلى: /admin/my-work
7. ViewAsBanner يظهر في الأعلى:
   "⚠️ تعرض كـ: أحمد محمد [مدير عمليات] [0:00]"
8. الصفحة تعرض مهام أحمد (من useMyWork)
```

**النتيجة:**
- GM يرى واجهة أحمد
- لكن Session الأساسية ما تغيرت
- شريط التحذير ثابت في كل صفحة

---

### سيناريو 2: GM يتنقل بين الصفحات

```
1. GM في وضع View-As (أحمد محمد)
2. ViewAsBanner ثابت في الأعلى (orange)
3. يزور:
   - /admin/my-work → يرى مهام أحمد ✅
   - /admin/operations-room → يدخل كـ GM (Bypass) ✅
   - /admin/b2f/farms → يدخل كـ GM ✅
4. الشريط يبقى ثابت في كل مكان
5. المؤقت يزيد: 0:00 → 1:23 → 5:47 ...
```

**ملاحظة مهمة:**
- View-As هو "عرض" فقط في الصفحات المناسبة
- GM له وصول كامل دائماً (Absolute Access)
- الشريط يبقى للتذكير أن View-As نشط

---

### سيناريو 3: GM يوقف View-As

**طريقة 1: من الشريط**
```
1. GM في أي صفحة
2. يرى ViewAsBanner في الأعلى
3. يضغط: "إيقاف المراقبة"
4. stopImpersonation() يُستدعى:
   - Log يُسجّل (action: stopped)
   - Context يُلغى
   - ViewAsBanner يختفي
5. GM يرجع للوضع الطبيعي
```

**طريقة 2: من Control Panel**
```
1. GM يفتح: /admin/settings/gm-control
2. Tab: "جلسات نشطة"
3. يرى جلسته النشطة
4. (لا يوجد زر إيقاف هنا - فقط من Banner)
```

---

### سيناريو 4: GM يراقب موظف B2F

```
1. GM يختار موظف B2F: "محمد - مدير مزرعة"
2. يضغط "مراقبة"
3. Navigate إلى: /admin/my-work
4. يرى:
   - مهام محمد في B2F
   - لوحات محمد (إذا له صلاحيات خاصة)
   - بطاقات محمد في Gateway
5. GM يقدر يروح:
   - /admin/b2f/farms → يدخل كـ GM (Bypass) ✅
   - /admin/b2f/operations → يدخل كـ GM ✅
6. Absolute Access يبقى نشط دائماً
```

---

### سيناريو 5: تسجيل الأحداث

**في DB:**
```sql
-- Event 1: Started
INSERT INTO executive_impersonation_logs (
  gm_id: '550e8400-...',
  action: 'started',
  target_staff_id: '6ba7b810-...',
  target_staff_name: 'أحمد محمد',
  current_path: '/admin/settings/gm-control',
  created_at: '2024-01-15 10:30:00'
);

-- Event 2: Stopped (بعد 15 دقيقة)
INSERT INTO executive_impersonation_logs (
  gm_id: '550e8400-...',
  action: 'stopped',
  target_staff_id: '6ba7b810-...',
  target_staff_name: 'أحمد محمد',
  current_path: '/admin/my-work',
  created_at: '2024-01-15 10:45:00'
);
```

**في Control Panel:**
- Tab "السجلات" يعرض الحدثين
- Event 1: أخضر (✓ بدء)
- Event 2: أحمر (✗ إيقاف)
- المدة: 15 دقيقة

---

## 🔐 الأمان والصلاحيات

### 1. Frontend Guards:

**GatewayGuard (موجود بالفعل):**
```typescript
// 6. إذا كان GM: سماح فوري (Absolute Access)
if (userIsGM) {
  setChecking(false);
  return;
}
```

**التحقق:**
```typescript
const userIsGM = cards.some(card => card.is_gm_access);
```

---

### 2. ImpersonationContext Guards:

**startImpersonation():**
```typescript
if (!isGM) {
  console.error('Only GM can use View-As');
  return;
}
```

**GMControlPanel:**
```typescript
if (!isGM) {
  return <AccessDenied />;
}
```

---

### 3. Database RLS:

**executive_impersonation_logs:**

**Policy 1: GM can read own logs**
```sql
CREATE POLICY "GM can read own impersonation logs"
  ON executive_impersonation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = gm_id
      AND platform_staff.role = 'general_manager'
    )
  );
```

**Policy 2: GM can insert logs**
```sql
CREATE POLICY "GM can insert impersonation logs"
  ON executive_impersonation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = gm_id
      AND platform_staff.role = 'general_manager'
    )
  );
```

**Policy 3: Anonymous insert (for QR sessions)**
```sql
CREATE POLICY "Anonymous can insert impersonation logs"
  ON executive_impersonation_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);
```

**Policy 4: Service role full access**
```sql
CREATE POLICY "Service role full access to impersonation logs"
  ON executive_impersonation_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## 🧪 اختبارات القبول

### ✅ اختبار 1: GM Absolute Access

**الخطوات:**
1. تسجيل دخول كـ GM
2. محاولة الدخول لأي مسار إداري:
   - `/admin/operations-room`
   - `/admin/b2f/farms`
   - `/admin/settings/gm-control`
   - `/admin/my-work`

**النتيجة المتوقعة:**
- ✅ GM يدخل جميع المسارات بدون قيود
- ✅ لا redirect
- ✅ لا رسائل خطأ
- ✅ Absolute Access يعمل

---

### ✅ اختبار 2: موظف عادي محظور من GM Control

**الخطوات:**
1. تسجيل دخول كموظف عادي (ليس GM)
2. محاولة الدخول: `/admin/settings/gm-control`

**النتيجة المتوقعة:**
- ✅ يُمنع الدخول
- ✅ رسالة: "وصول محظور - هذه اللوحة متاحة فقط للمدير العام"
- ✅ زر "العودة للبوابة"

---

### ✅ اختبار 3: GM يفعل View-As

**الخطوات:**
1. GM يفتح: `/admin/settings/gm-control`
2. يبحث عن موظف
3. يضغط "مراقبة"

**النتيجة المتوقعة:**
- ✅ Navigate إلى `/admin/my-work`
- ✅ ViewAsBanner يظهر في الأعلى
- ✅ معلومات الموظف صحيحة (اسم، دور)
- ✅ المؤقت يبدأ من 0:00
- ✅ الصفحة تعرض مهام الموظف المستهدف

---

### ✅ اختبار 4: ViewAsBanner في كل صفحة

**الخطوات:**
1. GM في وضع View-As
2. يتنقل بين الصفحات

**النتيجة المتوقعة:**
- ✅ ViewAsBanner ثابت في جميع الصفحات
- ✅ المؤقت يزيد باستمرار
- ✅ معلومات الموظف تبقى صحيحة
- ✅ زر "إيقاف" يعمل من أي صفحة

---

### ✅ اختبار 5: GM يوقف View-As

**الخطوات:**
1. GM في وضع View-As
2. يضغط "إيقاف المراقبة" من Banner

**النتيجة المتوقعة:**
- ✅ ViewAsBanner يختفي فوراً
- ✅ GM يرجع للوضع الطبيعي
- ✅ Context يُلغى
- ✅ Log يُسجّل (action: stopped)

---

### ✅ اختبار 6: تسجيل الأحداث

**الخطوات:**
1. GM يفعل View-As (موظف A)
2. ينتظر 5 دقائق
3. يوقف View-As
4. يفتح Tab "السجلات"

**النتيجة المتوقعة:**
- ✅ حدثان في السجل:
  - ✓ بدء المراقبة (أخضر)
  - ✗ إيقاف المراقبة (أحمر)
- ✅ معلومات كاملة (موظف، وقت، مسار)
- ✅ المدة صحيحة (~5 دقائق)

---

### ✅ اختبار 7: جلسات نشطة

**الخطوات:**
1. GM يفعل View-As
2. يفتح Control Panel
3. يفتح Tab "جلسات نشطة"

**النتيجة المتوقعة:**
- ✅ جلسته تظهر في القائمة
- ✅ معلومات صحيحة (موظف، بدء، مدة)
- ✅ لون برتقالي تحذيري
- ✅ المدة تزيد باستمرار

---

### ✅ اختبار 8: بحث الموظفين

**الخطوات:**
1. GM في Control Panel → Tab "الموظفين"
2. يكتب في البحث: "أحمد"

**النتيجة المتوقعة:**
- ✅ تظهر فقط النتائج المطابقة
- ✅ البحث في الاسم والدور والقسم
- ✅ ديناميكي (بدون إرسال)

---

### ✅ اختبار 9: Dashboard Stats

**الخطوات:**
1. GM يفتح Control Panel
2. يرى البطاقات الثلاث في الأعلى

**النتيجة المتوقعة:**
- ✅ "إجمالي الموظفين" = عدد صحيح
- ✅ "جلسات نشطة" = عدد View-As النشطة
- ✅ "سجلات اليوم" = عدد أحداث اليوم

---

### ✅ اختبار 10: Refresh

**الخطوات:**
1. GM في Control Panel
2. يضغط زر "تحديث" (أعلى اليمين)

**النتيجة المتوقعة:**
- ✅ Loading state تظهر
- ✅ البيانات تُحدّث (موظفين، جلسات، سجلات)
- ✅ Stats تُحدّث

---

## 📝 الملفات المنشأة/المعدلة

### ملفات جديدة (5):
1. `src/contexts/ImpersonationContext.tsx` - Context عام
2. `src/hooks/useImpersonationControl.ts` - Hook للـ Control Panel
3. `src/components/platform/ViewAsBanner.tsx` - شريط التنبيه
4. `src/components/platform/GMControlPanel.tsx` - لوحة التحكم
5. Migration: `create_executive_impersonation_system` - جدول السجلات

### ملفات معدلة (1):
1. `src/App.tsx` - إضافة:
   - Import ImpersonationProvider
   - Import ViewAsBanner
   - Import GMControlPanel
   - Wrap App في ImpersonationProvider
   - ViewAsBanner في أعلى كل شيء
   - Route: `/admin/settings/gm-control`

---

## ✅ Build Status

```bash
✓ 1786 modules transformed
✓ built in 18.64s

✓ ImpersonationContext ✅
✓ useImpersonationControl ✅
✓ ViewAsBanner ✅
✓ GMControlPanel ✅
✓ Migration applied ✅
✓ App.tsx updated ✅
✓ No TypeScript errors ✅
✓ Production ready! 🎉
```

---

## 🎯 الفوائد

### قبل المرحلة 4:
```
❌ GM محدود بصلاحيات معينة
❌ ما يقدر يشوف لوحات الموظفين
❌ صعوبة المراجعة والتدقيق
❌ لا يوجد تسجيل للأحداث
❌ لا شفافية
```

### بعد المرحلة 4:
```
✅ GM له وصول مطلق (Absolute Access)
✅ يقدر يشوف لوحة أي موظف (View-As)
✅ مراجعة وتدقيق سهلة
✅ تسجيل كامل لجميع الأحداث
✅ شفافية تامة
✅ شريط تحذير واضح (ViewAsBanner)
✅ لوحة تحكم شاملة (GMControlPanel)
✅ بحث وإحصائيات
✅ جلسات نشطة
✅ سجلات تاريخية
```

---

## 🎉 الخلاصة الشاملة

### المراحل 1 + 2 + 3 + 4 = نظام متكامل:

```
✅ زر التاج = نقطة الدخول الوحيدة
✅ بوابة ذكية مع 8 بطاقات
✅ حماية كاملة (4 طبقات)
✅ توجيه ذكي
✅ صفحة موظف موحدة "عملي اليوم"
✅ GM له وصول مطلق (Absolute Access)
✅ GM يقدر يراقب أي موظف (View-As)
✅ شريط تحذير ثابت (ViewAsBanner)
✅ لوحة تحكم قيادية (GMControlPanel)
✅ تسجيل كامل لجميع الأحداث
✅ جلسات نشطة + سجلات تاريخية
✅ بحث وإحصائيات
✅ نظام مؤسسي محترف
✅ شفافية ومساءلة
✅ جاهز للإنتاج
```

---

## 📊 المقارنة النهائية

| الميزة | قبل المرحلة 4 | بعد المرحلة 4 |
|--------|---------------|---------------|
| GM Access | محدود ❌ | مطلق ✅ |
| View-As | لا يوجد ❌ | متقدم ✅ |
| التسجيل | لا يوجد ❌ | كامل ✅ |
| الشفافية | ضعيفة ❌ | تامة ✅ |
| المراجعة | صعبة ❌ | سهلة ✅ |
| التدقيق | معقد ❌ | بسيط ✅ |
| Control Panel | لا يوجد ❌ | شامل ✅ |
| ViewAsBanner | لا يوجد ❌ | ثابت ✅ |
| الجلسات النشطة | - ❌ | مراقبة ✅ |
| السجلات | - ❌ | تاريخية ✅ |

---

## 🔮 التوسعات المستقبلية

### المرحلة 5: Audit Trail متقدم

**إضافات محتملة:**
- تسجيل كل نقرة في View-As
- تسجيل الصفحات المزارة
- تسجيل البيانات المعروضة
- Reports تفصيلية

---

### المرحلة 6: Multi-GM

**إضافات محتملة:**
- دعم أكثر من GM
- صلاحيات مختلفة لكل GM
- View-As بصلاحيات محدودة
- تفويض مؤقت

---

### المرحلة 7: Alerts & Notifications

**إضافات محتملة:**
- تنبيه إذا View-As استمر أكثر من X دقيقة
- تنبيه إذا GM دخل صفحات حساسة
- تقارير دورية للإدارة

---

### المرحلة 8: Analytics

**إضافات محتملة:**
- أكثر موظف تمت مراقبته
- متوسط مدة View-As
- أكثر أوقات الاستخدام
- الصفحات الأكثر زيارة في View-As

---

## 🛡️ ملاحظات أمنية مهمة

### 1. View-As هو "عرض" فقط:

```
✅ GM يرى الواجهة كموظف
❌ GM لا ينفذ actions كموظف
❌ لا يوجد Impersonation حقيقي
✅ Session الأساسية تبقى GM
```

**لماذا؟**
- لتجنب المخاطر الأمنية
- لتجنب الأخطاء
- المراجعة فقط، ليس التنفيذ

---

### 2. Absolute Access محدود Frontend:

```
✅ Frontend Guards تسمح لـ GM
⚠️ Backend RLS يحتاج تحديث منفصل
```

**التوصية:**
- إضافة RLS policies تدعم GM
- أو استخدام `service_role` في بعض الاستعلامات الحساسة

---

### 3. Logging إجباري:

```
✅ كل View-As يُسجّل
✅ Started + Stopped
✅ معلومات كاملة
```

**أهمية:**
- المساءلة
- التدقيق
- الشفافية
- الامتثال

---

## 📚 المراجع السريعة

### Context API:

```typescript
import { useImpersonation } from '../../contexts/ImpersonationContext';

const {
  impersonation,      // الحالة
  startImpersonation, // البدء
  stopImpersonation,  // الإيقاف
  isGM,               // التحقق
  effectiveStaffId,   // المعرف الفعّال
  effectiveRole       // الدور الفعّال
} = useImpersonation();
```

---

### Hook API:

```typescript
import { useImpersonationControl } from '../../hooks/useImpersonationControl';

const {
  isGM,                   // هل GM؟
  staffMembers,           // الموظفين
  logs,                   // السجلات
  activeImpersonations,   // النشطة
  refresh                 // تحديث
} = useImpersonationControl();
```

---

### Database Functions:

```sql
-- جلب السجلات
SELECT * FROM get_impersonation_logs(p_gm_id, p_limit);

-- جلب الجلسات النشطة
SELECT * FROM get_active_impersonations(p_gm_id);
```

---

**المسار الرئيسي:** `/admin/settings/gm-control`

**النتيجة: نظام صلاحيات GM مطلقة + وضع مراقبة View-As - المرحلة 4 جاهزة ومتكاملة!** 🎉✨👑👁️🔐

---

## 🎨 التصميم البصري

### ViewAsBanner Colors:

```css
/* Background */
bg-gradient-to-r from-amber-500 via-orange-500 to-red-500

/* Border */
border-b-4 border-amber-600

/* Animation */
animate-pulse (on icon)
```

**الهدف:** لفت الانتباه، تحذير واضح

---

### GMControlPanel Colors:

**Header:**
- Same as ViewAsBanner (consistency)

**Tabs:**
- Active: `bg-gradient-to-r from-amber-500 to-orange-500`
- Inactive: `bg-gray-100`

**Active Sessions:**
- Background: `bg-orange-50`
- Border: `border-orange-200`

**Logs:**
- Started: `bg-green-50 border-green-200`
- Stopped: `bg-red-50 border-red-200`

---

## ⚡ Performance Notes

### 1. ViewAsBanner Timer:

```typescript
// تحديث كل ثانية
setInterval(updateDuration, 1000);

// Cleanup عند unmount
return () => clearInterval(interval);
```

**التأثير:** منخفض جداً (simple calculation)

---

### 2. Control Panel Data:

**الاستعلامات:**
- Staff members: ~25 موظف → سريع
- Active impersonations: RPC function → سريع
- Logs: آخر 100 سجل → سريع

**التحسينات المقترحة:**
- Pagination للسجلات (إذا زادت عن 1000)
- Caching للموظفين (نادر التغيير)

---

### 3. Context Updates:

**إعادة الـ Render:**
- فقط عند `startImpersonation()` أو `stopImpersonation()`
- ViewAsBanner timer لا يسبب re-render للـ App

---

**التطوير التالي:** دمج View-As مع نظام الصلاحيات الديناميكية (المرحلة 5) 🚀
