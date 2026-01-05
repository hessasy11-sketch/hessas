/*
  # تصنيف الأقسام في نظام الصلاحيات

  1. الهدف:
    - فصل B2F عن B2B في الصلاحيات
    - تصنيف الأقسام بوضوح
    - منع الخلط بين التخصصات

  2. التغييرات:
    - إضافة department_category إلى permission_packs
    - إضافة scope_type لتحديد نطاق العمل
    - تحديث البيانات الموجودة
*/

-- إضافة حقول التصنيف
ALTER TABLE permission_packs
ADD COLUMN IF NOT EXISTS department_category text,
ADD COLUMN IF NOT EXISTS scope_type text,
ADD COLUMN IF NOT EXISTS allows_cross_department boolean DEFAULT false;

-- إضافة قيود
ALTER TABLE permission_packs
DROP CONSTRAINT IF EXISTS valid_department_category;

ALTER TABLE permission_packs
ADD CONSTRAINT valid_department_category
CHECK (department_category IN ('b2f', 'b2b', 'finance', 'marketing', 'executive', 'support', 'general'));

ALTER TABLE permission_packs
DROP CONSTRAINT IF EXISTS valid_scope_type;

ALTER TABLE permission_packs
ADD CONSTRAINT valid_scope_type
CHECK (scope_type IN ('farm_specific', 'auction_specific', 'department_wide', 'company_wide', 'executive'));

-- تحديث permission_packs الموجودة بناءً على target_boards
UPDATE permission_packs
SET 
  department_category = CASE
    WHEN 'b2f_dashboard' = ANY(target_boards) THEN 'b2f'
    WHEN 'b2b_dashboard' = ANY(target_boards) THEN 'b2b'
    WHEN 'hq_dashboard' = ANY(target_boards) THEN 'executive'
    ELSE 'general'
  END,
  scope_type = CASE
    WHEN 'hq_dashboard' = ANY(target_boards) THEN 'executive'
    WHEN array_length(target_boards, 1) > 1 THEN 'company_wide'
    ELSE 'department_wide'
  END,
  allows_cross_department = CASE
    WHEN 'hq_dashboard' = ANY(target_boards) THEN true
    WHEN array_length(target_boards, 1) > 1 THEN true
    ELSE false
  END
WHERE department_category IS NULL;

-- إضافة حقل في platform_staff
ALTER TABLE platform_staff
ADD COLUMN IF NOT EXISTS primary_department text;

-- تحديث primary_department بناءً على department الموجود
UPDATE platform_staff
SET primary_department = CASE
  WHEN department ILIKE '%farm%' OR department ILIKE '%b2f%' THEN 'b2f'
  WHEN department ILIKE '%auction%' OR department ILIKE '%b2b%' THEN 'b2b'
  WHEN department ILIKE '%finance%' OR department ILIKE '%\u0645\u0627\u0644%' THEN 'finance'
  WHEN department ILIKE '%marketing%' OR department ILIKE '%\u062a\u0633\u0648\u064a\u0642%' THEN 'marketing'
  WHEN role = 'super_admin' OR role = 'general_manager' THEN 'executive'
  ELSE 'general'
END
WHERE primary_department IS NULL;

-- دالة للتحقق من صلاحية الوصول للقسم
CREATE OR REPLACE FUNCTION can_access_department(
  p_staff_id uuid,
  p_department text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_dept text;
  v_pack_category text;
  v_allows_cross boolean;
BEGIN
  -- الحصول على معلومات الموظف وصلاحياته
  SELECT 
    ps.primary_department,
    pp.department_category,
    pp.allows_cross_department
  INTO 
    v_staff_dept,
    v_pack_category,
    v_allows_cross
  FROM platform_staff ps
  LEFT JOIN permission_packs pp ON ps.pack_id = pp.id
  WHERE ps.id = p_staff_id;

  -- Executive يمكنه الوصول لكل شيء
  IF v_staff_dept = 'executive' OR v_pack_category = 'executive' THEN
    RETURN true;
  END IF;

  -- إذا كان الموظف له صلاحية cross-department
  IF v_allows_cross THEN
    RETURN true;
  END IF;

  -- إذا كان القسم المطلوب يطابق قسمه
  IF v_staff_dept = p_department OR v_pack_category = p_department THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- دالة للحصول على الأقسام المسموح بها
CREATE OR REPLACE FUNCTION get_staff_allowed_departments(p_staff_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_dept text;
  v_pack_category text;
  v_allows_cross boolean;
  v_departments text[] := '{}';
BEGIN
  SELECT 
    ps.primary_department,
    pp.department_category,
    pp.allows_cross_department
  INTO 
    v_staff_dept,
    v_pack_category,
    v_allows_cross
  FROM platform_staff ps
  LEFT JOIN permission_packs pp ON ps.pack_id = pp.id
  WHERE ps.id = p_staff_id;

  -- Executive لديه وصول لكل الأقسام
  IF v_staff_dept = 'executive' OR v_pack_category = 'executive' THEN
    RETURN ARRAY['b2f', 'b2b', 'finance', 'marketing', 'executive'];
  END IF;

  -- Cross-department يمكنه الوصول لكل شيء ما عدا executive
  IF v_allows_cross THEN
    RETURN ARRAY['b2f', 'b2b', 'finance', 'marketing'];
  END IF;

  -- فقط قسمه الخاص
  RETURN ARRAY[COALESCE(v_staff_dept, v_pack_category, 'general')];
END;
$$;

-- view لعرض الموظفين مع أقسامهم
CREATE OR REPLACE VIEW staff_departments_view AS
SELECT 
  ps.id,
  ps.staff_code,
  ps.full_name,
  ps.primary_department,
  ps.department as department_name,
  ps.role,
  pp.name as pack_name,
  pp.department_category as pack_department,
  pp.scope_type,
  pp.allows_cross_department,
  get_staff_allowed_departments(ps.id) as allowed_departments
FROM platform_staff ps
LEFT JOIN permission_packs pp ON ps.pack_id = pp.id
WHERE ps.is_active = true;

COMMENT ON FUNCTION can_access_department IS 'التحقق من صلاحية الموظف للوصول لقسم معين';
COMMENT ON FUNCTION get_staff_allowed_departments IS 'الحصول على قائمة الأقسام المسموح بها للموظف';
COMMENT ON VIEW staff_departments_view IS 'عرض الموظفين مع أقسامهم والصلاحيات';
