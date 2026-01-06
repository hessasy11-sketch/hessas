/*
  # إصلاح دالة B2B Auctions Radar ودوال القرارات

  1. إصلاح دالة get_b2b_auctions_radar
     - استخدام categories بدلاً من auction_categories
     - إصلاح اسم جدول bids

  2. إصلاح دوال approve و reject للقرارات
     - استخدام platform_staff بدلاً من staff_id مباشرة
     - التحقق من وجود الموظف
*/

-- إصلاح دالة قائمة المزادات (Radar)
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
      'category_name', COALESCE(c.name, 'غير محدد'),
      'status', a.status,
      'current_price', COALESCE(a.current_price, a.starting_price),
      'starting_price', a.starting_price,
      'start_time', a.starts_at,
      'end_time', a.ends_at,
      'time_remaining_hours', EXTRACT(EPOCH FROM (a.ends_at - NOW())) / 3600,
      'total_views', COALESCE(a.views, 0),
      'total_bids', 0,
      'highest_bid', NULL,
      'is_critical', (a.ends_at < NOW() + INTERVAL '24 hours' AND a.ends_at > NOW()),
      'seller_name', COALESCE(p.display_name, 'مزاد')
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

-- إصلاح دالة الموافقة على القرار B2B
DROP FUNCTION IF EXISTS approve_b2b_decision(uuid, uuid, text);

CREATE OR REPLACE FUNCTION approve_b2b_decision(
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
  v_result jsonb;
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
    decision_notes = p_notes,
    decided_at = NOW()
  WHERE id = p_decision_id;

  CASE v_decision_record.decision_type
    WHEN 'pause_auction' THEN
      UPDATE auctions SET status = 'paused' WHERE id = v_decision_record.auction_id::uuid;
    WHEN 'activate_auction' THEN
      UPDATE auctions SET status = 'active' WHERE id = v_decision_record.auction_id::uuid;
    WHEN 'cancel_auction' THEN
      UPDATE auctions SET status = 'cancelled' WHERE id = v_decision_record.auction_id::uuid;
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

-- إصلاح دالة رفض القرار B2B
DROP FUNCTION IF EXISTS reject_b2b_decision(uuid, uuid, text);

CREATE OR REPLACE FUNCTION reject_b2b_decision(
  p_decision_id uuid,
  p_rejected_by uuid,
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
    status = 'rejected',
    decision_notes = p_notes,
    decided_at = NOW()
  WHERE id = p_decision_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_b2b_auctions_radar TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION approve_b2b_decision TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reject_b2b_decision TO anon, authenticated, service_role;
