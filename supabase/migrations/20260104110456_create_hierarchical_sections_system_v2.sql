/*
  # نظام الأقسام الهرمي المتعدد المستويات
  
  1. الجداول الجديدة:
    - main_sections: الأقسام الرئيسية (B2F, Auctions)
    - sub_sections: الأقسام الفرعية تحت كل قسم رئيسي (Sales, Finance, Operations, etc.)
  
  2. التحديثات:
    - ربط platform_departments بـ sub_sections
    - نظام توجيه ذكي حسب القسم الفرعي
  
  3. الأمان:
    - RLS على جميع الجداول
    - صلاحيات الإدارة فقط للمدراء
*/

-- جدول الأقسام الرئيسية (B2F, Auctions, etc.)
CREATE TABLE IF NOT EXISTS main_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text,
  icon text,
  base_route text NOT NULL,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- جدول الأقسام الفرعية تحت كل قسم رئيسي
CREATE TABLE IF NOT EXISTS sub_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_section_id uuid REFERENCES main_sections(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_ar text NOT NULL,
  name_en text,
  icon text,
  tab_name text NOT NULL,
  route_path text NOT NULL,
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(main_section_id, code)
);

-- إضافة sub_section_id إلى platform_departments
ALTER TABLE platform_departments 
  DROP COLUMN IF EXISTS sub_section_id;

ALTER TABLE platform_departments 
  ADD COLUMN sub_section_id uuid REFERENCES sub_sections(id) ON DELETE SET NULL;

-- إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_sub_sections_main_section ON sub_sections(main_section_id);
CREATE INDEX IF NOT EXISTS idx_departments_sub_section ON platform_departments(sub_section_id);

-- RLS Policies لـ main_sections
ALTER TABLE main_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active main sections"
  ON main_sections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role full access main sections"
  ON main_sections FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- RLS Policies لـ sub_sections
ALTER TABLE sub_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sub sections"
  ON sub_sections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role full access sub sections"
  ON sub_sections FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- إدخال الأقسام الرئيسية
INSERT INTO main_sections (code, name_ar, name_en, icon, base_route, display_order) VALUES
  ('b2f', 'استثمار أشجار المزارع', 'Farm Investment', '🌳', '/b2f-admin', 1),
  ('auctions', 'مزاد الشركات', 'Company Auctions', '🏢', '/admin', 2)
ON CONFLICT (code) DO NOTHING;

-- إدخال الأقسام الفرعية لـ B2F
INSERT INTO sub_sections (main_section_id, code, name_ar, name_en, icon, tab_name, route_path, display_order)
SELECT 
  (SELECT id FROM main_sections WHERE code = 'b2f'),
  code, name_ar, name_en, icon, tab_name, route_path, display_order
FROM (VALUES
  ('farms', 'إدارة المزارع', 'Farms Management', '🌾', 'farms', '/b2f-admin?tab=farms', 1),
  ('opportunities', 'عروض استثمارية', 'Investment Opportunities', '💎', 'opportunities', '/b2f-admin?tab=opportunities', 2),
  ('sales', 'المبيعات', 'Sales', '💰', 'sales', '/b2f-admin?tab=sales', 3),
  ('finance', 'المالية', 'Finance', '💳', 'finance', '/b2f-admin?tab=finance', 4),
  ('contracts', 'العقود', 'Contracts', '📜', 'contracts', '/b2f-admin?tab=contracts', 5),
  ('operations', 'التشغيل والمتابعة', 'Operations & Monitoring', '⚙️', 'operations', '/b2f-admin?tab=operations', 6),
  ('reports', 'التقارير والتوثيق', 'Reports & Documentation', '📊', 'reports', '/b2f-admin?tab=reports', 7),
  ('investor_service', 'خدمة المستثمر', 'Investor Service', '🤝', 'investor_service', '/b2f-admin?tab=investor_service', 8),
  ('notifications', 'الإشعارات', 'Notifications', '🔔', 'notifications', '/b2f-admin?tab=notifications', 9),
  ('ai_assistant', 'المساعد الذكي', 'AI Assistant', '🤖', 'ai_assistant', '/b2f-admin?tab=ai_assistant', 10),
  ('settings', 'إعدادات القسم', 'Settings', '⚙️', 'settings', '/b2f-admin?tab=settings', 11)
) AS t(code, name_ar, name_en, icon, tab_name, route_path, display_order)
ON CONFLICT (main_section_id, code) DO NOTHING;

-- إدخال الأقسام الفرعية لـ Auctions
INSERT INTO sub_sections (main_section_id, code, name_ar, name_en, icon, tab_name, route_path, display_order)
SELECT 
  (SELECT id FROM main_sections WHERE code = 'auctions'),
  code, name_ar, name_en, icon, tab_name, route_path, display_order
FROM (VALUES
  ('auctions_management', 'إدارة المزادات', 'Auctions Management', '🔨', 'auctions', '/admin?tab=auctions', 1),
  ('finance', 'المالية', 'Finance', '💳', 'finance', '/admin?tab=finance', 2),
  ('customer_service', 'خدمة العملاء', 'Customer Service', '🤝', 'customer_service', '/admin?tab=customer_service', 3),
  ('reports', 'التقارير', 'Reports', '📊', 'reports', '/admin?tab=reports', 4),
  ('settings', 'إعدادات القسم', 'Settings', '⚙️', 'settings', '/admin?tab=settings', 5)
) AS t(code, name_ar, name_en, icon, tab_name, route_path, display_order)
ON CONFLICT (main_section_id, code) DO NOTHING;

-- دالة للحصول على معلومات التوجيه حسب القسم
CREATE OR REPLACE FUNCTION get_department_routing_info(dept_id uuid)
RETURNS TABLE (
  main_section_code text,
  sub_section_code text,
  route_path text,
  tab_name text,
  department_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ms.code as main_section_code,
    ss.code as sub_section_code,
    ss.route_path,
    ss.tab_name,
    d.name_ar as department_name
  FROM platform_departments d
  LEFT JOIN sub_sections ss ON d.sub_section_id = ss.id
  LEFT JOIN main_sections ms ON ss.main_section_id = ms.id
  WHERE d.id = dept_id 
    AND (ss.id IS NULL OR (ss.is_active = true AND ms.is_active = true));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على جميع الأقسام الفرعية لقسم رئيسي
CREATE OR REPLACE FUNCTION get_sub_sections_by_main(main_section_code text)
RETURNS TABLE (
  id uuid,
  code text,
  name_ar text,
  name_en text,
  icon text,
  tab_name text,
  route_path text,
  display_order int
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id,
    ss.code,
    ss.name_ar,
    ss.name_en,
    ss.icon,
    ss.tab_name,
    ss.route_path,
    ss.display_order
  FROM sub_sections ss
  JOIN main_sections ms ON ss.main_section_id = ms.id
  WHERE ms.code = main_section_code 
    AND ss.is_active = true 
    AND ms.is_active = true
  ORDER BY ss.display_order, ss.name_ar;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE main_sections IS 'الأقسام الرئيسية للمنصة (B2F, Auctions)';
COMMENT ON TABLE sub_sections IS 'الأقسام الفرعية تحت كل قسم رئيسي';
COMMENT ON FUNCTION get_department_routing_info IS 'الحصول على معلومات التوجيه لقسم معين';
COMMENT ON FUNCTION get_sub_sections_by_main IS 'الحصول على جميع الأقسام الفرعية لقسم رئيسي';