# اختبار سريع: Radar الأقسام

## اختبار B2F Radar

### الاختبار 1: مزرعة تحتاج تدخل

```sql
-- إيقاف مزرعة للاختبار
UPDATE b2f_farms
SET operational_status = 'suspended'
WHERE id = (SELECT id FROM b2f_farms LIMIT 1);

-- افتح الصفحة ولاحظ ظهورها في "مزارع تحتاج تدخل"
```

**المتوقع:**
- ✅ المزرعة تظهر بخلفية حمراء
- ✅ تعرض "موقوفة"
- ✅ الضغط عليها ينقل لصفحة المزرعة

---

### الاختبار 2: مزرعة جديدة

```sql
-- إنشاء مزرعة جديدة
INSERT INTO b2f_farms (
  name,
  location,
  operational_status
) VALUES (
  'مزرعة اختبار جديدة',
  'الرياض',
  'operational'
);

-- افتح الصفحة ولاحظ ظهورها في "مزارع جديدة"
```

**المتوقع:**
- ✅ المزرعة تظهر بخلفية زرقاء
- ✅ تعرض "منذ 0 يوم"
- ✅ الضغط عليها ينقل لصفحة المزرعة

---

### الاختبار 3: مزرعة عالية المصروف

```sql
-- إضافة مصروفات كبيرة لمزرعة
INSERT INTO farm_expenses (
  farm_id,
  description,
  amount,
  category,
  approval_status,
  approved_by,
  approved_at,
  expense_date
) VALUES
  ((SELECT id FROM b2f_farms LIMIT 1), 'مصروف 1', 2000, 'maintenance', 'approved', (SELECT id FROM platform_staff LIMIT 1), now(), CURRENT_DATE),
  ((SELECT id FROM b2f_farms LIMIT 1), 'مصروف 2', 2500, 'maintenance', 'approved', (SELECT id FROM platform_staff LIMIT 1), now(), CURRENT_DATE),
  ((SELECT id FROM b2f_farms LIMIT 1), 'مصروف 3', 1500, 'maintenance', 'approved', (SELECT id FROM platform_staff LIMIT 1), now(), CURRENT_DATE);

-- افتح الصفحة ولاحظ ظهورها في "مزارع عالية المصروف"
```

**المتوقع:**
- ✅ المزرعة تظهر بخلفية برتقالية
- ✅ تعرض المبلغ الإجمالي
- ✅ تعرض عدد المصروفات
- ✅ الضغط عليها ينقل لصفحة المزرعة

---

## اختبار B2B Radar

### الاختبار 4: مزاد حرج (له تقارير)

```sql
-- إضافة تقرير لمزاد
INSERT INTO auction_reports (
  auction_id,
  reporter_id,
  reason,
  description,
  status
) VALUES (
  (SELECT id FROM auctions WHERE status = 'active' LIMIT 1),
  (SELECT id FROM profiles LIMIT 1),
  'spam',
  'تقرير اختبار',
  'pending'
);

-- افتح الصفحة ولاحظ ظهوره في "مزادات حرجة"
```

**المتوقع:**
- ✅ المزاد يظهر بخلفية حمراء
- ✅ يعرض عدد التقارير المعلقة
- ✅ الضغط عليه ينقل لغرفة عمليات المزادات

---

### الاختبار 5: مزاد متوقف

```sql
-- إيقاف مزاد
UPDATE auctions
SET status = 'suspended'
WHERE id = (SELECT id FROM auctions WHERE status = 'active' LIMIT 1);

-- افتح الصفحة ولاحظ ظهوره في "مزادات متوقفة"
```

**المتوقع:**
- ✅ المزاد يظهر بخلفية رمادية
- ✅ يعرض "معلق"
- ✅ الضغط عليه ينقل لغرفة عمليات المزادات

---

### الاختبار 6: مزاد قريب الإغلاق

```sql
-- إنشاء مزاد ينتهي قريباً
INSERT INTO auctions (
  title,
  description,
  starting_price,
  current_price,
  ends_at,
  status,
  seller_id
) VALUES (
  'مزاد اختبار ينتهي قريباً',
  'وصف المزاد',
  1000,
  1000,
  now() + interval '8 hours',
  'active',
  (SELECT id FROM profiles LIMIT 1)
);

-- افتح الصفحة ولاحظ ظهوره في "مزادات قريبة الإغلاق"
```

**المتوقع:**
- ✅ المزاد يظهر بخلفية صفراء
- ✅ يعرض "8 ساعة متبقية"
- ✅ يعرض عدد العروض
- ✅ الضغط عليه ينقل لغرفة عمليات المزادات

---

## اختبار التحديث الفوري

### الاختبار 7: تحديث تلقائي

```sql
-- 1. افتح صفحة Executive Pulse في متصفح
-- 2. في نافذة SQL أخرى، نفذ:

UPDATE b2f_farms
SET operational_status = 'suspended'
WHERE id = (SELECT id FROM b2f_farms WHERE operational_status = 'operational' LIMIT 1);

-- 3. لاحظ الصفحة بدون refresh
```

**المتوقع:**
- ✅ العداد يتحدث فوراً (<1 ثانية)
- ✅ المزرعة تظهر في "مزارع تحتاج تدخل"
- ✅ بدون الحاجة لـ refresh

---

## اختبار التنقل

### الاختبار 8: الانتقال لصفحة المزرعة

**الخطوات:**
1. افتح `/admin/operations-room/global`
2. اضغط على أي مزرعة في B2F Radar

**المتوقع:**
- ✅ ينقلك لـ `/admin/operations-room/b2f/farms/{farmId}`

---

### الاختبار 9: الانتقال لغرفة عمليات B2F

**الخطوات:**
1. افتح `/admin/operations-room/global`
2. اضغط على "غرفة عمليات المزارع"

**المتوقع:**
- ✅ ينقلك لـ `/admin/operations-room/b2f`

---

### الاختبار 10: الانتقال لغرفة عمليات B2B

**الخطوات:**
1. افتح `/admin/operations-room/global`
2. اضغط على "غرفة عمليات المزادات"

**المتوقع:**
- ✅ ينقلك لـ `/admin/operations-room/b2b`

---

## نتيجة الاختبارات الشاملة

### إذا نجحت جميع الاختبارات:
```
✅ B2F Radar يعمل بشكل صحيح
✅ B2B Radar يعمل بشكل صحيح
✅ التحديث الفوري نشط
✅ التنقل يعمل بشكل صحيح
✅ النظام جاهز للإنتاج
```

---

## استعلامات سريعة للاختبار

### جلب بيانات B2F Radar:
```sql
SELECT jsonb_pretty(get_b2f_radar());
```

### جلب بيانات B2B Radar:
```sql
SELECT jsonb_pretty(get_b2b_radar());
```

### جلب كل شيء:
```sql
SELECT jsonb_pretty(get_complete_executive_dashboard());
```

---

## تنظيف بيانات الاختبار

```sql
-- حذف المزارع الاختبارية
DELETE FROM b2f_farms
WHERE name LIKE '%اختبار%';

-- إعادة حالة المزارع للطبيعي
UPDATE b2f_farms
SET operational_status = 'operational'
WHERE operational_status = 'suspended';

-- حذف التقارير الاختبارية
DELETE FROM auction_reports
WHERE description LIKE '%اختبار%';

-- حذف المزادات الاختبارية
DELETE FROM auctions
WHERE title LIKE '%اختبار%';
```
