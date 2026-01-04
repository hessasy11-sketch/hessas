/*
  # إصلاح سياسات RLS لجدول تعيينات الأقسام

  1. Changes
    - إضافة سياسة INSERT لجلسات الأدمن
    - السماح للـ service_role بالإدراج
    - تحسين السياسات الحالية
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Admins can manage staff assignments" ON department_staff_assignments;
DROP POLICY IF EXISTS "Staff can view own assignments" ON department_staff_assignments;
DROP POLICY IF EXISTS "Service role full access assignments" ON department_staff_assignments;

-- سياسة القراءة للموظفين
CREATE POLICY "Staff can view assignments"
  ON department_staff_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- سياسة الإدراج للأدمن
CREATE POLICY "Admins can insert assignments"
  ON department_staff_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.user_id = auth.uid()
      AND ps.role IN ('super_admin', 'platform_owner', 'manager')
    )
  );

-- سياسة التحديث للأدمن
CREATE POLICY "Admins can update assignments"
  ON department_staff_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.user_id = auth.uid()
      AND ps.role IN ('super_admin', 'platform_owner', 'manager')
    )
  );

-- سياسة الحذف للأدمن
CREATE POLICY "Admins can delete assignments"
  ON department_staff_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.user_id = auth.uid()
      AND ps.role IN ('super_admin', 'platform_owner', 'manager')
    )
  );

-- سياسة service_role
CREATE POLICY "Service role full access"
  ON department_staff_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- سياسة anon للإدراج إذا كانت هناك جلسة admin
CREATE POLICY "Allow admin session inserts"
  ON department_staff_assignments
  FOR INSERT
  TO anon
  WITH CHECK (
    current_setting('app.admin_session_active', true)::boolean = true
  );
