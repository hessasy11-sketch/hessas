/*
  # نظام الأدوار والصلاحيات المرتبطة بالمزرعة (Farm-Scoped Roles)
  
  ## الغرض
  تطبيق نظام صلاحيات يعتمد على:
  - (user_id + farm_id + role_id)
  - كل مستخدم له دور محدد في كل مزرعة
  - لا يوجد أدوار عامة، كلها مرتبطة بمزرعة
  
  ## الجداول الجديدة
  1. fc_farm_roles - الأدوار المتاحة في المزرعة
  2. fc_farm_role_permissions - صلاحيات كل دور
  3. fc_user_farm_assignments - ربط المستخدم بالمزرعة والدور
  
  ## الأدوار الأساسية
  - farm_manager: مدير المزرعة (صلاحيات كاملة)
  - supervisor: مشرف (إدارة الفرق والمهام)
  - team_leader: قائد فريق
  - technician: فني
  - worker: عامل
*/

-- =============================================================================
-- 1. الأدوار المتاحة في المزرعة
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_farm_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  role_code text NOT NULL UNIQUE,
  role_name_ar text NOT NULL,
  role_name_en text,
  
  description_ar text,
  description_en text,
  
  hierarchy_level integer NOT NULL DEFAULT 5,
  
  is_active boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fc_farm_roles_code ON fc_farm_roles(role_code);
CREATE INDEX idx_fc_farm_roles_level ON fc_farm_roles(hierarchy_level);

-- إدخال الأدوار الأساسية
INSERT INTO fc_farm_roles (role_code, role_name_ar, role_name_en, description_ar, hierarchy_level) VALUES
('farm_manager', 'مدير المزرعة', 'Farm Manager', 'صلاحيات كاملة على المزرعة', 1),
('supervisor', 'مشرف', 'Supervisor', 'إدارة الفرق والمهام', 2),
('team_leader', 'قائد فريق', 'Team Leader', 'قيادة فريق عمل محدد', 3),
('technician', 'فني', 'Technician', 'صيانة وإصلاح', 4),
('worker', 'عامل', 'Worker', 'تنفيذ المهام', 5)
ON CONFLICT (role_code) DO NOTHING;

-- =============================================================================
-- 2. صلاحيات الأدوار
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_farm_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  role_id uuid NOT NULL REFERENCES fc_farm_roles(id) ON DELETE CASCADE,
  
  permission_code text NOT NULL,
  permission_name_ar text NOT NULL,
  
  can_execute boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fc_farm_role_permissions_role ON fc_farm_role_permissions(role_id);
CREATE INDEX idx_fc_farm_role_permissions_code ON fc_farm_role_permissions(permission_code);

-- الصلاحيات الأساسية لكل دور
INSERT INTO fc_farm_role_permissions (role_id, permission_code, permission_name_ar)
SELECT 
  (SELECT id FROM fc_farm_roles WHERE role_code = 'farm_manager'),
  unnest(ARRAY['manage_teams', 'manage_contents', 'manage_equipment', 'manage_finance', 'view_reports', 'manage_facilities', 'assign_tasks', 'approve_requests']),
  unnest(ARRAY['إدارة الفرق', 'إدارة المحتويات', 'إدارة المعدات', 'إدارة المالية', 'عرض التقارير', 'إدارة المنشآت', 'إسناد المهام', 'اعتماد الطلبات'])
ON CONFLICT DO NOTHING;

INSERT INTO fc_farm_role_permissions (role_id, permission_code, permission_name_ar)
SELECT 
  (SELECT id FROM fc_farm_roles WHERE role_code = 'supervisor'),
  unnest(ARRAY['manage_teams', 'assign_tasks', 'view_reports', 'manage_equipment']),
  unnest(ARRAY['إدارة الفرق', 'إسناد المهام', 'عرض التقارير', 'إدارة المعدات'])
ON CONFLICT DO NOTHING;

INSERT INTO fc_farm_role_permissions (role_id, permission_code, permission_name_ar)
SELECT 
  (SELECT id FROM fc_farm_roles WHERE role_code = 'team_leader'),
  unnest(ARRAY['assign_tasks', 'view_reports']),
  unnest(ARRAY['إسناد المهام', 'عرض التقارير'])
ON CONFLICT DO NOTHING;

INSERT INTO fc_farm_role_permissions (role_id, permission_code, permission_name_ar)
SELECT 
  (SELECT id FROM fc_farm_roles WHERE role_code = 'technician'),
  unnest(ARRAY['report_issues', 'update_equipment']),
  unnest(ARRAY['الإبلاغ عن الأعطال', 'تحديث المعدات'])
ON CONFLICT DO NOTHING;

INSERT INTO fc_farm_role_permissions (role_id, permission_code, permission_name_ar)
SELECT 
  (SELECT id FROM fc_farm_roles WHERE role_code = 'worker'),
  unnest(ARRAY['view_tasks', 'update_tasks']),
  unnest(ARRAY['عرض المهام', 'تحديث المهام'])
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. ربط المستخدم بالمزرعة والدور
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_user_farm_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  operational_farm_id uuid NOT NULL REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES fc_farm_roles(id) ON DELETE RESTRICT,
  
  assigned_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  
  is_active boolean NOT NULL DEFAULT true,
  
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, operational_farm_id, role_id)
);

CREATE INDEX idx_fc_user_farm_assignments_user ON fc_user_farm_assignments(user_id);
CREATE INDEX idx_fc_user_farm_assignments_farm ON fc_user_farm_assignments(operational_farm_id);
CREATE INDEX idx_fc_user_farm_assignments_role ON fc_user_farm_assignments(role_id);

