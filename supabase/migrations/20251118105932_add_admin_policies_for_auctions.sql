/*
  # إضافة صلاحيات المسؤولين لإدارة المزادات
  
  1. التغييرات
    - إضافة سياسة تحديث للمسؤولين
    - إضافة سياسة حذف للمسؤولين
    
  2. الأمان
    - التحقق من user_type = 'admin' من جدول profiles
    - السماح بالتعديل والحذف فقط للمسؤولين
*/

-- حذف السياسات القديمة إذا كانت موجودة
DROP POLICY IF EXISTS "Admins can update any auction" ON auctions;
DROP POLICY IF EXISTS "Admins can delete any auction" ON auctions;

-- سياسة تحديث المزادات للمسؤولين
CREATE POLICY "Admins can update any auction"
  ON auctions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- سياسة حذف المزادات للمسؤولين
CREATE POLICY "Admins can delete any auction"
  ON auctions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );
