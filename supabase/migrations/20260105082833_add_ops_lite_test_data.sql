/*
  # إضافة بيانات تجريبية لـ Ops Lite

  1. البيانات
    - ترقية المزرعة التجريبية إلى active
    - إضافة مهمة يومية
    - إضافة بلاغ عطل
    - إضافة سجل صيانة

  2. الملاحظات
    - يجب أن تكون المزرعة التجريبية موجودة مسبقاً
    - يجب أن يكون operational farm موجود
*/

-- 1. ترقية المزرعة إلى active
UPDATE b2f_farms
SET operational_status = 'active',
    updated_at = now()
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE fc_operational_farms
SET operational_status = 'active',
    updated_at = now()
WHERE reference_farm_id = '22222222-2222-2222-2222-222222222222';

-- 2. إضافة مهمة يومية تجريبية
INSERT INTO fc_daily_tasks (
  operational_farm_id,
  task_title,
  task_description,
  priority,
  status,
  created_at
)
SELECT
  id,
  'ري القطاع الشمالي',
  'ري جميع الأشجار في القطاع الشمالي مع التأكد من تساوي توزيع المياه',
  'high',
  'pending',
  now()
FROM fc_operational_farms
WHERE reference_farm_id = '22222222-2222-2222-2222-222222222222'
LIMIT 1;

-- 3. إضافة بلاغ عطل تجريبي
INSERT INTO fc_incidents (
  operational_farm_id,
  incident_title,
  incident_description,
  incident_type,
  priority,
  status,
  created_at
)
SELECT
  id,
  'عطل في مضخة الري',
  'توقفت المضخة الرئيسية عن العمل بشكل مفاجئ. يحتاج لتدخل سريع.',
  'equipment_failure',
  'critical',
  'reported',
  now()
FROM fc_operational_farms
WHERE reference_farm_id = '22222222-2222-2222-2222-222222222222'
LIMIT 1;

-- 4. إضافة سجل صيانة تجريبي
INSERT INTO fc_equipment_maintenance (
  operational_farm_id,
  equipment_name,
  equipment_type,
  maintenance_type,
  status_after,
  notes,
  maintenance_date,
  created_at
)
SELECT
  id,
  'جرار زراعي 250HP',
  'tractor',
  'routine',
  'working',
  'صيانة دورية شاملة: تغيير الزيت وفحص الإطارات والفرامل',
  now(),
  now()
FROM fc_operational_farms
WHERE reference_farm_id = '22222222-2222-2222-2222-222222222222'
LIMIT 1;