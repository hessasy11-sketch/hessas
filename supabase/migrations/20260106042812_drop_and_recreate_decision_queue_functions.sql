/*
  # حذف وإعادة إنشاء دوال Decision Queue
*/

-- حذف الدوال القديمة إن وجدت
DROP FUNCTION IF EXISTS get_pending_decisions();
DROP FUNCTION IF EXISTS approve_decision(uuid, uuid, text);
DROP FUNCTION IF EXISTS reject_decision(uuid, uuid, text);
DROP FUNCTION IF EXISTS request_decision_review(uuid, uuid, text);
DROP FUNCTION IF EXISTS get_decisions_stats();

-- دالة جلب جميع القرارات المعلقة مع تفاصيلها
CREATE OR REPLACE FUNCTION get_pending_decisions()
RETURNS TABLE (
  id uuid,
  decision_type text,
  farm_id uuid,
  farm_name text,
  farm_location text,
  target_staff_id uuid,
  target_staff_name text,
  expense_amount numeric,
  expense_description text,
  action_data jsonb,
  status text,
  priority text,
  requested_by uuid,
  requested_by_name text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  source_category text,
  impact_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dq.id,
    dq.decision_type,
    dq.farm_id,
    bf.name as farm_name,
    bf.location as farm_location,
    dq.target_staff_id,
    ps1.full_name as target_staff_name,
    dq.expense_amount,
    dq.expense_description,
    dq.action_data,
    dq.status,
    dq.priority,
    dq.requested_by,
    ps2.full_name as requested_by_name,
    dq.notes,
    dq.created_at,
    dq.updated_at,
    -- تحديد المصدر
    CASE 
      WHEN dq.farm_id IS NOT NULL THEN 'farm'
      WHEN dq.expense_amount IS NOT NULL THEN 'financial'
      ELSE 'operational'
    END as source_category,
    -- تحديد نوع التأثير
    CASE dq.decision_type
      WHEN 'change_farm_manager' THEN 'operational'
      WHEN 'suspend_bookings' THEN 'operational'
      WHEN 'financial_review' THEN 'financial'
      WHEN 'approve_expense' THEN 'financial'
      WHEN 'extend_contract' THEN 'investment'
      ELSE 'operational'
    END as impact_type
  FROM decision_queue dq
  LEFT JOIN b2f_farms bf ON dq.farm_id = bf.id
  LEFT JOIN platform_staff ps1 ON dq.target_staff_id = ps1.id
  LEFT JOIN platform_staff ps2 ON dq.requested_by = ps2.id
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

-- دالة الموافقة على قرار
CREATE OR REPLACE FUNCTION approve_decision(
  p_decision_id uuid,
  p_approved_by uuid,
  p_approval_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision RECORD;
  v_log_id uuid;
BEGIN
  SELECT * INTO v_decision
  FROM decision_queue
  WHERE id = p_decision_id;
  
  IF v_decision.id IS NULL THEN
    RAISE EXCEPTION 'القرار غير موجود';
  END IF;
  
  IF v_decision.status != 'pending' THEN
    RAISE EXCEPTION 'القرار تم معالجته مسبقاً';
  END IF;
  
  UPDATE decision_queue
  SET 
    status = 'approved',
    approved_by = p_approved_by,
    notes = COALESCE(p_approval_notes, notes),
    updated_at = now()
  WHERE id = p_decision_id;
  
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
      'approval_notes', p_approval_notes
    ),
    p_approved_by,
    'success',
    'تمت الموافقة على القرار'
  )
  RETURNING id INTO v_log_id;
  
  RETURN json_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'status', 'approved',
    'log_id', v_log_id,
    'message', 'تمت الموافقة على القرار بنجاح - جاهز للتنفيذ'
  );
END;
$$;

-- دالة رفض قرار
CREATE OR REPLACE FUNCTION reject_decision(
  p_decision_id uuid,
  p_rejected_by uuid,
  p_rejection_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision RECORD;
  v_log_id uuid;
BEGIN
  SELECT * INTO v_decision
  FROM decision_queue
  WHERE id = p_decision_id;
  
  IF v_decision.id IS NULL THEN
    RAISE EXCEPTION 'القرار غير موجود';
  END IF;
  
  IF v_decision.status != 'pending' THEN
    RAISE EXCEPTION 'القرار تم معالجته مسبقاً';
  END IF;
  
  IF p_rejection_reason IS NULL OR p_rejection_reason = '' THEN
    RAISE EXCEPTION 'يجب تحديد سبب الرفض';
  END IF;
  
  UPDATE decision_queue
  SET 
    status = 'rejected',
    approved_by = p_rejected_by,
    notes = COALESCE(notes || ' | رفض: ' || p_rejection_reason, 'رفض: ' || p_rejection_reason),
    updated_at = now()
  WHERE id = p_decision_id;
  
  INSERT INTO executive_logs (
    action_type,
    farm_id,
    decision_id,
    action_data,
    performed_by,
    result,
    notes
  ) VALUES (
    'reject_decision',
    v_decision.farm_id,
    p_decision_id,
    jsonb_build_object(
      'decision_type', v_decision.decision_type,
      'priority', v_decision.priority,
      'rejection_reason', p_rejection_reason
    ),
    p_rejected_by,
    'success',
    'تم رفض القرار'
  )
  RETURNING id INTO v_log_id;
  
  RETURN json_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'status', 'rejected',
    'log_id', v_log_id,
    'message', 'تم رفض القرار'
  );
END;
$$;

-- دالة طلب مراجعة قرار
CREATE OR REPLACE FUNCTION request_decision_review(
  p_decision_id uuid,
  p_reviewed_by uuid,
  p_review_notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision RECORD;
BEGIN
  SELECT * INTO v_decision
  FROM decision_queue
  WHERE id = p_decision_id;
  
  IF v_decision.id IS NULL THEN
    RAISE EXCEPTION 'القرار غير موجود';
  END IF;
  
  IF v_decision.status != 'pending' THEN
    RAISE EXCEPTION 'القرار تم معالجته مسبقاً';
  END IF;
  
  UPDATE decision_queue
  SET 
    notes = COALESCE(notes || ' | مراجعة: ' || p_review_notes, 'مراجعة: ' || p_review_notes),
    priority = 'urgent',
    updated_at = now()
  WHERE id = p_decision_id;
  
  INSERT INTO executive_logs (
    action_type,
    farm_id,
    decision_id,
    action_data,
    performed_by,
    result,
    notes
  ) VALUES (
    'request_review',
    v_decision.farm_id,
    p_decision_id,
    jsonb_build_object(
      'decision_type', v_decision.decision_type,
      'review_notes', p_review_notes
    ),
    p_reviewed_by,
    'success',
    'تم طلب مراجعة إضافية'
  );
  
  RETURN json_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'status', 'pending',
    'priority', 'urgent',
    'message', 'تم طلب مراجعة إضافية - تم رفع الأولوية إلى عاجل'
  );
END;
$$;

-- دالة للحصول على إحصائيات القرارات
CREATE OR REPLACE FUNCTION get_decisions_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_count int;
  v_approved_count int;
  v_rejected_count int;
  v_urgent_count int;
  v_high_count int;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'urgent'),
    COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'high')
  INTO 
    v_pending_count,
    v_approved_count,
    v_rejected_count,
    v_urgent_count,
    v_high_count
  FROM decision_queue
  WHERE created_at >= now() - interval '30 days';
  
  RETURN json_build_object(
    'pending', v_pending_count,
    'approved', v_approved_count,
    'rejected', v_rejected_count,
    'urgent', v_urgent_count,
    'high_priority', v_high_count
  );
END;
$$;
