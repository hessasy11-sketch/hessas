/*
  # حذف نظام الحجوزات القديم نهائياً
  
  ## التغييرات
  
  1. حذف الجداول القديمة:
     - investment_reservations (النظام القديم)
     - جميع الجداول المرتبطة به
  
  2. إزالة:
     - الدوال المرتبطة
     - المحفزات (Triggers)
     - السياسات (Policies)
  
  3. النظام المعتمد:
     - b2f_investment_requests فقط
     - b2f_farm_seasons للتشغيل
  
  ⚠️ هذا قرار نهائي - لا رجوع
*/

-- 1. حذف الدوال المرتبطة بـ investment_reservations
DROP FUNCTION IF EXISTS get_opportunity_statistics(uuid) CASCADE;
DROP FUNCTION IF EXISTS auto_transfer_to_operations() CASCADE;
DROP FUNCTION IF EXISTS create_contract_after_transfer() CASCADE;

-- 2. حذف الجدول الرئيسي
DROP TABLE IF EXISTS investment_reservations CASCADE;

-- 3. تنظيف أي محفزات مرتبطة
-- (CASCADE سيحذفها تلقائياً)

-- 4. التأكد من عدم وجود مراجع في الجداول الأخرى
-- نظيف أي أعمدة مرجعية
DO $$
BEGIN
  -- حذف أي أعمدة مرجعية في جداول أخرى
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_contracts' 
    AND column_name = 'reservation_id'
  ) THEN
    ALTER TABLE b2f_contracts DROP COLUMN IF EXISTS reservation_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_certificates' 
    AND column_name = 'reservation_id'
  ) THEN
    ALTER TABLE b2f_certificates DROP COLUMN IF EXISTS reservation_id;
  END IF;
END $$;

-- ✅ النظام الآن نظيف بالكامل
-- ✅ المسار الوحيد: b2f_investment_requests → b2f_farm_seasons