/*
  # دوال الموافقة والرفض للقرارات - Decision Approval System

  ## الهدف
  تمكين المدير العام من:
  1. الموافقة على القرارات المعلقة (B2F)
  2. رفض القرارات مع سبب إجباري (B2F)
  3. الموافقة على قرارات المزادات (B2B)
  4. رفض قرارات المزادات مع سبب إجباري (B2B)

  ## الجداول المستخدمة
  - executive_decision_queue (للقرارات العامة - B2F)
  - b2b_decision_queue (لقرارات المزادات - B2B)
  - executive_actions_log (لتسجيل الإجراءات)
  - b2b_executive_logs (لتسجيل إجراءات المزادات)

  ## الدوال الجديدة
  1. approve_decision(decision_id, staff_id, notes)
  2. reject_decision(decision_id, staff_id, reason)
  3. approve_b2b_decision(decision_id, staff_id, notes)
  4. reject_b2b_decision(decision_id, staff_id, reason)
*/

-- ============================================
-- 1. دالة الموافقة على قرار B2F
-- ============================================

CREATE OR REPLACE FUNCTION approve_decision(
  p_decision_id uuid,
  p_approved_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_type text;
  v_title text;
  v_related_entity_id uuid;
  v_related_entity_type text;
  v_log_id uuid;
BEGIN
  -- التحقق من وجود القرار
  SELECT decision_type, title, related_entity_id, related_entity_type
  INTO v_decision_type, v_title, v_related_entity_id, v_related_entity_type
  FROM executive_decision_queue
  WHERE id = p_decision_id AND status = 'pending';

  IF v_decision_type IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not found or already processed'
    );
  END IF;

  -- تحديث حالة القرار
  UPDATE executive_decision_queue
  SET
    status = 'approved',
    decided_by = p_approved_by,
    decided_at = now(),
    decision_notes = p_notes
  WHERE id = p_decision_id;

  -- تسجيل الإجراء في السجل التنفيذي
  INSERT INTO executive_actions_log (
    executed_by,
    executor_name,
    action_type,
    target_type,
    target_id,
    action_title,
    action_description,
    action_data,
    result
  )
  SELECT
    p_approved_by,
    ps.full_name,
    'approve_decision',
    'decision',
    p_decision_id,
    'اعتماد قرار: ' || v_title,
    p_notes,
    jsonb_build_object(
      'decision_id', p_decision_id,
      'decision_type', v_decision_type,
      'related_entity_type', v_related_entity_type,
      'related_entity_id', v_related_entity_id
    ),
    'success'
  FROM platform_staff ps
  WHERE ps.id = p_approved_by
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'status', 'approved',
    'log_id', v_log_id
  );
END;
$$;

-- ============================================
-- 2. دالة رفض قرار B2F
-- ============================================

CREATE OR REPLACE FUNCTION reject_decision(
  p_decision_id uuid,
  p_rejected_by uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_type text;
  v_title text;
  v_related_entity_id uuid;
  v_related_entity_type text;
  v_log_id uuid;
BEGIN
  -- التحقق من وجود السبب
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rejection reason is required'
    );
  END IF;

  -- التحقق من وجود القرار
  SELECT decision_type, title, related_entity_id, related_entity_type
  INTO v_decision_type, v_title, v_related_entity_id, v_related_entity_type
  FROM executive_decision_queue
  WHERE id = p_decision_id AND status = 'pending';

  IF v_decision_type IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not found or already processed'
    );
  END IF;

  -- تحديث حالة القرار
  UPDATE executive_decision_queue
  SET
    status = 'rejected',
    decided_by = p_rejected_by,
    decided_at = now(),
    decision_notes = p_reason
  WHERE id = p_decision_id;

  -- تسجيل الإجراء في السجل التنفيذي
  INSERT INTO executive_actions_log (
    executed_by,
    executor_name,
    action_type,
    target_type,
    target_id,
    action_title,
    action_description,
    action_data,
    result
  )
  SELECT
    p_rejected_by,
    ps.full_name,
    'reject_decision',
    'decision',
    p_decision_id,
    'رفض قرار: ' || v_title,
    'السبب: ' || p_reason,
    jsonb_build_object(
      'decision_id', p_decision_id,
      'decision_type', v_decision_type,
      'related_entity_type', v_related_entity_type,
      'related_entity_id', v_related_entity_id,
      'rejection_reason', p_reason
    ),
    'success'
  FROM platform_staff ps
  WHERE ps.id = p_rejected_by
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'status', 'rejected',
    'reason', p_reason,
    'log_id', v_log_id
  );
