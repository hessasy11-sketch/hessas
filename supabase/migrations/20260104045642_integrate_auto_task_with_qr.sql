/*
  # ربط توليد المهام التلقائي مع QR
  
  تحديث دالة verify_qr_access لتوليد مهمة تلقائياً عند الدخول
*/

CREATE OR REPLACE FUNCTION verify_qr_access(p_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_record RECORD;
  v_qr_record RECORD;
  v_device_id text;
  v_session_id uuid;
  v_target_route text;
  v_permission_pack jsonb;
  v_auto_task_id uuid;
BEGIN
  SELECT * INTO v_qr_record
  FROM platform_qr_access
  WHERE qr_code = p_qr_token
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رمز QR غير صالح أو منتهي الصلاحية',
      'reason', 'invalid_qr'
    );
  END IF;

  IF v_qr_record.expires_at IS NOT NULL AND v_qr_record.expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رمز QR منتهي الصلاحية',
      'reason', 'expired'
    );
  END IF;

  SELECT ps.*, pp.permissions as permission_pack
  INTO v_staff_record
  FROM platform_staff ps
  LEFT JOIN permission_packs pp ON pp.id = ps.permission_pack_id
  WHERE ps.id = v_qr_record.staff_id
  AND ps.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الموظف غير مفعل',
      'reason', 'inactive_staff'
    );
  END IF;

  UPDATE platform_qr_access
  SET 
    last_used_at = now(),
    usage_count = usage_count + 1
  WHERE qr_code = p_qr_token;

  v_session_id := gen_random_uuid();
  v_device_id := 'qr-' || substr(md5(random()::text), 1, 10);

  INSERT INTO platform_sessions (
    id,
    staff_id,
    device_id,
    login_method,
    last_activity
  ) VALUES (
    v_session_id,
    v_staff_record.id,
    v_device_id,
    'qr_code',
    now()
  );

  CASE 
    WHEN v_staff_record.role = 'super_admin' THEN
      v_target_route := '/hq';
    WHEN v_staff_record.role = 'admin' THEN
      v_target_route := '/hq';
    WHEN v_staff_record.role = 'manager' THEN
      v_target_route := '/platform';
    ELSE
      v_target_route := '/staff-dashboard';
  END CASE;

  -- توليد مهمة تلقائياً عند الدخول
  BEGIN
    v_auto_task_id := auto_generate_task_on_qr_scan(
      v_staff_record.id,
      p_qr_token
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_auto_task_id := NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم التحقق بنجاح',
    'staff', jsonb_build_object(
      'id', v_staff_record.id,
      'full_name', v_staff_record.full_name,
      'role', v_staff_record.role,
      'department', v_staff_record.department,
      'permissions', COALESCE(v_staff_record.permission_pack, '{}'::jsonb)
    ),
    'target_route', v_target_route,
    'session_id', v_session_id,
    'auto_task_created', CASE WHEN v_auto_task_id IS NOT NULL THEN true ELSE false END
  );
END;
$$;
