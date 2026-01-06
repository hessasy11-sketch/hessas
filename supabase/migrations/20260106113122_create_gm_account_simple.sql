/*
  # GM Account Creation - Simple

  1. Changes
    - Create/Update GM account with phone + password placeholder
    - Use correct scope_type: 'GLOBAL'
    
  2. GM Credentials
    - Phone: 0500000001
    - Default Password: GM@2026 (will be set by Edge Function)
*/

-- Create or update GM account
DO $$
DECLARE
  v_gm_id uuid;
  v_staff_code text;
BEGIN
  -- Check if GM already exists
  SELECT id INTO v_gm_id
  FROM platform_staff
  WHERE phone_number = '0500000001'
    OR phone = '0500000001'
  LIMIT 1;

  IF v_gm_id IS NULL THEN
    -- Generate staff code
    v_staff_code := 'GM-0001';
    
    -- Create new GM account
    INSERT INTO platform_staff (
      full_name,
      role,
      phone_number,
      phone,
      department,
      primary_department,
      is_active,
      staff_code,
      password_hash,
      scope_type
    ) VALUES (
      'المدير العام',
      'super_admin',
      '0500000001',
      '0500000001',
      'executive',
      'executive',
      true,
      v_staff_code,
      '$2a$10$placeholder',
      'GLOBAL'
    )
    RETURNING id INTO v_gm_id;
    
    RAISE NOTICE 'Created GM account with ID: %', v_gm_id;
  ELSE
    -- Update existing GM account
    UPDATE platform_staff
    SET
      phone_number = '0500000001',
      phone = '0500000001',
      role = 'super_admin',
      is_active = true,
      password_hash = COALESCE(password_hash, '$2a$10$placeholder'),
      scope_type = 'GLOBAL',
      department = 'executive',
      primary_department = 'executive',
      full_name = COALESCE(full_name, 'المدير العام')
    WHERE id = v_gm_id;
    
    RAISE NOTICE 'Updated GM account with ID: %', v_gm_id;
  END IF;
  
END $$;

-- Create function to verify GM login credentials
CREATE OR REPLACE FUNCTION verify_gm_credentials(
  p_phone text
)
RETURNS TABLE (
  staff_id uuid,
  full_name text,
  role text,
  password_hash text,
  is_active boolean,
  scope_type text,
  staff_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.full_name,
    ps.role,
    ps.password_hash,
    ps.is_active,
    ps.scope_type,
    ps.staff_code
  FROM platform_staff ps
  WHERE (ps.phone_number = p_phone OR ps.phone = p_phone)
    AND ps.is_active = true
    AND ps.role IN ('super_admin', 'platform_owner')
  LIMIT 1;
END;
$$;

-- Create function to update password hash and record login
CREATE OR REPLACE FUNCTION update_gm_password_hash(
  p_staff_id uuid,
  p_password_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE platform_staff
  SET 
    password_hash = p_password_hash,
    last_login_at = now(),
    updated_at = now()
  WHERE id = p_staff_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_gm_credentials(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_gm_password_hash(uuid, text) TO anon, authenticated, service_role;

-- Create audit log table
CREATE TABLE IF NOT EXISTS gm_login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES platform_staff(id),
  phone_number text NOT NULL,
  login_status text NOT NULL CHECK (login_status IN ('success', 'failed', 'blocked')),
  ip_address text,
  user_agent text,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE gm_login_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can insert login logs"
ON gm_login_logs
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can read login logs"
ON gm_login_logs
FOR SELECT
TO service_role
USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS gm_login_logs_staff_id_idx ON gm_login_logs(staff_id);
CREATE INDEX IF NOT EXISTS gm_login_logs_created_at_idx ON gm_login_logs(created_at DESC);

-- Log final GM account status
DO $$
DECLARE
  v_gm_info RECORD;
BEGIN
  SELECT id, full_name, phone_number, staff_code, role, scope_type, is_active
  INTO v_gm_info
  FROM platform_staff
  WHERE phone_number = '0500000001' OR phone = '0500000001'
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'GM LOGIN CREDENTIALS:';
    RAISE NOTICE '  Phone: 0500000001';
    RAISE NOTICE '  Password: GM@2026';
    RAISE NOTICE '  Landing: /hq';
    RAISE NOTICE '';
    RAISE NOTICE 'Account Details:';
    RAISE NOTICE '  ID: %', v_gm_info.id;
    RAISE NOTICE '  Name: %', v_gm_info.full_name;
    RAISE NOTICE '  Code: %', v_gm_info.staff_code;
    RAISE NOTICE '  Role: %', v_gm_info.role;
    RAISE NOTICE '  Scope: %', v_gm_info.scope_type;
    RAISE NOTICE '  Active: %', v_gm_info.is_active;
    RAISE NOTICE '========================================';
  END IF;
END $$;
