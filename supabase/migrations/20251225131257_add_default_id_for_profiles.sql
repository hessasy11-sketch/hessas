/*
  # إضافة قيمة افتراضية لحقل id في جدول profiles

  1. Changes
    - إضافة قيمة افتراضية `gen_random_uuid()` لحقل id
    - السماح بإنشاء ملفات شخصية جديدة تلقائياً بدون تحديد id

  2. Security
    - لا تأثير على الأمان
    - كل مستخدم جديد سيحصل على id فريد
*/

-- Add default UUID generation for profiles id column
ALTER TABLE profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();
