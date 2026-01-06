/*
  # Radar الأقسام (B2F / B2B)
  
  1. دالة B2F Radar:
    - مزارع تحتاج تدخل
    - مزارع جديدة
    - مزارع عالية المصروف
  
  2. دالة B2B Radar:
    - مزادات حرجة
    - مزادات متوقفة
    - مزادات قريبة الإغلاق
*/

-- ===================================
-- دالة: B2F Radar
-- ===================================
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
  -- (مزارع موقوفة أو في صيانة أو لديها قرارات معلقة)
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
  
  -- 3. مزارع عالية المصروف (آخر 30 يوم)
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
  JOIN (
    SELECT 
      farm_id,
      SUM(amount) as total_expenses,
      COUNT(*) as expense_count
    FROM farm_expenses
    WHERE approval_status = 'approved'
    AND approved_at > now() - interval '30 days'
    GROUP BY farm_id
  ) fe ON f.id = fe.farm_id
  WHERE fe.total_expenses > 5000
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

-- ===================================
-- دالة: B2B Radar
-- ===================================
CREATE OR REPLACE FUNCTION get_b2b_radar()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_critical_auctions jsonb;
  v_stopped_auctions jsonb;
  v_closing_soon_auctions jsonb;
BEGIN
  -- 1. مزادات حرجة (لديها تقارير أو مشاكل)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'status', a.status,
      'reports_count', (
        SELECT COUNT(*)
        FROM auction_reports ar
        WHERE ar.auction_id = a.id
        AND ar.status = 'pending'
      ),
      'issue', 'تقارير معلقة'
    )
  )
  INTO v_critical_auctions
  FROM auctions a
  WHERE EXISTS (
    SELECT 1
    FROM auction_reports ar
    WHERE ar.auction_id = a.id
    AND ar.status = 'pending'
  )
  AND a.status IN ('active', 'pending')
  LIMIT 5;
  
  -- 2. مزادات متوقفة
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title', title,
      'status', status,
      'stopped_at', updated_at,
      'reason', CASE
        WHEN status = 'cancelled' THEN 'ملغي'
        WHEN status = 'suspended' THEN 'معلق'
        ELSE 'متوقف'
      END
    )
    ORDER BY updated_at DESC
  )
  INTO v_stopped_auctions
  FROM auctions
  WHERE status IN ('cancelled', 'suspended')
  AND updated_at > now() - interval '7 days'
  LIMIT 5;
  
  -- 3. مزادات قريبة الإغلاق (خلال 24 ساعة)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title', title,
      'status', status,
      'ends_at', ends_at,
      'hours_left', EXTRACT(HOUR FROM ends_at - now()),
      'current_bids', (
        SELECT COUNT(*)
        FROM bids
        WHERE auction_id = auctions.id
      )
    )
    ORDER BY ends_at ASC
  )
  INTO v_closing_soon_auctions
  FROM auctions
  WHERE status = 'active'
  AND ends_at > now()
  AND ends_at < now() + interval '24 hours'
  LIMIT 5;
  
  -- إرجاع جميع البيانات
  RETURN jsonb_build_object(
    'critical_auctions', COALESCE(v_critical_auctions, '[]'::jsonb),
    'stopped_auctions', COALESCE(v_stopped_auctions, '[]'::jsonb),
    'closing_soon_auctions', COALESCE(v_closing_soon_auctions, '[]'::jsonb)
  );
END;
$$;

-- ===================================
-- دالة: كل شيء معاً (مع Executive Pulse)
-- ===================================
CREATE OR REPLACE FUNCTION get_complete_executive_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pulse jsonb;
  v_b2f_radar jsonb;
  v_b2b_radar jsonb;
BEGIN
  -- جلب جميع البيانات
  SELECT get_executive_pulse() INTO v_pulse;
  SELECT get_b2f_radar() INTO v_b2f_radar;
  SELECT get_b2b_radar() INTO v_b2b_radar;
  
  -- دمج كل شيء
  RETURN jsonb_build_object(
    'pulse', v_pulse,
    'b2f_radar', v_b2f_radar,
    'b2b_radar', v_b2b_radar
  );
END;
$$;
