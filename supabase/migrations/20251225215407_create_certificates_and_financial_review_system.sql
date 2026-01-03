/*
  # المرحلة 11 - نظام إصدار الشهادات والمراجعة المالية الذكي

  ## 📋 نظرة عامة
  نظام متكامل لإصدار شهادات الإيجار تلقائياً بعد اعتماد الإيصال،
  مع مراجعة مالية ذكية وإشعارات تلقائية للمستثمرين.

  ## 🗂️ الجداول الجديدة
  
  ### 1. investment_certificates (شهادات الاستثمار)
  - `id` - معرف الشهادة الفريد
  - `contract_id` - ربط مع العقد
  - `investor_account_id` - ربط مع حساب المستثمر
  - `certificate_number` - رقم الشهادة الفريد
  - `issue_date` - تاريخ الإصدار
  - `expiry_date` - تاريخ انتهاء الصلاحية
  - `qr_code_data` - بيانات QR Code
  - `pdf_url` - رابط ملف PDF
  - `status` - حالة الشهادة (active, expired, cancelled)
  - `verification_code` - كود التحقق

  ### 2. financial_reviews (المراجعات المالية)
  - `id` - معرف المراجعة
  - `contract_id` - ربط مع العقد
  - `receipt_url` - رابط الإيصال
  - `review_status` - حالة المراجعة (pending, approved, rejected, on_hold)
  - `reviewed_by` - معرف المراجع
  - `reviewed_at` - تاريخ المراجعة
  - `amount_paid` - المبلغ المدفوع
  - `amount_expected` - المبلغ المتوقع
  - `payment_date` - تاريخ الدفع
  - `auto_approved` - هل تم الاعتماد تلقائياً

  ### 3. financial_review_notes (ملاحظات المراجعة المالية)
  - `id` - معرف الملاحظة
  - `financial_review_id` - ربط مع المراجعة
  - `note_type` - نوع الملاحظة (issue, clarification, approval)
  - `note_text` - نص الملاحظة
  - `created_by` - من أضاف الملاحظة
  - `requires_action` - هل تتطلب إجراء
  - `resolved` - هل تم حلها

  ## 🔐 الأمان
  - جميع الجداول محمية بـ RLS
  - الإدارة فقط يمكنها إصدار الشهادات
  - المستثمرون يمكنهم قراءة شهاداتهم فقط
  - القسم المالي يمكنه مراجعة الإيصالات

  ## 📝 ملاحظات مهمة
  - الشهادات تُصدر تلقائياً بعد اعتماد الإيصال من الإدارة
  - يتم إرسال الإيصال للقسم المالي للمراجعة النهائية
  - QR Code يحتوي على رقم الشهادة وكود التحقق
  - يمكن للمستثمر التحقق من الشهادة عبر QR Code
*/

