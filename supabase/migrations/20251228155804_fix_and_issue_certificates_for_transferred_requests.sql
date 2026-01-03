/*
  # إصلاح وإصدار الشهادات للطلبات المرحلة

  المشكلة: طلبات حالتها transferred_to_operations لكن لم تصدر لهم شهادات
  
  الحل:
  1. إصلاح حقل transferred_to_operations للطلبات المرحلة
  2. إنشاء function لإصدار الشهادات
  3. إصدار الشهادات للطلبات المرحلة
  4. إنشاء trigger تلقائي للمستقبل
*/

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
    -- إرجاع ID الشهادة الموجودة
    SELECT id INTO new_cert_id FROM b2f_certificates WHERE reservation_id = request_id_param LIMIT 1;
    RETURN new_cert_id;
  END IF;

  -- توليد رقم شهادة فريد
  new_cert_number := 'CERT-B2F-' ||
                     TO_CHAR(NOW(), 'YYYY') || '-' ||
                     LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');

  -- التحقق من عدم تكرار الرقم
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
    reservation_id,
    certificate_number,
    investor_name,
    investor_phone,
    investor_id,
    farm_name,
    opportunity_title,
    tree_type,
    tree_count,
    total_amount,
    contract_duration_years,
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
    request_record.user_id,
    farm_name_var,
    opportunity_title_var,
    tree_type_var,
    request_record.number_of_trees,
    request_record.total_amount,
    contract_duration,
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

  RETURN new_cert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تصحيح حقل transferred_to_operations للطلبات المرحلة
UPDATE b2f_investment_requests
SET transferred_to_operations = true,
    transferred_to_operations_at = COALESCE(transferred_to_operations_at, updated_at, created_at)
WHERE status = 'transferred_to_operations'
  AND (transferred_to_operations IS NULL OR transferred_to_operations = false);

-- إصدار الشهادات للطلبات المرحلة للتشغيل
DO $$
DECLARE
  request_record RECORD;
  cert_id UUID;
  total_count INTEGER := 0;
  success_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting certificate issuance for transferred requests...';

  FOR request_record IN
    SELECT id, investor_name, investor_phone, number_of_trees
    FROM b2f_investment_requests
    WHERE (status = 'transferred_to_operations' OR transferred_to_operations = true)
      AND (certificate_issued IS NULL OR certificate_issued = false)
    ORDER BY created_at
  LOOP
    BEGIN
      total_count := total_count + 1;
      
      RAISE NOTICE 'Processing request % for %...', request_record.id, request_record.investor_name;

      -- إصدار الشهادة
      cert_id := issue_certificate_for_b2f_request(request_record.id);

      IF cert_id IS NOT NULL THEN
        success_count := success_count + 1;
        RAISE NOTICE 'Certificate issued successfully: %', cert_id;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error for request %: %', request_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Certificate issuance complete: % successful out of % requests', success_count, total_count;
END $$;

-- إنشاء Trigger للإصدار التلقائي عند الترحيل
CREATE OR REPLACE FUNCTION auto_issue_certificate_on_transfer_to_operations()
RETURNS TRIGGER AS $$
DECLARE
  cert_id UUID;
BEGIN
  -- إصدار الشهادة عند الترحيل للتشغيل
  IF (NEW.status = 'transferred_to_operations' AND (OLD.status IS NULL OR OLD.status != 'transferred_to_operations'))
     OR (NEW.transferred_to_operations = true AND (OLD.transferred_to_operations IS NULL OR OLD.transferred_to_operations = false))
     OR (NEW.contract_issued = true AND (OLD.contract_issued IS NULL OR OLD.contract_issued = false)) THEN
    
    -- التحقق من عدم وجود شهادة
    IF NEW.certificate_issued IS NULL OR NEW.certificate_issued = false THEN
      BEGIN
        cert_id := issue_certificate_for_b2f_request(NEW.id);
        
        IF cert_id IS NOT NULL THEN
          NEW.certificate_issued := true;
          NEW.certificate_issued_at := now();
          RAISE NOTICE 'Certificate auto-issued: %', cert_id;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error auto-issuing certificate: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء/تحديث Trigger
DROP TRIGGER IF EXISTS trigger_auto_issue_certificate_on_transfer ON b2f_investment_requests;
CREATE TRIGGER trigger_auto_issue_certificate_on_transfer
  BEFORE UPDATE ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_issue_certificate_on_transfer_to_operations();

-- Function للتحقق وإصدار الشهادات المفقودة (للاستخدام اليدوي)
CREATE OR REPLACE FUNCTION issue_all_missing_certificates()
RETURNS TABLE(
  request_id UUID,
  investor_name TEXT,
  certificate_number TEXT,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  request_record RECORD;
  cert_id UUID;
  cert_num TEXT;
BEGIN
  FOR request_record IN
    SELECT id, investor_name as inv_name
    FROM b2f_investment_requests
    WHERE (status = 'transferred_to_operations' OR transferred_to_operations = true)
      AND (certificate_issued IS NULL OR certificate_issued = false)
  LOOP
    BEGIN
      cert_id := issue_certificate_for_b2f_request(request_record.id);
      
      SELECT certificate_number INTO cert_num 
      FROM b2f_certificates 
      WHERE id = cert_id;

      request_id := request_record.id;
      investor_name := request_record.inv_name;
      certificate_number := cert_num;
      success := true;
      error_message := NULL;

      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      request_id := request_record.id;
      investor_name := request_record.inv_name;
      certificate_number := NULL;
      success := false;
      error_message := SQLERRM;

      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION issue_certificate_for_b2f_request(UUID) IS 'إصدار شهادة استثمار لطلب محدد';
COMMENT ON FUNCTION auto_issue_certificate_on_transfer_to_operations() IS 'Trigger لإصدار الشهادة تلقائياً عند الترحيل للتشغيل';
COMMENT ON FUNCTION issue_all_missing_certificates() IS 'إصدار جميع الشهادات المفقودة للطلبات المرحلة';
