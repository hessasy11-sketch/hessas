/*
  # إضافة حقول التجربة المجانية للباقات

  1. Changes
    - إضافة حقل `has_free_trial` (boolean) - هل الباقة تدعم تجربة مجانية
    - إضافة حقل `free_trial_days` (integer) - عدد أيام التجربة المجانية
  
  2. Notes
    - التجربة المجانية متاحة للباقات المدفوعة فقط
    - القيمة الافتراضية: معطلة
*/

-- إضافة حقل تفعيل التجربة المجانية
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'has_free_trial'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN has_free_trial boolean DEFAULT false;
  END IF;
END $$;

-- إضافة حقل عدد أيام التجربة المجانية
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'free_trial_days'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN free_trial_days integer DEFAULT 0;
  END IF;
END $$;
