/*
  # إعادة إنشاء نظام المناطق والمدن

  1. الجداول الجديدة
    - `regions`: جدول المناطق السعودية
      - `id`: معرف فريد
      - `name_ar`: الاسم بالعربي
      - `name_en`: الاسم بالإنجليزي
      - `display_order`: ترتيب العرض
      - `created_at`: تاريخ الإنشاء
    
    - `cities`: جدول المدن
      - `id`: معرف فريد
      - `region_id`: ربط مع المنطقة
      - `name_ar`: الاسم بالعربي
      - `name_en`: الاسم بالإنجليزي
      - `display_order`: ترتيب العرض
      - `created_at`: تاريخ الإنشاء

  2. الأمان
    - RLS مفعّل
    - قراءة عامة للجميع

  3. البيانات
    - جميع المناطق السعودية
    - المدن الرئيسية لكل منطقة
*/

-- حذف الجداول القديمة
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS regions CASCADE;

-- إنشاء جدول المناطق
CREATE TABLE regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL UNIQUE,
  name_en text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول المدن
CREATE TABLE cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(region_id, name_ar)
);

-- إنشاء الفهارس
CREATE INDEX idx_cities_region_id ON cities(region_id);

-- تمكين RLS
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Everyone can view regions" ON regions;
DROP POLICY IF EXISTS "Everyone can view cities" ON cities;
DROP POLICY IF EXISTS "Service role full access regions" ON regions;
DROP POLICY IF EXISTS "Service role full access cities" ON cities;

-- سياسات القراءة العامة
CREATE POLICY "Anyone can view regions"
  ON regions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can view cities"
  ON cities FOR SELECT
  TO anon, authenticated
  USING (true);

-- سياسات service_role
CREATE POLICY "Service role full access regions"
  ON regions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access cities"
  ON cities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- إدراج المناطق السعودية
INSERT INTO regions (name_ar, name_en, display_order) VALUES
  ('الرياض', 'Riyadh', 1),
  ('مكة المكرمة', 'Makkah', 2),
  ('المدينة المنورة', 'Madinah', 3),
  ('المنطقة الشرقية', 'Eastern Province', 4),
  ('عسير', 'Asir', 5),
  ('تبوك', 'Tabuk', 6),
  ('القصيم', 'Qassim', 7),
  ('حائل', 'Hail', 8),
  ('الحدود الشمالية', 'Northern Borders', 9),
  ('جازان', 'Jazan', 10),
  ('نجران', 'Najran', 11),
  ('الباحة', 'Bahah', 12),
  ('الجوف', 'Jouf', 13);

-- إدراج مدن منطقة الرياض
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'الرياض', 'Riyadh', 1 FROM regions WHERE name_ar = 'الرياض'
UNION ALL
SELECT id, 'الخرج', 'Al Kharj', 2 FROM regions WHERE name_ar = 'الرياض'
UNION ALL
SELECT id, 'الدرعية', 'Diriyah', 3 FROM regions WHERE name_ar = 'الرياض'
UNION ALL
SELECT id, 'المجمعة', 'Al Majmaah', 4 FROM regions WHERE name_ar = 'الرياض'
UNION ALL
SELECT id, 'الزلفي', 'Zulfi', 5 FROM regions WHERE name_ar = 'الرياض'
UNION ALL
SELECT id, 'الأفلاج', 'Al Aflaj', 6 FROM regions WHERE name_ar = 'الرياض'
UNION ALL
SELECT id, 'وادي الدواسر', 'Wadi Al Dawasir', 7 FROM regions WHERE name_ar = 'الرياض'
UNION ALL
SELECT id, 'القويعية', 'Al Quwayiyah', 8 FROM regions WHERE name_ar = 'الرياض';

-- إدراج مدن مكة المكرمة
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'مكة المكرمة', 'Makkah', 1 FROM regions WHERE name_ar = 'مكة المكرمة'
UNION ALL
SELECT id, 'جدة', 'Jeddah', 2 FROM regions WHERE name_ar = 'مكة المكرمة'
UNION ALL
SELECT id, 'الطائف', 'Taif', 3 FROM regions WHERE name_ar = 'مكة المكرمة'
UNION ALL
SELECT id, 'القنفذة', 'Al Qunfudhah', 4 FROM regions WHERE name_ar = 'مكة المكرمة'
UNION ALL
SELECT id, 'رابغ', 'Rabigh', 5 FROM regions WHERE name_ar = 'مكة المكرمة'
UNION ALL
SELECT id, 'الليث', 'Al Lith', 6 FROM regions WHERE name_ar = 'مكة المكرمة'
UNION ALL
SELECT id, 'الجموم', 'Al Jumum', 7 FROM regions WHERE name_ar = 'مكة المكرمة';

-- إدراج مدن المدينة المنورة
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'المدينة المنورة', 'Madinah', 1 FROM regions WHERE name_ar = 'المدينة المنورة'
UNION ALL
SELECT id, 'ينبع', 'Yanbu', 2 FROM regions WHERE name_ar = 'المدينة المنورة'
UNION ALL
SELECT id, 'العلا', 'Al Ula', 3 FROM regions WHERE name_ar = 'المدينة المنورة'
UNION ALL
SELECT id, 'بدر', 'Badr', 4 FROM regions WHERE name_ar = 'المدينة المنورة'
UNION ALL
SELECT id, 'خيبر', 'Khaybar', 5 FROM regions WHERE name_ar = 'المدينة المنورة';

