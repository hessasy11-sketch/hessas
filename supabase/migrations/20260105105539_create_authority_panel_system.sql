/*
  # نظام لوحة الصلاحيات الإدارية (Authority Panel)

  1. جدول authority_assignments
     - تعيينات الصلاحيات الإدارية
     - 5 أدوار فقط: b2f_assistant, national_farms_manager, b2b_assistant, accountant, marketing_manager
     
  2. دوال إجراءات المدير العام
     - تعيين مسؤول
     - سحب صلاحية
     - منح صلاحية مؤقتة
     - تعليق حساب
     
  3. دوال الاستعلام
     - عرض المسؤولين الحاليين
     - تاريخ التعيينات
*/

-- جدول التعيينات الإدارية
CREATE TABLE IF NOT EXISTS authority_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  authority_role text NOT NULL CHECK (authority_role IN (
    'b2f_assistant',
    'national_farms_manager',
    'b2b_assistant',
    'accountant',
    'marketing_manager'
  )),
  assigned_by uuid NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  is_suspended boolean DEFAULT false,
  is_temporary boolean DEFAULT false,
  temporary_until timestamptz,
  suspension_reason text,
  suspension_at timestamptz,
  suspended_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, authority_role)
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_authority_active ON authority_assignments(is_active, authority_role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_authority_staff ON authority_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_authority_role ON authority_assignments(authority_role);

-- تفعيل RLS
ALTER TABLE authority_assignments ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Service role full access" ON authority_assignments
  FOR ALL USING (true);

CREATE POLICY "Authenticated read" ON authority_assignments
  FOR SELECT TO authenticated USING (true);

-- دالة عرض المسؤولين الحاليين
CREATE OR REPLACE FUNCTION get_current_authorities()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  authorities_list jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', aa.id,
      'staff_id', aa.staff_id,
      'staff_code', ps.staff_code,
      'staff_name', ps.name,
      'authority_role', aa.authority_role,
      'is_active', aa.is_active,
      'is_suspended', aa.is_suspended,
      'is_temporary', aa.is_temporary,
      'temporary_until', aa.temporary_until,
      'assigned_at', aa.assigned_at,
      'assigned_by', aa.assigned_by,
      'suspension_reason', aa.suspension_reason,
      'notes', aa.notes
    )
    ORDER BY 
      CASE aa.authority_role
        WHEN 'b2f_assistant' THEN 1
        WHEN 'national_farms_manager' THEN 2
        WHEN 'b2b_assistant' THEN 3
        WHEN 'accountant' THEN 4
        WHEN 'marketing_manager' THEN 5
      END
  )
  INTO authorities_list
  FROM authority_assignments aa
  JOIN platform_staff ps ON ps.id = aa.staff_id
  WHERE aa.is_active = true;

  RETURN COALESCE(authorities_list, '[]'::jsonb);
END;
$$;

