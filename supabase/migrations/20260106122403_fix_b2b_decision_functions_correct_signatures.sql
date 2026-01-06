/*
  # إصلاح دوال B2B Decision Queue - حذف وإعادة إنشاء بالتوقيعات الصحيحة

  1. التغييرات
     - حذف الدوال بالتوقيعات الصحيحة
     - إعادة إنشاء الدوال بمعاملات مبسطة
*/

-- حذف الدوال بالتوقيعات الصحيحة
DROP FUNCTION IF EXISTS approve_b2b_decision(p_decision_id uuid, p_approved_by uuid, p_notes text);
DROP FUNCTION IF EXISTS reject_b2b_decision(p_decision_id uuid, p_rejected_by uuid, p_notes text);

-- إنشاء دالة approve_b2b_decision
CREATE FUNCTION approve_b2b_decision(
  p_decision_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_record record;
BEGIN
  -- جلب القرار
  SELECT * INTO v_decision_record
  FROM b2b_decision_queue
  WHERE id = p_decision_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not found or already processed'
    );
  END IF;

  -- تحديث حالة القرار
  UPDATE b2b_decision_queue
  SET
    status = 'approved',
    notes = COALESCE(p_notes, notes),
    executed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_decision_id;

  -- تنفيذ الإجراء المطلوب
  CASE v_decision_record.decision_type
    WHEN 'pause_auction' THEN
      UPDATE auctions SET status = 'paused' WHERE id = v_decision_record.auction_id;
    WHEN 'activate_auction' THEN
      UPDATE auctions SET status = 'active' WHERE id = v_decision_record.auction_id;
    WHEN 'cancel_auction' THEN
      UPDATE auctions SET status = 'cancelled' WHERE id = v_decision_record.auction_id;
    ELSE
      NULL;
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'decision_type', v_decision_record.decision_type
  );
END;
$$;

-- إنشاء دالة reject_b2b_decision
CREATE FUNCTION reject_b2b_decision(
  p_decision_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_record record;
BEGIN
  -- جلب القرار
  SELECT * INTO v_decision_record
  FROM b2b_decision_queue
  WHERE id = p_decision_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not found or already processed'
    );
  END IF;

  -- تحديث حالة القرار
  UPDATE b2b_decision_queue
  SET
    status = 'rejected',
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_decision_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id
  );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION approve_b2b_decision TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reject_b2b_decision TO anon, authenticated, service_role;
