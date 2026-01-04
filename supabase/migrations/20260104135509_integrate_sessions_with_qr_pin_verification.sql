/*
  # دمج نظام الجلسات مع التحقق من QR و PIN

  ## الهدف
  - تحديث verify_qr_access لإنشاء جلسة عند النجاح
  - تحديث verify_staff_pin لإنشاء جلسة عند النجاح
  - إرجاع session_token مع النتيجة

  ## التغييرات
  1. verify_qr_access - إضافة إنشاء جلسة
  2. verify_staff_pin - إضافة إنشاء جلسة
*/

-- 1. تحديث verify_qr_access لإنشاء جلسة
CREATE OR REPLACE FUNCTION verify_qr_access(p_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff RECORD;
  v_pack RECORD;
  v_requires_pin boolean := false;
  v_landing_route text := '/hq';
  v_session_result jsonb;
BEGIN
  -- تسجيل محاولة الدخول
  RAISE NOTICE 'Verifying QR token: %', p_qr_token;

  -- التحقق من وجود التوكن
  IF p_qr_token IS NULL OR trim(p_qr_token) = '' THEN
    RAISE NOTICE 'Empty token received';
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رمز QR فارغ',
      'reason', 'empty_token'
    );
  END IF;

  -- البحث عن الموظف
  SELECT * INTO v_staff
  FROM platform_staff
  WHERE qr_code = p_qr_token
  AND is_active = true
  AND qr_is_active = true;

  -- التحقق من وجود الموظف
  IF NOT FOUND THEN
    RAISE NOTICE 'Staff not found for QR: %', p_qr_token;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رمز QR غير صالح أو غير نشط',
      'reason', 'invalid_qr'
    );
  END IF;

  RAISE NOTICE 'Staff found: % (ID: %)', v_staff.full_name, v_staff.id;

  -- التحقق من QR المؤقت
  IF v_staff.is_temporary_qr = true THEN
    IF v_staff.temporary_qr_created_at IS NULL OR
       (now() - v_staff.temporary_qr_created_at) > INTERVAL '24 hours' THEN
      RAISE NOTICE 'Temporary QR expired';
      RETURN jsonb_build_object(
        'success', false,
        'message', 'رمز QR المؤقت منتهي الصلاحية',
        'reason', 'qr_expired'
      );
    END IF;
  END IF;

  -- جلب بيانات حزمة الصلاحيات
  IF v_staff.pack_id IS NOT NULL THEN
    SELECT * INTO v_pack
    FROM permission_packs
    WHERE id = v_staff.pack_id
    AND is_active = true;

    IF FOUND THEN
      v_requires_pin := v_pack.requires_pin;
      v_landing_route := v_pack.landing_route;
      RAISE NOTICE 'Permission pack found: requires_pin=%, landing_route=%', v_requires_pin, v_landing_route;
    END IF;
  END IF;

  -- إذا لم توجد حزمة صلاحيات، استخدم القيم من الموظف
  IF v_pack IS NULL THEN
    v_requires_pin := COALESCE(v_staff.requires_pin, false);
    RAISE NOTICE 'No pack found, using staff settings: requires_pin=%', v_requires_pin;
  END IF;

  -- تحديث آخر مسح
  UPDATE platform_staff
  SET qr_last_scanned_at = now()
  WHERE id = v_staff.id;

  -- إذا كان لا يتطلب PIN، إنشاء جلسة مباشرة
  IF NOT v_requires_pin THEN
    v_session_result := create_staff_session(
      v_staff.id,
      'qr',
      v_landing_route,
      '{}'::jsonb,
      NULL,
      NULL
    );

    IF (v_session_result->>'success')::boolean THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'تم التحقق بنجاح',
        'requires_pin', false,
        'session_token', v_session_result->>'session_token',
        'landing_route', v_landing_route,
        'default_route', '/hq',
        'staff', jsonb_build_object(
          'id', v_staff.id,
          'user_id', v_staff.user_id,
          'full_name', v_staff.full_name,
          'phone_number', v_staff.phone_number,
          'phone', v_staff.phone_number,
          'role', v_staff.role,
          'job_title', v_staff.job_title,
          'role_title', v_staff.job_title,
          'department', v_staff.department,
          'pack_id', v_staff.pack_id,
          'requires_pin', v_requires_pin,
          'landing_route', v_landing_route,
          'is_temporary_qr', COALESCE(v_staff.is_temporary_qr, false)
        )
      );
    END IF;
  END IF;

  RAISE NOTICE 'Returning success with requires_pin=%', v_requires_pin;

  -- إرجاع النتيجة (يتطلب PIN)
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم التحقق من QR - يرجى إدخال الرمز السري',
    'requires_pin', v_requires_pin,
    'landing_route', v_landing_route,
    'default_route', '/hq',
    'staff', jsonb_build_object(
      'id', v_staff.id,
      'user_id', v_staff.user_id,
      'full_name', v_staff.full_name,
      'phone_number', v_staff.phone_number,
      'phone', v_staff.phone_number,
      'role', v_staff.role,
      'job_title', v_staff.job_title,
      'role_title', v_staff.job_title,
      'department', v_staff.department,
      'pack_id', v_staff.pack_id,
      'requires_pin', v_requires_pin,
      'landing_route', v_landing_route,
      'is_temporary_qr', COALESCE(v_staff.is_temporary_qr, false)
    )
  );
