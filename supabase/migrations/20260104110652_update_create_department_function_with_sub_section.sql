/*
  # تحديث دالة إنشاء القسم لدعم الأقسام الفرعية
  
  1. التحديثات:
    - إضافة معامل p_sub_section_id
    - ربط القسم الجديد بالقسم الفرعي المحدد
*/

-- حذف الدالة القديمة وإعادة إنشائها
DROP FUNCTION IF EXISTS create_department(text, text, text, text, text, text, text, uuid);
DROP FUNCTION IF EXISTS create_department(text, text, text, text, text, uuid);

CREATE OR REPLACE FUNCTION create_department(
  p_name_ar text,
  p_name_en text,
  p_code text,
  p_description text DEFAULT NULL,
  p_linked_system text DEFAULT 'none',
  p_system_access_level text DEFAULT 'read',
  p_color text DEFAULT '#3b82f6',
  p_created_by uuid DEFAULT NULL,
  p_sub_section_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dept_id uuid;
  v_final_code text;
  v_next_num int;
BEGIN
  -- التحقق من عدم وجود الرمز
  IF EXISTS (SELECT 1 FROM platform_departments WHERE code = p_code) THEN
    -- اقتراح رمز جديد
    SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'DEPT(\d+)') AS INTEGER)), 0) + 1 
    INTO v_next_num
    FROM platform_departments
    WHERE code ~ '^DEPT\d+$';
    
    v_final_code := 'DEPT' || v_next_num;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الرمز موجود بالفعل. الرمز المقترح: ' || v_final_code,
      'suggested_code', v_final_code
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
    created_by,
    sub_section_id
  ) VALUES (
    p_name_ar,
    COALESCE(p_name_en, p_name_ar),
    p_code,
    p_description,
    p_linked_system,
    p_system_access_level,
    p_color,
    p_created_by,
    p_sub_section_id
  )
  RETURNING id INTO v_dept_id;
  
  -- ربط تلقائي بالأنظمة حسب linked_system
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
    'department_id', v_dept_id,
    'message', 'تم إنشاء القسم بنجاح'
  );
END;
$$;

COMMENT ON FUNCTION create_department IS 'إنشاء قسم جديد مع ربطه بالأقسام الفرعية والأنظمة';