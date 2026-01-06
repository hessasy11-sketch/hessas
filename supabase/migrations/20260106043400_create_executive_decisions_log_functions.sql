/*
  # دوال سجل القرارات التنفيذي (Executive Decisions Log)
  
  1. الوظائف:
    - `get_executive_decisions_log` - جلب سجل القرارات التنفيذية الكامل
    - السجل غير قابل للتعديل (read-only)
    - يحتوي على تفاصيل كاملة للقرارات المعتمدة والمرفوضة
  
  2. المعلومات المعروضة:
    - القرار ونوعه
    - من طلبه
    - من اعتمده/رفضه
    - متى تم الإجراء
    - الأثر الناتج (farm_id / contract_id / auction_id)
    - نتيجة القرار (success/failure)
    - الملاحظات
*/

-- دالة جلب سجل القرارات التنفيذي الكامل
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
  auction_id uuid,
  auction_title text,
  contract_id uuid,
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
    el.auction_id,
    NULL::text as auction_title,
    el.contract_id,
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
      WHEN el.contract_id IS NOT NULL THEN 'عقد: ' || el.contract_id::text
      WHEN el.auction_id IS NOT NULL THEN 'مزاد: ' || el.auction_id::text
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

-- دالة إحصائيات سجل القرارات التنفيذي
CREATE OR REPLACE FUNCTION get_executive_decisions_stats(
  p_from_date timestamptz DEFAULT NULL,
  p_to_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_decisions int;
  v_approved_decisions int;
  v_rejected_decisions int;
  v_review_requests int;
  v_success_rate numeric;
  v_avg_response_time interval;
BEGIN
  -- إحصائيات القرارات
  SELECT 
    COUNT(*) FILTER (WHERE action_type IN ('approve_decision', 'reject_decision')),
    COUNT(*) FILTER (WHERE action_type = 'approve_decision'),
    COUNT(*) FILTER (WHERE action_type = 'reject_decision'),
    COUNT(*) FILTER (WHERE action_type = 'request_review')
  INTO 
    v_total_decisions,
    v_approved_decisions,
    v_rejected_decisions,
    v_review_requests
  FROM executive_logs
  WHERE 
    action_type IN ('approve_decision', 'reject_decision', 'request_review')
    AND (p_from_date IS NULL OR created_at >= p_from_date)
    AND (p_to_date IS NULL OR created_at <= p_to_date);
  
  -- معدل النجاح
  IF v_total_decisions > 0 THEN
    v_success_rate := ROUND((v_approved_decisions::numeric / v_total_decisions::numeric) * 100, 2);
  ELSE
    v_success_rate := 0;
  END IF;
  
  -- متوسط وقت الاستجابة (من إنشاء القرار إلى اعتماده)
  SELECT AVG(el.created_at - dq.created_at)
  INTO v_avg_response_time
  FROM executive_logs el
  INNER JOIN decision_queue dq ON el.decision_id = dq.id
  WHERE 
    el.action_type IN ('approve_decision', 'reject_decision')
    AND (p_from_date IS NULL OR el.created_at >= p_from_date)
    AND (p_to_date IS NULL OR el.created_at <= p_to_date);
  
  RETURN json_build_object(
    'total_decisions', v_total_decisions,
    'approved', v_approved_decisions,
    'rejected', v_rejected_decisions,
    'review_requests', v_review_requests,
    'success_rate', v_success_rate,
    'avg_response_hours', EXTRACT(EPOCH FROM v_avg_response_time) / 3600
  );
END;
$$;

-- دالة البحث في سجل القرارات
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
  relevance float
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
    END as relevance
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

-- التأكد من RLS للقراءة فقط على executive_logs
ALTER TABLE executive_logs ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للجميع (read-only)
DROP POLICY IF EXISTS "Allow read access to executive logs" ON executive_logs;
CREATE POLICY "Allow read access to executive logs"
  ON executive_logs
  FOR SELECT
  USING (true);

-- منع التعديل والحذف بشكل كامل
DROP POLICY IF EXISTS "Prevent updates on executive logs" ON executive_logs;
CREATE POLICY "Prevent updates on executive logs"
  ON executive_logs
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "Prevent deletes on executive logs" ON executive_logs;
CREATE POLICY "Prevent deletes on executive logs"
  ON executive_logs
  FOR DELETE
  USING (false);
