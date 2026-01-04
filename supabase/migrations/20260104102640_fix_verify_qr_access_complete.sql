/*
  # إصلاح دالة verify_qr_access بشكل كامل

  1. حذف الدالة القديمة
  2. إنشاء دالة جديدة من الصفر
  3. التأكد من جميع الشروط
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS verify_qr_access(text);

-- إنشاء الدالة الجديدة
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

  RAISE NOTICE 'Returning success with requires_pin=%', v_requires_pin;

  -- إرجاع النتيجة
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE
      WHEN v_requires_pin THEN 'تم التحقق من QR - يرجى إدخال الرمز السري'
      ELSE 'تم التحقق بنجاح'
    END,
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

-- اختبار الدالة
DO $$
DECLARE
  v_result jsonb;
BEGIN
  -- اختبار مع QR المدير العام
  SELECT verify_qr_access('GM-QR-2026-001') INTO v_result;
  RAISE NOTICE 'Test Result: %', v_result;
  
  IF (v_result->>'success')::boolean = true THEN
    RAISE NOTICE '✅ Test PASSED';
  ELSE
    RAISE NOTICE '❌ Test FAILED: %', v_result->>'message';
  END IF;
END $$;
