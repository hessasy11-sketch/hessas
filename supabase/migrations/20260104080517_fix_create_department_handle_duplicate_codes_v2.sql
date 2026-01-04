/*
  # إصلاح دالة إنشاء القسم - معالجة الأكواد المكررة
  
  1. التحسينات:
    - معالجة خطأ الرمز المكرر
    - إرجاع رسالة خطأ واضحة
    - استخدام EXCEPTION handling
    - دالة للحصول على الرمز التالي المتاح
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS create_department(text, text, text, text, text, text, text, uuid);

-- إعادة إنشاء الدالة مع معالجة الأخطاء
CREATE OR REPLACE FUNCTION create_department(
  p_name_ar text,
  p_name_en text,
  p_code text,
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
  v_result jsonb;
BEGIN
  -- التحقق من وجود الرمز مسبقاً
  IF EXISTS (SELECT 1 FROM platform_departments WHERE code = UPPER(p_code)) THEN
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
    p_name_en,
    UPPER(p_code),
    p_description,
    p_linked_system,
    p_system_access_level,
    p_color,
    p_created_by
  )
  RETURNING id INTO v_dept_id;
  
  -- ربط الأنظمة تلقائياً بناءً على linked_system
  IF p_linked_system = 'b2b' THEN
    INSERT INTO system_integrations (
      department_id,
      system_code,
      access_level,
      can_create,
      can_edit,
      can_delete,
      can_approve,
      can_view_reports,
      can_export
    ) VALUES (
      v_dept_id,
      'b2b_auctions',
      p_system_access_level,
      p_system_access_level IN ('write', 'full'),
      p_system_access_level IN ('write', 'full'),
      p_system_access_level = 'full',
      p_system_access_level = 'full',
      p_system_access_level IN ('read', 'write', 'full'),
      p_system_access_level IN ('write', 'full')
    );
    
  ELSIF p_linked_system = 'b2f' THEN
    INSERT INTO system_integrations (
      department_id,
      system_code,
      access_level,
      can_create,
      can_edit,
      can_delete,
      can_approve,
      can_view_reports,
      can_export
    ) VALUES 
    (
      v_dept_id,
      'b2f_farms',
      p_system_access_level,
      p_system_access_level IN ('write', 'full'),
      p_system_access_level IN ('write', 'full'),
      p_system_access_level = 'full',
      p_system_access_level = 'full',
      p_system_access_level IN ('read', 'write', 'full'),
      p_system_access_level IN ('write', 'full')
    ),
    (
      v_dept_id,
      'b2f_operations',
      p_system_access_level,
      p_system_access_level IN ('write', 'full'),
      p_system_access_level IN ('write', 'full'),
      p_system_access_level = 'full',
      p_system_access_level = 'full',
      p_system_access_level IN ('read', 'write', 'full'),
      p_system_access_level IN ('write', 'full')
    ),
    (
      v_dept_id,
      'b2f_sales',
      p_system_access_level,
      p_system_access_level IN ('write', 'full'),
      p_system_access_level IN ('write', 'full'),
      p_system_access_level = 'full',
      p_system_access_level = 'full',
      p_system_access_level IN ('read', 'write', 'full'),
      p_system_access_level IN ('write', 'full')
    );
    
  ELSIF p_linked_system = 'both' THEN
    INSERT INTO system_integrations (
      department_id,
      system_code,
      access_level,
      can_create,
      can_edit,
      can_delete,
      can_approve,
      can_view_reports,
      can_export
    ) VALUES 
    (
      v_dept_id,
      'b2b_auctions',
      p_system_access_level,
      p_system_access_level IN ('write', 'full'),
      p_system_access_level IN ('write', 'full'),
      p_system_access_level = 'full',
      p_system_access_level = 'full',
      p_system_access_level IN ('read', 'write', 'full'),
      p_system_access_level IN ('write', 'full')
    ),
    (
      v_dept_id,
      'b2f_farms',
      p_system_access_level,
      p_system_access_level IN ('write', 'full'),
      p_system_access_level IN ('write', 'full'),
      p_system_access_level = 'full',
      p_system_access_level = 'full',
      p_system_access_level IN ('read', 'write', 'full'),
      p_system_access_level IN ('write', 'full')
    ),
    (
      v_dept_id,
      'b2f_operations',
      p_system_access_level,
      p_system_access_level IN ('write', 'full'),
      p_system_access_level IN ('write', 'full'),
      p_system_access_level = 'full',
      p_system_access_level = 'full',
      p_system_access_level IN ('read', 'write', 'full'),
      p_system_access_level IN ('write', 'full')
    ),
    (
      v_dept_id,
      'b2f_sales',
      p_system_access_level,
      p_system_access_level IN ('write', 'full'),
      p_system_access_level IN ('write', 'full'),
      p_system_access_level = 'full',
      p_system_access_level = 'full',
      p_system_access_level IN ('read', 'write', 'full'),
      p_system_access_level IN ('write', 'full')
    );
  END IF;
  
  -- إنشاء أدوار افتراضية
  INSERT INTO department_roles (department_id, role_name_ar, role_name_en, role_level, can_approve, can_assign_tasks, can_manage_staff)
  VALUES 
    (v_dept_id, 'مدير القسم', 'Department Manager', 3, true, true, true),
    (v_dept_id, 'مشرف', 'Supervisor', 2, true, true, false),
    (v_dept_id, 'موظف', 'Staff', 1, false, false, false);
  
  -- إعداد النتيجة
  v_result := jsonb_build_object(
    'success', true,
    'department_id', v_dept_id,
    'message', 'تم إنشاء القسم بنجاح'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الرمز موجود بالفعل'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'حدث خطأ: ' || SQLERRM
    );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_department TO authenticated;
GRANT EXECUTE ON FUNCTION create_department TO service_role;

-- دالة مساعدة للحصول على الرمز التالي المتاح
CREATE OR REPLACE FUNCTION get_next_available_department_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_code integer;
BEGIN
  -- البحث عن أكبر رقم رقمي في الأكواد الموجودة
  SELECT COALESCE(MAX(CASE 
    WHEN code ~ '^\d+$' THEN code::integer 
    ELSE 0 
  END), 0) + 1
  INTO v_next_code
  FROM platform_departments;
  
  RETURN v_next_code::text;
END;
$$;

GRANT EXECUTE ON FUNCTION get_next_available_department_code TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_available_department_code TO service_role;
