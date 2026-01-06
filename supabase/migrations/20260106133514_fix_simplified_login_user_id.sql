/*
  # Fix simplified_login function to use user_id

  1. Changes
    - Update simplified_login to use user_id instead of staff_id
    - Fix farm_team_members join

  2. Security
    - No changes to security
*/

CREATE OR REPLACE FUNCTION simplified_login(
  p_phone text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_record record;
  v_farm_record record;
  v_result jsonb;
BEGIN
  -- Find staff by phone
  SELECT id, full_name, role, password_hash
  INTO v_staff_record
  FROM platform_staff
  WHERE phone = p_phone
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'رقم الجوال أو كلمة المرور غير صحيحة';
  END IF;

  -- Check password
  IF v_staff_record.password_hash IS NULL OR v_staff_record.password_hash != p_password THEN
    RAISE EXCEPTION 'رقم الجوال أو كلمة المرور غير صحيحة';
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'staff_id', v_staff_record.id,
    'full_name', v_staff_record.full_name,
    'role', v_staff_record.role
  );

  -- If farm_manager, get their farm
  IF v_staff_record.role = 'farm_manager' THEN
    SELECT f.id, f.name
    INTO v_farm_record
    FROM farm_team_members ftm
    JOIN b2f_farms f ON f.id = ftm.farm_id
    WHERE ftm.user_id = v_staff_record.id
      AND ftm.role = 'farm_manager'
    LIMIT 1;

    IF FOUND THEN
      v_result := v_result || jsonb_build_object(
        'farm_id', v_farm_record.id,
        'farm_name', v_farm_record.name
      );
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION simplified_login TO anon, authenticated;