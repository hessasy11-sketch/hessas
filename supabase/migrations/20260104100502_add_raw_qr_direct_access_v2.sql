/*
  # إضافة نظام الوصول المباشر بالباركود الخام

  1. التعديل
    - تعديل verify_qr_access للتحقق من القيم الخاصة أولاً
    - عند مسح "ADMIN-HQ-2026" يتم تسجيل دخول مباشر للمدير العام
    - بدون طلب PIN
    - توجيه مباشر إلى /hq
    - إنشاء جلسة HQ تلقائياً

  2. آلية العمل
    - التحقق من النص الخام أولاً قبل البحث في الجدول
    - إذا كان "ADMIN-HQ-2026" → دخول مباشر
    - وإلا → المنطق العادي للبحث في platform_staff

  3. الجلسة
    - تستمر حتى Logout
    - أو Idle لمدة 30 دقيقة
    - يتم التعامل معها في Frontend (adminSessionManager)
*/

-- تعديل verify_qr_access لدعم الباركود الخام
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
  -- ===== 1. التحقق من الباركود الخاص للمدير العام =====
  IF p_qr_token = 'ADMIN-HQ-2026' THEN
    -- البحث عن المدير العام في الجدول
    SELECT * INTO v_staff_record
    FROM platform_staff
    WHERE role = 'super_admin'
    AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'المدير العام غير موجود في النظام',
        'reason', 'admin_not_found'
      );
    END IF;

    -- تحديث آخر دخول
    UPDATE platform_staff
    SET qr_last_scanned_at = now()
    WHERE id = v_staff_record.id;

    -- إرجاع نتيجة النجاح مع توجيه مباشر
    RETURN jsonb_build_object(
      'success', true,
      'message', 'مرحباً بك، المدير العام',
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
        'is_temporary_qr', false,
        'landing_route', '/hq'
      ),
      'requires_pin', false,
      'landing_route', '/hq',
      'default_route', '/hq',
      'direct_access', true
    );
  END IF;

  -- ===== 2. المنطق العادي للموظفين الآخرين =====

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
      v_requires_pin := v_pack_record.requires_pin;
      v_landing_route := v_pack_record.landing_route;
    ELSE
      v_requires_pin := COALESCE(v_staff_record.requires_pin, false);
      v_landing_route := '/hq';
    END IF;
  ELSE
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
