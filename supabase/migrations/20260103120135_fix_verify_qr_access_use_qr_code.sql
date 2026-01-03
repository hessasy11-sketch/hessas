/*
  # إصلاح دالة verify_qr_access لاستخدام qr_code

  1. Problem
    - الدالة تبحث عن qr_token
    - ولكن الجدول يحتوي على qr_code

  2. Solution
    - تحديث الدالة لاستخدام qr_code بدلاً من qr_token
    - جعل الدالة أكثر موثوقية
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
  -- البحث باستخدام qr_code (وليس qr_token)
  SELECT ps.* INTO v_staff
  FROM platform_staff ps
  WHERE ps.qr_code = p_qr_token;

  -- التحقق من وجود الموظف
  IF v_staff IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رمز QR غير صالح',
      'reason', 'invalid_token'
    );
  END IF;

  -- التحقق من أن الموظف نشط
  IF v_staff.is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الحساب غير نشط',
      'reason', 'staff_inactive'
    );
  END IF;

  -- التحقق من أن QR نشط
  IF v_staff.qr_is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رمز QR غير نشط',
      'reason', 'qr_inactive'
    );
  END IF;

  -- التحقق من وجود دور
  IF v_staff.role IS NULL OR v_staff.role = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لم يتم تعيين دور للموظف',
      'reason', 'no_role'
    );
  END IF;

  -- التحقق من وجود قسم
  IF v_staff.department IS NULL OR v_staff.department = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لم يتم تعيين قسم للموظف',
      'reason', 'no_department'
    );
  END IF;

  -- جلب بيانات الملف الشخصي
  SELECT p.* INTO v_profile
  FROM profiles p
  WHERE p.id = v_staff.user_id;

  -- تحديد المسار الافتراضي حسب القسم
  v_default_route := CASE v_staff.department
    WHEN 'B2F' THEN '/b2f-admin'
    WHEN 'B2B' THEN '/companies'
    WHEN 'HQ' THEN '/hq'
    WHEN 'Support' THEN '/support'
    WHEN 'Finance' THEN '/finance'
    ELSE '/dashboard'
  END;

  -- تحديث آخر وقت مسح للباركود
  UPDATE platform_staff
  SET qr_last_scanned_at = now()
  WHERE id = v_staff.id;

  -- إرجاع بيانات النجاح
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم التحقق بنجاح',
    'staff', jsonb_build_object(
      'id', v_staff.id,
      'user_id', v_staff.user_id,
      'role', v_staff.role,
      'department', v_staff.department,
      'job_title', v_staff.job_title,
      'requires_pin', COALESCE(v_staff.requires_pin, false),
      'is_temporary_qr', COALESCE(v_staff.is_temporary_qr, false),
      'full_name', COALESCE(v_staff.full_name, v_profile.display_name, 'موظف'),
      'display_name', COALESCE(v_profile.display_name, v_staff.full_name, 'موظف'),
      'phone_number', COALESCE(v_staff.phone_number, v_profile.phone_number)
    ),
    'redirect_to', v_default_route
  );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION verify_qr_access(text) TO anon, authenticated, service_role;
