/*
  # إضافة farm_id مباشرة لجدول المحتويات

  1. Changes
    - إضافة عمود `farm_id` لـ `fc_farm_contents`
    - ربطه بجدول `b2f_farms`
    - جعل `operational_farm_id` nullable
    - إضافة index للأداء
  
  2. Security
    - تحديث RLS policies
*/

-- إضافة farm_id
ALTER TABLE fc_farm_contents
ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE;

-- جعل operational_farm_id nullable
ALTER TABLE fc_farm_contents
ALTER COLUMN operational_farm_id DROP NOT NULL;

-- إضافة index
CREATE INDEX IF NOT EXISTS idx_farm_contents_farm_id ON fc_farm_contents(farm_id);

-- تحديث RLS policy للسماح بالقراءة حسب farm_id
DROP POLICY IF EXISTS "Anyone can view farm contents" ON fc_farm_contents;

CREATE POLICY "Anyone can view farm contents"
  ON fc_farm_contents FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage farm contents"
  ON fc_farm_contents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
