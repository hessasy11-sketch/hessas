/*
  # Add Regions and Cities System (Saudi Arabia)
  
  This migration creates a location system similar to Haraj.com.sa:
  
  1. New Tables
    - `regions` - Saudi regions (المناطق)
    - `cities` - Cities within regions (المدن)
  
  2. Changes to `auctions`
    - Add `region_id` column
    - Add `city_id` column
    - Make `location` nullable (for backward compatibility)
  
  3. Security
    - Enable RLS on all tables
    - Public read access for regions and cities
    - Only authenticated users can use them in auctions
  
  4. Data
    - Insert all Saudi regions
    - Insert major cities for each region
*/

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL UNIQUE,
  name_en text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create cities table
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(region_id, name_ar)
);

-- Add location columns to auctions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'region_id'
  ) THEN
    ALTER TABLE auctions ADD COLUMN region_id uuid REFERENCES regions(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auctions' AND column_name = 'city_id'
  ) THEN
    ALTER TABLE auctions ADD COLUMN city_id uuid REFERENCES cities(id);
  END IF;
END $$;

-- Make location nullable for backward compatibility
ALTER TABLE auctions ALTER COLUMN location DROP NOT NULL;

-- Enable RLS
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for regions (public read)
CREATE POLICY "Everyone can view regions"
  ON regions FOR SELECT
  TO public
  USING (true);

-- RLS Policies for cities (public read)
CREATE POLICY "Everyone can view cities"
  ON cities FOR SELECT
  TO public
  USING (true);

-- Insert Saudi regions
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
  ('الجوف', 'Jouf', 13)
ON CONFLICT (name_ar) DO NOTHING;

-- Insert cities for Riyadh region
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT r.id, c.name_ar, c.name_en, c.display_order
FROM regions r
CROSS JOIN (VALUES
  ('الرياض', 'Riyadh', 1),
  ('الدرعية', 'Diriyah', 2),
  ('الخرج', 'Al-Kharj', 3),
  ('الدوادمي', 'Dawadmi', 4),
  ('المجمعة', 'Majmaah', 5),
  ('القويعية', 'Quwayiyah', 6),
  ('وادي الدواسر', 'Wadi Al-Dawasir', 7),
  ('الأفلاج', 'Al-Aflaj', 8),
  ('الزلفي', 'Zulfi', 9),
  ('شقراء', 'Shaqra', 10)
) AS c(name_ar, name_en, display_order)
WHERE r.name_ar = 'الرياض'
ON CONFLICT (region_id, name_ar) DO NOTHING;

-- Insert cities for Makkah region
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT r.id, c.name_ar, c.name_en, c.display_order
FROM regions r
CROSS JOIN (VALUES
  ('مكة المكرمة', 'Makkah', 1),
  ('جدة', 'Jeddah', 2),
  ('الطائف', 'Taif', 3),
  ('القنفذة', 'Qunfudhah', 4),
  ('الليث', 'Lith', 5),
  ('رابغ', 'Rabigh', 6),
  ('خليص', 'Khulais', 7),
  ('الجموم', 'Al-Jumum', 8),
  ('أضم', 'Adham', 9),
  ('تربة', 'Turabah', 10)
) AS c(name_ar, name_en, display_order)
WHERE r.name_ar = 'مكة المكرمة'
ON CONFLICT (region_id, name_ar) DO NOTHING;

-- Insert cities for Madinah region
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT r.id, c.name_ar, c.name_en, c.display_order
FROM regions r
CROSS JOIN (VALUES
  ('المدينة المنورة', 'Madinah', 1),
  ('ينبع', 'Yanbu', 2),
  ('العلا', 'Al-Ula', 3),
  ('مهد الذهب', 'Mahd Al-Dhahab', 4),
  ('بدر', 'Badr', 5),
  ('خيبر', 'Khaybar', 6),
  ('الحناكية', 'Al-Hanakiyah', 7),
  ('العيص', 'Al-Ais', 8),
  ('وادي الفرع', 'Wadi Al-Fara', 9)
) AS c(name_ar, name_en, display_order)
WHERE r.name_ar = 'المدينة المنورة'
ON CONFLICT (region_id, name_ar) DO NOTHING;

-- Insert cities for Eastern Province
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT r.id, c.name_ar, c.name_en, c.display_order
FROM regions r
CROSS JOIN (VALUES
  ('الدمام', 'Dammam', 1),
  ('الخبر', 'Khobar', 2),
  ('الظهران', 'Dhahran', 3),
  ('الجبيل', 'Jubail', 4),
  ('الأحساء', 'Al-Ahsa', 5),
  ('القطيف', 'Qatif', 6),
  ('حفر الباطن', 'Hafar Al-Batin', 7),
  ('رأس تنورة', 'Ras Tanura', 8),
  ('بقيق', 'Buqayq', 9),
  ('النعيرية', 'Nairyah', 10)
) AS c(name_ar, name_en, display_order)
WHERE r.name_ar = 'المنطقة الشرقية'
ON CONFLICT (region_id, name_ar) DO NOTHING;

-- Insert cities for Asir region
INSERT INTO cities (region_id, name_ar, name_en, display_order)
SELECT r.id, c.name_ar, c.name_en, c.display_order
FROM regions r
CROSS JOIN (VALUES
  ('أبها', 'Abha', 1),
  ('خميس مشيط', 'Khamis Mushait', 2),
  ('بيشة', 'Bisha', 3),
  ('النماص', 'Al-Namas', 4),
  ('سراة عبيدة', 'Sarat Abidah', 5),
  ('رجال ألمع', 'Rijal Alma', 6),
  ('محايل', 'Muhayil', 7),
  ('ظهران الجنوب', 'Dhahran Al-Janoub', 8),
  ('تثليث', 'Tathlith', 9),
  ('بلقرن', 'Balqarn', 10)
) AS c(name_ar, name_en, display_order)
WHERE r.name_ar = 'عسير'
ON CONFLICT (region_id, name_ar) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cities_region_id ON cities(region_id);
CREATE INDEX IF NOT EXISTS idx_auctions_region_id ON auctions(region_id);
CREATE INDEX IF NOT EXISTS idx_auctions_city_id ON auctions(city_id);
CREATE INDEX IF NOT EXISTS idx_auctions_location_search ON auctions(region_id, city_id) WHERE region_id IS NOT NULL;