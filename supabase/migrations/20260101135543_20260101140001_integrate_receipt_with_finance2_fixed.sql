/*
  # ربط نظام رفع الإيصالات مع مالية 2 - نسخة محسنة

  ## التغييرات الرئيسية

  ### 1. تحديث جدول الفواتير
  - إضافة حقل status لتتبع حالة الفاتورة
  
  ### 2. إنشاء جدول سجل العمليات المالية
  
  ### 3. إنشاء دوال للعمليات الأساسية
  - رفع الإيصال
  - اعتماد السداد
  - رفض السداد
  
  ### 4. إنشاء Views محسنة
*/

-- ========================================
-- 1. تحديث جدول الفواتير
-- ========================================

-- إضافة عمود الحالة
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_invoices' AND column_name = 'status'
  ) THEN
    ALTER TABLE b2f_invoices ADD COLUMN status TEXT DEFAULT 'unpaid';
  END IF;
END $$;

-- إضافة updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_invoices' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE b2f_invoices ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- إضافة قيود الحالة
ALTER TABLE b2f_invoices DROP CONSTRAINT IF EXISTS b2f_invoices_status_check;
ALTER TABLE b2f_invoices 
ADD CONSTRAINT b2f_invoices_status_check 
CHECK (status IN (
  'unpaid',                    -- غير مدفوعة
  'pending_review',            -- قيد المراجعة
  'payment_rejected',          -- سداد مرفوض
  'paid',                      -- مدفوعة
  'cancelled'                  -- ملغاة
));

-- ========================================
-- 2. تحديث جدول معاملات الدفع
-- ========================================

ALTER TABLE b2f_payment_transactions DROP CONSTRAINT IF EXISTS b2f_payment_transactions_status_check;
ALTER TABLE b2f_payment_transactions 
ADD CONSTRAINT b2f_payment_transactions_status_check 
CHECK (status IN (
  'pending',              -- قيد الانتظار
  'under_review',         -- قيد المراجعة
  'approved',             -- معتمد
  'rejected',             -- مرفوض
  'cancelled'             -- ملغى
));

-- ========================================
-- 3. إنشاء جدول سجل العمليات المالية
-- ========================================

CREATE TABLE IF NOT EXISTS b2f_financial_operations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  invoice_id UUID,
  transaction_id UUID,
  sales_request_id UUID,
  performed_by TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_log_operation ON b2f_financial_operations_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_financial_log_created ON b2f_financial_operations_log(created_at DESC);

ALTER TABLE b2f_financial_operations_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "إدارة B2F تستطيع قراءة سجل العمليات" ON b2f_financial_operations_log;
CREATE POLICY "إدارة B2F تستطيع قراءة سجل العمليات"
  ON b2f_financial_operations_log FOR SELECT
  TO authenticated
  USING (is_b2f_admin());

DROP POLICY IF EXISTS "النظام يستطيع إدراج سجلات العمليات" ON b2f_financial_operations_log;
CREATE POLICY "النظام يستطيع إدراج سجلات العمليات"
  ON b2f_financial_operations_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ========================================
-- 4. دالة رفع الإيصال
-- ========================================

