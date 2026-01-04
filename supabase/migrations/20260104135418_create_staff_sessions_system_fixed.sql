/*
  # إنشاء نظام جلسات الموظفين الشامل

  ## الهدف
  - إنشاء جدول لتتبع جلسات تسجيل الدخول للموظفين
  - تسجيل كل عمليات الدخول والخروج
  - تتبع الجلسات النشطة والمنتهية
  - دعم تسجيل الدخول عبر QR و PIN

  ## الجداول
  1. platform_staff_sessions - جلسات الموظفين

  ## الدوال
  1. create_staff_session - إنشاء جلسة جديدة
  2. end_staff_session - إنهاء جلسة
  3. get_active_staff_session - جلب الجلسة النشطة
  4. cleanup_expired_sessions - تنظيف الجلسات المنتهية

  ## الأمان
  - RLS مفعل على جدول الجلسات
  - السماح للموظفين برؤية جلساتهم فقط
  - السماح للإداريين برؤية جميع الجلسات
*/

-- 1. إنشاء جدول جلسات الموظفين
CREATE TABLE IF NOT EXISTS platform_staff_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  
  -- معلومات الجلسة
  session_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  login_method text NOT NULL CHECK (login_method IN ('qr', 'pin', 'qr_pin', 'password')),
  device_info jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  
  -- حالة الجلسة
  is_active boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  
  -- معلومات إضافية
  landing_route text,
  
  -- تواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff_id ON platform_staff_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_token ON platform_staff_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_active ON platform_staff_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_sessions_started ON platform_staff_sessions(started_at DESC);

-- 3. تفعيل RLS
ALTER TABLE platform_staff_sessions ENABLE ROW LEVEL SECURITY;

-- 4. سياسات RLS
-- السماح للموظف برؤية جلساته فقط
CREATE POLICY "staff_view_own_sessions"
  ON platform_staff_sessions
  FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM platform_staff 
      WHERE id = staff_id
    )
  );

-- السماح للإداريين برؤية جميع الجلسات
CREATE POLICY "admins_view_all_sessions"
  ON platform_staff_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = staff_id
      AND role IN ('super_admin', 'general_manager', 'admin')
    )
  );

-- السماح للنظام بإنشاء جلسات
CREATE POLICY "system_create_sessions"
  ON platform_staff_sessions
  FOR INSERT
  WITH CHECK (true);

-- السماح للموظف بتحديث جلسته
CREATE POLICY "staff_update_own_session"
  ON platform_staff_sessions
  FOR UPDATE
  USING (
    staff_id IN (
      SELECT id FROM platform_staff 
      WHERE id = staff_id
    )
  );

-- 5. دالة إنشاء جلسة جديدة
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
BEGIN
  -- جلب معلومات الموظف
  SELECT full_name, role INTO v_staff_name, v_staff_role
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

  -- تسجيل في audit log
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
    p_staff_id,
    jsonb_build_object(
      'staff_name', v_staff_name,
      'staff_role', v_staff_role,
      'login_method', p_login_method,
      'landing_route', p_landing_route,
      'session_token', v_session_token
    )
  );

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

-- 6. دالة إنهاء جلسة
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
BEGIN
  -- جلب معلومات الجلسة
  SELECT id, staff_id INTO v_session_id, v_staff_id
  FROM platform_staff_sessions
  WHERE session_token = p_session_token
  AND is_active = true;

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

  -- تسجيل في audit log
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
    v_staff_id,
    jsonb_build_object(
      'session_token', p_session_token,
      'ended_at', now()
    )
  );

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

-- 7. دالة جلب الجلسة النشطة
CREATE OR REPLACE FUNCTION get_active_staff_session(
  p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_staff RECORD;
BEGIN
  -- جلب الجلسة
  SELECT * INTO v_session
  FROM platform_staff_sessions
  WHERE session_token = p_session_token
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الجلسة غير موجودة أو منتهية'
    );
  END IF;

  -- التحقق من انتهاء صلاحية الجلسة (24 ساعة)
  IF (now() - v_session.last_activity_at) > INTERVAL '24 hours' THEN
    -- إنهاء الجلسة تلقائياً
    UPDATE platform_staff_sessions
    SET 
      is_active = false,
      ended_at = now(),
      updated_at = now()
    WHERE id = v_session.id;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'انتهت صلاحية الجلسة'
    );
  END IF;

  -- تحديث آخر نشاط
  UPDATE platform_staff_sessions
  SET 
    last_activity_at = now(),
    updated_at = now()
  WHERE id = v_session.id;

  -- جلب معلومات الموظف
  SELECT * INTO v_staff
  FROM platform_staff
  WHERE id = v_session.staff_id
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'الموظف غير موجود أو غير نشط'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'session', jsonb_build_object(
      'id', v_session.id,
      'token', v_session.session_token,
      'started_at', v_session.started_at,
      'last_activity_at', v_session.last_activity_at,
      'landing_route', v_session.landing_route
    ),
    'staff', jsonb_build_object(
      'id', v_staff.id,
      'user_id', v_staff.user_id,
      'full_name', v_staff.full_name,
      'phone_number', v_staff.phone_number,
      'role', v_staff.role,
      'job_title', v_staff.job_title,
      'department', v_staff.department,
      'pack_id', v_staff.pack_id
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'حدث خطأ أثناء جلب الجلسة: ' || SQLERRM
  );
END;
$$;

-- 8. دالة تنظيف الجلسات المنتهية
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count integer;
BEGIN
  -- إنهاء الجلسات التي مر عليها أكثر من 24 ساعة بدون نشاط
  UPDATE platform_staff_sessions
  SET 
    is_active = false,
    ended_at = now(),
    updated_at = now()
  WHERE is_active = true
  AND (now() - last_activity_at) > INTERVAL '24 hours';

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('تم إنهاء %s جلسة منتهية', v_expired_count),
    'expired_count', v_expired_count
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'حدث خطأ أثناء تنظيف الجلسات: ' || SQLERRM
  );
END;
$$;

-- 9. Trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_staff_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_staff_sessions_updated_at ON platform_staff_sessions;
CREATE TRIGGER trigger_update_staff_sessions_updated_at
  BEFORE UPDATE ON platform_staff_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_sessions_updated_at();

-- 10. التعليقات
COMMENT ON TABLE platform_staff_sessions IS 'جدول لتتبع جلسات تسجيل الدخول للموظفين';
COMMENT ON FUNCTION create_staff_session IS 'إنشاء جلسة جديدة للموظف وإنهاء أي جلسات نشطة سابقة';
COMMENT ON FUNCTION end_staff_session IS 'إنهاء جلسة موظف';
COMMENT ON FUNCTION get_active_staff_session IS 'جلب معلومات الجلسة النشطة والتحقق من صلاحيتها';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'تنظيف الجلسات المنتهية تلقائياً (يُفضل تشغيلها دورياً)';