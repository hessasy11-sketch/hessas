/*
  # إصلاح دالة B2F Radar
  
  إصلاح خطأ GROUP BY في استعلام المزارع عالية المصروف
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
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'name', f.name,
      'status', f.operational_status,
      'issue', CASE
        WHEN f.operational_status = 'suspended' THEN 'موقوفة'
        WHEN f.operational_status = 'maintenance' THEN 'صيانة'
        ELSE 'قرارات معلقة'
      END,
      'pending_decisions', (
        SELECT COUNT(*)
        FROM decision_queue
        WHERE farm_id = f.id
        AND status = 'pending'
      )
    )
  )
  INTO v_farms_need_attention
  FROM b2f_farms f
  WHERE f.operational_status IN ('suspended', 'maintenance')
  OR EXISTS (
    SELECT 1
    FROM decision_queue dq
    WHERE dq.farm_id = f.id
    AND dq.status = 'pending'
    AND dq.priority = 'urgent'
  )
  LIMIT 5;
  
  -- 2. مزارع جديدة (آخر 7 أيام)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'created_at', created_at,
      'status', operational_status,
      'days_old', EXTRACT(DAY FROM now() - created_at)
    )
    ORDER BY created_at DESC
  )
  INTO v_new_farms
  FROM b2f_farms
  WHERE created_at > now() - interval '7 days'
  LIMIT 5;
  
  -- 3. مزارع عالية المصروف (آخر 30 يوم) - محسّنة
  WITH farm_expenses_summary AS (
    SELECT 
      farm_id,
      SUM(amount) as total_expenses,
      COUNT(*) as expense_count
    FROM farm_expenses
    WHERE approval_status = 'approved'
    AND approved_at > now() - interval '30 days'
    GROUP BY farm_id
    HAVING SUM(amount) > 5000
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'name', f.name,
      'total_expenses', fe.total_expenses,
      'expense_count', fe.expense_count,
      'avg_expense', ROUND(fe.total_expenses / NULLIF(fe.expense_count, 0), 2)
    )
    ORDER BY fe.total_expenses DESC
  )
  INTO v_high_expense_farms
  FROM b2f_farms f
  JOIN farm_expenses_summary fe ON f.id = fe.farm_id
  ORDER BY fe.total_expenses DESC
  LIMIT 5;
  
  -- إرجاع جميع البيانات
  RETURN jsonb_build_object(
    'farms_need_attention', COALESCE(v_farms_need_attention, '[]'::jsonb),
    'new_farms', COALESCE(v_new_farms, '[]'::jsonb),
    'high_expense_farms', COALESCE(v_high_expense_farms, '[]'::jsonb)
  );
END;
$$;
