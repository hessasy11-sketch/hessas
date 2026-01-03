/*
  # إصلاح سياسة إضافة المزارع
  
  1. المشكلة
    - لا توجد سياسة INSERT واضحة للمسؤولين المصادق عليهم
    - المستخدمون المسجلون لا يستطيعون إضافة مزارع
    
  2. الحل
    - إضافة سياسة شاملة للمسؤولين والموظفين
    - استخدام دالة is_platform_admin() للتحقق من الصلاحيات
    - السماح أيضاً للمستخدمين الذين لديهم دور platform_owner
    
  3. الأمان
    - فقط المسؤولون والموظفون النشطون يمكنهم إدارة المزارع
    - المستخدمون العاديون لا يمكنهم إنشاء مزارع
*/

-- حذف السياسات القديمة للمسؤولين والموظفين
DROP POLICY IF EXISTS "Platform administrators full access" ON b2f_farms;
DROP POLICY IF EXISTS "Active platform staff full access" ON b2f_farms;

-- سياسة شاملة للمسؤولين
CREATE POLICY "Platform admins can manage all farms"
  ON b2f_farms
  FOR ALL
  TO authenticated
  USING (
    is_platform_admin() = true
    OR is_platform_owner() = true
  )
  WITH CHECK (
    is_platform_admin() = true
    OR is_platform_owner() = true
  );

-- سياسة للموظفين النشطين
CREATE POLICY "Active staff can manage farms"
  ON b2f_farms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.is_active = true
    )
  );
