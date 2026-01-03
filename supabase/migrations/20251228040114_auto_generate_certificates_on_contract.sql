/*
  # Trigger لإصدار الشهادات تلقائياً بعد إصدار العقد
  
  عند تحديث حالة الحجز إلى contract_issued، يتم:
  1. إصدار شهادة استثمار تلقائياً
  2. ربط الشهادة بالحجز
  3. تحديث حقول الشهادة في الحجز
*/

CREATE OR REPLACE FUNCTION auto_generate_certificate_on_contract()
RETURNS TRIGGER AS $$
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
BEGIN
  -- فقط عند تغيير الحالة إلى contract_issued
  IF NEW.contract_issued = true 
     AND (OLD.contract_issued IS NULL OR OLD.contract_issued = false)
     AND NEW.certificate_issued = false THEN
    
    -- توليد رقم شهادة فريد
    new_cert_number := 'CERT-' || 
                       EXTRACT(YEAR FROM NOW())::TEXT || '-' || 
                       LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    
    -- التحقق من عدم تكرار الرقم
    WHILE EXISTS (SELECT 1 FROM b2f_certificates WHERE certificate_number = new_cert_number) LOOP
      new_cert_number := 'CERT-' || 
                         EXTRACT(YEAR FROM NOW())::TEXT || '-' || 
                         LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    END LOOP;
    
    -- الحصول على بيانات الفرصة والمزرعة
    SELECT 
      o.title,
      o.tree_type,
      o.contract_duration_years,
      f.name
    INTO 
      opportunity_title_var,
      tree_type_var,
      contract_duration,
      farm_name_var
    FROM b2f_opportunities o
    LEFT JOIN b2f_farms f ON f.id = o.farm_id
    WHERE o.id = NEW.opportunity_id;
    
    -- تعيين القيم الافتراضية إذا كانت null
    contract_duration := COALESCE(contract_duration, 10);
    farm_name_var := COALESCE(farm_name_var, 'غير محدد');
    opportunity_title_var := COALESCE(opportunity_title_var, 'غير محدد');
    tree_type_var := COALESCE(tree_type_var, 'غير محدد');
    
    -- حساب التواريخ
    issue_date := CURRENT_DATE;
    end_date := CURRENT_DATE + (contract_duration || ' years')::INTERVAL;
    
    -- إنشاء QR Code Data
    qr_data := json_build_object(
      'certNumber', new_cert_number,
      'issueDate', issue_date::TEXT,
      'investorName', COALESCE(NEW.investor_name, NEW.customer_name, 'غير محدد'),
      'farmName', farm_name_var,
      'treeCount', NEW.number_of_trees,
      'verifyUrl', 'https://verify.b2f.com/certificate/' || new_cert_number
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
      NEW.id,
      new_cert_number,
      COALESCE(NEW.investor_name, NEW.customer_name, 'غير محدد'),
      NEW.customer_phone,
      NEW.user_id,
      farm_name_var,
      opportunity_title_var,
      tree_type_var,
      NEW.number_of_trees,
      NEW.total_amount,
      contract_duration,
      issue_date,
      issue_date,
      end_date,
      qr_data,
      true,
      'active'
    ) RETURNING id INTO new_cert_id;
    
    -- تحديث الحجز
    NEW.certificate_id := new_cert_id;
    NEW.certificate_number := new_cert_number;
    NEW.certificate_issued := true;
    NEW.certificate_issued_at := now();
    
    -- تسجيل الحدث
    INSERT INTO certificate_issuance_log (
      certificate_id,
      event_type,
      event_details,
      success
    ) VALUES (
      new_cert_id,
      'auto_issued',
      'تم إصدار الشهادة تلقائياً بعد إصدار العقد',
      true
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء/تحديث Trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_certificate ON investment_reservations;
CREATE TRIGGER trigger_auto_generate_certificate
  BEFORE UPDATE ON investment_reservations
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_certificate_on_contract();

COMMENT ON FUNCTION auto_generate_certificate_on_contract() IS 'إصدار شهادة استثمار تلقائياً عند إصدار العقد';
