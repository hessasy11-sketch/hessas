/*
  # إصلاح جذري لحقل رقم الهاتف في جدول الحجوزات

  1. التغييرات:
    - جعل investor_phone اختياري (nullable)
    - إضافة trigger تلقائي لنسخ phone_number إلى investor_phone
    - التأكد من وجود أحد الحقلين على الأقل

  2. الهدف:
    - دعم كل من investor_phone و phone_number
    - عدم فقدان أي بيانات
    - التوافقية الكاملة
*/

-- جعل investor_phone اختياري
ALTER TABLE investment_reservations 
ALTER COLUMN investor_phone DROP NOT NULL;

-- إضافة قيد للتأكد من وجود أحد الحقلين
ALTER TABLE investment_reservations 
ADD CONSTRAINT check_phone_fields 
CHECK (
  investor_phone IS NOT NULL OR phone_number IS NOT NULL
);

-- إضافة trigger لنسخ phone_number إلى investor_phone تلقائياً
CREATE OR REPLACE FUNCTION sync_phone_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا تم إدخال phone_number ولم يتم إدخال investor_phone، انسخها
  IF NEW.phone_number IS NOT NULL AND NEW.investor_phone IS NULL THEN
    NEW.investor_phone := NEW.phone_number;
  END IF;
  
  -- إذا تم إدخال investor_phone ولم يتم إدخال phone_number، انسخها
  IF NEW.investor_phone IS NOT NULL AND NEW.phone_number IS NULL THEN
    NEW.phone_number := NEW.investor_phone;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ربط الـ trigger بالجدول
DROP TRIGGER IF EXISTS sync_phone_fields_trigger ON investment_reservations;

CREATE TRIGGER sync_phone_fields_trigger
BEFORE INSERT OR UPDATE ON investment_reservations
FOR EACH ROW
EXECUTE FUNCTION sync_phone_fields();

-- تحديث البيانات الموجودة
UPDATE investment_reservations 
SET phone_number = investor_phone 
WHERE phone_number IS NULL AND investor_phone IS NOT NULL;

UPDATE investment_reservations 
SET investor_phone = phone_number 
WHERE investor_phone IS NULL AND phone_number IS NOT NULL;