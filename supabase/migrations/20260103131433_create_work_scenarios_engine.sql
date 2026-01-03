/*
  # Work Scenario Engine System

  1. New Tables
    - `work_scenarios`
      - Complete scenario definition for staff roles
      - Includes permissions, routing, and access control

    - `scenario_audit_logs`
      - Tracks all scenario-based access events

  2. Changes to Existing Tables
    - Add `scenario_id` to `platform_staff`
    - Add temporary promotion fields

  3. Security
    - RLS enabled on all tables
    - Super admin access only for scenario management
    - Staff can view their own audit logs
*/

-- Create work_scenarios table
CREATE TABLE IF NOT EXISTS work_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  department text NOT NULL CHECK (department IN ('hq', 'b2b', 'b2f', 'farm_ops')),
  login_method text NOT NULL CHECK (login_method IN ('qr_only', 'qr_pin')),
  requires_pin boolean NOT NULL DEFAULT false,
  session_policy text NOT NULL DEFAULT 'idle_30m',
  scope_type text NOT NULL CHECK (scope_type IN ('platform', 'department', 'farm')),
  allowed_modules text[] NOT NULL DEFAULT '{}',
  allowed_actions text[] NOT NULL DEFAULT '{}',
  landing_route text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scenario_audit_logs table
CREATE TABLE IF NOT EXISTS scenario_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES platform_staff(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES work_scenarios(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('login_success', 'login_fail', 'session_start', 'session_end', 'route_access', 'permission_check')),
  details jsonb DEFAULT '{}',
  device_info text,
  browser_info text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Add scenario fields to platform_staff
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'scenario_id'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN scenario_id uuid REFERENCES work_scenarios(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'temp_scenario_id'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN temp_scenario_id uuid REFERENCES work_scenarios(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'temp_until'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN temp_until timestamptz;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE work_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_scenarios
CREATE POLICY "Super admins can manage scenarios"
  ON work_scenarios FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin')
    )
  );

CREATE POLICY "Service role full access to scenarios"
  ON work_scenarios FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Staff can view their assigned scenario"
  ON work_scenarios FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT scenario_id FROM platform_staff
      WHERE user_id = auth.uid()
      UNION
      SELECT temp_scenario_id FROM platform_staff
      WHERE user_id = auth.uid() AND temp_until > now()
    )
  );

-- RLS Policies for scenario_audit_logs
CREATE POLICY "Super admins can view all audit logs"
  ON scenario_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin')
    )
  );

CREATE POLICY "Staff can view their own audit logs"
  ON scenario_audit_logs FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM platform_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert audit logs"
  ON scenario_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role full access to audit logs"
  ON scenario_audit_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to get active scenario for staff
CREATE OR REPLACE FUNCTION get_active_scenario(p_staff_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_temp_scenario_id uuid;
  v_temp_until timestamptz;
  v_base_scenario_id uuid;
BEGIN
  SELECT temp_scenario_id, temp_until, scenario_id
  INTO v_temp_scenario_id, v_temp_until, v_base_scenario_id
  FROM platform_staff
  WHERE id = p_staff_id;

  -- Check if temporary scenario is active and not expired
  IF v_temp_scenario_id IS NOT NULL AND v_temp_until > now() THEN
    RETURN v_temp_scenario_id;
  END IF;

  -- Return base scenario
  RETURN v_base_scenario_id;
END;
$$;

-- Function to log scenario access
CREATE OR REPLACE FUNCTION log_scenario_access(
  p_staff_id uuid,
  p_scenario_id uuid,
  p_event_type text,
  p_details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO scenario_audit_logs (
    staff_id,
    scenario_id,
    event_type,
    details,
    created_at
  ) VALUES (
    p_staff_id,
    p_scenario_id,
    p_event_type,
    p_details,
    now()
  );
END;
$$;

-- Function to check scenario permission
CREATE OR REPLACE FUNCTION check_scenario_permission(
  p_staff_id uuid,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scenario_id uuid;
  v_allowed_actions text[];
BEGIN
  v_scenario_id := get_active_scenario(p_staff_id);

  IF v_scenario_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT allowed_actions INTO v_allowed_actions
  FROM work_scenarios
  WHERE id = v_scenario_id AND is_active = true;

  RETURN p_action = ANY(v_allowed_actions);
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_scenarios_department ON work_scenarios(department);
CREATE INDEX IF NOT EXISTS idx_work_scenarios_is_active ON work_scenarios(is_active);
CREATE INDEX IF NOT EXISTS idx_scenario_audit_logs_staff_id ON scenario_audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_scenario_audit_logs_scenario_id ON scenario_audit_logs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_audit_logs_created_at ON scenario_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_staff_scenario_id ON platform_staff(scenario_id);
CREATE INDEX IF NOT EXISTS idx_platform_staff_temp_scenario ON platform_staff(temp_scenario_id, temp_until);
