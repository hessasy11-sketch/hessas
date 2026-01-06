/*
  # إصلاح تضارب دالة get_active_alerts
  
  حذف جميع النسخ وإنشاء واحدة فقط
*/

-- حذف جميع النسخ
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT oid::regprocedure
    FROM pg_proc
    WHERE proname = 'get_active_alerts'
  ) LOOP
    EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure || ' CASCADE';
  END LOOP;
END $$;

-- إنشاء دالة واحدة فقط
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
