/*
  # جعل حقل الاسم الإنجليزي اختياري في جدول الأقسام

  1. التعديلات
    - إزالة القيد NOT NULL من حقل name_en في platform_departments
    - السماح بقيم NULL أو فارغة للأقسام
    - تحديث الدالة create_department لتقبل قيم فارغة

  2. الأمان
    - الحفاظ على البيانات الموجودة
    - السماح بإنشاء أقسام بدون اسم إنجليزي
*/

-- تعديل حقل name_en ليصبح nullable
ALTER TABLE platform_departments
ALTER COLUMN name_en DROP NOT NULL;

-- تحديث الدالة create_department لجعل name_en اختياري
DROP FUNCTION IF EXISTS create_department(text, text, text, text, text, uuid);

CREATE OR REPLACE FUNCTION create_department(
  p_name_ar text,
  p_name_en text DEFAULT NULL,
  p_code text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_linked_system text DEFAULT 'none',
  p_system_access_level text DEFAULT 'read',
  p_color text DEFAULT '#3b82f6',
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dept_id uuid;
  v_generated_code text;
BEGIN
  -- توليد الرمز تلقائياً إذا لم يتم توفيره
  IF p_code IS NULL OR p_code = '' THEN
    v_generated_code := UPPER(SUBSTRING(MD5(p_name_ar || now()::text) FROM 1 FOR 8));
  ELSE
    v_generated_code := UPPER(p_code);
  END IF;

  -- التحقق من عدم وجود رمز مكرر
  IF EXISTS (SELECT 1 FROM platform_departments WHERE code = v_generated_code) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الرمز موجود بالفعل'
    );
  END IF;

  -- إنشاء القسم
  INSERT INTO platform_departments (
    name_ar,
    name_en,
    code,
    description,
    linked_system,
    system_access_level,
    color,
    created_by
  ) VALUES (
    p_name_ar,
    NULLIF(p_name_en, ''),
    v_generated_code,
    NULLIF(p_description, ''),
    p_linked_system,
    p_system_access_level,
    p_color,
    p_created_by
  )
  RETURNING id INTO v_dept_id;
  
  -- ربط النظام المناسب تلقائياً
  IF p_linked_system = 'b2b' THEN
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2b_auctions',
      p_system_access_level,
      jsonb_build_object(
        'can_create', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END,
        'can_edit', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END,
        'can_delete', CASE WHEN p_system_access_level = 'full' THEN true ELSE false END,
        'can_approve', CASE WHEN p_system_access_level = 'full' THEN true ELSE false END,
        'can_view_reports', true,
        'can_export', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END
      )
    );
  ELSIF p_linked_system = 'b2f' THEN
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2f_farms',
      p_system_access_level,
      jsonb_build_object(
        'can_create', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END,
        'can_edit', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END,
        'can_delete', CASE WHEN p_system_access_level = 'full' THEN true ELSE false END,
        'can_approve', CASE WHEN p_system_access_level = 'full' THEN true ELSE false END,
        'can_view_reports', true,
        'can_export', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END
      )
    );
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2f_operations',
      p_system_access_level,
      jsonb_build_object(
        'can_create', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END,
        'can_edit', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END,
        'can_delete', false,
        'can_approve', CASE WHEN p_system_access_level = 'full' THEN true ELSE false END,
        'can_view_reports', true,
        'can_export', false
      )
    );
  ELSIF p_linked_system = 'both' THEN
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2b_auctions',
      p_system_access_level,
      jsonb_build_object(
        'can_create', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END,
        'can_edit', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END,
        'can_delete', CASE WHEN p_system_access_level = 'full' THEN true ELSE false END,
        'can_approve', CASE WHEN p_system_access_level = 'full' THEN true ELSE false END,
        'can_view_reports', true,
        'can_export', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END
      )
    );
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2f_farms',
      p_system_access_level,
      jsonb_build_object(
        'can_create', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END,
        'can_edit', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END,
        'can_delete', CASE WHEN p_system_access_level = 'full' THEN true ELSE false END,
        'can_approve', CASE WHEN p_system_access_level = 'full' THEN true ELSE false END,
        'can_view_reports', true,
        'can_export', CASE WHEN p_system_access_level IN ('write', 'full') THEN true ELSE false END
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم إنشاء القسم بنجاح',
    'department_id', v_dept_id,
    'code', v_generated_code
  );
END;
$$;

-- تحديث التعليق على الحقل
COMMENT ON COLUMN platform_departments.name_en IS 'اسم القسم بالإنجليزية (اختياري - يمكن أن يكون NULL)';

-- تحديث الإحصائيات
ANALYZE platform_departments;
