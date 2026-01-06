/*
  # نظام التنبيهات القيادية الذكية - Clean Install
  
  تنبيهات ذكية للحالات الحرجة فقط
*/

-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS generate_smart_alerts();
DROP FUNCTION IF EXISTS dismiss_alert(uuid, uuid);
DROP FUNCTION IF EXISTS get_active_alerts();

-- ===================================
-- جدول التنبيهات القيادية
-- ===================================
CREATE TABLE IF NOT EXISTS executive_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  alert_type text NOT NULL CHECK (alert_type IN (
    'expense_exceeded',
    'farm_performance_drop',
    'decision_overdue',
    'auction_conflict'
  )),
  
  severity text NOT NULL DEFAULT 'high' CHECK (severity IN ('critical', 'high', 'medium')),
  
  title text NOT NULL,
  description text NOT NULL,
  
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES decision_queue(id) ON DELETE CASCADE,
  expense_id uuid REFERENCES farm_expenses(id) ON DELETE CASCADE,
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE,
  
  metadata jsonb DEFAULT '{}'::jsonb,
  
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'resolved')),
  dismissed_by uuid REFERENCES platform_staff(id),
  dismissed_at timestamptz,
  resolved_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_executive_alerts_status ON executive_alerts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_executive_alerts_type ON executive_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_executive_alerts_severity ON executive_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_executive_alerts_farm ON executive_alerts(farm_id) WHERE farm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_executive_alerts_created ON executive_alerts(created_at DESC);

ALTER TABLE executive_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read all alerts" ON executive_alerts;
DROP POLICY IF EXISTS "Admins can dismiss alerts" ON executive_alerts;
DROP POLICY IF EXISTS "System can create alerts" ON executive_alerts;

CREATE POLICY "Admins can read all alerts"
  ON executive_alerts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'general_manager', 'operations_manager')
    )
  );

CREATE POLICY "Admins can dismiss alerts"
  ON executive_alerts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'general_manager', 'operations_manager')
    )
  );

CREATE POLICY "System can create alerts"
  ON executive_alerts FOR INSERT
  WITH CHECK (true);

-- ===================================
-- دالة: توليد التنبيهات الذكية
-- ===================================
CREATE FUNCTION generate_smart_alerts()
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

  -- 3. القرارات المعلقة طويلاً
  INSERT INTO executive_alerts (alert_type, severity, title, description, farm_id, decision_id, metadata)
  SELECT
    'decision_overdue',
    CASE
      WHEN EXTRACT(DAY FROM now() - dq.created_at) > 7 THEN 'critical'
      WHEN EXTRACT(DAY FROM now() - dq.created_at) > 5 THEN 'high'
      ELSE 'medium'
    END,
    'قرار معلق منذ فترة طويلة',
    format('قرار %s معلق منذ %s يوم', dq.title, EXTRACT(DAY FROM now() - dq.created_at)::int),
    dq.farm_id,
    dq.id,
    jsonb_build_object('days_pending', EXTRACT(DAY FROM now() - dq.created_at)::int)
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

-- ===================================
-- دالة: رفض تنبيه
-- ===================================
CREATE FUNCTION dismiss_alert(p_alert_id uuid, p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE executive_alerts
  SET status = 'dismissed', dismissed_by = p_staff_id, dismissed_at = now(), updated_at = now()
  WHERE id = p_alert_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'التنبيه غير موجود');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'تم رفض التنبيه');
END;
$$;

-- ===================================
-- دالة: جلب التنبيهات النشطة
-- ===================================
CREATE FUNCTION get_active_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alerts jsonb;
  v_stats jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ea.id,
      'alert_type', ea.alert_type,
      'severity', ea.severity,
      'title', ea.title,
      'description', ea.description,
      'farm_id', ea.farm_id,
      'farm_name', f.name,
      'decision_id', ea.decision_id,
      'expense_id', ea.expense_id,
      'auction_id', ea.auction_id,
      'metadata', ea.metadata,
      'created_at', ea.created_at
    )
    ORDER BY
      CASE ea.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
      ea.created_at DESC
  )
  INTO v_alerts
  FROM executive_alerts ea
  LEFT JOIN b2f_farms f ON f.id = ea.farm_id
  WHERE ea.status = 'active';

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'critical', COUNT(*) FILTER (WHERE severity = 'critical'),
    'high', COUNT(*) FILTER (WHERE severity = 'high'),
    'medium', COUNT(*) FILTER (WHERE severity = 'medium')
  )
  INTO v_stats
  FROM executive_alerts WHERE status = 'active';

  RETURN jsonb_build_object(
    'alerts', COALESCE(v_alerts, '[]'::jsonb),
    'stats', COALESCE(v_stats, jsonb_build_object('total', 0, 'critical', 0, 'high', 0, 'medium', 0))
  );
END;
$$;

-- ===================================
-- Trigger
-- ===================================
CREATE OR REPLACE FUNCTION update_executive_alerts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_executive_alerts_timestamp ON executive_alerts;
CREATE TRIGGER trigger_update_executive_alerts_timestamp
  BEFORE UPDATE ON executive_alerts
  FOR EACH ROW EXECUTE FUNCTION update_executive_alerts_timestamp();

-- ===================================
-- تفعيل Realtime
-- ===================================
ALTER PUBLICATION supabase_realtime ADD TABLE executive_alerts;
