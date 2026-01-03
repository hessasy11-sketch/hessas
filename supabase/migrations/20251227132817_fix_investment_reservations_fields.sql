/*
  # إصلاح حقول جدول investment_reservations

  1. إضافة الحقول الناقصة:
    - phone_number (text) - رقم الجوال
    - total_amount (numeric) - المبلغ الإجمالي
    - user_id (uuid) - معرف المستخدم (اختياري)

  2. ملاحظة:
    - نبقي على investor_phone للتوافقية
    - نضيف phone_number كحقل جديد
*/

-- إضافة phone_number إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'investment_reservations' 
    AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN phone_number text;
  END IF;
END $$;

-- إضافة total_amount إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'investment_reservations' 
    AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN total_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- إضافة user_id إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'investment_reservations' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE investment_reservations 
    ADD COLUMN user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- نسخ البيانات من investor_phone إلى phone_number إذا كانت فارغة
UPDATE investment_reservations 
SET phone_number = investor_phone 
WHERE phone_number IS NULL AND investor_phone IS NOT NULL;