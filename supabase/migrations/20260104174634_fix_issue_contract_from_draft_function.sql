/*
  # إصلاح دالة إصدار العقد من المسودة

  1. التحديثات
    - إضافة معالجة أفضل للأخطاء
    - التأكد من وجود جميع البيانات المطلوبة
    - إضافة تسجيل أوضح للمشاكل
    - دعم account_id للمستثمر
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS issue_contract_from_draft(uuid, text);

-- إنشاء الدالة المحسّنة
CREATE OR REPLACE FUNCTION issue_contract_from_draft(
  p_draft_id UUID,
  p_issued_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_draft RECORD;
  v_request RECORD;
  v_contract_id UUID;
  v_contract_number TEXT;
  v_account_id UUID;
BEGIN
  -- جلب المسودة
  SELECT * INTO v_draft 
  FROM b2f_contract_drafts 
  WHERE id = p_draft_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'المسودة غير موجودة'
    );
  END IF;

  IF v_draft.issued THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'تم إصدار عقد من هذه المسودة مسبقاً'
    );
  END IF;

  -- جلب بيانات الطلب
  SELECT * INTO v_request
  FROM b2f_sales_requests
  WHERE id = v_draft.sales_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'الطلب غير موجود'
    );
  END IF;

  -- البحث عن حساب المستثمر (إن وجد)
  SELECT id INTO v_account_id
  FROM b2f_investor_accounts
  WHERE phone = v_draft.investor_phone
  LIMIT 1;

  -- توليد رقم العقد الفريد
  v_contract_number := 'CNT-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(random() * 100000)::TEXT, 5, '0');

  -- إنشاء العقد
  BEGIN
    INSERT INTO b2f_contracts (
      contract_number,
      account_id,
      opportunity_id,
      farm_id,
      contract_type,
      status,
      start_date,
      end_date,
      duration_years,
      total_amount,
      tree_count,
      tree_type,
      investor_phone,
      trees_count,
      amount_total,
      duration_months,
      current_beneficiary_phone,
      current_beneficiary_name,
      original_beneficiary_phone,
      original_beneficiary_name,
      is_transferred,
      transfer_count,
      contract_content
    ) VALUES (
      v_contract_number,
      v_account_id,
      v_request.opportunity_id,
      v_draft.farm_id,
      'tree_investment',
      'active',
      v_draft.start_date,
      v_draft.end_date,
      CEIL(v_draft.duration_months / 12.0),
      v_draft.total_amount,
      v_draft.trees_count,
      v_request.tree_type,
      v_draft.investor_phone,
      v_draft.trees_count,
      v_draft.total_amount,
      v_draft.duration_months,
      v_draft.investor_phone,
      v_draft.investor_name,
      v_draft.investor_phone,
      v_draft.investor_name,
      false,
      0,
      COALESCE(v_draft.draft_content, 'عقد استثمار أشجار')
    )
    RETURNING id INTO v_contract_id;

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'فشل إنشاء العقد: ' || SQLERRM
    );
  END;

  -- تحديث حالة المسودة
  UPDATE b2f_contract_drafts
  SET 
    issued = true,
    last_edited_at = now(),
    last_edited_by = p_issued_by
  WHERE id = p_draft_id;

  -- تحديث حالة الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'contract_issued',
    contract_issued_at = now(),
    updated_at = now()
  WHERE id = v_draft.sales_request_id;

  RETURN json_build_object(
    'success', true,
    'contract_id', v_contract_id,
    'contract_number', v_contract_number
  );
END;
$$;