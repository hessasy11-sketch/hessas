/*
  # لوحة المؤشرات العليا (Executive Pulse Dashboard) - النسخة الصحيحة
  
  دالة جلب المؤشرات الرئيسية مع الأعمدة الصحيحة
*/

-- =======================
-- دالة: جلب بيانات Executive Pulse
-- =======================
CREATE OR REPLACE FUNCTION get_executive_pulse()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_farms integer;
  v_struggling_farms integer;
  v_total_expenses numeric;
  v_bookings_today integer;
  v_pending_decisions integer;
  v_recent_events jsonb;
BEGIN
  -- 1. عدد المزارع النشطة
  SELECT COUNT(*)
  INTO v_active_farms
  FROM b2f_farms
  WHERE operational_status = 'operational';
  
  -- 2. عدد المزارع المتعثرة
  -- (مزارع موقوفة أو في الصيانة)
  SELECT COUNT(*)
  INTO v_struggling_farms
  FROM b2f_farms
  WHERE operational_status IN ('suspended', 'maintenance');
  
  -- 3. إجمالي المصروفات المعتمدة (30 يوم)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_expenses
  FROM farm_expenses
  WHERE approval_status = 'approved'
  AND approved_at > now() - interval '30 days';
  
  -- 4. عدد الحجوزات/الطلبات اليوم
  SELECT COUNT(*)
  INTO v_bookings_today
  FROM b2f_sales_requests
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- 5. عدد القرارات المعلقة
  SELECT COUNT(*)
  INTO v_pending_decisions
  FROM decision_queue
  WHERE status = 'pending';
  
  -- 6. آخر 5 أحداث مهمة
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'action_type', action_type,
      'farm_id', farm_id,
      'farm_name', (SELECT name FROM b2f_farms WHERE id = el.farm_id),
      'performed_by', performed_by,
      'staff_name', (SELECT full_name FROM platform_staff WHERE id = el.performed_by),
      'result', result,
      'notes', notes,
      'created_at', created_at
    )
    ORDER BY created_at DESC
  )
  INTO v_recent_events
  FROM (
    SELECT *
    FROM executive_logs
    WHERE action_type IN (
      'approve_decision',
      'execute_approve_expense',
      'execute_suspend_bookings',
      'execute_change_farm_manager',
      'create_farm_operation',
      'issue_contract'
    )
    ORDER BY created_at DESC
    LIMIT 5
  ) el;
  
  -- إرجاع جميع البيانات
  RETURN jsonb_build_object(
    'active_farms', v_active_farms,
    'struggling_farms', v_struggling_farms,
    'total_expenses', v_total_expenses,
    'bookings_today', v_bookings_today,
    'pending_decisions', v_pending_decisions,
    'recent_events', COALESCE(v_recent_events, '[]'::jsonb),
    'last_updated', now()
  );
END;
$$;

-- =======================
-- View: ملخص سريع للمؤشرات
-- =======================
CREATE OR REPLACE VIEW executive_pulse_summary AS
SELECT
  (SELECT COUNT(*) FROM b2f_farms WHERE operational_status = 'operational') as active_farms,
  (SELECT COUNT(*) FROM b2f_farms WHERE operational_status IN ('suspended', 'maintenance')) as struggling_farms,
  (SELECT COALESCE(SUM(amount), 0) FROM farm_expenses WHERE approval_status = 'approved' AND approved_at > now() - interval '30 days') as total_expenses,
  (SELECT COUNT(*) FROM b2f_sales_requests WHERE DATE(created_at) = CURRENT_DATE) as bookings_today,
  (SELECT COUNT(*) FROM decision_queue WHERE status = 'pending') as pending_decisions,
  now() as last_updated;

-- =======================
-- دالة مساعدة: جلب آخر الأحداث فقط
-- =======================
CREATE OR REPLACE FUNCTION get_recent_executive_events(p_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  action_type text,
  farm_id uuid,
  farm_name text,
  performed_by uuid,
  staff_name text,
  result text,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.id,
    el.action_type,
    el.farm_id,
    bf.name as farm_name,
    el.performed_by,
    ps.full_name as staff_name,
    el.result,
    el.notes,
    el.created_at
  FROM executive_logs el
  LEFT JOIN b2f_farms bf ON el.farm_id = bf.id
  LEFT JOIN platform_staff ps ON el.performed_by = ps.id
  WHERE el.action_type IN (
    'approve_decision',
    'execute_approve_expense',
    'execute_suspend_bookings',
    'execute_change_farm_manager',
    'create_farm_operation',
    'issue_contract'
  )
  ORDER BY el.created_at DESC
  LIMIT p_limit;
END;
$$;
