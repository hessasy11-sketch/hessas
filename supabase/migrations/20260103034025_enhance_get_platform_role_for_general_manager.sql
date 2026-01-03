/*
  # تحسين دالة get_platform_role للمدير العام

  1. الوصف
    - تعديل دالة get_platform_role لتتعرف على المدير العام
    - التحقق من جدول profiles للمستخدمين ذوي صلاحيات platform_owner
    - إرجاع 'platform_owner' إذا كان المستخدم general_manager أو is_platform_owner = true
    
  2. الأمان
    - الدالة تعمل بـ SECURITY DEFINER
    - التحقق من صلاحيات المستخدم بشكل آمن
*/

-- تحديث دالة get_platform_role
CREATE OR REPLACE FUNCTION get_platform_role(check_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role text;
BEGIN
  -- أولاً: التحقق من جدول profiles للمستخدمين ذوي الصلاحيات المطلقة
  SELECT 
    CASE 
      WHEN is_platform_owner = true OR user_type = 'general_manager' THEN 'platform_owner'
      ELSE NULL
    END INTO v_role
  FROM profiles
  WHERE id = check_user_id
  LIMIT 1;

  -- إذا وجدنا صلاحيات في profiles، نرجعها مباشرة
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- ثانياً: التحقق من جدول platform_administrators (للحسابات القديمة)
  SELECT platform_role INTO v_role
  FROM platform_administrators
  WHERE user_id = check_user_id
    AND is_active = true
  LIMIT 1;

  RETURN v_role;
END;
$$;

-- تعليق
COMMENT ON FUNCTION get_platform_role IS 'Returns platform role for user - checks profiles first for is_platform_owner or general_manager, then platform_administrators';
