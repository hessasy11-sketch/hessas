/*
  # إصلاح دالة B2F Radar v2
  
  إصلاح خطأ jsonb_agg مع ORDER BY
*/

CREATE OR REPLACE FUNCTION get_b2f_radar()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farms_need_attention jsonb;
  v_new_farms jsonb;
  v_high_expense_farms jsonb;
BEGIN
  -- 1. مزارع تحتاج تدخل
  SELECT jsonb_agg(row_to_json(t))
  INTO v_farms_need_attention
  FROM (
    SELECT
      f.id,
      f.name,
      f.operational_status as status,
      CASE
        WHEN f.operational_status = 'suspended' THEN 'موقوفة'
        WHEN f.operational_status = 'maintenance' THEN 'صيانة'
        ELSE 'قرارات معلقة'
      END as issue,
      (
        SELECT COUNT(*)
        FROM decision_queue
        WHERE farm_id = f.id
        AND status = 'pending'
      ) as pending_decisions
    FROM b2f_farms f
    WHERE f.operational_status IN ('suspended', 'maintenance')
    OR EXISTS (
      SELECT 1
      FROM decision_queue dq
      WHERE dq.farm_id = f.id
      AND dq.status = 'pending'
      AND dq.priority = 'urgent'
    )
    LIMIT 5
  ) t;
  
  -- 2. مزارع جديدة (آخر 7 أيام)
  SELECT jsonb_agg(row_to_json(t))
  INTO v_new_farms
  FROM (
    SELECT
      id,
      name,
      created_at,
      operational_status as status,
      EXTRACT(DAY FROM now() - created_at) as days_old
    FROM b2f_farms
    WHERE created_at > now() - interval '7 days'
    ORDER BY created_at DESC
    LIMIT 5
  ) t;
  
  -- 3. مزارع عالية المصروف (آخر 30 يوم)
  SELECT jsonb_agg(row_to_json(t))
  INTO v_high_expense_farms
  FROM (
    SELECT
      f.id,
      f.name,
      fe.total_expenses,
      fe.expense_count,
      ROUND(fe.total_expenses / NULLIF(fe.expense_count, 0), 2) as avg_expense
    FROM b2f_farms f
    JOIN (
      SELECT 
        farm_id,
        SUM(amount) as total_expenses,
        COUNT(*) as expense_count
      FROM farm_expenses
      WHERE approval_status = 'approved'
      AND approved_at > now() - interval '30 days'
      GROUP BY farm_id
      HAVING SUM(amount) > 5000
    ) fe ON f.id = fe.farm_id
    ORDER BY fe.total_expenses DESC
    LIMIT 5
  ) t;
  
  -- إرجاع جميع البيانات
  RETURN jsonb_build_object(
    'farms_need_attention', COALESCE(v_farms_need_attention, '[]'::jsonb),
    'new_farms', COALESCE(v_new_farms, '[]'::jsonb),
    'high_expense_farms', COALESCE(v_high_expense_farms, '[]'::jsonb)
  );
END;
$$;
