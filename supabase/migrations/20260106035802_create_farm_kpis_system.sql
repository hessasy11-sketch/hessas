/*
  # المرحلة 1: مؤشرات أداء المزرعة (Farm KPIs)
  
  ## الهدف
  عرض مؤشرات أداء شاملة لكل مزرعة في صفحة تفاصيل المزرعة:
  - عدد المهام المكتملة (آخر 30 يوم)
  - عدد المهام المتأخرة
  - متوسط وقت إغلاق المهمة
  - إجمالي المصروفات (آخر 30 يوم)
  - عدد الاعتمادات المرفوضة
  - آخر نشاط تشغيل
  
  ## المكونات
  1. دالة get_farm_kpis(farm_id) - حساب جميع المؤشرات
  2. عرض في Tab "نظرة عامة"
*/

-- =====================================================
-- دالة: get_farm_kpis
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_kpis(
  p_farm_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_completed_tasks_30d integer;
  v_overdue_tasks integer;
  v_avg_completion_time interval;
  v_avg_completion_hours numeric;
  v_total_expenses_30d numeric;
  v_rejected_approvals integer;
  v_last_activity_date timestamptz;
  v_last_activity_description text;
  v_last_activity_type text;
  v_total_tasks integer;
  v_pending_tasks integer;
  v_completion_rate numeric;
  v_result json;
BEGIN
  -- 1. عدد المهام المكتملة (آخر 30 يوم)
  SELECT COUNT(*)::integer INTO v_completed_tasks_30d
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- 2. عدد المهام المتأخرة
  SELECT COUNT(*)::integer INTO v_overdue_tasks
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND status IN ('pending', 'in_progress')
    AND due_date < CURRENT_DATE;
  
  -- 3. متوسط وقت إغلاق المهمة (بالساعات)
  SELECT AVG(completed_at - created_at) INTO v_avg_completion_time
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND status = 'completed'
    AND completed_at IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '90 days';
  
  IF v_avg_completion_time IS NOT NULL THEN
    v_avg_completion_hours := EXTRACT(EPOCH FROM v_avg_completion_time) / 3600;
  ELSE
    v_avg_completion_hours := 0;
  END IF;
  
  -- 4. إجمالي المصروفات (آخر 30 يوم - المعتمدة فقط)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses_30d
  FROM farm_financial_ledger
  WHERE farm_id = p_farm_id
    AND entry_type = 'expense'
    AND is_approved = true
    AND entry_date >= CURRENT_DATE - INTERVAL '30 days';
  
  -- 5. عدد الاعتمادات المرفوضة (آخر 90 يوم)
  SELECT COUNT(*)::integer INTO v_rejected_approvals
  FROM farm_financial_ledger
  WHERE farm_id = p_farm_id
    AND entry_type = 'expense'
    AND approval_status = 'rejected'
    AND entry_date >= CURRENT_DATE - INTERVAL '90 days';
  
  -- 6. آخر نشاط تشغيل
  SELECT 
    created_at,
    description,
    event_type
  INTO 
    v_last_activity_date,
    v_last_activity_description,
    v_last_activity_type
  FROM farm_activity_timeline
  WHERE farm_id = p_farm_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- 7. مؤشرات إضافية
  SELECT COUNT(*)::integer INTO v_total_tasks
  FROM farm_tasks
  WHERE farm_id = p_farm_id;
  
  SELECT COUNT(*)::integer INTO v_pending_tasks
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND status IN ('pending', 'in_progress');
  
  IF v_total_tasks > 0 THEN
    v_completion_rate := (v_completed_tasks_30d::numeric / NULLIF(v_total_tasks, 0)) * 100;
  ELSE
    v_completion_rate := 0;
  END IF;
  
  -- بناء النتيجة
  v_result := json_build_object(
    'farm_id', p_farm_id,
    'period', '30 days',
    'tasks', json_build_object(
      'completed_30d', v_completed_tasks_30d,
      'overdue', v_overdue_tasks,
      'pending', v_pending_tasks,
      'total', v_total_tasks,
      'completion_rate', ROUND(v_completion_rate, 1)
    ),
    'performance', json_build_object(
      'avg_completion_hours', ROUND(v_avg_completion_hours, 1),
      'avg_completion_days', ROUND(v_avg_completion_hours / 24, 1)
    ),
    'financial', json_build_object(
      'total_expenses_30d', v_total_expenses_30d,
      'rejected_approvals', v_rejected_approvals
    ),
    'last_activity', json_build_object(
      'date', v_last_activity_date,
      'description', v_last_activity_description,
      'type', v_last_activity_type
    )
  );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- دالة مساعدة: get_farm_performance_trend
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_performance_trend(
  p_farm_id uuid,
  p_days integer DEFAULT 7
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_completed integer;
  v_previous_completed integer;
  v_trend_percentage numeric;
  v_trend_direction text;
  v_result json;
BEGIN
  -- المهام المكتملة في الفترة الحالية
  SELECT COUNT(*)::integer INTO v_current_completed
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE - (p_days || ' days')::interval;
  
  -- المهام المكتملة في الفترة السابقة
  SELECT COUNT(*)::integer INTO v_previous_completed
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE - (p_days * 2 || ' days')::interval
    AND completed_at < CURRENT_DATE - (p_days || ' days')::interval;
  
  IF v_previous_completed > 0 THEN
    v_trend_percentage := ((v_current_completed - v_previous_completed)::numeric / v_previous_completed) * 100;
  ELSE
    v_trend_percentage := 0;
  END IF;
  
  IF v_trend_percentage > 0 THEN
    v_trend_direction := 'up';
  ELSIF v_trend_percentage < 0 THEN
    v_trend_direction := 'down';
  ELSE
    v_trend_direction := 'stable';
  END IF;
  
  v_result := json_build_object(
    'current_period', v_current_completed,
    'previous_period', v_previous_completed,
    'trend_percentage', ROUND(ABS(v_trend_percentage), 1),
    'trend_direction', v_trend_direction
  );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- Grant Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_farm_kpis TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_kpis TO anon;
GRANT EXECUTE ON FUNCTION get_farm_performance_trend TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_performance_trend TO anon;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON FUNCTION get_farm_kpis IS 'مؤشرات أداء شاملة للمزرعة - يُستخدم في صفحة تفاصيل المزرعة';
COMMENT ON FUNCTION get_farm_performance_trend IS 'اتجاه الأداء للمزرعة - مقارنة بين فترتين';
