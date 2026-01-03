/*
  # دوال نظام العقود المتطور
  
  1. اعتماد مسودة كقالب
  2. إصدار عقد من مسودة
  3. إصدار عقود جماعي
  4. نقل مدة الانتفاع
*/

-- ============================================
-- 1. دالة: اعتماد مسودة كقالب معتمد
-- ============================================
CREATE OR REPLACE FUNCTION approve_draft_as_template(
  p_draft_id UUID,
  p_template_name TEXT,
  p_approved_by TEXT DEFAULT 'Admin',
  p_set_as_default BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_draft RECORD;
  v_template_id UUID;
BEGIN
  -- جلب المسودة
  SELECT * INTO v_draft FROM b2f_contract_drafts WHERE id = p_draft_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المسودة غير موجودة');
  END IF;
  
  -- إلغاء القالب الافتراضي السابق إذا كان هذا سيكون افتراضي
  IF p_set_as_default THEN
    UPDATE b2f_contract_templates SET is_default = false WHERE is_default = true;
  END IF;
  
  -- إنشاء القالب الجديد
  INSERT INTO b2f_contract_templates (
    template_name,
    contract_content,
    approved_by,
    approved_at,
    is_active,
    is_default,
    notes
  ) VALUES (
    p_template_name,
    v_draft.draft_content,
    p_approved_by,
    NOW(),
    true,
    p_set_as_default,
    'تم الاعتماد من المسودة رقم: ' || v_draft.draft_number
  ) RETURNING id INTO v_template_id;
  
  -- تحديث حالة المسودة
  UPDATE b2f_contract_drafts
  SET 
    status = 'approved',
    reviewed_by = p_approved_by,
    reviewed_at = NOW(),
    review_notes = 'تم اعتماد المسودة كقالب معتمد'
  WHERE id = p_draft_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'template_id', v_template_id,
    'message', 'تم اعتماد المسودة كقالب معتمد بنجاح'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 2. دالة: إصدار عقد من مسودة
-- ============================================
CREATE OR REPLACE FUNCTION issue_contract_from_draft(
  p_draft_id UUID,
  p_issued_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_draft RECORD;
  v_contract_id UUID;
  v_contract_number TEXT;
  v_operation_id UUID;
  v_farm RECORD;
BEGIN
  -- جلب المسودة
  SELECT * INTO v_draft FROM b2f_contract_drafts WHERE id = p_draft_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المسودة غير موجودة');
  END IF;
  
  IF v_draft.issued THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم إصدار عقد من هذه المسودة مسبقاً');
  END IF;
  
  -- جلب المزرعة
  SELECT * INTO v_farm FROM b2f_farms WHERE id = v_draft.farm_id;
  
  -- توليد رقم العقد
  v_contract_number := 'B2F-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((
    SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 10) AS INTEGER)), 0) + 1
    FROM b2f_contracts
    WHERE contract_number LIKE 'B2F-' || TO_CHAR(NOW(), 'YYYY') || '-%'
  )::TEXT, 6, '0');
  
  -- إصدار العقد
  INSERT INTO b2f_contracts (
    contract_number,
    sales_request_id,
    payment_document_id,
    draft_id,
    template_id,
    investor_phone,
    farm_id,
    opportunity_id,
    trees_count,
    amount_total,
    contract_type,
    start_date,
    end_date,
    status,
    operation_status,
    current_beneficiary_phone,
    current_beneficiary_name,
    original_beneficiary_phone,
    original_beneficiary_name,
    contract_content,
    auto_issued,
    visible_to_investor
  ) VALUES (
    v_contract_number,
    v_draft.sales_request_id,
    v_draft.payment_document_id,
    v_draft.id,
    v_draft.template_id,
    v_draft.investor_phone,
    v_draft.farm_id,
    v_draft.opportunity_id,
    v_draft.trees_count,
    v_draft.total_amount,
    'investment',
    v_draft.start_date,
    v_draft.end_date,
    'active',
    'pending_start',
    v_draft.investor_phone,
    v_draft.investor_name,
    v_draft.investor_phone,
    v_draft.investor_name,
    v_draft.draft_content,
    false,
    true -- يظهر مباشرة في "عقودي"
  ) RETURNING id INTO v_contract_id;
  
  -- تحديث المسودة
  UPDATE b2f_contract_drafts
  SET 
    status = 'issued',
    issued = true,
    issued_contract_id = v_contract_id,
    issued_at = NOW()
  WHERE id = p_draft_id;
  
  -- تحديث الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'contract_issued',
    contract_id = v_contract_id,
    contract_issued = true,
    contract_issued_at = NOW(),
    ready_for_operations = true,
    workflow_stage = 'operations'
  WHERE id = v_draft.sales_request_id;
  
  -- إنشاء سجل في التشغيل
  INSERT INTO b2f_operations_orders (
    contract_id, farm_id, investor_phone, contract_number,
    investor_name, tree_type, trees_count, farm_name,
    status, season_year, season_name
  ) VALUES (
    v_contract_id, v_draft.farm_id, v_draft.investor_phone, v_contract_number,
    v_draft.investor_name,
    (v_draft.contract_data->>'tree_type')::TEXT,
    v_draft.trees_count, v_farm.name,
    'ready_to_start', EXTRACT(YEAR FROM NOW()), 'موسم ' || EXTRACT(YEAR FROM NOW())
  ) RETURNING id INTO v_operation_id;
  
  -- تسجيل في التاريخ
  INSERT INTO b2f_contract_history (
    contract_id, event_type, event_description,
    beneficiary_phone, beneficiary_name,
    performed_by, notes
  ) VALUES (
    v_contract_id, 'issued', 'تم إصدار العقد من المسودة رقم: ' || v_draft.draft_number,
    v_draft.investor_phone, v_draft.investor_name,
    p_issued_by, 'إصدار من مسودة معتمدة'
  );
  
  -- إشعار المستثمر
  BEGIN
    IF v_draft.sales_request_id IS NOT NULL THEN
      DECLARE
        v_account_id UUID;
      BEGIN
        SELECT investor_account_id INTO v_account_id 
        FROM b2f_sales_requests 
        WHERE id = v_draft.sales_request_id;
        
        IF v_account_id IS NOT NULL THEN
          INSERT INTO b2f_notifications (
            investor_account_id, title, message, type, priority, is_read
          ) VALUES (
            v_account_id, 'تم إصدار عقدك',
            'رقم العقد: ' || v_contract_number || ' - يمكنك الآن عرضه وتحميله من قسم "عقودي"',
            'contract', 'important', false
          );
        END IF;
      END;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract_id,
    'contract_number', v_contract_number,
    'operation_id', v_operation_id,
    'message', 'تم إصدار العقد بنجاح من المسودة'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 3. دالة: إصدار عقود جماعي
