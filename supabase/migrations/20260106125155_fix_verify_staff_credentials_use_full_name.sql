/*
  # Fix verify_staff_credentials Function
  
  1. Changes
    - Replace `name_ar` with `full_name` in the function
    - Ensure compatibility with current platform_staff schema
  
  2. Security
    - Maintains SECURITY DEFINER for password verification
*/

-- Drop and recreate the function with correct column name
DROP FUNCTION IF EXISTS verify_staff_credentials(text, text);

CREATE OR REPLACE FUNCTION verify_staff_credentials(
  p_phone text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff record;
BEGIN
  -- 1. البحث عن الموظف
  SELECT
    id,
    full_name,  -- تم تغييره من name_ar
    role,
    department,
    is_active,
    password_hash
  INTO v_staff
  FROM platform_staff
  WHERE phone = p_phone OR phone_number = p_phone;

  -- 2. التحقق من وجود الموظف
  IF v_staff.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid phone or password'
    );
  END IF;

  -- 3. التحقق من تفعيل الحساب
  IF NOT v_staff.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Account is suspended'
    );
  END IF;

  -- 4. التحقق من كلمة المرور
  IF v_staff.password_hash IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Password not set'
    );
  END IF;

  IF NOT (v_staff.password_hash = crypt(p_password, v_staff.password_hash)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid phone or password'
    );
  END IF;

  -- 5. تحديث آخر تسجيل دخول
  UPDATE platform_staff
  SET last_login_at = now()
  WHERE id = v_staff.id;

  -- 6. إرجاع بيانات الموظف
  RETURN jsonb_build_object(
    'success', true,
    'staff', jsonb_build_object(
      'id', v_staff.id,
      'name', v_staff.full_name,  -- تم تغييره من name_ar
      'role', v_staff.role,
      'department', v_staff.department
    )
  );
END;
$$;
