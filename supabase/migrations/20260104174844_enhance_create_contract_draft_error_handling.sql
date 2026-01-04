/*
  # تحسين دالة إنشاء مسودة العقد - معالجة أخطاء متقدمة

  1. التحديثات
    - معالجة أفضل للأخطاء
    - رسائل واضحة بالعربية
    - التحقق من جميع البيانات المطلوبة
*/

CREATE OR REPLACE FUNCTION create_contract_draft(
  p_request_id UUID, 
  p_created_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  -- 1. التحقق من الطلب
  BEGIN
    SELECT * INTO STRICT v_request
    FROM b2f_sales_requests
    WHERE id = p_request_id;
  EXCEPTION 
    WHEN NO_DATA_FOUND THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'الطلب غير موجود'
      );
  END;

  -- 2. التحقق من حالة الطلب
  IF v_request.status != 'receipt_approved' THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'الطلب غير جاهز للعقد - يجب أن تكون حالته: دفع معتمد'
    );
  END IF;

  -- 3. التحقق من البيانات الأساسية
  IF v_request.investor_phone IS NULL OR v_request.investor_phone = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'رقم جوال المستثمر مفقود في الطلب'
    );
  END IF;

  IF v_request.investor_name IS NULL OR v_request.investor_name = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'اسم المستثمر مفقود في الطلب'
    );
  END IF;

  IF v_request.number_of_trees IS NULL OR v_request.number_of_trees <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'عدد الأشجار غير صحيح في الطلب'
    );
  END IF;

  IF v_request.total_amount IS NULL OR v_request.total_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'المبلغ الإجمالي غير صحيح في الطلب'
    );
  END IF;

  -- 4. جلب بيانات المزرعة (اختياري)
  IF v_request.farm_id IS NOT NULL THEN
    SELECT * INTO v_farm 
    FROM b2f_farms 
    WHERE id = v_request.farm_id;
  END IF;

  -- 5. جلب بيانات الفرصة (اختياري)
  IF v_request.opportunity_id IS NOT NULL THEN
    SELECT * INTO v_opportunity 
    FROM b2f_opportunities 
    WHERE id = v_request.opportunity_id;
  END IF;

  -- 6. توليد رقم المسودة الفريد
  v_draft_number := 'DRAFT-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(random() * 10000)::TEXT, 4, '0');

  -- 7. حساب المدة
  v_duration_months := COALESCE(v_opportunity.contract_duration_years, 1) * 12;
  v_end_date := CURRENT_DATE + (v_duration_months || ' months')::INTERVAL;

  -- 8. إنشاء محتوى المسودة
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
    COALESCE(v_request.tree_type, 'غير محدد'),
    COALESCE(v_farm.name, 'المزرعة'),
    COALESCE(v_farm.city, ''),
    v_request.total_amount,
    v_duration_months,
    CEIL(v_duration_months / 12.0),
    CURRENT_DATE,
    v_end_date
  );

  -- 9. إنشاء المسودة
  BEGIN
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
      status,
      issued,
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
      'draft',
      false,
      p_created_by
    )
    RETURNING id INTO v_draft_id;

  EXCEPTION 
    WHEN unique_violation THEN
      RETURN json_build_object(
        'success', false,
        'error', 'رقم المسودة مكرر - حاول مرة أخرى'
      );
    WHEN foreign_key_violation THEN
      RETURN json_build_object(
        'success', false,
        'error', 'خطأ في الربط: الطلب أو المزرعة غير موجودة'
      );
    WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'error', 'فشل إنشاء المسودة: ' || SQLERRM
      );
  END;

  -- 10. إرجاع النتيجة
  RETURN json_build_object(
    'success', true,
    'draft_id', v_draft_id,
    'draft_number', v_draft_number,
    'message', 'تم إنشاء المسودة بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'خطأ غير متوقع: ' || SQLERRM
    );
END;
$$;