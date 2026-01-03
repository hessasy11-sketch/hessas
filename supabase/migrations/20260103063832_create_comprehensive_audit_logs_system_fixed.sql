/*
  # نظام Audit Logs الشامل

  1. New Tables
    - `admin_operations_audit` - سجل العمليات الإدارية
      
  2. Updates to existing tables
    - Add columns to `staff_access_log`

  3. Functions
    - `log_admin_operation()` - تسجيل عملية إدارية
    - `get_all_audit_logs()` - جلب كل السجلات
    - `get_staff_activity()` - جلب نشاط موظف محدد
    - `get_recent_access_attempts()` - المحاولات الأخيرة
    - `get_access_statistics()` - إحصائيات الدخول

  4. Security
    - RLS enabled
    - Only platform_owner and super_admin can view
*/

-- جدول العمليات الإدارية
CREATE TABLE IF NOT EXISTS admin_operations_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_staff_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  target_staff_id uuid REFERENCES platform_staff(id) ON DELETE CASCADE,
  operation_type text NOT NULL CHECK (operation_type IN (
    'generate_qr',
    'revoke_qr',
    'activate_qr',
    'deactivate_qr',
    'set_pin',
    'change_pin',
    'remove_pin',
    'reset_pin_attempts',
    'trust_device',
    'revoke_device',
    'create_staff',
    'update_staff',
    'delete_staff'
  )),
  operation_details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- إضافة أعمدة جديدة لـ staff_access_log
ALTER TABLE staff_access_log
  ADD COLUMN IF NOT EXISTS redirect_route text,
  ADD COLUMN IF NOT EXISTS failure_reason text;

-- Enable RLS
ALTER TABLE admin_operations_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Platform owner can view all operations"
  ON admin_operations_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE user_id = auth.uid()
      AND role IN ('platform_owner', 'super_admin')
    )
  );

CREATE POLICY "System can insert operations"
  ON admin_operations_audit FOR INSERT
  TO service_role
  WITH CHECK (true);

