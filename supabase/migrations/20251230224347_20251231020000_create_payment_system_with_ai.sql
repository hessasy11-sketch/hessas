/*
  # نظام إثبات السداد الذكي بالذكاء الصناعي
  
  ## الهدف
  بناء نظام متكامل لإدارة مستندات الدفع مع تحليل ذكي آلي
  
  ## التغييرات
  
  ### 1. إضافة حقل payment_status لجدول b2f_sales_requests
    - حقل منفصل عن status الرئيسي
    - يتتبع حالة الدفع بشكل مستقل
    - القيم: pending_payment, payment_submitted, payment_approved, payment_rejected
  
  ### 2. إنشاء جدول b2f_payment_documents
    - يحفظ تفاصيل كل مستند دفع مرفوع
    - يحتوي على نتائج التحليل بالذكاء الصناعي
    - يربط بالطلب الأساسي في b2f_sales_requests
  
  ### 3. إضافة حقل ready_for_contract
    - فلاغ يشير إلى جاهزية الطلب لإصدار العقد
    - يتم تفعيله عند اعتماد السداد
*/

-- ==================================================
-- المرحلة 1: إضافة payment_status إلى b2f_sales_requests
-- ==================================================

DO $$ 
BEGIN
  -- إضافة حقل payment_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_sales_requests' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE b2f_sales_requests 
    ADD COLUMN payment_status text DEFAULT 'pending_payment' 
    CHECK (payment_status IN (
      'pending_payment',
      'payment_submitted',
      'payment_approved',
      'payment_rejected'
    ));
  END IF;

  -- إضافة حقل ready_for_contract
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_sales_requests' 
    AND column_name = 'ready_for_contract'
  ) THEN
    ALTER TABLE b2f_sales_requests 
    ADD COLUMN ready_for_contract boolean DEFAULT false;
  END IF;

  -- إضافة expected_amount (المبلغ المطلوب)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_sales_requests' 
    AND column_name = 'expected_amount'
  ) THEN
    ALTER TABLE b2f_sales_requests 
    ADD COLUMN expected_amount numeric(10,2);
    
    -- تعيين القيمة الافتراضية من total_amount
    UPDATE b2f_sales_requests 
    SET expected_amount = total_amount 
    WHERE expected_amount IS NULL;
  END IF;
END $$;

-- ==================================================
-- المرحلة 2: إنشاء جدول مستندات الدفع
-- ==================================================

CREATE TABLE IF NOT EXISTS b2f_payment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ربط بالطلب الأساسي
  sales_request_id uuid NOT NULL REFERENCES b2f_sales_requests(id) ON DELETE CASCADE,
  
  -- معلومات المستند
  document_url text NOT NULL,
  document_type text DEFAULT 'payment_receipt',
  
  -- نوع العملية المالية
  operation_type text NOT NULL DEFAULT 'tree_investment' CHECK (operation_type IN (
    'tree_investment',      -- قيمة استثمار الأشجار
    'operation_fees',       -- رسوم تشغيل
    'additional_services'   -- خدمات إضافية
  )),
  
  -- المبالغ
  amount_expected numeric(10,2) NOT NULL,
  amount_detected numeric(10,2),
  amount_entered_by_investor numeric(10,2),
  
  -- معلومات مستخرجة بالذكاء الصناعي
  payment_date_detected date,
  bank_name text,
  reference_number text,
  
  -- نتائج التحليل بالذكاء الصناعي
  ai_confidence numeric(3,2),  -- من 0.00 إلى 1.00
  ai_decision text NOT NULL DEFAULT 'pending' CHECK (ai_decision IN (
    'pending',
    'auto_approved',
    'needs_review',
    'auto_rejected'
  )),
  ai_analysis_notes text,
  ai_raw_response jsonb,
  
  -- قرار الموظف (إن وجد)
  staff_decision text CHECK (staff_decision IN (
    'approved',
    'rejected',
    'pending'
  )),
  staff_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  
  -- الحالة الحالية للمستند
  current_status text NOT NULL DEFAULT 'submitted' CHECK (current_status IN (
    'submitted',
    'under_review',
    'approved',
    'rejected'
  )),
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_docs_request 
  ON b2f_payment_documents(sales_request_id);

CREATE INDEX IF NOT EXISTS idx_payment_docs_ai_decision 
  ON b2f_payment_documents(ai_decision);

CREATE INDEX IF NOT EXISTS idx_payment_docs_status 
  ON b2f_payment_documents(current_status);

CREATE INDEX IF NOT EXISTS idx_payment_docs_created 
  ON b2f_payment_documents(created_at DESC);

-- RLS
ALTER TABLE b2f_payment_documents ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة - المستثمرون يرون مستنداتهم فقط
CREATE POLICY "Investors can view own payment documents"
  ON b2f_payment_documents FOR SELECT
  TO anon, authenticated
  USING (
    sales_request_id IN (
      SELECT id FROM b2f_sales_requests 
      WHERE investor_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );

-- سياسة الإضافة - المستثمرون يضيفون لطلباتهم فقط
CREATE POLICY "Investors can insert own payment documents"
  ON b2f_payment_documents FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    sales_request_id IN (
      SELECT id FROM b2f_sales_requests 
      WHERE investor_phone = current_setting('request.jwt.claims', true)::json->>'phone'
    )
  );