-- =====================================================
-- 1️⃣ جدول شهادات الاستثمار
-- =====================================================
CREATE TABLE IF NOT EXISTS investment_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES b2f_contracts(id) ON DELETE CASCADE,
  investor_account_id UUID NOT NULL REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  
  -- معلومات الشهادة
  certificate_number TEXT NOT NULL UNIQUE,
  issue_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date TIMESTAMPTZ NOT NULL,
  
  -- QR Code والتحقق
  qr_code_data TEXT NOT NULL,
  verification_code TEXT NOT NULL UNIQUE,
  
  -- ملف PDF
  pdf_url TEXT,
  pdf_generated BOOLEAN DEFAULT false,
  
  -- الحالة
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
  
  -- بيانات إضافية
  farm_name TEXT,
  tree_count INTEGER,
  lease_duration_years INTEGER,
  total_amount DECIMAL(10, 2),
  
  -- التوقيتات
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2️⃣ جدول المراجعات المالية
-- =====================================================
CREATE TABLE IF NOT EXISTS financial_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES b2f_contracts(id) ON DELETE CASCADE,
  investor_account_id UUID NOT NULL REFERENCES b2f_investor_accounts(id),
  
  -- بيانات الإيصال
  receipt_url TEXT NOT NULL,
  receipt_uploaded_at TIMESTAMPTZ DEFAULT now(),
  
  -- حالة المراجعة
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    review_status IN ('pending', 'under_review', 'approved', 'rejected', 'on_hold', 'requires_clarification')
  ),
  
  -- بيانات المراجع
  reviewed_by UUID REFERENCES b2f_investor_accounts(id),
  reviewed_at TIMESTAMPTZ,
  
  -- المبالغ
  amount_paid DECIMAL(10, 2),
  amount_expected DECIMAL(10, 2),
  amount_difference DECIMAL(10, 2),
  
  -- تاريخ الدفع
  payment_date DATE,
  payment_method TEXT,
  
  -- الاعتماد التلقائي
  auto_approved BOOLEAN DEFAULT false,
  admin_approved BOOLEAN DEFAULT false,
  finance_approved BOOLEAN DEFAULT false,
  
  -- أولوية المراجعة
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- التوقيتات
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3️⃣ جدول ملاحظات المراجعة المالية
-- =====================================================
CREATE TABLE IF NOT EXISTS financial_review_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_review_id UUID NOT NULL REFERENCES financial_reviews(id) ON DELETE CASCADE,
  
  -- نوع الملاحظة
  note_type TEXT NOT NULL CHECK (
    note_type IN ('issue', 'clarification', 'approval', 'rejection', 'general', 'system')
  ),
  
  -- محتوى الملاحظة
  note_text TEXT NOT NULL,
  note_title TEXT,
  
  -- من أضاف الملاحظة
  created_by UUID REFERENCES b2f_investor_accounts(id),
  created_by_name TEXT,
  created_by_role TEXT,
  
  -- إجراءات مطلوبة
  requires_action BOOLEAN DEFAULT false,
  action_required_from TEXT, -- 'investor', 'admin', 'finance'
  
  -- الحالة
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES b2f_investor_accounts(id),
  resolved_at TIMESTAMPTZ,
  
  -- الرؤية
  visible_to_investor BOOLEAN DEFAULT true,
  
  -- التوقيتات
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4️⃣ جدول سجل إصدار الشهادات
-- =====================================================
CREATE TABLE IF NOT EXISTS certificate_issuance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID REFERENCES investment_certificates(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES b2f_contracts(id) ON DELETE CASCADE,
  
  -- نوع الحدث
  event_type TEXT NOT NULL CHECK (
    event_type IN ('issued', 'regenerated', 'cancelled', 'suspended', 'reactivated', 'expired')
  ),
  
  -- التفاصيل
  event_details TEXT,
  triggered_by UUID REFERENCES b2f_investor_accounts(id),
  triggered_by_name TEXT,
  
  -- الحالة
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- التوقيت
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5️⃣ تحديث جدول العقود
-- =====================================================
DO $$
BEGIN
  -- إضافة حقل certificate_issued
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_contracts' AND column_name = 'certificate_issued'
  ) THEN
    ALTER TABLE b2f_contracts ADD COLUMN certificate_issued BOOLEAN DEFAULT false;
  END IF;
  
  -- إضافة حقل certificate_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_contracts' AND column_name = 'certificate_id'
  ) THEN
    ALTER TABLE b2f_contracts ADD COLUMN certificate_id UUID REFERENCES investment_certificates(id);
  END IF;
  
  -- إضافة حقل financial_review_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_contracts' AND column_name = 'financial_review_status'
  ) THEN
    ALTER TABLE b2f_contracts ADD COLUMN financial_review_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- =====================================================
-- 6️⃣ الفهارس لتحسين الأداء
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_certificates_contract ON investment_certificates(contract_id);
CREATE INDEX IF NOT EXISTS idx_certificates_investor ON investment_certificates(investor_account_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON investment_certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_verification ON investment_certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON investment_certificates(status);

CREATE INDEX IF NOT EXISTS idx_financial_reviews_contract ON financial_reviews(contract_id);
CREATE INDEX IF NOT EXISTS idx_financial_reviews_investor ON financial_reviews(investor_account_id);
CREATE INDEX IF NOT EXISTS idx_financial_reviews_status ON financial_reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_financial_reviews_priority ON financial_reviews(priority);

CREATE INDEX IF NOT EXISTS idx_review_notes_review ON financial_review_notes(financial_review_id);
CREATE INDEX IF NOT EXISTS idx_review_notes_resolved ON financial_review_notes(resolved);

-- =====================================================
-- 7️⃣ دالة توليد رقم الشهادة
-- =====================================================
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
  year_code TEXT;
  sequence_num INTEGER;
  cert_number TEXT;
BEGIN
  -- رمز السنة (آخر رقمين)
  year_code := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- العد التسلسلي لهذا العام
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM investment_certificates
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- تنسيق الرقم: B2F-YY-NNNN
  cert_number := 'B2F-' || year_code || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN cert_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8️⃣ دالة توليد كود التحقق
-- =====================================================
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
DECLARE
  characters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(characters, floor(random() * length(characters) + 1)::int, 1);
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9️⃣ دالة حساب فرق المبلغ
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_amount_difference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount_paid IS NOT NULL AND NEW.amount_expected IS NOT NULL THEN
    NEW.amount_difference := NEW.amount_paid - NEW.amount_expected;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_amount_difference
  BEFORE INSERT OR UPDATE ON financial_reviews
  FOR EACH ROW
  EXECUTE FUNCTION calculate_amount_difference();

-- =====================================================
-- 🔟 دالة تحديث حالة العقد عند إصدار الشهادة
-- =====================================================
CREATE OR REPLACE FUNCTION update_contract_on_certificate_issue()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE b2f_contracts
    SET 
      certificate_issued = true,
      certificate_id = NEW.id,
      updated_at = now()
    WHERE id = NEW.contract_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contract_certificate
  AFTER INSERT ON investment_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_on_certificate_issue();

-- =====================================================
-- 1️⃣1️⃣ سياسات RLS - investment_certificates
-- =====================================================
ALTER TABLE investment_certificates ENABLE ROW LEVEL SECURITY;

-- المستثمرون: قراءة شهاداتهم فقط
CREATE POLICY "Investors can view own certificates"
  ON investment_certificates FOR SELECT
  TO authenticated
  USING (
    investor_account_id IN (
      SELECT id FROM b2f_investor_accounts
      WHERE contact_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );

-- الإدارة: كل الصلاحيات
CREATE POLICY "Admins full access to certificates"
  ON investment_certificates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_investor_accounts
      WHERE contact_phone = current_setting('request.jwt.claims', true)::json->>'phone'
      AND contact_phone = '+966500000000'
    )
  );

