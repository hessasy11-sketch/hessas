/*
  # إضافة نظام PIN الاختياري للموظفين

  1. Changes to platform_staff table
    - Add `requires_pin` (boolean) - هل يتطلب PIN للدخول
    - Add `pin_code` (text) - رمز PIN المشفر (4 أرقام)
    - Add `pin_attempts` (integer) - عدد المحاولات الفاشلة
    - Add `pin_locked_until` (timestamptz) - تاريخ القفل (إن وجد)
    - Add `pin_last_verified_at` (timestamptz) - آخر تحقق ناجح

  2. New Functions
    - `set_staff_pin()` - تعيين PIN للموظف
    - `verify_staff_pin()` - التحقق من PIN
    - `reset_pin_attempts()` - إعادة تعيين المحاولات

  3. Security
    - PIN مشفر باستخدام pgcrypto
    - قفل تلقائي بعد 3 محاولات فاشلة
    - تسجيل في Audit Log
*/

-- إضافة حقول PIN إلى platform_staff
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_staff' AND column_name = 'requires_pin'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN requires_pin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_staff' AND column_name = 'pin_code'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN pin_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_staff' AND column_name = 'pin_attempts'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN pin_attempts integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_staff' AND column_name = 'pin_locked_until'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN pin_locked_until timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_staff' AND column_name = 'pin_last_verified_at'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN pin_last_verified_at timestamptz;
  END IF;
END $$;

-- إنشاء indexes
CREATE INDEX IF NOT EXISTS idx_platform_staff_requires_pin ON platform_staff(requires_pin);
CREATE INDEX IF NOT EXISTS idx_platform_staff_pin_locked ON platform_staff(pin_locked_until);

-- دالة لتعيين PIN للموظف
CREATE OR REPLACE FUNCTION set_staff_pin(
  p_staff_id uuid,
  p_pin_code text,
  p_requires_pin boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff platform_staff;
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_pin_code !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  SELECT * INTO v_staff FROM platform_staff WHERE id = p_staff_id;
  
  IF v_staff IS NULL THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;

  UPDATE platform_staff 
  SET 
    pin_code = crypt(p_pin_code, gen_salt('bf', 8)),
    requires_pin = p_requires_pin,
    pin_attempts = 0,
    pin_locked_until = NULL,
    updated_at = now()
  WHERE id = p_staff_id;

  PERFORM log_platform_action(
    'update_staff',
    'staff',
    p_staff_id,
    jsonb_build_object(
      'action', 'pin_set',
      'requires_pin', p_requires_pin
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'staff_id', p_staff_id,
    'requires_pin', p_requires_pin,
    'message', 'تم تعيين PIN بنجاح'
  );
END;
$$;

-- دالة للتحقق من PIN
CREATE OR REPLACE FUNCTION verify_staff_pin(
  p_staff_id uuid,
  p_pin_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff platform_staff;
  v_is_locked boolean;
  v_pin_valid boolean;
BEGIN
  SELECT * INTO v_staff FROM platform_staff WHERE id = p_staff_id;
  
  IF v_staff IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'موظف غير موجود',
      'reason', 'staff_not_found'
    );
  END IF;

  IF v_staff.pin_code IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لم يتم تعيين PIN',
      'reason', 'no_pin_set'
    );
  END IF;

  v_is_locked := v_staff.pin_locked_until IS NOT NULL 
                 AND v_staff.pin_locked_until > now();

  IF v_is_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'PIN مقفل مؤقتاً',
      'reason', 'pin_locked',
      'locked_until', v_staff.pin_locked_until,
      'attempts_remaining', 0
    );
  END IF;

  v_pin_valid := v_staff.pin_code = crypt(p_pin_code, v_staff.pin_code);

  IF v_pin_valid THEN
    UPDATE platform_staff 
    SET 
      pin_attempts = 0,
      pin_last_verified_at = now(),
      pin_locked_until = NULL
    WHERE id = p_staff_id;

    PERFORM log_platform_action(
      'update_staff',
      'staff',
      p_staff_id,
      jsonb_build_object('action', 'pin_verified_success')
    );

    RETURN jsonb_build_object(
      'success', true,
      'message', 'تم التحقق بنجاح',
      'staff_id', p_staff_id
    );
  ELSE
    UPDATE platform_staff 
    SET 
      pin_attempts = pin_attempts + 1,
      pin_locked_until = CASE 
        WHEN pin_attempts + 1 >= 3 THEN now() + INTERVAL '30 minutes'
        ELSE NULL
      END
    WHERE id = p_staff_id
    RETURNING pin_attempts, pin_locked_until INTO v_staff.pin_attempts, v_staff.pin_locked_until;

    PERFORM log_platform_action(
      'update_staff',
      'staff',
      p_staff_id,
      jsonb_build_object(
        'action', 'pin_verification_failed',
        'attempts', v_staff.pin_attempts
      )
    );

    IF v_staff.pin_attempts >= 3 THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'تم قفل PIN لمدة 30 دقيقة',
        'reason', 'pin_locked',
        'locked_until', v_staff.pin_locked_until,
        'attempts_remaining', 0
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'message', 'PIN غير صحيح',
        'reason', 'invalid_pin',
        'attempts_remaining', 3 - v_staff.pin_attempts
      );
    END IF;
  END IF;
