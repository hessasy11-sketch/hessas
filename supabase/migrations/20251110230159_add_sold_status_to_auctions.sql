/*
  # إضافة حالة "مباع" للمزادات

  1. التعديلات
    - تحديث check constraint على عمود status لإضافة القيمة 'sold'
    - القيم المسموحة الآن: 'active', 'upcoming', 'completed', 'extended', 'sold'
  
  2. الأهمية
    - يسمح للبائع بوضع علامة "تم البيع" على المزاد
    - يوقف العد التنازلي تلقائياً عند حالة 'sold'
*/

-- إزالة القيد القديم إذا كان موجوداً
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'auctions_status_check'
  ) THEN
    ALTER TABLE auctions DROP CONSTRAINT auctions_status_check;
  END IF;
END $$;

-- إضافة القيد الجديد مع قيمة 'sold'
ALTER TABLE auctions 
ADD CONSTRAINT auctions_status_check 
CHECK (status IN ('active', 'upcoming', 'completed', 'extended', 'sold'));
