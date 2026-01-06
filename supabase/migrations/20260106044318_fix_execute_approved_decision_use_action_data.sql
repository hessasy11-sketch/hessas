/*
  # إصلاح دالة execute_approved_decision
  
  استخدام action_data بدلاً من decision_data
*/

DROP FUNCTION IF EXISTS execute_approved_decision(uuid, uuid);

CREATE OR REPLACE FUNCTION execute_approved_decision(
  p_decision_id uuid,
  p_performed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision record;
  v_execution_result jsonb;
BEGIN
  -- جلب بيانات القرار
  SELECT * INTO v_decision
  FROM decision_queue
  WHERE id = p_decision_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not found'
    );
  END IF;
  
  -- التحقق من أن القرار معتمد
  IF v_decision.status != 'approved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not approved yet'
    );
  END IF;
  
  -- تنفيذ حسب نوع القرار
  CASE v_decision.decision_type
    WHEN 'change_farm_manager' THEN
      v_execution_result := execute_change_farm_manager(
        (v_decision.action_data->>'farm_id')::uuid,
        (v_decision.action_data->>'new_manager_id')::uuid,
        p_decision_id,
        p_performed_by
      );
    
    WHEN 'suspend_bookings' THEN
      v_execution_result := execute_suspend_bookings(
        (v_decision.action_data->>'farm_id')::uuid,
        p_decision_id,
        p_performed_by,
        v_decision.action_data->>'reason'
      );
    
    WHEN 'cancel_auction' THEN
      v_execution_result := execute_cancel_auction(
        (v_decision.action_data->>'auction_id')::uuid,
        p_decision_id,
        p_performed_by,
        v_decision.action_data->>'reason'
      );
    
    WHEN 'approve_expense' THEN
      v_execution_result := execute_approve_expense(
        (v_decision.action_data->>'expense_id')::uuid,
        p_decision_id,
        p_performed_by
      );
    
    ELSE
      -- قرار غير معروف
      v_execution_result := jsonb_build_object(
        'success', false,
        'error', format('Unknown decision type: %s', v_decision.decision_type)
      );
  END CASE;
  
  -- تحديث حالة القرار
  IF v_execution_result->>'success' = 'true' THEN
    UPDATE decision_queue
    SET 
      executed = true,
      executed_at = now(),
      execution_result = v_execution_result
    WHERE id = p_decision_id;
  END IF;
  
  RETURN v_execution_result;
END;
$$;
