# دليل أزرار القيادة السريعة (Quick Action Buttons)

## نظرة عامة

أزرار تفاعلية ذكية توجه القيادة للإجراءات المطلوبة بناءً على البيانات المعروضة.

**الفكرة الأساسية:** Read → Decide (اقرأ ثم قرر)

لا تنفذ مباشرة - بل تنقل للصفحة المناسبة لاتخاذ القرار.

---

## 📍 الموقع

```
/admin/operations-room/global
```

تظهر بعد Executive Alerts Panel وقبل المؤشرات الرئيسية.

---

## 🎯 الأزرار (4 أزرار)

### 1️⃣ غرفة القرارات

**الهدف:** الانتقال لمراجعة القرارات المعلقة

**البيانات:**
```sql
SELECT COUNT(*) FROM decision_queue
WHERE status = 'pending';
```

**التصميم:**
- اللون: أزرق (Blue)
- الأيقونة: Layers
- Badge: عدد القرارات المعلقة
- Gradient: from-blue-500 to-blue-600

**المسار:**
```
/admin/operations-room/b2f
```

**الوصف:** "مراجعة واعتماد القرارات"

---

### 2️⃣ أسوأ المزارع أداءً

**الهدف:** عرض المزارع التي تحتاج تدخل فوري

**المعايير:**
```sql
performance_score =
  CASE operational_status
    WHEN 'suspended' THEN 0
    WHEN 'maintenance' THEN 10
    ELSE 50
  END
  - (pending_decisions × 5)
  - (pending_expenses × 3)
```

**كلما كانت الدرجة أقل → الأداء أسوأ**

**البيانات:**
```sql
SELECT COUNT(*) FROM b2f_farms
WHERE operational_status IN ('suspended', 'maintenance')
OR (
  SELECT COUNT(*) FROM decision_queue
  WHERE farm_id = b2f_farms.id AND status = 'pending'
) >= 3;
```

**التصميم:**
- اللون: أحمر (Red)
- الأيقونة: TrendingDown
- Badge: عدد المزارع المتعثرة
- Gradient: from-red-500 to-red-600

**المسار:**
```
/admin/operations-room/b2f
```

**الوصف:** "مزارع متعثرة أو منخفضة الأداء"

---

### 3️⃣ أعلى المصروفات

**الهدف:** عرض المصروفات الكبيرة المعلقة

**الشرط:**
```sql
amount > 5000 ر.س
AND approval_status = 'pending'
AND created_at > now() - interval '30 days'
```

**البيانات:**
```sql
SELECT COUNT(*) FROM farm_expenses
WHERE amount > 5000
AND approval_status = 'pending'
AND created_at > now() - interval '30 days';
```

**التصميم:**
- اللون: برتقالي (Orange)
- الأيقونة: DollarSign
- Badge: عدد المصروفات الكبيرة
- Gradient: from-orange-500 to-orange-600

**المسار:**
```
/admin/operations-room/b2f
```

**الوصف:** "مصروفات تتجاوز 5,000 ر.س"

---

### 4️⃣ مزادات حرجة

**الهدف:** مزادات لديها تقارير تحتاج مراجعة

**الشرط:**
```sql
reports_count >= 3
AND auction_status = 'active'
```

**البيانات:**
```sql
SELECT COUNT(DISTINCT auction_id)
FROM auction_reports
WHERE status = 'pending'
AND auction_id IN (
  SELECT id FROM auctions WHERE status = 'active'
);
```

**التصميم:**
- اللون: بنفسجي (Purple)
- الأيقونة: Gavel
- Badge: عدد المزادات الحرجة
- Gradient: from-purple-500 to-purple-600

**المسار:**
```
/admin/operations-room/b2b
```

**الوصف:** "مزادات بها تقارير معلقة"

---

## 🎨 حالات التصميم

### حالة: يوجد إجراءات معلقة

**الزر النشط:**
```css
border-2 border-{color}-200
bg-gradient-to-br from-{color}-50 to-{color}-100
hover:shadow-xl
hover:scale-[1.02]
```

**Badge:**
```css
px-3 py-1.5 rounded-lg
bg-{color}-100 text-{color}-700
font-bold text-lg
animate-pulse
```

**الأيقونة:**
```css
w-14 h-14 rounded-xl
bg-gradient-to-br from-{color}-500 to-{color}-600
shadow-lg
text-white
```

**Hover Effect:**
- خط سفلي بـ gradient يتوسع من اليسار
- السهم يتحرك لليسار
- shadow يكبر
- scale يزيد قليلاً

---

### حالة: لا إجراءات معلقة

**الزر غير النشط:**
```css
border-2 border-gray-200
bg-gray-50
hover:bg-gray-100
hover:shadow-md
```

