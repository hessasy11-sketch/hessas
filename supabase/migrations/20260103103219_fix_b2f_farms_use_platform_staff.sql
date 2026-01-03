/*
  # إصلاح سياسات b2f_farms لاستخدام platform_staff
  
  1. المشكلة:
    - الدوال is_platform_admin() و is_platform_owner() تبحث في platform_administrators
    - لكن المسؤولين الفعليين في platform_staff
    - النتيجة: لا أحد يمكنه إضافة أو حذف المزارع
  
  2. الحل:
    - تحديث السياسات لاستخدام platform_staff مباشرة
    - إزالة الاعتماد على الدوال القديمة
    - إضافة سياسات بسيطة وواضحة
*/

-- حذف جميع السياسات القديمة
DROP POLICY IF EXISTS "Platform owners full access to farms" ON b2f_farms;
DROP POLICY IF EXISTS "Platform admins can manage farms" ON b2f_farms;
DROP POLICY IF EXISTS "Service role full access to farms" ON b2f_farms;
DROP POLICY IF EXISTS "Authenticated users can view all farms" ON b2f_farms;
DROP POLICY IF EXISTS "Anonymous can view active farms" ON b2f_farms;
DROP POLICY IF EXISTS "Staff with platform role can manage farms" ON b2f_farms;

-- سياسة 1: موظفو المنصة النشطون لديهم كل الصلاحيات
CREATE POLICY "Active platform staff full access"
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

-- سياسة 2: Service role لديه كل الصلاحيات
CREATE POLICY "Service role full access"
  ON b2f_farms
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- سياسة 3: المستخدمون المصادق عليهم يمكنهم القراءة
CREATE POLICY "Authenticated read access"
  ON b2f_farms
  FOR SELECT
  TO authenticated
  USING (true);

-- سياسة 4: الزوار يمكنهم مشاهدة المزارع النشطة فقط
CREATE POLICY "Public read active farms"
  ON b2f_farms
  FOR SELECT
  TO anon
  USING (is_active = true);

-- سياسة 5: platform_administrators أيضاً (للتوافق مع النظام القديم)
CREATE POLICY "Platform administrators full access"
  ON b2f_farms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_administrators
      WHERE platform_administrators.user_id = auth.uid()
      AND platform_administrators.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_administrators
      WHERE platform_administrators.user_id = auth.uid()
      AND platform_administrators.is_active = true
    )
  );
