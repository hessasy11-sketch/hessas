/*
  # تعطيل الرقم السري (PIN) لجميع الموظفين

  1. التعديلات
    - تعديل verify_qr_access لإرجاع requires_pin = false دائماً
    - تحديث جميع permission_packs لتعطيل PIN
    - تحديث جميع platform_staff لتعطيل PIN

  2. التأثير
    - جميع الموظفين يمكنهم تسجيل الدخول بمسح QR فقط
    - لا حاجة لإدخال PIN
*/

-- تحديث جميع permission_packs لتعطيل PIN
UPDATE permission_packs
SET requires_pin = false
WHERE requires_pin = true;

-- تحديث جميع platform_staff لتعطيل PIN
UPDATE platform_staff
SET requires_pin = false
WHERE requires_pin = true;

-- تعديل verify_qr_access لإرجاع requires_pin = false دائماً
CREATE OR REPLACE FUNCTION verify_qr_access(p_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_record RECORD;
  v_pack_record RECORD;
  v_landing_route text;
  v_result jsonb;
BEGIN
  -- جلب بيانات الموظف
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

  -- التحقق من صلاحية QR المؤقت
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

  -- جلب بيانات حزمة الصلاحيات إذا كانت موجودة
  IF v_staff_record.pack_id IS NOT NULL THEN
    SELECT * INTO v_pack_record
    FROM permission_packs
    WHERE id = v_staff_record.pack_id
    AND is_active = true;

    IF FOUND THEN
      -- استخدام landing_route من الحزمة
      v_landing_route := v_pack_record.landing_route;
    ELSE
      -- القيمة الافتراضية
      v_landing_route := '/hq';
    END IF;
  ELSE
    -- القيمة الافتراضية إذا لم تكن هناك حزمة
    v_landing_route := '/hq';
  END IF;

  -- تحديث آخر مسح للـ QR
  UPDATE platform_staff
  SET qr_last_scanned_at = now()
  WHERE id = v_staff_record.id;

  -- بناء النتيجة مع requires_pin = false دائماً
  v_result := jsonb_build_object(
    'success', true,
    'message', 'تم التحقق بنجاح',
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
      'pack_id', v_staff_record.pack_id,
      'requires_pin', false,
      'is_temporary_qr', v_staff_record.is_temporary_qr,
      'landing_route', v_landing_route
    ),
    'requires_pin', false,
    'landing_route', v_landing_route,
    'default_route', '/hq'
  );

  RETURN v_result;
END;
$$;
