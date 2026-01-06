/*
  # دوال إدارة Farm Clusters
  
  1. إنشاء cluster
  2. تحديث cluster
  3. حذف cluster
  4. ربط/فك ربط مزرعة
  5. إحصائيات cluster واحد
  6. إحصائيات جميع clusters
*/

-- ===================================
-- دالة: إنشاء Cluster
-- ===================================
CREATE OR REPLACE FUNCTION create_farm_cluster(
  p_name text,
  p_name_en text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_supervisor_id uuid DEFAULT NULL,
  p_region_id uuid DEFAULT NULL,
  p_city_id uuid DEFAULT NULL,
  p_priority text DEFAULT 'normal'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cluster_id uuid;
BEGIN
  INSERT INTO farm_clusters (
    name,
    name_en,
    description,
    supervisor_id,
    region_id,
    city_id,
    priority,
    status
  ) VALUES (
    p_name,
    p_name_en,
    p_description,
    p_supervisor_id,
    p_region_id,
    p_city_id,
    p_priority,
    'active'
  ) RETURNING id INTO v_cluster_id;
  
  RETURN v_cluster_id;
END;
$$;

-- ===================================
-- دالة: تحديث Cluster
-- ===================================
CREATE OR REPLACE FUNCTION update_farm_cluster(
  p_cluster_id uuid,
  p_name text DEFAULT NULL,
  p_name_en text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_supervisor_id uuid DEFAULT NULL,
  p_region_id uuid DEFAULT NULL,
  p_city_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_priority text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE farm_clusters
  SET
    name = COALESCE(p_name, name),
    name_en = COALESCE(p_name_en, name_en),
    description = COALESCE(p_description, description),
    supervisor_id = COALESCE(p_supervisor_id, supervisor_id),
    region_id = COALESCE(p_region_id, region_id),
    city_id = COALESCE(p_city_id, city_id),
    status = COALESCE(p_status, status),
    priority = COALESCE(p_priority, priority),
    updated_at = now()
  WHERE id = p_cluster_id;
  
  RETURN FOUND;
END;
$$;

-- ===================================
-- دالة: حذف Cluster
-- ===================================
CREATE OR REPLACE FUNCTION delete_farm_cluster(p_cluster_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- فك ربط المزارع أولاً
  UPDATE b2f_farms
  SET cluster_id = NULL
  WHERE cluster_id = p_cluster_id;
  
  -- حذف الـ cluster
  DELETE FROM farm_clusters
  WHERE id = p_cluster_id;
  
  RETURN FOUND;
END;
$$;

-- ===================================
-- دالة: ربط مزرعة بـ Cluster
-- ===================================
CREATE OR REPLACE FUNCTION assign_farm_to_cluster(
  p_farm_id uuid,
  p_cluster_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE b2f_farms
  SET cluster_id = p_cluster_id
  WHERE id = p_farm_id;
  
  RETURN FOUND;
END;
$$;

-- ===================================
-- دالة: فك ربط مزرعة من Cluster
-- ===================================
CREATE OR REPLACE FUNCTION unassign_farm_from_cluster(p_farm_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE b2f_farms
  SET cluster_id = NULL
  WHERE id = p_farm_id;
  
  RETURN FOUND;
END;
$$;

-- ===================================
-- دالة: إحصائيات Cluster واحد (مفصلة)
-- ===================================
CREATE OR REPLACE FUNCTION get_cluster_metrics(p_cluster_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cluster_info jsonb;
  v_farms_count int;
  v_active_farms int;
  v_struggling_farms int;
  v_total_expenses numeric;
  v_pending_decisions int;
  v_pending_expenses int;
  v_avg_performance numeric;
BEGIN
  -- معلومات الـ Cluster
  SELECT jsonb_build_object(
    'id', fc.id,
    'name', fc.name,
    'name_en', fc.name_en,
    'description', fc.description,
    'supervisor_id', fc.supervisor_id,
    'supervisor_name', ps.full_name,
    'region_id', fc.region_id,
    'region_name', r.name_ar,
    'status', fc.status,
    'priority', fc.priority,
    'created_at', fc.created_at
  ) INTO v_cluster_info
  FROM farm_clusters fc
  LEFT JOIN platform_staff ps ON ps.id = fc.supervisor_id
  LEFT JOIN regions r ON r.id = fc.region_id
  WHERE fc.id = p_cluster_id;
  
  -- عدد المزارع
  SELECT COUNT(*) INTO v_farms_count
  FROM b2f_farms
  WHERE cluster_id = p_cluster_id;
  
  -- المزارع النشطة
  SELECT COUNT(*) INTO v_active_farms
  FROM b2f_farms
  WHERE cluster_id = p_cluster_id
  AND operational_status = 'operational';
  
  -- المزارع المتعثرة
  SELECT COUNT(*) INTO v_struggling_farms
  FROM b2f_farms
  WHERE cluster_id = p_cluster_id
  AND operational_status IN ('suspended', 'maintenance');
  
  -- إجمالي المصروفات (آخر 30 يوم)
  SELECT COALESCE(SUM(fe.amount), 0) INTO v_total_expenses
  FROM farm_expenses fe
  JOIN b2f_farms f ON f.id = fe.farm_id
  WHERE f.cluster_id = p_cluster_id
  AND fe.created_at > now() - interval '30 days';
  
  -- القرارات المعلقة
  SELECT COUNT(*) INTO v_pending_decisions
  FROM decision_queue dq
  JOIN b2f_farms f ON f.id = dq.farm_id
  WHERE f.cluster_id = p_cluster_id
  AND dq.status = 'pending';
  
  -- المصروفات المعلقة
  SELECT COUNT(*) INTO v_pending_expenses
  FROM farm_expenses fe
  JOIN b2f_farms f ON f.id = fe.farm_id
  WHERE f.cluster_id = p_cluster_id
  AND fe.approval_status = 'pending';
  
  -- متوسط الأداء
  SELECT COALESCE(AVG(
    CASE
      WHEN operational_status = 'suspended' THEN 0
      WHEN operational_status = 'maintenance' THEN 10
      ELSE 50
    END
    - (SELECT COUNT(*) * 5 FROM decision_queue WHERE farm_id = b2f_farms.id AND status = 'pending')
    - (SELECT COUNT(*) * 3 FROM farm_expenses WHERE farm_id = b2f_farms.id AND approval_status = 'pending')
  ), 0) INTO v_avg_performance
  FROM b2f_farms
  WHERE cluster_id = p_cluster_id;
  
  -- بناء النتيجة
  RETURN v_cluster_info || jsonb_build_object(
    'metrics', jsonb_build_object(
      'farms_count', v_farms_count,
      'active_farms', v_active_farms,
      'struggling_farms', v_struggling_farms,
      'total_expenses_30d', v_total_expenses,
      'pending_decisions', v_pending_decisions,
      'pending_expenses', v_pending_expenses,
      'avg_performance', ROUND(v_avg_performance, 1),
      'health_status', CASE
        WHEN v_avg_performance >= 40 THEN 'excellent'
        WHEN v_avg_performance >= 25 THEN 'good'
        WHEN v_avg_performance >= 10 THEN 'warning'
        ELSE 'critical'
      END
    )
  );
END;
$$;

-- ===================================
-- دالة: إحصائيات جميع Clusters (ملخص)
-- ===================================
CREATE OR REPLACE FUNCTION get_all_clusters_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(cluster_data ORDER BY priority DESC, name), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'id', fc.id,
        'name', fc.name,
        'name_en', fc.name_en,
        'supervisor_name', ps.full_name,
        'region_name', r.name_ar,
        'status', fc.status,
        'priority', fc.priority,
        'farms_count', (
          SELECT COUNT(*) FROM b2f_farms WHERE cluster_id = fc.id
        ),
        'active_farms', (
          SELECT COUNT(*) FROM b2f_farms
          WHERE cluster_id = fc.id AND operational_status = 'operational'
        ),
        'struggling_farms', (
          SELECT COUNT(*) FROM b2f_farms
          WHERE cluster_id = fc.id AND operational_status IN ('suspended', 'maintenance')
        ),
        'total_expenses_30d', (
          SELECT COALESCE(SUM(fe.amount), 0)
          FROM farm_expenses fe
          JOIN b2f_farms f ON f.id = fe.farm_id
          WHERE f.cluster_id = fc.id
          AND fe.created_at > now() - interval '30 days'
        ),
        'pending_decisions', (
          SELECT COUNT(*)
          FROM decision_queue dq
          JOIN b2f_farms f ON f.id = dq.farm_id
          WHERE f.cluster_id = fc.id AND dq.status = 'pending'
        ),
        'avg_performance', ROUND(COALESCE((
          SELECT AVG(
            CASE
              WHEN operational_status = 'suspended' THEN 0
              WHEN operational_status = 'maintenance' THEN 10
              ELSE 50
            END
            - (SELECT COUNT(*) * 5 FROM decision_queue WHERE farm_id = b2f_farms.id AND status = 'pending')
            - (SELECT COUNT(*) * 3 FROM farm_expenses WHERE farm_id = b2f_farms.id AND approval_status = 'pending')
          )
          FROM b2f_farms
          WHERE cluster_id = fc.id
        ), 0), 1)
      ) as cluster_data
      FROM farm_clusters fc
      LEFT JOIN platform_staff ps ON ps.id = fc.supervisor_id
      LEFT JOIN regions r ON r.id = fc.region_id
      WHERE fc.status = 'active'
    ) sub
  );
END;
$$;

-- ===================================
-- دالة: قائمة المزارع في Cluster
-- ===================================
CREATE OR REPLACE FUNCTION get_cluster_farms(p_cluster_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'name', f.name,
        'operational_status', f.operational_status,
        'pending_decisions', (
          SELECT COUNT(*) FROM decision_queue
          WHERE farm_id = f.id AND status = 'pending'
        ),
        'pending_expenses', (
          SELECT COUNT(*) FROM farm_expenses
          WHERE farm_id = f.id AND approval_status = 'pending'
        ),
        'total_expenses_30d', (
          SELECT COALESCE(SUM(amount), 0)
          FROM farm_expenses
          WHERE farm_id = f.id
          AND created_at > now() - interval '30 days'
        )
      )
    ), '[]'::jsonb)
    FROM b2f_farms f
    WHERE f.cluster_id = p_cluster_id
  );
END;
$$;
