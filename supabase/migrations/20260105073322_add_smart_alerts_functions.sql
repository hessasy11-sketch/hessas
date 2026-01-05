/*
  # دوال التنبيهات الذكية - Smart Alerts Functions

  1. الدوال الجديدة:
    - generate_smart_alerts() - توليد التنبيهات تلقائياً
    - get_active_alerts() - جلب التنبيهات النشطة
    - resolve_alert() - حل تنبيه
    - get_alerts_summary() - ملخص التنبيهات

  2. الوظائف:
    - تحليل حالة المزارع وتوليد تنبيهات
    - مزارع جاهزة للمراجعة (readiness >= 80%)
    - مزارع موقوفة أكثر من 7 أيام
    - أعطال حرجة مفتوحة
    - مصاريف مرتفعة (> 50,000 ريال شهرياً)
*/

-- دالة توليد التنبيهات الذكية
CREATE OR REPLACE FUNCTION generate_smart_alerts()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alerts_created integer := 0;
  v_farm record;
  v_readiness integer;
  v_suspended_days integer;
  v_open_issues integer;
  v_monthly_expenses numeric;
BEGIN
  -- حذف التنبيهات القديمة المحلولة (أكثر من 30 يوم)
  DELETE FROM fc_farm_alerts
  WHERE is_resolved = true
  AND resolved_at < now() - interval '30 days';

  -- المرور على كل مزرعة
  FOR v_farm IN SELECT id, name, operational_status, suspended_at FROM b2f_farms LOOP

    -- 1. تنبيه: مزرعة جاهزة للمراجعة
    SELECT calculate_farm_readiness(v_farm.id) INTO v_readiness;

    IF v_readiness >= 80 AND v_farm.operational_status = 'setup' THEN
      -- التحقق من عدم وجود تنبيه مشابه
      IF NOT EXISTS (
        SELECT 1 FROM fc_farm_alerts
        WHERE farm_id = v_farm.id
        AND alert_type = 'farm_ready_for_review'
        AND is_resolved = false
      ) THEN
        INSERT INTO fc_farm_alerts (
          alert_type,
          farm_id,
          severity,
          message,
          data
        ) VALUES (
          'farm_ready_for_review',
          v_farm.id,
          'info',
          'المزرعة "' || v_farm.name || '" جاهزة للمراجعة والتفعيل',
          json_build_object(
            'readiness_score', v_readiness,
            'farm_name', v_farm.name
          )
        );
        v_alerts_created := v_alerts_created + 1;
      END IF;
    END IF;

    -- 2. تنبيه: مزرعة موقوفة أكثر من 7 أيام
    IF v_farm.operational_status = 'suspended' AND v_farm.suspended_at IS NOT NULL THEN
      v_suspended_days := EXTRACT(DAY FROM (now() - v_farm.suspended_at));

      IF v_suspended_days > 7 THEN
        IF NOT EXISTS (
          SELECT 1 FROM fc_farm_alerts
          WHERE farm_id = v_farm.id
          AND alert_type = 'farm_long_suspended'
          AND is_resolved = false
        ) THEN
          INSERT INTO fc_farm_alerts (
            alert_type,
            farm_id,
            severity,
            message,
            data
          ) VALUES (
            'farm_long_suspended',
            v_farm.id,
            'warning',
            'المزرعة "' || v_farm.name || '" موقوفة منذ ' || v_suspended_days || ' يوم',
            json_build_object(
              'suspended_days', v_suspended_days,
              'farm_name', v_farm.name
            )
          );
          v_alerts_created := v_alerts_created + 1;
        END IF;
      END IF;
    END IF;

    -- 3. تنبيه: أعطال حرجة مفتوحة
    SELECT COUNT(*) INTO v_open_issues
    FROM fc_issue_reports
    WHERE farm_id = v_farm.id
    AND severity = 'critical'
    AND status IN ('reported', 'acknowledged', 'in_progress');

    IF v_open_issues > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM fc_farm_alerts
        WHERE farm_id = v_farm.id
        AND alert_type = 'critical_issues_open'
        AND is_resolved = false
      ) THEN
        INSERT INTO fc_farm_alerts (
          alert_type,
          farm_id,
          severity,
          message,
          data
        ) VALUES (
          'critical_issues_open',
          v_farm.id,
          'critical',
          'المزرعة "' || v_farm.name || '" لديها ' || v_open_issues || ' عطل حرج مفتوح',
          json_build_object(
            'open_issues_count', v_open_issues,
            'farm_name', v_farm.name
          )
        );
        v_alerts_created := v_alerts_created + 1;
      END IF;
    END IF;

    -- 4. تنبيه: مصاريف مرتفعة هذا الشهر
    SELECT COALESCE(SUM(amount), 0) INTO v_monthly_expenses
    FROM fc_financial_ledger
    WHERE farm_id = v_farm.id
    AND entry_type = 'expense'
    AND transaction_date >= date_trunc('month', CURRENT_DATE);

    IF v_monthly_expenses > 50000 THEN
      IF NOT EXISTS (
        SELECT 1 FROM fc_farm_alerts
        WHERE farm_id = v_farm.id
        AND alert_type = 'high_expenses'
        AND is_resolved = false
        AND created_at >= date_trunc('month', CURRENT_DATE)
      ) THEN
        INSERT INTO fc_farm_alerts (
          alert_type,
          farm_id,
          severity,
          message,
          data
        ) VALUES (
          'high_expenses',
          v_farm.id,
          'warning',
          'المزرعة "' || v_farm.name || '" مصاريفها هذا الشهر مرتفعة: ' || v_monthly_expenses || ' ريال',
          json_build_object(
            'monthly_expenses', v_monthly_expenses,
            'farm_name', v_farm.name
          )
        );
        v_alerts_created := v_alerts_created + 1;
      END IF;
    END IF;

  END LOOP;

  RETURN json_build_object(
    'success', true,
    'alerts_created', v_alerts_created,
    'message', 'تم توليد ' || v_alerts_created || ' تنبيه جديد'
  );
