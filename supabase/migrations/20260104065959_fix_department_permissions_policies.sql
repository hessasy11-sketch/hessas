/*
  # إصلاح سياسات RLS لجدول department_permissions

  1. المشكلة
    - سياسات RLS تمنع المديرين من إضافة صلاحيات جديدة
    - خطأ 401 Unauthorized عند INSERT

  2. الحل
    - إضافة سياسة للمديرين (admin sessions) للسماح بالإدراج
    - إضافة سياسة لـ service_role للعمليات الداخلية
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Admins can insert department permissions" ON department_permissions;
DROP POLICY IF EXISTS "Service role can insert department permissions" ON department_permissions;
DROP POLICY IF EXISTS "Admin sessions can insert department permissions" ON department_permissions;

-- السماح للمديرين بإدراج الصلاحيات (باستخدام admin session)
CREATE POLICY "Admin sessions can insert department permissions"
  ON department_permissions
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id::text = current_setting('app.current_admin_id', true)
      AND platform_staff.role IN ('super_admin', 'admin', 'general_manager')
    )
  );

-- السماح لـ service_role بالإدراج
CREATE POLICY "Service role can insert department permissions"
  ON department_permissions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- السماح للمديرين بتحديث الصلاحيات
DROP POLICY IF EXISTS "Admins can update department permissions" ON department_permissions;
DROP POLICY IF EXISTS "Admin sessions can update department permissions" ON department_permissions;

CREATE POLICY "Admin sessions can update department permissions"
  ON department_permissions
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id::text = current_setting('app.current_admin_id', true)
      AND platform_staff.role IN ('super_admin', 'admin', 'general_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id::text = current_setting('app.current_admin_id', true)
      AND platform_staff.role IN ('super_admin', 'admin', 'general_manager')
    )
  );

-- السماح للمديرين بحذف الصلاحيات
DROP POLICY IF EXISTS "Admins can delete department permissions" ON department_permissions;
DROP POLICY IF EXISTS "Admin sessions can delete department permissions" ON department_permissions;

CREATE POLICY "Admin sessions can delete department permissions"
  ON department_permissions
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id::text = current_setting('app.current_admin_id', true)
      AND platform_staff.role IN ('super_admin', 'admin', 'general_manager')
    )
  );
