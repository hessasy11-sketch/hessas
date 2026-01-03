/*
  # نظام كلمة المرور المرن - التطبيق الكامل
  
  1. التعديلات على جدول profiles
    - إضافة password_hash (كلمة المرور المشفرة SHA-256)
    - إضافة phone_verified (حالة التحقق من الجوال)
    - إضافة verification_code (رمز التحقق المؤقت)
    - إضافة verification_expires (صلاحية الرمز)
    - إضافة last_password_change (آخر تعديل)
  
  2. جدول جديد
    - login_attempts (تسجيل محاولات الدخول)
  
  3. الدوال المساعدة
    - generate_verification_code()
    - verify_code()
    - request_verification_code()
*/

-- إضافة الأعمدة إلى profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_code text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_expires timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_password_change timestamptz;

-- جدول محاولات تسجيل الدخول
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
DROP POLICY IF EXISTS "Admins only - login_attempts" ON login_attempts;
CREATE POLICY "Admins only - login_attempts" ON login_attempts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON profiles(phone_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_code ON profiles(verification_code) WHERE verification_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_login_attempts_phone ON login_attempts(phone_number);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);

-- دالة لتوليد رمز تحقق عشوائي (6 أرقام)
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

-- تعليقات توضيحية
COMMENT ON COLUMN profiles.password_hash IS 'كلمة المرور المشفرة SHA-256 - أرقام فقط (4-10 أرقام)';
COMMENT ON COLUMN profiles.phone_verified IS 'تم التحقق من رقم الجوال';
COMMENT ON COLUMN profiles.verification_code IS 'رمز التحقق المؤقت (6 أرقام)';
COMMENT ON COLUMN profiles.verification_expires IS 'تاريخ انتهاء صلاحية رمز التحقق';
COMMENT ON TABLE login_attempts IS 'تسجيل محاولات تسجيل الدخول الناجحة والفاشلة';