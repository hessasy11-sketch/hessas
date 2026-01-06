/*
  # Approve & Execute B2F Decisions System
  
  1. Functions
    - `approve_b2f_decision_and_execute()` - Approve decision and execute action
    - `reject_b2f_decision()` - Reject decision with reason
    
  2. Actions Executed
    - toggle_bookings_off: Set bookings_enabled = false
    - toggle_bookings_on: Set bookings_enabled = true
    - change_farm_manager: Update farm_manager_id (future)
    - review_farm_expenses: Just log (no action needed)
    
  3. Logging
    - All actions logged in executive_logs table
    - Decision status updated to approved/rejected/executed
*/

-- Function to approve and execute B2F decision
CREATE OR REPLACE FUNCTION approve_b2f_decision_and_execute(
  p_decision_id uuid,
  p_approved_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision record;
  v_approver_name text;
  v_farm_name text;
  v_execution_result text;
  v_log_id uuid;
BEGIN
  -- Get decision details
  SELECT * INTO v_decision
  FROM decision_queue
  WHERE id = p_decision_id AND status = 'pending';
  
  IF v_decision.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'القرار غير موجود أو تم معالجته مسبقاً'
    );
  END IF;
  
  -- Get approver name
  SELECT COALESCE(full_name_ar, staff_code) INTO v_approver_name
  FROM platform_staff
  WHERE id = p_approved_by;
  
  IF v_approver_name IS NULL THEN
    v_approver_name := 'مدير غير معروف';
  END IF;
  
  -- Get farm name
  SELECT name INTO v_farm_name
  FROM b2f_farms
  WHERE id = v_decision.farm_id;
  
  -- Execute the action based on decision type
  CASE v_decision.decision_type
    WHEN 'toggle_bookings_off' THEN
      UPDATE b2f_farms
      SET bookings_enabled = false
      WHERE id = v_decision.farm_id;
      
      v_execution_result := 'تم إيقاف الحجوزات بنجاح';
      
    WHEN 'toggle_bookings_on' THEN
      UPDATE b2f_farms
      SET bookings_enabled = true
      WHERE id = v_decision.farm_id;
      
      v_execution_result := 'تم فتح الحجوزات بنجاح';
      
    WHEN 'change_farm_manager' THEN
      -- For now, just log. Can be implemented later with target_staff_id
      v_execution_result := 'طلب تغيير مدير المزرعة - يتطلب تنفيذ يدوي';
      
    WHEN 'review_farm_expenses' THEN
      -- Just log, no action needed
      v_execution_result := 'تم تسجيل طلب مراجعة المصروفات';
      
    ELSE
      v_execution_result := 'نوع قرار غير معروف';
  END CASE;
  
  -- Update decision status
  UPDATE decision_queue
  SET
    status = 'executed',
    approved_by = p_approved_by,
    executed_at = now(),
    notes = COALESCE(p_notes, '') || ' | ' || v_execution_result
  WHERE id = p_decision_id;
  
  -- Log to executive_logs
  INSERT INTO executive_logs (
    action_type,
    farm_id,
    farm_name,
    staff_id,
    staff_name,
    performed_by,
    performer_name,
    result,
    notes,
    created_at
  )
  VALUES (
    v_decision.decision_type || '_executed',
    v_decision.farm_id,
    v_farm_name,
    v_decision.target_staff_id,
    NULL,
    p_approved_by,
    v_approver_name,
    'success',
    v_execution_result || '. ' || COALESCE(p_notes, ''),
    now()
  )
  RETURNING id INTO v_log_id;
  
  RETURN json_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'status', 'executed',
    'execution_result', v_execution_result,
    'log_id', v_log_id,
    'message', 'تم اعتماد وتنفيذ القرار بنجاح'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Function to reject B2F decision
CREATE OR REPLACE FUNCTION reject_b2f_decision(
  p_decision_id uuid,
  p_rejected_by uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision record;
  v_rejecter_name text;
  v_farm_name text;
  v_log_id uuid;
BEGIN
  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'سبب الرفض إجباري'
    );
  END IF;
  
  -- Get decision details
  SELECT * INTO v_decision
  FROM decision_queue
  WHERE id = p_decision_id AND status = 'pending';
  
  IF v_decision.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'القرار غير موجود أو تم معالجته مسبقاً'
    );
  END IF;
  
  -- Get rejecter name
  SELECT COALESCE(full_name_ar, staff_code) INTO v_rejecter_name
  FROM platform_staff
  WHERE id = p_rejected_by;
  
  IF v_rejecter_name IS NULL THEN
    v_rejecter_name := 'مدير غير معروف';
  END IF;
  
  -- Get farm name
  SELECT name INTO v_farm_name
  FROM b2f_farms
  WHERE id = v_decision.farm_id;
  
  -- Update decision status
  UPDATE decision_queue
  SET
    status = 'rejected',
    approved_by = p_rejected_by,
    executed_at = now(),
    notes = 'مرفوض - ' || p_reason
  WHERE id = p_decision_id;
  
  -- Log to executive_logs
  INSERT INTO executive_logs (
    action_type,
    farm_id,
    farm_name,
    staff_id,
    staff_name,
    performed_by,
    performer_name,
    result,
    notes,
    created_at
  )
  VALUES (
    v_decision.decision_type || '_rejected',
    v_decision.farm_id,
    v_farm_name,
    v_decision.target_staff_id,
    NULL,
    p_rejected_by,
    v_rejecter_name,
    'rejected',
    'تم رفض القرار. السبب: ' || p_reason,
    now()
  )
  RETURNING id INTO v_log_id;
  
  RETURN json_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'status', 'rejected',
    'reason', p_reason,
    'log_id', v_log_id,
    'message', 'تم رفض القرار'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_b2f_decision_and_execute TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION reject_b2f_decision TO authenticated, anon, service_role;

-- Add comments
COMMENT ON FUNCTION approve_b2f_decision_and_execute IS 'Approves and executes B2F decision (toggle bookings, change manager, etc.)';
COMMENT ON FUNCTION reject_b2f_decision IS 'Rejects B2F decision with mandatory reason';
