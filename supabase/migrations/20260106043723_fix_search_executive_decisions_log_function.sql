/*
  # إصلاح دالة البحث في سجل القرارات التنفيذي
  
  تغيير نوع relevance من float إلى numeric
*/

DROP FUNCTION IF EXISTS search_executive_decisions_log(text, int);

CREATE OR REPLACE FUNCTION search_executive_decisions_log(
  p_search_term text,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  action_type text,
  farm_name text,
  decision_type text,
  performer_name text,
  requester_name text,
  result text,
  created_at timestamptz,
  relevance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.id,
    el.action_type,
    bf.name as farm_name,
    dq.decision_type,
    ps1.full_name as performer_name,
    ps2.full_name as requester_name,
    el.result,
    el.created_at,
    -- درجة الملاءمة (بسيطة)
    CASE 
      WHEN bf.name ILIKE '%' || p_search_term || '%' THEN 1.0
      WHEN dq.decision_type ILIKE '%' || p_search_term || '%' THEN 0.9
      WHEN el.notes ILIKE '%' || p_search_term || '%' THEN 0.8
      WHEN ps1.full_name ILIKE '%' || p_search_term || '%' THEN 0.7
      WHEN ps2.full_name ILIKE '%' || p_search_term || '%' THEN 0.6
      ELSE 0.5
    END::numeric as relevance
  FROM executive_logs el
  LEFT JOIN b2f_farms bf ON el.farm_id = bf.id
  LEFT JOIN decision_queue dq ON el.decision_id = dq.id
  LEFT JOIN platform_staff ps1 ON el.performed_by = ps1.id
  LEFT JOIN platform_staff ps2 ON dq.requested_by = ps2.id
  WHERE 
    el.action_type IN ('approve_decision', 'reject_decision', 'request_review')
    AND (
      bf.name ILIKE '%' || p_search_term || '%'
      OR dq.decision_type ILIKE '%' || p_search_term || '%'
      OR el.notes ILIKE '%' || p_search_term || '%'
      OR ps1.full_name ILIKE '%' || p_search_term || '%'
      OR ps2.full_name ILIKE '%' || p_search_term || '%'
    )
  ORDER BY relevance DESC, el.created_at DESC
  LIMIT p_limit;
END;
$$;
