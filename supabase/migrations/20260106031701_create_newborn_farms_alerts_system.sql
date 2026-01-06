/*
  # نظام تنبيه المزارع الوليدة - المرحلة 4
  
  ## الهدف
  عرض المزارع التي وُلدت حديثاً (خلال 7 أيام) ولم تكتمل مهام التأسيس
  لعرضها في غرفة عمليات B2F أعلى Farm Radar
  
  ## الشروط
  1. لديها حدث FARM_BORN خلال آخر 7 أيام
  2. مهام التأسيس لم تكتمل بنسبة 100%
  
  ## الدوال
  1. get_newborn_farms_needing_activation - المزارع الجديدة التي تحتاج تفعيل
  2. get_newborn_farm_details - تفاصيل مزرعة وليدة محددة
  3. get_newborn_farms_stats - إحصائيات سريعة
*/

-- =====================================================
-- 1. دالة: المزارع الوليدة التي تحتاج تفعيل
-- =====================================================
CREATE OR REPLACE FUNCTION get_newborn_farms_needing_activation(
  p_days_threshold integer DEFAULT 7
)
RETURNS TABLE (
  farm_id uuid,
  farm_name text,
  farm_location text,
  farm_city text,
  operational_status text,
  
  birth_event_id uuid,
  birth_date timestamptz,
  days_since_birth integer,
  
  contract_id uuid,
  contract_number text,
  investor_phone text,
  trees_count integer,
  amount_total numeric,
  
  total_setup_tasks integer,
  completed_tasks integer,
  pending_tasks integer,
  completion_rate numeric,
  
  urgency_level text,
  needs_attention boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH farm_births AS (
    SELECT
      fbe.id as birth_event_id,
      fbe.farm_id,
      fbe.contract_id,
      fbe.investor_phone,
      fbe.trees_count as birth_trees_count,
      fbe.created_at as birth_date,
      EXTRACT(DAY FROM (now() - fbe.created_at))::integer as days_since_birth,
      (fbe.metadata->>'amount_total')::numeric as amount_total,
      (fbe.metadata->>'contract_number')::text as contract_number
    FROM farm_birth_events fbe
    WHERE fbe.event_type = 'FARM_BORN'
      AND fbe.created_at >= (now() - (p_days_threshold || ' days')::interval)
  ),
  task_stats AS (
    SELECT
      ft.farm_id,
      COUNT(*)::integer as total_tasks,
      COUNT(*) FILTER (WHERE ft.status = 'approved')::integer as completed_tasks,
      COUNT(*) FILTER (WHERE ft.status IN ('pending', 'in_progress'))::integer as pending_tasks,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE ft.status = 'approved')::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0
      END as completion_rate
    FROM farm_tasks ft
    WHERE ft.task_type = 'setup'
    GROUP BY ft.farm_id
  )
  SELECT
    f.id as farm_id,
    f.name as farm_name,
    f.location as farm_location,
    f.city as farm_city,
    f.operational_status,
    
    fb.birth_event_id,
    fb.birth_date,
    fb.days_since_birth,
    
    fb.contract_id,
    fb.contract_number,
    fb.investor_phone,
    fb.birth_trees_count as trees_count,
    fb.amount_total,
    
    COALESCE(ts.total_tasks, 0) as total_setup_tasks,
    COALESCE(ts.completed_tasks, 0) as completed_tasks,
    COALESCE(ts.pending_tasks, 0) as pending_tasks,
    COALESCE(ts.completion_rate, 0) as completion_rate,
    
    CASE
      WHEN fb.days_since_birth <= 1 THEN 'new'
      WHEN fb.days_since_birth <= 3 THEN 'normal'
      WHEN fb.days_since_birth <= 5 THEN 'attention'
      ELSE 'urgent'
    END as urgency_level,
    
    CASE
      WHEN COALESCE(ts.completion_rate, 0) < 100 THEN true
      ELSE false
    END as needs_attention
    
  FROM farm_births fb
  INNER JOIN b2f_farms f ON f.id = fb.farm_id
  LEFT JOIN task_stats ts ON ts.farm_id = fb.farm_id
  WHERE COALESCE(ts.completion_rate, 0) < 100  -- فقط المزارع غير المكتملة
  ORDER BY 
    fb.days_since_birth DESC,  -- الأقدم أولاً
    ts.completion_rate ASC;    -- الأقل اكتمالاً أولاً
END;
$$;

