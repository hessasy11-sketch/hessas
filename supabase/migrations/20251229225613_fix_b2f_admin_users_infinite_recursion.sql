/*
  # إصلاح مشكلة Infinite Recursion في سياسات RLS

  ## المشكلة
  - سياسة RLS في جدول b2f_admin_users تسبب استدعاء لانهائي
  - السياسة تتحقق من نفس الجدول مما يخلق حلقة لانهائية

  ## الحل
  1. حذف السياسة القديمة
  2. إنشاء function آمنة للتحقق من صلاحيات الأدمن
  3. إنشاء سياسات جديدة تستخدم الـ function

  ## الأمان
  - استخدام SECURITY DEFINER لكسر حلقة الاستدعاء اللانهائي
  - السياسات الجديدة تحافظ على نفس مستوى الأمان
*/

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Admins can view admin users" ON b2f_admin_users;

-- إنشاء function آمنة للتحقق من صلاحيات الأدمن
CREATE OR REPLACE FUNCTION is_b2f_admin(user_id_param uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  check_user_id uuid;
BEGIN
  -- استخدام المعامل المرسل أو auth.uid()
  check_user_id := COALESCE(user_id_param, auth.uid());
  
  -- إذا لم يكن هناك user_id، إرجاع false
  IF check_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- التحقق من وجود المستخدم في جدول الأدمن
  RETURN EXISTS (
    SELECT 1
    FROM b2f_admin_users
    WHERE user_id = check_user_id
  );
END;
$$;

-- إنشاء سياسات RLS جديدة وآمنة
CREATE POLICY "Admins can view all admin users"
  ON b2f_admin_users
  FOR SELECT
  TO authenticated
  USING (is_b2f_admin());

CREATE POLICY "Admins can insert admin users"
  ON b2f_admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_b2f_admin());

CREATE POLICY "Admins can update admin users"
  ON b2f_admin_users
  FOR UPDATE
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

CREATE POLICY "Admins can delete admin users"
  ON b2f_admin_users
  FOR DELETE
  TO authenticated
  USING (is_b2f_admin());

-- منح الصلاحيات للـ function
GRANT EXECUTE ON FUNCTION is_b2f_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_b2f_admin TO anon;

-- إضافة تعليق توضيحي
COMMENT ON FUNCTION is_b2f_admin IS 'Checks if a user is a B2F admin. Uses SECURITY DEFINER to avoid infinite recursion in RLS policies.';
