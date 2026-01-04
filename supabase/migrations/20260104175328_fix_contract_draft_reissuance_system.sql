/*
  # إصلاح نظام إعادة إصدار العقود من المسودات

  1. التحديثات
    - إضافة عمود draft_id في جدول b2f_contracts
    - تحديث دالة issue_contract_from_draft للتحقق من العقود الفعلية
    - السماح بإعادة الإصدار إذا لم يكن هناك عقد نشط
    - إضافة دالة لإعادة فتح المسودة
*/

-- 1. إضافة عمود draft_id إلى جدول العقود (إن لم يكن موجود)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_contracts' 
    AND column_name = 'draft_id'
  ) THEN
    ALTER TABLE b2f_contracts 
    ADD COLUMN draft_id UUID REFERENCES b2f_contract_drafts(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_contracts_draft_id ON b2f_contracts(draft_id);
  END IF;
END $$;

-- 2. تحديث دالة issue_contract_from_draft مع التحقق الذكي
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
  v_existing_contract RECORD;
  v_contract_id UUID;
  v_contract_number TEXT;
  v_account_id UUID;
BEGIN
  -- 1. التحقق من المسودة
  SELECT * INTO v_draft 
  FROM b2f_contract_drafts 
  WHERE id = p_draft_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'المسودة غير موجودة'
    );
  END IF;

  -- 2. التحقق من وجود عقد نشط من هذه المسودة
  SELECT * INTO v_existing_contract
  FROM b2f_contracts
  WHERE draft_id = p_draft_id 
    AND status IN ('active', 'pending')
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'يوجد عقد نشط من هذه المسودة - رقم العقد: ' || v_existing_contract.contract_number,
      'contract_id', v_existing_contract.id,
      'contract_number', v_existing_contract.contract_number
    );
  END IF;

  -- 3. التحقق من الطلب
  SELECT * INTO v_request
  FROM b2f_sales_requests
  WHERE id = v_draft.sales_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'الطلب المرتبط بالمسودة غير موجود'
    );
  END IF;

  -- 4. التحقق من البيانات المطلوبة
  IF v_draft.investor_phone IS NULL OR v_draft.investor_phone = '' THEN
    RETURN json_build_object('success', false, 'error', 'رقم جوال المستثمر مفقود');
  END IF;

  IF v_draft.investor_name IS NULL OR v_draft.investor_name = '' THEN
    RETURN json_build_object('success', false, 'error', 'اسم المستثمر مفقود');
  END IF;

  IF v_draft.trees_count IS NULL OR v_draft.trees_count <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'عدد الأشجار غير صحيح');
  END IF;

  IF v_draft.total_amount IS NULL OR v_draft.total_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'المبلغ الإجمالي غير صحيح');
  END IF;

  IF v_draft.duration_months IS NULL OR v_draft.duration_months <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'مدة العقد غير صحيحة');
  END IF;

  -- 5. البحث عن حساب المستثمر
  SELECT id INTO v_account_id
  FROM b2f_investor_accounts
  WHERE phone = v_draft.investor_phone
  LIMIT 1;

  -- 6. توليد رقم العقد الفريد
  v_contract_number := 'CNT-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(random() * 100000)::TEXT, 5, '0');

  -- 7. إنشاء العقد
  BEGIN
    INSERT INTO b2f_contracts (
      contract_number,
      draft_id,
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
      contract_content,
      operation_status
    ) VALUES (
      v_contract_number,
      p_draft_id,
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
      COALESCE(v_request.tree_type, 'غير محدد'),
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
      COALESCE(v_draft.draft_content, 'عقد استثمار أشجار'),
      'pending'
    )
    RETURNING id INTO v_contract_id;

  EXCEPTION 
    WHEN unique_violation THEN
      RETURN json_build_object('success', false, 'error', 'رقم العقد مكرر - حاول مرة أخرى');
    WHEN foreign_key_violation THEN
      RETURN json_build_object('success', false, 'error', 'خطأ في الربط: البيانات المرجعية غير صحيحة');
    WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'error', 'فشل إنشاء العقد: ' || SQLERRM);
  END;

  -- 8. تحديث حالة المسودة
  UPDATE b2f_contract_drafts
  SET 
    issued = true,
    last_edited_at = now(),
    last_edited_by = p_issued_by
  WHERE id = p_draft_id;

  -- 9. تحديث حالة الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'contract_issued',
    contract_issued_at = now(),
    updated_at = now()
  WHERE id = v_draft.sales_request_id;

  -- 10. إنشاء إشعار للمستثمر
  BEGIN
    IF v_account_id IS NOT NULL THEN
      INSERT INTO b2f_notifications (
        account_id,
        type,
        priority,
        title_ar,
        message_ar,
        action_url
      ) VALUES (
        v_account_id,
        'contract_issued',
        'high',
        'تم إصدار العقد',
        'تم إصدار عقدك رقم: ' || v_contract_number || ' بنجاح. يمكنك الآن الاطلاع عليه من قسم عقودي.',
        '/investor/contracts'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 11. إرجاع النتيجة
  RETURN json_build_object(
    'success', true,
    'contract_id', v_contract_id,
    'contract_number', v_contract_number,
    'message', 'تم إصدار العقد بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'خطأ غير متوقع: ' || SQLERRM
    );
END;
$$;

-- 3. دالة لإعادة فتح المسودة (إلغاء علامة issued)
CREATE OR REPLACE FUNCTION reopen_contract_draft(
  p_draft_id UUID,
  p_reopened_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_contract_count INT;
BEGIN
  -- التحقق من عدم وجود عقود نشطة من هذه المسودة
  SELECT COUNT(*) INTO v_active_contract_count
  FROM b2f_contracts
  WHERE draft_id = p_draft_id 
    AND status IN ('active', 'pending');

  IF v_active_contract_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'لا يمكن إعادة فتح المسودة - يوجد ' || v_active_contract_count || ' عقد نشط'
    );
  END IF;

  -- إعادة فتح المسودة
  UPDATE b2f_contract_drafts
  SET 
    issued = false,
    last_edited_at = now(),
    last_edited_by = p_reopened_by
  WHERE id = p_draft_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'المسودة غير موجودة'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'تم إعادة فتح المسودة بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'خطأ: ' || SQLERRM
    );
END;
$$;

-- 4. دالة للتحقق من إمكانية إصدار عقد من المسودة
CREATE OR REPLACE FUNCTION can_issue_contract_from_draft(
  p_draft_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_draft RECORD;
  v_active_contract_count INT;
BEGIN
  -- جلب المسودة
  SELECT * INTO v_draft
  FROM b2f_contract_drafts
  WHERE id = p_draft_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'can_issue', false,
      'reason', 'المسودة غير موجودة'
    );
  END IF;

  -- التحقق من وجود عقود نشطة
  SELECT COUNT(*) INTO v_active_contract_count
  FROM b2f_contracts
  WHERE draft_id = p_draft_id 
    AND status IN ('active', 'pending');

  IF v_active_contract_count > 0 THEN
    RETURN json_build_object(
      'can_issue', false,
      'reason', 'يوجد عقد نشط من هذه المسودة'
    );
  END IF;

  RETURN json_build_object(
    'can_issue', true,
    'reason', 'المسودة جاهزة للإصدار'
  );

END;
$$;