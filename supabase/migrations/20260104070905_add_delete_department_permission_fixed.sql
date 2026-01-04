/*
  # إضافة صلاحية حذف الأقسام

  1. الوصف
    - إضافة صلاحية موسعة لحذف أي قسم من الأقسام الديناميكية
    - يمكن منح هذه الصلاحية للمديرين أو الأقسام

  2. التعديلات
    - إزالة قيد NOT NULL من department_id للسماح بالصلاحيات العامة
    - إضافة صلاحية delete_any_department
*/

-- السماح بإدراج صلاحيات بدون department_id (صلاحيات عامة)
ALTER TABLE department_permissions ALTER COLUMN department_id DROP NOT NULL;

-- إضافة الصلاحية كسجل عام يمكن الاستناد إليه
DO $$
BEGIN
  -- التأكد من عدم وجود الصلاحية مسبقاً
  IF NOT EXISTS (
    SELECT 1 FROM department_permissions
    WHERE permission_key = 'delete_any_department'
  ) THEN
    INSERT INTO department_permissions (
      permission_key,
      permission_name_ar,
      is_granted,
      granted_at
    ) VALUES (
      'delete_any_department',
      'حذف أي قسم - صلاحية موسعة',
      false,
      NOW()
    );
  END IF;
END $$;

-- إضافة تعليق توضيحي
COMMENT ON TABLE department_permissions IS 'جدول صلاحيات الأقسام - يدعم الصلاحيات العامة والصلاحيات الخاصة بالأقسام';
COMMENT ON COLUMN department_permissions.department_id IS 'معرف القسم - NULL للصلاحيات العامة';
COMMENT ON COLUMN department_permissions.permission_key IS 'مفتاح الصلاحية - delete_any_department للسماح بحذف الأقسام';
