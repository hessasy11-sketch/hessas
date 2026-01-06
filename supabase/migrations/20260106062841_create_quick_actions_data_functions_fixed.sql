/*
  # دوال البيانات السريعة للأزرار القيادية - مصححة
*/

-- ===================================
-- دالة: أسوأ 5 مزارع أداءً
-- ===================================
CREATE OR REPLACE FUNCTION get_worst_performing_farms(p_limit int DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(farm_data), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
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
        ),
        'performance_score', (
          CASE
            WHEN operational_status = 'suspended' THEN 0
            WHEN operational_status = 'maintenance' THEN 10
            ELSE 50
          END
          - (SELECT COUNT(*) FROM decision_queue WHERE farm_id = f.id AND status = 'pending') * 5
          - (SELECT COUNT(*) FROM farm_expenses WHERE farm_id = f.id AND approval_status = 'pending') * 3
        )
      ) as farm_data
      FROM b2f_farms f
      WHERE f.operational_status IN ('operational', 'suspended', 'maintenance')
      ORDER BY (
        CASE
          WHEN operational_status = 'suspended' THEN 0
          WHEN operational_status = 'maintenance' THEN 10
          ELSE 50
        END
        - (SELECT COUNT(*) FROM decision_queue WHERE farm_id = f.id AND status = 'pending') * 5
        - (SELECT COUNT(*) FROM farm_expenses WHERE farm_id = f.id AND approval_status = 'pending') * 3
      ) ASC
      LIMIT p_limit
    ) sub
  );
END;
$$;

-- ===================================
-- دالة: أعلى 5 مصروفات حديثة
-- ===================================
CREATE OR REPLACE FUNCTION get_highest_expenses(p_limit int DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(expense_data), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'id', fe.id,
        'farm_id', fe.farm_id,
        'farm_name', f.name,
        'description', fe.description,
        'amount', fe.amount,
        'category', fe.category,
        'approval_status', fe.approval_status,
        'created_at', fe.created_at,
        'days_ago', EXTRACT(DAY FROM now() - fe.created_at)::int
      ) as expense_data
      FROM farm_expenses fe
      JOIN b2f_farms f ON f.id = fe.farm_id
      WHERE fe.created_at > now() - interval '30 days'
      AND fe.approval_status IN ('pending', 'approved')
      ORDER BY fe.amount DESC
      LIMIT p_limit
    ) sub
  );
END;
$$;

-- ===================================
-- دالة: المزادات الحرجة
-- ===================================
CREATE OR REPLACE FUNCTION get_critical_auctions(p_limit int DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(auction_data), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'status', a.status,
        'current_bid', a.current_bid,
        'reports_count', ar.reports_count,
        'ends_at', a.ends_at,
        'hours_remaining', EXTRACT(EPOCH FROM (a.ends_at - now())) / 3600
      ) as auction_data
      FROM auctions a
      JOIN (
        SELECT auction_id, COUNT(*) as reports_count
        FROM auction_reports
        WHERE status = 'pending'
        GROUP BY auction_id
      ) ar ON ar.auction_id = a.id
      WHERE a.status = 'active'
      ORDER BY ar.reports_count DESC, a.ends_at ASC
      LIMIT p_limit
    ) sub
  );
END;
$$;

-- ===================================
-- دالة: إحصائيات الأزرار السريعة
-- ===================================
CREATE OR REPLACE FUNCTION get_quick_actions_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_worst_farms int;
  v_high_expenses int;
  v_critical_auctions int;
  v_pending_decisions int;
BEGIN
  SELECT COUNT(*) INTO v_worst_farms
  FROM b2f_farms
  WHERE operational_status IN ('suspended', 'maintenance')
  OR (
    SELECT COUNT(*) FROM decision_queue
    WHERE farm_id = b2f_farms.id AND status = 'pending'
  ) >= 3;

  SELECT COUNT(*) INTO v_high_expenses
  FROM farm_expenses
  WHERE amount > 5000
  AND approval_status = 'pending'
  AND created_at > now() - interval '30 days';

  SELECT COUNT(DISTINCT auction_id) INTO v_critical_auctions
  FROM auction_reports
  WHERE status = 'pending'
  AND auction_id IN (
    SELECT id FROM auctions WHERE status = 'active'
  );

  SELECT COUNT(*) INTO v_pending_decisions
  FROM decision_queue
  WHERE status = 'pending';

  RETURN jsonb_build_object(
    'worst_farms', v_worst_farms,
    'high_expenses', v_high_expenses,
    'critical_auctions', v_critical_auctions,
    'pending_decisions', v_pending_decisions
  );
END;
$$;

-- ===================================
-- دالة: جلب جميع بيانات الأزرار السريعة
-- ===================================
CREATE OR REPLACE FUNCTION get_all_quick_actions_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'stats', get_quick_actions_stats(),
    'worst_farms', get_worst_performing_farms(5),
    'highest_expenses', get_highest_expenses(5),
    'critical_auctions', get_critical_auctions(5)
  );
END;
$$;
