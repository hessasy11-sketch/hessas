/*
  # إصلاح هيكل جدول b2f_farm_operations

  1. التحديثات
    - إضافة الأعمدة المفقودة المطلوبة للتشغيل
    - الحفاظ على الأعمدة الموجودة
  
  2. الأمان
    - لا يوجد تأثير على البيانات الموجودة
*/

-- إضافة الأعمدة المفقودة
ALTER TABLE b2f_farm_operations 
ADD COLUMN IF NOT EXISTS preparation_date timestamptz,
ADD COLUMN IF NOT EXISTS planting_date timestamptz,
ADD COLUMN IF NOT EXISTS irrigation_date timestamptz,
ADD COLUMN IF NOT EXISTS maintenance_date timestamptz,
ADD COLUMN IF NOT EXISTS harvesting_date timestamptz,
ADD COLUMN IF NOT EXISTS completed_date timestamptz,
ADD COLUMN IF NOT EXISTS last_update_title text,
ADD COLUMN IF NOT EXISTS last_update_description text,
ADD COLUMN IF NOT EXISTS last_update_date timestamptz;