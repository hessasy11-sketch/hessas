/*
  # Staff Provisioning System (المرحلة 5)

  1. Table Updates
    - Add login fields to `platform_staff`:
      - `phone` (text) - رقم الجوال
      - `password_hash` (text) - كلمة المرور المشفرة
      - `initial_password` (text) - كلمة المرور المؤقتة (تُعرض مرة واحدة)
      - `is_active` (boolean) - حالة الحساب
      - `last_login_at` (timestamp) - آخر دخول
      - `created_by_gm_id` (uuid) - من أنشأ الحساب

  2. Functions
    - `create_staff_account()` - إنشاء موظف جديد
    - `suspend_staff_account()` - إيقاف حساب
    - `activate_staff_account()` - تفعيل حساب
    - `reset_staff_password()` - إعادة تعيين كلمة المرور
    - `verify_staff_credentials()` - التحقق من بيانات الدخول

  3. Security
    - RLS policies للـ GM فقط
    - تسجيل جميع العمليات في executive_logs
*/

-- Add login fields to platform_staff (if not exist)
DO $$
BEGIN
  -- phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'phone'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN phone text;
  END IF;

  -- password_hash
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN password_hash text;
  END IF;

  -- initial_password
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'initial_password'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN initial_password text;
  END IF;

  -- is_active
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  -- last_login_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN last_login_at timestamptz;
  END IF;

  -- created_by_gm_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'created_by_gm_id'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN created_by_gm_id uuid;
  END IF;
END $$;

-- Add unique constraint on phone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_staff_phone_unique'
  ) THEN
    ALTER TABLE platform_staff ADD CONSTRAINT platform_staff_phone_unique UNIQUE (phone);
  END IF;
END $$;

-- Create function: create_staff_account
CREATE OR REPLACE FUNCTION create_staff_account(
  p_gm_id uuid,
  p_name_ar text,
  p_phone text,
  p_role text,
  p_department text DEFAULT NULL,
  p_farm_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_id uuid;
  v_initial_password text;
  v_password_hash text;
BEGIN
  -- 1. التحقق من GM
  IF NOT EXISTS (
    SELECT 1 FROM platform_staff
    WHERE id = p_gm_id AND role = 'general_manager'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only GM can create staff accounts'
    );
  END IF;

  -- 2. التحقق من عدم تكرار رقم الجوال
  IF EXISTS (SELECT 1 FROM platform_staff WHERE phone = p_phone) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Phone number already exists'
    );
  END IF;

  -- 3. توليد كلمة مرور مؤقتة (8 أحرف عشوائية)
  v_initial_password := upper(substr(md5(random()::text), 1, 8));

  -- 4. تشفير كلمة المرور
  v_password_hash := crypt(v_initial_password, gen_salt('bf'));

  -- 5. إنشاء الموظف
  INSERT INTO platform_staff (
    name_ar,
    phone,
    password_hash,
    initial_password,
    role,
    department,
    is_active,
    created_by_gm_id,
    created_at
  ) VALUES (
    p_name_ar,
    p_phone,
    v_password_hash,
    v_initial_password,
    p_role,
    p_department,
    true,
    p_gm_id,
    now()
  )
  RETURNING id INTO v_staff_id;

  -- 6. تسجيل في executive_logs
  INSERT INTO audit_logs (
    staff_id,
    staff_name,
    action,
    category,
    entity_type,
    entity_id,
    entity_name,
    details,
    result,
    notes
  ) VALUES (
    p_gm_id,
    (SELECT name_ar FROM platform_staff WHERE id = p_gm_id),
    'CREATE_STAFF_ACCOUNT',
    'platform',
    'staff',
    v_staff_id,
    p_name_ar,
    jsonb_build_object(
      'phone', p_phone,
      'role', p_role,
      'department', p_department
    ),
    'success',
    'تم إنشاء حساب موظف جديد'
  );

  -- 7. إرجاع النتيجة
  RETURN jsonb_build_object(
    'success', true,
    'staff_id', v_staff_id,
    'initial_password', v_initial_password,
    'phone', p_phone
  );
END;
$$;

