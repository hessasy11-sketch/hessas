/*
  # إصلاح دوال التعليق والحجوزات - البنية الفعلية

  1. المشاكل
    - executive_logs يستخدم action_type بدلاً من log_type
    - executive_logs يستخدم performed_by بدلاً من executor_id
    - البنية: action_type, farm_id, staff_id, decision_id, action_data, performed_by, result, notes

  2. الإصلاح
    - تحديث suspend_farm و toggle_farm_bookings
*/

-- حذف وإعادة إنشاء suspend_farm
DROP FUNCTION IF EXISTS suspend_farm(uuid, uuid, text);

CREATE OR REPLACE FUNCTION suspend_farm(
  p_farm_id uuid,
  p_suspended_by uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_name text;
  v_result jsonb;
BEGIN
  -- الحصول على اسم المزرعة
  SELECT name INTO v_farm_name
  FROM b2f_farms
  WHERE id = p_farm_id;

  IF v_farm_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm not found'
    );
  END IF;

  -- تحديث الحالة
  UPDATE b2f_farms
  SET
    operational_status = 'suspended',
    suspended_at = NOW(),
    bookings_enabled = false
  WHERE id = p_farm_id;

  -- تسجيل في Executive Log (البنية الصحيحة)
  INSERT INTO executive_logs (
    action_type,
    farm_id,
    performed_by,
    action_data,
    result,
    notes,
    created_at
  ) VALUES (
    'farm_suspended',
    p_farm_id,
    p_suspended_by,
    jsonb_build_object(
      'farm_name', v_farm_name,
      'reason', p_reason,
      'suspended_at', NOW()
    ),
    'success',
    p_reason,
    NOW()
  );

  -- تسجيل في Timeline
  INSERT INTO fc_activity_timeline (
    farm_id,
    event_type,
    description,
    actor_id,
    event_data,
    created_at
  ) VALUES (
    p_farm_id,
    'farm_suspended',
    'تم تعليق المزرعة: ' || p_reason,
    p_suspended_by,
    jsonb_build_object('reason', p_reason),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', true,
    'farm_id', p_farm_id,
    'farm_name', v_farm_name,
    'status', 'suspended'
  );

  RETURN v_result;
END;
$$;

-- حذف وإعادة إنشاء toggle_farm_bookings
DROP FUNCTION IF EXISTS toggle_farm_bookings(uuid, boolean, uuid, text);

CREATE OR REPLACE FUNCTION toggle_farm_bookings(
  p_farm_id uuid,
  p_enable boolean,
  p_toggled_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_name text;
  v_result jsonb;
BEGIN
  -- الحصول على اسم المزرعة
  SELECT name INTO v_farm_name
  FROM b2f_farms
  WHERE id = p_farm_id;

  IF v_farm_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Farm not found'
    );
  END IF;

  -- تحديث حالة الحجوزات
  UPDATE b2f_farms
  SET bookings_enabled = p_enable
  WHERE id = p_farm_id;

  -- تسجيل في Timeline
  INSERT INTO fc_activity_timeline (
    farm_id,
    event_type,
    description,
    actor_id,
    event_data,
    created_at
  ) VALUES (
    p_farm_id,
    CASE WHEN p_enable THEN 'bookings_opened' ELSE 'bookings_closed' END,
    CASE WHEN p_enable THEN 'تم فتح الحجوزات' ELSE 'تم إيقاف الحجوزات' END,
    p_toggled_by,
    jsonb_build_object('reason', p_reason, 'enabled', p_enable),
    NOW()
  );

  v_result := jsonb_build_object(
    'success', true,
    'farm_id', p_farm_id,
    'farm_name', v_farm_name,
    'bookings_enabled', p_enable
  );

  RETURN v_result;
END;
$$;
