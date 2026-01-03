/*
  # نظام كلمة المرور المرن
  
  1. التعديلات
    - إضافة حقل password_hash لتخزين كلمة المرور المشفرة
    - إضافة حقل phone_verified للتحقق من الجوال
    - إضافة حقل verification_code لرمز التحقق المؤقت
    - إضافة حقل verification_expires لانتهاء صلاحية الرمز
  
  2. الشروط
    - كلمة المرور: أرقام فقط، حد أدنى 4، حد أقصى 10
    - يُسمح بأي أرقام (مكررة، متشابهة، متسلسلة)
    - لا توجد قيود على قوة كلمة المرور
  
  3. الأمان
    - تخزين كلمة المرور مشفرة
    - رمز التحقق يُحذف بعد الاستخدام
*/

-- إضافة حقول جديدة إلى جدول profiles
DO $$ 
BEGIN
  -- إضافة حقل password_hash
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE profiles ADD COLUMN password_hash text;
  END IF;

  -- إضافة حقل phone_verified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;

  -- إضافة حقل verification_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'verification_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_code text;
  END IF;

  -- إضافة حقل verification_expires
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'verification_expires'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_expires timestamptz;
  END IF;

  -- إضافة حقل last_password_change
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_password_change'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_password_change timestamptz;
  END IF;
END $$;

-- جدول لتسجيل محاولات تسجيل الدخول
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  success boolean DEFAULT false,
  ip_address text,
  user_agent text,
  attempted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- سياسة للمسؤولين فقط
CREATE POLICY "Admins only - login_attempts" ON login_attempts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON profiles(phone_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_code ON profiles(verification_code) WHERE verification_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_login_attempts_phone ON login_attempts(phone_number);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);

-- دالة لتوليد رمز تحقق عشوائي (4-6 أرقام)
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
END;
$$;

-- دالة للتحقق من صلاحية رمز التحقق
CREATE OR REPLACE FUNCTION verify_code(
  p_phone text,
  p_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE phone_number = p_phone
    AND verification_code = p_code
    AND verification_expires > now();

  IF FOUND THEN
    -- تحديث الحالة وحذف الرمز
    UPDATE profiles
    SET 
      phone_verified = true,
      verification_code = NULL,
      verification_expires = NULL
    WHERE phone_number = p_phone;
    
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- دالة لإنشاء رمز تحقق جديد
CREATE OR REPLACE FUNCTION request_verification_code(
  p_phone text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
BEGIN
  v_code := generate_verification_code();
  
  UPDATE profiles
  SET 
    verification_code = v_code,
    verification_expires = now() + interval '10 minutes'
  WHERE phone_number = p_phone;

  RETURN v_code;
END;
$$;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN profiles.password_hash IS 'كلمة المرور المشفرة - أرقام فقط (4-10 أرقام)';
COMMENT ON COLUMN profiles.phone_verified IS 'تم التحقق من رقم الجوال';
COMMENT ON COLUMN profiles.verification_code IS 'رمز التحقق المؤقت (6 أرقام)';
COMMENT ON COLUMN profiles.verification_expires IS 'تاريخ انتهاء صلاحية رمز التحقق';
