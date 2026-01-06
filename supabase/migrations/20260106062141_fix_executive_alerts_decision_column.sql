/*
  # إصلاح دالة التنبيهات - عمود القرار
  
  إصلاح استخدام عمود غير موجود في decision_queue
*/

CREATE OR REPLACE FUNCTION generate_smart_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expense_limit numeric := 5000;
  v_decision_days_limit int := 3;
BEGIN
  -- 1. المصروفات المتجاوزة
  INSERT INTO executive_alerts (alert_type, severity, title, description, farm_id, expense_id, metadata)
  SELECT
    'expense_exceeded',
    CASE
      WHEN fe.amount > v_expense_limit * 2 THEN 'critical'
      WHEN fe.amount > v_expense_limit * 1.5 THEN 'high'
      ELSE 'medium'
    END,
    'مصروف يتجاوز الحد المسموح',
    format('مصروف بقيمة %s ر.س في مزرعة %s',fe.amount, f.name),
    fe.farm_id,
    fe.id,
    jsonb_build_object('amount', fe.amount, 'limit', v_expense_limit)
  FROM farm_expenses fe
  JOIN b2f_farms f ON f.id = fe.farm_id
  WHERE fe.amount > v_expense_limit
  AND fe.approval_status = 'pending'
  AND fe.created_at > now() - interval '1 day'
  AND NOT EXISTS (
    SELECT 1 FROM executive_alerts WHERE expense_id = fe.id AND status = 'active'
  );

  -- 2. انخفاض أداء المزارع
  INSERT INTO executive_alerts (alert_type, severity, title, description, farm_id, metadata)
  SELECT
    'farm_performance_drop',
    'high',
    'انخفاض أداء المزرعة',
    format('مزرعة %s لديها %s قرار معلق', f.name,
      (SELECT COUNT(*) FROM decision_queue WHERE farm_id = f.id AND status = 'pending')),
    f.id,
    jsonb_build_object(
      'pending_decisions', (SELECT COUNT(*) FROM decision_queue WHERE farm_id = f.id AND status = 'pending')
    )
  FROM b2f_farms f
  WHERE (SELECT COUNT(*) FROM decision_queue WHERE farm_id = f.id AND status = 'pending') >= 5
  AND NOT EXISTS (
    SELECT 1 FROM executive_alerts
    WHERE farm_id = f.id AND alert_type = 'farm_performance_drop'
    AND status = 'active' AND created_at > now() - interval '1 day'
  );

  -- 3. القرارات المعلقة طويلاً (محسّن)
  INSERT INTO executive_alerts (alert_type, severity, title, description, farm_id, decision_id, metadata)
  SELECT
    'decision_overdue',
    CASE
      WHEN EXTRACT(DAY FROM now() - dq.created_at) > 7 THEN 'critical'
      WHEN EXTRACT(DAY FROM now() - dq.created_at) > 5 THEN 'high'
      ELSE 'medium'
    END,
    'قرار معلق منذ فترة طويلة',
    format('قرار %s في مزرعة %s معلق منذ %s يوم', 
      dq.decision_type, 
      f.name, 
      EXTRACT(DAY FROM now() - dq.created_at)::int
    ),
    dq.farm_id,
    dq.id,
    jsonb_build_object(
      'days_pending', EXTRACT(DAY FROM now() - dq.created_at)::int,
      'decision_type', dq.decision_type,
      'priority', dq.priority
    )
  FROM decision_queue dq
  JOIN b2f_farms f ON f.id = dq.farm_id
  WHERE dq.status = 'pending'
  AND dq.created_at < now() - make_interval(days => v_decision_days_limit)
  AND NOT EXISTS (
    SELECT 1 FROM executive_alerts WHERE decision_id = dq.id AND status = 'active'
  );

  -- 4. مزادات متعارضة
  INSERT INTO executive_alerts (alert_type, severity, title, description, auction_id, metadata)
  SELECT
    'auction_conflict',
    CASE
      WHEN report_count > 5 THEN 'critical'
      WHEN report_count > 3 THEN 'high'
      ELSE 'medium'
    END,
    'مزاد يحتوي على تعارضات',
    format('مزاد "%s" لديه %s تقرير معلق', a.title, report_count),
    a.id,
    jsonb_build_object('reports_count', report_count)
  FROM auctions a
  JOIN (
    SELECT auction_id, COUNT(*) as report_count
    FROM auction_reports WHERE status = 'pending'
    GROUP BY auction_id HAVING COUNT(*) >= 3
  ) ar ON ar.auction_id = a.id
  WHERE a.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM executive_alerts
    WHERE auction_id = a.id AND alert_type = 'auction_conflict'
    AND status = 'active' AND created_at > now() - interval '1 day'
  );
END;
$$;
