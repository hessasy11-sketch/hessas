/*
  # إصلاح دوال الاعتماد
  
  تبسيط approve_expense و reject_expense لتعمل مع البنية الفعلية
*/

-- =====================================================
-- إصلاح دالة: اعتماد مصروف (مبسطة)
-- =====================================================
CREATE OR REPLACE FUNCTION approve_expense(
  p_entry_id uuid,
  p_approver_id uuid,
  p_approver_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_id uuid;
  v_amount numeric;
  v_category_name text;
  v_description text;
  v_result json;
BEGIN
  -- جلب بيانات المصروف
  SELECT farm_id, amount, category_name, description
  INTO v_farm_id, v_amount, v_category_name, v_description
  FROM farm_financial_ledger
  WHERE id = p_entry_id;
  
  IF v_farm_id IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;
  
  -- تحديث حالة الاعتماد
  UPDATE farm_financial_ledger
  SET 
    approval_status = 'approved',
    is_approved = true,
    approved_by = p_approver_id,
    approved_by_name = p_approver_name,
    approved_at = now()
  WHERE id = p_entry_id;
  
  -- تسجيل في Decision Queue (مبسط)
  INSERT INTO b2b_decision_queue (
    decision_type,
    auction_title,
    action_data,
    priority,
    requested_by,
    approved_by,
    status,
    executed_at,
    notes
  )
  VALUES (
    'financial_approval',
    'اعتماد مصروف: ' || v_category_name,
    json_build_object(
      'entry_id', p_entry_id,
      'farm_id', v_farm_id,
      'amount', v_amount,
      'category', v_category_name,
      'description', v_description
    ),
    'medium',
    p_approver_id,
    p_approver_id,
    'approved',
    now(),
    format('تم اعتماد مصروف بقيمة %s ريال', v_amount)
  );
  
  v_result := json_build_object(
    'success', true,
    'message', 'تم اعتماد المصروف بنجاح'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =====================================================
-- إصلاح دالة: رفض مصروف (مبسطة)
-- =====================================================
CREATE OR REPLACE FUNCTION reject_expense(
  p_entry_id uuid,
  p_rejector_id uuid,
  p_rejector_name text,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_id uuid;
  v_amount numeric;
  v_category_name text;
  v_result json;
BEGIN
  -- جلب بيانات المصروف
  SELECT farm_id, amount, category_name
  INTO v_farm_id, v_amount, v_category_name
  FROM farm_financial_ledger
  WHERE id = p_entry_id;
  
  IF v_farm_id IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;
  
  -- تحديث حالة الرفض
  UPDATE farm_financial_ledger
  SET 
    approval_status = 'rejected',
    is_approved = false,
    rejected_by = p_rejector_id,
    rejected_by_name = p_rejector_name,
    rejected_at = now(),
    rejection_reason = p_reason
  WHERE id = p_entry_id;
  
  -- تسجيل في Decision Queue (مبسط)
  INSERT INTO b2b_decision_queue (
    decision_type,
    auction_title,
    action_data,
    priority,
    requested_by,
    status,
    notes
  )
  VALUES (
    'financial_rejection',
    'رفض مصروف: ' || v_category_name,
    json_build_object(
      'entry_id', p_entry_id,
      'farm_id', v_farm_id,
      'amount', v_amount,
      'category', v_category_name,
      'reason', p_reason
    ),
    'medium',
    p_rejector_id,
    'rejected',
    format('تم رفض مصروف بقيمة %s ريال - السبب: %s', v_amount, p_reason)
  );
  
  v_result := json_build_object(
    'success', true,
    'message', 'تم رفض المصروف'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant Permissions
GRANT EXECUTE ON FUNCTION approve_expense TO authenticated;
GRANT EXECUTE ON FUNCTION approve_expense TO anon;
GRANT EXECUTE ON FUNCTION reject_expense TO authenticated;
GRANT EXECUTE ON FUNCTION reject_expense TO anon;
