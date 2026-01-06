/*
  # إصلاح دالة get_executive_pulse_finance - استخدام الأعمدة الصحيحة
  
  ## المشكلة
  جدول farm_expenses يستخدم approval_status وليس status
  
  ## الحل
  استخدام approval_status بدلاً من status
*/

-- ============================================
-- إصلاح دالة المؤشرات المالية - النسخة الصحيحة
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
  
  -- إجمالي المصروفات اليوم (من farm_expenses المعتمدة)
  SELECT COALESCE(SUM(amount), 0) INTO v_expenses_today
  FROM farm_expenses
  WHERE DATE(created_at) = CURRENT_DATE
  AND approval_status = 'approved';
  
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
    COALESCE((
      SELECT SUM(amount) 
      FROM farm_expenses 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' 
      AND approval_status = 'approved'
    ), 0)
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
EXCEPTION
  WHEN OTHERS THEN
    -- في حالة حدوث أي خطأ، نعيد قيم افتراضية
    RETURN jsonb_build_object(
      'payments_today', 0,
      'expenses_today', 0,
      'pending_reviews', 0,
      'net_today', 0,
      'net_week', 0,
      'error', SQLERRM,
      'updated_at', now()
    );
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION get_executive_pulse_finance() TO PUBLIC;