-- سياسة القراءة للإدارة
CREATE POLICY "Admins can view all payment documents"
  ON b2f_payment_documents FOR SELECT
  TO authenticated
  USING (is_b2f_admin(auth.uid()));

-- سياسة التحديث للإدارة فقط
CREATE POLICY "Admins can update payment documents"
  ON b2f_payment_documents FOR UPDATE
  TO authenticated
  USING (is_b2f_admin(auth.uid()))
  WITH CHECK (is_b2f_admin(auth.uid()));

-- ==================================================
-- المرحلة 3: دالة التحديث التلقائي
-- ==================================================

CREATE OR REPLACE FUNCTION update_payment_docs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payment_docs_timestamp ON b2f_payment_documents;

CREATE TRIGGER trigger_update_payment_docs_timestamp
  BEFORE UPDATE ON b2f_payment_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_docs_updated_at();

-- ==================================================
-- المرحلة 4: دالة تحديث payment_status تلقائياً
-- ==================================================

CREATE OR REPLACE FUNCTION sync_payment_status_from_docs()
RETURNS TRIGGER AS $$
BEGIN
  -- عند إنشاء/تحديث مستند دفع، نحدّث payment_status في الطلب الأساسي
  
  IF NEW.ai_decision = 'auto_approved' AND NEW.current_status = 'approved' THEN
    UPDATE b2f_sales_requests 
    SET 
      payment_status = 'payment_approved',
      ready_for_contract = true
    WHERE id = NEW.sales_request_id;
    
  ELSIF NEW.ai_decision = 'needs_review' THEN
    UPDATE b2f_sales_requests 
    SET payment_status = 'payment_submitted'
    WHERE id = NEW.sales_request_id;
    
  ELSIF NEW.ai_decision = 'auto_rejected' THEN
    UPDATE b2f_sales_requests 
    SET payment_status = 'payment_rejected'
    WHERE id = NEW.sales_request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_payment_status ON b2f_payment_documents;

CREATE TRIGGER trigger_sync_payment_status
  AFTER INSERT OR UPDATE ON b2f_payment_documents
  FOR EACH ROW
  EXECUTE FUNCTION sync_payment_status_from_docs();

-- ==================================================
-- المرحلة 5: دالة للحصول على ملخص المالية للمستثمر
-- ==================================================

CREATE OR REPLACE FUNCTION get_investor_financial_summary(p_investor_phone text)
RETURNS TABLE (
  total_requests_count bigint,
  total_amount numeric,
  approved_count bigint,
  approved_amount numeric,
  pending_review_count bigint,
  pending_payment_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_requests_count,
    COALESCE(SUM(sr.total_amount), 0) as total_amount,
    COUNT(*) FILTER (WHERE sr.payment_status = 'payment_approved')::bigint as approved_count,
    COALESCE(SUM(sr.total_amount) FILTER (WHERE sr.payment_status = 'payment_approved'), 0) as approved_amount,
    COUNT(*) FILTER (WHERE sr.payment_status = 'payment_submitted')::bigint as pending_review_count,
    COUNT(*) FILTER (WHERE sr.payment_status = 'pending_payment')::bigint as pending_payment_count
  FROM b2f_sales_requests sr
  WHERE sr.investor_phone = p_investor_phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- المرحلة 6: Comments توضيحية
-- ==================================================

COMMENT ON COLUMN b2f_sales_requests.payment_status IS 
'حالة السداد المالي - منفصلة عن status الرئيسي';

COMMENT ON COLUMN b2f_sales_requests.ready_for_contract IS 
'فلاغ يشير إلى جاهزية الطلب لإصدار العقد بعد اعتماد السداد';

COMMENT ON TABLE b2f_payment_documents IS 
'جدول يحفظ تفاصيل كل مستند دفع مع نتائج التحليل بالذكاء الصناعي';

COMMENT ON COLUMN b2f_payment_documents.ai_decision IS 
'قرار الذكاء الصناعي: auto_approved (اعتماد آلي) / needs_review (يحتاج مراجعة) / auto_rejected (رفض آلي)';

-- ==================================================
-- ملاحظات نهائية
-- ==================================================

/*
  ✅ تم إنشاء نظام متكامل لإدارة السداد:
  
  1. حقل payment_status في b2f_sales_requests
  2. جدول b2f_payment_documents الكامل
  3. Triggers للتزامن التلقائي
  4. دالة get_investor_financial_summary للملخص المالي
  5. RLS policies كاملة
  
  الخطوة القادمة:
  - إنشاء Edge Function للتحليل بالذكاء الصناعي
  - بناء واجهات "طلباتي" و "المالية"
  - بناء لوحة الإدارة المالية
*/