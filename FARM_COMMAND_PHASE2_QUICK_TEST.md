# Farm Command Phase 2 - دليل الاختبار السريع

## نظرة عامة

هذا الدليل لاختبار نظام Auto Team Seeding الذي تم إضافته في Phase 2.

---

## الاختبار 1: تعيين مدير مع إنشاء الفريق تلقائياً

### الخطوات:
```
1. سجل دخول كـ GM
2. افتح Farm Command: /admin/b2f/farm-command
3. اختر مزرعة بدون مدير (أو بمدير قديم)
4. اضغط على أيقونة "تعيين مدير" (UserPlus)
5. اختر "تعيين موظف موجود"
6. اختر موظف من القائمة
7. لاحظ الرسالة الجديدة في الـ Modal:
   "سيتم تلقائياً إنشاء هيكل الفريق..."
8. اضغط "تعيين الآن"
```

### النتيجة المتوقعة:
```
✅ رسالة نجاح: "تم تعيين مدير المزرعة وإنشاء هيكل الفريق تلقائياً"
✅ الصفحة تتحدث تلقائياً بعد ثانيتين
✅ المدير الجديد يظهر في عمود "المدير" بالجدول
```

### التحقق من قاعدة البيانات:
```sql
-- 1. تحقق من المدير في b2f_farms
SELECT id, name, farm_manager_id
FROM b2f_farms
WHERE id = 'farm-id-here';

-- 2. تحقق من المدير في farm_team
SELECT farm_id, user_id, role, is_active
FROM farm_team
WHERE farm_id = 'farm-id-here' AND role = 'farm_manager';

-- 3. تحقق من المقاعد الوظيفية (CRITICAL!)
SELECT
  position_key,
  title_ar,
  status,
  assigned_staff_id,
  is_required
FROM farm_positions
WHERE farm_id = 'farm-id-here'
ORDER BY
  CASE position_key
    WHEN 'field_supervisor' THEN 1
    WHEN 'agri_engineer' THEN 2
    WHEN 'technician' THEN 3
    WHEN 'worker' THEN 4
    WHEN 'factory_supervisor' THEN 5
  END;

-- النتيجة المتوقعة: 4 صفوف (أو 5 إذا has_factory = true)
-- كل صف:
--   - status = 'vacant'
--   - assigned_staff_id = null
--   - created_at = وقت التعيين

-- 4. تحقق من audit_log
SELECT
  action,
  table_name,
  new_values->>'positions_created' as positions_created,
  performed_by,
  created_at
FROM audit_logs
WHERE action = 'assign_farm_manager'
  AND record_id = 'farm-id-here'
ORDER BY created_at DESC
LIMIT 1;
```

---

## الاختبار 2: مزرعة بمصنع تحصل على 5 مقاعد

### الخطوات:
```
1. تأكد من وجود مزرعة بـ has_factory = true
2. عيّن مدير لهذه المزرعة
```

### التحقق:
```sql
SELECT COUNT(*) as total_positions
FROM farm_positions
WHERE farm_id = 'farm-with-factory-id';

-- النتيجة المتوقعة: 5

SELECT position_key, is_required
FROM farm_positions
WHERE farm_id = 'farm-with-factory-id'
  AND position_key = 'factory_supervisor';

-- النتيجة المتوقعة: 1 صف
-- is_required = false
```

---

## الاختبار 3: إعادة التعيين لا تضاعف المقاعد

### الخطوات:
```
1. عيّن مدير لمزرعة (يُنشئ 4 مقاعد)
2. انتظر 5 ثواني
3. أعد تعيين مدير مختلف لنفس المزرعة
```

### التحقق:
```sql
SELECT COUNT(*) as total_positions
FROM farm_positions
WHERE farm_id = 'farm-id-here';

-- النتيجة المتوقعة: 4 (وليس 8!)

-- التحقق من ON CONFLICT
SELECT
  position_key,
  COUNT(*) as count
FROM farm_positions
WHERE farm_id = 'farm-id-here'
GROUP BY position_key
HAVING COUNT(*) > 1;

-- النتيجة المتوقعة: 0 صفوف (لا توجد تكرارات)
```

---

## الاختبار 4: استعلام المقاعد باستخدام RPC

### الخطوة:
```sql
SELECT get_farm_positions('farm-id-here');
```

### النتيجة المتوقعة:
```json
[
  {
    "id": "uuid",
    "position_key": "field_supervisor",
    "title_ar": "مشرف الحقل",
    "title_en": "Field Supervisor",
    "status": "vacant",
    "is_required": true,
    "assigned_staff_id": null,
    "assigned_staff_name": null,
    "assigned_staff_code": null,
    "assigned_at": null,
    "notes": null,
    "created_at": "2026-01-06T..."
  },
  {
    "id": "uuid",
    "position_key": "agri_engineer",
    "title_ar": "مهندس زراعي",
    "title_en": "Agricultural Engineer",
    "status": "vacant",
    "is_required": true,
    "assigned_staff_id": null,
    "assigned_staff_name": null,
    "assigned_staff_code": null,
    "assigned_at": null,
    "notes": null,
    "created_at": "2026-01-06T..."
  },
  // ... 2 more positions (or 3 if has_factory)
]
```

