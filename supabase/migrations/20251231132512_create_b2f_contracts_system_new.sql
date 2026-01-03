/*
  # نظام العقود وأوامر التشغيل الجديد - B2F

  1. الجداول الجديدة
    - `b2f_contracts` - جدول العقود
      - رقم العقد، رقم الطلب، المستثمر، المزرعة
      - عدد الأشجار، القيمة، النوع
      - تواريخ البداية والنهاية
      - الحالة (active / archived / cancelled)
      - رابط الوثيقة
      
    - `b2f_operations_orders` - أوامر التشغيل
      - رقم الأمر، رقم العقد
      - المستثمر، المزرعة، عدد الأشجار
      - الحالة (pending_start / in_progress / harvest_ready / completed)
      - ملاحظات التشغيل
  
  2. الدوال المساعدة
    - توليد رقم عقد فريد
    - إصدار عقود تلقائية
    
  3. الأمان
    - RLS للإدارة والمستثمرين
    - المستثمرون يرون عقودهم فقط
    - الإدارة ترى كل شيء
*/

-- =====================================================
-- جدول العقود الجديد
-- =====================================================
CREATE TABLE IF NOT EXISTS b2f_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,
  sales_request_id uuid REFERENCES b2f_sales_requests(id) ON DELETE CASCADE,
  investor_id uuid REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  investor_phone text NOT NULL,
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES b2f_opportunities(id) ON DELETE SET NULL,
  trees_count integer NOT NULL DEFAULT 0,
  amount_total numeric(12,2) NOT NULL DEFAULT 0,
  contract_type text NOT NULL DEFAULT 'استثمار نخيل',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'cancelled')),
  document_url text,
  created_at timestamptz DEFAULT now(),
  archived_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- جدول أوامر التشغيل
-- =====================================================
CREATE TABLE IF NOT EXISTS b2f_operations_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES b2f_contracts(id) ON DELETE CASCADE,
  investor_id uuid REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  investor_phone text NOT NULL,
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES b2f_opportunities(id) ON DELETE SET NULL,
  trees_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_start' 
    CHECK (status IN ('pending_start', 'in_progress', 'harvest_ready', 'completed')),
  last_update timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- الفهارس
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_contracts_investor ON b2f_contracts(investor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_phone ON b2f_contracts(investor_phone);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON b2f_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_sales_request ON b2f_contracts(sales_request_id);

CREATE INDEX IF NOT EXISTS idx_operations_contract ON b2f_operations_orders(contract_id);
CREATE INDEX IF NOT EXISTS idx_operations_investor ON b2f_operations_orders(investor_id);
CREATE INDEX IF NOT EXISTS idx_operations_status ON b2f_operations_orders(status);

-- =====================================================
-- دالة توليد رقم عقد فريد
-- =====================================================
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  year_suffix text;
  counter integer;
  new_number text;
BEGIN
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 5) AS integer)), 0) + 1
  INTO counter
  FROM b2f_contracts
  WHERE contract_number LIKE 'CT' || year_suffix || '%';
  
  new_number := 'CT' || year_suffix || LPAD(counter::text, 6, '0');
  
  RETURN new_number;
END;
$$;

