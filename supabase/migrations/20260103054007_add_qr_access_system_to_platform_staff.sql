/*
  # إضافة نظام QR للتحقق من دخول الموظفين

  1. Changes to platform_staff table
    - Add `qr_token` (text, unique) - رمز QR فريد لكل موظف
    - Add `qr_is_active` (boolean) - حالة تفعيل/إيقاف البركود
    - Add `qr_generated_at` (timestamptz) - تاريخ توليد البركود
    - Add `qr_last_scanned_at` (timestamptz) - آخر مرة تم مسح البركود

  2. New Functions
    - `generate_staff_qr_token()` - توليد QR Token جديد للموظف
    - `verify_qr_access()` - التحقق من صلاحية دخول الموظف عبر QR

  3. Security
    - Only platform admins can generate QR tokens
    - QR verification is available to service role
*/

-- إضافة حقول QR إلى platform_staff
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_staff' AND column_name = 'qr_token'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN qr_token text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_staff' AND column_name = 'qr_is_active'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN qr_is_active boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_staff' AND column_name = 'qr_generated_at'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN qr_generated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_staff' AND column_name = 'qr_last_scanned_at'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN qr_last_scanned_at timestamptz;
  END IF;
END $$;

-- إنشاء index لـ qr_token للبحث السريع
CREATE INDEX IF NOT EXISTS idx_platform_staff_qr_token ON platform_staff(qr_token);
CREATE INDEX IF NOT EXISTS idx_platform_staff_qr_active ON platform_staff(qr_is_active);

-- دالة توليد QR Token جديد للموظف
CREATE OR REPLACE FUNCTION generate_staff_qr_token(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token text;
  v_staff platform_staff;
  v_profile profiles;
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_staff FROM platform_staff WHERE id = p_staff_id;
  
  IF v_staff IS NULL THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_staff.user_id;

  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '+', ''), '/', ''), '=', '');

  UPDATE platform_staff 
  SET 
    qr_token = v_token,
    qr_is_active = true,
    qr_generated_at = now(),
    updated_at = now()
  WHERE id = p_staff_id;

  PERFORM log_platform_action(
    'create_staff',
    'staff',
    p_staff_id,
    jsonb_build_object('action', 'qr_token_generated')
  );

  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'staff_id', p_staff_id,
    'staff_name', v_profile.display_name,
    'generated_at', now()
  );
END;
$$;

-- دالة التحقق من صلاحية الدخول عبر QR
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

-- دالة لإيقاف/تفعيل QR للموظف
CREATE OR REPLACE FUNCTION toggle_staff_qr_status(
  p_staff_id uuid,
  p_is_active boolean
)
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
    qr_is_active = p_is_active,
    updated_at = now()
  WHERE id = p_staff_id;

  PERFORM log_platform_action(
    CASE WHEN p_is_active THEN 'activate_staff' ELSE 'deactivate_staff' END,
    'staff',
    p_staff_id,
    jsonb_build_object('qr_status', p_is_active)
  );

  RETURN jsonb_build_object(
    'success', true,
    'staff_id', p_staff_id,
    'qr_is_active', p_is_active
  );
END;
$$;

-- منح صلاحيات للدالات
GRANT EXECUTE ON FUNCTION generate_staff_qr_token(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION verify_qr_access(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION toggle_staff_qr_status(uuid, boolean) TO authenticated, service_role;
