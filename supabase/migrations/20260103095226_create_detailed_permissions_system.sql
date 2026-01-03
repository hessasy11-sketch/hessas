/*
  # نظام الصلاحيات التفصيلية الشامل

  1. الجداول الجديدة
    - `role_definitions`: تعريف الأدوار بشكل تفصيلي
    - `role_access_settings`: إعدادات الدخول لكل دور (Barcode/PIN)
    - `role_operational_permissions`: الصلاحيات التشغيلية (المهام)
    - `role_scope_permissions`: نطاق الصلاحيات (الأقسام/المستويات)

  2. الأمان
    - RLS مُفعّل على جميع الجداول
    - صلاحيات للإدارة العليا فقط
*/

-- جدول تعريف الأدوار
CREATE TABLE IF NOT EXISTS role_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text UNIQUE NOT NULL,
  role_name_ar text NOT NULL,
  role_name_en text NOT NULL,
  description text,
  hierarchy_level integer NOT NULL DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إعدادات الدخول لكل دور
CREATE TABLE IF NOT EXISTS role_access_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text UNIQUE NOT NULL REFERENCES role_definitions(role_key) ON DELETE CASCADE,
  requires_qr boolean DEFAULT true,
  requires_pin boolean DEFAULT false,
  allow_image_upload boolean DEFAULT true,
  allow_camera_scan boolean DEFAULT true,
  bind_first_device boolean DEFAULT false,
  session_duration_minutes integer DEFAULT 30,
  idle_timeout_minutes integer DEFAULT 30,
  allow_multi_device boolean DEFAULT false,
  qr_type text DEFAULT 'permanent' CHECK (qr_type IN ('permanent', 'temporary', 'both')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- الصلاحيات التشغيلية (المهام)
CREATE TABLE IF NOT EXISTS role_operational_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text NOT NULL REFERENCES role_definitions(role_key) ON DELETE CASCADE,
  permission_key text NOT NULL,
  permission_name_ar text NOT NULL,
  permission_category text NOT NULL,
  can_create boolean DEFAULT false,
  can_view boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  can_reject boolean DEFAULT false,
  can_assign boolean DEFAULT false,
  can_upload_proof boolean DEFAULT false,
  can_review_reports boolean DEFAULT false,
  can_send_to_management boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role_key, permission_key)
);

-- نطاق الصلاحيات
CREATE TABLE IF NOT EXISTS role_scope_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text NOT NULL REFERENCES role_definitions(role_key) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('platform', 'section', 'farm', 'auction')),
  scope_value text,
  applies_to_all boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role_key, scope_type, scope_value)
);

-- إدراج الأدوار الأساسية
INSERT INTO role_definitions (role_key, role_name_ar, role_name_en, description, hierarchy_level)
VALUES
  ('platform_owner', 'مالك المنصة', 'Platform Owner', 'صلاحيات كاملة على جميع الأقسام', 1),
  ('super_admin', 'مدير عام', 'Super Admin', 'صلاحيات إدارية واسعة', 2),
  ('general_manager', 'المدير العام', 'General Manager', 'إدارة عامة للمنصة', 3),
  ('section_manager', 'مدير قسم', 'Section Manager', 'إدارة قسم محدد', 4),
  ('farm_manager', 'مدير مزرعة', 'Farm Manager', 'إدارة مزرعة محددة', 5),
  ('farm_supervisor', 'مشرف مزرعة', 'Farm Supervisor', 'الإشراف على العمليات', 6),
  ('operations_supervisor', 'مشرف عمليات', 'Operations Supervisor', 'الإشراف على المهام', 7),
  ('task_executor', 'منفذ مهام', 'Task Executor', 'تنفيذ المهام المُكلف بها', 8),
  ('viewer', 'مشاهد', 'Viewer', 'عرض البيانات فقط', 9)
ON CONFLICT (role_key) DO NOTHING;

-- إعدادات الدخول الافتراضية
INSERT INTO role_access_settings (role_key, requires_qr, requires_pin, session_duration_minutes, qr_type)
VALUES
  ('platform_owner', true, true, 60, 'permanent'),
  ('super_admin', true, true, 60, 'permanent'),
  ('general_manager', true, true, 60, 'permanent'),
  ('section_manager', true, true, 45, 'permanent'),
  ('farm_manager', true, true, 45, 'permanent'),
  ('farm_supervisor', true, false, 30, 'both'),
  ('operations_supervisor', true, false, 30, 'both'),
  ('task_executor', true, false, 30, 'temporary'),
  ('viewer', true, false, 30, 'temporary')
ON CONFLICT (role_key) DO NOTHING;

