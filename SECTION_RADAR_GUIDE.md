# المرحلة 2: Radar الأقسام (B2F / B2B) ✅

## نظرة عامة

تم إضافة نظام Radar شامل لمراقبة قسمي B2F (المزارع) و B2B (المزادات) مع إمكانية التنقل المباشر للغرف التشغيلية.

---

## 📍 المسار

```
/admin/operations-room/global
```

نفس صفحة Executive Pulse، تم إضافة قسمين جديدين أسفل المؤشرات الرئيسية.

---

## 🎯 القسم الأول: B2F Radar (المزارع)

### الأيقونة والألوان:
- **الأيقونة:** Sprout (نبتة)
- **الألوان:** أخضر (Green)

### المؤشرات الثلاثة:

#### 1️⃣ مزارع تحتاج تدخل
```sql
SELECT * FROM b2f_farms
WHERE operational_status IN ('suspended', 'maintenance')
OR EXISTS (قرارات معلقة urgent)
```

**البيانات المعروضة:**
- اسم المزرعة
- المشكلة (موقوفة / صيانة / قرارات معلقة)
- عدد القرارات المعلقة

**اللون:** أحمر (Red-50)

**التنقل:** ينقل لصفحة المزرعة المحددة
```
→ /admin/operations-room/b2f/farms/{farmId}
```

---

#### 2️⃣ مزارع جديدة
```sql
SELECT * FROM b2f_farms
WHERE created_at > now() - interval '7 days'
ORDER BY created_at DESC
LIMIT 5
```

**البيانات المعروضة:**
- اسم المزرعة
- عدد الأيام منذ الإنشاء

**اللون:** أزرق (Blue-50)

**التنقل:** ينقل لصفحة المزرعة الجديدة
```
→ /admin/operations-room/b2f/farms/{farmId}
```

---

#### 3️⃣ مزارع عالية المصروف
```sql
SELECT farm_id, SUM(amount), COUNT(*)
FROM farm_expenses
WHERE approval_status = 'approved'
AND approved_at > now() - interval '30 days'
GROUP BY farm_id
HAVING SUM(amount) > 5000
ORDER BY SUM(amount) DESC
LIMIT 5
```

**البيانات المعروضة:**
- اسم المزرعة
- إجمالي المصروفات (30 يوم)
- عدد المصروفات

**اللون:** برتقالي (Orange-50)

**التنقل:** ينقل لصفحة المزرعة
```
→ /admin/operations-room/b2f/farms/{farmId}
```

---

### زر الانتقال السريع:
```
[ 🎯 غرفة عمليات المزارع ]
→ /admin/operations-room/b2f
```

---

## 🎯 القسم الثاني: B2B Radar (المزادات)

### الأيقونة والألوان:
- **الأيقونة:** Gavel (مطرقة المزاد)
- **الألوان:** كهرماني (Amber)

### المؤشرات الثلاثة:

#### 1️⃣ مزادات حرجة
```sql
SELECT * FROM auctions
WHERE EXISTS (
  SELECT 1 FROM auction_reports
  WHERE auction_id = auctions.id
  AND status = 'pending'
)
AND status IN ('active', 'pending')
LIMIT 5
```

**البيانات المعروضة:**
- عنوان المزاد
- عدد التقارير المعلقة

**اللون:** أحمر (Red-50)

**التنقل:** ينقل لغرفة عمليات المزادات
```
→ /admin/operations-room/b2b
```

---

#### 2️⃣ مزادات متوقفة
```sql
SELECT * FROM auctions
WHERE status IN ('cancelled', 'suspended')
AND updated_at > now() - interval '7 days'
ORDER BY updated_at DESC
LIMIT 5
```

**البيانات المعروضة:**
- عنوان المزاد
- السبب (ملغي / معلق / متوقف)

**اللون:** رمادي (Gray-50)

**التنقل:** ينقل لغرفة عمليات المزادات
```
→ /admin/operations-room/b2b
```