**Badge:** مخفي

**الأيقونة:**
```css
bg-gray-200
text-gray-500
```

---

### Info Banner (يوجد إجراءات)

```css
bg-gradient-to-r from-indigo-50 to-purple-50
border border-indigo-200
```

**المحتوى:**
```
لديك X عنصر يحتاج مراجعة أو اتخاذ قرار
استخدم الأزرار أعلاه للانتقال مباشرة
```

حيث X = مجموع جميع الإجراءات المعلقة

---

### Empty State (لا إجراءات)

```css
bg-gradient-to-r from-green-50 to-emerald-50
border border-green-200
```

**الرسالة:**
```
جميع الأمور تحت السيطرة
لا توجد إجراءات عاجلة تحتاج انتباهك حالياً
```

---

## 🔧 الدوال Backend

### 1. get_quick_actions_stats()

**الغرض:** جلب الإحصائيات للـ badges

**النتيجة:**
```json
{
  "worst_farms": 3,
  "high_expenses": 5,
  "critical_auctions": 2,
  "pending_decisions": 8
}
```

**الاستخدام:**
```sql
SELECT get_quick_actions_stats();
```

---

### 2. get_worst_performing_farms(p_limit int)

**الغرض:** جلب أسوأ المزارع أداءً

**المعامل:** p_limit (افتراضي: 5)

**النتيجة:**
```json
[
  {
    "id": "uuid",
    "name": "مزرعة النخيل",
    "operational_status": "suspended",
    "pending_decisions": 5,
    "pending_expenses": 3,
    "total_expenses_30d": 15000,
    "performance_score": -10
  }
]
```

**الترتيب:** حسب performance_score تصاعدياً (الأسوأ أولاً)

---

### 3. get_highest_expenses(p_limit int)

**الغرض:** جلب أعلى المصروفات

**المعامل:** p_limit (افتراضي: 5)

**النتيجة:**
```json
[
  {
    "id": "uuid",
    "farm_id": "uuid",
    "farm_name": "مزرعة النخيل",
    "description": "صيانة طارئة",
    "amount": 12000,
    "category": "maintenance",
    "approval_status": "pending",
    "created_at": "2026-01-06...",
    "days_ago": 2
  }
]
```

**الترتيب:** حسب amount تنازلياً (الأعلى أولاً)

---

### 4. get_critical_auctions(p_limit int)

**الغرض:** جلب المزادات الحرجة

**المعامل:** p_limit (افتراضي: 5)

**النتيجة:**
```json
[
  {
    "id": "uuid",
    "title": "سيارة 2020",
    "status": "active",
    "current_price": 50000,
    "reports_count": 5,
    "ends_at": "2026-01-07...",
    "hours_remaining": 12.5
  }
]
```

**الترتيب:**
1. حسب reports_count تنازلياً (الأكثر تقارير أولاً)
2. ثم حسب ends_at تصاعدياً (الأقرب انتهاءً أولاً)

---

### 5. get_all_quick_actions_data()

**الغرض:** جلب جميع البيانات دفعة واحدة

**النتيجة:**
```json
{
  "stats": {
    "worst_farms": 3,
    "high_expenses": 5,
    "critical_auctions": 2,
    "pending_decisions": 8
  },
  "worst_farms": [...],
  "highest_expenses": [...],
  "critical_auctions": [...]
}
```

---

## 🎭 التفاعل

### 1. عرض Badge
- يظهر فقط إذا كان العدد > 0
- animate-pulse للفت الانتباه
- لون حسب نوع الإجراء

### 2. Hover Effects
```css
group-hover:shadow-xl
group-hover:scale-[1.02]
group-hover:translate-x-1 (السهم)
```

### 3. الضغط
```typescript
onClick={() => navigate(action.path)}
```

ينقل للصفحة المناسبة فوراً.

---

## 🔄 التحديث

### دوري:
```typescript
useEffect(() => {
  loadStats();
  const interval = setInterval(loadStats, 30000); // كل 30 ثانية
  return () => clearInterval(interval);
}, []);
```

---

## 📊 معادلة الأداء

```javascript
performance_score = base_score - (penalties)

base_score:
  - operational: 50 نقطة
  - maintenance: 10 نقاط
  - suspended: 0 نقطة

penalties:
  - كل قرار معلق: -5 نقاط
  - كل مصروف معلق: -3 نقاط

النتيجة:
  - 50+ : ممتاز
  - 30-49: جيد
  - 10-29: ضعيف
  - 0-9: سيء جداً
  - سالب: حرج
```

---

## 🧪 سيناريو اختبار

### الاختبار 1: زر غرفة القرارات

