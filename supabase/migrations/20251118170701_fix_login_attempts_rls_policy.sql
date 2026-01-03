/*
  # إصلاح سياسات RLS لجدول login_attempts
  
  1. التغييرات
    - إضافة سياسة للسماح بإدراج محاولات تسجيل الدخول
    - السماح للمستخدمين غير المسجلين (anon) بتسجيل المحاولات
  
  2. الأمان
    - السياسة محدودة فقط للإدراج (INSERT)
    - متاحة للجميع (anon + authenticated)
*/

-- إضافة سياسة للسماح بتسجيل محاولات الدخول
DROP POLICY IF EXISTS "Allow insert login attempts" ON login_attempts;

CREATE POLICY "Allow insert login attempts"
  ON login_attempts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);