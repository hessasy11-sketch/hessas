/*
  # نظام التشغيل الخفيف (Ops Lite)

  1. الجداول الجديدة
    - fc_daily_tasks (المهام اليومية)
    - fc_incidents (بلاغات الأعطال)
    - fc_equipment_maintenance (صيانة المعدات)

  2. الميزات
    - مرتبطة بـ operational_farm_id
    - حالات بسيطة لكل جدول
    - إسناد للفرق والأعضاء

  3. الأمان
    - RLS policies لكل جدول
    - صلاحيات للموظفين فقط
*/

-- ===== 1. المهام اليومية =====
CREATE TABLE IF NOT EXISTS fc_daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operational_farm_id UUID NOT NULL REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  task_description TEXT,
  assigned_to_team_id UUID REFERENCES fc_farm_teams(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES platform_staff(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES platform_staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_farm ON fc_daily_tasks(operational_farm_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_status ON fc_daily_tasks(status);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_team ON fc_daily_tasks(assigned_to_team_id);

-- ===== 2. بلاغات الأعطال =====
CREATE TABLE IF NOT EXISTS fc_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operational_farm_id UUID NOT NULL REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  incident_title TEXT NOT NULL,
  incident_description TEXT,
  incident_type TEXT NOT NULL DEFAULT 'other' CHECK (incident_type IN (
    'equipment_failure',
    'irrigation_issue',
    'pest_problem',
    'tree_damage',
    'weather_damage',
    'other'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  assigned_to_team_id UUID REFERENCES fc_farm_teams(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES platform_staff(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES platform_staff(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_farm ON fc_incidents(operational_farm_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON fc_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON fc_incidents(incident_type);

-- ===== 3. صيانة المعدات =====
CREATE TABLE IF NOT EXISTS fc_equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operational_farm_id UUID NOT NULL REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL DEFAULT 'other' CHECK (equipment_type IN (
    'irrigation_system',
    'tractor',
    'harvesting_tool',
    'sprayer',
    'generator',
    'pump',
    'other'
  )),
  maintenance_type TEXT NOT NULL DEFAULT 'routine' CHECK (maintenance_type IN ('routine', 'repair', 'emergency', 'inspection')),
  maintenance_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  performed_by UUID REFERENCES platform_staff(id),
  status_before TEXT,
  status_after TEXT NOT NULL DEFAULT 'working' CHECK (status_after IN ('working', 'needs_attention', 'broken', 'replaced')),
  notes TEXT,
  cost DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_farm ON fc_equipment_maintenance(operational_farm_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_date ON fc_equipment_maintenance(maintenance_date);

-- ===== RLS Policies =====

-- fc_daily_tasks policies
ALTER TABLE fc_daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view tasks"
  ON fc_daily_tasks FOR SELECT
  TO authenticated, service_role
  USING (true);

CREATE POLICY "Authenticated staff can create tasks"
  ON fc_daily_tasks FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can update tasks"
  ON fc_daily_tasks FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can delete tasks"
  ON fc_daily_tasks FOR DELETE
  TO authenticated, service_role
  USING (true);

-- fc_incidents policies
ALTER TABLE fc_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view incidents"
  ON fc_incidents FOR SELECT
  TO authenticated, service_role
  USING (true);

CREATE POLICY "Authenticated staff can create incidents"
  ON fc_incidents FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can update incidents"
  ON fc_incidents FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can delete incidents"
  ON fc_incidents FOR DELETE
  TO authenticated, service_role
  USING (true);

-- fc_equipment_maintenance policies
ALTER TABLE fc_equipment_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view maintenance"
  ON fc_equipment_maintenance FOR SELECT
  TO authenticated, service_role
  USING (true);

CREATE POLICY "Authenticated staff can create maintenance"
  ON fc_equipment_maintenance FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can update maintenance"
  ON fc_equipment_maintenance FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can delete maintenance"
  ON fc_equipment_maintenance FOR DELETE
  TO authenticated, service_role
  USING (true);

-- ===== Helper Functions =====

-- دالة: إحصائيات التشغيل الخفيف للمزرعة
CREATE OR REPLACE FUNCTION get_ops_lite_stats(p_operational_farm_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tasks', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM fc_daily_tasks WHERE operational_farm_id = p_operational_farm_id),
      'pending', (SELECT COUNT(*) FROM fc_daily_tasks WHERE operational_farm_id = p_operational_farm_id AND status = 'pending'),
      'in_progress', (SELECT COUNT(*) FROM fc_daily_tasks WHERE operational_farm_id = p_operational_farm_id AND status = 'in_progress'),
      'completed', (SELECT COUNT(*) FROM fc_daily_tasks WHERE operational_farm_id = p_operational_farm_id AND status = 'completed')
    ),
    'incidents', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM fc_incidents WHERE operational_farm_id = p_operational_farm_id),
      'open', (SELECT COUNT(*) FROM fc_incidents WHERE operational_farm_id = p_operational_farm_id AND status IN ('reported', 'acknowledged', 'in_progress')),
      'resolved', (SELECT COUNT(*) FROM fc_incidents WHERE operational_farm_id = p_operational_farm_id AND status IN ('resolved', 'closed')),
      'critical', (SELECT COUNT(*) FROM fc_incidents WHERE operational_farm_id = p_operational_farm_id AND priority = 'critical' AND status NOT IN ('resolved', 'closed'))
    ),
    'maintenance', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM fc_equipment_maintenance WHERE operational_farm_id = p_operational_farm_id),
      'this_month', (SELECT COUNT(*) FROM fc_equipment_maintenance WHERE operational_farm_id = p_operational_farm_id AND maintenance_date >= date_trunc('month', now())),
      'broken_equipment', (SELECT COUNT(*) FROM fc_equipment_maintenance WHERE operational_farm_id = p_operational_farm_id AND status_after = 'broken')
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- دالة: تحديث حالة المهمة
CREATE OR REPLACE FUNCTION update_task_status(
  p_task_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE fc_daily_tasks
  SET 
    status = p_status,
    completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE completed_at END,
    updated_at = now()
  WHERE id = p_task_id;
END;
$$;

-- دالة: تحديث حالة البلاغ
CREATE OR REPLACE FUNCTION update_incident_status(
  p_incident_id UUID,
  p_status TEXT,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE fc_incidents
  SET 
    status = p_status,
    resolved_at = CASE WHEN p_status IN ('resolved', 'closed') THEN now() ELSE resolved_at END,
    resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
    updated_at = now()
  WHERE id = p_incident_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_ops_lite_stats(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_task_status(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_incident_status(UUID, TEXT, TEXT) TO authenticated, service_role;