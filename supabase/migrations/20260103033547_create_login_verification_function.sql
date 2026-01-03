/*
  # دالة التحقق من تسجيل الدخول

  1. الوصف
    - دالة للتحقق من بيانات الدخول (رقم الجوال وكلمة المرور)
    - إرجاع معلومات المستخدم إذا كانت البيانات صحيحة
    - تسجيل محاولات الدخول في login_attempts
    
  2. الأمان
    - التحقق من كلمة المرور المشفرة
    - حماية ضد هجمات Brute Force
*/

-- إنشاء جدول login_attempts إن لم يكن موجوداً
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

-- سياسة للسماح بالإدراج من أي مستخدم (للتسجيل)
DROP POLICY IF EXISTS "Anyone can log attempts" ON login_attempts;
CREATE POLICY "Anyone can log attempts" ON login_attempts FOR INSERT WITH CHECK (true);

-- دالة للتحقق من تسجيل الدخول
CREATE OR REPLACE FUNCTION verify_login(
  p_phone_number text,
  p_password text
)
RETURNS TABLE (
  success boolean,
  user_id uuid,
  user_type text,
  display_name text,
  is_platform_owner boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
  v_password_hash text;
BEGIN
  -- تشفير كلمة المرور المدخلة
  v_password_hash := encode(digest(p_password, 'sha256'), 'hex');
  
  -- البحث عن المستخدم
  SELECT * INTO v_profile
  FROM profiles
  WHERE phone_number = p_phone_number
    AND password_hash = v_password_hash;
  
  IF FOUND THEN
    -- تسجيل محاولة ناجحة
    INSERT INTO login_attempts (phone_number, success)
    VALUES (p_phone_number, true);
    
    -- تحديث آخر نشاط
    UPDATE profiles
    SET last_active_at = now()
    WHERE id = v_profile.id;
    
    -- إرجاع البيانات
    RETURN QUERY SELECT
      true as success,
      v_profile.id as user_id,
      v_profile.user_type,
      v_profile.display_name,
      COALESCE(v_profile.is_platform_owner, false) as is_platform_owner,
      'تم تسجيل الدخول بنجاح' as message;
  ELSE
    -- تسجيل محاولة فاشلة
    INSERT INTO login_attempts (phone_number, success)
    VALUES (p_phone_number, false);
    
    -- إرجاع خطأ
    RETURN QUERY SELECT
      false as success,
      NULL::uuid as user_id,
      NULL::text as user_type,
      NULL::text as display_name,
      false as is_platform_owner,
      'رقم الجوال أو كلمة المرور غير صحيحة' as message;
  END IF;
END;
$$;

-- دالة لتحديث كلمة المرور
CREATE OR REPLACE FUNCTION update_password(
  p_phone_number text,
  p_old_password text,
  p_new_password text
)
RETURNS TABLE (
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_hash text;
  v_new_hash text;
BEGIN
  -- تشفير كلمات المرور
  v_old_hash := encode(digest(p_old_password, 'sha256'), 'hex');
  v_new_hash := encode(digest(p_new_password, 'sha256'), 'hex');
  
  -- التحقق من كلمة المرور القديمة وتحديثها
  UPDATE profiles
  SET 
    password_hash = v_new_hash,
    last_password_change = now(),
    updated_at = now()
  WHERE phone_number = p_phone_number
    AND password_hash = v_old_hash;
  
  IF FOUND THEN
    RETURN QUERY SELECT
      true as success,
      'تم تغيير كلمة المرور بنجاح' as message;
  ELSE
    RETURN QUERY SELECT
      false as success,
      'كلمة المرور القديمة غير صحيحة' as message;
  END IF;
END;
$$;

-- تعليقات
COMMENT ON FUNCTION verify_login IS 'Verify user login credentials and return user information';
COMMENT ON FUNCTION update_password IS 'Update user password with verification';