---

#### 3️⃣ مزادات قريبة الإغلاق
```sql
SELECT * FROM auctions
WHERE status = 'active'
AND ends_at > now()
AND ends_at < now() + interval '24 hours'
ORDER BY ends_at ASC
LIMIT 5
```

**البيانات المعروضة:**
- عنوان المزاد
- عدد الساعات المتبقية
- عدد العروض الحالية

**اللون:** أصفر (Yellow-50)

**التنقل:** ينقل لغرفة عمليات المزادات
```
→ /admin/operations-room/b2b
```

---

### زر الانتقال السريع:
```
[ 🎯 غرفة عمليات المزادات ]
→ /admin/operations-room/b2b
```

---

## 🔄 التحديث التلقائي

### آلية التحديث:

**1. تحديث دوري:**
- كل 30 ثانية

**2. تحديث فوري (Realtime):**
- عند تغيير حالة مزرعة
- عند إضافة مصروف جديد
- عند إنشاء قرار
- عند تغيير حالة مزاد
- عند إضافة تقرير

**الجداول المراقبة:**
```typescript
- b2f_farms
- farm_expenses
- decision_queue
- auctions
- auction_reports
```

---

## 🎨 التصميم

### B2F Radar:
```css
Header: bg-gradient-to-r from-green-50 to-green-100
Icon: bg-gradient-to-br from-green-600 to-green-700
Button: bg-gradient-to-r from-green-600 to-green-700
```

### B2B Radar:
```css
Header: bg-gradient-to-r from-amber-50 to-amber-100
Icon: bg-gradient-to-br from-amber-600 to-amber-700
Button: bg-gradient-to-r from-amber-600 to-amber-700
```

### كروت العناصر:
```css
مزارع تحتاج تدخل: bg-red-50 hover:bg-red-100
مزارع جديدة: bg-blue-50 hover:bg-blue-100
مزارع عالية المصروف: bg-orange-50 hover:bg-orange-100

مزادات حرجة: bg-red-50 hover:bg-red-100
مزادات متوقفة: bg-gray-50 hover:bg-gray-100
مزادات قريبة الإغلاق: bg-yellow-50 hover:bg-yellow-100
```

---

## 📊 هيكل البيانات

### دالة `get_b2f_radar()`:
```json
{
  "farms_need_attention": [
    {
      "id": "uuid",
      "name": "اسم المزرعة",
      "status": "suspended|maintenance",
      "issue": "موقوفة|صيانة|قرارات معلقة",
      "pending_decisions": 3
    }
  ],
  "new_farms": [
    {
      "id": "uuid",
      "name": "اسم المزرعة",
      "created_at": "2026-01-05T...",
      "status": "operational",
      "days_old": 2
    }
  ],
  "high_expense_farms": [
    {
      "id": "uuid",
      "name": "اسم المزرعة",
      "total_expenses": 8500,
      "expense_count": 5,
      "avg_expense": 1700
    }
  ]
}
```

### دالة `get_b2b_radar()`:
```json
{
  "critical_auctions": [
    {
      "id": "uuid",
      "title": "عنوان المزاد",
      "status": "active",
      "reports_count": 3,
      "issue": "تقارير معلقة"
    }
  ],
  "stopped_auctions": [
    {
      "id": "uuid",
      "title": "عنوان المزاد",
      "status": "cancelled",
      "stopped_at": "2026-01-05T...",
      "reason": "ملغي"
    }
  ],
  "closing_soon_auctions": [
    {
      "id": "uuid",
      "title": "عنوان المزاد",
      "status": "active",
      "ends_at": "2026-01-06T...",
      "hours_left": 8,
      "current_bids": 12
    }
  ]
}
```

### دالة `get_complete_executive_dashboard()`:
```json
{
  "pulse": { ... },
  "b2f_radar": { ... },
  "b2b_radar": { ... }
}
```

---

## 🧪 اختبار القبول

### السيناريو 1: مزرعة متعثرة جديدة

