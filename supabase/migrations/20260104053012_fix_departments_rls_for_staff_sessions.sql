/*
  # إصلاح RLS للأقسام لجلسات الموظفين

  المشكلة:
  - الموظفون الذين يدخلون عبر QR/PIN ليس لديهم auth.uid()
  - لا يمكنهم قراءة الأقسام بسبب RLS policies
  - القسم يُنشأ بنجاح لكن لا يظهر في القائمة

  الحل:
  - إضافة policy تسمح بقراءة الأقسام النشطة للجميع
  - السماح للموظفين بالإدارة بناءً على platform_staff
*/

-- حذف الـ policy القديمة التي تتطلب authenticated
DROP POLICY IF EXISTS "Staff can view active departments" ON platform_departments;

-- إضافة policy جديدة تسمح للجميع بقراءة الأقسام النشطة
CREATE POLICY "Anyone can view active departments"
  ON platform_departments
  FOR SELECT
  USING (is_active = true);

-- تحديث policy الإدارة لتعمل مع session_storage
DROP POLICY IF EXISTS "Admins can manage departments" ON platform_departments;

CREATE POLICY "Platform staff can manage departments"
  ON platform_departments
  FOR ALL
  USING (
    -- يسمح للموظفين بالإدارة إذا كانوا في platform_staff
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.id = current_setting('app.current_staff_id', true)::uuid
        AND ps.role IN ('super_admin', 'admin', 'general_manager')
        AND ps.is_active = true
    )
    OR
    -- أو إذا كان لديهم user_id و role مناسب
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.user_id = auth.uid()
        AND ps.role IN ('super_admin', 'admin', 'general_manager')
        AND ps.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.id = current_setting('app.current_staff_id', true)::uuid
        AND ps.role IN ('super_admin', 'admin', 'general_manager')
        AND ps.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.user_id = auth.uid()
        AND ps.role IN ('super_admin', 'admin', 'general_manager')
        AND ps.is_active = true
    )
  );
