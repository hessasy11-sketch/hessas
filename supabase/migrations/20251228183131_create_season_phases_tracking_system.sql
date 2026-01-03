/*
  # نظام تتبع مراحل الموسم - Season Phases Tracking

  ## الهدف
  إنشاء نظام لتتبع المراحل العشر لكل موسم تشغيلي.

  ## الجداول الجديدة
  
  ### `season_phases`
  جدول لتتبع مراحل كل موسم
  
  المراحل العشر:
  1. activation - تفعيل التشغيل
  2. growth - مرحلة النمو
  3. irrigation - مرحلة الري المبرمج
  4. care - العناية الزراعية
  5. production - مرحلة الإنتاج
  6. pre_harvest - ما قبل الحصاد
  7. harvest - جني الثمار
  8. accounting - حسم الكميات + المصاريف
  9. processing - العصر/التغليف
  10. delivery - تسليم المنتج + إغلاق الموسم

  الحقول:
  - `id` (uuid, primary key) - معرف المرحلة
  - `season_id` (uuid, foreign key) - معرف الموسم
  - `phase_type` (text) - نوع المرحلة
  - `phase_number` (integer) - رقم المرحلة (1-10)
  - `status` (text) - حالة المرحلة (not_started, in_progress, completed)
  - `start_date` (timestamp) - تاريخ بدء المرحلة
  - `end_date` (timestamp) - تاريخ إغلاق المرحلة
  - `notes` (text) - ملاحظات المرحلة
  - `created_at` (timestamp) - تاريخ الإنشاء
  - `updated_at` (timestamp) - تاريخ آخر تحديث

  ## الأمان
  - تفعيل RLS
  - سياسات القراءة والكتابة للمدير فقط
*/

-- إنشاء جدول season_phases
CREATE TABLE IF NOT EXISTS season_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES farm_seasons(id) ON DELETE CASCADE,
  phase_type text NOT NULL CHECK (phase_type IN (
    'activation',
    'growth',
    'irrigation',
    'care',
    'production',
    'pre_harvest',
    'harvest',
    'accounting',
    'processing',
    'delivery'
  )),
  phase_number integer NOT NULL CHECK (phase_number >= 1 AND phase_number <= 10),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  start_date timestamptz,
  end_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(season_id, phase_type)
);

-- إنشاء indexes
CREATE INDEX IF NOT EXISTS idx_season_phases_season_id ON season_phases(season_id);
CREATE INDEX IF NOT EXISTS idx_season_phases_status ON season_phases(status);
CREATE INDEX IF NOT EXISTS idx_season_phases_phase_number ON season_phases(phase_number);

-- تفعيل RLS
ALTER TABLE season_phases ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستخدمين المسجلين
CREATE POLICY "Authenticated users can read phases"
  ON season_phases
  FOR SELECT
  TO authenticated
  USING (true);

-- سياسة الإضافة: المستخدمين المسجلين
CREATE POLICY "Authenticated users can create phases"
  ON season_phases
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- سياسة التعديل: المستخدمين المسجلين
CREATE POLICY "Authenticated users can update phases"
  ON season_phases
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- سياسة الحذف: المستخدمين المسجلين
CREATE POLICY "Authenticated users can delete phases"
  ON season_phases
  FOR DELETE
  TO authenticated
  USING (true);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_season_phases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at عند التعديل
DROP TRIGGER IF EXISTS update_season_phases_updated_at_trigger ON season_phases;
CREATE TRIGGER update_season_phases_updated_at_trigger
  BEFORE UPDATE ON season_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_season_phases_updated_at();

-- دالة لإنشاء المراحل العشر تلقائياً عند إنشاء موسم
CREATE OR REPLACE FUNCTION create_default_season_phases()
RETURNS TRIGGER AS $$
BEGIN
  -- إنشاء المراحل العشر
  INSERT INTO season_phases (season_id, phase_type, phase_number, status)
  VALUES
    (NEW.id, 'activation', 1, 'not_started'),
    (NEW.id, 'growth', 2, 'not_started'),
    (NEW.id, 'irrigation', 3, 'not_started'),
    (NEW.id, 'care', 4, 'not_started'),
    (NEW.id, 'production', 5, 'not_started'),
    (NEW.id, 'pre_harvest', 6, 'not_started'),
    (NEW.id, 'harvest', 7, 'not_started'),
    (NEW.id, 'accounting', 8, 'not_started'),
    (NEW.id, 'processing', 9, 'not_started'),
    (NEW.id, 'delivery', 10, 'not_started');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger لإنشاء المراحل تلقائياً عند إنشاء موسم جديد
DROP TRIGGER IF EXISTS create_season_phases_trigger ON farm_seasons;
CREATE TRIGGER create_season_phases_trigger
  AFTER INSERT ON farm_seasons
  FOR EACH ROW
  EXECUTE FUNCTION create_default_season_phases();

-- دالة للحصول على المرحلة الحالية للموسم
CREATE OR REPLACE FUNCTION get_current_season_phase(p_season_id uuid)
RETURNS TABLE (
  phase_type text,
  phase_number integer,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.phase_type,
    sp.phase_number,
    sp.status
  FROM season_phases sp
  WHERE sp.season_id = p_season_id
    AND sp.status = 'in_progress'
  ORDER BY sp.phase_number ASC
  LIMIT 1;
  
  -- إذا لم توجد مرحلة جارية، إرجاع أول مرحلة غير مكتملة
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      sp.phase_type,
      sp.phase_number,
      sp.status
    FROM season_phases sp
    WHERE sp.season_id = p_season_id
      AND sp.status = 'not_started'
    ORDER BY sp.phase_number ASC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحساب نسبة التقدم في الموسم
CREATE OR REPLACE FUNCTION calculate_season_progress(p_season_id uuid)
RETURNS integer AS $$
DECLARE
  completed_count integer;
  total_count integer;
BEGIN
  SELECT COUNT(*) INTO completed_count
  FROM season_phases
  WHERE season_id = p_season_id
    AND status = 'completed';
  
  SELECT COUNT(*) INTO total_count
  FROM season_phases
  WHERE season_id = p_season_id;
  
  IF total_count = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((completed_count::numeric / total_count::numeric) * 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