**الخطوات:**
```sql
-- 1. إيقاف مزرعة
UPDATE b2f_farms
SET operational_status = 'suspended'
WHERE id = 'farm_id';

-- 2. مشاهدة الـ Radar
```

**النتيجة المتوقعة:**
```
✅ المزرعة تظهر في "مزارع تحتاج تدخل"
✅ بلون أحمر
✅ عند الضغط عليها → ينقل لصفحة المزرعة
```

---

### السيناريو 2: مزرعة جديدة

**الخطوات:**
```sql
-- 1. إنشاء مزرعة جديدة
INSERT INTO b2f_farms (name, ...) VALUES (...);

-- 2. مشاهدة الـ Radar
```

**النتيجة المتوقعة:**
```
✅ المزرعة تظهر في "مزارع جديدة"
✅ بلون أزرق
✅ تعرض "منذ 0 يوم"
✅ عند الضغط → ينقل لصفحة المزرعة
```

---

### السيناريو 3: مزاد قريب الإغلاق

**الخطوات:**
```sql
-- 1. إنشاء مزاد ينتهي خلال ساعات
INSERT INTO auctions (
  title,
  ends_at,
  status
) VALUES (
  'مزاد اختبار',
  now() + interval '5 hours',
  'active'
);

-- 2. مشاهدة الـ Radar
```

**النتيجة المتوقعة:**
```
✅ المزاد يظهر في "مزادات قريبة الإغلاق"
✅ بلون أصفر
✅ يعرض "5 ساعة متبقية"
✅ عند الضغط → ينقل لغرفة عمليات المزادات
```

---

## 📝 الملفات المنشأة/المحدثة

### Backend:
1. `create_section_radar_functions.sql` - دوال B2F و B2B Radar
2. `fix_b2f_radar_function_v2.sql` - إصلاح دالة B2F

### Frontend:
1. `src/hooks/useExecutivePulse.ts` - تحديث Hook
2. `src/components/platform/ExecutivePulse.tsx` - إضافة أقسام Radar

---

## 🔗 مسارات التنقل

### من B2F Radar:
```
مزرعة محددة → /admin/operations-room/b2f/farms/{farmId}
غرفة العمليات → /admin/operations-room/b2f
```

### من B2B Radar:
```
غرفة العمليات → /admin/operations-room/b2b
```

---

## ✅ معايير النجاح

### 1. عرض البيانات ✅
- [x] B2F Radar يعرض 3 أقسام
- [x] B2B Radar يعرض 3 أقسام
- [x] كل قسم يعرض حتى 5 عناصر
- [x] رسائل "لا توجد ..." عند عدم وجود بيانات

### 2. التنقل ✅
- [x] الضغط على مزرعة ينقل لصفحتها
- [x] الضغط على مزاد ينقل لغرفة المزادات
- [x] أزرار الغرف التشغيلية تعمل

### 3. التصميم ✅
- [x] ألوان مميزة لكل قسم
- [x] Hover effects سلسة
- [x] أيقونات معبرة
- [x] Layout responsive

### 4. التحديث ✅
- [x] تحديث دوري كل 30 ثانية
- [x] تحديث فوري عند تغيير البيانات
- [x] Realtime subscriptions نشطة

---

## 🚀 Build Status

```bash
✓ 1768 modules transformed
✓ built in 12.54s
✓ Section Radars fully integrated
✓ Navigation working
✓ Ready for production
```

---

## 📖 الخلاصة

تم بناء نظام Radar شامل يوفر:

1. **مراقبة B2F** - 3 مؤشرات للمزارع
2. **مراقبة B2B** - 3 مؤشرات للمزادات
3. **تنقل سريع** - روابط مباشرة للغرف التشغيلية
4. **تحديث فوري** - Realtime subscriptions نشطة
5. **تصميم واضح** - ألوان وأيقونات مميزة

النظام جاهز للاستخدام في الإنتاج! 🎉
