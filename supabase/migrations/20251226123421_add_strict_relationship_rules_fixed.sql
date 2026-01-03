/*
  # قواعد الارتباط الصارمة - قسم استثمار المزارع (مصححة)
  
  ## 📋 القواعد الأساسية (Business Rules)
  
  ### القاعدة 1: العرض الاستثماري يحتاج مزرعة ✅
  ### القاعدة 2: العقد ينشأ من طلب معتمد فقط ✅
  ### القاعدة 3: الشهادة تصدر بعد تفعيل العقد واعتماد الإيصال ✅
  ### القاعدة 4: كل طلب معتمد ينتج عقد واحد فقط ✅
*/

-- ================================================
-- 1️⃣ تحديث جدول investor_intent_requests
-- ================================================

-- إزالة الـ constraint القديم
ALTER TABLE investor_intent_requests 
  DROP CONSTRAINT IF EXISTS investor_intent_requests_status_check;

-- تحديث البيانات الموجودة
UPDATE investor_intent_requests
SET status = 'pending'
WHERE status NOT IN ('pending', 'contacted', 'completed', 'cancelled', 'approved');

-- إضافة constraint جديد
ALTER TABLE investor_intent_requests 
  ADD CONSTRAINT investor_intent_requests_status_check 
  CHECK (status IN ('pending', 'contacted', 'approved', 'completed', 'cancelled'));