-- إدراج مدن المنطقة الشرقية
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'الدمام', 'Dammam', 1 FROM regions WHERE name_ar = 'المنطقة الشرقية'
UNION ALL
SELECT id, 'الخبر', 'Khobar', 2 FROM regions WHERE name_ar = 'المنطقة الشرقية'
UNION ALL
SELECT id, 'الظهران', 'Dhahran', 3 FROM regions WHERE name_ar = 'المنطقة الشرقية'
UNION ALL
SELECT id, 'الأحساء', 'Al Ahsa', 4 FROM regions WHERE name_ar = 'المنطقة الشرقية'
UNION ALL
SELECT id, 'القطيف', 'Qatif', 5 FROM regions WHERE name_ar = 'المنطقة الشرقية'
UNION ALL
SELECT id, 'الجبيل', 'Jubail', 6 FROM regions WHERE name_ar = 'المنطقة الشرقية'
UNION ALL
SELECT id, 'حفر الباطن', 'Hafar Al Batin', 7 FROM regions WHERE name_ar = 'المنطقة الشرقية'
UNION ALL
SELECT id, 'رأس تنورة', 'Ras Tanura', 8 FROM regions WHERE name_ar = 'المنطقة الشرقية';

-- إدراج مدن عسير
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'أبها', 'Abha', 1 FROM regions WHERE name_ar = 'عسير'
UNION ALL
SELECT id, 'خميس مشيط', 'Khamis Mushait', 2 FROM regions WHERE name_ar = 'عسير'
UNION ALL
SELECT id, 'بيشة', 'Bisha', 3 FROM regions WHERE name_ar = 'عسير'
UNION ALL
SELECT id, 'النماص', 'Al Namas', 4 FROM regions WHERE name_ar = 'عسير'
UNION ALL
SELECT id, 'محايل', 'Muhayil', 5 FROM regions WHERE name_ar = 'عسير';

-- إدراج مدن تبوك
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'تبوك', 'Tabuk', 1 FROM regions WHERE name_ar = 'تبوك'
UNION ALL
SELECT id, 'الوجه', 'Al Wajh', 2 FROM regions WHERE name_ar = 'تبوك'
UNION ALL
SELECT id, 'ضباء', 'Duba', 3 FROM regions WHERE name_ar = 'تبوك'
UNION ALL
SELECT id, 'تيماء', 'Tayma', 4 FROM regions WHERE name_ar = 'تبوك'
UNION ALL
SELECT id, 'أملج', 'Umluj', 5 FROM regions WHERE name_ar = 'تبوك';

-- إدراج مدن القصيم
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'بريدة', 'Buraydah', 1 FROM regions WHERE name_ar = 'القصيم'
UNION ALL
SELECT id, 'عنيزة', 'Unayzah', 2 FROM regions WHERE name_ar = 'القصيم'
UNION ALL
SELECT id, 'الرس', 'Al Rass', 3 FROM regions WHERE name_ar = 'القصيم'
UNION ALL
SELECT id, 'المذنب', 'Al Mithnab', 4 FROM regions WHERE name_ar = 'القصيم'
UNION ALL
SELECT id, 'البكيرية', 'Al Bukayriyah', 5 FROM regions WHERE name_ar = 'القصيم';

-- إدراج مدن حائل
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'حائل', 'Hail', 1 FROM regions WHERE name_ar = 'حائل'
UNION ALL
SELECT id, 'بقعاء', 'Baqaa', 2 FROM regions WHERE name_ar = 'حائل'
UNION ALL
SELECT id, 'الغزالة', 'Al Ghazalah', 3 FROM regions WHERE name_ar = 'حائل'
UNION ALL
SELECT id, 'الشنان', 'Al Shinan', 4 FROM regions WHERE name_ar = 'حائل';

-- إدراج مدن الحدود الشمالية
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'عرعر', 'Arar', 1 FROM regions WHERE name_ar = 'الحدود الشمالية'
UNION ALL
SELECT id, 'رفحاء', 'Rafha', 2 FROM regions WHERE name_ar = 'الحدود الشمالية'
UNION ALL
SELECT id, 'طريف', 'Turaif', 3 FROM regions WHERE name_ar = 'الحدود الشمالية';

-- إدراج مدن جازان
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'جازان', 'Jazan', 1 FROM regions WHERE name_ar = 'جازان'
UNION ALL
SELECT id, 'صبيا', 'Sabya', 2 FROM regions WHERE name_ar = 'جازان'
UNION ALL
SELECT id, 'أبو عريش', 'Abu Arish', 3 FROM regions WHERE name_ar = 'جازان'
UNION ALL
SELECT id, 'صامطة', 'Samtah', 4 FROM regions WHERE name_ar = 'جازان';

-- إدراج مدن نجران
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'نجران', 'Najran', 1 FROM regions WHERE name_ar = 'نجران'
UNION ALL
SELECT id, 'شرورة', 'Sharurah', 2 FROM regions WHERE name_ar = 'نجران'
UNION ALL
SELECT id, 'حبونا', 'Habuna', 3 FROM regions WHERE name_ar = 'نجران';

-- إدراج مدن الباحة
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'الباحة', 'Bahah', 1 FROM regions WHERE name_ar = 'الباحة'
UNION ALL
SELECT id, 'بلجرشي', 'Baljurashi', 2 FROM regions WHERE name_ar = 'الباحة'
UNION ALL
SELECT id, 'المخواة', 'Al Makhwah', 3 FROM regions WHERE name_ar = 'الباحة'
UNION ALL
SELECT id, 'المندق', 'Al Mandaq', 4 FROM regions WHERE name_ar = 'الباحة';

-- إدراج مدن الجوف
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT id, 'سكاكا', 'Sakakah', 1 FROM regions WHERE name_ar = 'الجوف'
UNION ALL
SELECT id, 'دومة الجندل', 'Dumat Al Jandal', 2 FROM regions WHERE name_ar = 'الجوف'
UNION ALL
SELECT id, 'القريات', 'Al Qurayyat', 3 FROM regions WHERE name_ar = 'الجوف';
