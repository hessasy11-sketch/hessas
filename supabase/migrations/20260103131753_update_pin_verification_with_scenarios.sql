/*
  # Update PIN Verification to Support Scenarios

  1. Changes
    - Update verify_staff_pin to return scenario landing route
    - Add scenario-based routing logic
    - Include audit logging for scenario access

  2. Security
    - Maintains existing security measures
    - Adds scenario-based access control
*/

-- Update verify_staff_pin to include scenario routing
CREATE OR REPLACE FUNCTION verify_staff_pin(p_staff_id uuid, p_pin_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_record RECORD;
  v_stored_pin text;
  v_attempts integer;
  v_locked_until timestamptz;
  v_scenario_id uuid;
  v_landing_route text;
  v_scenario_name text;
  v_result jsonb;
BEGIN
  SELECT * INTO v_staff_record
  FROM platform_staff
  WHERE id = p_staff_id
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الموظف غير موجود أو غير نشط',
      'reason', 'staff_not_found'
    );
  END IF;

  IF v_staff_record.requires_pin = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'هذا الموظف لا يتطلب رمز سري',
      'reason', 'pin_not_required'
    );
  END IF;

  IF v_staff_record.pin_locked_until IS NOT NULL AND v_staff_record.pin_locked_until > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الحساب مقفل مؤقتاً بسبب محاولات فاشلة متكررة',
      'reason', 'account_locked',
      'locked_until', v_staff_record.pin_locked_until
    );
  END IF;

  IF v_staff_record.pin_code IS NULL OR v_staff_record.pin_code = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لم يتم تعيين رمز سري لهذا الموظف',
      'reason', 'pin_not_set'
    );
  END IF;

  IF v_staff_record.pin_code = p_pin_code THEN
    UPDATE platform_staff
    SET 
      pin_attempts = 0,
      pin_last_verified_at = now(),
      pin_locked_until = NULL
    WHERE id = p_staff_id;

    v_scenario_id := get_active_scenario(p_staff_id);

    IF v_scenario_id IS NOT NULL THEN
      SELECT landing_route, name INTO v_landing_route, v_scenario_name
      FROM work_scenarios
      WHERE id = v_scenario_id AND is_active = true;

      PERFORM log_scenario_access(
        p_staff_id,
        v_scenario_id,
        'login_success',
        jsonb_build_object(
          'method', 'pin',
          'qr_type', CASE WHEN v_staff_record.is_temporary_qr THEN 'temporary' ELSE 'permanent' END
        )
      );
    ELSE
      v_landing_route := '/hq';
      v_scenario_name := NULL;
    END IF;

    v_result := jsonb_build_object(
      'success', true,
      'message', 'تم التحقق من الرمز السري بنجاح',
      'staff', jsonb_build_object(
        'id', v_staff_record.id,
        'full_name', v_staff_record.full_name,
        'role', v_staff_record.role,
        'department', v_staff_record.department,
        'scenario_id', v_scenario_id,
        'scenario_name', v_scenario_name,
        'landing_route', v_landing_route
      )
    );

    RETURN v_result;
  ELSE
    v_attempts := COALESCE(v_staff_record.pin_attempts, 0) + 1;

    IF v_attempts >= 5 THEN
      UPDATE platform_staff
      SET 
        pin_attempts = v_attempts,
        pin_locked_until = now() + INTERVAL '30 minutes'
      WHERE id = p_staff_id;

      RETURN jsonb_build_object(
        'success', false,
        'message', 'تم قفل الحساب لمدة 30 دقيقة بسبب محاولات فاشلة متكررة',
        'reason', 'account_locked',
        'attempts', v_attempts
      );
    ELSE
      UPDATE platform_staff
      SET pin_attempts = v_attempts
      WHERE id = p_staff_id;

      RETURN jsonb_build_object(
        'success', false,
        'message', 'الرمز السري غير صحيح',
        'reason', 'invalid_pin',
        'attempts', v_attempts,
        'remaining_attempts', 5 - v_attempts
      );
    END IF;
  END IF;
END;
$$;
