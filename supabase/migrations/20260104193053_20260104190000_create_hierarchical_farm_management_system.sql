/*
  # نظام إدارة المزارع الهيراركي

  1. الجداول الجديدة
    - `farm_directors` - مديرو المزارع (إدارة عدة مزارع)
      - id (uuid)
      - staff_id (uuid) - ربط بجدول platform_staff
      - name_ar (text)
      - name_en (text)
      - phone (text)
      - email (text)
      - is_active (boolean)
      - created_at (timestamptz)

    - `farm_staff_hierarchy` - الهيكل التنظيمي للمزرعة
      - id (uuid)
      - farm_id (uuid) - المزرعة التابع لها
      - staff_id (uuid) - ربط بجدول platform_staff
      - role (text) - farm_manager, supervisor, engineer, staff, worker
      - reports_to (uuid) - التبعية (من هو المدير المباشر)
      - name_ar (text)
      - name_en (text)
      - phone (text)
      - email (text)
      - hire_date (date)
      - is_active (boolean)
      - created_at (timestamptz)

  2. التحديثات على الجداول الموجودة
    - إضافة `farm_director_id` في جدول `b2f_farms`
    - إضافة `farm_manager_id` في جدول `b2f_farms`

  3. الأمان
    - RLS على جميع الجداول
    - صلاحيات للإدارة العليا فقط
*/

-- جدول مديري المزارع
CREATE TABLE IF NOT EXISTS farm_directors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_en text,
  phone text NOT NULL,
  email text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول الهيكل التنظيمي للمزرعة
CREATE TABLE IF NOT EXISTS farm_staff_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE NOT NULL,
  staff_id uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('farm_manager', 'supervisor', 'engineer', 'staff', 'worker')),
  reports_to uuid REFERENCES farm_staff_hierarchy(id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_en text,
  phone text NOT NULL,
  email text,
  hire_date date DEFAULT CURRENT_DATE,
  salary numeric(10,2),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة أعمدة للمزارع
ALTER TABLE b2f_farms
ADD COLUMN IF NOT EXISTS farm_director_id uuid REFERENCES farm_directors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS farm_manager_id uuid REFERENCES farm_staff_hierarchy(id) ON DELETE SET NULL;

-- الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_farm_directors_staff_id ON farm_directors(staff_id);
CREATE INDEX IF NOT EXISTS idx_farm_directors_is_active ON farm_directors(is_active);

CREATE INDEX IF NOT EXISTS idx_farm_staff_hierarchy_farm_id ON farm_staff_hierarchy(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_staff_hierarchy_staff_id ON farm_staff_hierarchy(staff_id);
CREATE INDEX IF NOT EXISTS idx_farm_staff_hierarchy_role ON farm_staff_hierarchy(role);
CREATE INDEX IF NOT EXISTS idx_farm_staff_hierarchy_reports_to ON farm_staff_hierarchy(reports_to);

CREATE INDEX IF NOT EXISTS idx_b2f_farms_director_id ON b2f_farms(farm_director_id);
CREATE INDEX IF NOT EXISTS idx_b2f_farms_manager_id ON b2f_farms(farm_manager_id);

-- RLS Policies
ALTER TABLE farm_directors ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_staff_hierarchy ENABLE ROW LEVEL SECURITY;

-- سياسات مديري المزارع
CREATE POLICY "Platform admins can view farm directors"
  ON farm_directors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

CREATE POLICY "Platform admins can insert farm directors"
  ON farm_directors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

CREATE POLICY "Platform admins can update farm directors"
  ON farm_directors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

CREATE POLICY "Platform admins can delete farm directors"
  ON farm_directors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

-- سياسات موظفي المزرعة
CREATE POLICY "Platform admins and farm managers can view farm staff"
  ON farm_staff_hierarchy FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND (
        platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
        OR farm_staff_hierarchy.staff_id = platform_staff.id
      )
    )
  );

CREATE POLICY "Platform admins can insert farm staff"
  ON farm_staff_hierarchy FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

CREATE POLICY "Platform admins can update farm staff"
  ON farm_staff_hierarchy FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

CREATE POLICY "Platform admins can delete farm staff"
  ON farm_staff_hierarchy FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

