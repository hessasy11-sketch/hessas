/*
  # إصلاح دالة execute_suspend_bookings
  
  استخدام operational_status بدلاً من status
*/

DROP FUNCTION IF EXISTS execute_suspend_bookings(uuid, uuid, uuid, text);

CREATE OR REPLACE FUNCTION execute_suspend_bookings(
  p_farm_id uuid,
  p_decision_id uuid,
  p_performed_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_name text;
  v_affected_count int := 0;
BEGIN
  -- جلب اسم المزرعة
  SELECT name INTO v_farm_name FROM b2f_farms WHERE id = p_farm_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm not found'
    );
  END IF;
  
  -- إيقاف المزرعة (تعطيل الحجوزات الجديدة)
  UPDATE b2f_farms
  SET 
    operational_status = 'suspended',
    updated_at = now()
  WHERE id = p_farm_id;
  
  -- إلغاء الحجوزات المعلقة (pending)
  UPDATE b2f_sales_requests
  SET 
    status = 'cancelled',
    admin_notes = COALESCE(admin_notes || E'\n', '') || format('تم الإلغاء بسبب: %s', COALESCE(p_reason, 'إيقاف المزرعة'))
  WHERE 
    opportunity_id IN (
      SELECT id FROM b2f_opportunities WHERE farm_id = p_farm_id
    )
    AND status = 'pending';
  
  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  
  -- تسجيل في executive_logs
  INSERT INTO executive_logs (
    action_type,
    farm_id,
    decision_id,
    action_data,
    performed_by,
    result,
    notes
  ) VALUES (
    'execute_suspend_bookings',
    p_farm_id,
    p_decision_id,
    jsonb_build_object(
      'farm_name', v_farm_name,
      'affected_bookings', v_affected_count,
      'reason', p_reason
    ),
    p_performed_by,
    'success',
    format('تم إيقاف حجوزات مزرعة %s وإلغاء %s حجز معلق', v_farm_name, v_affected_count)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'farm_id', p_farm_id,
    'farm_name', v_farm_name,
    'affected_bookings', v_affected_count,
    'message', 'Bookings suspended successfully'
  );
END;
$$;
