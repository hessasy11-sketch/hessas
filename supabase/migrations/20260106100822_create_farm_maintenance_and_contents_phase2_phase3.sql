/*
  # Farm Operational Dashboard - Phase 2 & 3

  ## Phase 2: Assets & Maintenance System
  
  1. New Tables
    - `farm_maintenance` - بلاغات الصيانة والأعطال
    - Updates to `farm_assets` - تحديثات إضافية للمعدات

  2. Phase 3: Farm Contents System
  
  1. New Tables
    - `farm_tree_inventory` - جرد الأشجار
    - `farm_crops` - المحاصيل الموسمية
    - `farm_audit_snapshots` - لقطات الجرد الدورية

  3. Security
    - RLS policies for farm team access
    - Managers can add/edit, team can view
*/

-- =====================================================
-- PHASE 2: MAINTENANCE & ASSETS SYSTEM
-- =====================================================

-- Table: farm_maintenance (بلاغات الصيانة)
CREATE TABLE IF NOT EXISTS farm_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES farm_assets(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'new', -- new, in_progress, submitted, approved, rejected, cancelled, completed
  priority text NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  created_by uuid,
  created_by_name text,
  assigned_to uuid,
  assigned_to_name text,
  requires_proof boolean DEFAULT false,
  proof_url text,
  proof_notes text,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  completion_notes text,
  estimated_cost numeric(12,2),
  actual_cost numeric(12,2),
  scheduled_date date,
  completed_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_maintenance_status CHECK (status IN ('new', 'in_progress', 'submitted', 'approved', 'rejected', 'cancelled', 'completed')),
  CONSTRAINT valid_maintenance_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_farm_maintenance_farm_id ON farm_maintenance(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_maintenance_status ON farm_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_farm_maintenance_priority ON farm_maintenance(priority);
CREATE INDEX IF NOT EXISTS idx_farm_maintenance_asset ON farm_maintenance(asset_id);

-- Add service history to assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farm_assets' AND column_name = 'service_count'
  ) THEN
    ALTER TABLE farm_assets ADD COLUMN service_count integer DEFAULT 0;
    ALTER TABLE farm_assets ADD COLUMN last_service_notes text;
  END IF;
END $$;

-- =====================================================
-- PHASE 3: FARM CONTENTS SYSTEM
-- =====================================================

-- Table: farm_tree_inventory (جرد الأشجار)
CREATE TABLE IF NOT EXISTS farm_tree_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  tree_type text NOT NULL, -- olive, palm, date, citrus, fig, etc
  tree_type_ar text, -- الاسم بالعربي
  count integer NOT NULL DEFAULT 0,
  section text, -- القسم أو البلوك داخل المزرعة
  planting_year integer,
  health_status text DEFAULT 'good', -- excellent, good, fair, poor, diseased
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,

  CONSTRAINT positive_tree_count CHECK (count >= 0),
  CONSTRAINT valid_tree_health CHECK (health_status IN ('excellent', 'good', 'fair', 'poor', 'diseased'))
);

CREATE INDEX IF NOT EXISTS idx_farm_tree_inventory_farm_id ON farm_tree_inventory(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_tree_inventory_type ON farm_tree_inventory(tree_type);

-- Table: farm_crops (المحاصيل الموسمية)
CREATE TABLE IF NOT EXISTS farm_crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  season_year integer NOT NULL,
  season_name text, -- مثل: موسم ربيع 2026
  crop_type text NOT NULL, -- wheat, barley, vegetables, etc
  crop_type_ar text, -- الاسم بالعربي
  status text NOT NULL DEFAULT 'planned', -- planned, in_progress, harvested, sold
  estimated_quantity numeric(12,2),
  actual_quantity numeric(12,2),
  unit text DEFAULT 'kg', -- kg, ton, unit, box, etc
  planting_date date,
  expected_harvest_date date,
  actual_harvest_date date,
  quality_grade text, -- excellent, good, standard, poor
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,

  CONSTRAINT valid_crop_status CHECK (status IN ('planned', 'in_progress', 'harvested', 'sold')),
  CONSTRAINT valid_crop_quality CHECK (quality_grade IS NULL OR quality_grade IN ('excellent', 'good', 'standard', 'poor'))
);