-- الصلاحيات التشغيلية للإدارة العليا
INSERT INTO role_operational_permissions (role_key, permission_key, permission_name_ar, permission_category, can_create, can_view, can_edit, can_delete, can_approve, can_reject, can_assign, can_upload_proof, can_review_reports, can_send_to_management)
VALUES
  ('platform_owner', 'manage_users', 'إدارة المستخدمين', 'users', true, true, true, true, true, true, true, false, true, false),
  ('platform_owner', 'manage_roles', 'إدارة الأدوار', 'roles', true, true, true, true, true, true, true, false, true, false),
  ('platform_owner', 'manage_farms', 'إدارة المزارع', 'farms', true, true, true, true, true, true, true, false, true, false),
  ('platform_owner', 'manage_operations', 'إدارة العمليات', 'operations', true, true, true, true, true, true, true, true, true, false),
  ('platform_owner', 'manage_tasks', 'إدارة المهام', 'tasks', true, true, true, true, true, true, true, true, true, false),
  ('platform_owner', 'manage_reports', 'إدارة التقارير', 'reports', true, true, true, true, true, true, true, false, true, false),
  ('platform_owner', 'manage_auctions', 'إدارة المزادات', 'auctions', true, true, true, true, true, true, true, false, true, false),
  ('general_manager', 'manage_users', 'إدارة المستخدمين', 'users', false, true, true, false, true, true, true, false, true, false),
  ('general_manager', 'manage_farms', 'إدارة المزارع', 'farms', true, true, true, false, true, true, true, false, true, false),
  ('general_manager', 'manage_operations', 'إدارة العمليات', 'operations', true, true, true, false, true, true, true, false, true, false),
  ('general_manager', 'manage_tasks', 'إدارة المهام', 'tasks', true, true, true, true, true, true, true, false, true, true),
  ('general_manager', 'manage_reports', 'إدارة التقارير', 'reports', true, true, true, false, true, false, false, false, true, true),
  ('section_manager', 'manage_farms', 'إدارة المزارع', 'farms', true, true, true, false, true, true, true, false, true, true),
  ('section_manager', 'manage_operations', 'إدارة العمليات', 'operations', true, true, true, false, true, true, true, false, true, true),
  ('section_manager', 'manage_tasks', 'إدارة المهام', 'tasks', true, true, true, true, true, true, true, false, true, true),
  ('section_manager', 'manage_reports', 'إدارة التقارير', 'reports', true, true, false, false, false, false, false, false, true, true),
  ('farm_manager', 'manage_operations', 'إدارة العمليات', 'operations', true, true, true, false, true, true, true, true, true, true),
  ('farm_manager', 'manage_tasks', 'إدارة المهام', 'tasks', true, true, true, true, true, true, true, true, true, true),
  ('farm_manager', 'manage_team', 'إدارة الفريق', 'team', false, true, true, false, false, false, true, false, false, false),
  ('farm_supervisor', 'manage_operations', 'إدارة العمليات', 'operations', false, true, true, false, true, false, true, true, true, true),
  ('farm_supervisor', 'manage_tasks', 'إدارة المهام', 'tasks', false, true, true, false, true, false, true, true, true, true),
  ('operations_supervisor', 'manage_operations', 'إدارة العمليات', 'operations', false, true, false, false, true, false, false, true, false, false),
  ('operations_supervisor', 'manage_tasks', 'إدارة المهام', 'tasks', false, true, false, false, true, false, false, true, false, false),
  ('task_executor', 'execute_tasks', 'تنفيذ المهام', 'tasks', false, true, false, false, false, false, false, true, false, false),
  ('viewer', 'view_data', 'عرض البيانات', 'general', false, true, false, false, false, false, false, false, false, false)
ON CONFLICT (role_key, permission_key) DO NOTHING;

-- نطاق الصلاحيات الافتراضي
INSERT INTO role_scope_permissions (role_key, scope_type, applies_to_all)
VALUES
  ('platform_owner', 'platform', true),
  ('super_admin', 'platform', true),
  ('general_manager', 'platform', true)
ON CONFLICT (role_key, scope_type, scope_value) DO NOTHING;

-- تفعيل RLS
ALTER TABLE role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_access_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_operational_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_scope_permissions ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة
CREATE POLICY "Anyone can read role definitions"
  ON role_definitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read role access settings"
  ON role_access_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read role operational permissions"
  ON role_operational_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read role scope permissions"
  ON role_scope_permissions FOR SELECT
  TO authenticated
  USING (true);

-- سياسات الكتابة
CREATE POLICY "Only admins can manage role definitions"
  ON role_definitions FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Only admins can manage role access settings"
  ON role_access_settings FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Only admins can manage role operational permissions"
  ON role_operational_permissions FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Only admins can manage role scope permissions"
  ON role_scope_permissions FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_role_definitions_updated_at
  BEFORE UPDATE ON role_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_access_settings_updated_at
  BEFORE UPDATE ON role_access_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_operational_permissions_updated_at
  BEFORE UPDATE ON role_operational_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_scope_permissions_updated_at
  BEFORE UPDATE ON role_scope_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- دالة للحصول على الصلاحيات الكاملة
CREATE OR REPLACE FUNCTION get_role_full_permissions(p_role_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'definition', (SELECT row_to_json(rd.*) FROM role_definitions rd WHERE rd.role_key = p_role_key),
    'access_settings', (SELECT row_to_json(ras.*) FROM role_access_settings ras WHERE ras.role_key = p_role_key),
    'operational_permissions', (SELECT jsonb_agg(row_to_json(rop.*)) FROM role_operational_permissions rop WHERE rop.role_key = p_role_key),
    'scope_permissions', (SELECT jsonb_agg(row_to_json(rsp.*)) FROM role_scope_permissions rsp WHERE rsp.role_key = p_role_key)
  ) INTO result;

  RETURN result;
END;
$$;

-- دالة للتحقق من صلاحية
CREATE OR REPLACE FUNCTION check_role_permission(p_role_key text, p_permission_key text, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_permission boolean;
BEGIN
  SELECT
    CASE p_action
      WHEN 'create' THEN can_create
      WHEN 'view' THEN can_view
      WHEN 'edit' THEN can_edit
      WHEN 'delete' THEN can_delete
      WHEN 'approve' THEN can_approve
      WHEN 'reject' THEN can_reject
      WHEN 'assign' THEN can_assign
      WHEN 'upload_proof' THEN can_upload_proof
      WHEN 'review_reports' THEN can_review_reports
      WHEN 'send_to_management' THEN can_send_to_management
      ELSE false
    END
  INTO has_permission
  FROM role_operational_permissions
  WHERE role_key = p_role_key AND permission_key = p_permission_key;

  RETURN COALESCE(has_permission, false);
END;
$$;