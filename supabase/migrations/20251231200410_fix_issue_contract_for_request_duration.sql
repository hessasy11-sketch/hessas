/*
  # إصلاح دالة إصدار العقد - إزالة duration_years غير الموجود
  
  المشكلة: الدالة تحاول جلب duration_years من b2f_opportunities لكن الحقل غير موجود
  
  الحل: استخدام مدة افتراضية 5 سنوات
*/

DROP FUNCTION IF EXISTS issue_contract_for_request(UUID);
DROP FUNCTION IF EXISTS issue_multiple_contracts(UUID[]);
DROP FUNCTION IF EXISTS generate_contract_number();

-- دالة لتوليد رقم عقد فريد
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_part TEXT;
  next_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(contract_number FROM '\d+$') AS INTEGER
    )
  ), 0) + 1
  INTO next_num
  FROM b2f_contracts
  WHERE contract_number LIKE 'B2F-' || year_part || '-%';
  
  sequence_part := LPAD(next_num::TEXT, 6, '0');
  
  RETURN 'B2F-' || year_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql;

-- دالة لإصدار عقد واحد
CREATE OR REPLACE FUNCTION issue_contract_for_request(request_id UUID)
RETURNS JSON AS $$
DECLARE
  request_record RECORD;
  new_contract_id UUID;
  contract_num TEXT;
  result JSON;
BEGIN
  -- جلب بيانات الطلب
  SELECT 
    sr.*,
    op.id as opp_id,
    op.farm_id as opp_farm_id
  INTO request_record
  FROM b2f_sales_requests sr
  LEFT JOIN b2f_opportunities op ON sr.opportunity_id = op.id
  WHERE sr.id = request_id
    AND sr.ready_for_contract = true
    AND sr.contract_id IS NULL;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'الطلب غير موجود أو غير جاهز لإصدار عقد'
    );
  END IF;
  
  -- توليد رقم العقد
  contract_num := generate_contract_number();
  
  -- إنشاء العقد (مدة افتراضية 5 سنوات)
  INSERT INTO b2f_contracts (
    contract_number,
    sales_request_id,
    investor_id,
    investor_phone,
    farm_id,
    opportunity_id,
    trees_count,
    amount_total,
    contract_type,
    start_date,
    end_date,
    status,
    operation_status
  ) VALUES (
    contract_num,
    request_record.id,
    request_record.investor_account_id,
    request_record.investor_phone,
    request_record.opp_farm_id,
    request_record.opp_id,
    request_record.number_of_trees,
    request_record.total_amount,
    'investment',
    NOW(),
    NOW() + INTERVAL '5 years',
    'active',
    'pending_start'
  )
  RETURNING id INTO new_contract_id;
  
  -- تحديث الطلب
  UPDATE b2f_sales_requests
  SET 
    status = 'contract_issued',
    contract_id = new_contract_id,
    contract_issued = true,
    contract_issued_at = NOW(),
    ready_for_operations = true,
    updated_at = NOW()
  WHERE id = request_id;
  
  -- إنشاء أمر تشغيل (إذا كان الجدول موجوداً)
  BEGIN
    INSERT INTO b2f_operations_orders (
      contract_id,
      farm_id,
      investor_phone,
      status,
      created_at
    ) VALUES (
      new_contract_id,
      request_record.opp_farm_id,
      request_record.investor_phone,
      'pending_start',
      NOW()
    );
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  
  result := json_build_object(
    'success', true,
    'contract_id', new_contract_id,
    'contract_number', contract_num
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- دالة لإصدار عقود متعددة
CREATE OR REPLACE FUNCTION issue_multiple_contracts(request_ids UUID[])
RETURNS JSON[] AS $$
DECLARE
  request_id UUID;
  results JSON[] := '{}';
  single_result JSON;
BEGIN
  FOREACH request_id IN ARRAY request_ids
  LOOP
    single_result := issue_contract_for_request(request_id);
    results := array_append(results, single_result);
  END LOOP;
  
  RETURN results;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION generate_contract_number TO anon, authenticated;
GRANT EXECUTE ON FUNCTION issue_contract_for_request TO anon, authenticated;
GRANT EXECUTE ON FUNCTION issue_multiple_contracts TO anon, authenticated;

COMMENT ON FUNCTION generate_contract_number() IS 'توليد رقم عقد فريد بصيغة B2F-YYYY-XXXXXX';
COMMENT ON FUNCTION issue_contract_for_request(UUID) IS 'إصدار عقد لطلب واحد معتمد من المالية';
COMMENT ON FUNCTION issue_multiple_contracts(UUID[]) IS 'إصدار عقود متعددة دفعة واحدة';
