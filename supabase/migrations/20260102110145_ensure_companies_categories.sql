/*
  # ضمان وجود فئات قسم الشركات

  ## الوصف
  التأكد من وجود فئات لقسم الشركات (companies)
  إذا لم تكن موجودة، يتم نسخها من القسم العام

  ## التغييرات
  1. نسخ الفئات من public إلى companies إذا لم تكن موجودة
  2. التأكد من أن قسم companies موجود في dashboard_sections
*/

-- نسخ الفئات من القسم العام إلى قسم الشركات (فقط إذا لم تكن موجودة)
INSERT INTO categories (section, sub_type, name_ar, icon, sort_order, is_active)
SELECT 
  'companies' as section,
  sub_type,
  name_ar,
  icon,
  sort_order,
  is_active
FROM categories
WHERE section = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM categories c2 
    WHERE c2.section = 'companies' 
      AND c2.name_ar = categories.name_ar
  );

-- التأكد من وجود قسم companies في dashboard_sections
INSERT INTO dashboard_sections (section_key, section_name, section_name_en, description, color, icon, display_order, is_active)
VALUES (
  'companies',
  'مزاد الشركات',
  'Companies Auction',
  'قسم خاص بمزادات الشركات والمؤسسات',
  '#3B82F6',
  '🏢',
  2,
  true
)
ON CONFLICT (section_key) DO UPDATE SET
  section_name = EXCLUDED.section_name,
  section_name_en = EXCLUDED.section_name_en,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;