END;
$$;

-- 2. تحديث verify_staff_pin لإنشاء جلسة
CREATE OR REPLACE FUNCTION verify_staff_pin(
  p_staff_id uuid,
  p_pin_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_record RECORD;
  v_pack_record RECORD;
  v_landing_route text;
  v_session_result jsonb;
BEGIN
  -- جلب بيانات الموظف
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

  -- التحقق من وجود PIN
  IF v_staff_record.pin_code IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لم يتم تعيين رمز PIN لهذا الموظف',
      'reason', 'no_pin_set'
    );
  END IF;

  -- التحقق من صحة PIN باستخدام crypt
  IF v_staff_record.pin_code != crypt(p_pin_code, v_staff_record.pin_code) THEN
    -- زيادة عدد المحاولات الفاشلة
    UPDATE platform_staff
    SET 
      pin_attempts = COALESCE(pin_attempts, 0) + 1,
      pin_locked_until = CASE 
        WHEN COALESCE(pin_attempts, 0) + 1 >= 5 THEN now() + interval '15 minutes'
        ELSE pin_locked_until
      END
    WHERE id = p_staff_id;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'رمز PIN غير صحيح',
      'reason', 'invalid_pin',
      'attempts_remaining', 5 - (COALESCE(v_staff_record.pin_attempts, 0) + 1)
    );
  END IF;

  -- إعادة تعيين المحاولات الفاشلة
  UPDATE platform_staff
  SET 
    pin_attempts = 0,
    pin_locked_until = NULL
  WHERE id = p_staff_id;

  -- جلب landing_route من الحزمة إذا كانت موجودة
  IF v_staff_record.pack_id IS NOT NULL THEN
    SELECT landing_route INTO v_landing_route
    FROM permission_packs
    WHERE id = v_staff_record.pack_id
    AND is_active = true;
  END IF;
  
  -- إذا لم يكن هناك حزمة أو لم يتم العثور على المسار، استخدم المسار الافتراضي حسب الدور
  IF v_landing_route IS NULL THEN
    v_landing_route := CASE v_staff_record.role
      WHEN 'super_admin' THEN '/hq'
      WHEN 'general_manager' THEN '/hq'
      WHEN 'admin' THEN '/hq'
      WHEN 'manager' THEN '/admin/b2f'
      WHEN 'supervisor' THEN '/admin/b2f'
      WHEN 'accountant' THEN '/admin/b2f'
      WHEN 'staff' THEN '/admin/b2f'
      ELSE '/hq'
    END;
  END IF;

  -- إنشاء جلسة جديدة
  v_session_result := create_staff_session(
    p_staff_id,
    'qr_pin',
    v_landing_route,
    '{}'::jsonb,
    NULL,
    NULL
  );

  IF NOT (v_session_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'فشل في إنشاء الجلسة'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم التحقق بنجاح',
    'session_token', v_session_result->>'session_token',
    'staff', jsonb_build_object(
      'id', v_staff_record.id,
      'user_id', v_staff_record.user_id,
      'full_name', v_staff_record.full_name,
      'phone_number', v_staff_record.phone_number,
      'phone', v_staff_record.phone_number,
      'role', v_staff_record.role,
      'job_title', v_staff_record.job_title,
      'role_title', v_staff_record.job_title,
      'department', v_staff_record.department,
      'landing_route', v_landing_route
    ),
    'landing_route', v_landing_route,
    'default_route', v_landing_route
  );
END;
$$;

COMMENT ON FUNCTION verify_qr_access IS 'التحقق من رمز QR وإنشاء جلسة تلقائياً إذا لم يتطلب PIN';
COMMENT ON FUNCTION verify_staff_pin IS 'التحقق من رمز PIN وإنشاء جلسة تلقائياً';