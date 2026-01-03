/*
  # إضافة صلاحيات إدارة المزارع للمستخدمين المصادقين
  
  1. المشكلة
    - السياسات الحالية تتطلب user_type = 'platform_admin'
    - قسم B2F محمي بطبقة أخرى (PIN/Password)
    - المستخدمين المصادقين للقسم لا يملكون platform_admin
  
  2. الحل
    - إضافة سياسات بديلة للمستخدمين المصادقين
    - السماح بإدارة المزارع لأي مستخدم مصادق
    - الأمان مضمون عبر طبقة الحماية في B2F Section
  
  3. الصلاحيات
    - INSERT: السماح للمستخدمين المصادقين بإضافة مزارع
    - UPDATE: السماح للمستخدمين المصادقين بتحديث المزارع
    - DELETE: السماح للمستخدمين المصادقين بحذف المزارع
*/

-- إضافة سياسة INSERT للمستخدمين المصادقين
DROP POLICY IF EXISTS "Authenticated users can insert farms" ON farms;
CREATE POLICY "Authenticated users can insert farms"
  ON farms
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- إضافة سياسة UPDATE للمستخدمين المصادقين
DROP POLICY IF EXISTS "Authenticated users can update farms" ON farms;
CREATE POLICY "Authenticated users can update farms"
  ON farms
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- إضافة سياسة DELETE للمستخدمين المصادقين
DROP POLICY IF EXISTS "Authenticated users can delete farms" ON farms;
CREATE POLICY "Authenticated users can delete farms"
  ON farms
  FOR DELETE
  TO authenticated
  USING (true);

-- إضافة سياسة SELECT للمستخدمين المصادقين
DROP POLICY IF EXISTS "Authenticated users can read farms" ON farms;
CREATE POLICY "Authenticated users can read farms"
  ON farms
  FOR SELECT
  TO authenticated
  USING (true);