/*
  # إصلاح سياسات تعيينات الأقسام لدعم جلسات الأدمن

  1. Changes
    - دعم جلسات الأدمن في سياسات RLS
    - السماح بالإدراج عبر session settings
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Allow admin session inserts" ON department_staff_assignments;
DROP POLICY IF EXISTS "Admins can insert assignments" ON department_staff_assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON department_staff_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON department_staff_assignments;
DROP POLICY IF EXISTS "Staff can view assignments" ON department_staff_assignments;

-- سياسة القراءة للجميع
CREATE POLICY "Anyone can view assignments"
  ON department_staff_assignments
  FOR SELECT
  TO public
  USING (true);

-- سياسة الإدراج
CREATE POLICY "Admins and admin sessions can insert"
  ON department_staff_assignments
  FOR INSERT
  TO public
  WITH CHECK (
    -- إما جلسة admin نشطة
    current_setting('app.admin_session_active', true)::boolean = true
    OR
    -- أو مستخدم admin مصادق
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.user_id = auth.uid()
      AND ps.role IN ('super_admin', 'platform_owner', 'manager')
    )
  );

-- سياسة التحديث
CREATE POLICY "Admins and admin sessions can update"
  ON department_staff_assignments
  FOR UPDATE
  TO public
  USING (
    current_setting('app.admin_session_active', true)::boolean = true
    OR
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.user_id = auth.uid()
      AND ps.role IN ('super_admin', 'platform_owner', 'manager')
    )
  );

-- سياسة الحذف
CREATE POLICY "Admins and admin sessions can delete"
  ON department_staff_assignments
  FOR DELETE
  TO public
  USING (
    current_setting('app.admin_session_active', true)::boolean = true
    OR
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.user_id = auth.uid()
      AND ps.role IN ('super_admin', 'platform_owner', 'manager')
    )
  );
