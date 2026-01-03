/*
  # إنشاء جدول المزارع B2F
  
  1. جدول جديد:
     - `b2f_farms` - المزارع التي تحتوي على الفرص الاستثمارية
  
  2. الأعمدة:
     - id (uuid, primary key)
     - name (اسم المزرعة)
     - description (وصف المزرعة)
     - location (الموقع العام)
     - city (المدينة)
     - total_trees (إجمالي عدد الأشجار)
     - images (صور المزرعة)
     - video_url (رابط فيديو)
     - location_url (رابط الخريطة)
     - is_active (نشطة/غير نشطة)
     - created_at, updated_at
  
  3. الأمان:
     - تفعيل RLS
     - سياسات للقراءة والكتابة
*/

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS b2f_farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text NOT NULL,
  city text,
  total_trees integer DEFAULT 0,
  images jsonb DEFAULT '[]'::jsonb,
  video_url text,
  location_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_farms ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Allow public read for active farms"
  ON b2f_farms
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Allow read all for anon and authenticated"
  ON b2f_farms
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert for anon and authenticated"
  ON b2f_farms
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for anon and authenticated"
  ON b2f_farms
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete for anon and authenticated"
  ON b2f_farms
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- إنشاء مزرعة افتراضية للعروض الموجودة
INSERT INTO b2f_farms (id, name, location, city, total_trees, description)
VALUES (
  'a754abde-0144-4ccc-9fbc-321961d24110',
  'مزرعة الرياض النموذجية',
  'شمال الرياض',
  'الرياض',
  5000,
  'مزرعة نموذجية مجهزة بأحدث تقنيات الري والعناية بالأشجار'
)
ON CONFLICT (id) DO NOTHING;

-- إنشاء trigger للتحديث التلقائي
CREATE OR REPLACE FUNCTION update_b2f_farms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_b2f_farms_updated_at
  BEFORE UPDATE ON b2f_farms
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_farms_updated_at();