CREATE OR REPLACE FUNCTION upload_payment_receipt(
  p_sales_request_id UUID,
  p_receipt_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id UUID;
  v_transaction_id UUID;
  v_amount NUMERIC;
  v_investor_name TEXT;
  v_investor_phone TEXT;
  v_result JSONB;
BEGIN
  -- التحقق من وجود طلب البيع
  SELECT total_amount, investor_name, investor_phone
  INTO v_amount, v_investor_name, v_investor_phone
  FROM b2f_sales_requests
  WHERE id = p_sales_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب البيع غير موجود';
  END IF;

  -- البحث عن الفاتورة أو إنشاء واحدة جديدة
  SELECT id INTO v_invoice_id
  FROM b2f_invoices
  WHERE request_id = p_sales_request_id
  LIMIT 1;

  IF v_invoice_id IS NULL THEN
    INSERT INTO b2f_invoices (
      request_id,
      invoice_number,
      amount,
      status,
      issued_at
    ) VALUES (
      p_sales_request_id,
      'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
      v_amount,
      'pending_review',
      NOW()
    )
    RETURNING id INTO v_invoice_id;
  ELSE
    UPDATE b2f_invoices
    SET status = 'pending_review',
        updated_at = NOW()
    WHERE id = v_invoice_id;
  END IF;

  -- إنشاء معاملة دفع جديدة
  INSERT INTO b2f_payment_transactions (
    transaction_number,
    invoice_id,
    sales_request_id,
    investor_name,
    investor_phone,
    payment_method,
    amount,
    status,
    receipt_url,
    created_at,
    updated_at
  ) VALUES (
    'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
    v_invoice_id,
    p_sales_request_id,
    v_investor_name,
    v_investor_phone,
    'bank_transfer',
    v_amount,
    'under_review',
    p_receipt_url,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  -- تسجيل العملية
  INSERT INTO b2f_financial_operations_log (
    operation_type,
    invoice_id,
    transaction_id,
    sales_request_id,
    performed_by,
    notes
  ) VALUES (
    'upload_receipt',
    v_invoice_id,
    v_transaction_id,
    p_sales_request_id,
    'المستثمر: ' || v_investor_name,
    'تم رفع إيصال السداد'
  );

  v_result := jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'transaction_id', v_transaction_id,
    'status', 'under_review',
    'message', 'تم رفع الإيصال بنجاح، وهو الآن قيد المراجعة'
  );

  RETURN v_result;
END;
$$;

-- ========================================
-- 5. دالة اعتماد السداد
-- ========================================

CREATE OR REPLACE FUNCTION approve_payment(
  p_transaction_id UUID,
  p_approved_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id UUID;
  v_sales_request_id UUID;
  v_result JSONB;
BEGIN
  SELECT invoice_id, sales_request_id
  INTO v_invoice_id, v_sales_request_id
  FROM b2f_payment_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المعاملة غير موجودة';
  END IF;

  -- تحديث المعاملة
  UPDATE b2f_payment_transactions
  SET status = 'approved',
      processed_by = p_approved_by,
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_transaction_id;

  -- تحديث الفاتورة
  UPDATE b2f_invoices
  SET status = 'paid',
      updated_at = NOW()
  WHERE id = v_invoice_id;

  -- تحديث طلب البيع
  UPDATE b2f_sales_requests
  SET status = 'approved',
      ready_for_contract = true,
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = v_sales_request_id;

  -- تسجيل العملية
  INSERT INTO b2f_financial_operations_log (
    operation_type,
    invoice_id,
    transaction_id,
    sales_request_id,
    performed_by,
    notes
  ) VALUES (
    'approve_payment',
    v_invoice_id,
    p_transaction_id,
    v_sales_request_id,
    p_approved_by,
    'تم اعتماد السداد'
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'تم اعتماد السداد بنجاح',
    'invoice_status', 'paid',
    'request_status', 'approved',
    'ready_for_contract', true
  );

  RETURN v_result;
END;
$$;

-- ========================================
-- 6. دالة رفض السداد
-- ========================================

CREATE OR REPLACE FUNCTION reject_payment(
  p_transaction_id UUID,
  p_rejected_by TEXT DEFAULT 'Admin',
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id UUID;
  v_sales_request_id UUID;
  v_result JSONB;
BEGIN
  SELECT invoice_id, sales_request_id
  INTO v_invoice_id, v_sales_request_id
  FROM b2f_payment_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المعاملة غير موجودة';
  END IF;

  -- تحديث المعاملة
  UPDATE b2f_payment_transactions
  SET status = 'rejected',
      processed_by = p_rejected_by,
      processed_at = NOW(),
      updated_at = NOW(),
      gateway_response = COALESCE(gateway_response, '{}'::jsonb) || 
                        jsonb_build_object('rejection_reason', p_rejection_reason)
  WHERE id = p_transaction_id;

  -- تحديث الفاتورة
  UPDATE b2f_invoices
  SET status = 'payment_rejected',
      updated_at = NOW()
  WHERE id = v_invoice_id;

  -- تحديث طلب البيع
  UPDATE b2f_sales_requests
  SET status = 'payment_open',
      rejection_reason = p_rejection_reason,
      updated_at = NOW()
  WHERE id = v_sales_request_id;

  -- تسجيل العملية
  INSERT INTO b2f_financial_operations_log (
    operation_type,
    invoice_id,
    transaction_id,
    sales_request_id,
    performed_by,
    notes,
    metadata
  ) VALUES (
    'reject_payment',
    v_invoice_id,
    p_transaction_id,
    v_sales_request_id,
    p_rejected_by,
    'تم رفض السداد',
    jsonb_build_object('rejection_reason', p_rejection_reason)
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'تم رفض السداد',
    'invoice_status', 'payment_rejected',
    'request_status', 'payment_open',
    'can_reupload', true
  );

  RETURN v_result;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION upload_payment_receipt TO authenticated, anon;
GRANT EXECUTE ON FUNCTION approve_payment TO authenticated;
GRANT EXECUTE ON FUNCTION reject_payment TO authenticated;
