/*
  # دوال غرفة عمليات B2F

  1. دالة Pulse الحية
     - زيارات B2F اليوم
     - حجوزات اليوم
     - مزارع عليها حجوزات
     - طلبات متأخرة
  
  2. دالة قائمة المزارع (Radar)
     - معلومات مختصرة لكل مزرعة
  
  3. دالة طابور القرارات
     - القرارات المعلقة
  
  4. دالة السجل التنفيذي
     - آخر الإجراءات
*/

-- دالة Pulse
CREATE OR REPLACE FUNCTION get_b2f_ops_pulse()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  visits_today integer;
  bookings_today integer;
  farms_with_bookings integer;
  overdue_requests integer;
BEGIN
  -- زيارات اليوم (dummy for now - can be linked to visit_requests)
  visits_today := 0;
  
  -- حجوزات اليوم
  SELECT COUNT(*)
  INTO bookings_today
  FROM b2f_sales_requests
  WHERE created_at::date = CURRENT_DATE;
  
  -- مزارع عليها حجوزات
  SELECT COUNT(DISTINCT farm_id)
  INTO farms_with_bookings
  FROM b2f_sales_requests
  WHERE status IN ('pending', 'under_review', 'approved_pending_payment');
  
  -- طلبات متأخرة (أكثر من 48 ساعة)
  SELECT COUNT(*)
  INTO overdue_requests
  FROM b2f_sales_requests
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '48 hours';

  RETURN jsonb_build_object(
    'visits_today', visits_today,
    'bookings_today', bookings_today,
    'farms_with_bookings', farms_with_bookings,
    'overdue_requests', overdue_requests
  );
END;
$$;

-- دالة قائمة المزارع (Radar)
CREATE OR REPLACE FUNCTION get_b2f_farms_radar()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  farms_list jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'name', f.name,
      'location', f.location,
      'status', f.status,
      'bookings_enabled', COALESCE(f.bookings_enabled, true),
      'farm_manager_id', f.farm_manager_id,
      'farm_manager_name', ps.full_name,
      'total_visits', 0,
      'total_bookings', (
        SELECT COUNT(*)
        FROM b2f_sales_requests sr
        WHERE sr.farm_id = f.id
      ),
      'pending_bookings', (
        SELECT COUNT(*)
        FROM b2f_sales_requests sr
        WHERE sr.farm_id = f.id
          AND sr.status IN ('pending', 'under_review')
      ),
      'last_booking_at', (
        SELECT MAX(created_at)
        FROM b2f_sales_requests sr
        WHERE sr.farm_id = f.id
      )
    )
  )
  INTO farms_list
  FROM b2f_farms f
  LEFT JOIN platform_staff ps ON ps.id = f.farm_manager_id
  WHERE f.status IN ('active', 'inactive')
  ORDER BY f.created_at DESC;

  RETURN COALESCE(farms_list, '[]'::jsonb);
END;
$$;

-- دالة طابور القرارات
CREATE OR REPLACE FUNCTION get_pending_decisions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  decisions_list jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', dq.id,
      'decision_type', dq.decision_type,
      'farm_id', dq.farm_id,
      'farm_name', f.name,
      'target_staff_id', dq.target_staff_id,
      'target_staff_name', ps.full_name,
      'expense_amount', dq.expense_amount,
      'expense_description', dq.expense_description,
      'action_data', dq.action_data,
      'status', dq.status,
      'priority', dq.priority,
      'requested_by', dq.requested_by,
      'requester_name', req_staff.full_name,
      'notes', dq.notes,
      'created_at', dq.created_at
    )
    ORDER BY 
      CASE dq.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END,
      dq.created_at ASC
  )
  INTO decisions_list
  FROM decision_queue dq
  LEFT JOIN b2f_farms f ON f.id = dq.farm_id
  LEFT JOIN platform_staff ps ON ps.id = dq.target_staff_id
  LEFT JOIN platform_staff req_staff ON req_staff.id = dq.requested_by
  WHERE dq.status = 'pending';

  RETURN COALESCE(decisions_list, '[]'::jsonb);
END;
$$;

-- دالة السجل التنفيذي
CREATE OR REPLACE FUNCTION get_executive_logs(
  limit_count integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  logs_list jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', el.id,
      'action_type', el.action_type,
      'farm_id', el.farm_id,
      'farm_name', f.name,
      'staff_id', el.staff_id,
      'staff_name', ps.full_name,
      'action_data', el.action_data,
      'performed_by', el.performed_by,
      'performer_name', perf_staff.full_name,
      'result', el.result,
      'notes', el.notes,
      'created_at', el.created_at
    )
    ORDER BY el.created_at DESC
  )
  INTO logs_list
  FROM (
    SELECT *
    FROM executive_logs
    ORDER BY created_at DESC
    LIMIT limit_count
  ) el
  LEFT JOIN b2f_farms f ON f.id = el.farm_id
  LEFT JOIN platform_staff ps ON ps.id = el.staff_id
  LEFT JOIN platform_staff perf_staff ON perf_staff.id = el.performed_by;

  RETURN COALESCE(logs_list, '[]'::jsonb);
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION get_b2f_ops_pulse TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_b2f_farms_radar TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_pending_decisions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_executive_logs TO anon, authenticated;
