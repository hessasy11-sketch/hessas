# Farm Birth & Teams Builder - التوثيق الكامل

## نظرة عامة

تم إكمال نظام "ولادة المزرعة" و"بناء الفرق" بنجاح بنسبة **100%** مع Hard Gate إلزامي.

---

## 1️⃣ ولادة المزرعة التلقائية (Farm Birth)

### الآلية

عند إصدار عقد جديد بحالة `active`:
1. **Trigger تلقائي** يتحقق من وجود `fc_operational_farms` للمزرعة
2. إذا لم تكن موجودة، يتم إنشاؤها تلقائياً بحالة `setup`
3. تحديث `operational_status` في `b2f_farms` إلى `setup`

### Database Components

#### Trigger:
```sql
trigger_auto_create_operational_farm ON b2f_contracts
```

#### Function:
```sql
auto_create_operational_farm_on_contract()
```

**الميزات**:
- يعمل فقط على العقود النشطة (`status = 'active'`)
- يتحقق من عدم وجود operational farm مسبقاً (لا تكرار)
- يستخدم `reference_farm_id` للربط مع `b2f_farms`
- يُنشئ `operational_name` تلقائياً من اسم المزرعة
- يُسجل في NOTICE log للمراقبة

### Helper Function

```sql
get_operational_farm_for_farm(p_farm_id UUID)
```

**يُرجع**:
- `operational_farm_id`
- `operational_status`
- `farm_manager_id` و `farm_manager_name`
- `readiness_score` (من `calculate_farm_readiness`)
- `teams_count` و `members_count`

---

## 2️⃣ Teams Builder (بناء الفرق)

### الصفحة الجديدة: `/farms/:farmId`

**المكونات**:
- `FarmSetupPage.tsx` - الصفحة الرئيسية
- `useFarmSetup.ts` - Hook مخصص للإدارة
- Route: `/farms/:farmId` في `App.tsx`

### الواجهة

#### Header
- عرض اسم المزرعة ومعلوماتها
- نسبة الجاهزية الحالية (Readiness Score)
- تصميم gradient بألوان emerald/teal

#### Status Banner
**قبل اكتمال الإعداد**:
- تحذير بلون yellow
- رسالة واضحة: "إعداد المزرعة غير مكتمل"
- قائمة بالمتطلبات: مدير مزرعة + فريق واحد على الأقل
- أيقونة Lock

**بعد اكتمال الإعداد**:
- تأكيد بلون green
- رسالة: "الإعداد مكتمل - المزرعة جاهزة للتشغيل"
- زر للانتقال إلى العمليات

#### Farm Manager Section
**قبل التعيين**:
- بطاقة فارغة مع زر "تعيين مدير المزرعة"
- أيقونة AlertTriangle بلون yellow

**بعد التعيين**:
- عرض اسم المدير الحالي
- بطاقة بلون emerald
- زر "تغيير المدير"
- أيقونة CheckCircle بلون green

**Modal تعيين المدير**:
- قائمة منسدلة بجميع الموظفين النشطين
- عرض: الاسم - الكود - الدور
- أزرار: إلغاء / تعيين

#### Teams Section
**قبل إنشاء الفرق**:
- بطاقة فارغة مع زر "إنشاء فريق جديد"
- أيقونة AlertTriangle بلون yellow

**بعد إنشاء الفرق**:
- قائمة بجميع الفرق
- عرض: اسم الفريق، عدد الأعضاء، الدور
- badge للعدد الإجمالي
- زر لإضافة المزيد

**Modal إنشاء الفريق**:
- حقل: اسم الفريق
- قائمة منسدلة: دور الفريق
  - operations (عمليات)
  - maintenance (صيانة)
  - harvest (حصاد)
  - irrigation (ري)
  - fertilization (تسميد)
  - pest_control (مكافحة آفات)
- أزرار: إلغاء / إنشاء

---

## 3️⃣ Hard Gate (البوابة الصارمة)

### شروط الوصول

**قبل اكتمال الإعداد**:
- ❌ المهام اليومية (مقفلة)
- ❌ الإدارة المالية (مقفلة)
- ❌ البلاغات الفنية (مقفلة)

**بعد اكتمال الإعداد**:
- ✅ جميع العمليات متاحة
- ✅ إمكانية الانتقال إلى `/admin/b2f/farm-command/:farmId/operations`

### UI للعمليات المقفلة