-- إضافة حقول جديدة
ALTER TABLE investor_intent_requests
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS contract_created boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES b2f_contracts(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investor_intent_requests_approved 
  ON investor_intent_requests(status) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_investor_intent_requests_contract_created 
  ON investor_intent_requests(contract_created);

-- ================================================
-- 2️⃣ دالة التحقق من إمكانية إنشاء عقد
-- ================================================

CREATE OR REPLACE FUNCTION can_create_contract_from_request(request_id uuid)
RETURNS boolean AS $$
DECLARE
  request_record RECORD;
BEGIN
  SELECT status, contract_created
  INTO request_record
  FROM investor_intent_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب الاستثمار غير موجود';
  END IF;
  
  IF request_record.status != 'approved' THEN
    RAISE EXCEPTION 'لا يمكن إنشاء عقد من طلب غير معتمد. الحالة: %', request_record.status;
  END IF;
  
  IF request_record.contract_created = true THEN
    RAISE EXCEPTION 'تم إنشاء عقد من هذا الطلب مسبقاً';
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 3️⃣ Trigger للتحقق عند إنشاء عقد
-- ================================================

CREATE OR REPLACE FUNCTION validate_contract_creation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.intent_request_id IS NULL THEN
    RAISE EXCEPTION 'يجب ربط العقد بطلب استثمار معتمد';
  END IF;
  
  PERFORM can_create_contract_from_request(NEW.intent_request_id);
  
  UPDATE investor_intent_requests
  SET 
    contract_created = true,
    contract_id = NEW.id,
    status = 'completed',
    updated_at = now()
  WHERE id = NEW.intent_request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_contract_creation_trigger ON b2f_contracts;
CREATE TRIGGER validate_contract_creation_trigger
  BEFORE INSERT ON b2f_contracts
  FOR EACH ROW
  EXECUTE FUNCTION validate_contract_creation();

-- ================================================
-- 4️⃣ دالة التحقق من إمكانية إصدار شهادة
-- ================================================

CREATE OR REPLACE FUNCTION can_issue_certificate_for_contract(contract_id_param uuid)
RETURNS boolean AS $$
DECLARE
  contract_record RECORD;
  receipt_record RECORD;
BEGIN
  SELECT contract_status, id
  INTO contract_record
  FROM b2f_contracts
  WHERE id = contract_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'العقد غير موجود';
  END IF;
  
  IF contract_record.contract_status != 'active' THEN
    RAISE EXCEPTION 'لا يمكن إصدار شهادة لعقد غير نشط. الحالة: %', contract_record.contract_status;
  END IF;
  
  SELECT review_status
  INTO receipt_record
  FROM b2f_payment_receipts
  WHERE contract_id = contract_id_param
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لا يوجد إيصال دفع مرفوع لهذا العقد';
  END IF;
  
  IF receipt_record.review_status != 'approved' THEN
    RAISE EXCEPTION 'يجب اعتماد إيصال الدفع قبل إصدار الشهادة. الحالة: %', receipt_record.review_status;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5️⃣ Trigger للتحقق عند إصدار شهادة
-- ================================================

CREATE OR REPLACE FUNCTION validate_certificate_issuance()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM can_issue_certificate_for_contract(NEW.contract_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_certificate_issuance_trigger ON investment_certificates;
CREATE TRIGGER validate_certificate_issuance_trigger
  BEFORE INSERT ON investment_certificates
  FOR EACH ROW
  EXECUTE FUNCTION validate_certificate_issuance();

-- ================================================
-- 6️⃣ دالة للتحقق من العروض
-- ================================================

CREATE OR REPLACE FUNCTION validate_opportunity_creation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.farm_id IS NULL THEN
    RAISE EXCEPTION 'يجب ربط العرض الاستثماري بمزرعة';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM farms WHERE id = NEW.farm_id AND is_active = true) THEN
    RAISE EXCEPTION 'المزرعة غير موجودة أو غير نشطة';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_opportunity_creation_trigger ON investment_opportunities;
CREATE TRIGGER validate_opportunity_creation_trigger
  BEFORE INSERT OR UPDATE ON investment_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION validate_opportunity_creation();

-- ================================================
-- 7️⃣ Views لعرض البيانات
-- ================================================

CREATE OR REPLACE VIEW requests_ready_for_contract AS
SELECT 
  iir.*,
  io.title as opportunity_title,
  io.price_per_tree,
  f.name as farm_name
FROM investor_intent_requests iir
LEFT JOIN investment_opportunities io ON iir.opportunity_id = io.id
LEFT JOIN farms f ON io.farm_id = f.id
WHERE 
  iir.status = 'approved' 
  AND COALESCE(iir.contract_created, false) = false;

CREATE OR REPLACE VIEW contracts_ready_for_certificate AS
SELECT 
  c.*,
  pr.review_status as receipt_status,
  pr.admin_reviewed_at as receipt_verified_at,
  CASE 
    WHEN c.contract_status = 'active' 
      AND pr.review_status = 'approved'
      AND NOT EXISTS (SELECT 1 FROM investment_certificates WHERE contract_id = c.id)
    THEN true
    ELSE false
  END as can_issue_certificate
FROM b2f_contracts c
LEFT JOIN b2f_payment_receipts pr ON c.id = pr.contract_id
WHERE c.contract_status = 'active';

CREATE OR REPLACE VIEW b2f_workflow_tracking AS
SELECT 
  iir.id as request_id,
  iir.contact_name,
  iir.contact_phone,
  iir.status as request_status,
  iir.created_at as request_date,
  iir.approved_at,
  c.id as contract_id,
  c.contract_number,
  c.contract_status,
  c.created_at as contract_date,
  pr.id as receipt_id,
  pr.review_status as payment_status,
  pr.admin_reviewed_at as payment_verified_at,
  cert.id as certificate_id,
  cert.certificate_number,
  cert.status as certificate_status,
  cert.issue_date as certificate_date,
  CASE 
    WHEN iir.status = 'pending' THEN 'في انتظار المراجعة'
    WHEN iir.status = 'contacted' THEN 'تم التواصل'
    WHEN iir.status = 'approved' AND c.id IS NULL THEN 'جاهز لإنشاء عقد'
    WHEN c.contract_status = 'draft' THEN 'العقد قيد الإعداد'
    WHEN c.contract_status = 'sent_to_investor' THEN 'تم إرسال العقد'
    WHEN c.contract_status IN ('payment_pending', 'payment_uploaded') THEN 'في انتظار الدفع'
    WHEN c.contract_status = 'payment_verified' THEN 'تم التحقق من الدفع'
    WHEN c.contract_status = 'active' AND cert.id IS NULL THEN 'جاهز لإصدار شهادة'
    WHEN c.contract_status = 'active' AND cert.id IS NOT NULL THEN 'مكتمل - شهادة صادرة'
    WHEN iir.status = 'cancelled' THEN 'ملغي'
    ELSE 'غير محدد'
  END as workflow_stage
FROM investor_intent_requests iir
LEFT JOIN b2f_contracts c ON iir.contract_id = c.id
LEFT JOIN b2f_payment_receipts pr ON c.id = pr.contract_id
LEFT JOIN investment_certificates cert ON c.id = cert.contract_id
ORDER BY iir.created_at DESC;

-- ================================================
-- 8️⃣ وظائف مساعدة للإدارة
-- ================================================

CREATE OR REPLACE FUNCTION approve_investment_request(request_id uuid, admin_id uuid)
RETURNS jsonb AS $$
DECLARE
  updated_request RECORD;
BEGIN
  UPDATE investor_intent_requests
  SET 
    status = 'approved',
    approved_at = now(),
    approved_by = admin_id,
    updated_at = now()
  WHERE id = request_id
  RETURNING * INTO updated_request;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب الاستثمار غير موجود';
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم اعتماد طلب الاستثمار بنجاح',
    'request', row_to_json(updated_request)
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION activate_contract_after_payment(contract_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  receipt_status text;
  updated_contract RECORD;
BEGIN
  SELECT review_status INTO receipt_status
  FROM b2f_payment_receipts
  WHERE contract_id = contract_id_param
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF receipt_status IS NULL THEN
    RAISE EXCEPTION 'لا يوجد إيصال دفع لهذا العقد';
  END IF;
  
  IF receipt_status != 'approved' THEN
    RAISE EXCEPTION 'يجب اعتماد إيصال الدفع أولاً';
  END IF;
  
  UPDATE b2f_contracts
  SET 
    contract_status = 'active',
    contract_start_date = COALESCE(contract_start_date, now()),
    contract_end_date = COALESCE(
      contract_end_date, 
      now() + (contract_duration_years || ' years')::interval
    ),
    updated_at = now()
  WHERE id = contract_id_param
  RETURNING * INTO updated_contract;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تفعيل العقد بنجاح',
    'contract', row_to_json(updated_contract)
  );
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 9️⃣ Indexes
-- ================================================

CREATE INDEX IF NOT EXISTS idx_contracts_intent_request ON b2f_contracts(intent_request_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON b2f_contracts(contract_status);
CREATE INDEX IF NOT EXISTS idx_certificates_contract ON investment_certificates(contract_id);
CREATE INDEX IF NOT EXISTS idx_receipts_contract ON b2f_payment_receipts(contract_id);
CREATE INDEX IF NOT EXISTS idx_receipts_review_status ON b2f_payment_receipts(review_status);

-- ================================================
-- 🔟 RLS Permissions
-- ================================================

GRANT SELECT ON requests_ready_for_contract TO authenticated;
GRANT SELECT ON contracts_ready_for_certificate TO authenticated;
GRANT SELECT ON b2f_workflow_tracking TO authenticated;

-- ================================================
-- 🎯 التعليقات
-- ================================================

COMMENT ON FUNCTION can_create_contract_from_request IS '🔒 منع إنشاء عقد من طلب غير معتمد';
COMMENT ON FUNCTION can_issue_certificate_for_contract IS '🔒 منع إصدار شهادة لعقد غير نشط أو بدون إيصال معتمد';
COMMENT ON FUNCTION validate_opportunity_creation IS '🔒 منع إنشاء عرض بدون مزرعة نشطة';
COMMENT ON VIEW requests_ready_for_contract IS '✅ الطلبات الجاهزة لإنشاء عقد';
COMMENT ON VIEW contracts_ready_for_certificate IS '✅ العقود الجاهزة لإصدار شهادة';
COMMENT ON VIEW b2f_workflow_tracking IS '📊 تتبع مسار العمل الكامل';
