/*
  # إصلاح دالة get_all_clusters_summary
  
  إصلاح ORDER BY لاستخدام حقول الـ subquery
*/

CREATE OR REPLACE FUNCTION get_all_clusters_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(cluster_data), '[]'::jsonb)
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
      ) as cluster_data,
      fc.priority,
      fc.name
      FROM farm_clusters fc
      LEFT JOIN platform_staff ps ON ps.id = fc.supervisor_id
      LEFT JOIN regions r ON r.id = fc.region_id
      WHERE fc.status = 'active'
      ORDER BY 
        CASE fc.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        fc.name
    ) sub
  );
END;
$$;