END;
$$;

-- دالة لإعادة تعيين محاولات PIN
CREATE OR REPLACE FUNCTION reset_pin_attempts(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE platform_staff 
  SET 
    pin_attempts = 0,
    pin_locked_until = NULL,
    updated_at = now()
  WHERE id = p_staff_id;

  PERFORM log_platform_action(
    'update_staff',
    'staff',
    p_staff_id,
    jsonb_build_object('action', 'pin_attempts_reset')
  );

  RETURN jsonb_build_object(
    'success', true,
    'staff_id', p_staff_id,
    'message', 'تم إعادة تعيين المحاولات'
  );
END;
$$;

-- دالة لإزالة PIN من موظف
CREATE OR REPLACE FUNCTION remove_staff_pin(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE platform_staff 
  SET 
    pin_code = NULL,
    requires_pin = false,
    pin_attempts = 0,
    pin_locked_until = NULL,
    updated_at = now()
  WHERE id = p_staff_id;

  PERFORM log_platform_action(
    'update_staff',
    'staff',
    p_staff_id,
    jsonb_build_object('action', 'pin_removed')
  );

  RETURN jsonb_build_object(
    'success', true,
    'staff_id', p_staff_id,
    'message', 'تم إزالة PIN'
  );
END;
$$;

-- تحديث دالة verify_qr_access لترجع requires_pin
CREATE OR REPLACE FUNCTION verify_qr_access(p_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff platform_staff;
  v_profile profiles;
  v_role roles_catalog;
BEGIN
  SELECT ps.* INTO v_staff 
  FROM platform_staff ps
  WHERE ps.qr_token = p_qr_token;

  IF v_staff IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'invalid_token'
    );
  END IF;

  IF v_staff.is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'staff_inactive'
    );
  END IF;

  IF v_staff.qr_is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'qr_inactive'
    );
  END IF;

  IF v_staff.role IS NULL OR v_staff.role = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'no_role'
    );
  END IF;

  IF v_staff.department IS NULL OR v_staff.department = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا تملك صلاحية دخول',
      'reason', 'no_department'
    );
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_staff.user_id;

  IF v_staff.role_id IS NOT NULL THEN
    SELECT * INTO v_role FROM roles_catalog WHERE id = v_staff.role_id;
  END IF;

  UPDATE platform_staff 
  SET qr_last_scanned_at = now()
  WHERE id = v_staff.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'مرحباً بك',
    'requires_pin', COALESCE(v_staff.requires_pin, false),
    'staff', jsonb_build_object(
      'id', v_staff.id,
      'user_id', v_staff.user_id,
      'full_name', COALESCE(v_profile.display_name, 'موظف'),
      'phone', v_profile.phone_number,
      'role', v_staff.role,
      'role_title', COALESCE(v_role.role_name, v_staff.job_title),
      'department', v_staff.department,
      'permissions', COALESCE(v_role.permissions, '{}'::jsonb),
      'scope_farms', v_staff.scope_farms
    )
  );
END;
$$;

-- منح صلاحيات للدالات
GRANT EXECUTE ON FUNCTION set_staff_pin(uuid, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION verify_staff_pin(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reset_pin_attempts(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION remove_staff_pin(uuid) TO authenticated, service_role;