-- =====================================================
-- دالة إصدار عقد تلقائي
-- =====================================================
CREATE OR REPLACE FUNCTION issue_contract_for_request(request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract_id uuid;
  v_contract_number text;
  v_request b2f_sales_requests%ROWTYPE;
  v_opportunity b2f_opportunities%ROWTYPE;
  v_farm b2f_farms%ROWTYPE;
BEGIN
  -- جلب بيانات الطلب
  SELECT * INTO v_request
  FROM b2f_sales_requests
  WHERE id = request_id AND payment_status = 'payment_approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not approved for payment';
  END IF;
  
  -- التحقق من عدم وجود عقد مسبقاً
  IF EXISTS (SELECT 1 FROM b2f_contracts WHERE sales_request_id = request_id) THEN
    RAISE EXCEPTION 'Contract already exists for this request';
  END IF;
  
  -- جلب بيانات العرض والمزرعة
  SELECT * INTO v_opportunity FROM b2f_opportunities WHERE id = v_request.opportunity_id;
  SELECT * INTO v_farm FROM b2f_farms WHERE id = v_opportunity.farm_id;
  
  -- توليد رقم العقد
  v_contract_number := generate_contract_number();
  
  -- إنشاء العقد
  INSERT INTO b2f_contracts (
    contract_number,
    sales_request_id,
    investor_id,
    investor_phone,
    farm_id,
    opportunity_id,
    trees_count,
    amount_total,
    contract_type,
    start_date,
    end_date,
    status
  ) VALUES (
    v_contract_number,
    request_id,
    v_request.investor_account_id,
    v_request.investor_phone,
    v_opportunity.farm_id,
    v_request.opportunity_id,
    v_request.trees_count,
    v_request.amount_total,
    v_opportunity.category,
    now(),
    now() + interval '1 year',
    'active'
  )
  RETURNING id INTO v_contract_id;
  
  -- إنشاء أمر تشغيل
  INSERT INTO b2f_operations_orders (
    contract_id,
    investor_id,
    investor_phone,
    farm_id,
    opportunity_id,
    trees_count,
    status
  ) VALUES (
    v_contract_id,
    v_request.investor_account_id,
    v_request.investor_phone,
    v_opportunity.farm_id,
    v_request.opportunity_id,
    v_request.trees_count,
    'pending_start'
  );
  
  -- إشعار للمستثمر
  INSERT INTO b2f_notifications (
    investor_phone,
    type,
    title,
    message
  ) VALUES (
    v_request.investor_phone,
    'contract_issued',
    'تم إصدار عقد استثمار جديد',
    'تم إصدار عقد استثمار جديد رقم ' || v_contract_number || '، يمكنك الاطلاع عليه من تبويب (عقودي) في حسابك.'
  );
  
  RETURN v_contract_id;
END;
$$;

-- =====================================================
-- دالة إصدار عقود متعددة
-- =====================================================
CREATE OR REPLACE FUNCTION issue_multiple_contracts(request_ids uuid[])
RETURNS TABLE(request_id uuid, contract_id uuid, success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req_id uuid;
  con_id uuid;
BEGIN
  FOREACH req_id IN ARRAY request_ids
  LOOP
    BEGIN
      con_id := issue_contract_for_request(req_id);
      RETURN QUERY SELECT req_id, con_id, true, NULL::text;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT req_id, NULL::uuid, false, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- =====================================================
-- دالة أرشفة عقد
-- =====================================================
CREATE OR REPLACE FUNCTION archive_contract(p_contract_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE b2f_contracts
  SET status = 'archived',
      archived_at = now(),
      updated_at = now()
  WHERE id = p_contract_id;
  
  UPDATE b2f_operations_orders
  SET status = 'completed',
      updated_at = now()
  WHERE contract_id = p_contract_id;
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- RLS - تفعيل الأمان
-- =====================================================
ALTER TABLE b2f_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_operations_orders ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS - سياسات العقود
-- =====================================================

-- الإدارة: قراءة كل العقود
CREATE POLICY "Admin can view all contracts"
  ON b2f_contracts FOR SELECT
  TO authenticated
  USING (is_b2f_admin());

-- الإدارة: إدارة كاملة
CREATE POLICY "Admin can manage contracts"
  ON b2f_contracts FOR ALL
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

-- المستثمرون: قراءة عقودهم فقط
CREATE POLICY "Investors can view own contracts by phone"
  ON b2f_contracts FOR SELECT
  TO anon, authenticated
  USING (
    investor_phone IN (
      SELECT contact_phone FROM b2f_investor_accounts
      WHERE contact_phone = investor_phone
    )
  );

-- =====================================================
-- RLS - سياسات أوامر التشغيل
-- =====================================================

-- الإدارة: قراءة كل الأوامر
CREATE POLICY "Admin can view all operations orders"
  ON b2f_operations_orders FOR SELECT
  TO authenticated
  USING (is_b2f_admin());

-- الإدارة: إدارة كاملة
CREATE POLICY "Admin can manage operations orders"
  ON b2f_operations_orders FOR ALL
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

-- المستثمرون: قراءة أوامرهم فقط
CREATE POLICY "Investors can view own operations orders"
  ON b2f_operations_orders FOR SELECT
  TO anon, authenticated
  USING (
    investor_phone IN (
      SELECT contact_phone FROM b2f_investor_accounts
      WHERE contact_phone = investor_phone
    )
  );
