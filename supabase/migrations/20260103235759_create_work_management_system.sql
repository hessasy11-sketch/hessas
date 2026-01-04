/*
  # نظام إدارة العمل والصلاحيات المتقدم

  1. الجداول الجديدة
    - `permission_packs`
      - حزم صلاحيات قابلة للتخصيص
      - ترتبط بلوحة واحدة أو أكثر (B2B/B2F)
      - تحدد المستويات (View/Manage/Approve)
      - تحدد متطلبات الدخول (QR + PIN)
      
    - `pack_permissions`
      - الصلاحيات التفصيلية لكل حزمة
      - مرتبطة بقسم معين داخل اللوحة
      
    - `task_templates`
      - قوالب مهام قابلة لإعادة الاستخدام
      - مرتبطة بقسم ولوحة
      
    - `staff_tasks`
      - المهام المسندة للموظفين
      - حالة التنفيذ والاعتماد
      
    - `task_proofs`
      - إثباتات تنفيذ المهام (صور)
      
    - `staff_teams`
      - فرق العمل
      
    - `team_members`
      - أعضاء الفرق

  2. التحديثات على الجداول الموجودة
    - إضافة pack_id إلى platform_staff
    - إضافة reports_to_staff_id للهيكل الإداري

  3. الأمان
    - RLS على جميع الجداول
    - صلاحيات للإدارة العليا فقط
*/

-- جدول حزم الصلاحيات
CREATE TABLE IF NOT EXISTS permission_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  target_boards text[] NOT NULL DEFAULT '{}', -- ['b2b', 'b2f', 'both']
  requires_pin boolean NOT NULL DEFAULT false,
  session_idle_minutes integer NOT NULL DEFAULT 30,
  landing_route text NOT NULL DEFAULT '/hq',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES platform_staff(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول صلاحيات الحزمة
CREATE TABLE IF NOT EXISTS pack_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid REFERENCES permission_packs(id) ON DELETE CASCADE,
  board text NOT NULL CHECK (board IN ('b2b', 'b2f', 'hq', 'settings')),
  section text NOT NULL, -- اسم القسم داخل اللوحة
  access_level text NOT NULL CHECK (access_level IN ('view', 'manage', 'approve')),
  actions text[] DEFAULT '{}', -- ['create', 'edit', 'delete', 'export']
  created_at timestamptz DEFAULT now()
);

-- جدول قوالب المهام
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  board text NOT NULL CHECK (board IN ('b2b', 'b2f', 'operations', 'general')),
  section text,
  requires_proof boolean NOT NULL DEFAULT false,
  requires_approval boolean NOT NULL DEFAULT false,
  send_report_on_approval boolean NOT NULL DEFAULT false,
  checklist_items text[] DEFAULT '{}',
  estimated_duration_minutes integer,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES platform_staff(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول مهام الموظفين
CREATE TABLE IF NOT EXISTS staff_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES task_templates(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES platform_staff(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES platform_staff(id),
  title text NOT NULL,
  description text,
  board text NOT NULL,
  section text,
  status text CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'awaiting_approval', 'approved', 'rejected')) DEFAULT 'pending',
  requires_proof boolean NOT NULL DEFAULT false,
  requires_approval boolean NOT NULL DEFAULT false,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  due_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES platform_staff(id),
  approval_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول إثباتات المهام
CREATE TABLE IF NOT EXISTS task_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES staff_tasks(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  description text,
  uploaded_at timestamptz DEFAULT now()
);

-- جدول فرق العمل
CREATE TABLE IF NOT EXISTS staff_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  team_leader_id uuid REFERENCES platform_staff(id),
  department text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول أعضاء الفرق
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES staff_teams(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES platform_staff(id) ON DELETE CASCADE,
  role_in_team text,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, staff_id)
);

-- إضافة حقول جديدة لـ platform_staff
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'pack_id'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN pack_id uuid REFERENCES permission_packs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_staff' AND column_name = 'reports_to_staff_id'
  ) THEN
    ALTER TABLE platform_staff ADD COLUMN reports_to_staff_id uuid REFERENCES platform_staff(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE permission_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permission_packs
CREATE POLICY "Super admins can manage permission packs"
  ON permission_packs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin')
    )
  );