CREATE INDEX IF NOT EXISTS idx_farm_crops_farm_id ON farm_crops(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_crops_season ON farm_crops(season_year);
CREATE INDEX IF NOT EXISTS idx_farm_crops_status ON farm_crops(status);

-- Table: farm_audit_snapshots (لقطات الجرد الدورية)
CREATE TABLE IF NOT EXISTS farm_audit_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  tree_summary jsonb, -- {"olive": 1200, "palm": 80, "citrus": 50}
  crops_summary jsonb, -- {"wheat": {"qty": 1000, "unit": "kg"}, ...}
  assets_summary jsonb, -- {"active": 5, "under_maintenance": 2, ...}
  total_trees integer DEFAULT 0,
  notes text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT unique_farm_snapshot_date UNIQUE(farm_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_farm_audit_farm_id ON farm_audit_snapshots(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_audit_date ON farm_audit_snapshots(snapshot_date);

-- =====================================================
-- FUNCTIONS FOR PHASE 2 & 3
-- =====================================================

-- Function: get_farm_maintenance_stats (إحصائيات الصيانة)
CREATE OR REPLACE FUNCTION get_farm_maintenance_stats(p_farm_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'open', COUNT(*) FILTER (WHERE status IN ('new', 'in_progress')),
    'pending_approval', COUNT(*) FILTER (WHERE status = 'submitted'),
    'completed_this_month', COUNT(*) FILTER (
      WHERE status = 'completed'
      AND completed_date >= date_trunc('month', CURRENT_DATE)
    ),
    'urgent', COUNT(*) FILTER (WHERE priority = 'urgent' AND status NOT IN ('completed', 'cancelled', 'rejected')),
    'total_cost', COALESCE(SUM(actual_cost) FILTER (WHERE status = 'completed'), 0)
  ) INTO v_stats
  FROM farm_maintenance
  WHERE farm_id = p_farm_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get_farm_contents_summary (ملخص محتويات المزرعة)
CREATE OR REPLACE FUNCTION get_farm_contents_summary(p_farm_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_trees jsonb;
  v_crops jsonb;
  v_latest_audit jsonb;
BEGIN
  -- Get trees summary
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', tree_type,
      'type_ar', tree_type_ar,
      'count', count,
      'health', health_status
    ) ORDER BY count DESC
  ) INTO v_trees
  FROM farm_tree_inventory
  WHERE farm_id = p_farm_id;

  -- Get active crops
  SELECT jsonb_agg(
    jsonb_build_object(
      'season_year', season_year,
      'crop_type', crop_type,
      'crop_type_ar', crop_type_ar,
      'status', status,
      'estimated_qty', estimated_quantity
    ) ORDER BY season_year DESC
  ) INTO v_crops
  FROM farm_crops
  WHERE farm_id = p_farm_id
    AND season_year >= EXTRACT(YEAR FROM CURRENT_DATE) - 1;

  -- Get latest audit
  SELECT jsonb_build_object(
    'date', snapshot_date,
    'total_trees', total_trees,
    'tree_summary', tree_summary,
    'created_by', created_by_name
  ) INTO v_latest_audit
  FROM farm_audit_snapshots
  WHERE farm_id = p_farm_id
  ORDER BY snapshot_date DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'trees', COALESCE(v_trees, '[]'::jsonb),
    'crops', COALESCE(v_crops, '[]'::jsonb),
    'latest_audit', v_latest_audit,
    'total_trees', (SELECT COALESCE(SUM(count), 0) FROM farm_tree_inventory WHERE farm_id = p_farm_id),
    'active_crops', (SELECT COUNT(*) FROM farm_crops WHERE farm_id = p_farm_id AND status IN ('in_progress', 'planned'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: create_farm_audit_snapshot (إنشاء جرد جديد)
CREATE OR REPLACE FUNCTION create_farm_audit_snapshot(
  p_farm_id uuid,
  p_notes text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_snapshot_id uuid;
  v_tree_summary jsonb;
  v_crops_summary jsonb;
  v_assets_summary jsonb;
  v_total_trees integer;
  v_user_name text;
BEGIN
  -- Get current user name
  SELECT full_name INTO v_user_name
  FROM platform_staff
  WHERE user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;

  -- Build tree summary
  SELECT jsonb_object_agg(tree_type, count) INTO v_tree_summary
  FROM farm_tree_inventory
  WHERE farm_id = p_farm_id;

  -- Build crops summary
  SELECT jsonb_object_agg(
    crop_type,
    jsonb_build_object(
      'qty', COALESCE(actual_quantity, estimated_quantity),
      'unit', unit,
      'status', status
    )
  ) INTO v_crops_summary
  FROM farm_crops
  WHERE farm_id = p_farm_id
    AND season_year = EXTRACT(YEAR FROM CURRENT_DATE);

  -- Build assets summary
  SELECT jsonb_object_agg(status, count) INTO v_assets_summary
  FROM (
    SELECT status, COUNT(*)::integer AS count
    FROM farm_assets
    WHERE farm_id = p_farm_id
    GROUP BY status
  ) sub;

  -- Total trees
  SELECT COALESCE(SUM(count), 0) INTO v_total_trees
  FROM farm_tree_inventory
  WHERE farm_id = p_farm_id;

  -- Insert snapshot
  INSERT INTO farm_audit_snapshots (
    farm_id,
    snapshot_date,
    tree_summary,
    crops_summary,
    assets_summary,
    total_trees,
    notes,
    created_by,
    created_by_name
  ) VALUES (
    p_farm_id,
    CURRENT_DATE,
    v_tree_summary,
    v_crops_summary,
    v_assets_summary,
    v_total_trees,
    p_notes,
    auth.uid(),
    v_user_name
  )
  ON CONFLICT (farm_id, snapshot_date)
  DO UPDATE SET
    tree_summary = EXCLUDED.tree_summary,
    crops_summary = EXCLUDED.crops_summary,
    assets_summary = EXCLUDED.assets_summary,
    total_trees = EXCLUDED.total_trees,
    notes = EXCLUDED.notes,
    updated_at = now()
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES - PHASE 2
-- =====================================================

-- farm_maintenance policies
ALTER TABLE farm_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm team can view maintenance"
  ON farm_maintenance FOR SELECT
  USING (
    can_view_farm(auth.uid(), farm_id)
  );

CREATE POLICY "Farm team can create maintenance"
  ON farm_maintenance FOR INSERT
  WITH CHECK (
    can_view_farm(auth.uid(), farm_id)
  );

CREATE POLICY "Farm managers can manage maintenance"
  ON farm_maintenance FOR UPDATE
  USING (
    can_manage_farm(auth.uid(), farm_id)
  );

CREATE POLICY "Farm managers can delete maintenance"
  ON farm_maintenance FOR DELETE
  USING (
    can_manage_farm(auth.uid(), farm_id)
  );

-- =====================================================
-- RLS POLICIES - PHASE 3
-- =====================================================

-- farm_tree_inventory policies
ALTER TABLE farm_tree_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm team can view tree inventory"
  ON farm_tree_inventory FOR SELECT
  USING (
    can_view_farm(auth.uid(), farm_id)
  );

CREATE POLICY "Farm team can manage tree inventory"
  ON farm_tree_inventory FOR ALL
  USING (
    can_view_farm(auth.uid(), farm_id)
  );

-- farm_crops policies
ALTER TABLE farm_crops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm team can view crops"
  ON farm_crops FOR SELECT
  USING (
    can_view_farm(auth.uid(), farm_id)
  );

CREATE POLICY "Farm team can manage crops"
  ON farm_crops FOR ALL
  USING (
    can_view_farm(auth.uid(), farm_id)
  );

-- farm_audit_snapshots policies
ALTER TABLE farm_audit_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm team can view audit snapshots"
  ON farm_audit_snapshots FOR SELECT
  USING (
    can_view_farm(auth.uid(), farm_id)
  );

CREATE POLICY "Farm team can create audit snapshots"
  ON farm_audit_snapshots FOR INSERT
  WITH CHECK (
    can_view_farm(auth.uid(), farm_id)
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_farm_maintenance_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_farm_contents_summary TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_farm_audit_snapshot TO authenticated, anon;
