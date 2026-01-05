/*
  # نظام الفرق العاملة في المزارع

  1. الجداول
    - fc_farm_teams (الفرق)
    - fc_farm_team_members (أعضاء الفرق)

  2. الميزات
    - ربط الفرق بـ operational_farm_id
    - تعيين قائد لكل فريق
    - تتبع حالة الفريق

  3. الأمان
    - RLS policies
*/

-- ===== 1. جدول الفرق =====
CREATE TABLE IF NOT EXISTS fc_farm_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operational_farm_id UUID NOT NULL REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  team_role TEXT NOT NULL DEFAULT 'operations' CHECK (team_role IN (
    'operations',
    'maintenance',
    'harvest',
    'irrigation',
    'fertilization',
    'pest_control'
  )),
  team_leader_id UUID REFERENCES platform_staff(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farm_teams_operational_farm ON fc_farm_teams(operational_farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_teams_leader ON fc_farm_teams(team_leader_id);

-- ===== 2. جدول أعضاء الفرق =====
CREATE TABLE IF NOT EXISTS fc_farm_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES fc_farm_teams(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  role_in_team TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON fc_farm_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_staff ON fc_farm_team_members(staff_id);

-- ===== RLS Policies =====

-- fc_farm_teams policies
ALTER TABLE fc_farm_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view teams"
  ON fc_farm_teams FOR SELECT
  TO authenticated, service_role
  USING (true);

CREATE POLICY "Authenticated staff can create teams"
  ON fc_farm_teams FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can update teams"
  ON fc_farm_teams FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can delete teams"
  ON fc_farm_teams FOR DELETE
  TO authenticated, service_role
  USING (true);

-- fc_farm_team_members policies
ALTER TABLE fc_farm_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view team members"
  ON fc_farm_team_members FOR SELECT
  TO authenticated, service_role
  USING (true);

CREATE POLICY "Authenticated staff can add team members"
  ON fc_farm_team_members FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can update team members"
  ON fc_farm_team_members FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can remove team members"
  ON fc_farm_team_members FOR DELETE
  TO authenticated, service_role
  USING (true);