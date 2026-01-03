/*
  # إزالة نظام السيناريوهات من دوال التحقق

  1. التحديثات
    - تحديث verify_qr_access لتعمل بدون السيناريوهات
    - تحديث verify_staff_pin لتعمل بدون السيناريوهات
    - استخدام landing_route الافتراضي '/hq'
    
  2. الأمان
    - الحفاظ على جميع فحوصات الأمان الموجودة
    - إزالة الاعتماد على جداول work_scenarios فقط
*/

-- تحديث verify_qr_access لإزالة السيناريوهات
CREATE OR REPLACE FUNCTION verify_qr_access(p_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_record RECORD;
  v_landing_route text;
  v_result jsonb;
BEGIN
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

  UPDATE platform_staff
  SET qr_last_scanned_at = now()
  WHERE id = v_staff_record.id;

  -- استخدام landing_route الافتراضي
  v_landing_route := '/hq';

  v_result := jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN v_staff_record.requires_pin THEN 'تم التحقق من QR - يرجى إدخال الرمز السري'
      ELSE 'تم التحقق بنجاح'
    END,
    'staff', jsonb_build_object(
      'id', v_staff_record.id,
      'user_id', v_staff_record.user_id,
      'full_name', v_staff_record.full_name,
      'role', v_staff_record.role,
      'role_title', v_staff_record.role_title,
      'department', v_staff_record.department,
      'requires_pin', v_staff_record.requires_pin,
      'is_temporary_qr', v_staff_record.is_temporary_qr,
      'landing_route', v_landing_route
    ),
    'requires_pin', v_staff_record.requires_pin,
    'landing_route', v_landing_route,
    'default_route', '/hq'
  );

  RETURN v_result;
END;
$$;

-- تحديث verify_staff_pin لإزالة السيناريوهات
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
  v_landing_route text;
BEGIN
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

  IF v_staff_record.pin_code IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لم يتم تعيين رمز PIN لهذا الموظف'
    );
  END IF;

  IF v_staff_record.pin_code != p_pin_code THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رمز PIN غير صحيح'
    );
  END IF;

  UPDATE platform_staff
  SET pin_last_used_at = now()
  WHERE id = p_staff_id;

  -- استخدام landing_route الافتراضي
  v_landing_route := '/hq';

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم التحقق بنجاح',
    'staff', jsonb_build_object(
      'id', v_staff_record.id,
      'user_id', v_staff_record.user_id,
      'full_name', v_staff_record.full_name,
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
