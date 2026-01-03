/*
  # إصلاح دالة verify_login

  1. الوصف
    - إعادة إنشاء دالة verify_login بدون الاعتماد على b2f_admin_users
    - إرجاع بيانات المستخدم البسيطة فقط
    
  2. الأمان
    - التحقق من كلمة المرور المشفرة SHA-256
    - تسجيل محاولات الدخول
*/

-- حذف الدالة القديمة وإعادة إنشائها
DROP FUNCTION IF EXISTS verify_login(text, text);

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

-- تعليق
COMMENT ON FUNCTION verify_login IS 'Verify user login credentials using phone number and password';
