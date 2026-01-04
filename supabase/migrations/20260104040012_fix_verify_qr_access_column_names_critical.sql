/*
  # إصلاح أسماء الأعمدة في verify_qr_access (حرج - إصلاح المشكلة الجذرية)

  1. المشكلة الجذرية
    - كانت دالة verify_qr_access تستخدم أسماء أعمدة غير صحيحة:
      * v_staff_record.phone → الصحيح: phone_number
      * v_staff_record.role_title → الصحيح: job_title
    - هذا يسبب إرجاع NULL في البيانات
    - مما يجعل Frontend لا يتعرف على الموظف بشكل صحيح
    
  2. الإصلاح
    - استخدام الأسماء الصحيحة من schema الجدول
    - التأكد من إرجاع جميع البيانات بشكل صحيح
    
  3. التأثير
    - الآن staff object سيحتوي على البيانات الصحيحة
    - requires_pin سيعمل بشكل صحيح
    - PIN Modal سيظهر للموظفين الذين يحتاجون PIN
*/

-- إصلاح verify_qr_access مع أسماء الأعمدة الصحيحة
CREATE OR REPLACE FUNCTION verify_qr_access(p_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_record RECORD;
  v_pack_record RECORD;
  v_landing_route text;
  v_requires_pin boolean;
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
      -- استخدام بيانات الحزمة
      v_requires_pin := v_pack_record.requires_pin;
      v_landing_route := v_pack_record.landing_route;
    ELSE
      -- القيم الافتراضية إذا لم تكن الحزمة نشطة
      v_requires_pin := COALESCE(v_staff_record.requires_pin, false);
      v_landing_route := '/hq';
    END IF;
  ELSE
    -- استخدام قيم الموظف الافتراضية إذا لم تكن هناك حزمة
    v_requires_pin := COALESCE(v_staff_record.requires_pin, false);
    v_landing_route := '/hq';
  END IF;

  -- تحديث آخر مسح للـ QR
  UPDATE platform_staff
  SET qr_last_scanned_at = now()
  WHERE id = v_staff_record.id;

  -- بناء النتيجة مع أسماء الأعمدة الصحيحة
  v_result := jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN v_requires_pin THEN 'تم التحقق من QR - يرجى إدخال الرمز السري'
      ELSE 'تم التحقق بنجاح'
    END,
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
      'requires_pin', v_requires_pin,
      'is_temporary_qr', v_staff_record.is_temporary_qr,
      'landing_route', v_landing_route
    ),
    'requires_pin', v_requires_pin,
    'landing_route', v_landing_route,
    'default_route', '/hq'
  );

  RETURN v_result;
END;
$$;

-- إصلاح verify_staff_pin مع أسماء الأعمدة الصحيحة
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
BEGIN
  -- جلب بيانات الموظف
  SELECT * INTO v_staff_record
  FROM platform_staff
  WHERE id = p_staff_id
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الموظف غير موجود أو غير نشط'
    );
  END IF;

  -- التحقق من وجود PIN
  IF v_staff_record.pin_code IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لم يتم تعيين رمز PIN لهذا الموظف'
    );
  END IF;

  -- التحقق من صحة PIN
  IF v_staff_record.pin_code != p_pin_code THEN
    -- تحديث عدد المحاولات
    UPDATE platform_staff
    SET pin_attempts = pin_attempts + 1
    WHERE id = p_staff_id;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رمز PIN غير صحيح',
      'attempts_remaining', GREATEST(3 - (v_staff_record.pin_attempts + 1), 0)
    );
  END IF;

  -- تحديث آخر استخدام للـ PIN وإعادة تعيين المحاولات
  UPDATE platform_staff
  SET 
    pin_last_verified_at = now(),
    pin_attempts = 0
  WHERE id = p_staff_id;

  -- جلب landing_route من الحزمة إذا كانت موجودة
  v_landing_route := '/hq';
  
  IF v_staff_record.pack_id IS NOT NULL THEN
    SELECT landing_route INTO v_landing_route
    FROM permission_packs
    WHERE id = v_staff_record.pack_id
    AND is_active = true;
    
    v_landing_route := COALESCE(v_landing_route, '/hq');
  END IF;

  RETURN jsonb_build_object(
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
      'landing_route', v_landing_route
    ),
    'landing_route', v_landing_route,
    'default_route', '/hq'
  );
END;
$$;

-- إضافة log للتحقق
DO $$
DECLARE
  v_test_result jsonb;
  v_gm_qr text;
BEGIN
  -- جلب QR للمدير العام
  SELECT qr_code INTO v_gm_qr
  FROM platform_staff
  WHERE role = 'super_admin'
  LIMIT 1;
  
  IF v_gm_qr IS NOT NULL THEN
    -- اختبار verify_qr_access
    SELECT verify_qr_access(v_gm_qr) INTO v_test_result;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE 'اختبار verify_qr_access:';
    RAISE NOTICE 'Success: %', v_test_result->>'success';
    RAISE NOTICE 'Requires PIN: %', v_test_result->>'requires_pin';
    RAISE NOTICE 'Landing Route: %', v_test_result->>'landing_route';
    RAISE NOTICE 'Staff Name: %', v_test_result->'staff'->>'full_name';
    RAISE NOTICE 'Staff Phone: %', v_test_result->'staff'->>'phone_number';
    RAISE NOTICE 'Staff Pack ID: %', v_test_result->'staff'->>'pack_id';
    RAISE NOTICE '====================================';
  END IF;
END $$;
