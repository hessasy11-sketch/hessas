/*
  # إصلاح دالة get_executive_pulse_finance
  
  ## المشكلة
  الدالة تبحث عن جدول b2f_payment_documents غير الموجود
  
  ## الحل
  استخدام الجداول الصحيحة:
  - b2f_sales_requests للمدفوعات والمبالغ
  - operation_fees للمصروفات
  
  ## التغييرات
  1. استبدال b2f_payment_documents بـ b2f_sales_requests
  2. استخدام status الصحيحة للمدفوعات المعتمدة
  3. حساب المدفوعات المعلقة من b2f_payment_receipts
*/

-- ============================================
-- إصلاح دالة المؤشرات المالية للمحاسب
-- ============================================

CREATE OR REPLACE FUNCTION get_executive_pulse_finance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_payments_today numeric;
  v_expenses_today numeric;
  v_pending_reviews integer;
  v_net_today numeric;
  v_net_week numeric;
BEGIN
  -- إجمالي المدفوعات اليوم (من b2f_sales_requests المعتمدة)
  SELECT COALESCE(SUM(total_amount), 0) INTO v_payments_today
  FROM b2f_sales_requests
  WHERE DATE(created_at) = CURRENT_DATE
  AND status IN ('payment_approved', 'contract_issued', 'operational');
  
  -- إجمالي المصروفات اليوم (من operation_fees)
  SELECT COALESCE(SUM(amount), 0) INTO v_expenses_today
  FROM operation_fees
  WHERE DATE(created_at) = CURRENT_DATE
  AND status = 'paid';
  
  -- العمليات التي تحتاج مراجعة (من b2f_payment_receipts)
  SELECT COUNT(*) INTO v_pending_reviews
  FROM b2f_payment_receipts
  WHERE staff_decision IS NULL OR staff_decision = 'pending';
  
  -- صافي اليوم
  v_net_today := v_payments_today - v_expenses_today;
  
  -- صافي الأسبوع
  SELECT 
    COALESCE(SUM(CASE 
      WHEN status IN ('payment_approved', 'contract_issued', 'operational') 
      THEN total_amount ELSE 0 
    END), 0) -
    COALESCE((SELECT SUM(amount) FROM operation_fees 
              WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' 
              AND status = 'paid'), 0)
  INTO v_net_week
  FROM b2f_sales_requests
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  v_result := jsonb_build_object(
    'payments_today', v_payments_today,
    'expenses_today', v_expenses_today,
    'pending_reviews', v_pending_reviews,
    'net_today', v_net_today,
    'net_week', v_net_week,
    'updated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION get_executive_pulse_finance() TO PUBLIC;
