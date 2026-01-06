/*
  # نظام Farm Clusters - تجميع المزارع تحت قيادات (مصحح)
  
  ## الفكرة
  بدل متابعة 100 مزرعة مباشرة، ننشئ مجموعات إقليمية (Clusters)
  كل cluster له مشرف إقليمي واحد
*/

-- ===================================
-- جدول: Farm Clusters
-- ===================================
CREATE TABLE IF NOT EXISTS farm_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- معلومات أساسية
  name text NOT NULL,
  name_en text,
  description text,
  
  -- القيادة
  supervisor_id uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  
  -- الموقع
  region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
  city_id uuid REFERENCES cities(id) ON DELETE SET NULL,
  
  -- الإحصائيات (محسوبة)
  farms_count int DEFAULT 0,
  active_farms_count int DEFAULT 0,
  total_operations int DEFAULT 0,
  
  -- الحالة
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'restructuring')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- البيانات الإضافية
  metadata jsonb DEFAULT '{}'::jsonb
);

-- ===================================
-- إضافة cluster_id لجدول المزارع
-- ===================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_farms' AND column_name = 'cluster_id'
  ) THEN
    ALTER TABLE b2f_farms ADD COLUMN cluster_id uuid REFERENCES farm_clusters(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_b2f_farms_cluster_id ON b2f_farms(cluster_id);
  END IF;
END $$;

-- ===================================
-- RLS Policies
-- ===================================
ALTER TABLE farm_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view clusters"
  ON farm_clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = (current_setting('app.current_staff_id', true))::uuid
    )
  );

CREATE POLICY "Supervisors and admins can manage clusters"
  ON farm_clusters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff ps
      WHERE ps.id = (current_setting('app.current_staff_id', true))::uuid
      AND ps.role IN ('general_manager', 'regional_supervisor', 'operations_manager')
    )
  );

-- ===================================
-- دالة: تحديث إحصائيات الـ Cluster
-- ===================================
CREATE OR REPLACE FUNCTION update_cluster_statistics(p_cluster_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE farm_clusters
  SET
    farms_count = (
      SELECT COUNT(*) FROM b2f_farms
      WHERE cluster_id = p_cluster_id
    ),
    active_farms_count = (
      SELECT COUNT(*) FROM b2f_farms
      WHERE cluster_id = p_cluster_id
      AND operational_status = 'operational'
    ),
    total_operations = (
      SELECT COUNT(*) FROM b2f_farm_operations
      WHERE farm_id IN (
        SELECT id FROM b2f_farms WHERE cluster_id = p_cluster_id
      )
    ),
    updated_at = now()
  WHERE id = p_cluster_id;
END;
$$;

-- ===================================
-- Trigger: تحديث تلقائي عند تغيير المزرعة
-- ===================================
CREATE OR REPLACE FUNCTION trigger_update_cluster_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.cluster_id IS NOT NULL AND OLD.cluster_id != NEW.cluster_id THEN
    PERFORM update_cluster_statistics(OLD.cluster_id);
  END IF;
  
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.cluster_id IS NOT NULL THEN
    PERFORM update_cluster_statistics(NEW.cluster_id);
  END IF;
  
  IF TG_OP = 'DELETE' AND OLD.cluster_id IS NOT NULL THEN
    PERFORM update_cluster_statistics(OLD.cluster_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_cluster_stats_on_farm_change ON b2f_farms;
CREATE TRIGGER trigger_update_cluster_stats_on_farm_change
  AFTER INSERT OR UPDATE OR DELETE ON b2f_farms
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_cluster_stats();

-- ===================================
-- Indexes للأداء
-- ===================================
CREATE INDEX IF NOT EXISTS idx_farm_clusters_supervisor ON farm_clusters(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_farm_clusters_region ON farm_clusters(region_id);
CREATE INDEX IF NOT EXISTS idx_farm_clusters_status ON farm_clusters(status);
CREATE INDEX IF NOT EXISTS idx_farm_clusters_priority ON farm_clusters(priority);

-- ===================================
-- تفعيل Realtime
-- ===================================
ALTER PUBLICATION supabase_realtime ADD TABLE farm_clusters;

-- ===================================
-- بيانات تجريبية
-- ===================================
DO $$
DECLARE
  v_gm_id uuid;
  v_qassim_region_id uuid;
  v_jouf_region_id uuid;
BEGIN
  SELECT id INTO v_gm_id
  FROM platform_staff
  WHERE staff_code = 'GM-001'
  LIMIT 1;
  
  SELECT id INTO v_qassim_region_id FROM regions WHERE name_ar = 'القصيم' LIMIT 1;
  SELECT id INTO v_jouf_region_id FROM regions WHERE name_ar = 'الجوف' LIMIT 1;
  
  INSERT INTO farm_clusters (name, name_en, description, supervisor_id, region_id, status, priority)
  VALUES (
    'منطقة القصيم',
    'Qassim Region',
    'مجموعة مزارع منطقة القصيم',
    v_gm_id,
    v_qassim_region_id,
    'active',
    'high'
  ) ON CONFLICT DO NOTHING;
  
  INSERT INTO farm_clusters (name, name_en, description, supervisor_id, region_id, status, priority)
  VALUES (
    'منطقة الجوف',
    'Al-Jouf Region',
    'مجموعة مزارع منطقة الجوف',
    v_gm_id,
    v_jouf_region_id,
    'active',
    'normal'
  ) ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Farm Clusters System Created ✅';
END $$;
