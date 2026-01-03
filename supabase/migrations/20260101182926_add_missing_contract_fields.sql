/*
  # إضافة الحقول الناقصة لجدول العقود

  - حقول نقل الانتفاع
  - حقول المنتفع الحالي والأصلي
*/

-- إضافة الحقول إن لم تكن موجودة
ALTER TABLE b2f_contracts 
ADD COLUMN IF NOT EXISTS current_beneficiary_phone TEXT,
ADD COLUMN IF NOT EXISTS current_beneficiary_name TEXT,
ADD COLUMN IF NOT EXISTS original_beneficiary_phone TEXT,
ADD COLUMN IF NOT EXISTS original_beneficiary_name TEXT,
ADD COLUMN IF NOT EXISTS is_transferred BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transfer_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_transferred_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contract_content TEXT,
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- تحديث السجلات القديمة
UPDATE b2f_contracts
SET
  current_beneficiary_phone = COALESCE(current_beneficiary_phone, investor_phone),
  current_beneficiary_name = COALESCE(current_beneficiary_name, investor_phone),
  original_beneficiary_phone = COALESCE(original_beneficiary_phone, investor_phone),
  original_beneficiary_name = COALESCE(original_beneficiary_name, investor_phone)
WHERE current_beneficiary_phone IS NULL;
