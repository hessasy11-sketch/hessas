/*
  # إصلاح دوال غرفة العمليات

  1. إصلاح دالة get_b2b_ops_pulse
     - استخدام ends_at بدلاً من end_time
     - استخدام starts_at بدلاً من start_time

  2. إصلاح دالة get_b2b_auctions_radar
     - استخدام ends_at, starts_at
     - استخدام owner_id بدلاً من seller_id

  3. إصلاح دوال Authority Panel
     - استخدام staff_code بدلاً من name
     - الحصول على الاسم من profiles عبر user_id
*/

-- إصلاح دالة Pulse للمزادات
DROP FUNCTION IF EXISTS get_b2b_ops_pulse();

CREATE OR REPLACE FUNCTION get_b2b_ops_pulse()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  visits_today integer;
  active_auctions integer;
  critical_auctions integer;
  highest_bid_today numeric;
BEGIN
  -- زيارات اليوم (dummy for now - can be tracked via analytics)
  visits_today := 0;

  -- مزادات نشطة
  SELECT COUNT(*)
  INTO active_auctions
  FROM auctions
  WHERE status = 'active'
    AND ends_at > NOW();

  -- مزادات حرجة (أقل من 24 ساعة)
  SELECT COUNT(*)
  INTO critical_auctions
  FROM auctions
  WHERE status = 'active'
    AND ends_at > NOW()
    AND ends_at < NOW() + INTERVAL '24 hours';

  -- أعلى عرض اليوم
  SELECT COALESCE(MAX(current_price), 0)
  INTO highest_bid_today
  FROM auctions
  WHERE created_at::date = CURRENT_DATE;

  RETURN jsonb_build_object(
    'visits_today', visits_today,
    'active_auctions', active_auctions,
    'critical_auctions', critical_auctions,
    'highest_bid_today', highest_bid_today
  );
END;
$$;

-- إصلاح دالة قائمة المزادات (Radar)
DROP FUNCTION IF EXISTS get_b2b_auctions_radar();

CREATE OR REPLACE FUNCTION get_b2b_auctions_radar()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auctions_list jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'category_name', c.name,
      'status', a.status,
      'current_price', a.current_price,
      'starting_price', a.starting_price,
      'start_time', a.starts_at,
      'end_time', a.ends_at,
      'time_remaining_hours', EXTRACT(EPOCH FROM (a.ends_at - NOW())) / 3600,
      'total_views', COALESCE(a.views, 0),
      'total_bids', (
        SELECT COUNT(*)
        FROM bids b
        WHERE b.auction_id = a.id
      ),
      'highest_bid', (
        SELECT MAX(amount)
        FROM bids b
        WHERE b.auction_id = a.id
      ),
      'is_critical', (a.ends_at < NOW() + INTERVAL '24 hours' AND a.ends_at > NOW()),
      'seller_name', p.display_name
    )
    ORDER BY
      CASE
        WHEN a.status = 'active' AND a.ends_at < NOW() + INTERVAL '24 hours' THEN 1
        WHEN a.status = 'active' THEN 2
        ELSE 3
      END,
      a.ends_at ASC
  )
  INTO auctions_list
  FROM auctions a
  LEFT JOIN auction_categories c ON c.id = a.category_id
  LEFT JOIN profiles p ON p.id = a.owner_id
  WHERE a.status IN ('active', 'upcoming', 'closed')
  ORDER BY a.created_at DESC
  LIMIT 100;

  RETURN COALESCE(auctions_list, '[]'::jsonb);
END;
$$;

-- إصلاح دالة عرض المسؤولين الحاليين
DROP FUNCTION IF EXISTS get_current_authorities();

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
      'staff_name', COALESCE(p.display_name, ps.staff_code),
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
  LEFT JOIN profiles p ON p.id = ps.user_id
  WHERE aa.is_active = true;

  RETURN COALESCE(authorities_list, '[]'::jsonb);
END;
$$;