-- دالة لجلب التسلسل الهرمي للمزرعة
CREATE OR REPLACE FUNCTION get_farm_hierarchy(p_farm_id uuid)
RETURNS TABLE (
  id uuid,
  farm_id uuid,
  staff_id uuid,
  role text,
  reports_to uuid,
  name_ar text,
  name_en text,
  phone text,
  email text,
  hire_date date,
  level int,
  path text
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    -- المستوى الأول (مدير المزرعة)
    SELECT
      fsh.id,
      fsh.farm_id,
      fsh.staff_id,
      fsh.role,
      fsh.reports_to,
      fsh.name_ar,
      fsh.name_en,
      fsh.phone,
      fsh.email,
      fsh.hire_date,
      1 as level,
      fsh.name_ar::text as path
    FROM farm_staff_hierarchy fsh
    WHERE fsh.farm_id = p_farm_id
    AND fsh.reports_to IS NULL
    AND fsh.is_active = true

    UNION ALL

    -- المستويات التالية
    SELECT
      fsh.id,
      fsh.farm_id,
      fsh.staff_id,
      fsh.role,
      fsh.reports_to,
      fsh.name_ar,
      fsh.name_en,
      fsh.phone,
      fsh.email,
      fsh.hire_date,
      h.level + 1,
      h.path || ' > ' || fsh.name_ar
    FROM farm_staff_hierarchy fsh
    INNER JOIN hierarchy h ON fsh.reports_to = h.id
    WHERE fsh.is_active = true
  )
  SELECT * FROM hierarchy
  ORDER BY level, name_ar;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإحصائيات مدير المزارع
CREATE OR REPLACE FUNCTION get_director_statistics(p_director_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_farms', COUNT(DISTINCT bf.id),
    'active_farms', COUNT(DISTINCT bf.id) FILTER (WHERE bf.is_active = true),
    'total_staff', COUNT(DISTINCT fsh.id),
    'total_opportunities', COUNT(DISTINCT bo.id),
    'total_operations', COUNT(DISTINCT fo.id)
  ) INTO result
  FROM farm_directors fd
  LEFT JOIN b2f_farms bf ON bf.farm_director_id = fd.id
  LEFT JOIN farm_staff_hierarchy fsh ON fsh.farm_id = bf.id AND fsh.is_active = true
  LEFT JOIN b2f_opportunities bo ON bo.farm_id = bf.id
  LEFT JOIN b2f_farm_operations fo ON fo.farm_id = bf.id AND fo.is_active = true
  WHERE fd.id = p_director_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإحصائيات المزرعة
CREATE OR REPLACE FUNCTION get_farm_staff_statistics(p_farm_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_staff', COUNT(*),
    'farm_managers', COUNT(*) FILTER (WHERE role = 'farm_manager'),
    'supervisors', COUNT(*) FILTER (WHERE role = 'supervisor'),
    'engineers', COUNT(*) FILTER (WHERE role = 'engineer'),
    'staff', COUNT(*) FILTER (WHERE role = 'staff'),
    'workers', COUNT(*) FILTER (WHERE role = 'worker')
  ) INTO result
  FROM farm_staff_hierarchy
  WHERE farm_id = p_farm_id AND is_active = true;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- سجل التدقيق للتغييرات
CREATE TABLE IF NOT EXISTS farm_management_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  performed_by uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farm_audit_entity ON farm_management_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_farm_audit_created_at ON farm_management_audit_log(created_at DESC);

-- RLS لسجل التدقيق
ALTER TABLE farm_management_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view audit log"
  ON farm_management_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

-- Trigger لتسجيل التغييرات
CREATE OR REPLACE FUNCTION log_farm_management_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO farm_management_audit_log (action_type, entity_type, entity_id, details)
    VALUES ('INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW)::jsonb);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO farm_management_audit_log (action_type, entity_type, entity_id, details)
    VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO farm_management_audit_log (action_type, entity_type, entity_id, details)
    VALUES ('DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD)::jsonb);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER farm_directors_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON farm_directors
  FOR EACH ROW EXECUTE FUNCTION log_farm_management_changes();

CREATE TRIGGER farm_staff_hierarchy_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON farm_staff_hierarchy
  FOR EACH ROW EXECUTE FUNCTION log_farm_management_changes();