-- ============================================
CREATE OR REPLACE FUNCTION bulk_issue_contracts(
  p_request_ids UUID[],
  p_issued_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id UUID;
  v_draft_result JSONB;
  v_issue_result JSONB;
  v_success_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_results JSONB := '[]'::JSONB;
BEGIN
  -- معالجة كل طلب
  FOREACH v_request_id IN ARRAY p_request_ids
  LOOP
    BEGIN
      -- إنشاء مسودة
      v_draft_result := create_contract_draft(v_request_id, p_issued_by);
      
      IF (v_draft_result->>'success')::BOOLEAN THEN
        -- إصدار العقد من المسودة
        v_issue_result := issue_contract_from_draft(
          (v_draft_result->>'draft_id')::UUID,
          p_issued_by
        );
        
        IF (v_issue_result->>'success')::BOOLEAN THEN
          v_success_count := v_success_count + 1;
          v_results := v_results || jsonb_build_object(
            'request_id', v_request_id,
            'status', 'success',
            'contract_number', v_issue_result->>'contract_number'
          );
        ELSE
          v_failed_count := v_failed_count + 1;
          v_results := v_results || jsonb_build_object(
            'request_id', v_request_id,
            'status', 'failed',
            'error', v_issue_result->>'error'
          );
        END IF;
      ELSE
        v_failed_count := v_failed_count + 1;
        v_results := v_results || jsonb_build_object(
          'request_id', v_request_id,
          'status', 'failed',
          'error', v_draft_result->>'error'
        );
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      v_results := v_results || jsonb_build_object(
        'request_id', v_request_id,
        'status', 'failed',
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total', array_length(p_request_ids, 1),
    'success_count', v_success_count,
    'failed_count', v_failed_count,
    'results', v_results,
    'message', 'تم إصدار ' || v_success_count || ' عقد بنجاح من أصل ' || array_length(p_request_ids, 1)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 4. دالة: نقل مدة الانتفاع لآخر
-- ============================================
CREATE OR REPLACE FUNCTION transfer_beneficiary(
  p_contract_id UUID,
  p_to_phone TEXT,
  p_to_name TEXT,
  p_to_national_id TEXT DEFAULT NULL,
  p_transfer_reason TEXT DEFAULT NULL,
  p_requested_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
  v_transfer_id UUID;
  v_transfer_number TEXT;
BEGIN
  -- جلب العقد
  SELECT * INTO v_contract FROM b2f_contracts WHERE id = p_contract_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'العقد غير موجود');
  END IF;
  
  IF v_contract.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن نقل عقد غير ساري');
  END IF;
  
  -- توليد رقم النقل
  v_transfer_number := generate_transfer_number();
  
  -- إنشاء طلب النقل
  INSERT INTO b2f_contract_transfers (
    transfer_number,
    contract_id,
    from_phone,
    from_name,
    to_phone,
    to_name,
    to_national_id,
    transfer_reason,
    requested_by,
    status
  ) VALUES (
    v_transfer_number,
    p_contract_id,
    v_contract.current_beneficiary_phone,
    v_contract.current_beneficiary_name,
    p_to_phone,
    p_to_name,
    p_to_national_id,
    p_transfer_reason,
    p_requested_by,
    'approved' -- موافقة مباشرة من الإدارة
  ) RETURNING id INTO v_transfer_id;
  
  -- تحديث العقد
  UPDATE b2f_contracts
  SET 
    current_beneficiary_phone = p_to_phone,
    current_beneficiary_name = p_to_name,
    is_transferred = true,
    transfer_count = transfer_count + 1,
    updated_at = NOW()
  WHERE id = p_contract_id;
  
  -- تسجيل في التاريخ
  INSERT INTO b2f_contract_history (
    contract_id, event_type, event_description,
    before_data, after_data,
    beneficiary_phone, beneficiary_name,
    performed_by
  ) VALUES (
    p_contract_id, 'transferred', 'تم نقل مدة الانتفاع',
    jsonb_build_object(
      'phone', v_contract.current_beneficiary_phone,
      'name', v_contract.current_beneficiary_name
    ),
    jsonb_build_object(
      'phone', p_to_phone,
      'name', p_to_name
    ),
    p_to_phone, p_to_name,
    p_requested_by
  );
  
  -- تحديث حالة النقل
  UPDATE b2f_contract_transfers
  SET 
    status = 'completed',
    completed_at = NOW(),
    completion_notes = 'تم النقل بنجاح'
  WHERE id = v_transfer_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'transfer_number', v_transfer_number,
    'message', 'تم نقل مدة الانتفاع بنجاح'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 5. دالة: تحديث محتوى المسودة
-- ============================================
CREATE OR REPLACE FUNCTION update_draft_content(
  p_draft_id UUID,
  p_new_content TEXT,
  p_edited_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE b2f_contract_drafts
  SET 
    draft_content = p_new_content,
    edit_count = edit_count + 1,
    last_edited_by = p_edited_by,
    last_edited_at = NOW(),
    updated_at = NOW()
  WHERE id = p_draft_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المسودة غير موجودة');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تحديث المسودة بنجاح'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION approve_draft_as_template(UUID, TEXT, TEXT, BOOLEAN) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION issue_contract_from_draft(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION bulk_issue_contracts(UUID[], TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION transfer_beneficiary(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_draft_content(UUID, TEXT, TEXT) TO authenticated, anon;