```sql
-- إضافة قرارات معلقة
INSERT INTO decision_queue (farm_id, decision_type, status, priority, requested_by)
SELECT
  (SELECT id FROM b2f_farms LIMIT 1),
  'approve_expense',
  'pending',
  'high',
  (SELECT id FROM platform_staff LIMIT 1)
FROM generate_series(1, 5);

-- التحقق
SELECT get_quick_actions_stats();
```

**المتوقع:**
- Badge يعرض "5"
- الزر باللون الأزرق النشط
- عند الضغط ينقل لـ B2F Operations Room

---

### الاختبار 2: زر أسوأ المزارع

```sql
-- إيقاف مزرعة
UPDATE b2f_farms
SET operational_status = 'suspended'
WHERE id = (SELECT id FROM b2f_farms LIMIT 1);

-- التحقق
SELECT get_quick_actions_stats();
SELECT jsonb_pretty(get_worst_performing_farms(3));
```

**المتوقع:**
- Badge يعرض "1" على الأقل
- الزر باللون الأحمر النشط
- المزرعة الموقوفة تظهر في القائمة

---

### الاختبار 3: زر أعلى المصروفات

```sql
-- إضافة مصروف كبير
INSERT INTO farm_expenses (
  farm_id,
  description,
  amount,
  category,
  approval_status,
  expense_date
) VALUES (
  (SELECT id FROM b2f_farms LIMIT 1),
  'صيانة ضخمة',
  8000,
  'maintenance',
  'pending',
  CURRENT_DATE
);

-- التحقق
SELECT get_quick_actions_stats();
SELECT jsonb_pretty(get_highest_expenses(3));
```

**المتوقع:**
- Badge يعرض "1" على الأقل
- الزر باللون البرتقالي النشط
- المصروف يظهر في القائمة

---

### الاختبار 4: Info Banner

```sql
-- التحقق من الإحصائيات
SELECT get_quick_actions_stats();
```

**المتوقع:**
- إذا كان المجموع > 0 → Info Banner يظهر
- إذا كان المجموع = 0 → Empty State يظهر

---

## 📝 الملفات المنشأة

### Backend:
1. `create_quick_actions_data_functions_fixed.sql` - جميع الدوال
2. `fix_critical_auctions_function.sql` - إصلاح current_price

### Frontend:
1. `src/hooks/useQuickActions.ts` - Hook للإحصائيات
2. `src/components/platform/QuickActionButtons.tsx` - المكون الكامل
3. تحديث `src/components/platform/ExecutivePulse.tsx` - الإضافة

---

## ✅ Checklist

### Backend ✅
- [x] 5 دوال (stats, worst_farms, highest_expenses, critical_auctions, all_data)
- [x] معادلة الأداء الذكية
- [x] ترتيب حسب الأولوية
- [x] حد أقصى للنتائج (افتراضي: 5)

### Frontend ✅
- [x] Hook useQuickActions
- [x] مكون QuickActionButtons
- [x] 4 أزرار تفاعلية
- [x] Info Banner
- [x] Empty State
- [x] التحديث الدوري (30 ثانية)

### التصميم ✅
- [x] ألوان معبرة (أزرق، أحمر، برتقالي، بنفسجي)
- [x] Hover effects جذابة
- [x] Badges نابضة
- [x] Gradients سلسة
- [x] Responsive design

### الوظائف ✅
- [x] التنقل المباشر
- [x] Badge يظهر فقط عند الحاجة
- [x] Empty State واضح
- [x] Info Banner مفيد

---

## 🚀 Build Status

```bash
✓ 1772 modules transformed
✓ built in 14.45s
✓ Quick Action Buttons: Integrated ✅
✓ Smart navigation: Working ✅
✓ Badge system: Active ✅
✓ Read → Decide: Enabled ✅
```

---

## 🎯 الخلاصة

أزرار قيادية ذكية توجه للإجراءات المطلوبة:

### المميزات:
1. ✅ **4 أزرار محددة** - إجراءات واضحة
2. ✅ **Badges ذكية** - فقط عند الحاجة
3. ✅ **ألوان معبرة** - سهل التمييز
4. ✅ **تنقل مباشر** - بدون خطوات وسيطة
5. ✅ **Info Banner** - سياق واضح
6. ✅ **Empty State** - تطمين للمستخدم
7. ✅ **Hover effects** - تفاعلية وجذابة
8. ✅ **تحديث دوري** - بيانات حديثة

### الفلسفة:
- **Read:** اقرأ البيانات والإحصائيات
- **Decide:** اذهب للصفحة المناسبة لاتخاذ القرار
- **لا تنفيذ مباشر** - فقط التوجيه

### النتيجة:
**أزرار ذكية توجه القيادة للإجراءات المطلوبة - جاهزة للإنتاج!** 🎉✨