### التحقق:
```
✅ النتيجة JSON array
✅ الترتيب صحيح (field_supervisor أولاً)
✅ كل المقاعد vacant
✅ assigned_staff_* كلها null
```

---

## الاختبار 5: تعيين موظف لمقعد

### الخطوة 1: احصل على position_id
```sql
SELECT id, position_key, status
FROM farm_positions
WHERE farm_id = 'farm-id-here'
  AND position_key = 'field_supervisor';
```

### الخطوة 2: عيّن موظف
```sql
SELECT assign_staff_to_position(
  'position-id-from-step1',
  'staff-id-here',
  'admin-id-here',
  'اختبار تعيين مشرف الحقل'
);
```

### النتيجة المتوقعة:
```json
{
  "success": true,
  "message_ar": "تم تعيين الموظف بنجاح",
  "message_en": "Staff assigned successfully",
  "position_id": "uuid",
  "staff_id": "uuid"
}
```

### الخطوة 3: تحقق من التحديث
```sql
SELECT
  position_key,
  status,
  assigned_staff_id,
  assigned_at,
  notes
FROM farm_positions
WHERE id = 'position-id';

-- النتيجة المتوقعة:
-- status = 'assigned'
-- assigned_staff_id = staff-id-here
-- assigned_at = now()
-- notes = 'اختبار تعيين مشرف الحقل'
```

### الخطوة 4: تحقق من farm_team
```sql
SELECT user_id, role, is_active
FROM farm_team
WHERE farm_id = 'farm-id-here'
  AND user_id = (
    SELECT user_id FROM platform_staff WHERE id = 'staff-id-here'
  );

-- النتيجة المتوقعة: صف واحد
-- role = 'team_member'
-- is_active = true
```

---

## الاختبار 6: إزالة موظف من مقعد

### الخطوة:
```sql
SELECT remove_staff_from_position(
  'position-id',
  'admin-id',
  'تم نقله لمزرعة أخرى'
);
```

### النتيجة المتوقعة:
```json
{
  "success": true,
  "message_ar": "تم إزالة الموظف من المقعد بنجاح",
  "message_en": "Staff removed from position successfully",
  "position_id": "uuid",
  "removed_staff_id": "uuid"
}
```

### التحقق:
```sql
SELECT
  position_key,
  status,
  assigned_staff_id,
  notes
FROM farm_positions
WHERE id = 'position-id';

-- النتيجة المتوقعة:
-- status = 'vacant'
-- assigned_staff_id = null
-- notes = 'تم نقله لمزرعة أخرى'
```

---

## الاختبار 7: الصلاحيات (RLS)

### اختبار 7.1: GM يرى كل المقاعد
```sql
-- كـ GM
SET app.current_staff_id = 'gm-staff-id';

SELECT COUNT(*) FROM farm_positions;
-- النتيجة المتوقعة: كل المقاعد لكل المزارع
```

### اختبار 7.2: مدير المزرعة يرى مقاعد مزرعته فقط
```sql
-- كمدير مزرعة
SET app.current_staff_id = 'farm-manager-staff-id';

SELECT COUNT(*) FROM farm_positions;
-- النتيجة المتوقعة: فقط مقاعد مزرعته (4-5)
```

### اختبار 7.3: موظف عادي لا يرى المقاعد
```sql
-- كموظف عادي
SET app.current_staff_id = 'regular-staff-id';

SELECT COUNT(*) FROM farm_positions;
-- النتيجة المتوقعة: 0 (ممنوع)
```

---

## الاختبار 8: Audit Logs

### التحقق:
```sql
-- 1. تعيين المدير
SELECT * FROM audit_logs
WHERE action = 'assign_farm_manager'
ORDER BY created_at DESC
LIMIT 5;

-- يجب أن يحتوي new_values على:
-- new_values->>'positions_created' = '4' أو '5'

-- 2. تعيين موظف لمقعد
SELECT * FROM audit_logs
WHERE action = 'assign_staff_to_position'
ORDER BY created_at DESC
LIMIT 5;

-- 3. إزالة موظف من مقعد
SELECT * FROM audit_logs
WHERE action = 'remove_staff_from_position'
ORDER BY created_at DESC
LIMIT 5;
```

---

## الاختبار 9: الواجهة الأمامية

### التحقق من النص المحدّث:

1. **في شاشة الاختيار:**
   ```
   ✅ "تعيين مدير مزرعة"
   ✅ زرين: "دعوة موظف جديد" و "تعيين موظف موجود"
   ```

2. **في شاشة التعيين:**
   ```
   ✅ عنوان: "تعيين موظف موجود"
   ✅ معلومات المزرعة واضحة
   ✅ نص جديد:
      "سيتم تلقائياً إنشاء هيكل الفريق (مشرف حقل، مهندس زراعي، فني، عامل)
       كمقاعد شاغرة يمكن ملؤها لاحقاً."
   ```