عرض 3 بطاقات معطلة:
- خلفية رمادية (bg-gray-100)
- حدود منقطة (border-dashed)
- opacity 60%
- أيقونة Lock بلون رمادي
- نص: "مقفل حتى إتمام الإعداد"

### Logic في Hook

```typescript
const isSetupComplete = () => {
  if (!operationalFarm) return false;
  return (
    operationalFarm.farm_manager_id !== null &&
    operationalFarm.teams_count >= 1
  );
};

const canAccessOperations = () => {
  return isSetupComplete();
};
```

---

## 4️⃣ المزرعة التجريبية

### البيانات المُدخلة

**المزرعة**:
- ID: `22222222-2222-2222-2222-222222222222`
- الاسم: "مزرعة النخيل التجريبية"
- الموقع: "طريق الملك عبدالله، الرياض"
- إجمالي الأشجار: 500
- الحالة: `setup`

**العقد**:
- ID: `66666666-6666-6666-6666-666666666666`
- رقم العقد: `CONT-TEST-001`
- هاتف المستثمر: `+966500000999`
- عدد الأشجار: 10
- المبلغ: 12,000 ريال
- المدة: 5 سنوات
- الحالة: `active`

**النتيجة التلقائية**:
- ✅ إنشاء `fc_operational_farms` تلقائياً
- ✅ الحالة التشغيلية: `setup`
- ✅ جاهزة للوصول عبر: `/farms/22222222-2222-2222-2222-222222222222`

---

## 5️⃣ الـ Hook: `useFarmSetup`

### الوظائف

#### 1. `loadFarmData()`
- جلب بيانات المزرعة التشغيلية
- استدعاء `get_operational_farm_for_farm()`
- Realtime subscription للتحديثات الفورية

#### 2. `loadTeams()`
- جلب جميع الفرق للمزرعة
- حساب عدد الأعضاء لكل فريق
- عرض اسم قائد الفريق

#### 3. `assignFarmManager(staffId)`
- تعيين مدير للمزرعة
- تحديث `farm_manager_id` في `fc_operational_farms`
- إعادة تحميل البيانات

#### 4. `createTeam(teamData)`
- إنشاء فريق جديد
- ربطه بـ `operational_farm_id`
- تعيين الحالة: `is_active = true`

#### 5. `isSetupComplete()`
- التحقق من اكتمال الإعداد
- الشرط: مدير + فريق واحد على الأقل

#### 6. `canAccessOperations()`
- يُرجع نفس نتيجة `isSetupComplete()`
- يُستخدم للتحكم في الوصول

### Realtime Subscriptions

**Channel 1**: `farm-setup-${farmId}`
- **الجدول**: `fc_operational_farms`
- **الفلتر**: `reference_farm_id=eq.${farmId}`
- **الأحداث**: جميع التغييرات
- **الإجراء**: إعادة تحميل `loadFarmData()`

**Channel 2**: `farm-setup-${farmId}`
- **الجدول**: `fc_farm_teams`
- **الأحداث**: جميع التغييرات
- **الإجراء**: إعادة تحميل `loadTeams()`

---

## 6️⃣ التكامل مع النظام الموجود

### الربط مع Farm Command

**من** `/admin/b2f/farm-command/farms`:
- قائمة جميع المزارع التشغيلية
- عند النقر → `/farms/:farmId` (الصفحة الجديدة)

**من** `/farms/:farmId` (بعد اكتمال الإعداد):
- زر "انتقل للعمليات"
- ينقل إلى → `/admin/b2f/farm-command/:farmId/operations`

### الربط مع Readiness Score

```typescript
calculate_farm_readiness(farmId)
```

**يتأثر بـ**:
- وجود مدير مزرعة: +20%
- عدد الفرق: +% حسب العدد
- عدد الأعضاء: +% حسب العدد

---

## 7️⃣ الأمان (Security)

### Database Level
- ✅ جميع الدوال: `SECURITY DEFINER`
- ✅ RLS policies على `fc_operational_farms`
- ✅ RLS policies على `fc_farm_teams`
- ✅ التحقق من وجود المزرعة قبل الإنشاء

### UI Level
- ✅ فحص `isSetupComplete()` قبل الوصول للعمليات
- ✅ تعطيل الأزرار عند عدم اكتمال البيانات
- ✅ رسائل واضحة للمستخدم

---

## 8️⃣ التدفق الكامل (Complete Flow)

### الخطوة 1: إصدار العقد
```
المبيعات → موافقة الدفع → إصدار العقد (status = 'active')
```