-- القراءة العامة للتحقق من الشهادات
CREATE POLICY "Anyone can verify certificates"
  ON investment_certificates FOR SELECT
  TO anon
  USING (status = 'active');

-- =====================================================
-- 1️⃣2️⃣ سياسات RLS - financial_reviews
-- =====================================================
ALTER TABLE financial_reviews ENABLE ROW LEVEL SECURITY;

-- المستثمرون: قراءة مراجعاتهم فقط
CREATE POLICY "Investors can view own reviews"
  ON financial_reviews FOR SELECT
  TO authenticated
  USING (
    investor_account_id IN (
      SELECT id FROM b2f_investor_accounts
      WHERE contact_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );

-- الإدارة والقسم المالي: كل الصلاحيات
CREATE POLICY "Admins and finance full access to reviews"
  ON financial_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_investor_accounts
      WHERE contact_phone = current_setting('request.jwt.claims', true)::json->>'phone'
      AND contact_phone IN ('+966500000000', '+966500000001')
    )
  );

-- =====================================================
-- 1️⃣3️⃣ سياسات RLS - financial_review_notes
-- =====================================================
ALTER TABLE financial_review_notes ENABLE ROW LEVEL SECURITY;

-- المستثمرون: قراءة الملاحظات المرئية لهم
CREATE POLICY "Investors can view visible notes"
  ON financial_review_notes FOR SELECT
  TO authenticated
  USING (
    visible_to_investor = true
    AND EXISTS (
      SELECT 1 FROM financial_reviews fr
      WHERE fr.id = financial_review_notes.financial_review_id
      AND fr.investor_account_id IN (
        SELECT id FROM b2f_investor_accounts
        WHERE contact_phone = current_setting('request.jwt.claims', true)::json->>'phone'
      )
    )
  );

-- الإدارة والمالية: كل الصلاحيات
CREATE POLICY "Admins and finance full access to notes"
  ON financial_review_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_investor_accounts
      WHERE contact_phone = current_setting('request.jwt.claims', true)::json->>'phone'
      AND contact_phone IN ('+966500000000', '+966500000001')
    )
  );

-- =====================================================
-- 1️⃣4️⃣ سياسات RLS - certificate_issuance_log
-- =====================================================
ALTER TABLE certificate_issuance_log ENABLE ROW LEVEL SECURITY;

-- الإدارة فقط: قراءة السجلات
CREATE POLICY "Admins can view certificate logs"
  ON certificate_issuance_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_investor_accounts
      WHERE contact_phone = current_setting('request.jwt.claims', true)::json->>'phone'
      AND contact_phone = '+966500000000'
    )
  );

-- النظام: إدراج السجلات
CREATE POLICY "System can insert certificate logs"
  ON certificate_issuance_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 1️⃣5️⃣ تحديث أنواع الإشعارات
-- =====================================================
DO $$
BEGIN
  -- التحقق من وجود constraint على نوع الإشعار وتعديله
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'new_auction', 'auction_ending', 'bid_received', 'outbid',
      'auction_won', 'auction_lost', 'message_received', 'payment_received',
      'subscription_activated', 'subscription_expiring', 'subscription_expired',
      'trial_started', 'trial_ending', 'trial_expired',
      'booking_pending', 'booking_confirmed', 'booking_rejected',
      'intent_received', 'intent_approved', 'intent_rejected',
      'contract_ready', 'receipt_uploaded', 'receipt_approved', 'receipt_rejected',
      'certificate_issued', 'certificate_ready', 'financial_review_pending',
      'financial_review_approved', 'financial_review_on_hold', 'financial_clarification_needed',
      'system', 'general'
    )
  );
END $$;
