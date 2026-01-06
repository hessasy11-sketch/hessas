/*
  # Simplified Login System

  1. Changes
    - Add password field to platform_staff
    - Create simplified login function
    - Update existing accounts with passwords

  2. Security
    - Simple password check
    - Returns staff info and farm if farm_manager
*/

-- Add password field to platform_staff if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN password_hash text;
  END IF;
END $$;

-- Create simplified login function
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
    WHERE ftm.staff_id = v_staff_record.id
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

-- Update existing General Manager account
UPDATE platform_staff
SET password_hash = '123456',
    role = 'farms_manager'
WHERE staff_code = 'STFGM001' OR phone = '0500000000';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION simplified_login TO anon, authenticated;