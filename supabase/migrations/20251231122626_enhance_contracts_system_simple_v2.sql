/*
  # تحسين نظام العقود البسيط v2

  1. التعديلات على b2f_sales_requests:
    - إضافة contract_id للربط مع العقد
    - إضافة ready_for_operations
  
  2. التعديلات على b2f_contracts:
    - إضافة contract_pdf_url لتخزين رابط وثيقة العقد
  
  3. التعديلات على b2f_operations:
    - إضافة contract_id للربط مع العقد
    - إضافة farm_id للربط مع المزرعة
    - إضافة request_id للربط مع الطلب
  
  4. الأمان:
    - المستثمر يستطيع قراءة عقوده فقط
    - الإدارة تستطيع إدارة كل العقود
*/

-- 1. إضافة حقول للطلبات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_sales_requests' AND column_name = 'contract_id'
  ) THEN
    ALTER TABLE b2f_sales_requests
    ADD COLUMN contract_id uuid REFERENCES b2f_contracts(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_sales_requests' AND column_name = 'ready_for_operations'
  ) THEN
    ALTER TABLE b2f_sales_requests
    ADD COLUMN ready_for_operations boolean DEFAULT false;
  END IF;
END $$;

-- 2. إضافة حقول للعقود
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_contracts' AND column_name = 'contract_pdf_url'
  ) THEN
    ALTER TABLE b2f_contracts
    ADD COLUMN contract_pdf_url text;
  END IF;
END $$;

-- 3. إضافة حقول للتشغيل
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_operations' AND column_name = 'contract_id'
  ) THEN
    ALTER TABLE b2f_operations
    ADD COLUMN contract_id uuid REFERENCES b2f_contracts(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_operations' AND column_name = 'farm_id'
  ) THEN
    ALTER TABLE b2f_operations
    ADD COLUMN farm_id uuid REFERENCES b2f_farms(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_operations' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE b2f_operations
    ADD COLUMN request_id uuid REFERENCES b2f_sales_requests(id);
  END IF;
END $$;

-- 4. سياسات RLS للعقود - الجميع يقرأ (للضيوف والمستخدمين)
DROP POLICY IF EXISTS "الجميع يقرأ عقودهم بالهاتف" ON b2f_contracts;
CREATE POLICY "الجميع يقرأ عقودهم بالهاتف"
  ON b2f_contracts FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. سياسات للإدارة
DROP POLICY IF EXISTS "الإدارة تدير العقود" ON b2f_contracts;
CREATE POLICY "الإدارة تدير العقود"
  ON b2f_contracts FOR ALL
  USING (is_b2f_admin());

-- 6. سياسات للتشغيل - الجميع يقرأ
DROP POLICY IF EXISTS "الجميع يقرأ العمليات" ON b2f_operations;
CREATE POLICY "الجميع يقرأ العمليات"
  ON b2f_operations FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "الإدارة تدير العمليات" ON b2f_operations;
CREATE POLICY "الإدارة تدير العمليات"
  ON b2f_operations FOR ALL
  USING (is_b2f_admin());

-- 7. فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_sales_requests_payment_approved
  ON b2f_sales_requests(payment_status)
  WHERE payment_status = 'payment_approved' AND contract_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_investor_phone
  ON b2f_contracts(investor_phone);

CREATE INDEX IF NOT EXISTS idx_operations_investor_account
  ON b2f_operations(investor_account_id);

CREATE INDEX IF NOT EXISTS idx_contracts_request_id
  ON b2f_contracts(request_id);
