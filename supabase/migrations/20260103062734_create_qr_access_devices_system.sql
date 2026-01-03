/*
  # نظام الأجهزة المعروفة لدخول الموظفين

  1. New Tables
    - `staff_access_devices` - تتبع الأجهزة المستخدمة لكل موظف
      - `id` (uuid, primary key)
      - `staff_id` (uuid, foreign key → platform_staff)
      - `device_fingerprint` (text) - بصمة الجهاز
      - `device_type` (text) - نوع الجهاز (mobile/desktop)
      - `device_info` (jsonb) - معلومات الجهاز
      - `access_method` (text) - طريقة الدخول (camera_scan/image_upload)
      - `first_access_at` (timestamptz) - أول دخول من هذا الجهاز
      - `last_access_at` (timestamptz) - آخر دخول
      - `access_count` (integer) - عدد مرات الدخول
      - `is_trusted` (boolean) - هل الجهاز موثوق
      - `created_at` (timestamptz)

    - `staff_access_log` - سجل كامل لكل دخول
      - `id` (uuid, primary key)
      - `staff_id` (uuid)
      - `device_id` (uuid, nullable) - إذا كان جهاز معروف
      - `device_fingerprint` (text)
      - `access_method` (text)
      - `is_new_device` (boolean) - هل هذا جهاز جديد
      - `requires_pin` (boolean)
      - `pin_verified` (boolean)
      - `success` (boolean)
      - `ip_address` (text)
      - `user_agent` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Only platform staff with proper role can view
    - Admin/Super Admin full access

  3. Functions
    - `register_device_access()` - تسجيل دخول من جهاز
    - `get_staff_devices()` - جلب أجهزة الموظف
    - `trust_device()` - تعيين جهاز كموثوق
    - `revoke_device()` - إلغاء جهاز
*/

-- جدول الأجهزة المعروفة
CREATE TABLE IF NOT EXISTS staff_access_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_type text CHECK (device_type IN ('mobile', 'desktop', 'tablet', 'unknown')),
  device_info jsonb DEFAULT '{}'::jsonb,
  access_method text CHECK (access_method IN ('camera_scan', 'image_upload')),
  first_access_at timestamptz DEFAULT now(),
  last_access_at timestamptz DEFAULT now(),
  access_count integer DEFAULT 1,
  is_trusted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(staff_id, device_fingerprint)
);

-- جدول سجل الدخول الكامل
CREATE TABLE IF NOT EXISTS staff_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  device_id uuid REFERENCES staff_access_devices(id) ON DELETE SET NULL,
  device_fingerprint text NOT NULL,
  access_method text CHECK (access_method IN ('camera_scan', 'image_upload')),
  is_new_device boolean DEFAULT false,
  requires_pin boolean DEFAULT false,
  pin_verified boolean DEFAULT false,
  success boolean DEFAULT true,
  ip_address text,
  user_agent text,
  location_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE staff_access_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_access_devices
CREATE POLICY "Staff can view own devices"
  ON staff_access_devices FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM platform_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all devices"
  ON staff_access_devices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'security_admin')
    )
  );

CREATE POLICY "System can insert devices"
  ON staff_access_devices FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "System can update devices"
  ON staff_access_devices FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Admins can update devices"
  ON staff_access_devices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'security_admin')
    )
  );

-- RLS Policies for staff_access_log
CREATE POLICY "Staff can view own access log"
  ON staff_access_log FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM platform_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all access logs"
  ON staff_access_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'security_admin')
    )
  );

CREATE POLICY "System can insert access logs"
  ON staff_access_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- دالة تسجيل دخول من جهاز
CREATE OR REPLACE FUNCTION register_device_access(
  p_staff_id uuid,
  p_device_fingerprint text,
  p_device_type text DEFAULT 'unknown',
  p_device_info jsonb DEFAULT '{}'::jsonb,
  p_access_method text DEFAULT 'camera_scan',
  p_requires_pin boolean DEFAULT false,
  p_pin_verified boolean DEFAULT false,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_device staff_access_devices;
  v_is_new_device boolean;
  v_log_id uuid;
BEGIN
  -- Check if device exists
  SELECT * INTO v_device
  FROM staff_access_devices
  WHERE staff_id = p_staff_id
  AND device_fingerprint = p_device_fingerprint;

  IF v_device IS NULL THEN
    -- New device
    v_is_new_device := true;
    
    INSERT INTO staff_access_devices (
      staff_id,
      device_fingerprint,
      device_type,
      device_info,
      access_method,
      access_count,
      is_trusted
    ) VALUES (
      p_staff_id,
      p_device_fingerprint,
      p_device_type,
      p_device_info,
      p_access_method,
      1,
      false
    )
    RETURNING * INTO v_device;
  ELSE
    -- Existing device
    v_is_new_device := false;
    
    UPDATE staff_access_devices
    SET 
      last_access_at = now(),
      access_count = access_count + 1,
      device_info = p_device_info
    WHERE id = v_device.id
    RETURNING * INTO v_device;
  END IF;

  -- Log the access
  INSERT INTO staff_access_log (
    staff_id,
    device_id,
    device_fingerprint,
    access_method,
    is_new_device,
    requires_pin,
    pin_verified,
    success,
    ip_address,
    user_agent
  ) VALUES (
    p_staff_id,
    v_device.id,
    p_device_fingerprint,
    p_access_method,
    v_is_new_device,
    p_requires_pin,
    p_pin_verified,
    true,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_new_device', v_is_new_device,
    'device_id', v_device.id,
    'device_trusted', v_device.is_trusted,
    'access_count', v_device.access_count,
    'log_id', v_log_id
  );
END;
$$;

-- دالة جلب أجهزة الموظف
CREATE OR REPLACE FUNCTION get_staff_devices(p_staff_id uuid)
RETURNS TABLE (
  device_id uuid,
  device_fingerprint text,
  device_type text,
  device_info jsonb,
  access_method text,
  first_access_at timestamptz,
  last_access_at timestamptz,
  access_count integer,
  is_trusted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    staff_access_devices.device_fingerprint,
    staff_access_devices.device_type,
    staff_access_devices.device_info,
    staff_access_devices.access_method,
    staff_access_devices.first_access_at,
    staff_access_devices.last_access_at,
    staff_access_devices.access_count,
    staff_access_devices.is_trusted
  FROM staff_access_devices
  WHERE staff_id = p_staff_id
  ORDER BY last_access_at DESC;
END;
$$;

-- دالة تعيين جهاز كموثوق
CREATE OR REPLACE FUNCTION trust_device(p_device_id uuid, p_trusted boolean DEFAULT true)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE staff_access_devices
  SET is_trusted = p_trusted
  WHERE id = p_device_id;
  
  RETURN FOUND;
END;
$$;

-- دالة إلغاء جهاز
CREATE OR REPLACE FUNCTION revoke_device(p_device_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM staff_access_devices
  WHERE id = p_device_id;
  
  RETURN FOUND;
END;
$$;

-- منح صلاحيات
GRANT EXECUTE ON FUNCTION register_device_access TO service_role;
GRANT EXECUTE ON FUNCTION get_staff_devices TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION trust_device TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION revoke_device TO authenticated, service_role;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_access_devices_staff_id ON staff_access_devices(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_access_devices_fingerprint ON staff_access_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_staff_access_log_staff_id ON staff_access_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_access_log_created_at ON staff_access_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_access_log_is_new_device ON staff_access_log(is_new_device) WHERE is_new_device = true;
