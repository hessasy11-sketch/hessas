/*
  # نظام إدارة الطاقة الاستيعابية للمزارع والفرص

  1. التحديثات على جدول farms
    - إضافة max_investable_trees (الطاقة الاستثمارية القصوى)

  2. التحديثات على جدول investment_opportunities
    - إضافة number_of_trees (عدد الأشجار في الفرصة)
    - تحديث farm_id ليكون NOT NULL

  3. Functions
    - get_farm_capacity_status() - حساب حالة الطاقة لكل مزرعة
    - check_farm_capacity() - التحقق من السعة قبل الحفظ
    - update_opportunities_on_farm_status() - تحديث الفرص عند تغيير حالة المزرعة

  4. Triggers
    - trigger للتحقق من السعة قبل insert/update
    - trigger لتحديث الفرص عند تغيير حالة المزرعة

  5. Views
    - farms_with_capacity - عرض المزارع مع بيانات الإشغال
*/

-- إضافة حقل الطاقة الاستثمارية القصوى لجدول المزارع
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farms' AND column_name = 'max_investable_trees'
  ) THEN
    ALTER TABLE farms ADD COLUMN max_investable_trees integer DEFAULT 0;
    COMMENT ON COLUMN farms.max_investable_trees IS 'الطاقة الاستثمارية القصوى - عدد الأشجار المتاح للاستثمار';
  END IF;
END $$;

-- تحديث max_investable_trees ليساوي total_capacity للمزارع الموجودة
UPDATE farms 
SET max_investable_trees = total_capacity 
WHERE max_investable_trees = 0 OR max_investable_trees IS NULL;

-- إضافة حقل عدد الأشجار لجدول الفرص
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_opportunities' AND column_name = 'number_of_trees'
  ) THEN
    ALTER TABLE investment_opportunities ADD COLUMN number_of_trees integer DEFAULT 0;
    COMMENT ON COLUMN investment_opportunities.number_of_trees IS 'عدد الأشجار المخصصة لهذه الفرصة من طاقة المزرعة';
  END IF;
END $$;

