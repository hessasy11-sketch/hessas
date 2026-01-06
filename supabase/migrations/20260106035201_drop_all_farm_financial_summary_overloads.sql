/*
  # حذف جميع overloads للدالة get_farm_financial_summary
*/

-- حذف جميع الإصدارات
DROP FUNCTION IF EXISTS get_farm_financial_summary(uuid);
DROP FUNCTION IF EXISTS get_farm_financial_summary(uuid, integer, integer);
DROP FUNCTION IF EXISTS get_all_farms_financial_summary();

-- =====================================================
-- 1. جدول السقوف المالية
-- =====================================================
CREATE TABLE IF NOT EXISTS financial_alert_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_name text NOT NULL,
  period_days integer NOT NULL DEFAULT 30,
  threshold_amount numeric NOT NULL CHECK (threshold_amount >= 0),
  alert_level text DEFAULT 'warning' CHECK (alert_level IN ('info', 'warning', 'critical')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE financial_alert_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read thresholds" ON financial_alert_thresholds;
CREATE POLICY "Anyone can read thresholds"
  ON financial_alert_thresholds FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Service role can manage thresholds" ON financial_alert_thresholds;
CREATE POLICY "Service role can manage thresholds"
  ON financial_alert_thresholds FOR ALL
  USING (auth.role() = 'service_role');

-- سقوف افتراضية
INSERT INTO financial_alert_thresholds (
  threshold_name,
  period_days,
  threshold_amount,
  alert_level,
  is_active
)
VALUES 
  ('تحذير - مصروفات عالية', 30, 5000.00, 'warning', true),
  ('حرج - مصروفات خطيرة', 30, 10000.00, 'critical', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. دالة: get_farm_financial_summary_for_radar
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_financial_summary_for_radar(
  p_farm_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_30_days_expenses numeric;
  v_last_30_days_income numeric;
  v_last_30_days_net numeric;
  v_pending_approval_count integer;
  v_pending_approval_amount numeric;
  v_total_expenses numeric;
  v_total_income numeric;
  v_balance numeric;
  v_alert_level text;
  v_alert_message text;
  v_warning_threshold numeric;
  v_critical_threshold numeric;
  v_result json;
BEGIN
  -- جلب السقوف النشطة
  SELECT threshold_amount INTO v_warning_threshold
  FROM financial_alert_thresholds
  WHERE is_active = true AND alert_level = 'warning'
  ORDER BY threshold_amount ASC
  LIMIT 1;
  
  SELECT threshold_amount INTO v_critical_threshold
  FROM financial_alert_thresholds
  WHERE is_active = true AND alert_level = 'critical'
  ORDER BY threshold_amount ASC
  LIMIT 1;
  
  -- مصروفات آخر 30 يوم (المعتمدة فقط)
  SELECT COALESCE(SUM(amount), 0) INTO v_last_30_days_expenses
  FROM farm_financial_ledger
  WHERE farm_id = p_farm_id
    AND entry_type = 'expense'
    AND is_approved = true
    AND entry_date >= CURRENT_DATE - INTERVAL '30 days';
  
  -- إيرادات آخر 30 يوم (المعتمدة فقط)
  SELECT COALESCE(SUM(amount), 0) INTO v_last_30_days_income
  FROM farm_financial_ledger
  WHERE farm_id = p_farm_id
    AND entry_type = 'income'
    AND is_approved = true
    AND entry_date >= CURRENT_DATE - INTERVAL '30 days';
  
  v_last_30_days_net := v_last_30_days_income - v_last_30_days_expenses;
  
  -- المصروفات بانتظار الاعتماد
  SELECT 
    COUNT(*)::integer,
    COALESCE(SUM(amount), 0)
  INTO 
    v_pending_approval_count,
    v_pending_approval_amount
  FROM farm_financial_ledger
  WHERE farm_id = p_farm_id
    AND entry_type = 'expense'
    AND approval_status = 'awaiting_approval';
  
  -- المجاميع الكلية (المعتمدة فقط)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM farm_financial_ledger
  WHERE farm_id = p_farm_id
    AND entry_type = 'expense'
    AND is_approved = true;
  
  SELECT COALESCE(SUM(amount), 0) INTO v_total_income
  FROM farm_financial_ledger
  WHERE farm_id = p_farm_id
    AND entry_type = 'income'
    AND is_approved = true;
  
  v_balance := v_total_income - v_total_expenses;
  
  -- تحديد مستوى التنبيه
  v_alert_level := 'normal';
  v_alert_message := NULL;
  
  IF v_critical_threshold IS NOT NULL AND v_last_30_days_expenses >= v_critical_threshold THEN
    v_alert_level := 'critical';
    v_alert_message := format('مصروفات حرجة: %s ريال!', ROUND(v_last_30_days_expenses, 0));
  ELSIF v_warning_threshold IS NOT NULL AND v_last_30_days_expenses >= v_warning_threshold THEN
    v_alert_level := 'warning';
    v_alert_message := format('مصروفات عالية: %s ريال', ROUND(v_last_30_days_expenses, 0));
  END IF;
  
  -- إضافة تنبيه للمعلقات الكثيرة
  IF v_pending_approval_count > 5 THEN
    v_alert_level := CASE 
      WHEN v_alert_level = 'critical' THEN 'critical'
      WHEN v_alert_level = 'warning' THEN 'warning'
      ELSE 'warning'
    END;
    
    IF v_alert_message IS NULL THEN
      v_alert_message := format('%s مصروف معلق', v_pending_approval_count);
    ELSE
      v_alert_message := v_alert_message || format(' + %s معلق', v_pending_approval_count);
    END IF;
  END IF;
  
  -- بناء النتيجة
  v_result := json_build_object(
    'farm_id', p_farm_id,
    'last_30_days', json_build_object(
      'expenses', v_last_30_days_expenses,
      'income', v_last_30_days_income,
      'net', v_last_30_days_net
    ),
    'pending_approval', json_build_object(
      'count', v_pending_approval_count,
      'amount', v_pending_approval_amount
    ),
    'total', json_build_object(
      'expenses', v_total_expenses,
      'income', v_total_income,
      'balance', v_balance
    ),
    'alert', json_build_object(
      'level', v_alert_level,
      'message', v_alert_message,
      'warning_threshold', v_warning_threshold,
      'critical_threshold', v_critical_threshold
    )
  );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- 3. Grant Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_farm_financial_summary_for_radar TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_financial_summary_for_radar TO anon;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE financial_alert_thresholds IS 'سقوف التنبيهات المالية للمزارع';
COMMENT ON FUNCTION get_farm_financial_summary_for_radar IS 'ملخص مالي سريع لمزرعة - يُستخدم في Farm Radar Card';
