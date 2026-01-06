/*
  # Farm Operational Dashboard System (Fixed)

  1. New Tables
    - `farm_assets` - معدات وآلات المزرعة
    - `farm_maintenance_logs` - سجلات الصيانة
    - `farm_inventory` - محتويات المزرعة (أشجار/محاصيل)
    - `farm_factory_batches` - دفعات الإنتاج (للمصانع)
    - `farm_visit_requests` - طلبات الزيارة

  2. Security
    - RLS policies for farm team access
    - GM and Farm Managers full access
    - Team members see only their farm

  3. Functions
    - get_farm_dashboard_summary() - ملخص المزرعة
    - can_manage_farm() - التحقق من صلاحيات الإدارة
*/

-- Table: farm_assets (المعدات والآلات)
CREATE TABLE IF NOT EXISTS farm_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_en text,
  type text NOT NULL, -- tractor, irrigation_system, tools, vehicle, etc
  status text NOT NULL DEFAULT 'active', -- active, under_maintenance, retired, rented
  ownership text NOT NULL DEFAULT 'owned', -- owned, rented, leased
  purchase_date date,
  purchase_price numeric(12,2),
  last_maintenance_date date,
  next_maintenance_date date,
  location text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,

  CONSTRAINT valid_asset_status CHECK (status IN ('active', 'under_maintenance', 'retired', 'rented')),
  CONSTRAINT valid_ownership CHECK (ownership IN ('owned', 'rented', 'leased'))
);

