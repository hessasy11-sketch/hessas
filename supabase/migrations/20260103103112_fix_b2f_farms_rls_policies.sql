/*
  # إصلاح سياسات RLS لجدول b2f_farms
  
  1. المشكلة:
    - السياسات الحالية تتطلب authenticated فقط
    - المسؤولون يدخلون عبر session وليس auth
    - لا توجد سياسة واضحة للإدارة
  
  2. الحل:
    - إضافة سياسات للمسؤولين (platform_staff)
    - إضافة سياسات للـ service_role
    - تبسيط السياسات الحالية
  
  3. الصلاحيات:
    - platform_owner: كل الصلاحيات
    - platform_admin: كل الصلاحيات على المزارع
    - authenticated: قراءة فقط
    - anon: قراءة المزارع النشطة فقط
*/

-- حذف السياسات المكررة والقديمة
DROP POLICY IF EXISTS "Authenticated users can manage farms" ON b2f_farms;
DROP POLICY IF EXISTS "Platform owner full access" ON b2f_farms;
DROP POLICY IF EXISTS "Platform owner has full access to farms" ON b2f_farms;
DROP POLICY IF EXISTS "Service role can manage all farms" ON b2f_farms;
DROP POLICY IF EXISTS "Anyone can view active farms" ON b2f_farms;

-- سياسة 1: Platform owners لديهم كل الصلاحيات
CREATE POLICY "Platform owners full access to farms"
  ON b2f_farms
  FOR ALL
  TO public
  USING (is_platform_owner())
  WITH CHECK (is_platform_owner());

-- سياسة 2: Platform admins لديهم كل الصلاحيات
CREATE POLICY "Platform admins can manage farms"
  ON b2f_farms
  FOR ALL
  TO public
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- سياسة 3: Service role لديه كل الصلاحيات
CREATE POLICY "Service role full access to farms"
  ON b2f_farms
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- سياسة 4: Authenticated users يمكنهم القراءة فقط
CREATE POLICY "Authenticated users can view all farms"
  ON b2f_farms
  FOR SELECT
  TO authenticated
  USING (true);

-- سياسة 5: Anonymous يمكنهم مشاهدة المزارع النشطة فقط
CREATE POLICY "Anonymous can view active farms"
  ON b2f_farms
  FOR SELECT
  TO anon
  USING (is_active = true);

-- سياسة 6: Authenticated users with platform role can manage
CREATE POLICY "Staff with platform role can manage farms"
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

-- إنشاء index للأداء
CREATE INDEX IF NOT EXISTS idx_b2f_farms_is_active 
  ON b2f_farms(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_b2f_farms_created_at 
  ON b2f_farms(created_at DESC);
