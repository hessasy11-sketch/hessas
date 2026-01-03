/*
  # إضافة مميزات محسّنة لنظام المزارع

  1. حقول جديدة في جدول farms
    - main_image (text) - الصورة الرئيسية للمزرعة
    - rental_features (text) - مميزات عرض الإيجار (متعدد الأسطر)
    - limited_offer_enabled (boolean) - تفعيل العرض المحدود
    - limited_offer_title (text) - عنوان العرض المحدود
    - limited_offer_start (timestamptz) - تاريخ بداية العرض
    - limited_offer_end (timestamptz) - تاريخ نهاية العرض

  2. Storage Bucket
    - farm-images - لتخزين صور المزارع

  3. دالة مساعدة
    - is_limited_offer_active() - للتحقق من نشاط العرض المحدود
*/

-- إضافة الحقول الجديدة لجدول farms
ALTER TABLE farms 
ADD COLUMN IF NOT EXISTS main_image text,
ADD COLUMN IF NOT EXISTS rental_features text,
ADD COLUMN IF NOT EXISTS limited_offer_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS limited_offer_title text,
ADD COLUMN IF NOT EXISTS limited_offer_start timestamptz,
ADD COLUMN IF NOT EXISTS limited_offer_end timestamptz;

-- إنشاء Storage Bucket لصور المزارع
INSERT INTO storage.buckets (id, name, public)
VALUES ('farm-images', 'farm-images', true)
ON CONFLICT (id) DO NOTHING;

-- حذف الـ policies القديمة إن وجدت
DROP POLICY IF EXISTS "Anyone can view farm images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload farm images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update farm images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete farm images" ON storage.objects;

-- RLS Policies للـ Storage Bucket

-- السماح للجميع بمشاهدة الصور
CREATE POLICY "Anyone can view farm images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'farm-images');

-- السماح للمستخدمين المسجلين برفع الصور
CREATE POLICY "Authenticated users can upload farm images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'farm-images');

-- السماح للمستخدمين المسجلين بتحديث الصور
CREATE POLICY "Authenticated users can update farm images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'farm-images');

-- السماح للمستخدمين المسجلين بحذف الصور
CREATE POLICY "Authenticated users can delete farm images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'farm-images');

-- دالة للتحقق من نشاط العرض المحدود
CREATE OR REPLACE FUNCTION is_farm_limited_offer_active(farm_id uuid)
RETURNS boolean AS $$
DECLARE
  farm_record RECORD;
  is_active boolean;
BEGIN
  SELECT 
    limited_offer_enabled,
    limited_offer_start,
    limited_offer_end
  INTO farm_record
  FROM farms
  WHERE id = farm_id;

  -- إذا لم تكن المزرعة موجودة
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- إذا لم يكن العرض مفعّلاً
  IF NOT COALESCE(farm_record.limited_offer_enabled, false) THEN
    RETURN false;
  END IF;

  -- إذا لم يتم تحديد تواريخ
  IF farm_record.limited_offer_start IS NULL OR farm_record.limited_offer_end IS NULL THEN
    RETURN farm_record.limited_offer_enabled;
  END IF;

  -- التحقق من أن التاريخ الحالي ضمن فترة العرض
  is_active := (
    now() >= farm_record.limited_offer_start AND 
    now() <= farm_record.limited_offer_end AND
    farm_record.limited_offer_enabled = true
  );

  RETURN is_active;
END;
$$ LANGUAGE plpgsql STABLE;

-- إنشاء View للمزارع مع حالة العرض المحدود
CREATE OR REPLACE VIEW farms_with_offer_status AS
SELECT 
  f.*,
  is_farm_limited_offer_active(f.id) as is_offer_active,
  CASE 
    WHEN is_farm_limited_offer_active(f.id) THEN f.limited_offer_title
    ELSE NULL
  END as active_offer_title
FROM farms f;

-- Grant permissions على الـ view
GRANT SELECT ON farms_with_offer_status TO authenticated;
GRANT SELECT ON farms_with_offer_status TO anon;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN farms.main_image IS 'URL للصورة الرئيسية التي تظهر في بطاقة المزرعة';
COMMENT ON COLUMN farms.rental_features IS 'مميزات عرض الإيجار (متعدد الأسطر) - يعرض على شكل نقاط';
COMMENT ON COLUMN farms.limited_offer_enabled IS 'تفعيل العرض لمدة محدودة';
COMMENT ON COLUMN farms.limited_offer_title IS 'عنوان العرض المحدود مثل "عرض خاص لأول 50 حصة"';
COMMENT ON COLUMN farms.limited_offer_start IS 'تاريخ بداية العرض المحدود';
COMMENT ON COLUMN farms.limited_offer_end IS 'تاريخ نهاية العرض المحدود';
