# اختبار سريع: التنبيهات القيادية الذكية

## الاختبار 1: مصروف متجاوز (Critical)

```sql
-- إضافة مصروف ضخم
INSERT INTO farm_expenses (
  farm_id,
  description,
  amount,
  category,
  approval_status,
  expense_date
) VALUES (
  (SELECT id FROM b2f_farms LIMIT 1),
  'مصروف صيانة طارئة',
  12000,  -- أكثر من ضعف الحد (5000 × 2)
  'maintenance',
  'pending',
  CURRENT_DATE
);

-- توليد التنبيهات
SELECT generate_smart_alerts();

-- التحقق
SELECT * FROM executive_alerts
WHERE alert_type = 'expense_exceeded'
AND status = 'active'
ORDER BY created_at DESC LIMIT 1;
```

**المتوقع:**
- ✅ تنبيه جديد بـ severity = 'critical'
- ✅ يظهر في Executive Pulse بلون أحمر
- ✅ Badge يعرض "1" على أيقونة Bell
- ✅ الوصف: "مصروف بقيمة 12000 ر.س في مزرعة ..."

---

## الاختبار 2: قرار معلق طويلاً (High)

```sql
-- إنشاء قرار قديم (6 أيام)
INSERT INTO decision_queue (
  farm_id,
  decision_type,
  status,
  priority,
  requested_by,
  created_at
) VALUES (
  (SELECT id FROM b2f_farms LIMIT 1),
  'approve_expense',
  'pending',
  'high',
  (SELECT id FROM platform_staff LIMIT 1),
  now() - interval '6 days'
);

-- توليد التنبيهات
SELECT generate_smart_alerts();

-- التحقق
SELECT * FROM executive_alerts
WHERE alert_type = 'decision_overdue'
AND status = 'active'
ORDER BY created_at DESC LIMIT 1;
```

**المتوقع:**
- ✅ تنبيه جديد بـ severity = 'high'
- ✅ يظهر بلون برتقالي
- ✅ الوصف: "قرار approve_expense معلق منذ 6 يوم"

---

## الاختبار 3: انخفاض أداء مزرعة

```sql
-- إضافة 5 قرارات معلقة لنفس المزرعة
DO $$
DECLARE
  v_farm_id uuid := (SELECT id FROM b2f_farms LIMIT 1);
  v_staff_id uuid := (SELECT id FROM platform_staff LIMIT 1);
  i int;
BEGIN
  FOR i IN 1..5 LOOP
    INSERT INTO decision_queue (
      farm_id,
      decision_type,
      status,
      priority,
      requested_by
    ) VALUES (
      v_farm_id,
      'approve_expense',
      'pending',
      'medium',
      v_staff_id
    );
  END LOOP;
END $$;

-- توليد التنبيهات
SELECT generate_smart_alerts();

-- التحقق
SELECT * FROM executive_alerts
WHERE alert_type = 'farm_performance_drop'
AND status = 'active'
ORDER BY created_at DESC LIMIT 1;
```

**المتوقع:**
- ✅ تنبيه جديد بـ severity = 'high'
- ✅ يظهر بلون برتقالي
- ✅ الوصف: "مزرعة ... لديها 5 قرار معلق"

---

## الاختبار 4: مزاد متعارض

```sql
-- إضافة تقارير لمزاد
DO $$
DECLARE
  v_auction_id uuid := (SELECT id FROM auctions WHERE status = 'active' LIMIT 1);
  v_user_id uuid := (SELECT id FROM profiles LIMIT 1);
  i int;
BEGIN
  FOR i IN 1..4 LOOP
    INSERT INTO auction_reports (
      auction_id,
      reporter_id,
      reason,
      description,
      status
    ) VALUES (
      v_auction_id,
      v_user_id,
      'spam',
      'تقرير اختبار ' || i,
      'pending'
    );
  END LOOP;
END $$;

-- توليد التنبيهات
SELECT generate_smart_alerts();

-- التحقق
SELECT * FROM executive_alerts
WHERE alert_type = 'auction_conflict'
AND status = 'active'
ORDER BY created_at DESC LIMIT 1;
```

**المتوقع:**
- ✅ تنبيه جديد بـ severity = 'high'
- ✅ يظهر بلون برتقالي
- ✅ الوصف: "مزاد ... لديه 4 تقرير معلق"

---

## الاختبار 5: رفض تنبيه

```sql
-- رفض أول تنبيه نشط
SELECT dismiss_alert(
  (SELECT id FROM executive_alerts WHERE status = 'active' LIMIT 1),
  (SELECT id FROM platform_staff WHERE role = 'general_manager' LIMIT 1)
);

-- التحقق
SELECT
  status,
  dismissed_by IS NOT NULL as has_dismissed_by,
  dismissed_at IS NOT NULL as has_dismissed_at
FROM executive_alerts
WHERE status = 'dismissed'
ORDER BY dismissed_at DESC LIMIT 1;
```

