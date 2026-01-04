/*
  # نظام الأقسام الديناميكي المتطور
  
  1. جداول جديدة:
    - `platform_departments`: الأقسام الديناميكية
    - `department_permissions`: صلاحيات كل قسم
    - `department_roles`: أدوار داخل القسم
    - `department_staff_assignments`: تعيين الموظفين للأقسام
    - `department_tasks`: مهام القسم
    - `system_integrations`: ربط الأقسام بالأنظمة (B2B, B2F)
  
  2. الميزات:
    - إنشاء أقسام مخصصة بالكامل
    - تحديد صلاحيات لكل قسم
    - ربط مع أنظمة المزادات والمزارع
    - أدوار هرمية داخل القسم
    - توزيع مهام ذكي
*/

-- جدول الأقسام الديناميكية
CREATE TABLE IF NOT EXISTS platform_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  icon text DEFAULT 'briefcase',
  color text DEFAULT '#3b82f6',
  parent_department_id uuid REFERENCES platform_departments(id) ON DELETE SET NULL,
  
  -- ربط مع الأنظمة
  linked_system text CHECK (linked_system IN ('b2b', 'b2f', 'both', 'none')),
  system_access_level text DEFAULT 'read' CHECK (system_access_level IN ('none', 'read', 'write', 'full')),
  
  -- الإعدادات
  is_active boolean DEFAULT true,
  requires_approval boolean DEFAULT false,
  auto_assign_tasks boolean DEFAULT false,
  
  -- البيانات الوصفية
  created_by uuid REFERENCES platform_staff(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول صلاحيات الأقسام
CREATE TABLE IF NOT EXISTS department_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES platform_departments(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  permission_name_ar text NOT NULL,
  permission_category text DEFAULT 'general',
  is_granted boolean DEFAULT false,
  granted_by uuid REFERENCES platform_staff(id),
  granted_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(department_id, permission_key)
);

-- جدول الأدوار داخل القسم
CREATE TABLE IF NOT EXISTS department_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES platform_departments(id) ON DELETE CASCADE,
  role_name_ar text NOT NULL,
  role_name_en text NOT NULL,
  role_level int DEFAULT 1,
  can_approve boolean DEFAULT false,
  can_assign_tasks boolean DEFAULT false,
  can_manage_staff boolean DEFAULT false,
  can_view_reports boolean DEFAULT false,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- جدول تعيين الموظفين للأقسام
CREATE TABLE IF NOT EXISTS department_staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES platform_departments(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  role_id uuid REFERENCES department_roles(id) ON DELETE SET NULL,
  is_primary boolean DEFAULT true,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  assigned_by uuid REFERENCES platform_staff(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(department_id, staff_id, is_primary)
);

-- جدول مهام القسم
CREATE TABLE IF NOT EXISTS department_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES platform_departments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  task_type text DEFAULT 'general',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  
  -- التعيين
  assigned_to uuid REFERENCES platform_staff(id),
  assigned_by uuid REFERENCES platform_staff(id),
  
  -- الأوقات
  due_date timestamptz,
  estimated_hours numeric DEFAULT 1,
  actual_hours numeric,
  started_at timestamptz,
  completed_at timestamptz,
  
  -- الربط
  linked_system text CHECK (linked_system IN ('b2b', 'b2f', 'none')),
  linked_record_id uuid,
  linked_record_type text,
  
  -- النقاط
  points int DEFAULT 10,
  bonus_points int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول ربط الأنظمة
CREATE TABLE IF NOT EXISTS system_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES platform_departments(id) ON DELETE CASCADE,
  system_code text NOT NULL CHECK (system_code IN ('b2b_auctions', 'b2f_farms', 'b2f_operations', 'b2f_sales')),
  access_level text DEFAULT 'read' CHECK (access_level IN ('none', 'read', 'write', 'full')),
  
  -- الصلاحيات المحددة
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  can_view_reports boolean DEFAULT false,
  can_export boolean DEFAULT false,
  
  -- القيود
  restrictions jsonb DEFAULT '{}'::jsonb,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_integrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role full access departments"
  ON platform_departments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Staff can view active departments"
  ON platform_departments FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage departments"
  ON platform_departments FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.role IN ('super_admin', 'admin')
  ));