-- =============================================================================
-- 4. دوال التحقق من الصلاحيات
-- =============================================================================

-- التحقق: هل المستخدم لديه صلاحية معينة في مزرعة محددة؟
CREATE OR REPLACE FUNCTION check_farm_permission(
  p_user_id uuid,
  p_farm_id uuid,
  p_permission_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM fc_user_farm_assignments ufa
    JOIN fc_farm_role_permissions frp ON ufa.role_id = frp.role_id
    WHERE ufa.user_id = p_user_id
      AND ufa.operational_farm_id = p_farm_id
      AND ufa.is_active = true
      AND frp.permission_code = p_permission_code
      AND frp.can_execute = true
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;

-- الحصول على كل صلاحيات المستخدم في مزرعة محددة
CREATE OR REPLACE FUNCTION get_user_farm_permissions(
  p_user_id uuid,
  p_farm_id uuid
)
RETURNS TABLE (
  permission_code text,
  permission_name_ar text,
  role_name_ar text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    frp.permission_code,
    frp.permission_name_ar,
    fr.role_name_ar
  FROM fc_user_farm_assignments ufa
  JOIN fc_farm_roles fr ON ufa.role_id = fr.id
  JOIN fc_farm_role_permissions frp ON fr.id = frp.role_id
  WHERE ufa.user_id = p_user_id
    AND ufa.operational_farm_id = p_farm_id
    AND ufa.is_active = true
    AND frp.can_execute = true
  ORDER BY frp.permission_code;
END;
$$;

-- الحصول على دور المستخدم في مزرعة محددة
CREATE OR REPLACE FUNCTION get_user_farm_role(
  p_user_id uuid,
  p_farm_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_code text;
BEGIN
  SELECT fr.role_code INTO v_role_code
  FROM fc_user_farm_assignments ufa
  JOIN fc_farm_roles fr ON ufa.role_id = fr.id
  WHERE ufa.user_id = p_user_id
    AND ufa.operational_farm_id = p_farm_id
    AND ufa.is_active = true
  ORDER BY fr.hierarchy_level ASC
  LIMIT 1;
  
  RETURN v_role_code;
END;
$$;

-- تعيين مستخدم لمزرعة مع دور
CREATE OR REPLACE FUNCTION assign_user_to_farm(
  p_user_id uuid,
  p_farm_id uuid,
  p_role_code text,
  p_assigned_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_id uuid;
  v_assignment_id uuid;
BEGIN
  -- الحصول على معرف الدور
  SELECT id INTO v_role_id
  FROM fc_farm_roles
  WHERE role_code = p_role_code AND is_active = true;
  
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role code % not found', p_role_code;
  END IF;
  
  -- إنشاء التعيين
  INSERT INTO fc_user_farm_assignments (
    user_id,
    operational_farm_id,
    role_id,
    assigned_by
  )
  VALUES (
    p_user_id,
    p_farm_id,
    v_role_id,
    p_assigned_by
  )
  ON CONFLICT (user_id, operational_farm_id, role_id) 
  DO UPDATE SET 
    is_active = true,
    assigned_at = now()
  RETURNING id INTO v_assignment_id;
  
  -- إضافة حدث في المزرعة
  PERFORM add_farm_event(
    p_farm_id,
    'user_assigned',
    'تعيين مستخدم جديد',
    'تم تعيين مستخدم بدور ' || p_role_code,
    'info',
    p_assigned_by
  );
  
  RETURN v_assignment_id;
END;
$$;

-- =============================================================================
-- 5. Triggers
-- =============================================================================

CREATE TRIGGER fc_farm_roles_updated_at BEFORE UPDATE ON fc_farm_roles
  FOR EACH ROW EXECUTE FUNCTION update_fc_updated_at();

CREATE TRIGGER fc_user_farm_assignments_updated_at BEFORE UPDATE ON fc_user_farm_assignments
  FOR EACH ROW EXECUTE FUNCTION update_fc_updated_at();

-- =============================================================================
-- 6. RLS Policies
-- =============================================================================

ALTER TABLE fc_farm_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_farm_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_user_farm_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view farm roles" ON fc_farm_roles FOR SELECT USING (true);
CREATE POLICY "Anyone can view role permissions" ON fc_farm_role_permissions FOR SELECT USING (true);

CREATE POLICY "Staff can view farm assignments" ON fc_user_farm_assignments FOR SELECT USING (true);
CREATE POLICY "Staff can manage farm assignments" ON fc_user_farm_assignments FOR ALL USING (true);

COMMENT ON TABLE fc_farm_roles IS 'الأدوار المتاحة في المزرعة';
COMMENT ON TABLE fc_farm_role_permissions IS 'صلاحيات كل دور';
COMMENT ON TABLE fc_user_farm_assignments IS 'ربط المستخدم بالمزرعة والدور';
COMMENT ON FUNCTION check_farm_permission(uuid, uuid, text) IS 'التحقق من صلاحية مستخدم في مزرعة';
COMMENT ON FUNCTION get_user_farm_permissions(uuid, uuid) IS 'الحصول على كل صلاحيات المستخدم في مزرعة';
COMMENT ON FUNCTION get_user_farm_role(uuid, uuid) IS 'الحصول على دور المستخدم في مزرعة';
COMMENT ON FUNCTION assign_user_to_farm(uuid, uuid, text, uuid) IS 'تعيين مستخدم لمزرعة مع دور';