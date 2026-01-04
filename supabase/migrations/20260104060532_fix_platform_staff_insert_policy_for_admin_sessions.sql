/*
  # إصلاح سياسة إدراج الموظفين للمسؤولين

  1. Changes
    - إزالة السياسة المتعارضة للإدراج
    - إضافة سياسة جديدة تسمح للـ anon والـ authenticated بإدراج موظفين جدد
    - هذا يحل مشكلة جلسات QR/PIN للمسؤولين
*/

-- حذف السياسات المتعارضة
DROP POLICY IF EXISTS "Admins can create new staff" ON platform_staff;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON platform_staff;

-- سياسة جديدة تسمح لأي شخص بإنشاء موظفين
CREATE POLICY "Allow insert for platform staff"
  ON platform_staff
  FOR INSERT
  TO public
  WITH CHECK (true);
