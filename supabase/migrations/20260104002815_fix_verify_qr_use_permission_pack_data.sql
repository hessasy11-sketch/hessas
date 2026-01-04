/*
  # إصلاح verify_qr_access لاستخدام بيانات حزمة الصلاحيات

  1. المشكلة
    - كانت دالة verify_qr_access تستخدم requires_pin من platform_staff
    - لكن requires_pin الحقيقي موجود في permission_packs
    - نفس الشيء مع landing_route
    
  2. الحل
    - JOIN مع permission_packs للحصول على البيانات الصحيحة
    - إرجاع requires_pin و landing_route من الحزمة
    - الاحتفاظ بالقيم الافتراضية إذا لم تكن هناك حزمة
    
  3. الأمان
    - الحفاظ على جميع فحوصات الأمان
    - التحقق من is_active للحزمة
*/

-- تحديث دالة verify_qr_access لاستخدام بيانات permission_pack
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

  -- بناء النتيجة
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
      'phone', v_staff_record.phone,
      'role', v_staff_record.role,
      'role_title', v_staff_record.role_title,
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

-- تحديث دالة verify_staff_pin لاستخدام landing_route من الحزمة
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
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رمز PIN غير صحيح'
    );
  END IF;

  -- تحديث آخر استخدام للـ PIN
  UPDATE platform_staff
  SET pin_last_used_at = now()
  WHERE id = p_staff_id;

  -- جلب landing_route من الحزمة إذا كانت موجودة
  v_landing_route := '/hq'; -- القيمة الافتراضية
  
  IF v_staff_record.pack_id IS NOT NULL THEN
    SELECT landing_route INTO v_landing_route
    FROM permission_packs
    WHERE id = v_staff_record.pack_id
    AND is_active = true;
    
    -- إذا لم تُجد الحزمة أو غير نشطة، استخدم القيمة الافتراضية
    v_landing_route := COALESCE(v_landing_route, '/hq');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم التحقق بنجاح',
    'staff', jsonb_build_object(
      'id', v_staff_record.id,
      'user_id', v_staff_record.user_id,
      'full_name', v_staff_record.full_name,
      'phone', v_staff_record.phone,
      'role', v_staff_record.role,
      'role_title', v_staff_record.role_title,
      'department', v_staff_record.department,
      'landing_route', v_landing_route
    ),
    'landing_route', v_landing_route,
    'default_route', '/hq'
  );
END;
$$;
