/*
  # دوال غرفة العمليات التنفيذية
  
  ## الدوال المطلوبة
  
  ### 1. get_executive_pulse_b2f()
  يحسب المؤشرات الحية لقسم B2F:
  - عدد الحجوزات اليوم
  - عدد الحجوزات غير المعالجة
  - عدد المزارع غير الجاهزة
  - عدد التنبيهات الحرجة
  
  ### 2. get_executive_pulse_b2b()
  يحسب المؤشرات الحية لقسم B2B:
  - زيارات المزادات اليوم
  - مزادات نشطة
  - مزادات حرجة (قريبة تنتهي)
  - مزادات زيارات عالية بدون مزايدات
  
  ### 3. get_executive_decision_queue()
  يجلب قائمة القرارات المعلقة مع الأولويات
  
  ### 4. execute_master_action()
  تنفيذ إجراء تنفيذي مع تسجيله في السجل
  
  ### 5. assign_executive_owner()
  تعيين مسؤول رسمي لقسم
  
  ### 6. get_platform_visits_breakdown()
  تفصيل الزيارات: platform_total / b2f / b2b / per farm / per auction
*/

-- ============================================
-- 1. المؤشرات الحية لـ B2F
-- ============================================

CREATE OR REPLACE FUNCTION get_executive_pulse_b2f()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_bookings_today integer;
  v_bookings_unprocessed integer;
  v_farms_setup integer;
  v_critical_alerts integer;
