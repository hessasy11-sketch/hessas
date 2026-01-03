/*
  # نظام مالية 2 - الجداول فقط

  1. الجداول الجديدة
    - `b2f_invoices` - فواتير الاستثمار
    - `b2f_payment_transactions` - عمليات الدفع والتحصيل
    - `b2f_financial_operations_log` - سجل العمليات المالية
*/

-- جدول فواتير الاستثمار
CREATE TABLE IF NOT EXISTS b2f_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  sales_request_id uuid REFERENCES b2f_sales_requests(id) ON DELETE CASCADE,
  investor_name text NOT NULL,
  investor_phone text NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  payment_method text,
  payment_gateway_code text,
  notes text,
  issued_by text,
  issued_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول عمليات الدفع والتحصيل
CREATE TABLE IF NOT EXISTS b2f_payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number text UNIQUE NOT NULL,
  invoice_id uuid REFERENCES b2f_invoices(id) ON DELETE SET NULL,
  sales_request_id uuid REFERENCES b2f_sales_requests(id) ON DELETE CASCADE,
  investor_name text NOT NULL,
  investor_phone text NOT NULL,
  payment_method text NOT NULL,
  payment_gateway_code text,
  amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  receipt_url text,
  gateway_response jsonb DEFAULT '{}'::jsonb,
  processed_by text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول سجل العمليات المالية
CREATE TABLE IF NOT EXISTS b2f_financial_operations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL CHECK (operation_type IN (
    'gateway_enabled', 'gateway_disabled', 'gateway_config_updated',
    'invoice_created', 'invoice_status_changed', 'invoice_sent',
    'payment_approved', 'payment_rejected', 'payment_refunded',
    'receipt_uploaded', 'receipt_approved', 'receipt_rejected'
  )),
  operation_description text NOT NULL,
  performed_by text NOT NULL,
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

-- تفعيل RLS
ALTER TABLE b2f_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_financial_operations_log ENABLE ROW LEVEL SECURITY;

-- سياسات b2f_invoices
CREATE POLICY "Allow admin all on invoices"
  ON b2f_invoices
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

CREATE POLICY "Allow public read invoices"
  ON b2f_invoices FOR SELECT
  TO public
  USING (true);

-- سياسات b2f_payment_transactions
CREATE POLICY "Allow admin all on transactions"
  ON b2f_payment_transactions
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

CREATE POLICY "Allow public read transactions"
  ON b2f_payment_transactions FOR SELECT
  TO public
  USING (true);

-- سياسات b2f_financial_operations_log
CREATE POLICY "Allow admin read log"
  ON b2f_financial_operations_log FOR SELECT
  TO authenticated
  USING (is_b2f_admin());

CREATE POLICY "Allow system insert log"
  ON b2f_financial_operations_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Triggers
CREATE OR REPLACE FUNCTION update_finance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON b2f_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_finance_updated_at();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON b2f_payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_finance_updated_at();
