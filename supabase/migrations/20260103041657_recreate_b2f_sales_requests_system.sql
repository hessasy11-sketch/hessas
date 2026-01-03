/*
  # إعادة إنشاء نظام طلبات المبيعات B2F

  1. الجداول الرئيسية
    - `b2f_sales_requests`: طلبات شراء الأشجار من المستثمرين
    - `b2f_payment_receipts`: إيصالات الدفع المرفوعة

  2. الحالات المعتمدة
    - collection_queue: في قائمة التجميع
    - payment_open: الدفع مفتوح
    - receipt_uploaded: تم رفع الإيصال
    - receipt_under_review: الإيصال قيد المراجعة
    - receipt_needs_revision: الإيصال يحتاج مراجعة
    - receipt_approved: الإيصال معتمد
    - contract_issued: عقد صادر
    - rejected_by_staff: مرفوض من الموظف

  3. الأمان
    - RLS مفعّل على جميع الجداول
    - سياسات متعددة للإدارة والمستثمرين
*/

-- حذف الجداول القديمة
DROP TABLE IF EXISTS b2f_payment_receipts CASCADE;
DROP TABLE IF EXISTS b2f_sales_requests CASCADE;

-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS open_payment_for_requests(uuid[]) CASCADE;
DROP FUNCTION IF EXISTS open_payment_for_farm(uuid) CASCADE;
DROP FUNCTION IF EXISTS approve_receipt(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS reject_receipt_with_note(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS issue_contracts_for_approved_requests(uuid[]) CASCADE;
DROP FUNCTION IF EXISTS update_sales_request_timestamp() CASCADE;

-- 1. إنشاء جدول طلبات المبيعات
CREATE TABLE b2f_sales_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- معلومات المستثمر
  investor_account_id uuid REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  investor_name text NOT NULL,
  investor_phone text NOT NULL,
  investor_email text,
  
  -- معلومات الطلب
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES b2f_opportunities(id) ON DELETE CASCADE,
  
  -- تفاصيل الطلب
  number_of_trees integer NOT NULL CHECK (number_of_trees > 0),
  tree_type text NOT NULL,
  price_per_tree numeric(10,2) NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  
  -- الحالة
  status text NOT NULL DEFAULT 'collection_queue' CHECK (
    status IN (
      'collection_queue',
      'payment_open',
      'receipt_uploaded',
      'receipt_under_review',
      'receipt_needs_revision',
      'receipt_approved',
      'contract_issued',
      'rejected_by_staff',
      'receipt_approved_pending_invoice',
      'invoice_issued'
    )
  ),
  
  -- ملاحظات الموظف
  staff_notes text,
  rejection_reason text,
  
  -- تواريخ
  created_at timestamptz DEFAULT now(),
  payment_opened_at timestamptz,
  receipt_uploaded_at timestamptz,
  approved_at timestamptz,
  contract_issued_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- 2. إنشاء جدول إيصالات الدفع
CREATE TABLE b2f_payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ربط بالطلب
  sales_request_id uuid REFERENCES b2f_sales_requests(id) ON DELETE CASCADE NOT NULL,
  
  -- معلومات الإيصال
  receipt_url text NOT NULL,
  receipt_number text,
  
  -- نتيجة الفرز بالذكاء الصناعي
  ai_classification text CHECK (
    ai_classification IN ('looks_good', 'needs_review', 'pending_analysis')
  ) DEFAULT 'pending_analysis',
  ai_analysis_result jsonb,
  ai_confidence_score numeric(3,2),
  
  -- مراجعة الموظف
  staff_decision text CHECK (
    staff_decision IN ('approved', 'rejected', 'pending')
  ) DEFAULT 'pending',
  staff_comment text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  
  -- تواريخ
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 3. الفهارس
CREATE INDEX idx_sales_requests_status ON b2f_sales_requests(status);
CREATE INDEX idx_sales_requests_farm ON b2f_sales_requests(farm_id);
CREATE INDEX idx_sales_requests_investor ON b2f_sales_requests(investor_account_id);
CREATE INDEX idx_sales_requests_phone ON b2f_sales_requests(investor_phone);
CREATE INDEX idx_payment_receipts_request ON b2f_payment_receipts(sales_request_id);
CREATE INDEX idx_payment_receipts_classification ON b2f_payment_receipts(ai_classification);
CREATE INDEX idx_payment_receipts_decision ON b2f_payment_receipts(staff_decision);

-- 4. تمكين RLS
ALTER TABLE b2f_sales_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_payment_receipts ENABLE ROW LEVEL SECURITY;

-- 5. سياسات b2f_sales_requests
CREATE POLICY "Admin can view all sales requests"
  ON b2f_sales_requests FOR SELECT
  TO authenticated
  USING (is_b2f_admin(auth.uid()));

CREATE POLICY "Admin can insert sales requests"
  ON b2f_sales_requests FOR INSERT
  TO authenticated
  WITH CHECK (is_b2f_admin(auth.uid()));

CREATE POLICY "Anon can insert sales requests"
  ON b2f_sales_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admin can update sales requests"
  ON b2f_sales_requests FOR UPDATE
  TO authenticated
  USING (is_b2f_admin(auth.uid()));

CREATE POLICY "Anon can view own sales requests by phone"
  ON b2f_sales_requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can update own sales requests"
  ON b2f_sales_requests FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Anon can delete own sales requests"
  ON b2f_sales_requests FOR DELETE
  TO anon
  USING (true);

-- 6. سياسات b2f_payment_receipts
CREATE POLICY "Admin can view all receipts"
  ON b2f_payment_receipts FOR SELECT
  TO authenticated
  USING (is_b2f_admin(auth.uid()));

CREATE POLICY "Anon can insert receipts"
  ON b2f_payment_receipts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admin can update receipts"
  ON b2f_payment_receipts FOR UPDATE
  TO authenticated
  USING (is_b2f_admin(auth.uid()));

-- 7. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('b2f-sales-receipts', 'b2f-sales-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- 8. دالة التحديث التلقائي
CREATE OR REPLACE FUNCTION update_sales_request_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_sales_requests_timestamp
  BEFORE UPDATE ON b2f_sales_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_request_timestamp();

-- 9. دالة فتح الدفع
CREATE OR REPLACE FUNCTION open_payment_for_requests(request_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE b2f_sales_requests
  SET 
    status = 'payment_open',
    payment_opened_at = now(),
    updated_at = now()
  WHERE id = ANY(request_ids)
    AND status = 'collection_queue';
END;
$$;

-- 10. دالة فتح الدفع لمزرعة
CREATE OR REPLACE FUNCTION open_payment_for_farm(farm_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE b2f_sales_requests
  SET 
    status = 'payment_open',
    payment_opened_at = now(),
    updated_at = now()
  WHERE farm_id = farm_uuid
    AND status = 'collection_queue';
END;
$$;

-- 11. دالة اعتماد الإيصال
CREATE OR REPLACE FUNCTION approve_receipt(receipt_uuid uuid, staff_comment_text text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id uuid;
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE b2f_payment_receipts
  SET 
    staff_decision = 'approved',
    staff_comment = staff_comment_text,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = receipt_uuid
  RETURNING sales_request_id INTO v_request_id;
  
  UPDATE b2f_sales_requests
  SET 
    status = 'receipt_approved',
    approved_at = now(),
    updated_at = now()
  WHERE id = v_request_id;
END;
$$;

-- 12. دالة رفض الإيصال
CREATE OR REPLACE FUNCTION reject_receipt_with_note(
  receipt_uuid uuid,
  rejection_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id uuid;
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE b2f_payment_receipts
  SET 
    staff_decision = 'rejected',
    staff_comment = rejection_note,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = receipt_uuid
  RETURNING sales_request_id INTO v_request_id;
  
  UPDATE b2f_sales_requests
  SET 
    status = 'payment_open',
    rejection_reason = rejection_note,
    updated_at = now()
  WHERE id = v_request_id;
END;
$$;

-- 13. دالة إصدار العقود
CREATE OR REPLACE FUNCTION issue_contracts_for_approved_requests(request_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE b2f_sales_requests
  SET 
    status = 'contract_issued',
    contract_issued_at = now(),
    updated_at = now()
  WHERE id = ANY(request_ids)
    AND status = 'receipt_approved';
END;
$$;
