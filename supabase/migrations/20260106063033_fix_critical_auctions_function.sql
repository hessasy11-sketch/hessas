/*
  # إصلاح دالة المزادات الحرجة
  
  استخدام current_price بدلاً من current_bid
*/

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
        'current_price', a.current_price,
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
