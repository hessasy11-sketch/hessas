/*
  # إصلاح سياسات RLS لجدول investment_reservations

  ## التغييرات
  1. إزالة السياسات القديمة المحدودة
  2. إضافة سياسات جديدة تسمح لـ anon و authenticated بالتحديث والحذف
  
  ## السياسات الجديدة
  - السماح لـ anon و authenticated بتحديث الحجوزات
  - السماح لـ anon و authenticated بحذف الحجوزات
  
  ## الأمان
  - السياسات تسمح بالعمليات الإدارية الأساسية
  - RLS لا يزال مفعلاً
*/

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can update reservations" ON investment_reservations;
DROP POLICY IF EXISTS "Authenticated users can delete reservations" ON investment_reservations;

-- Create new policies that allow both anon and authenticated
CREATE POLICY "Allow anon and authenticated to update reservations"
  ON investment_reservations
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon and authenticated to delete reservations"
  ON investment_reservations
  FOR DELETE
  TO anon, authenticated
  USING (true);
