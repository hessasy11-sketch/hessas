/*
  # نظام قيادة المزارع - Farm Command System
  
  ## الغرض
  نظام جديد يستبدل "التشغيل والمتابعة" القديم بنموذج "farm-centric".
  المزارع "تُولد" بعد اكتمال الاستثمار وتصبح وحدات تشغيلية كاملة.
  
  ## الجداول الجديدة (بادئة fc_)
  1. fc_operational_farms - المزارع التشغيلية
  2. fc_farm_contents - محتويات المزرعة
  3. fc_teams - الفرق
  4. fc_team_members - أعضاء الفرق
  5. fc_technicians - الفنيين والبلاغات
  6. fc_equipment - المعدات والآلات
  7. fc_facilities - المصانع والمنشآت
  8. fc_financial_ledger - السجل المالي
  9. fc_event_log - سجل الأحداث
  10. fc_birth_records - سجل ولادة المزارع
*/

-- =============================================================================
-- 1. المزارع التشغيلية
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_operational_farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  reference_farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE RESTRICT,
  
  operational_name text NOT NULL,
  operational_status text NOT NULL DEFAULT 'setup' CHECK (operational_status IN ('setup', 'active', 'maintenance', 'inactive')),
  
  farm_manager_id uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  manager_assigned_at timestamptz,
  
  total_capacity integer DEFAULT 0,
  current_occupancy integer DEFAULT 0,
  available_slots integer GENERATED ALWAYS AS (total_capacity - current_occupancy) STORED,
  
  born_at timestamptz NOT NULL DEFAULT now(),
  operational_since timestamptz,
  last_activity_at timestamptz,
  
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fc_operational_farms_reference ON fc_operational_farms(reference_farm_id);
CREATE INDEX idx_fc_operational_farms_manager ON fc_operational_farms(farm_manager_id);
CREATE INDEX idx_fc_operational_farms_status ON fc_operational_farms(operational_status);

-- =============================================================================
-- 2. محتويات المزرعة
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_farm_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  operational_farm_id uuid NOT NULL REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  
  content_type text NOT NULL CHECK (content_type IN ('trees', 'crops', 'livestock', 'other')),
  name_ar text NOT NULL,
  name_en text,
  
  quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unit',
  
  section_code text,
  plot_code text,
  internal_code text,
  
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fc_farm_contents_farm ON fc_farm_contents(operational_farm_id);
CREATE INDEX idx_fc_farm_contents_type ON fc_farm_contents(content_type);

-- =============================================================================
-- 3. الفرق
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  operational_farm_id uuid NOT NULL REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  
  team_name text NOT NULL,
  team_type text NOT NULL CHECK (team_type IN ('operations', 'maintenance', 'harvesting', 'irrigation', 'security', 'custom')),
  
  team_leader_id uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  
  is_active boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fc_teams_farm ON fc_teams(operational_farm_id);
CREATE INDEX idx_fc_teams_leader ON fc_teams(team_leader_id);

-- =============================================================================
-- 4. أعضاء الفريق
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  team_id uuid NOT NULL REFERENCES fc_teams(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES platform_staff(id) ON DELETE CASCADE,
  
  role_in_team text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  
  is_active boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(team_id, staff_id)
);

CREATE INDEX idx_fc_team_members_team ON fc_team_members(team_id);
CREATE INDEX idx_fc_team_members_staff ON fc_team_members(staff_id);

-- =============================================================================
-- 5. الفنيين
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  operational_farm_id uuid NOT NULL REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  
  ticket_number text NOT NULL UNIQUE,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  issue_title text NOT NULL,
  issue_description text NOT NULL,
  
  assigned_to uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  
  resolved_at timestamptz,
  resolution_notes text,
  
  created_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fc_technicians_farm ON fc_technicians(operational_farm_id);
CREATE INDEX idx_fc_technicians_assigned ON fc_technicians(assigned_to);
CREATE INDEX idx_fc_technicians_status ON fc_technicians(status);

-- =============================================================================
-- 6. المعدات
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  operational_farm_id uuid NOT NULL REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  
  equipment_name text NOT NULL,
  equipment_type text NOT NULL,
  
  serial_number text,
  purchase_date date,
  purchase_cost numeric(12,2),
  
  status text NOT NULL DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'broken', 'retired')),
  
  last_maintenance_date date,
  next_maintenance_date date,
  
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fc_equipment_farm ON fc_equipment(operational_farm_id);
CREATE INDEX idx_fc_equipment_status ON fc_equipment(status);