### الخطوة 2: الولادة التلقائية
```
Trigger → إنشاء fc_operational_farms → status = 'setup'
```

### الخطوة 3: الإعداد الأولي
```
المستخدم → /farms/:farmId
│
├─ تعيين مدير المزرعة
│   └─ اختيار من قائمة الموظفين
│
└─ إنشاء فريق واحد على الأقل
    └─ تحديد اسم ودور
```

### الخطوة 4: اكتمال الإعداد
```
✅ مدير معيّن + فريق واحد
→ isSetupComplete() = true
→ Banner أخضر يظهر
→ زر "انتقل للعمليات" يُفعّل
```

### الخطوة 5: الوصول للعمليات
```
انقر "انتقل للعمليات"
→ /admin/b2f/farm-command/:farmId/operations
→ ✅ المهام، المالية، البلاغات متاحة
```

---

## 9️⃣ الاختبار

### 1. اختبار الولادة التلقائية

```sql
-- إنشاء عقد
INSERT INTO b2f_contracts (farm_id, status, ...)
VALUES ('farm-id', 'active', ...);

-- التحقق من إنشاء operational farm
SELECT * FROM fc_operational_farms
WHERE reference_farm_id = 'farm-id';
```

### 2. اختبار الإعداد

1. افتح `/farms/22222222-2222-2222-2222-222222222222`
2. تحقق من ظهور تحذير "إعداد غير مكتمل"
3. عيّن مدير مزرعة
4. أنشئ فريق واحد
5. تحقق من تغيّر Banner إلى أخضر
6. اختبر زر "انتقل للعمليات"

### 3. اختبار Hard Gate

**قبل الإعداد**:
```typescript
canAccessOperations() // false
```
- المهام: مقفلة
- المالية: مقفلة
- البلاغات: مقفلة

**بعد الإعداد**:
```typescript
canAccessOperations() // true
```
- جميع العمليات: متاحة

---

## 🔟 الملفات المُضافة/المُعدلة

### ملفات جديدة (3):
```
src/hooks/useFarmSetup.ts
src/components/platform/FarmSetupPage.tsx
supabase/migrations/add_auto_farm_birth_on_contract.sql
supabase/migrations/fix_auto_farm_birth_trigger_column_name.sql
supabase/migrations/fix_auto_farm_birth_add_operational_name.sql
supabase/migrations/fix_auto_farm_birth_remove_governance_log.sql
supabase/migrations/add_test_farm_simple_v3.sql
```

### ملفات معدلة (1):
```
src/App.tsx (إضافة Route جديد)
```

---

## 1️⃣1️⃣ البناء والنشر

### Build Results
```bash
✓ 1727 modules transformed
✓ built in 11.53s
✓ لا أخطاء
```

**الحجم**:
- CSS: 186 KB (23.69 KB gzipped)
- JS: ~2.02 MB (~420 KB gzipped)

---

## 1️⃣2️⃣ الخلاصة

### ما تم إنجازه بنسبة 100%:

✅ **ولادة المزرعة التلقائية**
- Trigger يعمل على كل عقد جديد
- إنشاء `fc_operational_farms` تلقائياً
- تحديث حالة المزرعة

✅ **Teams Builder**
- صفحة كاملة `/farms/:farmId`
- تعيين مدير المزرعة
- إنشاء الفرق
- Realtime updates

✅ **Hard Gate**
- منع الوصول للعمليات قبل الإعداد
- UI واضحة للعمليات المقفلة
- Logic صارم في الكود

✅ **المزرعة التجريبية**
- بيانات جاهزة للاختبار
- عقد مُصدر
- operational farm مُنشأة

✅ **البناء**
- ناجح بدون أخطاء
- جاهز للنشر

---

## 1️⃣3️⃣ الخطوات التالية (اختياري)

### توسعات محتملة:
1. ⏳ إضافة إمكانية حذف/تعطيل فريق
2. ⏳ إضافة أعضاء للفرق
3. ⏳ تعيين قائد لكل فريق
4. ⏳ صلاحيات مختلفة لكل دور
5. ⏳ تقارير عن أداء الفرق

### ملاحظات:
- النظام الحالي كامل وجاهز
- التوسعات أعلاه اختيارية
- البنية التحتية جاهزة لأي إضافات مستقبلية

---

**التاريخ**: 2026-01-05
**الحالة**: مكتمل 100%
**Build**: ناجح بدون أخطاء
**URL التجريبي**: `/farms/22222222-2222-2222-2222-222222222222`
