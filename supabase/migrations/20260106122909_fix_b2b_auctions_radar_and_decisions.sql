/*
  # إصلاح دالة B2B Auctions Radar وقرارات B2B

  1. التغييرات
     - إصلاح خطأ GROUP BY في get_b2b_auctions_radar
     - إعادة إنشاء دوال القرارات بالتوقيعات الصحيحة
*/

-- إصلاح دالة get_b2b_auctions_radar
DROP FUNCTION IF EXISTS get_b2b_auctions_radar();

CREATE FUNCTION get_b2b_auctions_radar()
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
  )
  INTO auctions_list
  FROM auctions a
  LEFT JOIN categories c ON c.id = a.category_id
  LEFT JOIN profiles p ON p.id = a.owner_id
  WHERE a.status IN ('active', 'upcoming', 'closed', 'pending')
  ORDER BY 
    CASE
      WHEN a.status = 'active' AND a.ends_at < NOW() + INTERVAL '24 hours' THEN 1
      WHEN a.status = 'active' THEN 2
      ELSE 3
    END,
    a.ends_at ASC
  LIMIT 100;

  RETURN COALESCE(auctions_list, '[]'::jsonb);
END;
$$;

-- حذف دوال القرارات القديمة وإعادة إنشائها
DROP FUNCTION IF EXISTS approve_b2b_decision(uuid, uuid, text);
DROP FUNCTION IF EXISTS approve_b2b_decision(uuid, text);
DROP FUNCTION IF EXISTS reject_b2b_decision(uuid, uuid, text);
DROP FUNCTION IF EXISTS reject_b2b_decision(uuid, text);

-- دالة الموافقة مع ثلاث معاملات
CREATE FUNCTION approve_b2b_decision(
  p_decision_id uuid,
  p_approved_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_record record;
BEGIN
  SELECT * INTO v_decision_record
  FROM b2b_decision_queue
  WHERE id = p_decision_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not found or already processed'
    );
  END IF;

  UPDATE b2b_decision_queue
  SET
    status = 'approved',
    approved_by = p_approved_by,
    notes = COALESCE(p_notes, notes),
    executed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_decision_id;

  CASE v_decision_record.decision_type
    WHEN 'pause_auction' THEN
      UPDATE auctions SET status = 'paused' WHERE id = v_decision_record.auction_id;
    WHEN 'activate_auction' THEN
      UPDATE auctions SET status = 'active' WHERE id = v_decision_record.auction_id;
    WHEN 'cancel_auction' THEN
      UPDATE auctions SET status = 'cancelled' WHERE id = v_decision_record.auction_id;
    ELSE
      NULL;
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'decision_type', v_decision_record.decision_type
  );
END;
$$;

-- دالة الرفض مع ثلاث معاملات
CREATE FUNCTION reject_b2b_decision(
  p_decision_id uuid,
  p_rejected_by uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_record record;
BEGIN
  SELECT * INTO v_decision_record
  FROM b2b_decision_queue
  WHERE id = p_decision_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not found or already processed'
    );
  END IF;

  UPDATE b2b_decision_queue
  SET
    status = 'rejected',
    notes = p_reason,
    updated_at = NOW()
  WHERE id = p_decision_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id
  );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_b2b_auctions_radar TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION approve_b2b_decision TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reject_b2b_decision TO anon, authenticated, service_role;
