/*
  # إنشاء جدول سجل العمليات المالية

  ## المشكلة
  - جدول `b2f_financial_operations_log` غير موجود
  - التبويب يحاول قراءة منه لكنه يفشل

  ## الحل
  1. إنشاء جدول سجل العمليات المالية
  2. إضافة trigger لتسجيل العمليات تلقائياً
  3. منح الصلاحيات المناسبة
*/

-- ========================================
-- 1. إنشاء جدول سجل العمليات المالية
-- ========================================

CREATE TABLE IF NOT EXISTS b2f_financial_operations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL CHECK (operation_type IN (
    'gateway_enabled', 'gateway_disabled', 'gateway_config_updated',
    'invoice_created', 'invoice_status_changed', 'invoice_sent',
    'payment_approved', 'payment_rejected', 'payment_refunded',
    'receipt_uploaded', 'receipt_approved', 'receipt_rejected'
  )),
  operation_description text NOT NULL,
  performed_by text NOT NULL DEFAULT 'System',
  target_id uuid,
  target_type text,
  invoice_number text,
  transaction_number text,
  sales_request_id uuid,
  old_value text,
  new_value text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- 2. تفعيل RLS وإنشاء السياسات
-- ========================================

ALTER TABLE b2f_financial_operations_log ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة السجلات
CREATE POLICY "Allow public read logs"
  ON b2f_financial_operations_log FOR SELECT
  TO public
  USING (true);

-- السماح للنظام بإدراج السجلات
CREATE POLICY "Allow system insert logs"
  ON b2f_financial_operations_log FOR INSERT
  TO public
  WITH CHECK (true);

-- ========================================
-- 3. إنشاء Triggers لتسجيل العمليات تلقائياً
-- ========================================

-- Trigger لتسجيل إنشاء الفواتير
CREATE OR REPLACE FUNCTION log_invoice_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO b2f_financial_operations_log (
    operation_type,
    operation_description,
    performed_by,
    target_id,
    target_type,
    invoice_number,
    sales_request_id,
    metadata
  ) VALUES (
    'invoice_created',
    'تم إنشاء فاتورة جديدة للمستثمر: ' || NEW.investor_name,
    COALESCE(NEW.issued_by, 'System'),
    NEW.id,
    'invoice',
    NEW.invoice_number,
    NEW.sales_request_id,
    jsonb_build_object(
      'amount', NEW.total_amount,
      'payment_method', NEW.payment_method,
      'status', NEW.status
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_invoice_creation_trigger ON b2f_invoices;

CREATE TRIGGER log_invoice_creation_trigger
  AFTER INSERT ON b2f_invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_invoice_creation();

-- Trigger لتسجيل تغيير حالة الفواتير
CREATE OR REPLACE FUNCTION log_invoice_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO b2f_financial_operations_log (
      operation_type,
      operation_description,
      performed_by,
      target_id,
      target_type,
      invoice_number,
      sales_request_id,
      old_value,
      new_value,
      metadata
    ) VALUES (
      'invoice_status_changed',
      'تم تغيير حالة الفاتورة ' || NEW.invoice_number || ' من ' || OLD.status || ' إلى ' || NEW.status,
      'System',
      NEW.id,
      'invoice',
      NEW.invoice_number,
      NEW.sales_request_id,
      OLD.status,
      NEW.status,
      jsonb_build_object('investor_name', NEW.investor_name, 'amount', NEW.total_amount)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_invoice_status_change_trigger ON b2f_invoices;

CREATE TRIGGER log_invoice_status_change_trigger
  AFTER UPDATE ON b2f_invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_invoice_status_change();

-- Trigger لتسجيل رفع الإيصالات
CREATE OR REPLACE FUNCTION log_receipt_upload()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO b2f_financial_operations_log (
    operation_type,
    operation_description,
    performed_by,
    target_id,
    target_type,
    sales_request_id,
    metadata
  ) VALUES (
    'receipt_uploaded',
    'تم رفع إيصال دفع جديد',
    'Investor',
    NEW.id,
    'payment_receipt',
    NEW.sales_request_id,
    jsonb_build_object('receipt_number', NEW.receipt_number)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_receipt_upload_trigger ON b2f_payment_receipts;

CREATE TRIGGER log_receipt_upload_trigger
  AFTER INSERT ON b2f_payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION log_receipt_upload();

-- Trigger لتسجيل اعتماد أو رفض الإيصالات
CREATE OR REPLACE FUNCTION log_receipt_decision()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.staff_decision IS DISTINCT FROM NEW.staff_decision AND NEW.staff_decision IN ('approved', 'rejected') THEN
    INSERT INTO b2f_financial_operations_log (
      operation_type,
      operation_description,
      performed_by,
      target_id,
      target_type,
      sales_request_id,
      old_value,
      new_value,
      metadata
    ) VALUES (
      CASE WHEN NEW.staff_decision = 'approved' THEN 'receipt_approved' ELSE 'receipt_rejected' END,
      CASE 
        WHEN NEW.staff_decision = 'approved' THEN 'تم اعتماد إيصال الدفع'
        ELSE 'تم رفض إيصال الدفع: ' || COALESCE(NEW.staff_comment, 'بدون سبب')
      END,
      'Admin',
      NEW.id,
      'payment_receipt',
      NEW.sales_request_id,
      OLD.staff_decision,
      NEW.staff_decision,
      jsonb_build_object('receipt_number', NEW.receipt_number, 'comment', NEW.staff_comment)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_receipt_decision_trigger ON b2f_payment_receipts;

CREATE TRIGGER log_receipt_decision_trigger
  AFTER UPDATE ON b2f_payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION log_receipt_decision();

-- ========================================
-- 4. منح الصلاحيات
-- ========================================

GRANT SELECT, INSERT ON b2f_financial_operations_log TO authenticated, anon;

-- ========================================
-- 5. إنشاء فهرس للأداء
-- ========================================

CREATE INDEX IF NOT EXISTS idx_financial_log_created_at ON b2f_financial_operations_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_log_operation_type ON b2f_financial_operations_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_financial_log_sales_request_id ON b2f_financial_operations_log(sales_request_id);
