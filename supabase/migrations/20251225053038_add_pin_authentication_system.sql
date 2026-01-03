/*
  # إضافة نظام PIN للتسجيل السريع

  ## التغييرات
  
  ### 1. إضافة حقول PIN إلى جدول profiles
    - `pin_hash` (text) - تخزين PIN مشفر باستخدام bcrypt
    - `has_pin` (boolean) - للتحقق السريع من وجود PIN
    - `pin_created_at` (timestamptz) - تاريخ إنشاء/تحديث PIN
  
  ### 2. الأمان
    - RLS موجود مسبقًا على جدول profiles
    - المستخدم يمكنه قراءة وتحديث PIN الخاص به فقط
    
  ### 3. الملاحظات
    - PIN يجب أن يكون 4 أرقام فقط (التحقق في الـ frontend)
    - التشفير يتم في الـ frontend قبل الإرسال
    - يستخدم للتسجيل السريع في قسم B2F
*/

-- Add PIN fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'pin_hash'
  ) THEN
    ALTER TABLE profiles ADD COLUMN pin_hash text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'has_pin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN has_pin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'pin_created_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN pin_created_at timestamptz;
  END IF;
END $$;

-- Create index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_profiles_has_pin ON profiles(has_pin) WHERE has_pin = true;