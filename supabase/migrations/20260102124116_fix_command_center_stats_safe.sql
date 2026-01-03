/*
  # إصلاح دالة إحصائيات بوابة القيادة
  
  تعديل الدالة لتعمل بشكل آمن حتى لو كانت جداول B2F غير موجودة
*/

CREATE OR REPLACE FUNCTION get_command_center_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
  v_unreviewed_reports integer := 0;
  v_overdue_tasks integer := 0;
  v_active_farms integer := 0;
  v_affected_investors integer := 0;
  v_critical_alerts integer := 0;
  v_table_exists boolean;
BEGIN
  -- التحقق من الصلاحية
  IF NOT is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  -- التقارير غير المقروءة (تحقق من وجود الجدول أولاً)
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'management_reports'
  ) INTO v_table_exists;
  
  IF v_table_exists THEN
    SELECT COUNT(*) INTO v_unreviewed_reports
    FROM management_reports
    WHERE status = 'sent_to_admin';
  END IF;

  -- المهام المتأخرة
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'farm_tasks'
  ) INTO v_table_exists;
  
  IF v_table_exists THEN
    SELECT COUNT(*) INTO v_overdue_tasks
    FROM farm_tasks
    WHERE due_date < CURRENT_DATE
      AND status IN ('new', 'in_progress');
  END IF;

  -- المزارع النشطة
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'b2f_farms'
  ) INTO v_table_exists;
  
  IF v_table_exists THEN
    SELECT COUNT(*) INTO v_active_farms
    FROM b2f_farms
    WHERE is_active = true;
  END IF;

  -- المستثمرين المتأثرين اليوم
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'investor_operations'
  ) INTO v_table_exists;
  
  IF v_table_exists THEN
    SELECT COUNT(DISTINCT investor_id) INTO v_affected_investors
    FROM investor_operations
    WHERE operation_date::date = CURRENT_DATE;
  END IF;

  -- التنبيهات الحرجة
  SELECT COUNT(*) INTO v_critical_alerts
  FROM platform_alerts
  WHERE is_resolved = false
    AND severity IN ('high', 'critical');

  RETURN jsonb_build_object(
    'unreviewed_reports', v_unreviewed_reports,
    'overdue_tasks', v_overdue_tasks,
    'active_farms', v_active_farms,
    'affected_investors_today', v_affected_investors,
    'critical_alerts', v_critical_alerts
  );
END;
$$;