CREATE POLICY "Service role full access to permission packs"
  ON permission_packs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for pack_permissions
CREATE POLICY "Super admins can manage pack permissions"
  ON pack_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin')
    )
  );

CREATE POLICY "Service role full access to pack permissions"
  ON pack_permissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for task_templates
CREATE POLICY "Super admins can manage task templates"
  ON task_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin')
    )
  );

CREATE POLICY "Service role full access to task templates"
  ON task_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for staff_tasks
CREATE POLICY "Staff can view their own tasks"
  ON staff_tasks FOR SELECT
  TO authenticated
  USING (
    staff_id IN (SELECT id FROM platform_staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all tasks"
  ON staff_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin')
    )
  );

CREATE POLICY "Staff can update their own tasks"
  ON staff_tasks FOR UPDATE
  TO authenticated
  USING (
    staff_id IN (SELECT id FROM platform_staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access to staff tasks"
  ON staff_tasks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for task_proofs
CREATE POLICY "Staff can manage proofs for their tasks"
  ON task_proofs FOR ALL
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM staff_tasks 
      WHERE staff_id IN (SELECT id FROM platform_staff WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can view all task proofs"
  ON task_proofs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin')
    )
  );

CREATE POLICY "Service role full access to task proofs"
  ON task_proofs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for staff_teams
CREATE POLICY "Admins can manage teams"
  ON staff_teams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin')
    )
  );

CREATE POLICY "Service role full access to teams"
  ON staff_teams FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for team_members
CREATE POLICY "Admins can manage team members"
  ON team_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.user_id = auth.uid()
      AND platform_staff.role IN ('platform_owner', 'super_admin')
    )
  );

CREATE POLICY "Service role full access to team members"
  ON team_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_permission_packs_is_active ON permission_packs(is_active);
CREATE INDEX IF NOT EXISTS idx_pack_permissions_pack_id ON pack_permissions(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_permissions_board ON pack_permissions(board);
CREATE INDEX IF NOT EXISTS idx_task_templates_board ON task_templates(board);
CREATE INDEX IF NOT EXISTS idx_task_templates_is_active ON task_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_staff_id ON staff_tasks(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_by ON staff_tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_task_proofs_task_id ON task_proofs(task_id);
CREATE INDEX IF NOT EXISTS idx_staff_teams_team_leader ON staff_teams(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_staff_id ON team_members(staff_id);
CREATE INDEX IF NOT EXISTS idx_platform_staff_pack_id ON platform_staff(pack_id);
CREATE INDEX IF NOT EXISTS idx_platform_staff_reports_to ON platform_staff(reports_to_staff_id);

-- Function to get staff hierarchy
CREATE OR REPLACE FUNCTION get_staff_hierarchy(p_staff_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  role_title text,
  level integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    SELECT 
      s.id,
      s.full_name,
      s.role,
      s.role_title,
      0 as level
    FROM platform_staff s
    WHERE s.id = p_staff_id
    
    UNION ALL
    
    SELECT 
      s.id,
      s.full_name,
      s.role,
      s.role_title,
      h.level + 1
    FROM platform_staff s
    INNER JOIN hierarchy h ON s.reports_to_staff_id = h.id
  )
  SELECT * FROM hierarchy ORDER BY level;
END;
$$;

-- Function to check if PIN is required for pack
CREATE OR REPLACE FUNCTION is_pin_required_for_pack(p_pack_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_requires_pin boolean;
  v_has_sensitive_perms boolean;
BEGIN
  -- Check pack setting
  SELECT requires_pin INTO v_requires_pin
  FROM permission_packs
  WHERE id = p_pack_id;
  
  -- Check if pack has sensitive permissions
  SELECT EXISTS (
    SELECT 1 FROM pack_permissions
    WHERE pack_id = p_pack_id
    AND (
      access_level = 'approve'
      OR 'delete' = ANY(actions)
      OR section IN ('finance', 'contracts', 'payments')
    )
  ) INTO v_has_sensitive_perms;
  
  -- PIN required if explicitly set or has sensitive permissions
  RETURN COALESCE(v_requires_pin, false) OR v_has_sensitive_perms;
END;
$$;
