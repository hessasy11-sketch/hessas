/*
  # نظام الهيكل الهرمي والصلاحيات الموسع (Org Structure System)

  1. New Tables
    - `platform_staff` - جدول الموظفين الشامل
    - `roles_catalog` - مكتبة الأدوار الوظيفية
    - `platform_audit_logs` - سجل تدقيق النظام
    - `team_templates` - قوالب الفرق الجاهزة

  2. Security
    - Enable RLS on all tables
    - Add policies for platform admins only
*/

-- إنشاء جدول الموظفين الشامل
CREATE TABLE IF NOT EXISTS platform_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) UNIQUE,
  role text NOT NULL CHECK (role IN ('manager', 'supervisor', 'agent', 'finance', 'operations', 'support')),
  department text NOT NULL CHECK (department IN ('HQ', 'B2F', 'B2B', 'Support', 'Finance')),
  job_title text,
  job_description text,
  manager_user_id uuid REFERENCES profiles(id),
  scope_farms uuid[],
  role_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول مكتبة الأدوار
CREATE TABLE IF NOT EXISTS roles_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL,
  department text NOT NULL CHECK (department IN ('HQ', 'B2F', 'B2B', 'Support', 'Finance')),
  permission_level text NOT NULL CHECK (permission_level IN ('read', 'execute', 'approve', 'manage')),
  description text,
  permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة foreign key لـ role_id بعد إنشاء roles_catalog
ALTER TABLE platform_staff ADD CONSTRAINT platform_staff_role_id_fkey 
  FOREIGN KEY (role_id) REFERENCES roles_catalog(id);

-- إنشاء جدول سجل التدقيق
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type IN (
    'create_role', 'update_role', 'delete_role',
    'create_staff', 'update_staff', 'deactivate_staff', 'activate_staff',
    'change_manager', 'change_scope', 'change_permissions',
    'create_team', 'update_team'
  )),
  target_type text NOT NULL CHECK (target_type IN ('staff', 'role', 'permission', 'team')),
  target_id uuid,
  performed_by uuid REFERENCES profiles(id),
  changes jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول قوالب الفرق
