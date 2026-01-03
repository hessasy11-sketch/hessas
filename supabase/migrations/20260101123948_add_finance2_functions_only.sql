/*
  # إضافة الدوال المساعدة لمالية 2
*/

-- Function لتوليد رقم فاتورة تلقائي
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  invoice_num text;
BEGIN
  SELECT COUNT(*) + 1 INTO next_number FROM b2f_invoices;
  invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_number::text, 6, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Function لتوليد رقم معاملة تلقائي
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  trans_num text;
BEGIN
  SELECT COUNT(*) + 1 INTO next_number FROM b2f_payment_transactions;
  trans_num := 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(next_number::text, 6, '0');
  RETURN trans_num;
END;
$$ LANGUAGE plpgsql;

-- Function لتسجيل العملية في السجل
CREATE OR REPLACE FUNCTION log_financial_operation(
  p_operation_type text,
  p_operation_description text,
  p_performed_by text,
  p_target_id uuid DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_invoice_number text DEFAULT NULL,
  p_transaction_number text DEFAULT NULL,
  p_sales_request_id uuid DEFAULT NULL,
  p_old_value text DEFAULT NULL,
  p_new_value text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO b2f_financial_operations_log (
    operation_type,
    operation_description,
    performed_by,
    target_id,
    target_type,
    invoice_number,
    transaction_number,
    sales_request_id,
    old_value,
    new_value,
    metadata
  ) VALUES (
    p_operation_type,
    p_operation_description,
    p_performed_by,
    p_target_id,
    p_target_type,
    p_invoice_number,
    p_transaction_number,
    p_sales_request_id,
    p_old_value,
    p_new_value,
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;
