/*
  # تبسيط سياسات RLS لجدول platform_staff

  1. Changes:
    - حذف جميع السياسات المتضاربة
    - إنشاء سياسات بسيطة وواضحة
    - السماح بالقراءة للجميع
    - السماح بالكتابة للمستخدمين المصادقين

  2. Security:
    - القراءة متاحة للجميع
    - الإدراج والتحديث والحذف يتطلب مصادقة
*/

-- حذف جميع السياسات الموجودة
DROP POLICY IF EXISTS "Anyone can view platform staff" ON platform_staff;
DROP POLICY IF EXISTS "Platform admins and super admin staff can view" ON platform_staff;
DROP POLICY IF EXISTS "Platform admins and super admin staff can insert" ON platform_staff;
DROP POLICY IF EXISTS "Service role and admins can insert staff" ON platform_staff;
DROP POLICY IF EXISTS "Service role can insert staff" ON platform_staff;
DROP POLICY IF EXISTS "Platform admins and super admin staff can update" ON platform_staff;
DROP POLICY IF EXISTS "Service role can update staff" ON platform_staff;
DROP POLICY IF EXISTS "Platform admins and super admin staff can delete" ON platform_staff;
DROP POLICY IF EXISTS "Service role can delete staff" ON platform_staff;
DROP POLICY IF EXISTS "Service role can read staff" ON platform_staff;
DROP POLICY IF EXISTS "Platform owner full access" ON platform_staff;
DROP POLICY IF EXISTS "Platform owner has full access to staff" ON platform_staff;
DROP POLICY IF EXISTS "Authenticated users can insert staff" ON platform_staff;

-- إنشاء سياسات بسيطة وواضحة
CREATE POLICY "Enable read access for all users"
  ON platform_staff
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON platform_staff
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON platform_staff
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON platform_staff
  FOR DELETE
  TO authenticated
  USING (true);

-- سياسات خاصة بـ service_role
CREATE POLICY "Service role full access"
  ON platform_staff
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