-- دالة تعيين مسؤول
CREATE OR REPLACE FUNCTION exec_assign_authority(
  p_staff_id uuid,
  p_authority_role text,
  p_assigned_by uuid,
  p_is_temporary boolean DEFAULT false,
  p_temporary_days integer DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_name text;
  v_temporary_until timestamptz;
  v_assignment_id uuid;
  v_log_id uuid;
BEGIN
  -- التحقق من الدور
  IF p_authority_role NOT IN (
    'b2f_assistant',
    'national_farms_manager',
    'b2b_assistant',
    'accountant',
    'marketing_manager'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid authority role');
  END IF;

  -- الحصول على اسم الموظف
  SELECT name INTO v_staff_name
  FROM platform_staff
  WHERE id = p_staff_id;

  IF v_staff_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff not found');
  END IF;

  -- حساب تاريخ انتهاء الصلاحية المؤقتة
  IF p_is_temporary AND p_temporary_days IS NOT NULL THEN
    v_temporary_until := now() + (p_temporary_days || ' days')::interval;
  END IF;

  -- إلغاء تعيين سابق إن وجد
  UPDATE authority_assignments
  SET is_active = false, updated_at = now()
  WHERE staff_id = p_staff_id AND authority_role = p_authority_role;

  -- إنشاء تعيين جديد
  INSERT INTO authority_assignments (
    staff_id,
    authority_role,
    assigned_by,
    is_temporary,
    temporary_until,
    notes
  )
  VALUES (
    p_staff_id,
    p_authority_role,
    p_assigned_by,
    p_is_temporary,
    v_temporary_until,
    p_notes
  )
  RETURNING id INTO v_assignment_id;

  -- تسجيل في Executive Log
  INSERT INTO executive_logs (action_type, action_data, performed_by, result, notes)
  VALUES (
    'authority_assigned',
    jsonb_build_object(
      'staff_id', p_staff_id,
      'staff_name', v_staff_name,
      'authority_role', p_authority_role,
      'is_temporary', p_is_temporary,
      'temporary_until', v_temporary_until
    ),
    p_assigned_by,
    'success',
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', v_assignment_id,
    'log_id', v_log_id,
    'temporary_until', v_temporary_until
  );
END;
$$;

-- دالة سحب صلاحية
CREATE OR REPLACE FUNCTION exec_revoke_authority(
  p_assignment_id uuid,
  p_revoked_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_name text;
  v_authority_role text;
  v_log_id uuid;
BEGIN
  -- الحصول على بيانات التعيين
  SELECT ps.name, aa.authority_role
  INTO v_staff_name, v_authority_role
  FROM authority_assignments aa
  JOIN platform_staff ps ON ps.id = aa.staff_id
  WHERE aa.id = p_assignment_id;

  IF v_staff_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignment not found');
  END IF;

  -- إلغاء التعيين
  UPDATE authority_assignments
  SET 
    is_active = false,
    updated_at = now()
  WHERE id = p_assignment_id;

  -- تسجيل في Executive Log
  INSERT INTO executive_logs (action_type, action_data, performed_by, result, notes)
  VALUES (
    'authority_revoked',
    jsonb_build_object(
      'assignment_id', p_assignment_id,
      'staff_name', v_staff_name,
      'authority_role', v_authority_role
    ),
    p_revoked_by,
    'success',
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('success', true, 'log_id', v_log_id);
END;
$$;

-- دالة تعليق صلاحية مؤقتاً
CREATE OR REPLACE FUNCTION exec_suspend_authority(
  p_assignment_id uuid,
  p_suspended_by uuid,
  p_suspension_reason text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_name text;
  v_authority_role text;
  v_log_id uuid;
BEGIN
  -- الحصول على بيانات التعيين
  SELECT ps.name, aa.authority_role
  INTO v_staff_name, v_authority_role
  FROM authority_assignments aa
  JOIN platform_staff ps ON ps.id = aa.staff_id
  WHERE aa.id = p_assignment_id;

  IF v_staff_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignment not found');
  END IF;

  -- تعليق الصلاحية
  UPDATE authority_assignments
  SET 
    is_suspended = true,
    suspension_reason = p_suspension_reason,
    suspension_at = now(),
    suspended_by = p_suspended_by,
    updated_at = now()
  WHERE id = p_assignment_id;

  -- تسجيل في Executive Log
  INSERT INTO executive_logs (action_type, action_data, performed_by, result, notes)
  VALUES (
    'authority_suspended',
    jsonb_build_object(
      'assignment_id', p_assignment_id,
      'staff_name', v_staff_name,
      'authority_role', v_authority_role,
      'suspension_reason', p_suspension_reason
    ),
    p_suspended_by,
    'success',
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('success', true, 'log_id', v_log_id);
END;
$$;

-- دالة إلغاء تعليق صلاحية
CREATE OR REPLACE FUNCTION exec_unsuspend_authority(
  p_assignment_id uuid,
  p_unsuspended_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_name text;
  v_authority_role text;
  v_log_id uuid;
BEGIN
  -- الحصول على بيانات التعيين
  SELECT ps.name, aa.authority_role
  INTO v_staff_name, v_authority_role
  FROM authority_assignments aa
  JOIN platform_staff ps ON ps.id = aa.staff_id
  WHERE aa.id = p_assignment_id;

  IF v_staff_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignment not found');
  END IF;

  -- إلغاء التعليق
  UPDATE authority_assignments
  SET 
    is_suspended = false,
    suspension_reason = NULL,
    suspension_at = NULL,
    suspended_by = NULL,
    updated_at = now()
  WHERE id = p_assignment_id;

  -- تسجيل في Executive Log
  INSERT INTO executive_logs (action_type, action_data, performed_by, result, notes)
  VALUES (
    'authority_unsuspended',
    jsonb_build_object(
      'assignment_id', p_assignment_id,
      'staff_name', v_staff_name,
      'authority_role', v_authority_role
    ),
    p_unsuspended_by,
    'success',
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('success', true, 'log_id', v_log_id);
END;
$$;

-- دالة الحصول على قائمة الموظفين المتاحين للتعيين
CREATE OR REPLACE FUNCTION get_available_staff_for_authority()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  staff_list jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'staff_code', staff_code,
      'name', name,
      'role', role,
      'department', department
    )
    ORDER BY name
  )
  INTO staff_list
  FROM platform_staff
  WHERE is_active = true
    AND role IN ('manager', 'supervisor', 'specialist', 'admin');

  RETURN COALESCE(staff_list, '[]'::jsonb);
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION get_current_authorities TO anon, authenticated;
GRANT EXECUTE ON FUNCTION exec_assign_authority TO authenticated;
GRANT EXECUTE ON FUNCTION exec_revoke_authority TO authenticated;
GRANT EXECUTE ON FUNCTION exec_suspend_authority TO authenticated;
GRANT EXECUTE ON FUNCTION exec_unsuspend_authority TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_staff_for_authority TO authenticated;

-- تحديث أنواع إجراءات Executive Log
DO $$
BEGIN
  -- لا حاجة لتحديث constraints، سنستخدم action_type كـ text
  NULL;
END $$;
