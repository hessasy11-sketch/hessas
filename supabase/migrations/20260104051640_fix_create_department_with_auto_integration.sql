/*
  # تحسين دالة إنشاء القسم مع الربط التلقائي
  
  1. التغييرات:
    - تحديث دالة create_department لربط الأنظمة تلقائياً
    - إضافة اللون وإعدادات النظام
    - إنشاء الصلاحيات الافتراضية تلقائياً
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS create_department(text, text, text, text, text, uuid);

-- إنشاء دالة محسّنة
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
    -- ربط نظام المزادات فقط
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
    -- ربط أنظمة المزارع
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
    -- ربط جميع الأنظمة
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
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_department TO authenticated;
GRANT EXECUTE ON FUNCTION create_department TO service_role;
