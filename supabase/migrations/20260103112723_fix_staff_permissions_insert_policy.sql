/*
  # إصلاح سياسات إضافة الصلاحيات

  1. المشكلة:
    - لا توجد سياسة INSERT للمستخدمين المصادقين في staff_permissions
    - فقط service_role يمكنه الإضافة

  2. الحل:
    - إضافة سياسة INSERT للمستخدمين المصادقين

  3. Security:
    - السماح للمستخدمين المصادقين بإضافة صلاحيات
*/

-- إضافة سياسة INSERT للمستخدمين المصادقين
CREATE POLICY "Authenticated users can insert permissions"
  ON staff_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- إضافة سياسة UPDATE للمستخدمين المصادقين
CREATE POLICY "Authenticated users can update permissions"
  ON staff_permissions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- إضافة سياسة DELETE للمستخدمين المصادقين
CREATE POLICY "Authenticated users can delete permissions"
  ON staff_permissions
  FOR DELETE
  TO authenticated
  USING (true);

-- تعليق
COMMENT ON TABLE staff_permissions IS 'صلاحيات الموظفين - سياسات RLS مفعلة للقراءة والكتابة';
