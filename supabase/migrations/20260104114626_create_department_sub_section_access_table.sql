/*
  # نظام الصلاحيات المتقدمة للأقسام
  
  1. جداول جديدة:
    - `department_sub_section_access`: ربط متعدد بين الأقسام والأقسام الفرعية مع صلاحيات تفصيلية
  
  2. الصلاحيات:
    - مستويات وصول متعددة (read, write, full, admin)
    - صلاحيات تفصيلية (إدارة البيانات، التقارير، التصدير)
    - نظام الأولويات
    - إعدادات الإشعارات
  
  3. الأمان:
    - RLS مفعل على الجدول
    - صلاحيات قراءة للموظفين
    - صلاحيات كتابة للإداريين فقط
*/

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS department_sub_section_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code text NOT NULL REFERENCES platform_departments(code) ON DELETE CASCADE,
  sub_section_id uuid NOT NULL REFERENCES sub_sections(id) ON DELETE CASCADE,
  
  -- مستوى الوصول
  access_level text NOT NULL DEFAULT 'write' CHECK (access_level IN ('read', 'write', 'full', 'admin')),
  
  -- الصلاحيات التفصيلية
  can_manage_data boolean NOT NULL DEFAULT true,
  can_view_reports boolean NOT NULL DEFAULT true,
  can_export_data boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  
  -- الأولويات والترتيب
  priority integer NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  
  -- إعدادات الإشعارات
  enable_notifications boolean NOT NULL DEFAULT true,
  notification_priority text NOT NULL DEFAULT 'normal' CHECK (notification_priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- التوقيت
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES platform_staff(id),
  
  -- فهرس فريد لكل ربط
  UNIQUE(department_code, sub_section_id)
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_dept_subsection_dept ON department_sub_section_access(department_code);
CREATE INDEX IF NOT EXISTS idx_dept_subsection_sub ON department_sub_section_access(sub_section_id);
CREATE INDEX IF NOT EXISTS idx_dept_subsection_priority ON department_sub_section_access(priority);
CREATE INDEX IF NOT EXISTS idx_dept_subsection_active ON department_sub_section_access(is_active);

-- تفعيل RLS
ALTER TABLE department_sub_section_access ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة - يمكن للموظفين قراءة صلاحياتهم
CREATE POLICY "Staff can view their department access"
  ON department_sub_section_access
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.department = department_sub_section_access.department_code
    )
  );

-- سياسات الإدارة - الإداريون فقط
CREATE POLICY "Admins can manage department access"
  ON department_sub_section_access
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.role IN ('super_admin', 'admin')
    )
  );

-- دالة للحصول على صلاحيات قسم معين
CREATE OR REPLACE FUNCTION get_department_access_permissions(p_department_code text)
RETURNS TABLE (
  sub_section_id uuid,
  sub_section_name text,
  sub_section_route text,
  access_level text,
  can_manage_data boolean,
  can_view_reports boolean,
  can_export_data boolean,
  priority integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dsa.sub_section_id,
    ss.name_ar,
    ss.route_path,
    dsa.access_level,
    dsa.can_manage_data,
    dsa.can_view_reports,
    dsa.can_export_data,
    dsa.priority
  FROM department_sub_section_access dsa
  JOIN sub_sections ss ON ss.id = dsa.sub_section_id
  WHERE dsa.department_code = p_department_code
    AND dsa.is_active = true
  ORDER BY dsa.priority ASC;
END;
$$;

-- دالة للحصول على القسم الفرعي ذو الأولوية الأعلى
CREATE OR REPLACE FUNCTION get_primary_sub_section_for_department(p_department_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub_section_id uuid;
BEGIN
  SELECT sub_section_id INTO v_sub_section_id
  FROM department_sub_section_access
  WHERE department_code = p_department_code
    AND is_active = true
  ORDER BY priority ASC
  LIMIT 1;
  
  RETURN v_sub_section_id;
END;
$$;

-- دالة للتحقق من صلاحية معينة
CREATE OR REPLACE FUNCTION check_department_permission(
  p_department_code text,
  p_sub_section_id uuid,
  p_permission text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean := false;
BEGIN
  CASE p_permission
    WHEN 'manage_data' THEN
      SELECT can_manage_data INTO v_has_permission
      FROM department_sub_section_access
      WHERE department_code = p_department_code
        AND sub_section_id = p_sub_section_id
        AND is_active = true;
    
    WHEN 'view_reports' THEN
      SELECT can_view_reports INTO v_has_permission
      FROM department_sub_section_access
      WHERE department_code = p_department_code
        AND sub_section_id = p_sub_section_id
        AND is_active = true;
    
    WHEN 'export_data' THEN
      SELECT can_export_data INTO v_has_permission
      FROM department_sub_section_access
      WHERE department_code = p_department_code
        AND sub_section_id = p_sub_section_id
        AND is_active = true;
    
    ELSE
      v_has_permission := false;
  END CASE;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- تحديث تلقائي لـ updated_at
CREATE OR REPLACE FUNCTION update_department_access_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_dept_access_timestamp
  BEFORE UPDATE ON department_sub_section_access
  FOR EACH ROW
  EXECUTE FUNCTION update_department_access_timestamp();

COMMENT ON TABLE department_sub_section_access IS 'نظام الصلاحيات المتقدمة للأقسام - يسمح بربط قسم واحد بعدة أقسام فرعية مع صلاحيات تفصيلية';
COMMENT ON FUNCTION get_department_access_permissions IS 'الحصول على جميع صلاحيات قسم معين مع الأقسام الفرعية المرتبطة';
COMMENT ON FUNCTION check_department_permission IS 'التحقق من صلاحية محددة لقسم في قسم فرعي';