-- دالة تسجيل عملية إدارية
CREATE OR REPLACE FUNCTION log_admin_operation(
  p_admin_staff_id uuid,
  p_target_staff_id uuid,
  p_operation_type text,
  p_operation_details jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO admin_operations_audit (
    admin_staff_id,
    target_staff_id,
    operation_type,
    operation_details,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_staff_id,
    p_target_staff_id,
    p_operation_type,
    p_operation_details,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- دالة جلب كل السجلات
CREATE OR REPLACE FUNCTION get_all_audit_logs(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  log_id uuid,
  log_type text,
  log_timestamp timestamptz,
  staff_id uuid,
  staff_name text,
  staff_role text,
  operation text,
  details jsonb,
  success boolean,
  device_info jsonb,
  ip_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT
      sal.id as log_id,
      'access'::text as log_type,
      sal.created_at as log_timestamp,
      sal.staff_id,
      ps.full_name as staff_name,
      ps.role as staff_role,
      CASE
        WHEN sal.access_method = 'camera_scan' THEN 'مسح بالكاميرا'
        WHEN sal.access_method = 'image_upload' THEN 'رفع صورة'
        ELSE 'دخول'
      END as operation,
      jsonb_build_object(
        'access_method', sal.access_method,
        'requires_pin', sal.requires_pin,
        'pin_verified', sal.pin_verified,
        'is_new_device', sal.is_new_device,
        'redirect_route', sal.redirect_route,
        'failure_reason', sal.failure_reason
      ) as details,
      sal.success,
      jsonb_build_object(
        'device_fingerprint', sal.device_fingerprint,
        'user_agent', sal.user_agent
      ) as device_info,
      sal.ip_address
    FROM staff_access_log sal
    JOIN platform_staff ps ON sal.staff_id = ps.id
    WHERE EXISTS (
      SELECT 1 FROM platform_staff
      WHERE user_id = auth.uid()
      AND role IN ('platform_owner', 'super_admin')
    )
  )
  UNION ALL
  (
    SELECT
      aoa.id as log_id,
      'operation'::text as log_type,
      aoa.created_at as log_timestamp,
      aoa.target_staff_id as staff_id,
      ps.full_name as staff_name,
      ps.role as staff_role,
      CASE aoa.operation_type
        WHEN 'generate_qr' THEN 'توليد باركود'
        WHEN 'revoke_qr' THEN 'إلغاء باركود'
        WHEN 'activate_qr' THEN 'تفعيل باركود'
        WHEN 'deactivate_qr' THEN 'إيقاف باركود'
        WHEN 'set_pin' THEN 'تعيين PIN'
        WHEN 'change_pin' THEN 'تغيير PIN'
        WHEN 'remove_pin' THEN 'إلغاء PIN'
        WHEN 'reset_pin_attempts' THEN 'إعادة تعيين محاولات PIN'
        WHEN 'trust_device' THEN 'الوثوق بجهاز'
        WHEN 'revoke_device' THEN 'إلغاء جهاز'
        ELSE aoa.operation_type
      END as operation,
      jsonb_build_object(
        'admin_id', aoa.admin_staff_id,
        'admin_name', aps.full_name,
        'details', aoa.operation_details
      ) as details,
      true as success,
      jsonb_build_object(
        'user_agent', aoa.user_agent
      ) as device_info,
      aoa.ip_address
    FROM admin_operations_audit aoa
    LEFT JOIN platform_staff ps ON aoa.target_staff_id = ps.id
    LEFT JOIN platform_staff aps ON aoa.admin_staff_id = aps.id
    WHERE EXISTS (
      SELECT 1 FROM platform_staff
      WHERE user_id = auth.uid()
      AND role IN ('platform_owner', 'super_admin')
    )
  )
  ORDER BY log_timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- دالة جلب نشاط موظف محدد
CREATE OR REPLACE FUNCTION get_staff_activity(
  p_staff_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  log_type text,
  log_timestamp timestamptz,
  operation text,
  success boolean,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT
      'access'::text as log_type,
      sal.created_at as log_timestamp,
      CASE
        WHEN sal.success THEN 'دخول ناجح'
        ELSE 'محاولة دخول فاشلة'
      END as operation,
      sal.success,
      jsonb_build_object(
        'access_method', sal.access_method,
        'requires_pin', sal.requires_pin,
        'pin_verified', sal.pin_verified,
        'is_new_device', sal.is_new_device,
        'failure_reason', sal.failure_reason,
        'ip_address', sal.ip_address
      ) as details
    FROM staff_access_log sal
    WHERE sal.staff_id = p_staff_id
    AND sal.created_at >= now() - (p_days || ' days')::interval
  )
  UNION ALL
  (
    SELECT
      'operation'::text as log_type,
      aoa.created_at as log_timestamp,
      CASE aoa.operation_type
        WHEN 'generate_qr' THEN 'تم توليد باركود'
        WHEN 'revoke_qr' THEN 'تم إلغاء الباركود'
        WHEN 'activate_qr' THEN 'تم تفعيل الباركود'
        WHEN 'deactivate_qr' THEN 'تم إيقاف الباركود'
        WHEN 'set_pin' THEN 'تم تعيين PIN'
        WHEN 'change_pin' THEN 'تم تغيير PIN'
        WHEN 'remove_pin' THEN 'تم إلغاء PIN'
        ELSE aoa.operation_type
      END as operation,
      true as success,
      jsonb_build_object(
        'admin_name', aps.full_name,
        'details', aoa.operation_details
      ) as details
    FROM admin_operations_audit aoa
    JOIN platform_staff aps ON aoa.admin_staff_id = aps.id
    WHERE aoa.target_staff_id = p_staff_id
    AND aoa.created_at >= now() - (p_days || ' days')::interval
  )
  ORDER BY log_timestamp DESC;
END;
$$;

-- دالة المحاولات الأخيرة
CREATE OR REPLACE FUNCTION get_recent_access_attempts(
  p_minutes integer DEFAULT 60,
  p_failed_only boolean DEFAULT false
)
RETURNS TABLE (
  staff_id uuid,
  staff_name text,
  attempt_time timestamptz,
  success boolean,
  access_method text,
  is_new_device boolean,
  device_fingerprint text,
  ip_address text,
  failure_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sal.staff_id,
    ps.full_name as staff_name,
    sal.created_at as attempt_time,
    sal.success,
    sal.access_method,
    sal.is_new_device,
    sal.device_fingerprint,
    sal.ip_address,
    sal.failure_reason
  FROM staff_access_log sal
  JOIN platform_staff ps ON sal.staff_id = ps.id
  WHERE sal.created_at >= now() - (p_minutes || ' minutes')::interval
  AND (NOT p_failed_only OR sal.success = false)
  AND EXISTS (
    SELECT 1 FROM platform_staff
    WHERE user_id = auth.uid()
    AND role IN ('platform_owner', 'super_admin')
  )
  ORDER BY sal.created_at DESC;
END;
$$;

-- دالة إحصائيات الدخول
CREATE OR REPLACE FUNCTION get_access_statistics(
  p_days integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_attempts', COUNT(*),
    'successful_attempts', COUNT(*) FILTER (WHERE success = true),
    'failed_attempts', COUNT(*) FILTER (WHERE success = false),
    'camera_scans', COUNT(*) FILTER (WHERE access_method = 'camera_scan'),
    'image_uploads', COUNT(*) FILTER (WHERE access_method = 'image_upload'),
    'new_devices', COUNT(*) FILTER (WHERE is_new_device = true),
    'pin_required', COUNT(*) FILTER (WHERE requires_pin = true),
    'pin_verified', COUNT(*) FILTER (WHERE pin_verified = true),
    'unique_staff', COUNT(DISTINCT staff_id)
  ) INTO v_stats
  FROM staff_access_log
  WHERE created_at >= now() - (p_days || ' days')::interval
  AND EXISTS (
    SELECT 1 FROM platform_staff
    WHERE user_id = auth.uid()
    AND role IN ('platform_owner', 'super_admin')
  );

  RETURN v_stats;
END;
$$;

-- منح صلاحيات
GRANT EXECUTE ON FUNCTION log_admin_operation TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_staff_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_access_attempts TO authenticated;
GRANT EXECUTE ON FUNCTION get_access_statistics TO authenticated;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_operations_audit_admin_staff_id ON admin_operations_audit(admin_staff_id);
CREATE INDEX IF NOT EXISTS idx_admin_operations_audit_target_staff_id ON admin_operations_audit(target_staff_id);
CREATE INDEX IF NOT EXISTS idx_admin_operations_audit_created_at ON admin_operations_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_access_log_success ON staff_access_log(success);
CREATE INDEX IF NOT EXISTS idx_staff_access_log_is_new_device_true ON staff_access_log(is_new_device) WHERE is_new_device = true;
