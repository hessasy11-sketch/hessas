/*
  # إصلاح دالة get_b2b_auctions_radar - استخدام الأعمدة الصحيحة

  1. التغييرات
     - استخدام `views_count` بدلاً من `views`
     - استخدام `bidders_count` للمزايدين
     - إضافة حقول إضافية من جدول auctions
*/

-- إصلاح دالة get_b2b_auctions_radar
DROP FUNCTION IF EXISTS get_b2b_auctions_radar();

CREATE OR REPLACE FUNCTION get_b2b_auctions_radar()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auctions_list jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'category_name', COALESCE(c.name_ar, 'غير محدد'),
      'status', a.status,
      'current_price', COALESCE(a.current_price, a.starting_price),
      'starting_price', a.starting_price,
      'start_time', a.starts_at,
      'end_time', a.ends_at,
      'time_remaining_hours', EXTRACT(EPOCH FROM (a.ends_at - NOW())) / 3600,
      'total_views', COALESCE(a.views_count, 0),
      'total_bids', COALESCE(a.bidders_count, 0),
      'highest_bid', a.current_price,
      'is_critical', (a.ends_at < NOW() + INTERVAL '24 hours' AND a.ends_at > NOW() AND a.status = 'active'),
      'seller_name', COALESCE(p.display_name, 'مزاد'),
      'item_condition', a.item_condition,
      'location', a.location
    )
    ORDER BY
      CASE
        WHEN a.status = 'active' AND a.ends_at < NOW() + INTERVAL '24 hours' THEN 1
        WHEN a.status = 'active' THEN 2
        ELSE 3
      END,
      a.ends_at ASC
  )
  INTO auctions_list
  FROM auctions a
  LEFT JOIN categories c ON c.id = a.category_id
  LEFT JOIN profiles p ON p.id = a.owner_id
  WHERE a.status IN ('active', 'upcoming', 'closed', 'pending')
  ORDER BY a.created_at DESC
  LIMIT 100;

  RETURN COALESCE(auctions_list, '[]'::jsonb);
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION get_b2b_auctions_radar TO anon, authenticated, service_role;

-- إضافة تعليق
COMMENT ON FUNCTION get_b2b_auctions_radar IS 'دالة لجلب بيانات رادار المزادات B2B - للاستخدام في Operations Room';
