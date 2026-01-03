/*
  # إعادة إنشاء جدول مزارع B2F

  1. New Tables
    - `b2f_farms`
      - `id` (uuid, primary key)
      - `name` (text) - اسم المزرعة
      - `description` (text) - وصف المزرعة
      - `location` (text) - الموقع
      - `city` (text) - المدينة
      - `tree_type` (text) - نوع الأشجار
      - `custom_tree_type` (text) - نوع مخصص
      - `total_trees_available` (integer) - عدد الأشجار المتاحة
      - `area_size` (numeric) - مساحة المزرعة
      - `area_unit` (text) - وحدة المساحة
      - `internal_description` (text) - وصف داخلي
      - `marketing_description` (text) - وصف تسويقي
      - `images` (jsonb) - صور المزرعة
      - `video_url` (text) - رابط فيديو
      - `location_url` (text) - رابط الموقع
      - `status` (text) - الحالة
      - `is_active` (boolean) - نشطة أم لا
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - السماح للجميع بالقراءة
    - السماح للمسؤولين بالكتابة
*/

-- حذف الجدول إذا كان موجوداً
DROP TABLE IF EXISTS b2f_farms CASCADE;

-- إنشاء جدول المزارع
CREATE TABLE b2f_farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text NOT NULL,
  city text,
  tree_type text DEFAULT 'نخيل' CHECK (tree_type IN ('نخيل', 'زيتون', 'أخرى')),
  custom_tree_type text,
  total_trees_available integer DEFAULT 0,
  area_size numeric(10,2) DEFAULT 0,
  area_unit text DEFAULT 'م²',
  internal_description text,
  marketing_description text,
  images jsonb DEFAULT '[]'::jsonb,
  video_url text,
  location_url text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'under_preparation', 'inactive')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_farms ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للجميع
CREATE POLICY "Anyone can view active farms"
  ON b2f_farms FOR SELECT
  USING (is_active = true OR auth.uid() IS NOT NULL);

-- سياسة الإدارة الكاملة للمستخدمين المصادق عليهم
CREATE POLICY "Authenticated users can manage farms"
  ON b2f_farms FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- سياسة الإدارة للمستخدمين المجهولين (service_role)
CREATE POLICY "Service role can manage all farms"
  ON b2f_farms FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- إنشاء index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_b2f_farms_location ON b2f_farms(location);
CREATE INDEX IF NOT EXISTS idx_b2f_farms_city ON b2f_farms(city);
CREATE INDEX IF NOT EXISTS idx_b2f_farms_is_active ON b2f_farms(is_active);
CREATE INDEX IF NOT EXISTS idx_b2f_farms_status ON b2f_farms(status);

-- إضافة trigger للتحديث التلقائي
CREATE OR REPLACE FUNCTION update_b2f_farms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_b2f_farms_updated_at
  BEFORE UPDATE ON b2f_farms
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_farms_updated_at();
