/*
  # إعادة إنشاء دوال QR وPIN مع تسجيل العمليات

  1. Drop existing functions
  2. Recreate with audit logging
*/

-- حذف الدوال الموجودة
DROP FUNCTION IF EXISTS generate_staff_qr_token(uuid);
DROP FUNCTION IF EXISTS toggle_staff_qr_status(uuid, boolean);
DROP FUNCTION IF EXISTS set_staff_pin(uuid, text, boolean);
DROP FUNCTION IF EXISTS remove_staff_pin(uuid);

-- إعادة إنشاء generate_staff_qr_token
CREATE FUNCTION generate_staff_qr_token(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token text;
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM platform_staff
  WHERE user_id = auth.uid();

  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := 'STAFF_' || replace(v_token, '/', '_');
  v_token := replace(v_token, '+', '-');

  UPDATE platform_staff
  SET
    qr_token = v_token,
    qr_is_active = true,
    qr_generated_at = now()
  WHERE id = p_staff_id;

  IF v_admin_id IS NOT NULL THEN
    PERFORM log_admin_operation(
      v_admin_id,
      p_staff_id,
      'generate_qr',
      jsonb_build_object('token_prefix', substring(v_token, 1, 20))
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'qr_token', v_token,
    'generated_at', now()
  );
END;
$$;

-- إعادة إنشاء toggle_staff_qr_status
CREATE FUNCTION toggle_staff_qr_status(
  p_staff_id uuid,
  p_is_active boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM platform_staff
  WHERE user_id = auth.uid();

  UPDATE platform_staff
  SET qr_is_active = p_is_active
  WHERE id = p_staff_id;

  IF v_admin_id IS NOT NULL THEN
    PERFORM log_admin_operation(
      v_admin_id,
      p_staff_id,
      CASE WHEN p_is_active THEN 'activate_qr' ELSE 'deactivate_qr' END,
      jsonb_build_object('new_status', p_is_active)
    );
  END IF;

  RETURN FOUND;
END;
$$;

-- إعادة إنشاء set_staff_pin
CREATE FUNCTION set_staff_pin(
  p_staff_id uuid,
  p_pin_code text,
  p_requires_pin boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin_hash text;
  v_admin_id uuid;
  v_operation_type text;
BEGIN
  SELECT id INTO v_admin_id
  FROM platform_staff
  WHERE user_id = auth.uid();

  SELECT CASE WHEN pin_hash IS NOT NULL THEN 'change_pin' ELSE 'set_pin' END
  INTO v_operation_type
  FROM platform_staff
  WHERE id = p_staff_id;

  v_pin_hash := crypt(p_pin_code, gen_salt('bf'));

  UPDATE platform_staff
  SET
    pin_hash = v_pin_hash,
    requires_pin = p_requires_pin,
    pin_attempts = 0,
    pin_locked_until = NULL
  WHERE id = p_staff_id;

  IF v_admin_id IS NOT NULL THEN
    PERFORM log_admin_operation(
      v_admin_id,
      p_staff_id,
      v_operation_type,
      jsonb_build_object('requires_pin', p_requires_pin)
    );
  END IF;

  RETURN FOUND;
END;
$$;

-- إعادة إنشاء remove_staff_pin
CREATE FUNCTION remove_staff_pin(p_staff_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM platform_staff
  WHERE user_id = auth.uid();

  UPDATE platform_staff
  SET
    pin_hash = NULL,
    requires_pin = false,
    pin_attempts = 0,
    pin_locked_until = NULL
  WHERE id = p_staff_id;

  IF v_admin_id IS NOT NULL THEN
    PERFORM log_admin_operation(
      v_admin_id,
      p_staff_id,
      'remove_pin',
      jsonb_build_object('removed_at', now())
    );
  END IF;

  RETURN FOUND;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION generate_staff_qr_token TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_staff_qr_status TO authenticated;
GRANT EXECUTE ON FUNCTION set_staff_pin TO authenticated;
GRANT EXECUTE ON FUNCTION remove_staff_pin TO authenticated;
