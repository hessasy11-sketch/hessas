/*
  # السماح للإداريين بإنشاء موظفين جدد

  1. إضافة سياسة للسماح للإداريين بإدراج موظفين جدد في platform_staff
*/

-- السماح للإداريين بإنشاء موظفين جدد
CREATE POLICY "Admins can create new staff"
  ON platform_staff FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.role IN ('super_admin', 'admin', 'general_manager')
  ));
