/*
  # إضافة حقل نوع الباقة الحالية للملفات الشخصية

  1. Changes
    - إضافة عمود `current_plan_type` إلى جدول profiles
    - القيمة الافتراضية: 'free' (باقة مجانية)
    - لتتبع الباقة الحالية للمستخدم

  2. Notes
    - هذا العمود يُستخدم في useDynamicPlans و useUserSubscription
    - يتم تحديثه عند تفعيل أو تجديد الاشتراكات
*/

-- Add current_plan_type column to profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'current_plan_type'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN current_plan_type TEXT DEFAULT 'free' CHECK (current_plan_type IN ('free', 'silver', 'gold'));
  END IF;
END $$;

-- Update existing profiles to have 'free' plan
UPDATE profiles 
SET current_plan_type = 'free' 
WHERE current_plan_type IS NULL;
