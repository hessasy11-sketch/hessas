/*
  # Fix verify_staff_credentials Return Structure
  
  1. Changes
    - Change return structure to match frontend expectations
    - Return flat structure instead of nested 'staff' object
    - Use staff_id and name_ar instead of nested object
  
  2. Security
    - Maintains SECURITY DEFINER for password verification
*/

-- Drop and recreate with correct return structure
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
    full_name,
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
      'error', 'رقم الجوال أو كلمة المرور غير صحيحة'
    );
  END IF;

  -- 3. التحقق من تفعيل الحساب
  IF NOT v_staff.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الحساب موقوف. تواصل مع المدير العام'
    );
  END IF;

  -- 4. التحقق من كلمة المرور
  IF v_staff.password_hash IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'كلمة المرور غير معينة. تواصل مع المدير العام'
    );
  END IF;

  IF NOT (v_staff.password_hash = crypt(p_password, v_staff.password_hash)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'رقم الجوال أو كلمة المرور غير صحيحة'
    );
  END IF;

  -- 5. تحديث آخر تسجيل دخول
  UPDATE platform_staff
  SET last_login_at = now()
  WHERE id = v_staff.id;

  -- 6. إرجاع بيانات الموظف (flat structure)
  RETURN jsonb_build_object(
    'success', true,
    'staff_id', v_staff.id,
    'name_ar', v_staff.full_name,
    'role', v_staff.role,
    'department', v_staff.department
  );
END;
$$;
