/*
  # دوال نظام قيادة المزارع
  
  ## الدوال
  1. birth_operational_farm - ولادة مزرعة تشغيلية من عقد
  2. get_operational_farm_stats - إحصائيات المزرعة
  3. add_farm_event - إضافة حدث للمزرعة
  4. get_farm_financial_summary - ملخص مالي شهري
*/

-- =============================================================================
-- 1. ولادة مزرعة تشغيلية
-- =============================================================================

CREATE OR REPLACE FUNCTION birth_operational_farm(
  p_contract_id uuid,
  p_sales_request_id uuid,
  p_reference_farm_id uuid,
  p_operational_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operational_farm_id uuid;
BEGIN
  -- إنشاء المزرعة التشغيلية
  INSERT INTO fc_operational_farms (
    reference_farm_id,
    operational_name,
    operational_status
  )
  VALUES (
    p_reference_farm_id,
    p_operational_name,
    'setup'
  )
  RETURNING id INTO v_operational_farm_id;
  
  -- تسجيل الولادة
  INSERT INTO fc_birth_records (
    operational_farm_id,
    source_contract_id,
    source_sales_request_id,
    birth_reason
  )
  VALUES (
    v_operational_farm_id,
    p_contract_id,
    p_sales_request_id,
    'investment_completion'
  );
  
  -- إضافة حدث الولادة
  INSERT INTO fc_event_log (
    operational_farm_id,
    event_type,
    event_title,
    event_description,
    severity
  )
  VALUES (
    v_operational_farm_id,
    'farm_birth',
    'ولادة مزرعة تشغيلية',
    'تم إنشاء المزرعة التشغيلية من اكتمال استثمار',
    'success'
  );
  
  RETURN v_operational_farm_id;
END;
$$;

-- =============================================================================
-- 2. إحصائيات المزرعة التشغيلية
-- =============================================================================

CREATE OR REPLACE FUNCTION get_operational_farm_stats(p_farm_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_contents', (SELECT COUNT(*) FROM fc_farm_contents WHERE operational_farm_id = p_farm_id),
    'total_trees', (SELECT COALESCE(SUM(quantity), 0) FROM fc_farm_contents WHERE operational_farm_id = p_farm_id AND content_type = 'trees'),
    'total_teams', (SELECT COUNT(*) FROM fc_teams WHERE operational_farm_id = p_farm_id AND is_active = true),
    'total_team_members', (
      SELECT COUNT(*) FROM fc_team_members tm
      JOIN fc_teams t ON tm.team_id = t.id
      WHERE t.operational_farm_id = p_farm_id AND tm.is_active = true
    ),
    'open_tickets', (SELECT COUNT(*) FROM fc_technicians WHERE operational_farm_id = p_farm_id AND status IN ('open', 'in_progress')),
    'total_equipment', (SELECT COUNT(*) FROM fc_equipment WHERE operational_farm_id = p_farm_id),
    'operational_equipment', (SELECT COUNT(*) FROM fc_equipment WHERE operational_farm_id = p_farm_id AND status = 'operational'),
    'total_income', (SELECT COALESCE(SUM(amount), 0) FROM fc_financial_ledger WHERE operational_farm_id = p_farm_id AND transaction_type = 'income'),
    'total_expenses', (SELECT COALESCE(SUM(amount), 0) FROM fc_financial_ledger WHERE operational_farm_id = p_farm_id AND transaction_type = 'expense'),
    'recent_events_count', (SELECT COUNT(*) FROM fc_event_log WHERE operational_farm_id = p_farm_id AND created_at > NOW() - INTERVAL '7 days')
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$;

-- =============================================================================
-- 3. إضافة حدث للمزرعة
-- =============================================================================

CREATE OR REPLACE FUNCTION add_farm_event(
  p_farm_id uuid,
  p_event_type text,
  p_event_title text,
  p_event_description text DEFAULT NULL,
  p_severity text DEFAULT 'info',
  p_triggered_by uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO fc_event_log (
    operational_farm_id,
    event_type,
    event_title,
    event_description,
    severity,
    triggered_by,
    metadata
  )
  VALUES (
    p_farm_id,
    p_event_type,
    p_event_title,
    p_event_description,
    p_severity,
    p_triggered_by,
    p_metadata
  )
  RETURNING id INTO v_event_id;
  
  -- تحديث آخر نشاط في المزرعة
  UPDATE fc_operational_farms
  SET last_activity_at = NOW()
  WHERE id = p_farm_id;
  
  RETURN v_event_id;
END;
$$;

-- =============================================================================
-- 4. ملخص مالي شهري
-- =============================================================================

CREATE OR REPLACE FUNCTION get_farm_financial_summary(
  p_farm_id uuid,
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  p_month integer DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_summary jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_income', COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0),
    'total_expenses', COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0),
    'net_balance', COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -amount END), 0),
    'transaction_count', COUNT(*),
    'income_transactions', COUNT(*) FILTER (WHERE transaction_type = 'income'),
    'expense_transactions', COUNT(*) FILTER (WHERE transaction_type = 'expense'),
    'by_category', jsonb_object_agg(
      category,
      SUM(amount)
    )
  )
  INTO v_summary
  FROM fc_financial_ledger
  WHERE operational_farm_id = p_farm_id
    AND EXTRACT(YEAR FROM transaction_date) = p_year
    AND EXTRACT(MONTH FROM transaction_date) = p_month;
  
  RETURN v_summary;
END;
$$;