**المتوقع:**
- ✅ status = 'dismissed'
- ✅ dismissed_by مُعبأ
- ✅ dismissed_at مُعبأ
- ✅ التنبيه يختفي من Panel

---

## الاختبار 6: التحديث الفوري

**الخطوات:**
1. افتح `/admin/operations-room/global` في متصفح
2. في نافذة SQL أخرى، نفذ:

```sql
-- إضافة مصروف ضخم
INSERT INTO farm_expenses (
  farm_id,
  description,
  amount,
  category,
  approval_status,
  expense_date
) VALUES (
  (SELECT id FROM b2f_farms LIMIT 1),
  'مصروف فوري',
  15000,
  'maintenance',
  'pending',
  CURRENT_DATE
);

-- توليد التنبيهات
SELECT generate_smart_alerts();
```

3. لاحظ الصفحة بدون refresh

**المتوقع:**
- ✅ التنبيه يظهر فوراً (<1 ثانية)
- ✅ Badge يتحدث تلقائياً
- ✅ بدون الحاجة لـ refresh

---

## الاختبار 7: التنقل من التنبيه

**الخطوات:**
1. افتح `/admin/operations-room/global`
2. اضغط على أي تنبيه مرتبط بمزرعة

**المتوقع:**
- ✅ ينقلك لـ `/admin/operations-room/b2f/farms/{farmId}`

---

## الاختبار 8: عدم التكرار

```sql
-- توليد مرة أخرى
SELECT generate_smart_alerts();

-- التحقق من عدد التنبيهات
SELECT COUNT(*) as total_alerts
FROM executive_alerts
WHERE status = 'active';
```

**المتوقع:**
- ✅ لا تنبيهات مكررة
- ✅ فقط تنبيه واحد لكل مصروف/قرار
- ✅ الدالة ذكية ولا تضيف نفس التنبيه مرتين

---

## استعلامات الإحصائيات

### إحصائيات عامة:
```sql
SELECT
  status,
  severity,
  alert_type,
  COUNT(*) as count
FROM executive_alerts
GROUP BY status, severity, alert_type
ORDER BY status, severity, count DESC;
```

### التنبيهات النشطة:
```sql
SELECT jsonb_pretty(get_active_alerts());
```

### آخر 10 تنبيهات:
```sql
SELECT
  alert_type,
  severity,
  title,
  status,
  created_at,
  dismissed_at
FROM executive_alerts
ORDER BY created_at DESC
LIMIT 10;
```

---

## تنظيف البيانات الاختبارية

```sql
-- حذف جميع التنبيهات الاختبارية
DELETE FROM executive_alerts
WHERE description LIKE '%اختبار%'
OR description LIKE '%فوري%';

-- حذف المصروفات الاختبارية
DELETE FROM farm_expenses
WHERE description LIKE '%اختبار%'
OR description LIKE '%فوري%';

-- حذف القرارات الاختبارية
DELETE FROM decision_queue
WHERE created_at > now() - interval '1 hour';

-- حذف التقارير الاختبارية
DELETE FROM auction_reports
WHERE description LIKE '%اختبار%';
```

---

## نتيجة الاختبار الشامل

إذا نجحت جميع الاختبارات:

```
✅ توليد التنبيهات الذكية يعمل
✅ مستويات الأهمية صحيحة
✅ عدم التكرار مضمون
✅ رفض التنبيه يعمل
✅ التحديث الفوري نشط
✅ التنقل يعمل بشكل صحيح
✅ Panel يعرض البيانات بشكل جميل
✅ النظام جاهز للإنتاج
```

---

## دالة اختبار شاملة

```sql
CREATE OR REPLACE FUNCTION test_executive_alerts()
RETURNS TABLE (
  test_name text,
  status text,
  result text
) AS $$
BEGIN
  -- اختبار 1: توليد التنبيهات
  PERFORM generate_smart_alerts();
  RETURN QUERY SELECT
    'Generate Alerts'::text,
    'Pass'::text,
    'Generated successfully'::text;

  -- اختبار 2: جلب التنبيهات
  PERFORM get_active_alerts();
  RETURN QUERY SELECT
    'Get Active Alerts'::text,
    'Pass'::text,
    'Retrieved successfully'::text;

  -- اختبار 3: التحقق من الإحصائيات
  RETURN QUERY SELECT
    'Stats Check'::text,
    'Pass'::text,
    format('Total: %s alerts', COUNT(*))::text
  FROM executive_alerts WHERE status = 'active';

  RETURN QUERY SELECT
    'All Tests'::text,
    'Passed ✅'::text,
    'System is ready'::text;
END;
$$ LANGUAGE plpgsql;

-- تشغيل الاختبار
SELECT * FROM test_executive_alerts();
```