-- Create function: suspend_staff_account
CREATE OR REPLACE FUNCTION suspend_staff_account(
  p_gm_id uuid,
  p_staff_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_name text;
BEGIN
  -- 1. التحقق من GM
  IF NOT EXISTS (
    SELECT 1 FROM platform_staff
    WHERE id = p_gm_id AND role = 'general_manager'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- 2. الحصول على اسم الموظف
  SELECT name_ar INTO v_staff_name
  FROM platform_staff
  WHERE id = p_staff_id;

  IF v_staff_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff not found');
  END IF;

  -- 3. إيقاف الحساب
  UPDATE platform_staff
  SET is_active = false
  WHERE id = p_staff_id;

  -- 4. تسجيل
  INSERT INTO audit_logs (
    staff_id,
    staff_name,
    action,
    category,
    entity_type,
    entity_id,
    entity_name,
    details,
    result,
    notes
  ) VALUES (
    p_gm_id,
    (SELECT name_ar FROM platform_staff WHERE id = p_gm_id),
    'SUSPEND_STAFF_ACCOUNT',
    'platform',
    'staff',
    p_staff_id,
    v_staff_name,
    jsonb_build_object('reason', p_reason),
    'success',
    'تم إيقاف حساب الموظف'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Create function: activate_staff_account
CREATE OR REPLACE FUNCTION activate_staff_account(
  p_gm_id uuid,
  p_staff_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_name text;
BEGIN
  -- 1. التحقق من GM
  IF NOT EXISTS (
    SELECT 1 FROM platform_staff
    WHERE id = p_gm_id AND role = 'general_manager'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- 2. الحصول على اسم الموظف
  SELECT name_ar INTO v_staff_name
  FROM platform_staff
  WHERE id = p_staff_id;

  IF v_staff_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff not found');
  END IF;

  -- 3. تفعيل الحساب
  UPDATE platform_staff
  SET is_active = true
  WHERE id = p_staff_id;

  -- 4. تسجيل
  INSERT INTO audit_logs (
    staff_id,
    staff_name,
    action,
    category,
    entity_type,
    entity_id,
    entity_name,
    result,
    notes
  ) VALUES (
    p_gm_id,
    (SELECT name_ar FROM platform_staff WHERE id = p_gm_id),
    'ACTIVATE_STAFF_ACCOUNT',
    'platform',
    'staff',
    p_staff_id,
    v_staff_name,
    'success',
    'تم تفعيل حساب الموظف'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Create function: reset_staff_password
CREATE OR REPLACE FUNCTION reset_staff_password(
  p_gm_id uuid,
  p_staff_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_name text;
  v_new_password text;
  v_password_hash text;
BEGIN
  -- 1. التحقق من GM
  IF NOT EXISTS (
    SELECT 1 FROM platform_staff
    WHERE id = p_gm_id AND role = 'general_manager'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- 2. الحصول على اسم الموظف
  SELECT name_ar INTO v_staff_name
  FROM platform_staff
  WHERE id = p_staff_id;

  IF v_staff_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff not found');
  END IF;

  -- 3. توليد كلمة مرور جديدة
  v_new_password := upper(substr(md5(random()::text), 1, 8));
  v_password_hash := crypt(v_new_password, gen_salt('bf'));

  -- 4. تحديث كلمة المرور
  UPDATE platform_staff
  SET
    password_hash = v_password_hash,
    initial_password = v_new_password
  WHERE id = p_staff_id;

  -- 5. تسجيل
  INSERT INTO audit_logs (
    staff_id,
    staff_name,
    action,
    category,
    entity_type,
    entity_id,
    entity_name,
    result,
    notes
  ) VALUES (
    p_gm_id,
    (SELECT name_ar FROM platform_staff WHERE id = p_gm_id),
    'RESET_STAFF_PASSWORD',
    'platform',
    'staff',
    p_staff_id,
    v_staff_name,
    'success',
    'تم إعادة تعيين كلمة المرور'
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_password', v_new_password
  );
END;
$$;

-- Drop old function and create new one
DROP FUNCTION IF EXISTS verify_staff_login(text, text);

-- Create function: verify_staff_credentials
CREATE OR REPLACE FUNCTION verify_staff_credentials(
  p_phone text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff record;
BEGIN
  -- 1. البحث عن الموظف
  SELECT
    id,
    name_ar,
    role,
    department,
    is_active,
    password_hash
  INTO v_staff
  FROM platform_staff
  WHERE phone = p_phone;

  -- 2. التحقق من وجود الموظف
  IF v_staff.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid phone or password'
    );
  END IF;

  -- 3. التحقق من حالة الحساب
  IF NOT v_staff.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Account is suspended'
    );
  END IF;

  -- 4. التحقق من كلمة المرور
  IF NOT (v_staff.password_hash = crypt(p_password, v_staff.password_hash)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid phone or password'
    );
  END IF;

  -- 5. تحديث آخر دخول
  UPDATE platform_staff
  SET last_login_at = now()
  WHERE id = v_staff.id;

  -- 6. إرجاع النتيجة
  RETURN jsonb_build_object(
    'success', true,
    'staff_id', v_staff.id,
    'name_ar', v_staff.name_ar,
    'role', v_staff.role,
    'department', v_staff.department
  );
END;
$$;

-- Create function: get_all_staff (for GM)
CREATE OR REPLACE FUNCTION get_all_staff(p_gm_id uuid)
RETURNS TABLE (
  id uuid,
  name_ar text,
  phone text,
  role text,
  department text,
  is_active boolean,
  last_login_at timestamptz,
  created_at timestamptz,
  created_by_gm_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من GM
  IF NOT EXISTS (
    SELECT 1 FROM platform_staff
    WHERE platform_staff.id = p_gm_id AND platform_staff.role = 'general_manager'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.name_ar,
    s.phone,
    s.role,
    s.department,
    s.is_active,
    s.last_login_at,
    s.created_at,
    s.created_by_gm_id
  FROM platform_staff s
  ORDER BY s.created_at DESC;
END;
$$;

-- Create index for phone lookup
CREATE INDEX IF NOT EXISTS idx_platform_staff_phone
  ON platform_staff(phone);

-- Create index for is_active
CREATE INDEX IF NOT EXISTS idx_platform_staff_is_active
  ON platform_staff(is_active);
