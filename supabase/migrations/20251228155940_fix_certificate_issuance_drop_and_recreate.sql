/*
  # إصلاح إصدار الشهادات - حذف وإعادة إنشاء

  1. حذف الـ functions القديمة
  2. إعادة إنشائها بالشكل الصحيح باستخدام request_id
  3. إصدار الشهادات المفقودة
*/

-- حذف الـ functions القديمة
DROP FUNCTION IF EXISTS issue_all_missing_certificates();
DROP FUNCTION IF EXISTS issue_certificate_for_b2f_request(UUID);

-- Function لإصدار شهادة لطلب محدد
CREATE OR REPLACE FUNCTION issue_certificate_for_b2f_request(request_id_param UUID)
RETURNS UUID AS $$
DECLARE
  new_cert_number TEXT;
  new_cert_id UUID;
  contract_duration INTEGER;
  issue_date DATE;
  end_date DATE;
  qr_data TEXT;
  farm_name_var TEXT;
  opportunity_title_var TEXT;
  tree_type_var TEXT;
  request_record RECORD;
BEGIN
  -- الحصول على بيانات الطلب
  SELECT
    ir.*,
    o.title as opp_title,
    o.tree_type as opp_tree_type,
    COALESCE(o.contract_duration_years, ir.contract_duration_months / 12) as contract_years,
    f.name as farm_name_full
  INTO request_record
  FROM b2f_investment_requests ir
  LEFT JOIN b2f_opportunities o ON o.id = ir.opportunity_id
  LEFT JOIN b2f_farms f ON f.id = ir.farm_id
  WHERE ir.id = request_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found: %', request_id_param;
  END IF;

  -- التحقق من عدم وجود شهادة بالفعل
  IF request_record.certificate_issued = true THEN
    SELECT id INTO new_cert_id FROM b2f_certificates WHERE request_id = request_id_param LIMIT 1;
    IF new_cert_id IS NOT NULL THEN
      RETURN new_cert_id;
    END IF;
  END IF;

  -- توليد رقم شهادة فريد
  new_cert_number := 'CERT-B2F-' ||
                     TO_CHAR(NOW(), 'YYYY') || '-' ||
                     LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');

  WHILE EXISTS (SELECT 1 FROM b2f_certificates WHERE certificate_number = new_cert_number) LOOP
    new_cert_number := 'CERT-B2F-' ||
                       TO_CHAR(NOW(), 'YYYY') || '-' ||
                       LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END LOOP;

  -- تعيين القيم
  contract_duration := COALESCE(request_record.contract_years, 10)::INTEGER;
  farm_name_var := COALESCE(request_record.farm_name_full, 'مزرعة غير محددة');
  opportunity_title_var := COALESCE(request_record.opp_title, 'فرصة استثمارية');
  tree_type_var := COALESCE(request_record.opp_tree_type, request_record.tree_type, 'أشجار');

  -- حساب التواريخ
  issue_date := CURRENT_DATE;
  end_date := CURRENT_DATE + (contract_duration || ' years')::INTERVAL;

  -- إنشاء QR Code Data
  qr_data := json_build_object(
    'certNumber', new_cert_number,
    'issueDate', issue_date::TEXT,
    'investorName', request_record.investor_name,
    'investorPhone', request_record.investor_phone,
    'farmName', farm_name_var,
    'treeCount', request_record.number_of_trees,
    'treeType', tree_type_var,
    'contractDuration', contract_duration,
    'verifyUrl', 'https://b2f.com/certificate.html?cert=' || new_cert_number
  )::TEXT;

  -- إدراج الشهادة
  INSERT INTO b2f_certificates (
    request_id,
    certificate_number,
    investor_name,
    investor_phone,
    investor_email,
    farm_name,
    opportunity_title,
    tree_type,
    tree_count,
    contract_number,
    total_amount,
    contract_duration_months,
    issued_date,
    start_date,
    end_date,
    qr_code_data,
    is_active,
    status
  ) VALUES (
    request_record.id,
    new_cert_number,
    request_record.investor_name,
    request_record.investor_phone,
    request_record.investor_email,
    farm_name_var,
    opportunity_title_var,
    tree_type_var,
    request_record.number_of_trees,
    request_record.contract_number,
    request_record.total_amount,
    contract_duration * 12,
    issue_date,
    issue_date,
    end_date,
    qr_data,
    true,
    'active'
  ) RETURNING id INTO new_cert_id;

  -- تحديث الطلب
  UPDATE b2f_investment_requests
  SET
    certificate_issued = true,
    certificate_issued_at = now()
  WHERE id = request_id_param;

  RAISE NOTICE 'Certificate issued: % for request %', new_cert_number, request_id_param;
  
  RETURN new_cert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إصدار الشهادات المفقودة الآن
DO $$
DECLARE
  request_rec RECORD;
  cert_id UUID;
  total_issued INTEGER := 0;
  total_failed INTEGER := 0;
BEGIN
  RAISE NOTICE '=== بدء إصدار الشهادات المفقودة ===';
  
  FOR request_rec IN
    SELECT id, investor_name, investor_phone, number_of_trees
    FROM b2f_investment_requests
    WHERE (status = 'transferred_to_operations' OR transferred_to_operations = true)
      AND (certificate_issued IS NULL OR certificate_issued = false)
    ORDER BY created_at
  LOOP
    BEGIN
      RAISE NOTICE 'معالجة طلب: % - %', request_rec.investor_name, request_rec.investor_phone;
      
      cert_id := issue_certificate_for_b2f_request(request_rec.id);
      
      IF cert_id IS NOT NULL THEN
        total_issued := total_issued + 1;
        RAISE NOTICE '✓ تم إصدار الشهادة بنجاح';
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      total_failed := total_failed + 1;
      RAISE NOTICE '✗ خطأ: %', SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '=== انتهى إصدار الشهادات ===';
  RAISE NOTICE 'النجاح: % | الفشل: %', total_issued, total_failed;
END $$;

COMMENT ON FUNCTION issue_certificate_for_b2f_request(UUID) IS 'إصدار شهادة استثمار لطلب B2F محدد';
