/*
  # إضافة الأعمدة المفقودة فقط
  
  1. إضافة full_name لـ b2f_investor_accounts
  2. إضافة id لـ b2f_admin_users
  3. إصلاح RLS policies في farm_team_members
*/

-- 1. إضافة عمود full_name لـ b2f_investor_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investor_accounts' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE b2f_investor_accounts ADD COLUMN full_name TEXT;
  END IF;
END $$;

-- تحديث القيم الموجودة
UPDATE b2f_investor_accounts
SET full_name = contact_name
WHERE full_name IS NULL AND contact_name IS NOT NULL;

-- 2. إضافة عمود id لـ b2f_admin_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_admin_users' 
    AND column_name = 'id'
  ) THEN
    ALTER TABLE b2f_admin_users ADD COLUMN id UUID;
  END IF;
END $$;

-- تحديث القيم الموجودة (id = user_id)
UPDATE b2f_admin_users
SET id = user_id
WHERE id IS NULL OR id != user_id;

-- 3. إصلاح RLS policies في farm_team_members
-- حذف السياسات المتعارضة
DROP POLICY IF EXISTS "Admins can manage all team members" ON farm_team_members;
DROP POLICY IF EXISTS "Team members can view own farm team" ON farm_team_members;
DROP POLICY IF EXISTS "المدير العام يرى جميع الأعضاء" ON farm_team_members;
DROP POLICY IF EXISTS "المدير العام يضيف أعضاء" ON farm_team_members;
DROP POLICY IF EXISTS "المدير العام يحدث الأعضاء" ON farm_team_members;

-- إنشاء سياسات بسيطة بدون استدعاءات دوال معقدة
CREATE POLICY "Everyone can view farm team members"
  ON farm_team_members
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can manage farm team members"
  ON farm_team_members
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_farm_team_user_farm 
  ON farm_team_members(user_id, farm_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_investor_accounts_full_name 
  ON b2f_investor_accounts(full_name);

CREATE INDEX IF NOT EXISTS idx_admin_users_id 
  ON b2f_admin_users(id);
