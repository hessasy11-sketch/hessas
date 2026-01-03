/*
  # إضافة قسم المقتنيات النادرة إلى أنواع الأقسام

  1. التعديلات
    - إزالة القيد القديم على عمود section
    - إضافة قيد جديد يشمل collectibles
    - السماح بقيم: public, companies, platform, groups, collectibles

  2. التصنيفات
    - إضافة 5 تصنيفات فاخرة للمقتنيات النادرة
    - تصميم فاخر بألوان داكنة وذهبية
*/

-- إزالة القيد القديم
ALTER TABLE auction_categories DROP CONSTRAINT IF EXISTS auction_categories_section_check;

-- إضافة القيد الجديد مع collectibles
ALTER TABLE auction_categories 
  ADD CONSTRAINT auction_categories_section_check 
  CHECK (section IN ('public', 'companies', 'platform', 'groups', 'collectibles'));

-- إضافة تصنيفات المقتنيات النادرة
INSERT INTO auction_categories (name_ar, icon, color, section, sub_type, sort_order)
VALUES
  ('مقتنيات تراثية', '🐪', '#2c1810', 'collectibles', 'both', 1),
  ('أحجار كريمة ونادرة', '💎', '#4c1d95', 'collectibles', 'both', 2),
  ('ساعات وتحف فاخرة', '🕰️', '#1e3a8a', 'collectibles', 'both', 3),
  ('لوحات فنية وزراعية', '🖼️', '#713f12', 'collectibles', 'both', 4),
  ('أدوات أثرية زراعية', '⚱️', '#78350f', 'collectibles', 'both', 5)
ON CONFLICT DO NOTHING;

-- تحديث القيد على جدول auctions أيضاً
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_section_check;
ALTER TABLE auctions 
  ADD CONSTRAINT auctions_section_check 
  CHECK (section IN ('public', 'companies', 'platform', 'groups', 'collectibles'));

-- إضافة تعليقات توضيحية
COMMENT ON TABLE auction_categories IS 'تصنيفات المزادات - تشمل 5 أقسام: public (المزادات العامة)، companies (مزادات الشركات)، platform (مزادات المنصة)، groups (مزادات القروبات)، collectibles (المقتنيات النادرة)';