CREATE POLICY "Service role full access permissions"
  ON department_permissions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Staff can view department permissions"
  ON department_permissions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM department_staff_assignments dsa
    JOIN platform_staff ps ON ps.id = dsa.staff_id
    WHERE dsa.department_id = department_permissions.department_id
    AND ps.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access roles"
  ON department_roles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access assignments"
  ON department_staff_assignments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Staff can view own assignments"
  ON department_staff_assignments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM platform_staff ps
    WHERE ps.id = department_staff_assignments.staff_id
    AND ps.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access tasks"
  ON department_tasks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Staff can view department tasks"
  ON department_tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to IN (
      SELECT id FROM platform_staff WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM department_staff_assignments dsa
      JOIN platform_staff ps ON ps.id = dsa.staff_id
      WHERE dsa.department_id = department_tasks.department_id
      AND ps.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access integrations"
  ON system_integrations FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Functions

-- دالة إنشاء قسم جديد
CREATE OR REPLACE FUNCTION create_department(
  p_name_ar text,
  p_name_en text,
  p_code text,
  p_description text DEFAULT NULL,
  p_linked_system text DEFAULT 'none',
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dept_id uuid;
BEGIN
  INSERT INTO platform_departments (
    name_ar,
    name_en,
    code,
    description,
    linked_system,
    created_by
  ) VALUES (
    p_name_ar,
    p_name_en,
    p_code,
    p_description,
    p_linked_system,
    p_created_by
  )
  RETURNING id INTO v_dept_id;
  
  RETURN v_dept_id;
END;
$$;

-- دالة منح صلاحية لقسم
CREATE OR REPLACE FUNCTION grant_department_permission(
  p_department_id uuid,
  p_permission_key text,
  p_permission_name_ar text,
  p_granted_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO department_permissions (
    department_id,
    permission_key,
    permission_name_ar,
    is_granted,
    granted_by,
    granted_at
  ) VALUES (
    p_department_id,
    p_permission_key,
    p_permission_name_ar,
    true,
    p_granted_by,
    now()
  )
  ON CONFLICT (department_id, permission_key) 
  DO UPDATE SET
    is_granted = true,
    granted_by = p_granted_by,
    granted_at = now();
END;
$$;

-- دالة تعيين موظف لقسم
CREATE OR REPLACE FUNCTION assign_staff_to_department(
  p_department_id uuid,
  p_staff_id uuid,
  p_role_id uuid DEFAULT NULL,
  p_assigned_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  -- إلغاء التعيين الأساسي السابق
  UPDATE department_staff_assignments
  SET is_primary = false
  WHERE staff_id = p_staff_id
  AND is_primary = true;
  
  -- تعيين جديد
  INSERT INTO department_staff_assignments (
    department_id,
    staff_id,
    role_id,
    is_primary,
    assigned_by
  ) VALUES (
    p_department_id,
    p_staff_id,
    p_role_id,
    true,
    p_assigned_by
  )
  ON CONFLICT (department_id, staff_id, is_primary)
  DO UPDATE SET
    role_id = p_role_id,
    assigned_by = p_assigned_by
  RETURNING id INTO v_assignment_id;
  
  -- تحديث القسم في platform_staff
  UPDATE platform_staff
  SET department = (SELECT code FROM platform_departments WHERE id = p_department_id)
  WHERE id = p_staff_id;
  
  RETURN v_assignment_id;
END;
$$;

-- دالة ربط نظام بقسم
CREATE OR REPLACE FUNCTION integrate_system_with_department(
  p_department_id uuid,
  p_system_code text,
  p_access_level text DEFAULT 'read',
  p_permissions jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_integration_id uuid;
BEGIN
  INSERT INTO system_integrations (
    department_id,
    system_code,
    access_level,
    can_create,
    can_edit,
    can_delete,
    can_approve,
    can_view_reports,
    can_export
  ) VALUES (
    p_department_id,
    p_system_code,
    p_access_level,
    COALESCE((p_permissions->>'can_create')::boolean, false),
    COALESCE((p_permissions->>'can_edit')::boolean, false),
    COALESCE((p_permissions->>'can_delete')::boolean, false),
    COALESCE((p_permissions->>'can_approve')::boolean, false),
    COALESCE((p_permissions->>'can_view_reports')::boolean, false),
    COALESCE((p_permissions->>'can_export')::boolean, false)
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_integration_id;
  
  RETURN v_integration_id;
END;
$$;

-- دالة الحصول على صلاحيات موظف في نظام معين
CREATE OR REPLACE FUNCTION get_staff_system_permissions(
  p_staff_id uuid,
  p_system_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_permissions jsonb;
BEGIN
  SELECT jsonb_build_object(
    'has_access', true,
    'access_level', si.access_level,
    'can_create', si.can_create,
    'can_edit', si.can_edit,
    'can_delete', si.can_delete,
    'can_approve', si.can_approve,
    'can_view_reports', si.can_view_reports,
    'can_export', si.can_export
  ) INTO v_permissions
  FROM department_staff_assignments dsa
  JOIN system_integrations si ON si.department_id = dsa.department_id
  WHERE dsa.staff_id = p_staff_id
  AND si.system_code = p_system_code
  AND si.is_active = true
  AND dsa.is_primary = true
  LIMIT 1;
  
  RETURN COALESCE(v_permissions, '{"has_access": false}'::jsonb);
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_departments_code ON platform_departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_linked_system ON platform_departments(linked_system);
CREATE INDEX IF NOT EXISTS idx_dept_permissions_dept ON department_permissions(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_roles_dept ON department_roles(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_assignments_staff ON department_staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_dept_assignments_dept ON department_staff_assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_tasks_assigned ON department_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_dept_tasks_dept ON department_tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_system_integrations_dept ON system_integrations(department_id);
CREATE INDEX IF NOT EXISTS idx_system_integrations_code ON system_integrations(system_code);

-- إضافة أقسام افتراضية
INSERT INTO platform_departments (name_ar, name_en, code, description, linked_system, system_access_level)
VALUES 
  ('الإدارة العليا', 'Top Management', 'HQ', 'الإدارة العليا للمنصة', 'both', 'full'),
  ('إدارة المزادات', 'Auctions Management', 'AUCTIONS', 'إدارة نظام المزادات والشركات', 'b2b', 'full'),
  ('إدارة المزارع', 'Farms Management', 'FARMS', 'إدارة نظام المزارع والاستثمار', 'b2f', 'full'),
  ('المبيعات والمالية', 'Sales & Finance', 'SALES', 'إدارة المبيعات والعمليات المالية', 'b2f', 'write'),
  ('العمليات التشغيلية', 'Operations', 'OPS', 'إدارة العمليات اليومية', 'b2f', 'write'),
  ('خدمة العملاء', 'Customer Service', 'CS', 'خدمة عملاء المستثمرين', 'both', 'read')
ON CONFLICT (code) DO NOTHING;

-- ربط الأنظمة بالأقسام
DO $$
DECLARE
  v_dept_id uuid;
BEGIN
  -- الإدارة العليا - صلاحيات كاملة على كل شيء
  SELECT id INTO v_dept_id FROM platform_departments WHERE code = 'HQ' LIMIT 1;
  IF v_dept_id IS NOT NULL THEN
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2b_auctions',
      'full',
      '{"can_create": true, "can_edit": true, "can_delete": true, "can_approve": true, "can_view_reports": true, "can_export": true}'::jsonb
    );
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2f_farms',
      'full',
      '{"can_create": true, "can_edit": true, "can_delete": true, "can_approve": true, "can_view_reports": true, "can_export": true}'::jsonb
    );
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2f_operations',
      'full',
      '{"can_create": true, "can_edit": true, "can_delete": true, "can_approve": true, "can_view_reports": true, "can_export": true}'::jsonb
    );
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2f_sales',
      'full',
      '{"can_create": true, "can_edit": true, "can_delete": true, "can_approve": true, "can_view_reports": true, "can_export": true}'::jsonb
    );
  END IF;
  
  -- إدارة المزادات
  SELECT id INTO v_dept_id FROM platform_departments WHERE code = 'AUCTIONS' LIMIT 1;
  IF v_dept_id IS NOT NULL THEN
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2b_auctions',
      'full',
      '{"can_create": true, "can_edit": true, "can_delete": true, "can_approve": true, "can_view_reports": true, "can_export": true}'::jsonb
    );
  END IF;
  
  -- إدارة المزارع
  SELECT id INTO v_dept_id FROM platform_departments WHERE code = 'FARMS' LIMIT 1;
  IF v_dept_id IS NOT NULL THEN
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2f_farms',
      'full',
      '{"can_create": true, "can_edit": true, "can_delete": true, "can_approve": true, "can_view_reports": true, "can_export": true}'::jsonb
    );
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2f_operations',
      'full',
      '{"can_create": true, "can_edit": true, "can_delete": true, "can_approve": true, "can_view_reports": true, "can_export": true}'::jsonb
    );
  END IF;
  
  -- المبيعات والمالية
  SELECT id INTO v_dept_id FROM platform_departments WHERE code = 'SALES' LIMIT 1;
  IF v_dept_id IS NOT NULL THEN
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2f_sales',
      'full',
      '{"can_create": true, "can_edit": true, "can_delete": false, "can_approve": true, "can_view_reports": true, "can_export": true}'::jsonb
    );
  END IF;
  
  -- العمليات التشغيلية
  SELECT id INTO v_dept_id FROM platform_departments WHERE code = 'OPS' LIMIT 1;
  IF v_dept_id IS NOT NULL THEN
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2f_operations',
      'write',
      '{"can_create": true, "can_edit": true, "can_delete": false, "can_approve": false, "can_view_reports": true, "can_export": false}'::jsonb
    );
  END IF;
  
  -- خدمة العملاء
  SELECT id INTO v_dept_id FROM platform_departments WHERE code = 'CS' LIMIT 1;
  IF v_dept_id IS NOT NULL THEN
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2b_auctions',
      'read',
      '{"can_create": false, "can_edit": false, "can_delete": false, "can_approve": false, "can_view_reports": true, "can_export": false}'::jsonb
    );
    PERFORM integrate_system_with_department(
      v_dept_id,
      'b2f_farms',
      'read',
      '{"can_create": false, "can_edit": false, "can_delete": false, "can_approve": false, "can_view_reports": true, "can_export": false}'::jsonb
    );
  END IF;
END $$;
