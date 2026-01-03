/*
  # تطبيق المسار الإلزامي لقانون المجموعات - Enforce Group-Based Workflow

  ## الهدف الرئيسي
  منع أي مسارات قديمة تسمح بـ:
  - إصدار عقد لفرد مباشرة بعد الحجز
  - اعتبار الطلب مكتمل لمجرد حالة "paid"
  - اعتماد إيصال أو إصدار شهادة بناءً على AI فقط

  ## المسار الوحيد المعتمد
  حجز → قائمة انتظار → اكتمال المجموعة → فتح الدفع → رفع إيصال →
  مراجعة AI (فرز) → مراجعة مالية نهائية → إصدار فاتورة → إصدار عقد → تشغيل
*/

-- ========================================
-- الخطوة 1: إضافة حقل invoice_id أولاً
-- ========================================

ALTER TABLE b2f_investment_requests
ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES b2f_invoices(id) ON DELETE SET NULL;

-- ========================================
-- الخطوة 2: تعطيل Triggers القديمة (إن وجدت)
-- ========================================

DROP TRIGGER IF EXISTS auto_issue_contract_on_payment ON b2f_investment_requests;
DROP TRIGGER IF EXISTS auto_approve_receipt ON b2f_investment_requests;
DROP TRIGGER IF EXISTS auto_transfer_to_operations ON b2f_investment_requests;
DROP TRIGGER IF EXISTS enforce_status_transition ON b2f_investment_requests;
DROP TRIGGER IF EXISTS prevent_direct_invoice ON b2f_investment_requests;
DROP TRIGGER IF EXISTS enforce_contract_requires_invoice ON b2f_investment_requests;
DROP TRIGGER IF EXISTS log_status_changes ON b2f_investment_requests;

DROP FUNCTION IF EXISTS auto_issue_contract_on_payment();
DROP FUNCTION IF EXISTS auto_approve_receipt();
DROP FUNCTION IF EXISTS auto_transfer_to_operations();

-- ========================================
-- الخطوة 3: Function للتحقق من المسار الصحيح
-- ========================================

CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- السماح بالتغيير إذا كانت الحالة الجديدة = القديمة (لا تغيير)
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- منع القفز مباشرة لـ operational بدون المراحل
  IF NEW.status = 'operational' AND OLD.status NOT IN ('contract_issued') THEN
    RAISE EXCEPTION 'لا يمكن نقل الطلب للتشغيل إلا بعد إصدار العقد';
  END IF;

  -- منع إصدار عقد بدون فاتورة
  IF NEW.status = 'contract_issued' AND OLD.status NOT IN ('invoice_issued') THEN
    RAISE EXCEPTION 'لا يمكن إصدار العقد إلا بعد إصدار الفاتورة';
  END IF;

  -- منع إصدار فاتورة بدون اعتماد مالي
  IF NEW.status = 'invoice_issued' AND OLD.status NOT IN ('receipt_approved_pending_invoice') THEN
    RAISE EXCEPTION 'لا يمكن إصدار الفاتورة إلا بعد الاعتماد المالي';
  END IF;

  -- منع الاعتماد المالي المباشر
  IF NEW.status = 'receipt_approved_pending_invoice' AND
     OLD.status NOT IN ('receipt_uploaded_ai_review', 'receipt_duplicate_financial_review') THEN
    RAISE EXCEPTION 'لا يمكن اعتماد الإيصال إلا بعد مراجعة AI أو المراجعة المالية';
  END IF;

  -- منع رفع إيصال بدون فتح الدفع
  IF NEW.status = 'receipt_uploaded_ai_review' AND OLD.status != 'payment_open' THEN
    RAISE EXCEPTION 'لا يمكن رفع الإيصال إلا بعد فتح الدفع من الإدارة';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_status_transition
  BEFORE UPDATE OF status ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_transition();

-- ========================================
-- الخطوة 4: Function لمنع إصدار عقد بدون فاتورة
-- ========================================

CREATE OR REPLACE FUNCTION prevent_contract_without_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'contract_issued' THEN
    IF NEW.invoice_id IS NULL THEN
      RAISE EXCEPTION 'لا يمكن إصدار عقد بدون فاتورة معتمدة';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM b2f_invoices
      WHERE id = NEW.invoice_id
      AND status = 'issued'
    ) THEN
      RAISE EXCEPTION 'لا يمكن إصدار عقد - الفاتورة غير موجودة أو غير صادرة';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_contract_requires_invoice
  BEFORE UPDATE OF status ON b2f_investment_requests
  FOR EACH ROW
  WHEN (NEW.status = 'contract_issued')
  EXECUTE FUNCTION prevent_contract_without_invoice();

-- ========================================
-- الخطوة 5: إنشاء جدول audit log
-- ========================================

CREATE TABLE IF NOT EXISTS b2f_status_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES b2f_investment_requests(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  notes text,
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE b2f_status_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON b2f_status_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM b2f_admin_users WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO b2f_status_audit_log (request_id, old_status, new_status, changed_by, notes)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), 'Status changed');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_status_changes
  AFTER UPDATE OF status ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

-- ========================================
-- الخطوة 6: إضافة Index للأداء
-- ========================================

CREATE INDEX IF NOT EXISTS idx_requests_group_id ON b2f_investment_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_requests_invoice_id ON b2f_investment_requests(invoice_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON b2f_investment_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_request_id ON b2f_status_audit_log(request_id);
