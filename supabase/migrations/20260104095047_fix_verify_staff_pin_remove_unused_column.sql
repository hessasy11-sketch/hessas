/*
  # إصلاح verify_staff_pin - إزالة العمود غير الموجود

  1. المشكلة
    - pin_last_used_at غير موجود في الجدول

  2. الحل
    - إزالة محاولة تحديث pin_last_used_at
*/

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
    'default_route', v_landing_route
  );
END;
$$;
