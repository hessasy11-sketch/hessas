/*
  # إصلاح دالة approve_decision_b2f
  
  استخدام الأعمدة الصحيحة من decision_queue
*/

DROP FUNCTION IF EXISTS approve_decision_b2f(uuid, uuid, text);

CREATE OR REPLACE FUNCTION approve_decision_b2f(
  p_decision_id uuid,
  p_staff_id uuid,
  p_notes text DEFAULT NULL
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
  SELECT * INTO v_decision FROM decision_queue WHERE id = p_decision_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Decision not found');
  END IF;
  
  IF v_decision.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Decision already processed');
  END IF;
  
  -- اعتماد القرار
  UPDATE decision_queue
  SET 
    status = 'approved',
    approved_by = p_staff_id,
    executed_at = now(),
    notes = p_notes,
    updated_at = now()
  WHERE id = p_decision_id;
  
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
    'approve_decision',
    v_decision.farm_id,
    p_decision_id,
    jsonb_build_object(
      'decision_type', v_decision.decision_type,
      'priority', v_decision.priority,
      'approval_notes', p_notes
    ),
    p_staff_id,
    'success',
    'تمت الموافقة على القرار'
  );
  
  -- 🔥 تنفيذ القرار تلقائياً
  v_execution_result := execute_approved_decision(p_decision_id, p_staff_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'execution', v_execution_result
  );
END;
$$;