-- دالة لحساب حالة الطاقة لكل مزرعة
CREATE OR REPLACE FUNCTION get_farm_capacity_status(farm_id_param uuid)
RETURNS TABLE (
  farm_id uuid,
  farm_name text,
  max_capacity integer,
  used_capacity integer,
  available_capacity integer,
  occupancy_percentage numeric,
  active_opportunities_count integer,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id as farm_id,
    f.name as farm_name,
    f.max_investable_trees as max_capacity,
    COALESCE(SUM(io.number_of_trees) FILTER (WHERE io.is_active = true), 0)::integer as used_capacity,
    (f.max_investable_trees - COALESCE(SUM(io.number_of_trees) FILTER (WHERE io.is_active = true), 0))::integer as available_capacity,
    CASE 
      WHEN f.max_investable_trees > 0 
      THEN ROUND((COALESCE(SUM(io.number_of_trees) FILTER (WHERE io.is_active = true), 0)::numeric / f.max_investable_trees::numeric) * 100, 2)
      ELSE 0
    END as occupancy_percentage,
    COUNT(io.id) FILTER (WHERE io.is_active = true)::integer as active_opportunities_count,
    CASE 
      WHEN NOT f.is_active THEN 'inactive'
      WHEN f.max_investable_trees = 0 THEN 'no_capacity'
      WHEN COALESCE(SUM(io.number_of_trees) FILTER (WHERE io.is_active = true), 0) >= f.max_investable_trees THEN 'full'
      WHEN (COALESCE(SUM(io.number_of_trees) FILTER (WHERE io.is_active = true), 0)::numeric / f.max_investable_trees::numeric) >= 0.9 THEN 'almost_full'
      WHEN (COALESCE(SUM(io.number_of_trees) FILTER (WHERE io.is_active = true), 0)::numeric / f.max_investable_trees::numeric) >= 0.7 THEN 'high'
      ELSE 'available'
    END as status
  FROM farms f
  LEFT JOIN investment_opportunities io ON f.id = io.farm_id
  WHERE f.id = farm_id_param
  GROUP BY f.id, f.name, f.max_investable_trees, f.is_active;
END;
$$ LANGUAGE plpgsql STABLE;

-- دالة للتحقق من السعة المتاحة
CREATE OR REPLACE FUNCTION check_farm_capacity(
  farm_id_param uuid,
  opportunity_id_param uuid,
  trees_count integer
)
RETURNS boolean AS $$
DECLARE
  farm_record RECORD;
  current_used integer;
  new_total integer;
BEGIN
  -- الحصول على بيانات المزرعة
  SELECT 
    id, 
    name, 
    max_investable_trees,
    is_active
  INTO farm_record
  FROM farms
  WHERE id = farm_id_param;

  -- التحقق من وجود المزرعة
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المزرعة غير موجودة';
  END IF;

  -- التحقق من أن المزرعة نشطة
  IF NOT farm_record.is_active THEN
    RAISE EXCEPTION 'لا يمكن إنشاء فرصة لمزرعة متوقفة';
  END IF;

  -- التحقق من أن المزرعة لديها طاقة
  IF farm_record.max_investable_trees = 0 THEN
    RAISE EXCEPTION 'المزرعة ليس لديها طاقة استيعابية محددة';
  END IF;

  -- حساب المستخدم حالياً (باستثناء الفرصة الحالية إذا كان تعديل)
  SELECT COALESCE(SUM(number_of_trees), 0)
  INTO current_used
  FROM investment_opportunities
  WHERE farm_id = farm_id_param
    AND is_active = true
    AND (opportunity_id_param IS NULL OR id != opportunity_id_param);

  -- حساب الإجمالي الجديد
  new_total := current_used + trees_count;

  -- التحقق من تجاوز الطاقة
  IF new_total > farm_record.max_investable_trees THEN
    RAISE EXCEPTION 'عدد الأشجار المطلوب (%) يتجاوز الطاقة الاستيعابية المتاحة للمزرعة. المستخدم: %، المتاح: %، المطلوب: %',
      trees_count,
      current_used,
      farm_record.max_investable_trees - current_used,
      trees_count;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Trigger للتحقق من السعة قبل إدراج أو تحديث فرصة
CREATE OR REPLACE FUNCTION trigger_check_opportunity_capacity()
RETURNS TRIGGER AS $$
BEGIN
  -- التحقق فقط إذا كانت الفرصة نشطة
  IF NEW.is_active = true AND NEW.number_of_trees > 0 THEN
    PERFORM check_farm_capacity(NEW.farm_id, NEW.id, NEW.number_of_trees);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger
DROP TRIGGER IF EXISTS check_opportunity_capacity_trigger ON investment_opportunities;
CREATE TRIGGER check_opportunity_capacity_trigger
  BEFORE INSERT OR UPDATE ON investment_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_opportunity_capacity();

-- دالة لتحديث حالة الفرص عند تغيير حالة المزرعة
CREATE OR REPLACE FUNCTION trigger_update_opportunities_on_farm_status()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا تم إيقاف المزرعة، قم بإيقاف جميع الفرص المرتبطة
  IF OLD.is_active = true AND NEW.is_active = false THEN
    UPDATE investment_opportunities
    SET is_active = false,
        updated_at = now()
    WHERE farm_id = NEW.id AND is_active = true;
  END IF;
  
  -- ملاحظة: لا نقوم بإعادة تفعيل الفرص تلقائياً عند تفعيل المزرعة
  -- يتم ذلك يدوياً من قبل المسؤول
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger لحالة المزرعة
DROP TRIGGER IF EXISTS update_opportunities_on_farm_status_trigger ON farms;
CREATE TRIGGER update_opportunities_on_farm_status_trigger
  AFTER UPDATE OF is_active ON farms
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_opportunities_on_farm_status();

-- View للمزارع مع بيانات الإشغال
CREATE OR REPLACE VIEW farms_with_capacity AS
SELECT 
  f.id,
  f.name,
  f.description,
  f.region_id,
  f.city_id,
  f.tree_types,
  f.total_capacity,
  f.available_capacity,
  f.max_investable_trees,
  f.is_active,
  f.owner_name,
  f.owner_phone,
  f.address,
  f.images,
  f.main_image,
  f.created_at,
  f.updated_at,
  r.name_ar as region_name,
  c.name_ar as city_name,
  COALESCE(SUM(io.number_of_trees) FILTER (WHERE io.is_active = true), 0)::integer as used_capacity,
  (f.max_investable_trees - COALESCE(SUM(io.number_of_trees) FILTER (WHERE io.is_active = true), 0))::integer as available_investable_capacity,
  CASE 
    WHEN f.max_investable_trees > 0 
    THEN ROUND((COALESCE(SUM(io.number_of_trees) FILTER (WHERE io.is_active = true), 0)::numeric / f.max_investable_trees::numeric) * 100, 2)
    ELSE 0
  END as occupancy_percentage,
  COUNT(io.id) FILTER (WHERE io.is_active = true)::integer as active_opportunities_count,
  COUNT(io.id)::integer as total_opportunities_count,
  CASE 
    WHEN NOT f.is_active THEN 'inactive'
    WHEN f.max_investable_trees = 0 THEN 'no_capacity'
    WHEN COALESCE(SUM(io.number_of_trees) FILTER (WHERE io.is_active = true), 0) >= f.max_investable_trees THEN 'full'
    WHEN (COALESCE(SUM(io.number_of_trees) FILTER (WHERE io.is_active = true), 0)::numeric / NULLIF(f.max_investable_trees, 0)::numeric) >= 0.9 THEN 'almost_full'
    WHEN (COALESCE(SUM(io.number_of_trees) FILTER (WHERE io.is_active = true), 0)::numeric / NULLIF(f.max_investable_trees, 0)::numeric) >= 0.7 THEN 'high'
    ELSE 'available'
  END as capacity_status
FROM farms f
LEFT JOIN regions r ON f.region_id = r.id
LEFT JOIN cities c ON f.city_id = c.id
LEFT JOIN investment_opportunities io ON f.id = io.farm_id
GROUP BY 
  f.id, f.name, f.description, f.region_id, f.city_id, f.tree_types,
  f.total_capacity, f.available_capacity, f.max_investable_trees,
  f.is_active, f.owner_name, f.owner_phone, f.address, f.images, 
  f.main_image, f.created_at, f.updated_at,
  r.name_ar, c.name_ar;

-- Grant permissions
GRANT SELECT ON farms_with_capacity TO authenticated;
GRANT SELECT ON farms_with_capacity TO anon;

-- تحديث View الفرص لتشمل بيانات الطاقة
DROP VIEW IF EXISTS opportunities_with_details CASCADE;
CREATE OR REPLACE VIEW opportunities_with_details AS
SELECT 
  io.*,
  f.name as farm_name,
  f.region_id,
  f.city_id,
  f.tree_types,
  f.total_capacity,
  f.available_capacity,
  f.max_investable_trees,
  f.is_active as farm_is_active,
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
  END as active_offer_title,
  (SELECT used_capacity FROM get_farm_capacity_status(io.farm_id)) as farm_used_capacity,
  (SELECT available_capacity FROM get_farm_capacity_status(io.farm_id)) as farm_available_capacity,
  (SELECT occupancy_percentage FROM get_farm_capacity_status(io.farm_id)) as farm_occupancy_percentage
FROM investment_opportunities io
LEFT JOIN farms f ON io.farm_id = f.id
LEFT JOIN regions r ON f.region_id = r.id
LEFT JOIN cities c ON f.city_id = c.id;

-- Grant permissions
GRANT SELECT ON opportunities_with_details TO authenticated;
GRANT SELECT ON opportunities_with_details TO anon;

-- تحديث التعليقات
COMMENT ON COLUMN investment_opportunities.number_of_trees IS 'عدد الأشجار المخصصة لهذه الفرصة - يجب أن لا يتجاوز الطاقة المتاحة للمزرعة';
COMMENT ON FUNCTION check_farm_capacity IS 'التحقق من أن عدد الأشجار المطلوب لا يتجاوز الطاقة الاستيعابية المتاحة للمزرعة';
COMMENT ON FUNCTION get_farm_capacity_status IS 'حساب حالة الطاقة الاستيعابية لمزرعة معينة';
COMMENT ON VIEW farms_with_capacity IS 'عرض المزارع مع بيانات الإشغال والطاقة المتاحة';
