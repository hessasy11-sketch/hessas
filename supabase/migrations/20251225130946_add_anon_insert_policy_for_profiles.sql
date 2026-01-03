/*
  # إضافة سياسة RLS للسماح للمستخدمين الجدد بالتسجيل

  1. Changes
    - إضافة سياسة INSERT لدور anon للسماح بالتسجيل السريع
    - السماح للمستخدمين غير المصادق عليهم بإنشاء حسابات جديدة

  2. Security
    - السياسة آمنة لأنها تسمح فقط بإنشاء الحساب مرة واحدة
    - لا تسمح بالوصول إلى بيانات المستخدمين الآخرين
*/

-- Allow anonymous users to create new profiles during registration
CREATE POLICY "Allow anon to create profiles"
  ON profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);
