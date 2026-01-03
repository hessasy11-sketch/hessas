/*
  # نظام مواسم المزارع - Farm Seasons System

  ## الهدف
  إنشاء نظام إدارة المواسم لكل مزرعة في قسم التشغيل والمتابعة.

  ## الجداول الجديدة
  
  ### `farm_seasons`
  جدول لإدارة مواسم التشغيل لكل مزرعة
  
  الحقول:
  - `id` (uuid, primary key) - معرف الموسم
  - `farm_id` (uuid, foreign key) - معرف المزرعة
  - `season_name` (text) - اسم الموسم (مثال: "موسم 2025")
  - `season_year` (integer) - سنة الموسم
  - `season_type` (text) - نوع الموسم (زيت / رطب / تمر / إنتاج آخر)
  - `status` (text) - حالة الموسم
    - season_created: تم إنشاء الموسم
    - active: جارٍ
    - harvest: موسم الحصاد
    - closed: مغلق
  - `start_date` (date) - تاريخ بدء الموسم
  - `end_date` (date) - تاريخ انتهاء الموسم (اختياري)
  - `description` (text) - وصف الموسم
  - `created_at` (timestamp) - تاريخ الإنشاء
  - `updated_at` (timestamp) - تاريخ آخر تحديث

  ## الأمان
  - تفعيل RLS
  - السماح للمستخدمين المسجلين بالقراءة والكتابة (الوصول الإداري)
*/

-- إنشاء جدول farm_seasons
CREATE TABLE IF NOT EXISTS farm_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  season_name text NOT NULL,
  season_year integer NOT NULL,
  season_type text NOT NULL CHECK (season_type IN ('oil', 'fresh_dates', 'dried_dates', 'other')),
  status text NOT NULL DEFAULT 'season_created' CHECK (status IN ('season_created', 'active', 'harvest', 'closed')),
  start_date date,
  end_date date,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء index على farm_id للأداء
CREATE INDEX IF NOT EXISTS idx_farm_seasons_farm_id ON farm_seasons(farm_id);

-- إنشاء index على status للفلترة السريعة
CREATE INDEX IF NOT EXISTS idx_farm_seasons_status ON farm_seasons(status);

-- إنشاء index على season_year
CREATE INDEX IF NOT EXISTS idx_farm_seasons_year ON farm_seasons(season_year);

-- تفعيل RLS
ALTER TABLE farm_seasons ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستخدمين المسجلين (الإداريين)
CREATE POLICY "Authenticated users can read seasons"
  ON farm_seasons
  FOR SELECT
  TO authenticated
  USING (true);

-- سياسة الإضافة: المستخدمين المسجلين
CREATE POLICY "Authenticated users can create seasons"
  ON farm_seasons
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- سياسة التعديل: المستخدمين المسجلين
CREATE POLICY "Authenticated users can update seasons"
  ON farm_seasons
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- سياسة الحذف: المستخدمين المسجلين
CREATE POLICY "Authenticated users can delete seasons"
  ON farm_seasons
  FOR DELETE
  TO authenticated
  USING (true);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_farm_seasons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at عند التعديل
DROP TRIGGER IF EXISTS update_farm_seasons_updated_at_trigger ON farm_seasons;
CREATE TRIGGER update_farm_seasons_updated_at_trigger
  BEFORE UPDATE ON farm_seasons
  FOR EACH ROW
  EXECUTE FUNCTION update_farm_seasons_updated_at();

-- دالة لحساب عدد المواسم النشطة لمزرعة
CREATE OR REPLACE FUNCTION get_active_seasons_count(p_farm_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM farm_seasons
    WHERE farm_id = p_farm_id
    AND status IN ('active', 'harvest')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على آخر موسم لمزرعة
CREATE OR REPLACE FUNCTION get_latest_season(p_farm_id uuid)
RETURNS TABLE (
  id uuid,
  farm_id uuid,
  season_name text,
  season_year integer,
  season_type text,
  status text,
  start_date date,
  end_date date,
  description text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fs.id,
    fs.farm_id,
    fs.season_name,
    fs.season_year,
    fs.season_type,
    fs.status,
    fs.start_date,
    fs.end_date,
    fs.description,
    fs.created_at,
    fs.updated_at
  FROM farm_seasons fs
  WHERE fs.farm_id = p_farm_id
  ORDER BY fs.season_year DESC, fs.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
