/*
  # إنشاء نظام كتالوج الأدوار - Authority Roles Catalog

  ## النطاق
  - صفحة: /admin/operations-room → Authority Panel
  - الهدف: إنشاء مصدر موحد للأدوار الإدارية

  ## الجداول الجديدة

  ### `authority_roles_catalog`
  - `role_code` (text, primary key) - كود الدور (مثل: GM, B2F_ASSISTANT)
  - `role_name_ar` (text) - اسم الدور بالعربية
  - `role_name_en` (text) - اسم الدور بالإنجليزية
  - `department` (text, nullable) - القسم (b2f, b2b, finance, marketing, operations, null للأدوار العامة)
  - `level` (int) - مستوى الدور (1=أعلى, 10=أدنى)
  - `description_ar` (text) - وصف الدور بالعربية
  - `description_en` (text) - وصف الدور بالإنجليزية
  - `is_active` (boolean) - هل الدور نشط
  - `requires_invitation` (boolean) - هل يحتاج دعوة لتفعيله
  - `max_assignments` (int, nullable) - عدد التعيينات القصوى (null = غير محدود)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## الأمان
  - RLS enabled
  - القراءة: للجميع المصادق عليهم
  - الكتابة: للمسؤولين فقط

  ## البيانات الأولية
  - إدراج 12 دور أساسي
*/

-- إنشاء جدول كتالوج الأدوار
CREATE TABLE IF NOT EXISTS authority_roles_catalog (
  role_code text PRIMARY KEY,
  role_name_ar text NOT NULL,
  role_name_en text NOT NULL,
  department text CHECK (department IN ('b2f', 'b2b', 'finance', 'marketing', 'operations', 'general')),
  level int NOT NULL DEFAULT 5,
  description_ar text,
  description_en text,
  is_active boolean DEFAULT true,
  requires_invitation boolean DEFAULT false,
  max_assignments int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE authority_roles_catalog ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الجميع يمكنهم القراءة
CREATE POLICY "Anyone can view authority roles"
  ON authority_roles_catalog
  FOR SELECT
  USING (true);

-- سياسة الكتابة: المسؤولين فقط
CREATE POLICY "Only admins can manage roles"
  ON authority_roles_catalog
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'general_manager')
    )
  );

-- إدراج الأدوار الأساسية
INSERT INTO authority_roles_catalog
  (role_code, role_name_ar, role_name_en, department, level, description_ar, description_en, requires_invitation, max_assignments)
VALUES
  -- الإدارة العليا
  ('GM', 'المدير العام', 'General Manager', 'general', 1, 'أعلى سلطة تنفيذية في المنصة', 'Highest executive authority in the platform', true, 1),

  -- قسم استثمار المزارع B2F
  ('B2F_ASSISTANT', 'مساعد استثمار المزارع', 'B2F Assistant', 'b2f', 3, 'مساعد في إدارة عمليات استثمار المزارع', 'Assistant in farm investment operations management', false, 2),
  ('NATIONAL_FARM_DIRECTOR', 'مدير المزارع الوطني', 'National Farm Director', 'b2f', 2, 'مدير جميع المزارع على مستوى الدولة', 'Director of all farms nationwide', true, 1),
  ('FARM_MANAGER', 'مدير مزرعة', 'Farm Manager', 'operations', 4, 'مدير عمليات مزرعة معينة', 'Manager of specific farm operations', false, null),
  ('AGRONOMIST_ENGINEER', 'مهندس زراعي', 'Agronomist Engineer', 'operations', 5, 'متخصص في الشؤون الزراعية والإنتاج', 'Specialist in agricultural affairs and production', false, null),
  ('FIELD_SUPERVISOR', 'مشرف ميداني', 'Field Supervisor', 'operations', 6, 'مشرف على العمليات الحقلية', 'Supervisor of field operations', false, null),
  ('TECHNICIAN', 'فني', 'Technician', 'operations', 7, 'فني صيانة ودعم', 'Maintenance and support technician', false, null),
  ('WORKER', 'عامل', 'Worker', 'operations', 8, 'عامل في المزرعة', 'Farm worker', false, null),

  -- قسم مزاد الشركات B2B
  ('B2B_ASSISTANT', 'مساعد مزاد الشركات', 'B2B Assistant', 'b2b', 3, 'مساعد في إدارة عمليات المزادات', 'Assistant in auction operations management', false, 2),

  -- الأقسام المساندة
  ('FINANCE_MANAGER', 'مدير مالي', 'Finance Manager', 'finance', 3, 'مدير العمليات المالية والمحاسبية', 'Financial and accounting operations manager', false, 2),
  ('MARKETING_LEAD', 'رئيس التسويق', 'Marketing Lead', 'marketing', 3, 'رئيس قسم التسويق والعلاقات', 'Head of marketing and relations', false, 2),

  -- اختياري
  ('FACTORY_SUPERVISOR', 'مشرف مصنع', 'Factory Supervisor', 'operations', 5, 'مشرف على عمليات المصنع', 'Factory operations supervisor', false, null)
ON CONFLICT (role_code) DO NOTHING;

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_authority_roles_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger
DROP TRIGGER IF EXISTS authority_roles_catalog_updated_at ON authority_roles_catalog;
CREATE TRIGGER authority_roles_catalog_updated_at
  BEFORE UPDATE ON authority_roles_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_authority_roles_catalog_updated_at();

-- إنشاء دالة للحصول على الأدوار النشطة
CREATE OR REPLACE FUNCTION get_active_authority_roles(p_department text DEFAULT NULL)
RETURNS TABLE (
  role_code text,
  role_name_ar text,
  role_name_en text,
  department text,
  level int,
  description_ar text,
  requires_invitation boolean,
  current_assignments bigint,
  max_assignments int
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.role_code,
    r.role_name_ar,
    r.role_name_en,
    r.department,
    r.level,
    r.description_ar,
    r.requires_invitation,
    COUNT(a.id) FILTER (WHERE a.is_active = true AND a.is_suspended = false) as current_assignments,
    r.max_assignments
  FROM authority_roles_catalog r
  LEFT JOIN authority_assignments a ON a.authority_role = r.role_code
  WHERE r.is_active = true
    AND (p_department IS NULL OR r.department = p_department OR r.department = 'general')
  GROUP BY r.role_code, r.role_name_ar, r.role_name_en, r.department, r.level, r.description_ar, r.requires_invitation, r.max_assignments
  ORDER BY r.level ASC, r.role_name_ar ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليقات على الجدول والأعمدة
COMMENT ON TABLE authority_roles_catalog IS 'كتالوج الأدوار الإدارية المعتمدة في المنصة - Authority Roles Catalog';
COMMENT ON COLUMN authority_roles_catalog.role_code IS 'كود الدور الفريد (مثل: GM, B2F_ASSISTANT)';
COMMENT ON COLUMN authority_roles_catalog.requires_invitation IS 'هل يحتاج الدور إلى دعوة خاصة لتفعيله';
COMMENT ON COLUMN authority_roles_catalog.max_assignments IS 'الحد الأقصى للتعيينات المسموح بها (null = غير محدود)';