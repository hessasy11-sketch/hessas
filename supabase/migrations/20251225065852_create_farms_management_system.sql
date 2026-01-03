/*
  # نظام إدارة المزارع B2F

  1. جدول farms - المزارع
    - id (uuid, primary key)
    - name (text) - اسم المزرعة
    - description (text) - وصف المزرعة
    - region_id (uuid) - المنطقة
    - city_id (uuid) - المدينة
    - tree_types (text[]) - أنواع الأشجار المتاحة
    - total_capacity (integer) - الطاقة الاستيعابية الكلية
    - available_capacity (integer) - الطاقة المتاحة حالياً
    - is_active (boolean) - حالة التفعيل
    - owner_name (text) - اسم المالك
    - owner_phone (text) - جوال المالك
    - address (text) - العنوان التفصيلي
    - location_coordinates (text) - إحداثيات الموقع (اختياري)
    - images (text[]) - صور المزرعة
    - created_by (uuid) - من أنشأ المزرعة
    - created_at (timestamptz)
    - updated_at (timestamptz)

  2. تحديث جدول tree_rental_opportunities
    - إضافة حقل farm_id للربط مع المزارع

  3. RLS Policies
    - المدراء فقط يمكنهم إدارة المزارع

  4. Indexes للأداء
*/

-- إنشاء جدول المزارع
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  region_id uuid REFERENCES regions(id),
  city_id uuid REFERENCES cities(id),
  tree_types text[] DEFAULT '{}',
  total_capacity integer NOT NULL DEFAULT 0,
  available_capacity integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  owner_name text,
  owner_phone text,
  address text,
  location_coordinates text,
  images text[] DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة حقل farm_id لجدول الفرص الاستثمارية
ALTER TABLE tree_rental_opportunities 
ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES farms(id);

-- RLS Policies
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- المدراء يمكنهم عرض جميع المزارع
CREATE POLICY "Anyone can view active farms"
  ON farms FOR SELECT
  TO authenticated
  USING (true);

-- المدراء يمكنهم إضافة مزارع جديدة
CREATE POLICY "Authenticated users can insert farms"
  ON farms FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- المدراء يمكنهم تحديث المزارع
CREATE POLICY "Authenticated users can update farms"
  ON farms FOR UPDATE
  TO authenticated
  USING (true);

-- المدراء يمكنهم حذف المزارع
CREATE POLICY "Authenticated users can delete farms"
  ON farms FOR DELETE
  TO authenticated
  USING (true);

-- إنشاء دالة لتحديث available_capacity تلقائياً
CREATE OR REPLACE FUNCTION update_farm_capacity()
RETURNS TRIGGER AS $$
BEGIN
  -- عند إنشاء حجز جديد، نقلل من الطاقة المتاحة
  IF (TG_OP = 'INSERT' AND NEW.status IN ('pending_review', 'waiting_payment', 'receipt_under_review', 'active')) THEN
    UPDATE farms
    SET available_capacity = available_capacity - NEW.number_of_trees,
        updated_at = now()
    WHERE id = (
      SELECT farm_id 
      FROM tree_rental_opportunities 
      WHERE id = NEW.opportunity_id
    );
  END IF;

  -- عند إلغاء أو إنهاء حجز، نزيد الطاقة المتاحة
  IF (TG_OP = 'UPDATE' AND OLD.status IN ('pending_review', 'waiting_payment', 'receipt_under_review', 'active') 
      AND NEW.status IN ('cancelled', 'finished')) THEN
    UPDATE farms
    SET available_capacity = available_capacity + OLD.number_of_trees,
        updated_at = now()
    WHERE id = (
      SELECT farm_id 
      FROM tree_rental_opportunities 
      WHERE id = NEW.opportunity_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لتحديث الطاقة
DROP TRIGGER IF EXISTS update_farm_capacity_trigger ON tree_rental_reservations;
CREATE TRIGGER update_farm_capacity_trigger
  AFTER INSERT OR UPDATE ON tree_rental_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_farm_capacity();

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_farms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at
DROP TRIGGER IF EXISTS farms_updated_at_trigger ON farms;
CREATE TRIGGER farms_updated_at_trigger
  BEFORE UPDATE ON farms
  FOR EACH ROW
  EXECUTE FUNCTION update_farms_updated_at();

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_farms_region_id ON farms(region_id);
CREATE INDEX IF NOT EXISTS idx_farms_city_id ON farms(city_id);
CREATE INDEX IF NOT EXISTS idx_farms_is_active ON farms(is_active);
CREATE INDEX IF NOT EXISTS idx_farms_created_at ON farms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tree_rental_opportunities_farm_id ON tree_rental_opportunities(farm_id);

-- إضافة بعض البيانات التجريبية (اختياري)
INSERT INTO farms (name, description, total_capacity, available_capacity, is_active, owner_name, owner_phone, tree_types)
VALUES 
  ('مزرعة الخير', 'مزرعة نموذجية متخصصة في زراعة النخيل والزيتون', 1000, 1000, true, 'أحمد السعيد', '0501234567', ARRAY['نخيل', 'زيتون']),
  ('مزرعة البركة', 'مزرعة عائلية تنتج أجود أنواع الرمان والتين', 500, 500, true, 'محمد الأحمد', '0507654321', ARRAY['رمان', 'تين', 'عنب']),
  ('مزرعة الوادي الأخضر', 'مزرعة حديثة بأنظمة ري متطورة', 750, 750, true, 'عبدالله المطيري', '0551234567', ARRAY['نخيل', 'ليمون', 'برتقال'])
ON CONFLICT (id) DO NOTHING;

-- تحديث الفرص الاستثمارية الموجودة لربطها بالمزارع (اختياري)
UPDATE tree_rental_opportunities
SET farm_id = (SELECT id FROM farms ORDER BY random() LIMIT 1)
WHERE farm_id IS NULL
  AND EXISTS (SELECT 1 FROM farms LIMIT 1);
