/*
  # تحديث جميع سياسات الأدمن لاستخدام is_b2f_admin function

  ## السبب
  - توجد 5 جداول أخرى تستخدم EXISTS مباشر للتحقق من b2f_admin_users
  - هذا قد يسبب نفس مشكلة infinite recursion في المستقبل
  - نحتاج لتوحيد الطريقة واستخدام is_b2f_admin() function في كل مكان

  ## الجداول المتأثرة
  1. b2f_duplicate_receipts
  2. b2f_investment_groups
  3. b2f_invoices
  4. b2f_status_audit_log
  5. وأي جدول آخر يستخدم نفس الطريقة

  ## التحديثات
  - حذف السياسات القديمة
  - إنشاء سياسات جديدة تستخدم is_b2f_admin()
*/

-- ========================================
-- b2f_duplicate_receipts
-- ========================================
DROP POLICY IF EXISTS "Admins can manage duplicate receipts" ON b2f_duplicate_receipts;
DROP POLICY IF EXISTS "Admins can view duplicate receipts" ON b2f_duplicate_receipts;

CREATE POLICY "Admins can view duplicate receipts"
  ON b2f_duplicate_receipts
  FOR SELECT
  TO authenticated
  USING (is_b2f_admin());

CREATE POLICY "Admins can manage duplicate receipts"
  ON b2f_duplicate_receipts
  FOR ALL
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

-- ========================================
-- b2f_investment_groups
-- ========================================
DROP POLICY IF EXISTS "Admins can manage groups" ON b2f_investment_groups;

CREATE POLICY "Admins can manage groups"
  ON b2f_investment_groups
  FOR ALL
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

-- ========================================
-- b2f_invoices
-- ========================================
DROP POLICY IF EXISTS "Admins can manage invoices" ON b2f_invoices;

CREATE POLICY "Admins can manage invoices"
  ON b2f_invoices
  FOR ALL
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

-- ========================================
-- b2f_status_audit_log
-- ========================================
DROP POLICY IF EXISTS "Admins can view audit log" ON b2f_status_audit_log;

CREATE POLICY "Admins can view audit log"
  ON b2f_status_audit_log
  FOR SELECT
  TO authenticated
  USING (is_b2f_admin());

-- ========================================
-- تحديث جميع الجداول الأخرى التي قد تتأثر
-- ========================================

-- b2f_farms
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'b2f_farms' 
    AND qual LIKE '%b2f_admin_users%'
    AND qual NOT LIKE '%is_b2f_admin%'
  ) THEN
    DROP POLICY IF EXISTS "Admins have full access to farms" ON b2f_farms;
    
    CREATE POLICY "Admins have full access to farms"
      ON b2f_farms
      FOR ALL
      TO authenticated
      USING (is_b2f_admin())
      WITH CHECK (is_b2f_admin());
  END IF;
END $$;

-- b2f_opportunities
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'b2f_opportunities' 
    AND qual LIKE '%b2f_admin_users%'
    AND qual NOT LIKE '%is_b2f_admin%'
  ) THEN
    DROP POLICY IF EXISTS "Admins have full access to opportunities" ON b2f_opportunities;
    
    CREATE POLICY "Admins have full access to opportunities"
      ON b2f_opportunities
      FOR ALL
      TO authenticated
      USING (is_b2f_admin())
      WITH CHECK (is_b2f_admin());
  END IF;
END $$;

-- b2f_settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'b2f_settings' 
    AND (qual LIKE '%b2f_admin_users%' OR with_check LIKE '%b2f_admin_users%')
    AND (qual NOT LIKE '%is_b2f_admin%' AND with_check NOT LIKE '%is_b2f_admin%')
  ) THEN
    DROP POLICY IF EXISTS "Admins can manage settings" ON b2f_settings;
    
    CREATE POLICY "Admins can manage settings"
      ON b2f_settings
      FOR ALL
      TO authenticated
      USING (is_b2f_admin())
      WITH CHECK (is_b2f_admin());
  END IF;
END $$;

-- إضافة comment للتوثيق
COMMENT ON FUNCTION is_b2f_admin IS 'Centralized admin check function. All admin RLS policies should use this function instead of direct EXISTS queries to avoid infinite recursion.';
