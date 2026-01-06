/*
  # Executive Impersonation (View-As) System

  1. New Tables
    - `executive_impersonation_logs`
      - `id` (uuid, primary key)
      - `gm_id` (uuid) - المدير العام
      - `action` (text) - started أو stopped
      - `target_staff_id` (uuid) - الموظف المستهدف
      - `target_staff_name` (text) - اسم الموظف
      - `current_path` (text) - المسار الحالي
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `executive_impersonation_logs` table
    - Add policy for GM to read/write logs
    - Add policy for service role full access

  3. Functions
    - `get_impersonation_logs()` - جلب سجلات View-As
*/

-- Create executive_impersonation_logs table
CREATE TABLE IF NOT EXISTS executive_impersonation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gm_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('started', 'stopped')),
  target_staff_id uuid,
  target_staff_name text,
  current_path text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE executive_impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: GM can read own logs
CREATE POLICY "GM can read own impersonation logs"
  ON executive_impersonation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = gm_id
      AND platform_staff.role = 'general_manager'
    )
  );

-- Policy: GM can insert logs
CREATE POLICY "GM can insert impersonation logs"
  ON executive_impersonation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = gm_id
      AND platform_staff.role = 'general_manager'
    )
  );

-- Policy: Service role full access
CREATE POLICY "Service role full access to impersonation logs"
  ON executive_impersonation_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Anonymous insert (for QR sessions)
CREATE POLICY "Anonymous can insert impersonation logs"
  ON executive_impersonation_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create function to get impersonation logs
CREATE OR REPLACE FUNCTION get_impersonation_logs(
  p_gm_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  gm_id uuid,
  action text,
  target_staff_id uuid,
  target_staff_name text,
  current_path text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.gm_id,
    l.action,
    l.target_staff_id,
    l.target_staff_name,
    l.current_path,
    l.created_at
  FROM executive_impersonation_logs l
  WHERE (p_gm_id IS NULL OR l.gm_id = p_gm_id)
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Create function to get active View-As sessions
CREATE OR REPLACE FUNCTION get_active_impersonations(p_gm_id uuid DEFAULT NULL)
RETURNS TABLE (
  gm_id uuid,
  target_staff_id uuid,
  target_staff_name text,
  started_at timestamptz,
  duration_minutes int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH starts AS (
    SELECT
      l.gm_id,
      l.target_staff_id,
      l.target_staff_name,
      l.created_at
    FROM executive_impersonation_logs l
    WHERE l.action = 'started'
      AND (p_gm_id IS NULL OR l.gm_id = p_gm_id)
  ),
  stops AS (
    SELECT
      l.gm_id,
      l.target_staff_id,
      l.created_at
    FROM executive_impersonation_logs l
    WHERE l.action = 'stopped'
      AND (p_gm_id IS NULL OR l.gm_id = p_gm_id)
  )
  SELECT
    s.gm_id,
    s.target_staff_id,
    s.target_staff_name,
    s.created_at as started_at,
    EXTRACT(EPOCH FROM (now() - s.created_at))::int / 60 as duration_minutes
  FROM starts s
  LEFT JOIN stops st ON (
    st.gm_id = s.gm_id
    AND st.target_staff_id = s.target_staff_id
    AND st.created_at > s.created_at
  )
  WHERE st.created_at IS NULL
  ORDER BY s.created_at DESC;
END;
$$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_gm_id
  ON executive_impersonation_logs(gm_id);

CREATE INDEX IF NOT EXISTS idx_impersonation_logs_created_at
  ON executive_impersonation_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_impersonation_logs_action
  ON executive_impersonation_logs(action);
