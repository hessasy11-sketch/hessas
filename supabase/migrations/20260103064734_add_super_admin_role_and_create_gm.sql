/*
  # إضافة super_admin وإنشاء المدير العام

  1. Updates
    - إضافة 'platform_owner' و 'super_admin' إلى platform_staff role
    - إضافة حقول is_temporary_qr و temporary_qr_created_at
    
  2. Data
    - إنشاء حساب المدير العام مع باركود مؤقت
    
  3. Functions
    - replace_temporary_qr()
    - check_temporary_qr_status()
*/

-- تحديث constraint لإضافة platform_owner و super_admin
ALTER TABLE platform_staff DROP CONSTRAINT IF EXISTS platform_staff_role_check;

ALTER TABLE platform_staff
  ADD CONSTRAINT platform_staff_role_check
  CHECK (role = ANY (ARRAY[
    'platform_owner'::text,
    'super_admin'::text,
    'manager'::text,
    'supervisor'::text,
    'agent'::text,
    'finance'::text,
    'operations'::text,
    'support'::text
  ]));

-- إضافة حقول الباركود المؤقت
ALTER TABLE platform_staff
  ADD COLUMN IF NOT EXISTS is_temporary_qr boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS temporary_qr_created_at timestamptz;

-- إنشاء المدير العام
DO $$
DECLARE
  v_gm_profile_id uuid;
  v_gm_staff_id uuid;
  v_temp_token text;
  v_temp_pin text;
BEGIN
  v_gm_profile_id := gen_random_uuid();
  
  INSERT INTO profiles (
    id,
    phone_number,
    display_name,
    user_type,
    created_at
  ) VALUES (
    v_gm_profile_id,
    '0500000001',
    'المدير العام',
    'general_manager',
    now()
  )
  ON CONFLICT (phone_number) DO UPDATE
  SET 
    display_name = 'المدير العام',
    user_type = 'general_manager'
  RETURNING id INTO v_gm_profile_id;

  INSERT INTO platform_staff (
    user_id,
    role,
    department,
    job_title,
    is_active,
    requires_pin,
    qr_is_active,
    created_at
  ) VALUES (
    v_gm_profile_id,
    'super_admin',
    'HQ',
    'المدير العام',
    true,
    true,
    true,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    role = 'super_admin',
    is_active = true,
    requires_pin = true
  RETURNING id INTO v_gm_staff_id;

  v_temp_token := encode(gen_random_bytes(32), 'base64');
  v_temp_token := 'TEMP_GM_' || replace(v_temp_token, '/', '_');
  v_temp_token := replace(v_temp_token, '+', '-');
  v_temp_pin := '123456';

  UPDATE platform_staff
  SET
    qr_token = v_temp_token,
    qr_is_active = true,
    qr_generated_at = now(),
    is_temporary_qr = true,
    temporary_qr_created_at = now(),
    pin_code = crypt(v_temp_pin, gen_salt('bf')),
    requires_pin = true
  WHERE id = v_gm_staff_id;

  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ تم إنشاء حساب المدير العام بنجاح';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE 'رقم الهاتف: 0500000001';
  RAISE NOTICE 'PIN المؤقت: %', v_temp_pin;
  RAISE NOTICE 'QR Token: %', v_temp_token;
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '⚠️  يرجى حفظ هذه البيانات في مكان آمن';
  RAISE NOTICE '⚠️  سيظهر تنبيه بعد الدخول لاستبدال الباركود المؤقت';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

-- دالة استبدال الباركود المؤقت
CREATE OR REPLACE FUNCTION replace_temporary_qr()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_id uuid;
  v_new_token text;
  v_old_token text;
BEGIN
  SELECT id, qr_token INTO v_staff_id, v_old_token
  FROM platform_staff
  WHERE user_id = auth.uid()
  AND is_temporary_qr = true;

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا يوجد باركود مؤقت للاستبدال'
    );
  END IF;

  v_new_token := encode(gen_random_bytes(32), 'base64');
  v_new_token := 'STAFF_' || replace(v_new_token, '/', '_');
  v_new_token := replace(v_new_token, '+', '-');

  UPDATE platform_staff
  SET
    qr_token = v_new_token,
    qr_is_active = true,
    qr_generated_at = now(),
    is_temporary_qr = false,
    temporary_qr_created_at = NULL
  WHERE id = v_staff_id;

  PERFORM log_admin_operation(
    v_staff_id,
    v_staff_id,
    'generate_qr',
    jsonb_build_object(
      'action', 'replace_temporary_qr',
      'old_token_prefix', substring(v_old_token, 1, 20),
      'new_token_prefix', substring(v_new_token, 1, 20)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم استبدال الباركود المؤقت بنجاح',
    'qr_token', v_new_token,
    'generated_at', now()
  );
END;
$$;

-- دالة التحقق من حالة الباركود المؤقت
CREATE OR REPLACE FUNCTION check_temporary_qr_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'has_temporary_qr', is_temporary_qr,
    'created_at', temporary_qr_created_at,
    'job_title', job_title,
    'role', role,
    'staff_id', id,
    'qr_token', qr_token
  ) INTO v_result
  FROM platform_staff
  WHERE user_id = auth.uid()
  AND is_temporary_qr = true;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('has_temporary_qr', false);
  END IF;

  RETURN v_result;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION replace_temporary_qr TO authenticated;
GRANT EXECUTE ON FUNCTION check_temporary_qr_status TO authenticated;

-- Index
CREATE INDEX IF NOT EXISTS idx_platform_staff_is_temporary_qr 
  ON platform_staff(is_temporary_qr) 
  WHERE is_temporary_qr = true;
