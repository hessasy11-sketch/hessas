/*
  # ربط الموظفين بحزم الصلاحيات المناسبة

  1. التعديلات
    - ربط مديري المزارع بحزمة "مدير مزرعة"
    - ربط المشرفين بحزمة مناسبة
    - تعديل verify_qr_access لاستخدام المسار من الحزمة أو حسب الدور

  2. المسارات
    - super_admin → /hq
    - manager → /admin/b2f
    - supervisor → /admin/b2f
    - accountant → /admin/b2f
*/

-- الحصول على ID حزمة مدير مزرعة
DO $$
DECLARE
  v_farm_manager_pack_id uuid;
BEGIN
  -- الحصول على ID حزمة مدير مزرعة
  SELECT id INTO v_farm_manager_pack_id
  FROM permission_packs
  WHERE name = 'مدير مزرعة '
  LIMIT 1;

  -- ربط جميع المديرين بحزمة مدير المزرعة
  UPDATE platform_staff
  SET pack_id = v_farm_manager_pack_id
  WHERE role = 'manager'
  AND pack_id IS NULL;

  -- ربط المشرفين بحزمة مدير المزرعة أيضاً
  UPDATE platform_staff
  SET pack_id = v_farm_manager_pack_id
  WHERE role = 'supervisor'
  AND pack_id IS NULL;

  RAISE NOTICE 'تم ربط الموظفين بحزمة مدير المزرعة: %', v_farm_manager_pack_id;
END $$;

-- تحديث verify_qr_access لاستخدام مسار افتراضي حسب الدور
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
      WHEN 'admin' THEN '/hq'
      WHEN 'manager' THEN '/admin/b2f'
      WHEN 'supervisor' THEN '/admin/b2f'
      WHEN 'accountant' THEN '/admin/b2f'
      WHEN 'staff' THEN '/admin/b2f'
      ELSE '/hq'
    END;
  END IF;

  -- تحديث آخر مسح للـ QR
  UPDATE platform_staff
  SET qr_last_scanned_at = now()
  WHERE id = v_staff_record.id;

  -- بناء النتيجة
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
    'default_route', v_landing_route
  );

  RETURN v_result;
END;
$$;
