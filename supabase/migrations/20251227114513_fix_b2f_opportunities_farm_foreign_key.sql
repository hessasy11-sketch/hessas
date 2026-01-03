/*
  # إصلاح العلاقة بين العروض والمزارع في B2F
  
  1. التعديلات:
     - حذف الـ foreign key القديم الذي يشير إلى جدول `farms`
     - إضافة foreign key جديد يشير إلى جدول `b2f_farms`
     - تفعيل CASCADE للحذف التلقائي
  
  2. الهدف:
     - عند حذف مزرعة، يتم حذف جميع العروض المرتبطة بها تلقائياً
     - ربط صحيح بين b2f_opportunities و b2f_farms
*/

-- حذف القيد القديم
ALTER TABLE b2f_opportunities
DROP CONSTRAINT IF EXISTS b2f_opportunities_farm_id_fkey;

-- إضافة القيد الجديد مع CASCADE
ALTER TABLE b2f_opportunities
ADD CONSTRAINT b2f_opportunities_farm_id_fkey
FOREIGN KEY (farm_id)
REFERENCES b2f_farms(id)
ON DELETE CASCADE;

-- التحقق من أن جميع farm_id موجودة
-- (إذا كانت هناك بيانات يتيمة، سيفشل القيد)
DO $$
BEGIN
  -- التحقق من وجود بيانات يتيمة
  IF EXISTS (
    SELECT 1 
    FROM b2f_opportunities o 
    WHERE NOT EXISTS (
      SELECT 1 FROM b2f_farms f WHERE f.id = o.farm_id
    )
  ) THEN
    RAISE EXCEPTION 'توجد عروض مرتبطة بمزارع غير موجودة';
  END IF;
END $$;
