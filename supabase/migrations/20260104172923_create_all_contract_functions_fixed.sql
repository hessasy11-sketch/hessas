/*
  # دوال إدارة العقود الكاملة
*/

-- =====================================================
-- 1. دالة إنشاء مسودة عقد
-- =====================================================
CREATE OR REPLACE FUNCTION create_contract_draft(
  p_request_id UUID,
  p_created_by TEXT
)
RETURNS JSON AS $$
DECLARE
  v_draft_id UUID;
  v_draft_number TEXT;
  v_request RECORD;
  v_farm RECORD;
  v_opportunity RECORD;
  v_draft_content TEXT;
  v_duration_months INTEGER;
  v_end_date DATE;
BEGIN
  -- جلب بيانات الطلب
  SELECT * INTO v_request
  FROM b2f_sales_requests
  WHERE id = p_request_id AND status = 'receipt_approved';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود أو غير جاهز للعقد');
  END IF;

  -- جلب بيانات المزرعة
  SELECT * INTO v_farm FROM b2f_farms WHERE id = v_request.farm_id;

  -- جلب بيانات الفرصة
  SELECT * INTO v_opportunity FROM b2f_opportunities WHERE id = v_request.opportunity_id;

  -- توليد رقم المسودة
  v_draft_number := 'DRAFT-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(random() * 10000)::TEXT, 4, '0');

  -- حساب المدة
  v_duration_months := COALESCE(v_opportunity.contract_duration_years, 1) * 12;
  v_end_date := CURRENT_DATE + (v_duration_months || ' months')::INTERVAL;

  -- محتوى المسودة
  v_draft_content := format(
    E'عقد استثمار زراعي\n\n' ||
    'بين المنصة (منصة استثمار المزارع) والمستثمر/ة (%s)\n' ||
    'رقم الجوال: %s\n\n' ||
    'البنود:\n' ||
    '1. عدد الأشجار: %s شجرة من نوع %s\n' ||
    '2. المزرعة: %s - %s\n' ||
    '3. المبلغ الإجمالي: %s ريال سعودي\n' ||
    '4. مدة العقد: %s شهر (%s سنوات)\n' ||
    '5. تاريخ البداية: %s\n' ||
    '6. تاريخ النهاية: %s\n\n' ||
    'الشروط والأحكام:\n' ||
    '- المستثمر له حق الانتفاع من إنتاج الأشجار طوال مدة العقد.\n' ||
    '- يحق للمستثمر نقل مدة الانتفاع لآخر.\n' ||
    '- المنصة مسؤولة عن إدارة وصيانة الأشجار.\n' ||
    '- يتم توزيع المحصول حسب العدد المتفق عليه من الأشجار.',
    v_request.investor_name,
    v_request.investor_phone,
    v_request.number_of_trees,
    v_request.tree_type,
    COALESCE(v_farm.name, 'المزرعة'),
    COALESCE(v_farm.city, ''),
    v_request.total_amount,
    v_duration_months,
    CEIL(v_duration_months / 12.0),
    CURRENT_DATE,
    v_end_date
  );

  -- إنشاء المسودة
  INSERT INTO b2f_contract_drafts (
    draft_number,
    sales_request_id,
    investor_phone,
    investor_name,
    farm_id,
    trees_count,
    total_amount,
    duration_months,
    start_date,
    end_date,
    draft_content,
    created_by
  ) VALUES (
    v_draft_number,
    p_request_id,
    v_request.investor_phone,
    v_request.investor_name,
    v_request.farm_id,
    v_request.number_of_trees,
    v_request.total_amount,
    v_duration_months,
    CURRENT_DATE,
    v_end_date,
    v_draft_content,
    p_created_by
  )
  RETURNING id INTO v_draft_id;

  RETURN json_build_object(
    'success', true,
    'draft_id', v_draft_id,
    'draft_number', v_draft_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. دالة إصدار عقد من مسودة
-- =====================================================
CREATE OR REPLACE FUNCTION issue_contract_from_draft(
  p_draft_id UUID,
  p_issued_by TEXT
)
RETURNS JSON AS $$
DECLARE
  v_draft RECORD;
  v_contract_id UUID;
  v_contract_number TEXT;
  v_tree_type TEXT;
BEGIN
  -- جلب المسودة
  SELECT * INTO v_draft FROM b2f_contract_drafts WHERE id = p_draft_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'المسودة غير موجودة');
  END IF;

  IF v_draft.issued THEN
    RETURN json_build_object('success', false, 'error', 'تم إصدار عقد من هذه المسودة مسبقاً');
  END IF;

  -- جلب نوع الشجرة
  SELECT tree_type INTO v_tree_type 
  FROM b2f_sales_requests 
  WHERE id = v_draft.sales_request_id;

  -- توليد رقم العقد
  v_contract_number := 'CNT-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(random() * 100000)::TEXT, 5, '0');

  -- إنشاء العقد
  INSERT INTO b2f_contracts (
    contract_number,
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
    contract_content
  ) VALUES (
    v_contract_number,
    v_draft.farm_id,
    'tree_investment',
    'active',
    v_draft.start_date,
    v_draft.end_date,
    CEIL(v_draft.duration_months / 12.0),
    v_draft.total_amount,
    v_draft.trees_count,
    v_tree_type,
    v_draft.investor_phone,
    v_draft.trees_count,
    v_draft.total_amount,
    v_draft.duration_months,
    v_draft.investor_phone,
    v_draft.investor_name,
    v_draft.investor_phone,
    v_draft.investor_name,
    v_draft.draft_content
  )
  RETURNING id INTO v_contract_id;

  -- تحديث حالة المسودة
  UPDATE b2f_contract_drafts
  SET issued = true
  WHERE id = p_draft_id;

  -- تحديث حالة الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'contract_issued',
    contract_issued_at = now()
  WHERE id = v_draft.sales_request_id;

  RETURN json_build_object(
    'success', true,
    'contract_id', v_contract_id,
    'contract_number', v_contract_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. دالة الإصدار الجماعي
-- =====================================================
CREATE OR REPLACE FUNCTION bulk_issue_contracts(
  p_request_ids UUID[],
  p_issued_by TEXT
)
RETURNS JSON AS $$
DECLARE
  v_request_id UUID;
  v_success_count INT := 0;
  v_total INT;
  v_draft_result JSON;
  v_issue_result JSON;
BEGIN
  v_total := array_length(p_request_ids, 1);

  FOREACH v_request_id IN ARRAY p_request_ids
  LOOP
    BEGIN
      -- إنشاء مسودة
      SELECT create_contract_draft(v_request_id, p_issued_by) INTO v_draft_result;
      
      IF (v_draft_result->>'success')::BOOLEAN THEN
        -- إصدار العقد من المسودة
        SELECT issue_contract_from_draft(
          (v_draft_result->>'draft_id')::UUID,
          p_issued_by
        ) INTO v_issue_result;
        
        IF (v_issue_result->>'success')::BOOLEAN THEN
          v_success_count := v_success_count + 1;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'total', v_total,
    'success_count', v_success_count,
    'failed_count', v_total - v_success_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. دالة تحديث محتوى المسودة
-- =====================================================
CREATE OR REPLACE FUNCTION update_draft_content(
  p_draft_id UUID,
  p_new_content TEXT,
  p_edited_by TEXT
)
RETURNS JSON AS $$
BEGIN
  UPDATE b2f_contract_drafts
  SET 
    draft_content = p_new_content,
    last_edited_at = now(),
    last_edited_by = p_edited_by
  WHERE id = p_draft_id AND issued = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'المسودة غير موجودة أو تم إصدارها');
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. دالة نقل الانتفاع
-- =====================================================
CREATE OR REPLACE FUNCTION transfer_beneficiary(
  p_contract_id UUID,
  p_to_phone TEXT,
  p_to_name TEXT,
  p_to_national_id TEXT,
  p_transfer_reason TEXT,
  p_requested_by TEXT
)
RETURNS JSON AS $$
DECLARE
  v_contract RECORD;
  v_transfer_number TEXT;
  v_transfer_id UUID;
