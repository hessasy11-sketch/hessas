/*
  # تصحيح نهائي لدالة get_farm_kpis
  
  استخدام الأعمدة الصحيحة من farm_activity_timeline:
  - event_data->>'description' بدلاً من description
*/

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
    AND status = 'approved'
    AND approved_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- 2. عدد المهام المتأخرة
  SELECT COUNT(*)::integer INTO v_overdue_tasks
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND status IN ('pending', 'in_progress', 'submitted')
    AND due_date < CURRENT_DATE;
  
  -- 3. متوسط وقت إغلاق المهمة
  SELECT AVG(approved_at - created_at) INTO v_avg_completion_time
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND status = 'approved'
    AND approved_at IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '90 days';
  
  IF v_avg_completion_time IS NOT NULL THEN
    v_avg_completion_hours := EXTRACT(EPOCH FROM v_avg_completion_time) / 3600;
  ELSE
    v_avg_completion_hours := 0;
  END IF;
  
  -- 4. إجمالي المصروفات
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses_30d
  FROM farm_financial_ledger
  WHERE farm_id = p_farm_id
    AND entry_type = 'expense'
    AND is_approved = true
    AND entry_date >= CURRENT_DATE - INTERVAL '30 days';
  
  -- 5. عدد الاعتمادات المرفوضة
  SELECT COUNT(*)::integer INTO v_rejected_approvals
  FROM (
    SELECT id FROM farm_tasks
    WHERE farm_id = p_farm_id
      AND status = 'rejected'
      AND rejected_at >= CURRENT_DATE - INTERVAL '90 days'
    UNION ALL
    SELECT id FROM farm_financial_ledger
    WHERE farm_id = p_farm_id
      AND entry_type = 'expense'
      AND approval_status = 'rejected'
      AND entry_date >= CURRENT_DATE - INTERVAL '90 days'
  ) rejected_items;
  
  -- 6. آخر نشاط تشغيل (استخدام event_data)
  SELECT 
    created_at,
    COALESCE(
      event_data->>'description',
      event_data->>'title',
      actor_name || ' - ' || event_type
    ),
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
    AND status IN ('pending', 'in_progress', 'submitted');
  
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
