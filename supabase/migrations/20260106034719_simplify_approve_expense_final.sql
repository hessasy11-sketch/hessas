/*
  # تبسيط دوال الاعتماد - بدون decision queue
  
  إزالة التسجيل في decision_queue مؤقتاً
  التركيز على workflow الأساسي
*/

-- =====================================================
-- دالة: اعتماد مصروف (مبسطة - بدون decision queue)
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
  
  v_result := json_build_object(
    'success', true,
    'message', 'تم اعتماد المصروف بنجاح',
    'amount', v_amount,
    'category', v_category_name
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
-- دالة: رفض مصروف (مبسطة - بدون decision queue)
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
  
  v_result := json_build_object(
    'success', true,
    'message', 'تم رفض المصروف',
    'amount', v_amount,
    'reason', p_reason
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

COMMENT ON FUNCTION approve_expense IS 'اعتماد مصروف - يحدث farm_financial_ledger فقط';
COMMENT ON FUNCTION reject_expense IS 'رفض مصروف مع السبب';
