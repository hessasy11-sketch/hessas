/*
  # تكامل نظام الصلاحيات مع الموافقة على القرارات
  
  تحديث approve_decision_b2f للتحقق من الصلاحيات
*/

-- حذف وإعادة إنشاء الدالة مع التحقق من الصلاحيات
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
  v_authority_check jsonb;
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
  
  -- 🔐 التحقق من الصلاحيات
  SELECT can_approve_decision(p_decision_id, p_staff_id) INTO v_authority_check;
  
  IF NOT (v_authority_check->>'can_approve')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized',
      'reason', v_authority_check->>'reason',
      'staff_role', v_authority_check->>'staff_role',
      'decision_type', v_authority_check->>'decision_type'
    );
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
      'approval_notes', p_notes,
      'authority_check', v_authority_check
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
    'authority_check', v_authority_check,
    'execution', v_execution_result
  );
END;
$$;

-- دالة للحصول على قائمة القرارات التي يمكن للموظف اعتمادها
CREATE OR REPLACE FUNCTION get_approvable_decisions(p_staff_id uuid)
RETURNS TABLE (
  id uuid,
  decision_type text,
  farm_id uuid,
  farm_name text,
  priority text,
  action_data jsonb,
  requested_by uuid,
  requester_name text,
  created_at timestamptz,
  can_approve boolean,
  authority_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_role text;
BEGIN
  -- جلب دور الموظف
  SELECT role INTO v_staff_role FROM platform_staff WHERE id = p_staff_id;
  
  RETURN QUERY
  SELECT 
    dq.id,
    dq.decision_type,
    dq.farm_id,
    bf.name as farm_name,
    dq.priority,
    dq.action_data,
    dq.requested_by,
    ps.full_name as requester_name,
    dq.created_at,
    (can_approve_decision(dq.id, p_staff_id)->>'can_approve')::boolean as can_approve,
    can_approve_decision(dq.id, p_staff_id)->>'reason' as authority_reason
  FROM decision_queue dq
  LEFT JOIN b2f_farms bf ON dq.farm_id = bf.id
  LEFT JOIN platform_staff ps ON dq.requested_by = ps.id
  WHERE dq.status = 'pending'
  ORDER BY 
    CASE dq.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    dq.created_at ASC;
END;
$$;
