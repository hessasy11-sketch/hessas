/*
  # دوال غرفة عمليات B2B (Auctions)

  1. دالة Pulse الحية للمزادات
     - زيارات B2B اليوم
     - مزادات نشطة
     - مزادات حرجة (أقل من 24 ساعة)
     - أعلى عرض اليوم
  
  2. دالة قائمة المزادات (Radar)
     - معلومات مختصرة لكل مزاد
  
  3. دوال Quick Actions للمزادات
     - إيقاف/فتح مزاد
     - تمديد وقت
     - اعتماد نتيجة
*/

-- دالة Pulse للمزادات
CREATE OR REPLACE FUNCTION get_b2b_ops_pulse()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  visits_today integer;
  active_auctions integer;
  critical_auctions integer;
  highest_bid_today numeric;
BEGIN
  -- زيارات اليوم (dummy for now - can be tracked via analytics)
  visits_today := 0;
  
  -- مزادات نشطة
  SELECT COUNT(*)
  INTO active_auctions
  FROM auctions
  WHERE status = 'active'
    AND end_time > NOW();
  
  -- مزادات حرجة (أقل من 24 ساعة)
  SELECT COUNT(*)
  INTO critical_auctions
  FROM auctions
  WHERE status = 'active'
    AND end_time > NOW()
    AND end_time < NOW() + INTERVAL '24 hours';
  
  -- أعلى عرض اليوم
  SELECT COALESCE(MAX(current_price), 0)
  INTO highest_bid_today
  FROM auctions
  WHERE created_at::date = CURRENT_DATE;

  RETURN jsonb_build_object(
    'visits_today', visits_today,
    'active_auctions', active_auctions,
    'critical_auctions', critical_auctions,
    'highest_bid_today', highest_bid_today
  );
END;
$$;

-- دالة قائمة المزادات (Radar)
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
      'category_name', c.name,
      'status', a.status,
      'current_price', a.current_price,
      'starting_price', a.starting_price,
      'start_time', a.start_time,
      'end_time', a.end_time,
      'time_remaining_hours', EXTRACT(EPOCH FROM (a.end_time - NOW())) / 3600,
      'total_views', COALESCE(a.views, 0),
      'total_bids', (
        SELECT COUNT(*)
        FROM auction_bids ab
        WHERE ab.auction_id = a.id
      ),
      'highest_bid', (
        SELECT MAX(amount)
        FROM auction_bids ab
        WHERE ab.auction_id = a.id
      ),
      'is_critical', (a.end_time < NOW() + INTERVAL '24 hours' AND a.end_time > NOW()),
      'seller_name', p.display_name
    )
    ORDER BY 
      CASE 
        WHEN a.status = 'active' AND a.end_time < NOW() + INTERVAL '24 hours' THEN 1
        WHEN a.status = 'active' THEN 2
        ELSE 3
      END,
      a.end_time ASC
  )
  INTO auctions_list
  FROM auctions a
  LEFT JOIN categories c ON c.id = a.category_id
  LEFT JOIN profiles p ON p.id = a.seller_id
  WHERE a.status IN ('active', 'pending', 'completed')
  ORDER BY a.created_at DESC
  LIMIT 100;

  RETURN COALESCE(auctions_list, '[]'::jsonb);
END;
$$;

-- دالة إيقاف/فتح المزاد
CREATE OR REPLACE FUNCTION exec_toggle_auction_status(
  p_auction_id uuid,
  p_new_status text,
  p_performed_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auction_title text;
  v_old_status text;
  v_log_id uuid;
  v_action_type text;
BEGIN
  IF p_new_status NOT IN ('active', 'paused', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  SELECT title, status INTO v_auction_title, v_old_status
  FROM auctions
  WHERE id = p_auction_id;

  IF v_auction_title IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
  END IF;

  v_action_type := CASE 
    WHEN p_new_status = 'active' THEN 'auction_activated'
    WHEN p_new_status = 'paused' THEN 'auction_paused'
    ELSE 'auction_cancelled'
  END;

  UPDATE auctions
  SET status = p_new_status, updated_at = now()
  WHERE id = p_auction_id;

  INSERT INTO executive_logs (action_type, action_data, performed_by, result, notes)
  VALUES (
    v_action_type,
    jsonb_build_object(
      'auction_id', p_auction_id,
      'auction_title', v_auction_title,
      'old_status', v_old_status,
      'new_status', p_new_status
    ),
    p_performed_by,
    'success',
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id, 'new_status', p_new_status, 'log_id', v_log_id);
END;
$$;

-- دالة تمديد وقت المزاد
CREATE OR REPLACE FUNCTION exec_extend_auction_time(
  p_auction_id uuid,
  p_hours_to_add integer,
  p_performed_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auction_title text;
  v_old_end_time timestamptz;
  v_new_end_time timestamptz;
  v_log_id uuid;
BEGIN
  SELECT title, end_time INTO v_auction_title, v_old_end_time
  FROM auctions
  WHERE id = p_auction_id;

  IF v_auction_title IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
  END IF;

  v_new_end_time := v_old_end_time + (p_hours_to_add || ' hours')::interval;

  UPDATE auctions
  SET end_time = v_new_end_time, updated_at = now()
  WHERE id = p_auction_id;

  INSERT INTO executive_logs (action_type, action_data, performed_by, result, notes)
  VALUES (
    'auction_time_extended',
    jsonb_build_object(
      'auction_id', p_auction_id,
      'auction_title', v_auction_title,
      'old_end_time', v_old_end_time,
      'new_end_time', v_new_end_time,
      'hours_added', p_hours_to_add
    ),
    p_performed_by,
    'success',
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id, 'new_end_time', v_new_end_time, 'log_id', v_log_id);
END;
$$;

-- دالة اعتماد نتيجة المزاد
CREATE OR REPLACE FUNCTION exec_approve_auction_result(
  p_auction_id uuid,
  p_performed_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auction_title text;
  v_winner_id uuid;
  v_winning_bid numeric;
  v_log_id uuid;
BEGIN
  SELECT title INTO v_auction_title
  FROM auctions
  WHERE id = p_auction_id;

  IF v_auction_title IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
  END IF;

  -- الحصول على أعلى عرض والفائز
  SELECT bidder_id, amount
  INTO v_winner_id, v_winning_bid
  FROM auction_bids
  WHERE auction_id = p_auction_id
  ORDER BY amount DESC
  LIMIT 1;

  IF v_winner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No bids found for this auction');
  END IF;

  UPDATE auctions
  SET status = 'sold', updated_at = now()
  WHERE id = p_auction_id;

  INSERT INTO executive_logs (action_type, action_data, performed_by, result, notes)
  VALUES (
    'auction_result_approved',
    jsonb_build_object(
      'auction_id', p_auction_id,
      'auction_title', v_auction_title,
      'winner_id', v_winner_id,
      'winning_bid', v_winning_bid
    ),
    p_performed_by,
    'success',
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id, 'winner_id', v_winner_id, 'winning_bid', v_winning_bid, 'log_id', v_log_id);
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION get_b2b_ops_pulse TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_b2b_auctions_radar TO anon, authenticated;
GRANT EXECUTE ON FUNCTION exec_toggle_auction_status TO authenticated;
GRANT EXECUTE ON FUNCTION exec_extend_auction_time TO authenticated;
GRANT EXECUTE ON FUNCTION exec_approve_auction_result TO authenticated;
