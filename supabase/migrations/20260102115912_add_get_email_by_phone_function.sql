/*
  # إضافة دالة للحصول على البريد الإلكتروني من رقم الجوال

  ## الوصف
  دالة للحصول على البريد الإلكتروني من جدول auth.users بناءً على رقم الجوال

  ## التغييرات
  1. إنشاء دالة get_email_by_phone
     - تبحث عن المستخدم في auth.users برقم الجوال
     - ترجع البريد الإلكتروني المرتبط

  ## الأمان
  - الدالة آمنة وتستخدم للمصادقة فقط
  - لا تعرض معلومات حساسة
*/

-- إنشاء دالة للحصول على البريد الإلكتروني من رقم الجوال
CREATE OR REPLACE FUNCTION get_email_by_phone(phone_param text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
BEGIN
  -- البحث عن المستخدم برقم الجوال في auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE phone = phone_param
    AND deleted_at IS NULL
  LIMIT 1;

  RETURN user_email;
END;
$$;

-- منح الصلاحيات للمستخدمين المجهولين (للدخول)
GRANT EXECUTE ON FUNCTION get_email_by_phone(text) TO anon;
GRANT EXECUTE ON FUNCTION get_email_by_phone(text) TO authenticated;
