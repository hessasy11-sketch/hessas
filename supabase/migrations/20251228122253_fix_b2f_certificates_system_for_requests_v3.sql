/*
  # إصلاح نظام الشهادات ليعمل مع b2f_investment_requests
  
  ## المشكلة
  - جدول b2f_certificates يرجع لـ investment_reservations (جدول قديم)
  - الـ trigger يشتغل على investment_reservations
  - لا يوجد trigger على b2f_investment_requests
  
  ## الحل
  1. إنشاء جدول b2f_certificates جديد يرجع لـ b2f_investment_requests
  2. إنشاء trigger على b2f_investment_requests
  3. إصدار الشهادات تلقائياً عند contract_issued
*/

-- إنشاء جدول الشهادات إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS b2f_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES b2f_investment_requests(id) ON DELETE CASCADE,
  
  -- معلومات الشهادة
  certificate_number TEXT UNIQUE NOT NULL,
  investor_name TEXT NOT NULL,
  investor_phone TEXT NOT NULL,
  investor_email TEXT,
  
  -- معلومات الاستثمار
  farm_name TEXT NOT NULL,
  opportunity_title TEXT NOT NULL,
  tree_type TEXT NOT NULL,
  tree_count INTEGER NOT NULL,
  contract_number TEXT,
  
  -- المعلومات المالية
  total_amount DECIMAL(10,2) NOT NULL,
  contract_duration_months INTEGER NOT NULL DEFAULT 12,
  
  -- التواريخ
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  
  -- الملفات
  pdf_url TEXT,
  qr_code_data TEXT,
  
  -- الحالة
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
  
  -- ملاحظات
  notes TEXT,
  admin_notes TEXT,
  
  -- التوقيتات
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- فهرس
CREATE INDEX IF NOT EXISTS idx_b2f_certificates_request_id 
ON b2f_certificates(request_id);

CREATE INDEX IF NOT EXISTS idx_b2f_certificates_phone 
ON b2f_certificates(investor_phone);

-- RLS
ALTER TABLE b2f_certificates ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للمستثمرين
DROP POLICY IF EXISTS "investors_read_own_certificates" ON b2f_certificates;
CREATE POLICY "investors_read_own_certificates"
ON b2f_certificates FOR SELECT
TO anon, authenticated
USING (
  investor_phone = current_setting('request.jwt.claims', true)::json->>'phone'
  OR investor_phone IN (
    SELECT phone_number FROM profiles WHERE id = auth.uid()
  )
);

-- سياسة الإدراج للنظام
DROP POLICY IF EXISTS "system_insert_certificates" ON b2f_certificates;
CREATE POLICY "system_insert_certificates"
ON b2f_certificates FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- سياسة التحديث للإدارة
DROP POLICY IF EXISTS "admin_update_certificates" ON b2f_certificates;
CREATE POLICY "admin_update_certificates"
ON b2f_certificates FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND user_type = 'admin'
  )
);

-- Function لإصدار الشهادة تلقائياً
CREATE OR REPLACE FUNCTION auto_issue_b2f_certificate()
RETURNS TRIGGER AS $$
DECLARE
  new_cert_number TEXT;
  farm_name_var TEXT;
  opportunity_title_var TEXT;
  end_date_var DATE;
BEGIN
  -- فقط عند تغيير contract_issued إلى true
  IF NEW.contract_issued = true 
     AND (OLD.contract_issued IS NULL OR OLD.contract_issued = false)
     AND NEW.certificate_issued = false THEN
    
    -- توليد رقم شهادة فريد
    new_cert_number := 'CERT-B2F-' || 
                       EXTRACT(YEAR FROM NOW())::TEXT || '-' || 
                       LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    
    -- التحقق من عدم تكرار الرقم
    WHILE EXISTS (SELECT 1 FROM b2f_certificates WHERE certificate_number = new_cert_number) LOOP
      new_cert_number := 'CERT-B2F-' || 
                         EXTRACT(YEAR FROM NOW())::TEXT || '-' || 
                         LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    END LOOP;
    
    -- الحصول على بيانات الفرصة والمزرعة
    SELECT 
      COALESCE(f.name, 'غير محدد'),
      COALESCE(o.title, 'فرصة استثمارية')
    INTO 
      farm_name_var,
      opportunity_title_var
    FROM b2f_opportunities o
    LEFT JOIN b2f_farms f ON f.id = o.farm_id
    WHERE o.id = NEW.opportunity_id;
    
    -- حساب تاريخ الانتهاء
    end_date_var := CURRENT_DATE + (NEW.contract_duration_months || ' months')::INTERVAL;
    
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
      NEW.id,
      new_cert_number,
      NEW.investor_name,
      NEW.investor_phone,
      NEW.investor_email,
      COALESCE(farm_name_var, 'غير محدد'),
      COALESCE(opportunity_title_var, 'فرصة استثمارية'),
      NEW.tree_type,
      NEW.number_of_trees,
      NEW.contract_number,
      NEW.total_amount,
      NEW.contract_duration_months,
      CURRENT_DATE,
      CURRENT_DATE,
      end_date_var,
      json_build_object(
        'certNumber', new_cert_number,
        'issueDate', CURRENT_DATE::TEXT,
        'investorName', NEW.investor_name,
        'farmName', COALESCE(farm_name_var, 'غير محدد'),
        'treeCount', NEW.number_of_trees,
        'verifyUrl', 'https://b2f.sa/verify/' || new_cert_number
      )::TEXT,
      true,
      'active'
    );
    
    -- تحديث الطلب
    NEW.certificate_issued := true;
    NEW.certificate_issued_at := now();
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء Trigger
DROP TRIGGER IF EXISTS trigger_auto_issue_b2f_certificate ON b2f_investment_requests;
CREATE TRIGGER trigger_auto_issue_b2f_certificate
  BEFORE UPDATE ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_issue_b2f_certificate();

COMMENT ON FUNCTION auto_issue_b2f_certificate() IS 'إصدار شهادة استثمار تلقائياً عند إصدار العقد في نظام B2F';
COMMENT ON TABLE b2f_certificates IS 'شهادات الاستثمار في نظام B2F - مرتبطة بـ b2f_investment_requests';
