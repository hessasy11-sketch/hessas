/*
  # إصلاح علاقة المزارع في جدول العروض الاستثمارية
  
  1. نسخ المزارع من farms إلى b2f_farms
  2. حذف Foreign Key القديم
  3. إنشاء Foreign Key جديد يشير إلى b2f_farms
*/

-- نسخ المزارع من farms إلى b2f_farms (فقط المزارع المرتبطة بالعروض)
INSERT INTO b2f_farms (
  id,
  name,
  location,
  city,
  description,
  total_trees,
  available_trees,
  images,
  is_active,
  created_at,
  updated_at
)
SELECT DISTINCT
  f.id,
  f.name,
  f.location,
  COALESCE(f.city, ''),
  COALESCE(f.marketing_description, f.internal_description, ''),
  COALESCE(f.total_trees_available, 0),
  COALESCE(f.total_trees_available, 0),
  COALESCE(f.images, '[]'::jsonb),
  CASE WHEN f.status = 'active' THEN true ELSE false END,
  COALESCE(f.created_at, now()),
  COALESCE(f.updated_at, now())
FROM farms f
INNER JOIN b2f_opportunities o ON o.farm_id = f.id
WHERE NOT EXISTS (
  SELECT 1 FROM b2f_farms bf WHERE bf.id = f.id
)
ON CONFLICT (id) DO NOTHING;

-- حذف الـ Foreign Key القديم
ALTER TABLE b2f_opportunities 
DROP CONSTRAINT IF EXISTS b2f_opportunities_farm_id_fkey;

-- إنشاء Foreign Key جديد يشير إلى جدول b2f_farms
ALTER TABLE b2f_opportunities 
ADD CONSTRAINT b2f_opportunities_farm_id_fkey 
FOREIGN KEY (farm_id) REFERENCES b2f_farms(id) ON DELETE CASCADE;