END;
$$;

-- ============================================
-- 3. دالة الموافقة على قرار مزاد B2B
-- ============================================

CREATE OR REPLACE FUNCTION approve_b2b_decision(
  p_decision_id uuid,
  p_approved_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_type text;
  v_auction_id uuid;
  v_auction_title text;
  v_action_data jsonb;
  v_log_id uuid;
BEGIN
  -- التحقق من وجود القرار
  SELECT decision_type, auction_id, auction_title, action_data
  INTO v_decision_type, v_auction_id, v_auction_title, v_action_data
  FROM b2b_decision_queue
  WHERE id = p_decision_id AND status = 'pending';

  IF v_decision_type IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not found or already processed'
    );
  END IF;

  -- تحديث حالة القرار
  UPDATE b2b_decision_queue
  SET
    status = 'approved',
    approved_by = p_approved_by,
    executed_at = now(),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_decision_id;

  -- تسجيل الإجراء في سجل B2B
  INSERT INTO b2b_executive_logs (
    action_type,
    auction_id,
    decision_id,
    action_data,
    performed_by,
    result,
    notes
  )
  VALUES (
    v_decision_type || '_approved',
    v_auction_id,
    p_decision_id,
    jsonb_build_object(
      'decision_id', p_decision_id,
      'auction_title', v_auction_title,
      'original_data', v_action_data
    ),
    p_approved_by,
    'success',
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'status', 'approved',
    'auction_id', v_auction_id,
    'log_id', v_log_id
  );
END;
$$;

-- ============================================
-- 4. دالة رفض قرار مزاد B2B
-- ============================================

CREATE OR REPLACE FUNCTION reject_b2b_decision(
  p_decision_id uuid,
  p_rejected_by uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_type text;
  v_auction_id uuid;
  v_auction_title text;
  v_action_data jsonb;
  v_log_id uuid;
BEGIN
  -- التحقق من وجود السبب
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rejection reason is required'
    );
  END IF;

  -- التحقق من وجود القرار
  SELECT decision_type, auction_id, auction_title, action_data
  INTO v_decision_type, v_auction_id, v_auction_title, v_action_data
  FROM b2b_decision_queue
  WHERE id = p_decision_id AND status = 'pending';

  IF v_decision_type IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not found or already processed'
    );
  END IF;

  -- تحديث حالة القرار
  UPDATE b2b_decision_queue
  SET
    status = 'rejected',
    approved_by = p_rejected_by,
    executed_at = now(),
    notes = 'مرفوض - ' || p_reason
  WHERE id = p_decision_id;

  -- تسجيل الإجراء في سجل B2B
  INSERT INTO b2b_executive_logs (
    action_type,
    auction_id,
    decision_id,
    action_data,
    performed_by,
    result,
    notes
  )
  VALUES (
    v_decision_type || '_rejected',
    v_auction_id,
    p_decision_id,
    jsonb_build_object(
      'decision_id', p_decision_id,
      'auction_title', v_auction_title,
      'original_data', v_action_data,
      'rejection_reason', p_reason
    ),
    p_rejected_by,
    'success',
    'مرفوض - ' || p_reason
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'status', 'rejected',
    'reason', p_reason,
    'auction_id', v_auction_id,
    'log_id', v_log_id
  );
END;
$$;

-- ============================================
-- منح صلاحيات التنفيذ
-- ============================================

GRANT EXECUTE ON FUNCTION approve_decision TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reject_decision TO anon, authenticated;
GRANT EXECUTE ON FUNCTION approve_b2b_decision TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reject_b2b_decision TO anon, authenticated;
