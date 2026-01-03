/*
  # Update QR Verification to Support Scenarios

  1. Changes
    - Update verify_qr_access to return scenario landing route
    - Add scenario-based routing logic
    - Include audit logging for scenario access

  2. Security
    - Maintains existing RLS policies
    - Adds scenario-based access control
*/

-- Update verify_qr_access to include scenario routing
CREATE OR REPLACE FUNCTION verify_qr_access(p_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_record RECORD;
  v_scenario_id uuid;
  v_landing_route text;
  v_scenario_name text;
  v_result jsonb;
BEGIN
  SELECT * INTO v_staff_record
  FROM platform_staff
  WHERE qr_code = p_qr_token
  AND qr_is_active = true
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رمز QR غير صالح أو غير نشط',
      'reason', 'invalid_qr'
    );
  END IF;

  IF v_staff_record.is_temporary_qr = true THEN
    IF v_staff_record.temporary_qr_created_at IS NULL OR 
       (now() - v_staff_record.temporary_qr_created_at) > INTERVAL '24 hours' THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'رمز QR المؤقت منتهي الصلاحية',
        'reason', 'qr_expired'
      );
    END IF;
  END IF;

  UPDATE platform_staff
  SET qr_last_scanned_at = now()
  WHERE id = v_staff_record.id;

  v_scenario_id := get_active_scenario(v_staff_record.id);

  IF v_scenario_id IS NOT NULL THEN
    SELECT landing_route, name INTO v_landing_route, v_scenario_name
    FROM work_scenarios
    WHERE id = v_scenario_id AND is_active = true;

    PERFORM log_scenario_access(
      v_staff_record.id,
      v_scenario_id,
      'login_success',
      jsonb_build_object(
        'method', 'qr',
        'qr_type', CASE WHEN v_staff_record.is_temporary_qr THEN 'temporary' ELSE 'permanent' END
      )
    );
  ELSE
    v_landing_route := '/hq';
    v_scenario_name := NULL;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN v_staff_record.requires_pin THEN 'تم التحقق من QR - يرجى إدخال الرمز السري'
      ELSE 'تم التحقق بنجاح'
    END,
    'staff', jsonb_build_object(
      'id', v_staff_record.id,
      'full_name', v_staff_record.full_name,
      'role', v_staff_record.role,
      'department', v_staff_record.department,
      'requires_pin', v_staff_record.requires_pin,
      'is_temporary_qr', v_staff_record.is_temporary_qr,
      'scenario_id', v_scenario_id,
      'scenario_name', v_scenario_name,
      'landing_route', v_landing_route
    )
  );

  RETURN v_result;
END;
$$;