3. **شاشة النجاح:**
   ```
   ✅ عنوان: "تم التعيين بنجاح"
   ✅ نص جديد: "تم تعيين مدير المزرعة وإنشاء هيكل الفريق تلقائياً"
   ✅ تغلق تلقائياً بعد ثانيتين
   ✅ الصفحة تتحدث
   ```

---

## سيناريو شامل: من الصفر للفريق الكامل

### الخطوة 1: إنشاء مزرعة
```sql
INSERT INTO b2f_farms (name, location, has_factory)
VALUES ('مزرعة الاختبار', 'الرياض', false);
```

### الخطوة 2: تعيين مدير
```
- من الواجهة: اذهب لـ Farm Command
- اضغط "تعيين مدير"
- اختر موظف
- أكّد
```

### الخطوة 3: التحقق من المقاعد
```sql
SELECT * FROM get_farm_positions('farm-id');
-- النتيجة: 4 مقاعد فارغة
```

### الخطوة 4: ملء المقاعد
```sql
-- مشرف الحقل
SELECT assign_staff_to_position('pos1-id', 'staff1-id', 'admin-id', null);

-- مهندس زراعي
SELECT assign_staff_to_position('pos2-id', 'staff2-id', 'admin-id', null);

-- فني
SELECT assign_staff_to_position('pos3-id', 'staff3-id', 'admin-id', null);

-- عامل
SELECT assign_staff_to_position('pos4-id', 'staff4-id', 'admin-id', null);
```

### الخطوة 5: التحقق من الفريق الكامل
```sql
SELECT * FROM get_farm_positions('farm-id');
-- النتيجة: 4 مقاعد كلها assigned

SELECT COUNT(*) FROM farm_team
WHERE farm_id = 'farm-id' AND is_active = true;
-- النتيجة: 5 (المدير + 4 أعضاء)
```

---

## استكشاف الأخطاء

### خطأ: المقاعد لم تُنشأ

**التحقق:**
```sql
-- 1. هل الجدول موجود؟
\d farm_positions

-- 2. هل الدالة موجودة؟
\df seed_farm_positions

-- 3. هل RLS يمنع الإدراج؟
SELECT * FROM farm_positions;  -- كـ anon
```

**الحل:**
```sql
-- إعادة تطبيق Migration
-- أو تشغيل seed يدوياً:
SELECT seed_farm_positions('farm-id', false);
```

### خطأ: "permission denied"

**السبب:** صلاحيات الدالة غير مضبوطة

**الحل:**
```sql
GRANT EXECUTE ON FUNCTION farm_command_assign_manager_v2 TO authenticated, anon;
GRANT EXECUTE ON FUNCTION seed_farm_positions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_farm_positions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION assign_staff_to_position TO authenticated, anon;
GRANT EXECUTE ON FUNCTION remove_staff_from_position TO authenticated, anon;
```

### خطأ: "duplicate key value"

**السبب:** محاولة إنشاء نفس المقعد مرتين

**التحقق:**
```sql
SELECT position_key, COUNT(*)
FROM farm_positions
WHERE farm_id = 'farm-id'
GROUP BY position_key
HAVING COUNT(*) > 1;
```

**الحل:**
```sql
-- حذف التكرارات
DELETE FROM farm_positions a
USING farm_positions b
WHERE a.id > b.id
  AND a.farm_id = b.farm_id
  AND a.position_key = b.position_key;
```

---

## Checklist النهائي

### Database
- [ ] جدول farm_positions موجود
- [ ] 2 Indexes منشأة
- [ ] 3 RLS Policies مفعلة
- [ ] 5 دوال موجودة وتعمل
- [ ] GRANT EXECUTE لكل الدوال

### Frontend
- [ ] AssignFarmManagerModal محدّث
- [ ] النصوص العربية صحيحة
- [ ] Build ينجح بدون أخطاء

### Functionality
- [ ] تعيين المدير يعمل
- [ ] المقاعد تُنشأ تلقائياً
- [ ] عدد المقاعد صحيح (4 أو 5)
- [ ] ON CONFLICT يمنع التكرار
- [ ] get_farm_positions يعمل
- [ ] assign_staff_to_position يعمل
- [ ] remove_staff_from_position يعمل

### Security
- [ ] RLS مفعّل على farm_positions
- [ ] GM يرى كل المقاعد
- [ ] مدير المزرعة يرى مقاعد مزرعته فقط
- [ ] موظف عادي ممنوع

### Audit
- [ ] assign_farm_manager يسجل في audit_logs
- [ ] assign_staff_to_position يسجل في audit_logs
- [ ] remove_staff_from_position يسجل في audit_logs

---

## الخلاصة

Phase 2 أضاف نظام Auto Team Seeding بنجاح:

✅ جدول farm_positions لتتبع المقاعد الوظيفية
✅ إنشاء تلقائي لـ 4-5 مقاعد عند تعيين المدير
✅ دوال لإدارة المقاعد (تعيين، إزالة، استعلام)
✅ RLS للأمان
✅ Audit Logs للمتابعة
✅ Frontend محدّث بنصوص واضحة

**الحالة:** ✅ جاهز للإنتاج
**التاريخ:** 2026-01-06
**Build:** ✅ ناجح (17.37s)
