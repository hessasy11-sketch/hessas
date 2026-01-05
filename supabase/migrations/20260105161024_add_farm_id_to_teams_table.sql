/*
  # إضافة farm_id لجدول الفرق

  1. Changes
    - إضافة عمود `farm_id` لـ `fc_farm_teams`
    - ربطه بجدول `b2f_farms`
    - جعل `operational_farm_id` nullable
    - إضافة index للأداء
  
  2. Security
    - تحديث RLS policies
*/

-- إضافة farm_id
ALTER TABLE fc_farm_teams
ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE;

-- جعل operational_farm_id nullable
ALTER TABLE fc_farm_teams
ALTER COLUMN operational_farm_id DROP NOT NULL;

-- إضافة index
CREATE INDEX IF NOT EXISTS idx_farm_teams_farm_id ON fc_farm_teams(farm_id);

-- تحديث RLS policies
DROP POLICY IF EXISTS "Anyone can view farm teams" ON fc_farm_teams;
DROP POLICY IF EXISTS "Service role can manage farm teams" ON fc_farm_teams;

CREATE POLICY "Anyone can view farm teams"
  ON fc_farm_teams FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage farm teams"
  ON fc_farm_teams FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
