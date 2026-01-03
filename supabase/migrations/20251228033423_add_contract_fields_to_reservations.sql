/*
  # إضافة حقول العقود إلى جدول الحجوزات
  
  1. الحقول الجديدة
    - `contract_id` - معرف العقد المرتبط
    - `contract_number` - رقم العقد للوصول السريع
    - `contract_issued` - هل تم إصدار العقد؟
    - `contract_issued_at` - تاريخ إصدار العقد
    - `contract_status` - حالة العقد
    - `needs_contract` - علامة تنبيه للإدارة
    - `contract_url` - رابط ملف العقد PDF
    
  2. Triggers
    - تحديث needs_contract تلقائياً عند التحقق من الإيصال
*/

-- إضافة الحقول
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'contract_id'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN contract_id uuid REFERENCES b2f_contracts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'contract_number'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN contract_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'contract_issued'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN contract_issued BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'contract_issued_at'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN contract_issued_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'contract_status'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN contract_status TEXT CHECK (
      contract_status IN ('draft', 'active', 'completed', 'cancelled')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'needs_contract'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN needs_contract BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'contract_url'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN contract_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'receipt_url'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN receipt_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'payment_verified'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN payment_verified BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'payment_verified_at'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN payment_verified_at TIMESTAMPTZ;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investment_reservations_contract_id 
ON investment_reservations(contract_id);

CREATE INDEX IF NOT EXISTS idx_investment_reservations_needs_contract 
ON investment_reservations(needs_contract) WHERE needs_contract = true;

-- Trigger لتحديث needs_contract تلقائياً
CREATE OR REPLACE FUNCTION update_needs_contract_after_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا تم التحقق من الإيصال بنجاح ولم يتم إصدار العقد
  IF NEW.ai_verification_status = 'verified' 
     AND (NEW.payment_verified IS NULL OR NEW.payment_verified = false) THEN
    NEW.payment_verified := true;
    NEW.payment_verified_at := now();
  END IF;

  IF NEW.payment_verified = true 
     AND (NEW.contract_issued IS NULL OR NEW.contract_issued = false) THEN
    NEW.needs_contract := true;
    -- تحديث الحالة إلى "بانتظار العقد"
    IF NEW.status NOT IN ('contract_issued', 'completed') THEN
      NEW.status := 'awaiting_contract';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_needs_contract_reservations ON investment_reservations;
CREATE TRIGGER trigger_update_needs_contract_reservations
  BEFORE UPDATE ON investment_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_needs_contract_after_verification();

-- Comments
COMMENT ON COLUMN investment_reservations.contract_id IS 'معرف العقد المرتبط بهذا الحجز';
COMMENT ON COLUMN investment_reservations.contract_number IS 'رقم العقد للوصول السريع';
COMMENT ON COLUMN investment_reservations.contract_issued IS 'هل تم إصدار العقد؟';
COMMENT ON COLUMN investment_reservations.contract_issued_at IS 'تاريخ إصدار العقد';
COMMENT ON COLUMN investment_reservations.contract_status IS 'حالة العقد';
COMMENT ON COLUMN investment_reservations.needs_contract IS 'علامة تنبيه: هذا الحجز يحتاج إصدار عقد (بعد التحقق من الإيصال)';
COMMENT ON COLUMN investment_reservations.contract_url IS 'رابط ملف العقد PDF';
COMMENT ON COLUMN investment_reservations.receipt_url IS 'رابط إيصال الدفع المرفوع';
COMMENT ON COLUMN investment_reservations.payment_verified IS 'هل تم التحقق من الدفع؟';
