/*
  # تحديث verify_qr_access لإرجاع حالة الباركود المؤقت

  1. Updates
    - إضافة is_temporary_qr في الـ response
    - عند النجاح، تضمين معلومة هل الباركود مؤقت أم دائم
*/

CREATE OR REPLACE FUNCTION verify_qr_access(p_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff platform_staff;
  v_profile profiles;
  v_role roles_catalog;
  v_default_route text;
BEGIN
  SELECT ps.* INTO v_staff 
  FROM platform_staff ps
  WHERE ps.qr_token = p_qr_token;

  IF v_staff IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'invalid_token'
    );
  END IF;

  IF v_staff.is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'staff_inactive'
    );
  END IF;

  IF v_staff.qr_is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'qr_inactive'
    );
  END IF;

  IF v_staff.role IS NULL OR v_staff.role = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'no_role'
    );
  END IF;

  IF v_staff.department IS NULL OR v_staff.department = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'no_department'
    );
  END IF;

  SELECT p.* INTO v_profile
  FROM profiles p
  WHERE p.id = v_staff.user_id;

  v_default_route := CASE v_staff.department
    WHEN 'B2F' THEN '/b2f'
    WHEN 'B2B' THEN '/companies'
    WHEN 'HQ' THEN '/hq'
    WHEN 'Support' THEN '/support'
    WHEN 'Finance' THEN '/finance'
    ELSE '/dashboard'
  END;

  UPDATE platform_staff
  SET qr_last_scanned_at = now()
  WHERE id = v_staff.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم التحقق بنجاح',
    'staff', jsonb_build_object(
      'id', v_staff.id,
      'user_id', v_staff.user_id,
      'role', v_staff.role,
      'department', v_staff.department,
      'job_title', v_staff.job_title,
      'requires_pin', v_staff.requires_pin,
      'is_temporary_qr', COALESCE(v_staff.is_temporary_qr, false),
      'display_name', v_profile.display_name,
      'phone_number', v_profile.phone_number
    ),
    'redirect_to', v_default_route
  );
END;
$$;
