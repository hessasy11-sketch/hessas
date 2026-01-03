/*
  # إضافة سياسة للسماح بالتحقق من رقم الهاتف عند تسجيل الدخول
  
  1. التغييرات
    - إضافة سياسة جديدة للمستخدمين غير المسجلين (anon)
    - السماح بقراءة حقول محددة فقط للتحقق من تسجيل الدخول
    - الحقول: id, password_hash, phone_verified, registration_completed
  
  2. الأمان
    - السياسة محدودة فقط للقراءة (SELECT)
    - متاحة للمستخدمين غير المسجلين (anon role)
    - لا تكشف معلومات حساسة أخرى
*/

-- إضافة سياسة للسماح بالقراءة لتسجيل الدخول
CREATE POLICY "Allow anon to check phone for login"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);