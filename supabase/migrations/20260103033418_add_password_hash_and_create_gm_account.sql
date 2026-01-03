/*
  # إضافة حقل كلمة المرور وإنشاء حساب المدير العام

  1. التعديلات
    - إضافة حقل password_hash إلى profiles إن لم يكن موجوداً
    - إنشاء حساب المدير العام برقم 0544433244
    - كلمة المرور: 2931 (مشفرة)
    
  2. الأمان
    - كلمة المرور مشفرة بـ SHA-256
    - صلاحيات مطلقة
*/

-- إضافة حقل password_hash إن لم يكن موجوداً
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE profiles ADD COLUMN password_hash text;
  END IF;
END $$;

-- إضافة حقول إضافية للنظام
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_password_change'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_password_change timestamptz;
  END IF;
END $$;

-- إنشاء حساب المدير العام
INSERT INTO profiles (
  id,
  phone_number,
  display_name,
  user_type,
  is_platform_owner,
  phone_verified,
  password_hash,
  registration_status,
  current_plan_type,
  last_password_change,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '0544433244',
  'المدير العام',
  'general_manager',
  true,
  true,
  encode(digest('2931', 'sha256'), 'hex'),
  'completed',
  'premium',
  now(),
  now(),
  now()
)
ON CONFLICT (id) 
DO UPDATE SET
  phone_number = '0544433244',
  user_type = 'general_manager',
  is_platform_owner = true,
  phone_verified = true,
  password_hash = encode(digest('2931', 'sha256'), 'hex'),
  display_name = 'المدير العام',
  registration_status = 'completed',
  current_plan_type = 'premium',
  last_password_change = now(),
  updated_at = now()
WHERE profiles.id = '00000000-0000-0000-0000-000000000001'::uuid;

-- إذا كان الحساب موجوداً برقم الجوال، نحدثه
UPDATE profiles
SET
  user_type = 'general_manager',
  is_platform_owner = true,
  phone_verified = true,
  password_hash = encode(digest('2931', 'sha256'), 'hex'),
  display_name = 'المدير العام',
  registration_status = 'completed',
  current_plan_type = 'premium',
  last_password_change = now(),
  updated_at = now()
WHERE phone_number = '0544433244'
  AND id != '00000000-0000-0000-0000-000000000001'::uuid;

-- إضافة Index للأداء
CREATE INDEX IF NOT EXISTS idx_profiles_password_hash ON profiles(password_hash) WHERE password_hash IS NOT NULL;

-- تعليق توضيحي
COMMENT ON COLUMN profiles.password_hash IS 'كلمة المرور المشفرة SHA-256';
