/*
  # تحسين نظام إصدار العقود - معالجة أخطاء متقدمة

  1. التحديثات
    - إضافة تسجيل تفصيلي للأخطاء
    - التحقق من جميع البيانات المطلوبة
    - معالجة استثناءات أفضل
    - رسائل خطأ واضحة بالعربية
*/

-- تحديث دالة issue_contract_from_draft مع معالجة أخطاء محسّنة
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
  v_error_msg TEXT;
BEGIN
  -- 1. التحقق من المسودة
  BEGIN
    SELECT * INTO STRICT v_draft 
    FROM b2f_contract_drafts 
    WHERE id = p_draft_id;
  EXCEPTION 
    WHEN NO_DATA_FOUND THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'المسودة غير موجودة - رقم المسودة غير صحيح'
      );
    WHEN TOO_MANY_ROWS THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'خطأ في النظام - يوجد أكثر من مسودة بنفس الرقم'
      );
  END;

  -- 2. التحقق من حالة المسودة
  IF v_draft.issued = true THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'تم إصدار عقد من هذه المسودة مسبقاً - لا يمكن الإصدار مرة أخرى'
    );
  END IF;

  -- 3. التحقق من الطلب
  BEGIN
    SELECT * INTO STRICT v_request
    FROM b2f_sales_requests
    WHERE id = v_draft.sales_request_id;
  EXCEPTION 
    WHEN NO_DATA_FOUND THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'الطلب المرتبط بالمسودة غير موجود'
      );
  END;

  -- 4. التحقق من البيانات المطلوبة
  IF v_draft.investor_phone IS NULL OR v_draft.investor_phone = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'رقم جوال المستثمر مفقود'
    );
  END IF;

  IF v_draft.investor_name IS NULL OR v_draft.investor_name = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'اسم المستثمر مفقود'
    );
  END IF;

  IF v_draft.trees_count IS NULL OR v_draft.trees_count <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'عدد الأشجار غير صحيح'
    );
  END IF;

  IF v_draft.total_amount IS NULL OR v_draft.total_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'المبلغ الإجمالي غير صحيح'
    );
  END IF;

  IF v_draft.duration_months IS NULL OR v_draft.duration_months <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'مدة العقد غير صحيحة'
    );
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
      RETURN json_build_object(
        'success', false,
        'error', 'رقم العقد مكرر - حاول مرة أخرى'
      );
    WHEN foreign_key_violation THEN
      v_error_msg := SQLERRM;
      IF v_error_msg LIKE '%farm_id%' THEN
        RETURN json_build_object(
          'success', false,
          'error', 'المزرعة المحددة غير موجودة'
        );
      ELSIF v_error_msg LIKE '%opportunity_id%' THEN
        RETURN json_build_object(
          'success', false,
          'error', 'الفرصة الاستثمارية غير موجودة'
        );
      ELSE
        RETURN json_build_object(
          'success', false,
          'error', 'خطأ في الربط: ' || v_error_msg
        );
      END IF;
    WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'error', 'فشل إنشاء العقد: ' || SQLERRM
      );
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

  -- 10. إنشاء إشعار للمستثمر (اختياري)
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- تجاهل خطأ الإشعار
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