/*
  # فصل المزارع عن الفرص الاستثمارية

  1. إزالة الحقول التسويقية من جدول farms
    - إزالة rental_features
    - إزالة limited_offer_enabled
    - إزالة limited_offer_title
    - إزالة limited_offer_start
    - إزالة limited_offer_end

  2. إنشاء جدول جديد: investment_opportunities
    - id (uuid)
    - farm_id (uuid) - ربط مع المزرعة
    - title (text) - عنوان الفرصة
    - description (text) - وصف تفصيلي
    - rental_features (text) - مميزات عرض الإيجار
    - price_per_tree (decimal) - سعر الشجرة/السنة
    - min_trees (integer) - الحد الأدنى للحجز
    - max_trees (integer) - الحد الأقصى للحجز
    - duration_months (integer) - مدة الاستئجار بالأشهر
    - expected_return (text) - العائد المتوقع
    - limited_offer_enabled (boolean) - تفعيل عرض محدود
    - limited_offer_title (text) - عنوان العرض
    - limited_offer_start (timestamptz) - بداية العرض
    - limited_offer_end (timestamptz) - نهاية العرض
    - is_active (boolean) - الفرصة نشطة
    - display_order (integer) - ترتيب العرض
    - images (text[]) - صور خاصة بالفرصة (إضافية)
    - created_at (timestamptz)
    - updated_at (timestamptz)

  3. RLS Policies للجدول الجديد

  4. حذف الدوال والـ Views المرتبطة بالعروض القديمة
*/

-- حذف الدالة والـ View القديمة أولاً
DROP VIEW IF EXISTS farms_with_offer_status CASCADE;
DROP FUNCTION IF EXISTS is_farm_limited_offer_active(uuid) CASCADE;

-- إزالة الحقول التسويقية من جدول farms
ALTER TABLE farms 
DROP COLUMN IF EXISTS rental_features CASCADE,
DROP COLUMN IF EXISTS limited_offer_enabled CASCADE,
DROP COLUMN IF EXISTS limited_offer_title CASCADE,
DROP COLUMN IF EXISTS limited_offer_start CASCADE,
DROP COLUMN IF EXISTS limited_offer_end CASCADE;

-- إنشاء جدول الفرص الاستثمارية
CREATE TABLE IF NOT EXISTS investment_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  
  -- معلومات الفرصة
  title text NOT NULL,
  description text,
  rental_features text,
  
  -- التسعير والشروط
  price_per_tree decimal(10, 2) NOT NULL,
  min_trees integer DEFAULT 1,
  max_trees integer,
  duration_months integer NOT NULL DEFAULT 12,
  expected_return text,
  
  -- العرض المحدود
  limited_offer_enabled boolean DEFAULT false,
  limited_offer_title text,
  limited_offer_start timestamptz,
  limited_offer_end timestamptz,
  
  -- الحالة والعرض
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  
  -- صور إضافية خاصة بالفرصة
  images text[] DEFAULT '{}',
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء Indexes
CREATE INDEX IF NOT EXISTS idx_investment_opportunities_farm_id 
  ON investment_opportunities(farm_id);

CREATE INDEX IF NOT EXISTS idx_investment_opportunities_is_active 
  ON investment_opportunities(is_active);

CREATE INDEX IF NOT EXISTS idx_investment_opportunities_display_order 
  ON investment_opportunities(display_order);

-- RLS Policies

-- تمكين RLS
ALTER TABLE investment_opportunities ENABLE ROW LEVEL SECURITY;

-- الجميع يمكنهم مشاهدة الفرص النشطة
CREATE POLICY "Anyone can view active opportunities"
  ON investment_opportunities FOR SELECT
  USING (is_active = true);

-- المسجلون يمكنهم مشاهدة جميع الفرص
CREATE POLICY "Authenticated users can view all opportunities"
  ON investment_opportunities FOR SELECT
  TO authenticated
  USING (true);

-- المسجلون يمكنهم إضافة فرص
CREATE POLICY "Authenticated users can create opportunities"
  ON investment_opportunities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- المسجلون يمكنهم تحديث الفرص
CREATE POLICY "Authenticated users can update opportunities"
  ON investment_opportunities FOR UPDATE
  TO authenticated
  USING (true);

-- المسجلون يمكنهم حذف الفرص
CREATE POLICY "Authenticated users can delete opportunities"
  ON investment_opportunities FOR DELETE
  TO authenticated
  USING (true);

-- دالة للتحقق من نشاط العرض المحدود
CREATE OR REPLACE FUNCTION is_opportunity_offer_active(opportunity_id uuid)
RETURNS boolean AS $$
DECLARE
  opp_record RECORD;
BEGIN
  SELECT 
    limited_offer_enabled,
    limited_offer_start,
    limited_offer_end
  INTO opp_record
  FROM investment_opportunities
  WHERE id = opportunity_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF NOT COALESCE(opp_record.limited_offer_enabled, false) THEN
    RETURN false;
  END IF;

  IF opp_record.limited_offer_start IS NULL OR opp_record.limited_offer_end IS NULL THEN
    RETURN opp_record.limited_offer_enabled;
  END IF;

  RETURN (
    now() >= opp_record.limited_offer_start AND 
    now() <= opp_record.limited_offer_end AND
    opp_record.limited_offer_enabled = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- View للفرص مع بيانات المزرعة وحالة العرض
CREATE OR REPLACE VIEW opportunities_with_details AS
SELECT 
  io.*,
  f.name as farm_name,
  f.region_id,
  f.city_id,
  f.tree_types,
  f.total_capacity,
  f.available_capacity,
  f.owner_name,
  f.owner_phone,
  f.address,
  f.images as farm_images,
  f.main_image as farm_main_image,
  r.name_ar as region_name,
  c.name_ar as city_name,
  is_opportunity_offer_active(io.id) as is_offer_active,
  CASE 
    WHEN is_opportunity_offer_active(io.id) THEN io.limited_offer_title
    ELSE NULL
  END as active_offer_title
FROM investment_opportunities io
LEFT JOIN farms f ON io.farm_id = f.id
LEFT JOIN regions r ON f.region_id = r.id
LEFT JOIN cities c ON f.city_id = c.id;

-- Grant permissions
GRANT SELECT ON opportunities_with_details TO authenticated;
GRANT SELECT ON opportunities_with_details TO anon;

-- إضافة تعليقات توضيحية
COMMENT ON TABLE investment_opportunities IS 'الفرص الاستثمارية للمزارع - تحتوي على المعلومات التسويقية والعروض';
COMMENT ON COLUMN investment_opportunities.rental_features IS 'مميزات عرض الإيجار (متعدد الأسطر)';
COMMENT ON COLUMN investment_opportunities.price_per_tree IS 'سعر استئجار الشجرة الواحدة بالسنة';
COMMENT ON COLUMN investment_opportunities.duration_months IS 'مدة الاستئجار بالأشهر (افتراضي: 12 شهر)';
COMMENT ON COLUMN investment_opportunities.limited_offer_enabled IS 'تفعيل العرض لمدة محدودة';
COMMENT ON COLUMN investment_opportunities.display_order IS 'ترتيب العرض في القائمة (الأقل رقماً يظهر أولاً)';
