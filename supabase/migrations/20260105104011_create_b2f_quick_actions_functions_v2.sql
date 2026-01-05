/*
  # دوال Quick Actions لغرفة عمليات B2F v2

  حذف الدوال القديمة وإنشاء دوال جديدة مع أسماء فريدة
*/

-- حذف الدوال القديمة إن وجدت
DROP FUNCTION IF EXISTS toggle_farm_bookings;
DROP FUNCTION IF EXISTS assign_farm_manager;
DROP FUNCTION IF EXISTS toggle_farm_status;
DROP FUNCTION IF EXISTS approve_decision;
DROP FUNCTION IF EXISTS reject_decision;

-- دالة تفعيل/إيقاف الحجوزات للمزرعة
CREATE OR REPLACE FUNCTION exec_toggle_farm_bookings(
  p_farm_id uuid,
  p_enabled boolean,
  p_performed_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_name text;
  v_log_id uuid;
BEGIN
  SELECT name INTO v_farm_name
  FROM b2f_farms
  WHERE id = p_farm_id;

  IF v_farm_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Farm not found');
  END IF;

  UPDATE b2f_farms
  SET bookings_enabled = p_enabled, updated_at = now()
  WHERE id = p_farm_id;

  INSERT INTO executive_logs (action_type, farm_id, action_data, performed_by, result, notes)
  VALUES ('bookings_toggled', p_farm_id, jsonb_build_object('farm_name', v_farm_name, 'enabled', p_enabled), p_performed_by, 'success', p_notes)
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('success', true, 'farm_id', p_farm_id, 'bookings_enabled', p_enabled, 'log_id', v_log_id);
END;
$$;

-- دالة تعيين/تغيير مدير المزرعة
CREATE OR REPLACE FUNCTION exec_assign_farm_manager(
  p_farm_id uuid,
  p_manager_id uuid,
  p_performed_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_name text;
  v_old_manager_id uuid;
  v_new_manager_name text;
  v_log_id uuid;
  v_action_type text;
BEGIN
  SELECT name, farm_manager_id INTO v_farm_name, v_old_manager_id FROM b2f_farms WHERE id = p_farm_id;
  IF v_farm_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Farm not found');
  END IF;

  SELECT full_name INTO v_new_manager_name FROM platform_staff WHERE id = p_manager_id;
  IF v_new_manager_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Manager not found');
  END IF;

  v_action_type := CASE WHEN v_old_manager_id IS NULL THEN 'farm_manager_assigned' ELSE 'farm_manager_changed' END;

  UPDATE b2f_farms SET farm_manager_id = p_manager_id, updated_at = now() WHERE id = p_farm_id;

  INSERT INTO executive_logs (action_type, farm_id, staff_id, action_data, performed_by, result, notes)
  VALUES (v_action_type, p_farm_id, p_manager_id, jsonb_build_object('farm_name', v_farm_name, 'old_manager_id', v_old_manager_id, 'new_manager_id', p_manager_id, 'new_manager_name', v_new_manager_name), p_performed_by, 'success', p_notes)
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('success', true, 'farm_id', p_farm_id, 'manager_id', p_manager_id, 'action_type', v_action_type, 'log_id', v_log_id);
END;
$$;

-- دالة إيقاف/تشغيل المزرعة
CREATE OR REPLACE FUNCTION exec_toggle_farm_status(
  p_farm_id uuid,
  p_new_status text,
  p_performed_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_farm_name text;
  v_old_status text;
  v_log_id uuid;
  v_action_type text;
BEGIN
  IF p_new_status NOT IN ('active', 'inactive', 'suspended') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  SELECT name, status INTO v_farm_name, v_old_status FROM b2f_farms WHERE id = p_farm_id;
  IF v_farm_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Farm not found');
  END IF;

  v_action_type := CASE WHEN p_new_status = 'active' THEN 'farm_activated' ELSE 'farm_paused' END;

  UPDATE b2f_farms SET status = p_new_status, updated_at = now() WHERE id = p_farm_id;

  INSERT INTO executive_logs (action_type, farm_id, action_data, performed_by, result, notes)
  VALUES (v_action_type, p_farm_id, jsonb_build_object('farm_name', v_farm_name, 'old_status', v_old_status, 'new_status', p_new_status), p_performed_by, 'success', p_notes)
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('success', true, 'farm_id', p_farm_id, 'new_status', p_new_status, 'log_id', v_log_id);
END;
$$;

-- دالة الموافقة على قرار
CREATE OR REPLACE FUNCTION exec_approve_decision(
  p_decision_id uuid,
  p_approved_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision record;
  v_result jsonb;
BEGIN
  SELECT * INTO v_decision FROM decision_queue WHERE id = p_decision_id AND status = 'pending';
  IF v_decision.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Decision not found or already processed');
  END IF;

  CASE v_decision.decision_type
    WHEN 'assign_farm_manager', 'change_farm_manager' THEN
      v_result := exec_assign_farm_manager(v_decision.farm_id, v_decision.target_staff_id, p_approved_by, p_notes);
    WHEN 'pause_farm' THEN
      v_result := exec_toggle_farm_status(v_decision.farm_id, 'inactive', p_approved_by, p_notes);
    WHEN 'activate_farm' THEN
      v_result := exec_toggle_farm_status(v_decision.farm_id, 'active', p_approved_by, p_notes);
    WHEN 'toggle_bookings' THEN
      v_result := exec_toggle_farm_bookings(v_decision.farm_id, (v_decision.action_data->>'enabled')::boolean, p_approved_by, p_notes);
    WHEN 'approve_expense' THEN
      INSERT INTO executive_logs (action_type, farm_id, action_data, performed_by, result, notes)
      VALUES ('expense_approved', v_decision.farm_id, jsonb_build_object('amount', v_decision.expense_amount, 'description', v_decision.expense_description), p_approved_by, 'success', p_notes);
      v_result := jsonb_build_object('success', true);
    ELSE
      v_result := jsonb_build_object('success', false, 'error', 'Unknown decision type');
  END CASE;

  IF v_result->>'success' = 'true' THEN
    UPDATE decision_queue SET status = 'executed', approved_by = p_approved_by, executed_at = now(), notes = COALESCE(p_notes, notes) WHERE id = p_decision_id;
  END IF;

  RETURN v_result;
END;
$$;

-- دالة رفض قرار
CREATE OR REPLACE FUNCTION exec_reject_decision(
  p_decision_id uuid,
  p_rejected_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE decision_queue SET status = 'rejected', approved_by = p_rejected_by, notes = COALESCE(p_notes, notes), updated_at = now()
  WHERE id = p_decision_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Decision not found or already processed');
  END IF;

  RETURN jsonb_build_object('success', true, 'decision_id', p_decision_id, 'status', 'rejected');
END;
$$;

GRANT EXECUTE ON FUNCTION exec_toggle_farm_bookings TO authenticated;
GRANT EXECUTE ON FUNCTION exec_assign_farm_manager TO authenticated;
GRANT EXECUTE ON FUNCTION exec_toggle_farm_status TO authenticated;
GRANT EXECUTE ON FUNCTION exec_approve_decision TO authenticated;
GRANT EXECUTE ON FUNCTION exec_reject_decision TO authenticated;