BEGIN
  -- جلب العقد
  SELECT * INTO v_contract FROM b2f_contracts WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'العقد غير موجود');
  END IF;

  -- توليد رقم النقل
  v_transfer_number := 'TRN-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(random() * 10000)::TEXT, 4, '0');

  -- تسجيل النقل
  INSERT INTO b2f_contract_transfers (
    transfer_number,
    contract_id,
    from_phone,
    from_name,
    to_phone,
    to_name,
    to_national_id,
    transfer_reason,
    requested_by
  ) VALUES (
    v_transfer_number,
    p_contract_id,
    v_contract.current_beneficiary_phone,
    v_contract.current_beneficiary_name,
    p_to_phone,
    p_to_name,
    p_to_national_id,
    p_transfer_reason,
    p_requested_by
  )
  RETURNING id INTO v_transfer_id;

  -- تحديث العقد
  UPDATE b2f_contracts
  SET 
    current_beneficiary_phone = p_to_phone,
    current_beneficiary_name = p_to_name,
    is_transferred = true,
    transfer_count = transfer_count + 1,
    updated_at = now()
  WHERE id = p_contract_id;

  RETURN json_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'transfer_number', v_transfer_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_contract_draft TO authenticated, anon;
GRANT EXECUTE ON FUNCTION issue_contract_from_draft TO authenticated, anon;
GRANT EXECUTE ON FUNCTION bulk_issue_contracts TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_draft_content TO authenticated, anon;
GRANT EXECUTE ON FUNCTION transfer_beneficiary TO authenticated, anon;
