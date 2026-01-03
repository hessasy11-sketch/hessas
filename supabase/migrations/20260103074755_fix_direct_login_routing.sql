/*
  # إصلاح توجيه تسجيل الدخول المباشر

  1. Changes
    - تحديث دالة verify_staff_login لتوجيه صحيح للصفحة الرئيسية
*/

CREATE OR REPLACE FUNCTION verify_staff_login(
  p_phone_number text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff platform_staff;
  v_profile profiles;
  v_default_route text;
BEGIN
  SELECT ps.* INTO v_staff
  FROM platform_staff ps
  INNER JOIN profiles p ON p.id = ps.user_id
  WHERE p.phone_number = p_phone_number;

  IF v_staff IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رقم الهاتف غير صحيح'
    );
  END IF;

  IF v_staff.password_hash IS NULL OR v_staff.password_hash = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لم يتم تعيين كلمة مرور لهذا الحساب'
    );
  END IF;

  IF v_staff.password_hash != crypt(p_password, v_staff.password_hash) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'كلمة المرور غير صحيحة'
    );
  END IF;

  IF v_staff.is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'هذا الحساب معطل'
    );
  END IF;

  SELECT p.* INTO v_profile
  FROM profiles p
  WHERE p.id = v_staff.user_id;

  -- تحديد المسار الافتراضي
  IF v_staff.role = 'super_admin' THEN
    v_default_route := '/';
  ELSIF v_staff.department = 'B2F' THEN
    v_default_route := '/b2f';
  ELSIF v_staff.department = 'B2B' THEN
    v_default_route := '/';
  ELSIF v_staff.department = 'HQ' THEN
    v_default_route := '/';
  ELSIF v_staff.department = 'Support' THEN
    v_default_route := '/';
  ELSIF v_staff.department = 'Finance' THEN
    v_default_route := '/';
  ELSE
    v_default_route := '/';
  END IF;

  UPDATE platform_staff
  SET qr_last_scanned_at = now()
  WHERE id = v_staff.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تسجيل الدخول بنجاح',
    'staff', jsonb_build_object(
      'id', v_staff.id,
      'user_id', v_staff.user_id,
      'role', v_staff.role,
      'department', v_staff.department,
      'job_title', v_staff.job_title,
      'display_name', v_profile.display_name,
      'phone_number', v_profile.phone_number
    ),
    'redirect_to', v_default_route
  );
END;
$$;
