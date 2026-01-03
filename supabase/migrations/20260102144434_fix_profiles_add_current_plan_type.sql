/*
  # إصلاح: إضافة عمود current_plan_type إلى جدول profiles

  1. Changes
    - إضافة عمود current_plan_type إلى جدول profiles
    - القيمة الافتراضية: 'free'
    - يدعم: free, silver, gold
    
  2. Security
    - لا تغيير في RLS
*/

-- Add current_plan_type column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'current_plan_type'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN current_plan_type TEXT DEFAULT 'free' 
    CHECK (current_plan_type IN ('free', 'silver', 'gold', 'premium', 'vip'));
    
    -- Update existing profiles
    UPDATE profiles 
    SET current_plan_type = 'free' 
    WHERE current_plan_type IS NULL;
  END IF;
END $$;
