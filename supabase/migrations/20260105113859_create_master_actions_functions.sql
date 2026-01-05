/*
  # Master Actions - الإجراءات التنفيذية للمدير العام

  ## الهدف
  تنفيذ إجراءين حقيقيين:
  
  1. B2F: Lock/Unlock Farm Bookings
     - إيقاف/فتح الحجوزات على مزرعة
     - يؤثر فعلياً على إمكانية الحجز
     
  2. B2B: Extend Auction Time
     - تمديد وقت المزاد بدقائق محددة
     - يؤثر فعلياً على end_time
  
  ## الدوال الجديدة
  1. master_toggle_farm_bookings(farm_id, enabled, staff_id, notes)
  2. master_extend_auction_time(auction_id, minutes, staff_id, notes)
  
  ## الربط مع Decision Queue
  - الدوال تسجل في Executive Log
  - يمكن استدعاؤها مباشرة من GM أو عبر approved decision
*/

-- ============================================
-- 1. دالة إيقاف/فتح حجوزات المزرعة
-- ============================================

CREATE OR REPLACE FUNCTION master_toggle_farm_bookings(
  p_farm_id uuid,
  p_enabled boolean,
  p_staff_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_name text;
  v_old_status boolean;
  v_log_id uuid;
  v_action_type text;
BEGIN
  -- التحقق من وجود المزرعة
  SELECT name, bookings_enabled
  INTO v_farm_name, v_old_status
  FROM b2f_farms
  WHERE id = p_farm_id;

  IF v_farm_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm not found'
    );
  END IF;

  -- إذا كانت الحالة نفسها، لا داعي للتحديث
  IF v_old_status = p_enabled THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Farm bookings status already set to this value',
      'farm_id', p_farm_id,
      'bookings_enabled', p_enabled
    );
  END IF;

  -- تحديث حالة الحجوزات
  UPDATE b2f_farms
  SET 
    bookings_enabled = p_enabled,
    updated_at = now()
  WHERE id = p_farm_id;

  -- تحديد نوع الإجراء
  v_action_type := CASE WHEN p_enabled THEN 'farm_bookings_unlocked' ELSE 'farm_bookings_locked' END;

  -- تسجيل الإجراء في السجل التنفيذي
  INSERT INTO executive_actions_log (
    executed_by,
    executor_name,
    action_type,
    target_type,
    target_id,
    target_name,
    action_title,
    action_description,
    action_data,
    result
  )
  SELECT
    p_staff_id,
    ps.full_name,
    v_action_type,
    'farm',
    p_farm_id,
    v_farm_name,
    CASE 
      WHEN p_enabled THEN 'فتح حجوزات المزرعة: ' || v_farm_name
      ELSE 'إيقاف حجوزات المزرعة: ' || v_farm_name
    END,
    COALESCE(p_notes, 'تنفيذ مباشر من المدير العام'),
    jsonb_build_object(
      'farm_id', p_farm_id,
      'farm_name', v_farm_name,
      'old_status', v_old_status,
      'new_status', p_enabled,
      'action', CASE WHEN p_enabled THEN 'unlock' ELSE 'lock' END
    ),
    'success'
  FROM platform_staff ps
  WHERE ps.id = p_staff_id
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'farm_id', p_farm_id,
    'farm_name', v_farm_name,
    'bookings_enabled', p_enabled,
    'old_status', v_old_status,
    'log_id', v_log_id,
    'message', CASE 
      WHEN p_enabled THEN 'Farm bookings unlocked successfully'
      ELSE 'Farm bookings locked successfully'
    END
  );
END;
$$;

-- ============================================
-- 2. دالة تمديد وقت المزاد
-- ============================================

CREATE OR REPLACE FUNCTION master_extend_auction_time(
  p_auction_id uuid,
  p_minutes integer,
  p_staff_id uuid,
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
  v_auction_status text;
  v_log_id uuid;
BEGIN
  -- التحقق من وجود المزاد
  SELECT title, end_time, status
  INTO v_auction_title, v_old_end_time, v_auction_status
  FROM auctions
  WHERE id = p_auction_id;

  IF v_auction_title IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Auction not found'
    );
  END IF;

  -- التحقق من أن المزاد نشط
  IF v_auction_status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot extend time for inactive auction',
      'auction_status', v_auction_status
    );
  END IF;

  -- حساب الوقت الجديد
  v_new_end_time := v_old_end_time + (p_minutes || ' minutes')::interval;

  -- تحديث وقت انتهاء المزاد
  UPDATE auctions
  SET 
    end_time = v_new_end_time,
    updated_at = now()
  WHERE id = p_auction_id;

  -- تسجيل الإجراء في السجل التنفيذي للمزادات
  INSERT INTO b2b_executive_logs (
    action_type,
    auction_id,
    action_data,
    performed_by,
    result,
    notes
  )
  VALUES (
    'auction_time_extended',
    p_auction_id,
    jsonb_build_object(
      'auction_id', p_auction_id,
      'auction_title', v_auction_title,
      'old_end_time', v_old_end_time,
      'new_end_time', v_new_end_time,
      'minutes_added', p_minutes
    ),
    p_staff_id,
    'success',
    COALESCE(p_notes, 'تمديد مباشر من المدير العام')
  )
  RETURNING id INTO v_log_id;

  -- تسجيل أيضاً في Executive Actions Log العام
  INSERT INTO executive_actions_log (
    executed_by,
    executor_name,
    action_type,
    target_type,
    target_id,
    target_name,
    action_title,
    action_description,
    action_data,
    result
  )
  SELECT
    p_staff_id,
    ps.full_name,
    'auction_time_extended',
    'auction',
    p_auction_id,
    v_auction_title,
    'تمديد وقت المزاد: ' || v_auction_title,
    'تم تمديد المزاد ' || p_minutes || ' دقيقة',
    jsonb_build_object(
      'auction_id', p_auction_id,
      'auction_title', v_auction_title,
      'old_end_time', v_old_end_time,
      'new_end_time', v_new_end_time,
      'minutes_added', p_minutes
    ),
    'success'
  FROM platform_staff ps
  WHERE ps.id = p_staff_id;

  RETURN jsonb_build_object(
    'success', true,
    'auction_id', p_auction_id,
    'auction_title', v_auction_title,
    'old_end_time', v_old_end_time,
    'new_end_time', v_new_end_time,
    'minutes_added', p_minutes,
    'log_id', v_log_id,
    'message', 'Auction time extended successfully'
  );
END;
$$;

-- ============================================
-- منح صلاحيات التنفيذ
-- ============================================

GRANT EXECUTE ON FUNCTION master_toggle_farm_bookings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION master_extend_auction_time TO anon, authenticated;

-- ============================================
-- إضافة action_type الجديدة للـ constraint
-- ============================================

-- تحديث constraint في executive_actions_log لإضافة الأنواع الجديدة
ALTER TABLE executive_actions_log DROP CONSTRAINT IF EXISTS executive_actions_log_action_type_check;

ALTER TABLE executive_actions_log ADD CONSTRAINT executive_actions_log_action_type_check
CHECK (action_type IN (
  'assign_owner',
  'revoke_authority',
  'grant_temporary_access',
  'suspend_staff',
  'activate_staff',
  'approve_decision',
  'reject_decision',
  'lock_farm',
  'unlock_farm',
  'lock_auction',
  'unlock_auction',
  'assign_task',
  'approve_budget',
  'financial_approval',
  'emergency_action',
  'farm_bookings_locked',
  'farm_bookings_unlocked',
  'auction_time_extended',
  'other'
));
