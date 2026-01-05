/*
  # المرحلة 5: نظام المعدات والحاسبة التشغيلية
  
  ## الجداول الجديدة
  
  ### 1. `farm_equipment` - معدات المزرعة
  - `id` (uuid, primary key)
  - `farm_id` (uuid, foreign key → b2f_farms)
  - `name` (text) - اسم المعدة
  - `status` (text) - الحالة: working, maintenance, stopped
  - `notes` (text) - ملاحظات
  - `created_at`, `updated_at`
  
  ### 2. `farm_financial_entries` - المدخولات والمصروفات
  - `id` (uuid, primary key)
  - `farm_id` (uuid, foreign key → b2f_farms)
  - `entry_type` (text) - النوع: income, expense
  - `amount` (numeric) - المبلغ
  - `entry_date` (date) - تاريخ العملية
  - `notes` (text) - ملاحظات
  - `created_at`, `updated_at`
  
  ## الأمان
  - تفعيل RLS على جميع الجداول
  - استخدام الدوال الموجودة: is_farm_manager, is_team_member_of_farm
  - فقط مدير المزرعة والإداريين يمكنهم التعديل
  - أعضاء الفريق يمكنهم القراءة فقط
*/

-- ============================================================
-- 1. جدول معدات المزرعة
-- ============================================================

CREATE TABLE IF NOT EXISTS farm_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'working' CHECK (status IN ('working', 'maintenance', 'stopped')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_farm_equipment_farm_id ON farm_equipment(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_equipment_status ON farm_equipment(status);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS farm_equipment_updated_at ON farm_equipment;
CREATE TRIGGER farm_equipment_updated_at
  BEFORE UPDATE ON farm_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. جدول المدخولات والمصروفات
-- ============================================================

CREATE TABLE IF NOT EXISTS farm_financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('income', 'expense')),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_farm_financial_farm_id ON farm_financial_entries(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_financial_entry_type ON farm_financial_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_farm_financial_entry_date ON farm_financial_entries(entry_date);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS farm_financial_entries_updated_at ON farm_financial_entries;
CREATE TRIGGER farm_financial_entries_updated_at
  BEFORE UPDATE ON farm_financial_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. RLS Policies - farm_equipment
-- ============================================================

ALTER TABLE farm_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm team and admins can view equipment" ON farm_equipment;
DROP POLICY IF EXISTS "Farm manager and admins can insert equipment" ON farm_equipment;
DROP POLICY IF EXISTS "Farm manager and admins can update equipment" ON farm_equipment;
DROP POLICY IF EXISTS "Farm manager and admins can delete equipment" ON farm_equipment;

-- Farm team members and admins can view equipment
CREATE POLICY "Farm team and admins can view equipment"
  ON farm_equipment FOR SELECT
  USING (
    is_team_member_of_farm(farm_id, (SELECT current_setting('app.current_user_id', true)::uuid))
    OR is_platform_admin()
  );

-- Farm manager and admins can insert equipment
CREATE POLICY "Farm manager and admins can insert equipment"
  ON farm_equipment FOR INSERT
  WITH CHECK (
    is_farm_manager(farm_id, (SELECT current_setting('app.current_user_id', true)::uuid))
    OR is_platform_admin()
  );

-- Farm manager and admins can update equipment
CREATE POLICY "Farm manager and admins can update equipment"
  ON farm_equipment FOR UPDATE
  USING (
    is_farm_manager(farm_id, (SELECT current_setting('app.current_user_id', true)::uuid))
    OR is_platform_admin()
  );

-- Farm manager and admins can delete equipment
CREATE POLICY "Farm manager and admins can delete equipment"
  ON farm_equipment FOR DELETE
  USING (
    is_farm_manager(farm_id, (SELECT current_setting('app.current_user_id', true)::uuid))
    OR is_platform_admin()
  );

-- ============================================================
-- 4. RLS Policies - farm_financial_entries
-- ============================================================

ALTER TABLE farm_financial_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm team and admins can view financial entries" ON farm_financial_entries;
DROP POLICY IF EXISTS "Farm manager and admins can insert financial entries" ON farm_financial_entries;
DROP POLICY IF EXISTS "Farm manager and admins can update financial entries" ON farm_financial_entries;
DROP POLICY IF EXISTS "Farm manager and admins can delete financial entries" ON farm_financial_entries;

-- Farm team members and admins can view financial entries
CREATE POLICY "Farm team and admins can view financial entries"
  ON farm_financial_entries FOR SELECT
  USING (
    is_team_member_of_farm(farm_id, (SELECT current_setting('app.current_user_id', true)::uuid))
    OR is_platform_admin()
  );

-- Farm manager and admins can insert financial entries
CREATE POLICY "Farm manager and admins can insert financial entries"
  ON farm_financial_entries FOR INSERT
  WITH CHECK (
    is_farm_manager(farm_id, (SELECT current_setting('app.current_user_id', true)::uuid))
    OR is_platform_admin()
  );

-- Farm manager and admins can update financial entries
CREATE POLICY "Farm manager and admins can update financial entries"
  ON farm_financial_entries FOR UPDATE
  USING (
    is_farm_manager(farm_id, (SELECT current_setting('app.current_user_id', true)::uuid))
    OR is_platform_admin()
  );

-- Farm manager and admins can delete financial entries
CREATE POLICY "Farm manager and admins can delete financial entries"
  ON farm_financial_entries FOR DELETE
  USING (
    is_farm_manager(farm_id, (SELECT current_setting('app.current_user_id', true)::uuid))
    OR is_platform_admin()
  );

-- ============================================================
-- 5. Summary Functions
-- ============================================================

-- Get equipment summary for a farm
CREATE OR REPLACE FUNCTION get_farm_equipment_summary(p_farm_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_summary jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'working', COUNT(*) FILTER (WHERE status = 'working'),
    'maintenance', COUNT(*) FILTER (WHERE status = 'maintenance'),
    'stopped', COUNT(*) FILTER (WHERE status = 'stopped')
  )
  INTO v_summary
  FROM farm_equipment
  WHERE farm_id = p_farm_id;
  
  RETURN COALESCE(v_summary, '{"total":0,"working":0,"maintenance":0,"stopped":0}'::jsonb);
END;
$$;

-- Get financial summary for a farm (overload with single parameter)
CREATE OR REPLACE FUNCTION get_farm_financial_summary(p_farm_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_summary jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_income', COALESCE(SUM(amount) FILTER (WHERE entry_type = 'income'), 0),
    'total_expense', COALESCE(SUM(amount) FILTER (WHERE entry_type = 'expense'), 0),
    'balance', COALESCE(
      SUM(amount) FILTER (WHERE entry_type = 'income') - 
      SUM(amount) FILTER (WHERE entry_type = 'expense'), 
      0
    ),
    'income_count', COUNT(*) FILTER (WHERE entry_type = 'income'),
    'expense_count', COUNT(*) FILTER (WHERE entry_type = 'expense')
  )
  INTO v_summary
  FROM farm_financial_entries
  WHERE farm_id = p_farm_id;
  
  RETURN COALESCE(v_summary, '{"total_income":0,"total_expense":0,"balance":0,"income_count":0,"expense_count":0}'::jsonb);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_farm_equipment_summary(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_farm_financial_summary(uuid) TO authenticated, anon;

-- Add helpful comments
COMMENT ON TABLE farm_equipment IS 'Phase 5: Farm equipment tracking - lightweight system';
COMMENT ON TABLE farm_financial_entries IS 'Phase 5: Simple income/expense tracking for farms';
COMMENT ON FUNCTION get_farm_equipment_summary(uuid) IS 'Returns equipment counts by status';