END;
$$;

-- دالة جلب التنبيهات النشطة
CREATE OR REPLACE FUNCTION get_active_alerts()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', a.id,
      'alert_type', a.alert_type,
      'farm_id', a.farm_id,
      'farm_name', f.name,
      'severity', a.severity,
      'message', a.message,
      'data', a.data,
      'created_at', a.created_at
    ) ORDER BY
      CASE a.severity
        WHEN 'critical' THEN 1
        WHEN 'warning' THEN 2
        WHEN 'info' THEN 3
      END,
      a.created_at DESC
  ), '[]'::json) INTO v_result
  FROM fc_farm_alerts a
  LEFT JOIN b2f_farms f ON f.id = a.farm_id
  WHERE a.is_resolved = false;

  RETURN v_result;
END;
$$;

-- دالة حل تنبيه
CREATE OR REPLACE FUNCTION resolve_alert(p_alert_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE fc_farm_alerts
  SET
    is_resolved = true,
    resolved_at = now()
  WHERE id = p_alert_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم حل التنبيه'
  );
END;
$$;

-- دالة ملخص التنبيهات
CREATE OR REPLACE FUNCTION get_alerts_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_info_count integer;
  v_warning_count integer;
  v_critical_count integer;
  v_farms_ready integer;
  v_farms_suspended integer;
  v_critical_issues integer;
  v_high_expenses integer;
BEGIN
  -- عدد التنبيهات حسب الأهمية
  SELECT
    COUNT(*) FILTER (WHERE severity = 'info'),
    COUNT(*) FILTER (WHERE severity = 'warning'),
    COUNT(*) FILTER (WHERE severity = 'critical')
  INTO v_info_count, v_warning_count, v_critical_count
  FROM fc_farm_alerts
  WHERE is_resolved = false;

  -- عدد التنبيهات حسب النوع
  SELECT COUNT(*) INTO v_farms_ready
  FROM fc_farm_alerts
  WHERE alert_type = 'farm_ready_for_review'
  AND is_resolved = false;

  SELECT COUNT(*) INTO v_farms_suspended
  FROM fc_farm_alerts
  WHERE alert_type = 'farm_long_suspended'
  AND is_resolved = false;

  SELECT COUNT(*) INTO v_critical_issues
  FROM fc_farm_alerts
  WHERE alert_type = 'critical_issues_open'
  AND is_resolved = false;

  SELECT COUNT(*) INTO v_high_expenses
  FROM fc_farm_alerts
  WHERE alert_type = 'high_expenses'
  AND is_resolved = false;

  RETURN json_build_object(
    'by_severity', json_build_object(
      'info', v_info_count,
      'warning', v_warning_count,
      'critical', v_critical_count,
      'total', v_info_count + v_warning_count + v_critical_count
    ),
    'by_type', json_build_object(
      'farms_ready', v_farms_ready,
      'farms_suspended', v_farms_suspended,
      'critical_issues', v_critical_issues,
      'high_expenses', v_high_expenses
    )
  );
END;
$$;