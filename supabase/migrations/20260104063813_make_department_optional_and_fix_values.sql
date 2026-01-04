/*
  # جعل حقل القسم اختياري وإصلاح القيم

  1. التعديلات
    - إصلاح القيم غير الصحيحة في department
    - إزالة القيد NOT NULL من حقل department
    - السماح بقيم NULL أو فارغة

  2. الأمان
    - الحفاظ على البيانات الموجودة
    - تحديث القيم غير الصحيحة إلى قيم صحيحة
*/

-- إصلاح القيم غير الصحيحة
UPDATE platform_staff
SET department = CASE
  WHEN department = 'SALES' THEN 'B2B'
  WHEN department = '33' THEN NULL
  WHEN department NOT IN ('HQ', 'B2F', 'B2B', 'Support', 'Finance') THEN NULL
  ELSE department
END
WHERE department IS NOT NULL
  AND department NOT IN ('HQ', 'B2F', 'B2B', 'Support', 'Finance');

-- إزالة القيد القديم على department
DO $$
BEGIN
  ALTER TABLE platform_staff
  DROP CONSTRAINT IF EXISTS platform_staff_department_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- تعديل حقل department ليصبح nullable
ALTER TABLE platform_staff
ALTER COLUMN department DROP NOT NULL;

-- إضافة قيد CHECK جديد يسمح بـ NULL أو قيم فارغة
ALTER TABLE platform_staff
ADD CONSTRAINT platform_staff_department_check
CHECK (
  department IS NULL OR
  department = '' OR
  department IN ('HQ', 'B2F', 'B2B', 'Support', 'Finance', 'hq', 'b2b', 'b2f', 'support', 'finance')
);

-- إضافة تعليق على الحقل
COMMENT ON COLUMN platform_staff.department IS 'القسم الذي يتبع له الموظف (اختياري - يمكن أن يكون NULL)';

-- تحديث الإحصائيات
ANALYZE platform_staff;