BEGIN
  -- عدد الحجوزات (Sales Requests) اليوم
  SELECT COUNT(*) INTO v_bookings_today
  FROM b2f_sales_requests
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- الحجوزات غير المعالجة (pending أو awaiting_payment)
  SELECT COUNT(*) INTO v_bookings_unprocessed
  FROM b2f_sales_requests
  WHERE status IN ('pending', 'awaiting_payment', 'payment_under_review');
  
  -- المزارع غير الجاهزة (setup)
  SELECT COUNT(*) INTO v_farms_setup
  FROM b2f_farms
  WHERE operational_status = 'setup';
  
  -- التنبيهات الحرجة (من fc_incidents)
  SELECT COUNT(*) INTO v_critical_alerts
  FROM fc_incidents
  WHERE priority = 'critical' AND status != 'resolved';
  
  v_result := jsonb_build_object(
    'bookings_today', v_bookings_today,
    'bookings_unprocessed', v_bookings_unprocessed,
    'farms_not_ready', v_farms_setup,
    'critical_alerts', v_critical_alerts,
    'updated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- ============================================
-- 2. المؤشرات الحية لـ B2B
-- ============================================

CREATE OR REPLACE FUNCTION get_executive_pulse_b2b()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_active_auctions integer;
  v_auctions_ending_soon integer;
  v_auctions_no_bids integer;
BEGIN
  -- المزادات النشطة
  SELECT COUNT(*) INTO v_active_auctions
  FROM auctions
  WHERE status = 'active'
  AND ends_at > now();
  
  -- المزادات الحرجة (تنتهي خلال ساعة)
  SELECT COUNT(*) INTO v_auctions_ending_soon
  FROM auctions
  WHERE status = 'active'
  AND ends_at BETWEEN now() AND now() + INTERVAL '1 hour';
  
  -- مزادات بدون مزايدات (افتراضي - يحتاج جدول bids)
  v_auctions_no_bids := 0;
  
  v_result := jsonb_build_object(
    'active_auctions', v_active_auctions,
    'ending_soon', v_auctions_ending_soon,
    'no_bids', v_auctions_no_bids,
    'updated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- ============================================
-- 3. جلب قائمة القرارات المعلقة
-- ============================================

CREATE OR REPLACE FUNCTION get_executive_decision_queue(
  p_section text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  section text,
  decision_type text,
  title text,
  description text,
  priority text,
  status text,
  requested_by_name text,
  created_at timestamptz,
  expires_at timestamptz,
  context jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dq.id,
    dq.section,
    dq.decision_type,
    dq.title,
    dq.description,
    dq.priority,
    dq.status,
    dq.requested_by_name,
    dq.created_at,
    dq.expires_at,
    dq.context
  FROM executive_decision_queue dq
  WHERE 
    (p_section IS NULL OR dq.section = p_section)
    AND dq.status = 'pending'
  ORDER BY 
    CASE dq.priority
      WHEN 'critical' THEN 1
      WHEN 'urgent' THEN 2
      WHEN 'high' THEN 3
      WHEN 'medium' THEN 4
      WHEN 'low' THEN 5
    END,
    dq.created_at ASC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- 4. تعيين مسؤول رسمي
-- ============================================

CREATE OR REPLACE FUNCTION assign_executive_owner(
  p_owner_type text, -- 'b2f'/'farm_command'/'b2b'/'finance'/'marketing'
  p_staff_id uuid,
  p_assigned_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_name text;
  v_result jsonb;
BEGIN
  -- التحقق من وجود الموظف
  SELECT name_ar INTO v_staff_name
  FROM platform_staff
  WHERE id = p_staff_id AND is_active = true;
  
  IF v_staff_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الموظف غير موجود أو غير نشط');
  END IF;
  
  -- التحديث حسب النوع
  IF p_owner_type = 'b2f' THEN
    UPDATE executive_owners
    SET owner_b2f = p_staff_id,
        owner_b2f_assigned_at = now(),
        assigned_by = p_assigned_by,
        updated_at = now();
        
  ELSIF p_owner_type = 'farm_command' THEN
    UPDATE executive_owners
    SET owner_farm_command = p_staff_id,
        owner_farm_command_assigned_at = now(),
        assigned_by = p_assigned_by,
        updated_at = now();
        
  ELSIF p_owner_type = 'b2b' THEN
    UPDATE executive_owners
    SET owner_b2b = p_staff_id,
        owner_b2b_assigned_at = now(),
        assigned_by = p_assigned_by,
        updated_at = now();
        
  ELSIF p_owner_type = 'finance' THEN
    UPDATE executive_owners
    SET owner_finance = p_staff_id,
        owner_finance_assigned_at = now(),
        assigned_by = p_assigned_by,
        updated_at = now();
        
  ELSIF p_owner_type = 'marketing' THEN
    UPDATE executive_owners
    SET owner_marketing = p_staff_id,
        owner_marketing_assigned_at = now(),
        assigned_by = p_assigned_by,
        updated_at = now();
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'نوع المسؤول غير صحيح');
  END IF;
  
  -- تسجيل في السجل التنفيذي
  INSERT INTO executive_actions_log (
    executed_by,
    executor_name,
    action_type,
    target_type,
    target_id,
    target_name,
    action_title,
    action_description,
    result
  ) VALUES (
    p_assigned_by,
    (SELECT name_ar FROM platform_staff WHERE id = p_assigned_by),
    'assign_owner',
    'staff',
    p_staff_id,
    v_staff_name,
    'تعيين مسؤول رسمي',
    'تم تعيين ' || v_staff_name || ' كـ ' || p_owner_type,
    'success'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'owner_type', p_owner_type,
    'staff_id', p_staff_id,
    'staff_name', v_staff_name
  );
END;
$$;

-- ============================================
-- 5. تنفيذ إجراء تنفيذي
-- ============================================

CREATE OR REPLACE FUNCTION execute_master_action(
  p_action_code text,
  p_executed_by uuid,
  p_target_type text,
  p_target_id uuid,
  p_action_data jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action_name text;
  v_danger_level text;
  v_executor_name text;
  v_target_name text;
  v_result jsonb;
BEGIN
  -- التحقق من الإجراء
  SELECT action_name_ar, danger_level INTO v_action_name, v_danger_level
  FROM executive_master_actions
  WHERE action_code = p_action_code AND is_active = true;
  
  IF v_action_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الإجراء غير موجود');
  END IF;
  
  -- جلب اسم المنفذ
  SELECT name_ar INTO v_executor_name
  FROM platform_staff
  WHERE id = p_executed_by;
  
  -- تحديث عدد الاستخدام
  UPDATE executive_master_actions
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE action_code = p_action_code;
  
  -- تسجيل في السجل التنفيذي
  INSERT INTO executive_actions_log (
    executed_by,
    executor_name,
    action_type,
    target_type,
    target_id,
    action_title,
    action_data,
    result
  ) VALUES (
    p_executed_by,
    v_executor_name,
    p_action_code,
    p_target_type,
    p_target_id,
    v_action_name,
    p_action_data,
    'success'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'action_code', p_action_code,
    'action_name', v_action_name,
    'danger_level', v_danger_level
  );
END;
$$;

-- ============================================
-- 6. تفصيل الزيارات
-- ============================================

CREATE OR REPLACE FUNCTION get_platform_visits_breakdown()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_b2f_visits integer;
  v_b2b_visits integer;
BEGIN
  -- حساب زيارات B2F (عدد الفرص)
  SELECT COUNT(*) INTO v_b2f_visits
  FROM b2f_opportunities;
  
  -- حساب زيارات B2B (عدد المزادات)
  SELECT COUNT(*) INTO v_b2b_visits
  FROM auctions;
  
  v_result := jsonb_build_object(
    'platform_total', v_b2f_visits + v_b2b_visits,
    'b2f_visits', v_b2f_visits,
    'b2b_visits', v_b2b_visits,
    'updated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- ============================================
-- 7. جلب المسؤولين الحاليين
-- ============================================

CREATE OR REPLACE FUNCTION get_executive_owners()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_owner_b2f jsonb;
  v_owner_farm_command jsonb;
  v_owner_b2b jsonb;
  v_owner_finance jsonb;
  v_owner_marketing jsonb;
BEGIN
  -- جلب بيانات كل مسؤول
  SELECT jsonb_build_object(
    'staff_id', ps.id,
    'name', ps.name_ar,
    'assigned_at', eo.owner_b2f_assigned_at
  ) INTO v_owner_b2f
  FROM executive_owners eo
  LEFT JOIN platform_staff ps ON ps.id = eo.owner_b2f
  LIMIT 1;
  
  SELECT jsonb_build_object(
    'staff_id', ps.id,
    'name', ps.name_ar,
    'assigned_at', eo.owner_farm_command_assigned_at
  ) INTO v_owner_farm_command
  FROM executive_owners eo
  LEFT JOIN platform_staff ps ON ps.id = eo.owner_farm_command
  LIMIT 1;
  
  SELECT jsonb_build_object(
    'staff_id', ps.id,
    'name', ps.name_ar,
    'assigned_at', eo.owner_b2b_assigned_at
  ) INTO v_owner_b2b
  FROM executive_owners eo
  LEFT JOIN platform_staff ps ON ps.id = eo.owner_b2b
  LIMIT 1;
  
  SELECT jsonb_build_object(
    'staff_id', ps.id,
    'name', ps.name_ar,
    'assigned_at', eo.owner_finance_assigned_at
  ) INTO v_owner_finance
  FROM executive_owners eo
  LEFT JOIN platform_staff ps ON ps.id = eo.owner_finance
  LIMIT 1;
  
  SELECT jsonb_build_object(
    'staff_id', ps.id,
    'name', ps.name_ar,
    'assigned_at', eo.owner_marketing_assigned_at
  ) INTO v_owner_marketing
  FROM executive_owners eo
  LEFT JOIN platform_staff ps ON ps.id = eo.owner_marketing
  LIMIT 1;
  
  v_result := jsonb_build_object(
    'b2f', COALESCE(v_owner_b2f, '{}'::jsonb),
    'farm_command', COALESCE(v_owner_farm_command, '{}'::jsonb),
    'b2b', COALESCE(v_owner_b2b, '{}'::jsonb),
    'finance', COALESCE(v_owner_finance, '{}'::jsonb),
    'marketing', COALESCE(v_owner_marketing, '{}'::jsonb)
  );
  
  RETURN v_result;
END;
$$;

-- ============================================
-- 8. إنشاء طلب قرار جديد
-- ============================================

CREATE OR REPLACE FUNCTION create_decision_request(
  p_section text,
  p_decision_type text,
  p_title text,
  p_description text,
  p_requested_by uuid,
  p_priority text DEFAULT 'medium',
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_id uuid;
  v_requester_name text;
BEGIN
  -- جلب اسم الطالب
  SELECT name_ar INTO v_requester_name
  FROM platform_staff
  WHERE id = p_requested_by;
  
  -- إنشاء القرار
  INSERT INTO executive_decision_queue (
    section,
    decision_type,
    title,
    description,
    requested_by,
    requested_by_name,
    priority,
    context
  ) VALUES (
    p_section,
    p_decision_type,
    p_title,
    p_description,
    p_requested_by,
    v_requester_name,
    p_priority,
    p_context
  ) RETURNING id INTO v_decision_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'decision_id', v_decision_id
  );
END;
$$;

-- ============================================
-- 9. اعتماد/رفض قرار
-- ============================================

CREATE OR REPLACE FUNCTION decide_on_request(
  p_decision_id uuid,
  p_decided_by uuid,
  p_status text, -- 'approved' or 'rejected'
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_title text;
BEGIN
  -- التحقق من القرار
  SELECT title INTO v_decision_title
  FROM executive_decision_queue
  WHERE id = p_decision_id AND status = 'pending';
  
  IF v_decision_title IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'القرار غير موجود أو تم معالجته');
  END IF;
  
  -- تحديث القرار
  UPDATE executive_decision_queue
  SET status = p_status,
      decided_by = p_decided_by,
      decided_at = now(),
      decision_notes = p_notes
  WHERE id = p_decision_id;
  
  -- تسجيل في السجل التنفيذي
  INSERT INTO executive_actions_log (
    executed_by,
    executor_name,
    action_type,
    target_type,
    target_id,
    action_title,
    action_description,
    result
  ) VALUES (
    p_decided_by,
    (SELECT name_ar FROM platform_staff WHERE id = p_decided_by),
    CASE WHEN p_status = 'approved' THEN 'approve_decision' ELSE 'reject_decision' END,
    'decision',
    p_decision_id,
    v_decision_title,
    p_notes,
    'success'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'status', p_status
  );
END;
$$;
