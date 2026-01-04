/*
  # إصلاح دالة create_staff_session - معالجة audit_log

  ## المشكلة
  - performed_by في audit_logs يتطلب profile_id
  - الموظفون قد لا يكون لديهم user_id/profile_id
  
  ## الحل
  - تسجيل audit log فقط إذا كان للموظف user_id
  - أو جعل performed_by nullable في حالة الموظفين
*/

-- تحديث دالة create_staff_session
CREATE OR REPLACE FUNCTION create_staff_session(
  p_staff_id uuid,
  p_login_method text,
  p_landing_route text DEFAULT '/hq',
  p_device_info jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_session_token text;
  v_staff_name text;
  v_staff_role text;
  v_user_id uuid;
BEGIN
  -- جلب معلومات الموظف
  SELECT full_name, role, user_id INTO v_staff_name, v_staff_role, v_user_id
  FROM platform_staff
  WHERE id = p_staff_id
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الموظف غير موجود أو غير نشط'
    );
  END IF;

  -- إنهاء أي جلسات نشطة سابقة لنفس الموظف
  UPDATE platform_staff_sessions
  SET 
    is_active = false,
    ended_at = now(),
    updated_at = now()
  WHERE staff_id = p_staff_id
  AND is_active = true;

  -- إنشاء جلسة جديدة
  INSERT INTO platform_staff_sessions (
    staff_id,
    login_method,
    landing_route,
    device_info,
    ip_address,
    user_agent
  ) VALUES (
    p_staff_id,
    p_login_method,
    p_landing_route,
    p_device_info,
    p_ip_address,
    p_user_agent
  )
  RETURNING id, session_token INTO v_session_id, v_session_token;

  -- تسجيل في audit log فقط إذا كان للموظف user_id
  IF v_user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO platform_audit_logs (
        action_type,
        target_type,
        target_id,
        performed_by,
        metadata
      ) VALUES (
        'login',
        'platform_staff_sessions',
        v_session_id,
        v_user_id,
        jsonb_build_object(
          'staff_id', p_staff_id,
          'staff_name', v_staff_name,
          'staff_role', v_staff_role,
          'login_method', p_login_method,
          'landing_route', p_landing_route,
          'session_token', v_session_token
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- تجاهل خطأ audit log
      RAISE NOTICE 'تحذير: فشل تسجيل audit log: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم إنشاء الجلسة بنجاح',
    'session_id', v_session_id,
    'session_token', v_session_token,
    'landing_route', p_landing_route
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'حدث خطأ أثناء إنشاء الجلسة: ' || SQLERRM
  );
END;
$$;

-- تحديث دالة end_staff_session
CREATE OR REPLACE FUNCTION end_staff_session(
  p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_staff_id uuid;
  v_user_id uuid;
BEGIN
  -- جلب معلومات الجلسة
  SELECT s.id, s.staff_id, p.user_id INTO v_session_id, v_staff_id, v_user_id
  FROM platform_staff_sessions s
  LEFT JOIN platform_staff p ON p.id = s.staff_id
  WHERE s.session_token = p_session_token
  AND s.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الجلسة غير موجودة أو منتهية'
    );
  END IF;

  -- إنهاء الجلسة
  UPDATE platform_staff_sessions
  SET 
    is_active = false,
    ended_at = now(),
    updated_at = now()
  WHERE id = v_session_id;

  -- تسجيل في audit log فقط إذا كان للموظف user_id
  IF v_user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO platform_audit_logs (
        action_type,
        target_type,
        target_id,
        performed_by,
        metadata
      ) VALUES (
        'logout',
        'platform_staff_sessions',
        v_session_id,
        v_user_id,
        jsonb_build_object(
          'staff_id', v_staff_id,
          'session_token', p_session_token,
          'ended_at', now()
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- تجاهل خطأ audit log
      RAISE NOTICE 'تحذير: فشل تسجيل audit log: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم إنهاء الجلسة بنجاح'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'حدث خطأ أثناء إنهاء الجلسة: ' || SQLERRM
  );
END;
$$;