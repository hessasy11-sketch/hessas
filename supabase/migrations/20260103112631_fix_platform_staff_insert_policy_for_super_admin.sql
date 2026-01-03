/*
  # إصلاح سياسات إضافة الموظفين للـ Super Admin

  1. المشكلة:
    - سياسة INSERT تتطلب is_platform_admin فقط
    - لا تسمح للـ Super Admin الذي هو staff بإضافة موظفين

  2. الحل:
    - إضافة سياسة جديدة للسماح للـ Super Admin Staff بإضافة موظفين
    - السماح للموظفين ذوي role = 'super_admin' بإضافة موظفين جدد

  3. Security:
    - التحقق من أن الموظف نشط (is_active = true)
    - التحقق من أن role = 'super_admin'
*/

-- إنشاء دالة للتحقق من صلاحية Super Admin Staff
CREATE OR REPLACE FUNCTION is_super_admin_staff()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM platform_staff
    WHERE phone_number IN (
      SELECT phone_number FROM profiles WHERE id = auth.uid()
    )
    AND role = 'super_admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف السياسة القديمة وإعادة إنشائها محسنة
DROP POLICY IF EXISTS "Platform admins can insert staff" ON platform_staff;

-- سياسة INSERT جديدة تدعم كل من Platform Admin و Super Admin Staff
CREATE POLICY "Platform admins and super admin staff can insert"
  ON platform_staff
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin(auth.uid())
    OR is_platform_owner()
    OR is_super_admin_staff()
  );

-- تحديث سياسة UPDATE أيضاً
DROP POLICY IF EXISTS "Platform admins can update staff" ON platform_staff;

CREATE POLICY "Platform admins and super admin staff can update"
  ON platform_staff
  FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin(auth.uid())
    OR is_platform_owner()
    OR is_super_admin_staff()
  )
  WITH CHECK (
    is_platform_admin(auth.uid())
    OR is_platform_owner()
    OR is_super_admin_staff()
  );

-- تحديث سياسة DELETE
DROP POLICY IF EXISTS "Platform admins can delete staff" ON platform_staff;

CREATE POLICY "Platform admins and super admin staff can delete"
  ON platform_staff
  FOR DELETE
  TO authenticated
  USING (
    is_platform_admin(auth.uid())
    OR is_platform_owner()
    OR is_super_admin_staff()
  );

-- تحديث سياسة SELECT
DROP POLICY IF EXISTS "Platform admins can view staff" ON platform_staff;

CREATE POLICY "Platform admins and super admin staff can view"
  ON platform_staff
  FOR SELECT
  TO authenticated
  USING (
    is_platform_admin(auth.uid())
    OR is_platform_owner()
    OR is_super_admin_staff()
  );

-- منح الصلاحية على الدالة
GRANT EXECUTE ON FUNCTION is_super_admin_staff() TO authenticated;

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_platform_staff_role_active 
  ON platform_staff(role, is_active) 
  WHERE role = 'super_admin' AND is_active = true;

-- تعليق
COMMENT ON FUNCTION is_super_admin_staff IS 'التحقق من أن المستخدم الحالي هو موظف Super Admin نشط';