-- =====================================================
-- 2. دالة: تفاصيل مزرعة وليدة محددة
-- =====================================================
CREATE OR REPLACE FUNCTION get_newborn_farm_details(
  p_farm_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_details json;
BEGIN
  WITH farm_birth AS (
    SELECT
      fbe.id as birth_event_id,
      fbe.created_at as birth_date,
      fbe.contract_id,
      fbe.investor_phone,
      fbe.trees_count,
      fbe.metadata
    FROM farm_birth_events fbe
    WHERE fbe.farm_id = p_farm_id
      AND fbe.event_type = 'FARM_BORN'
    ORDER BY fbe.created_at DESC
    LIMIT 1
  ),
  task_info AS (
    SELECT
      COUNT(*)::integer as total_tasks,
      COUNT(*) FILTER (WHERE status = 'approved')::integer as completed,
      COUNT(*) FILTER (WHERE status = 'pending')::integer as pending,
      COUNT(*) FILTER (WHERE status = 'in_progress')::integer as in_progress,
      array_agg(
        json_build_object(
          'id', id,
          'title', title,
          'status', status,
          'priority', priority,
          'due_date', due_date
        ) ORDER BY priority DESC, due_date ASC
      ) FILTER (WHERE status != 'approved') as pending_tasks_list
    FROM farm_tasks
    WHERE farm_id = p_farm_id
      AND task_type = 'setup'
  )
  SELECT json_build_object(
    'farm', (SELECT row_to_json(f.*) FROM b2f_farms f WHERE f.id = p_farm_id),
    'birth_event', (SELECT row_to_json(fb.*) FROM farm_birth fb),
    'setup_tasks', (SELECT row_to_json(ti.*) FROM task_info ti),
    'days_since_birth', (
      SELECT EXTRACT(DAY FROM (now() - birth_date))::integer 
      FROM farm_birth
    )
  )
  INTO v_details;
  
  RETURN COALESCE(v_details, '{}'::json);
END;
$$;

-- =====================================================
-- 3. دالة: إحصائيات سريعة للمزارع الوليدة
-- =====================================================
CREATE OR REPLACE FUNCTION get_newborn_farms_stats(
  p_days_threshold integer DEFAULT 7
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats json;
BEGIN
  WITH newborn_data AS (
    SELECT * FROM get_newborn_farms_needing_activation(p_days_threshold)
  )
  SELECT json_build_object(
    'total_newborn_farms', COUNT(*)::integer,
    'by_urgency', json_build_object(
      'new', COUNT(*) FILTER (WHERE urgency_level = 'new')::integer,
      'normal', COUNT(*) FILTER (WHERE urgency_level = 'normal')::integer,
      'attention', COUNT(*) FILTER (WHERE urgency_level = 'attention')::integer,
      'urgent', COUNT(*) FILTER (WHERE urgency_level = 'urgent')::integer
    ),
    'avg_completion_rate', ROUND(AVG(completion_rate), 2),
    'total_pending_tasks', SUM(pending_tasks)::integer,
    'farms_needing_urgent_attention', COUNT(*) FILTER (WHERE urgency_level = 'urgent')::integer,
    'farms_with_zero_progress', COUNT(*) FILTER (WHERE completion_rate = 0)::integer
  )
  INTO v_stats
  FROM newborn_data;
  
  RETURN COALESCE(v_stats, json_build_object(
    'total_newborn_farms', 0,
    'by_urgency', json_build_object('new', 0, 'normal', 0, 'attention', 0, 'urgent', 0),
    'avg_completion_rate', 0,
    'total_pending_tasks', 0,
    'farms_needing_urgent_attention', 0,
    'farms_with_zero_progress', 0
  ));
END;
$$;

-- =====================================================
-- 4. دالة: عدد المزارع الوليدة (عداد سريع)
-- =====================================================
CREATE OR REPLACE FUNCTION count_newborn_farms_needing_activation(
  p_days_threshold integer DEFAULT 7
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer
  INTO v_count
  FROM get_newborn_farms_needing_activation(p_days_threshold);
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- =====================================================
-- 5. Grant Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_newborn_farms_needing_activation(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_newborn_farms_needing_activation(integer) TO anon;
GRANT EXECUTE ON FUNCTION get_newborn_farm_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_newborn_farm_details(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_newborn_farms_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_newborn_farms_stats(integer) TO anon;
GRANT EXECUTE ON FUNCTION count_newborn_farms_needing_activation(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION count_newborn_farms_needing_activation(integer) TO anon;

-- =====================================================
-- تعليقات توضيحية
-- =====================================================
COMMENT ON FUNCTION get_newborn_farms_needing_activation IS 'المزارع الوليدة التي تحتاج تفعيل (خلال 7 أيام ولم تكتمل مهام التأسيس)';
COMMENT ON FUNCTION get_newborn_farm_details IS 'تفاصيل كاملة لمزرعة وليدة محددة';
COMMENT ON FUNCTION get_newborn_farms_stats IS 'إحصائيات سريعة للمزارع الوليدة';
COMMENT ON FUNCTION count_newborn_farms_needing_activation IS 'عداد سريع للمزارع الوليدة';
