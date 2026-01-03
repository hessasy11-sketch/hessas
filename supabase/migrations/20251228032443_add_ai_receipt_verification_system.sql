/*
  # إضافة نظام التحقق الآلي من الإيصالات بالذكاء الصناعي
  
  1. الحقول الجديدة
    - `ai_verified_amount` - المبلغ المستخرج من الإيصال بواسطة AI
    - `ai_verification_status` - حالة التحقق (verified/mismatch/error/pending)
    - `ai_verification_notes` - ملاحظات AI حول التحقق
    - `ai_extracted_date` - تاريخ التحويل المستخرج من الإيصال
    - `expected_amount` - المبلغ المتوقع (محسوب من النظام)
    - `amount_difference` - فرق المبلغ (إذا وُجد)
    - `ai_verified_at` - تاريخ التحقق بواسطة AI
    
  2. التغييرات
    - إضافة حقول التحقق الآلي لجدول investment_reservations
    - إضافة index على ai_verification_status
    
  3. ملاحظات
    - الحقول الجديدة nullable (يمكن أن تكون فارغة)
    - ai_verification_status له قيم محددة
    - يتم ملء هذه الحقول بعد رفع الإيصال مباشرة
*/

-- إضافة حقول التحقق الآلي
DO $$ 
BEGIN
  -- إضافة ai_verified_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'ai_verified_amount'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN ai_verified_amount DECIMAL(10,2);
  END IF;

  -- إضافة ai_verification_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'ai_verification_status'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN ai_verification_status TEXT CHECK (
      ai_verification_status IN ('pending', 'verified', 'mismatch', 'error', 'manual_review')
    );
  END IF;

  -- إضافة ai_verification_notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'ai_verification_notes'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN ai_verification_notes TEXT;
  END IF;

  -- إضافة ai_extracted_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'ai_extracted_date'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN ai_extracted_date TIMESTAMPTZ;
  END IF;

  -- إضافة expected_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'expected_amount'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN expected_amount DECIMAL(10,2);
  END IF;

  -- إضافة amount_difference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'amount_difference'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN amount_difference DECIMAL(10,2);
  END IF;

  -- إضافة ai_verified_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investment_reservations' 
    AND column_name = 'ai_verified_at'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN ai_verified_at TIMESTAMPTZ;
  END IF;
END $$;

-- إضافة index على ai_verification_status
CREATE INDEX IF NOT EXISTS idx_investment_reservations_ai_verification_status 
ON investment_reservations(ai_verification_status);

-- إضافة comment للتوضيح
COMMENT ON COLUMN investment_reservations.ai_verified_amount IS 'المبلغ المستخرج من الإيصال بواسطة الذكاء الصناعي';
COMMENT ON COLUMN investment_reservations.ai_verification_status IS 'حالة التحقق: pending (قيد المعالجة), verified (مطابق), mismatch (غير مطابق), error (خطأ), manual_review (يحتاج مراجعة يدوية)';
COMMENT ON COLUMN investment_reservations.ai_verification_notes IS 'ملاحظات الذكاء الصناعي حول التحقق';
COMMENT ON COLUMN investment_reservations.expected_amount IS 'المبلغ المتوقع المحسوب من النظام';
COMMENT ON COLUMN investment_reservations.amount_difference IS 'الفرق بين المبلغ المستخرج والمبلغ المتوقع';
