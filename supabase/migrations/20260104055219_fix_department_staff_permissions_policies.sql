/*
  # تحسين صلاحيات إدارة الأقسام

  1. السماح للإداريين بإضافة وتعديل:
    - تعيينات الموظفين
    - صلاحيات الأقسام

  2. السماح بقراءة البيانات للموظفين
*/

-- سياسات إضافة وتعديل تعيينات الموظفين
CREATE POLICY "Admins can manage staff assignments"
  ON department_staff_assignments FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.role IN ('super_admin', 'admin', 'general_manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.role IN ('super_admin', 'admin', 'general_manager')
  ));

-- سياسات إدارة الصلاحيات
CREATE POLICY "Admins can manage department permissions"
  ON department_permissions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.role IN ('super_admin', 'admin', 'general_manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.role IN ('super_admin', 'admin', 'general_manager')
  ));

-- سياسات إدارة الأدوار
CREATE POLICY "Admins can manage department roles"
  ON department_roles FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.role IN ('super_admin', 'admin', 'general_manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.role IN ('super_admin', 'admin', 'general_manager')
  ));

-- سياسات قراءة الأدوار
CREATE POLICY "Staff can view department roles"
  ON department_roles FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM department_staff_assignments dsa
    JOIN platform_staff ps ON ps.id = dsa.staff_id
    WHERE dsa.department_id = department_roles.department_id
    AND ps.user_id = auth.uid()
  ));
