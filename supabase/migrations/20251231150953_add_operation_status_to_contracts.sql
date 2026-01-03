/*
  # إضافة حالة التشغيل للعقود والمزارع

  1. التغييرات
    - إضافة حقل `operation_status` إلى جدول `b2f_contracts`
    - إضافة حقل `operation_status` إلى جدول `b2f_farm_wallets`
    - القيم المسموحة: pending_start, in_progress, harvest_ready, completed
    
  2. الفهرسة
    - فهرس على operation_status للاستعلامات السريعة
    
  3. القيمة الافتراضية
    - pending_start للعقود الجديدة
    - null للمزارع (تُحدد يدوياً)
*/

-- 1. إضافة حقل operation_status إلى b2f_contracts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_contracts' AND column_name = 'operation_status'
  ) THEN
    ALTER TABLE b2f_contracts 
    ADD COLUMN operation_status text 
    CHECK (operation_status IN ('pending_start', 'in_progress', 'harvest_ready', 'completed'))
    DEFAULT 'pending_start';
    
    COMMENT ON COLUMN b2f_contracts.operation_status IS 
    'حالة التشغيل للعقد: pending_start (في انتظار البدء), in_progress (قيد التشغيل), harvest_ready (جاهز للحصاد), completed (مكتمل)';
  END IF;
END $$;

-- 2. إضافة حقل operation_status إلى b2f_farm_wallets
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_farm_wallets' AND column_name = 'operation_status'
  ) THEN
    ALTER TABLE b2f_farm_wallets 
    ADD COLUMN operation_status text 
    CHECK (operation_status IN ('pending_start', 'in_progress', 'harvest_ready', 'completed'));
    
    COMMENT ON COLUMN b2f_farm_wallets.operation_status IS 
    'حالة التشغيل العامة للمزرعة: pending_start (في انتظار البدء), in_progress (قيد التشغيل), harvest_ready (جاهز للحصاد), completed (مكتمل)';
  END IF;
END $$;

-- 3. إضافة فهرس على operation_status في b2f_contracts
CREATE INDEX IF NOT EXISTS idx_b2f_contracts_operation_status 
ON b2f_contracts(operation_status) 
WHERE operation_status IS NOT NULL;

-- 4. إضافة فهرس على operation_status في b2f_farm_wallets
CREATE INDEX IF NOT EXISTS idx_b2f_farm_wallets_operation_status 
ON b2f_farm_wallets(operation_status) 
WHERE operation_status IS NOT NULL;

-- 5. تحديث العقود الموجودة
UPDATE b2f_contracts
SET operation_status = 'pending_start'
WHERE operation_status IS NULL;

-- 6. تحديث RLS policies لـ b2f_contracts (للسماح بتحديث operation_status)
DROP POLICY IF EXISTS "Admins can update contracts" ON b2f_contracts;
CREATE POLICY "Admins can update contracts"
ON b2f_contracts FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM b2f_admin_users
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM b2f_admin_users
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 7. تحديث RLS policies لـ b2f_farm_wallets (للسماح بتحديث operation_status)
DROP POLICY IF EXISTS "Admins can update farm wallets" ON b2f_farm_wallets;
CREATE POLICY "Admins can update farm wallets"
ON b2f_farm_wallets FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM b2f_admin_users
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM b2f_admin_users
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);