-- =============================================================================
-- 7. المنشآت
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  operational_farm_id uuid NOT NULL REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  
  facility_name text NOT NULL,
  facility_type text NOT NULL CHECK (facility_type IN ('factory', 'warehouse', 'office', 'workshop', 'other')),
  
  area_sqm numeric(10,2),
  capacity_description text,
  
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_construction')),
  
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fc_facilities_farm ON fc_facilities(operational_farm_id);

-- =============================================================================
-- 8. السجل المالي
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  operational_farm_id uuid NOT NULL REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  
  transaction_type text NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category text NOT NULL,
  
  amount numeric(12,2) NOT NULL,
  description text NOT NULL,
  
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  
  recorded_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  
  receipt_url text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fc_financial_ledger_farm ON fc_financial_ledger(operational_farm_id);
CREATE INDEX idx_fc_financial_ledger_type ON fc_financial_ledger(transaction_type);
CREATE INDEX idx_fc_financial_ledger_date ON fc_financial_ledger(transaction_date);

-- =============================================================================
-- 9. سجل الأحداث
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  operational_farm_id uuid NOT NULL REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  
  event_type text NOT NULL,
  event_title text NOT NULL,
  event_description text,
  
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
  
  triggered_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fc_event_log_farm ON fc_event_log(operational_farm_id);
CREATE INDEX idx_fc_event_log_type ON fc_event_log(event_type);
CREATE INDEX idx_fc_event_log_created ON fc_event_log(created_at DESC);

-- =============================================================================
-- 10. سجل ولادة المزارع
-- =============================================================================

CREATE TABLE IF NOT EXISTS fc_birth_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  operational_farm_id uuid NOT NULL UNIQUE REFERENCES fc_operational_farms(id) ON DELETE CASCADE,
  
  source_contract_id uuid REFERENCES b2f_contracts(id) ON DELETE SET NULL,
  source_sales_request_id uuid REFERENCES b2f_sales_requests(id) ON DELETE SET NULL,
  
  birth_reason text NOT NULL DEFAULT 'investment_completion',
  
  wizard_completed boolean NOT NULL DEFAULT false,
  setup_step integer NOT NULL DEFAULT 1,
  
  activated_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  
  born_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fc_birth_records_contract ON fc_birth_records(source_contract_id);
CREATE INDEX idx_fc_birth_records_sales ON fc_birth_records(source_sales_request_id);

-- =============================================================================
-- Triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION update_fc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fc_operational_farms_updated_at BEFORE UPDATE ON fc_operational_farms
  FOR EACH ROW EXECUTE FUNCTION update_fc_updated_at();

CREATE TRIGGER fc_farm_contents_updated_at BEFORE UPDATE ON fc_farm_contents
  FOR EACH ROW EXECUTE FUNCTION update_fc_updated_at();

CREATE TRIGGER fc_teams_updated_at BEFORE UPDATE ON fc_teams
  FOR EACH ROW EXECUTE FUNCTION update_fc_updated_at();

CREATE TRIGGER fc_technicians_updated_at BEFORE UPDATE ON fc_technicians
  FOR EACH ROW EXECUTE FUNCTION update_fc_updated_at();

CREATE TRIGGER fc_equipment_updated_at BEFORE UPDATE ON fc_equipment
  FOR EACH ROW EXECUTE FUNCTION update_fc_updated_at();

CREATE TRIGGER fc_facilities_updated_at BEFORE UPDATE ON fc_facilities
  FOR EACH ROW EXECUTE FUNCTION update_fc_updated_at();

CREATE TRIGGER fc_financial_ledger_updated_at BEFORE UPDATE ON fc_financial_ledger
  FOR EACH ROW EXECUTE FUNCTION update_fc_updated_at();

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE fc_operational_farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_farm_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE fc_birth_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage fc_operational_farms" ON fc_operational_farms FOR ALL USING (true);
CREATE POLICY "Staff can manage fc_farm_contents" ON fc_farm_contents FOR ALL USING (true);
CREATE POLICY "Staff can manage fc_teams" ON fc_teams FOR ALL USING (true);
CREATE POLICY "Staff can manage fc_team_members" ON fc_team_members FOR ALL USING (true);
CREATE POLICY "Staff can manage fc_technicians" ON fc_technicians FOR ALL USING (true);
CREATE POLICY "Staff can manage fc_equipment" ON fc_equipment FOR ALL USING (true);
CREATE POLICY "Staff can manage fc_facilities" ON fc_facilities FOR ALL USING (true);
CREATE POLICY "Staff can manage fc_financial_ledger" ON fc_financial_ledger FOR ALL USING (true);
CREATE POLICY "Staff can manage fc_event_log" ON fc_event_log FOR ALL USING (true);
CREATE POLICY "Staff can manage fc_birth_records" ON fc_birth_records FOR ALL USING (true);