-- إصلاح دالة الموظفين المتاحين للتعيين
DROP FUNCTION IF EXISTS get_available_staff_for_authority();

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
      'id', ps.id,
      'staff_code', ps.staff_code,
      'name', COALESCE(p.display_name, ps.staff_code),
      'role', ps.role,
      'department', ps.department
    )
    ORDER BY ps.staff_code
  )
  INTO staff_list
  FROM platform_staff ps
  LEFT JOIN profiles p ON p.id = ps.user_id
  WHERE ps.is_active = true
    AND ps.role IN ('manager', 'supervisor', 'agent', 'finance', 'operations');

  RETURN COALESCE(staff_list, '[]'::jsonb);
END;
$$;

-- إصلاح دوال التعيين والإلغاء لتستخدم staff_code
DROP FUNCTION IF EXISTS exec_assign_authority(uuid, text, uuid, boolean, integer, text);

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
  v_staff_code text;
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

  -- الحصول على معلومات الموظف
  SELECT ps.staff_code, COALESCE(p.display_name, ps.staff_code)
  INTO v_staff_code, v_staff_name
  FROM platform_staff ps
  LEFT JOIN profiles p ON p.id = ps.user_id
  WHERE ps.id = p_staff_id;

  IF v_staff_code IS NULL THEN
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
      'staff_code', v_staff_code,
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

-- إصلاح دالة سحب الصلاحية
DROP FUNCTION IF EXISTS exec_revoke_authority(uuid, uuid, text);

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
  v_staff_code text;
  v_staff_name text;
  v_authority_role text;
  v_log_id uuid;
BEGIN
  -- الحصول على بيانات التعيين
  SELECT ps.staff_code, COALESCE(p.display_name, ps.staff_code), aa.authority_role
  INTO v_staff_code, v_staff_name, v_authority_role
  FROM authority_assignments aa
  JOIN platform_staff ps ON ps.id = aa.staff_id
  LEFT JOIN profiles p ON p.id = ps.user_id
  WHERE aa.id = p_assignment_id;

  IF v_staff_code IS NULL THEN
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
      'staff_code', v_staff_code,
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

-- إصلاح دالة التعليق
DROP FUNCTION IF EXISTS exec_suspend_authority(uuid, uuid, text, text);

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
  v_staff_code text;
  v_staff_name text;
  v_authority_role text;
  v_log_id uuid;
BEGIN
  -- الحصول على بيانات التعيين
  SELECT ps.staff_code, COALESCE(p.display_name, ps.staff_code), aa.authority_role
  INTO v_staff_code, v_staff_name, v_authority_role
  FROM authority_assignments aa
  JOIN platform_staff ps ON ps.id = aa.staff_id
  LEFT JOIN profiles p ON p.id = ps.user_id
  WHERE aa.id = p_assignment_id;

  IF v_staff_code IS NULL THEN
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
      'staff_code', v_staff_code,
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

-- إصلاح دالة إلغاء التعليق
DROP FUNCTION IF EXISTS exec_unsuspend_authority(uuid, uuid, text);

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
  v_staff_code text;
  v_staff_name text;
  v_authority_role text;
  v_log_id uuid;
BEGIN
  -- الحصول على بيانات التعيين
  SELECT ps.staff_code, COALESCE(p.display_name, ps.staff_code), aa.authority_role
  INTO v_staff_code, v_staff_name, v_authority_role
  FROM authority_assignments aa
  JOIN platform_staff ps ON ps.id = aa.staff_id
  LEFT JOIN profiles p ON p.id = ps.user_id
  WHERE aa.id = p_assignment_id;

  IF v_staff_code IS NULL THEN
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
      'staff_code', v_staff_code,
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

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION get_b2b_ops_pulse TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_b2b_auctions_radar TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_current_authorities TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_available_staff_for_authority TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION exec_assign_authority TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION exec_revoke_authority TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION exec_suspend_authority TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION exec_unsuspend_authority TO authenticated, service_role;