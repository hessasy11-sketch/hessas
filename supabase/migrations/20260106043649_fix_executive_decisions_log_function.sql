/*
  # إصلاح دالة سجل القرارات التنفيذي
  
  إزالة الأعمدة غير الموجودة (auction_id, contract_id) من الجدول
  واستخدام action_data بدلاً منها
*/

-- حذف وإعادة إنشاء الدالة
DROP FUNCTION IF EXISTS get_executive_decisions_log(int, int, text, text, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_executive_decisions_log(
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0,
  p_filter_action text DEFAULT NULL,
  p_filter_result text DEFAULT NULL,
  p_from_date timestamptz DEFAULT NULL,
  p_to_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  action_type text,
  farm_id uuid,
  farm_name text,
  farm_location text,
  decision_id uuid,
  decision_type text,
  decision_priority text,
  decision_status text,
  action_data jsonb,
  performed_by uuid,
  performer_name text,
  performer_role text,
  requested_by uuid,
  requester_name text,
  result text,
  notes text,
  created_at timestamptz,
  impact_summary text
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
    bf.location as farm_location,
    el.decision_id,
    dq.decision_type,
    dq.priority as decision_priority,
    dq.status as decision_status,
    el.action_data,
    el.performed_by,
    ps1.full_name as performer_name,
    ps1.role as performer_role,
    dq.requested_by,
    ps2.full_name as requester_name,
    el.result,
    el.notes,
    el.created_at,
    -- ملخص الأثر
    CASE 
      WHEN el.farm_id IS NOT NULL THEN 'مزرعة: ' || COALESCE(bf.name, 'غير محدد')
      WHEN el.action_data->>'contract_id' IS NOT NULL THEN 'عقد: ' || (el.action_data->>'contract_id')
      WHEN el.action_data->>'auction_id' IS NOT NULL THEN 'مزاد: ' || (el.action_data->>'auction_id')
      ELSE 'غير محدد'
    END as impact_summary
  FROM executive_logs el
  LEFT JOIN b2f_farms bf ON el.farm_id = bf.id
  LEFT JOIN decision_queue dq ON el.decision_id = dq.id
  LEFT JOIN platform_staff ps1 ON el.performed_by = ps1.id
  LEFT JOIN platform_staff ps2 ON dq.requested_by = ps2.id
  WHERE 
    el.action_type IN ('approve_decision', 'reject_decision', 'request_review')
    AND (p_filter_action IS NULL OR el.action_type = p_filter_action)
    AND (p_filter_result IS NULL OR el.result = p_filter_result)
    AND (p_from_date IS NULL OR el.created_at >= p_from_date)
    AND (p_to_date IS NULL OR el.created_at <= p_to_date)
  ORDER BY el.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