CREATE INDEX IF NOT EXISTS idx_farm_assets_farm_id ON farm_assets(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_assets_status ON farm_assets(status);

-- Table: farm_maintenance_logs (سجلات الصيانة)
CREATE TABLE IF NOT EXISTS farm_maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES farm_assets(id) ON DELETE SET NULL,
  type text NOT NULL, -- routine, repair, emergency, inspection
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  priority text NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  assigned_to uuid,
  scheduled_date date,
  completed_date date,
  cost numeric(12,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,

  CONSTRAINT valid_maintenance_type CHECK (type IN ('routine', 'repair', 'emergency', 'inspection')),
  CONSTRAINT valid_maintenance_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT valid_maintenance_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_farm_maintenance_farm_id ON farm_maintenance_logs(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_maintenance_status ON farm_maintenance_logs(status);
CREATE INDEX IF NOT EXISTS idx_farm_maintenance_assigned_to ON farm_maintenance_logs(assigned_to);

-- Table: farm_inventory (محتويات المزرعة)
CREATE TABLE IF NOT EXISTS farm_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  item_type text NOT NULL, -- tree, crop, seed, fertilizer, tool, supply
  name text NOT NULL,
  name_en text,
  category text, -- olive_tree, palm_tree, wheat, vegetables, etc
  quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unit', -- unit, kg, ton, liter, meter, etc
  location_section text, -- القسم أو المنطقة داخل المزرعة
  planted_date date,
  expected_harvest_date date,
  health_status text DEFAULT 'good', -- excellent, good, fair, poor, diseased
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,

  CONSTRAINT valid_item_type CHECK (item_type IN ('tree', 'crop', 'seed', 'fertilizer', 'tool', 'supply')),
  CONSTRAINT valid_health_status CHECK (health_status IN ('excellent', 'good', 'fair', 'poor', 'diseased')),
  CONSTRAINT positive_quantity CHECK (quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_farm_inventory_farm_id ON farm_inventory(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_inventory_item_type ON farm_inventory(item_type);
CREATE INDEX IF NOT EXISTS idx_farm_inventory_category ON farm_inventory(category);

-- Table: farm_factory_batches (دفعات الإنتاج - للمصانع)
CREATE TABLE IF NOT EXISTS farm_factory_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  product_type text NOT NULL, -- olive_oil, dates, jam, pickles, etc
  input_quantity numeric(12,2) NOT NULL,
  input_unit text NOT NULL,
  output_quantity numeric(12,2),
  output_unit text,
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  quality_grade text DEFAULT 'standard', -- premium, standard, economy
  status text NOT NULL DEFAULT 'in_progress', -- in_progress, completed, quality_check, packaged, sold
  production_cost numeric(12,2),
  sale_price numeric(12,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,

  CONSTRAINT valid_batch_status CHECK (status IN ('in_progress', 'completed', 'quality_check', 'packaged', 'sold')),
  CONSTRAINT valid_quality_grade CHECK (quality_grade IN ('premium', 'standard', 'economy')),
  CONSTRAINT positive_input CHECK (input_quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_farm_factory_farm_id ON farm_factory_batches(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_factory_status ON farm_factory_batches(status);
CREATE INDEX IF NOT EXISTS idx_farm_factory_production_date ON farm_factory_batches(production_date);

-- Table: farm_visit_requests (طلبات الزيارة)
CREATE TABLE IF NOT EXISTS farm_visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  requester_type text NOT NULL, -- investor, manager, technician, auditor, guest
  requester_id uuid, -- can be investor_account_id or staff_id
  requester_name text NOT NULL,
  requester_phone text NOT NULL,
  visit_purpose text NOT NULL,
  preferred_date date NOT NULL,
  preferred_time text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, completed, cancelled
  approved_by uuid,
  approval_date timestamptz,
  actual_visit_date timestamptz,
  visitor_count integer DEFAULT 1,
  notes text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_requester_type CHECK (requester_type IN ('investor', 'manager', 'technician', 'auditor', 'guest')),
  CONSTRAINT valid_visit_status CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  CONSTRAINT positive_visitor_count CHECK (visitor_count > 0)
);

CREATE INDEX IF NOT EXISTS idx_farm_visits_farm_id ON farm_visit_requests(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_visits_status ON farm_visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_farm_visits_requester ON farm_visit_requests(requester_id);

-- Add has_factory flag to farms if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_farms' AND column_name = 'has_factory'
  ) THEN
    ALTER TABLE b2f_farms ADD COLUMN has_factory boolean DEFAULT false;
  END IF;
END $$;

-- Function: can_manage_farm (التحقق من صلاحية إدارة المزرعة)
CREATE OR REPLACE FUNCTION can_manage_farm(
  p_user_id uuid,
  p_farm_id uuid
) RETURNS boolean AS $$
DECLARE
  v_staff_role text;
  v_is_farm_manager boolean;
BEGIN
  -- Get staff role
  SELECT role INTO v_staff_role
  FROM platform_staff
  WHERE user_id = p_user_id OR id = p_user_id;

  -- GM and National Farm Manager can manage all farms
  IF v_staff_role IN ('general_manager', 'مدير_المزارع_الوطني') THEN
    RETURN true;
  END IF;

  -- Check if farm manager
  SELECT EXISTS(
    SELECT 1 FROM farm_team
    WHERE farm_id = p_farm_id
      AND user_id = p_user_id
      AND role = 'farm_manager'
      AND is_active = true
  ) INTO v_is_farm_manager;

  RETURN v_is_farm_manager;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: can_view_farm (التحقق من صلاحية عرض المزرعة)
CREATE OR REPLACE FUNCTION can_view_farm(
  p_user_id uuid,
  p_farm_id uuid
) RETURNS boolean AS $$
DECLARE
  v_staff_role text;
  v_is_team_member boolean;
BEGIN
  -- Get staff role
  SELECT role INTO v_staff_role
  FROM platform_staff
  WHERE user_id = p_user_id OR id = p_user_id;

  -- GM and National Farm Manager can view all farms
  IF v_staff_role IN ('general_manager', 'مدير_المزارع_الوطني') THEN
    RETURN true;
  END IF;

  -- Check if team member
  SELECT EXISTS(
    SELECT 1 FROM farm_team
    WHERE farm_id = p_farm_id
      AND user_id = p_user_id
      AND is_active = true
  ) INTO v_is_team_member;

  RETURN v_is_team_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get_farm_dashboard_summary (ملخص المزرعة)
CREATE OR REPLACE FUNCTION get_farm_dashboard_summary(p_farm_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_farm_info jsonb;
  v_manager_info jsonb;
  v_tasks_stats jsonb;
  v_financial_stats jsonb;
  v_team_count integer;
BEGIN
  -- Get farm basic info
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'code', code,
    'location', location,
    'operational_status', operational_status,
    'investment_type', type,
    'has_factory', COALESCE(has_factory, false),
    'created_at', created_at
  ) INTO v_farm_info
  FROM b2f_farms
  WHERE id = p_farm_id;

  -- Get farm manager info
  SELECT jsonb_build_object(
    'id', ps.id,
    'name', ps.full_name,
    'phone', ps.phone,
    'assigned_date', ft.created_at
  ) INTO v_manager_info
  FROM farm_team ft
  JOIN platform_staff ps ON ft.user_id = ps.user_id OR ft.user_id = ps.id
  WHERE ft.farm_id = p_farm_id
    AND ft.role = 'farm_manager'
    AND ft.is_active = true
  LIMIT 1;

  -- Get tasks statistics
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'open', COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')),
    'urgent', COUNT(*) FILTER (WHERE priority = 'urgent' AND status IN ('pending', 'in_progress')),
    'completed_this_month', COUNT(*) FILTER (
      WHERE status = 'approved'
      AND approved_at >= date_trunc('month', CURRENT_DATE)
    )
  ) INTO v_tasks_stats
  FROM farm_tasks
  WHERE farm_id = p_farm_id;

  -- Get financial statistics (from farm_expenses if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'farm_expenses') THEN
    EXECUTE format('
      SELECT jsonb_build_object(
        ''expenses_this_month'', COALESCE(SUM(amount) FILTER (
          WHERE expense_date >= date_trunc(''month'', CURRENT_DATE)
        ), 0),
        ''expenses_pending_approval'', COUNT(*) FILTER (WHERE approval_status = ''pending''),
        ''total_expenses'', COALESCE(SUM(amount), 0)
      )
      FROM farm_expenses
      WHERE farm_id = $1
    ') INTO v_financial_stats USING p_farm_id;
  ELSE
    v_financial_stats := jsonb_build_object(
      'expenses_this_month', 0,
      'expenses_pending_approval', 0,
      'total_expenses', 0
    );
  END IF;

  -- Get team count
  SELECT COUNT(*) INTO v_team_count
  FROM farm_team
  WHERE farm_id = p_farm_id AND is_active = true;

  -- Build final summary
  RETURN jsonb_build_object(
    'farm', v_farm_info,
    'manager', v_manager_info,
    'tasks', v_tasks_stats,
    'financial', v_financial_stats,
    'team_count', v_team_count,
    'generated_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for farm_assets
ALTER TABLE farm_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm team can view farm assets"
  ON farm_assets FOR SELECT
  USING (
    can_view_farm(auth.uid(), farm_id)
  );

CREATE POLICY "Farm managers can manage assets"
  ON farm_assets FOR ALL
  USING (
    can_manage_farm(auth.uid(), farm_id)
  );

-- RLS Policies for farm_maintenance_logs
ALTER TABLE farm_maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm team can view maintenance logs"
  ON farm_maintenance_logs FOR SELECT
  USING (
    can_view_farm(auth.uid(), farm_id)
  );

CREATE POLICY "Farm managers can manage maintenance"
  ON farm_maintenance_logs FOR ALL
  USING (
    can_manage_farm(auth.uid(), farm_id)
  );

-- RLS Policies for farm_inventory
ALTER TABLE farm_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm team can view inventory"
  ON farm_inventory FOR SELECT
  USING (
    can_view_farm(auth.uid(), farm_id)
  );

CREATE POLICY "Farm managers can manage inventory"
  ON farm_inventory FOR ALL
  USING (
    can_manage_farm(auth.uid(), farm_id)
  );

-- RLS Policies for farm_factory_batches
ALTER TABLE farm_factory_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm team can view factory batches"
  ON farm_factory_batches FOR SELECT
  USING (
    can_view_farm(auth.uid(), farm_id)
  );

CREATE POLICY "Farm managers can manage factory"
  ON farm_factory_batches FOR ALL
  USING (
    can_manage_farm(auth.uid(), farm_id)
  );

-- RLS Policies for farm_visit_requests
ALTER TABLE farm_visit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create visit requests"
  ON farm_visit_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Requesters can view their own requests"
  ON farm_visit_requests FOR SELECT
  USING (
    requester_id = auth.uid()
    OR can_view_farm(auth.uid(), farm_id)
  );

CREATE POLICY "Farm managers can manage visit requests"
  ON farm_visit_requests FOR UPDATE
  USING (
    can_manage_farm(auth.uid(), farm_id)
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION can_manage_farm TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_view_farm TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_farm_dashboard_summary TO authenticated, anon;