CREATE TABLE IF NOT EXISTS team_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  department text NOT NULL CHECK (department IN ('HQ', 'B2F', 'B2B', 'Support', 'Finance')),
  scope_type text CHECK (scope_type IN ('all', 'specific_farms', 'region', 'custom')),
  roles_structure jsonb NOT NULL DEFAULT '[]',
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_platform_staff_user_id ON platform_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_staff_department ON platform_staff(department);
CREATE INDEX IF NOT EXISTS idx_platform_staff_manager ON platform_staff(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_staff_active ON platform_staff(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_catalog_department ON roles_catalog(department);
CREATE INDEX IF NOT EXISTS idx_roles_catalog_active ON roles_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON platform_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON platform_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON platform_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_templates_department ON team_templates(department);

-- Enable RLS
ALTER TABLE platform_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Platform Admins Only

-- platform_staff policies
CREATE POLICY "Platform admins can view staff"
  ON platform_staff FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can insert staff"
  ON platform_staff FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update staff"
  ON platform_staff FOR UPDATE
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- roles_catalog policies
CREATE POLICY "Platform admins can view roles"
  ON roles_catalog FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can insert roles"
  ON roles_catalog FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update roles"
  ON roles_catalog FOR UPDATE
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- platform_audit_logs policies
CREATE POLICY "Platform admins can view audit logs"
  ON platform_audit_logs FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON platform_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- team_templates policies
CREATE POLICY "Platform admins can view team templates"
  ON team_templates FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage team templates"
  ON team_templates FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update team templates"
  ON team_templates FOR UPDATE
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- إنشاء function لإضافة سجل تدقيق
CREATE OR REPLACE FUNCTION log_platform_action(
  p_action_type text,
  p_target_type text,
  p_target_id uuid,
  p_changes jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO platform_audit_logs (
    action_type,
    target_type,
    target_id,
    performed_by,
    changes,
    metadata
  ) VALUES (
    p_action_type,
    p_target_type,
    p_target_id,
    auth.uid(),
    p_changes,
    p_metadata
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- إنشاء function للحصول على الهيكل الهرمي
CREATE OR REPLACE FUNCTION get_org_tree()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'staff', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ps.id,
          'user_id', ps.user_id,
          'full_name', p.display_name,
          'phone', p.phone_number,
          'role', ps.role,
          'role_id', ps.role_id,
          'department', ps.department,
          'job_title', ps.job_title,
          'manager_user_id', ps.manager_user_id,
          'is_active', ps.is_active,
          'scope_farms', ps.scope_farms,
          'created_at', ps.created_at
        )
      )
      FROM platform_staff ps
      LEFT JOIN profiles p ON p.id = ps.user_id
      WHERE ps.is_active = true
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- إنشاء function لتطبيق قالب فريق
CREATE OR REPLACE FUNCTION apply_team_template(
  p_template_id uuid,
  p_manager_user_id uuid,
  p_supervisor_user_ids uuid[],
  p_scope_farms uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template team_templates;
  v_result jsonb DEFAULT '[]'::jsonb;
  v_supervisor_id uuid;
  v_staff_id uuid;
BEGIN
  IF NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_template FROM team_templates WHERE id = p_template_id;

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  INSERT INTO platform_staff (
    user_id,
    role,
    department,
    job_title,
    scope_farms,
    is_active
  ) VALUES (
    p_manager_user_id,
    'manager',
    v_template.department,
    'مدير ' || v_template.department,
    p_scope_farms,
    true
  ) RETURNING id INTO v_staff_id;

  v_result = v_result || jsonb_build_object('manager', v_staff_id);

  FOREACH v_supervisor_id IN ARRAY p_supervisor_user_ids
  LOOP
    INSERT INTO platform_staff (
      user_id,
      role,
      department,
      job_title,
      manager_user_id,
      scope_farms,
      is_active
    ) VALUES (
      v_supervisor_id,
      'supervisor',
      v_template.department,
      'مشرف ' || v_template.department,
      p_manager_user_id,
      p_scope_farms,
      true
    );
  END LOOP;

  PERFORM log_platform_action(
    'create_team',
    'team',
    p_template_id,
    jsonb_build_object(
      'template_id', p_template_id,
      'manager', p_manager_user_id,
      'supervisors', p_supervisor_user_ids
    )
  );

  RETURN v_result;
END;
$$;

-- إدراج أدوار افتراضية
INSERT INTO roles_catalog (role_name, department, permission_level, description, permissions) VALUES
('مدير عام B2F', 'B2F', 'manage', 'مدير عام قسم استثمار أشجار المزارع', '{"farms": "all", "opportunities": "manage", "operations": "manage", "finance": "approve"}'),
('مشرف مزارع', 'B2F', 'execute', 'مشرف على العمليات التشغيلية للمزارع', '{"farms": "assigned", "operations": "execute", "reports": "create"}'),
('مدير مبيعات B2F', 'B2F', 'approve', 'مدير مبيعات واستثمارات', '{"sales": "manage", "contracts": "approve", "payments": "review"}'),
('مدير عام B2B', 'B2B', 'manage', 'مدير عام قسم مزاد الشركات', '{"auctions": "all", "plans": "manage", "users": "manage"}'),
('مشرف مزادات', 'B2B', 'execute', 'مشرف على المزادات والإعلانات', '{"auctions": "moderate", "reports": "create"}'),
('مدير دعم فني', 'Support', 'manage', 'مدير فريق الدعم الفني', '{"tickets": "all", "users": "assist"}'),
('موظف دعم', 'Support', 'execute', 'موظف دعم فني', '{"tickets": "assigned", "responses": "create"}'),
('مدير مالي', 'Finance', 'approve', 'مدير القسم المالي', '{"payments": "approve", "invoices": "manage", "reports": "all"}'),
('محاسب', 'Finance', 'execute', 'محاسب', '{"payments": "review", "invoices": "process"}')
ON CONFLICT DO NOTHING;

-- إدراج قوالب فرق افتراضية
INSERT INTO team_templates (template_name, department, scope_type, roles_structure, description) VALUES
('فريق تشغيل مزارع B2F', 'B2F', 'specific_farms',
 '[{"role": "manager", "count": 1}, {"role": "supervisor", "count": 2}, {"role": "support", "count": 1}]',
 'فريق كامل لإدارة وتشغيل المزارع'),
('فريق إدارة مزادات B2B', 'B2B', 'all',
 '[{"role": "manager", "count": 1}, {"role": "moderator", "count": 2}]',
 'فريق لإدارة المزادات والإشراف عليها'),
('فريق دعم فني', 'Support', 'all',
 '[{"role": "manager", "count": 1}, {"role": "agent", "count": 3}]',
 'فريق دعم فني متكامل')
ON CONFLICT DO NOTHING;
