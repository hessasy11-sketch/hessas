/*
  # إصلاح علاقة المزارع في جدول العروض الاستثمارية
  
  1. حذف Foreign Key الذي يشير إلى farms القديم
  2. إنشاء Foreign Key جديد يشير إلى b2f_farms الصحيح
*/

-- حذف الـ Foreign Key القديم الخاطئ
ALTER TABLE b2f_opportunities 
DROP CONSTRAINT IF EXISTS b2f_opportunities_farm_id_fkey;

-- إنشاء Foreign Key جديد يشير إلى جدول b2f_farms الصحيح
ALTER TABLE b2f_opportunities 
ADD CONSTRAINT b2f_opportunities_farm_id_fkey 
FOREIGN KEY (farm_id) REFERENCES b2f_farms(id) ON DELETE CASCADE;
