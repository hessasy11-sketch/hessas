/*
  # نظام إدارة التشغيل المحدث والمتكامل

  1. التحديثات على الجداول الموجودة
    - ربط b2f_farm_operations بمدير المزرعة والهيكل التنظيمي
    - إضافة حقول متقدمة للتتبع والإدارة

  2. الجداول الجديدة
    - `farm_operation_assignments` - تعيين المهام للموظفين
    - `operation_performance_metrics` - مقاييس الأداء
    - `farm_operation_logs` - سجل النشاطات التفصيلي

  3. الوظائف المتقدمة
    - إحصائيات شاملة لكل مدير
    - تقارير الأداء
    - لوحات معلومات ذكية
*/

-- تحديث جدول b2f_farm_operations
ALTER TABLE b2f_farm_operations
ADD COLUMN IF NOT EXISTS supervised_by uuid REFERENCES farm_staff_hierarchy(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_team jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS performance_score numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_rating numeric(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_allocated numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_spent numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_completion_date date,
ADD COLUMN IF NOT EXISTS actual_completion_date date,
ADD COLUMN IF NOT EXISTS delay_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS operation_notes text,
ADD COLUMN IF NOT EXISTS issues_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_rate numeric(5,2) DEFAULT 100;

-- جدول تعيين المهام للموظفين
CREATE TABLE IF NOT EXISTS farm_operation_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES b2f_farm_operations(id) ON DELETE CASCADE NOT NULL,
  staff_id uuid REFERENCES farm_staff_hierarchy(id) ON DELETE CASCADE NOT NULL,
  task_type text NOT NULL,
  task_description text NOT NULL,
  assigned_date timestamptz DEFAULT now(),
  due_date timestamptz,
  completed_date timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- مقاييس الأداء
CREATE TABLE IF NOT EXISTS operation_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES b2f_farm_operations(id) ON DELETE CASCADE NOT NULL,
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE NOT NULL,
  metric_date date DEFAULT CURRENT_DATE,
  tasks_completed integer DEFAULT 0,
  tasks_pending integer DEFAULT 0,
  tasks_delayed integer DEFAULT 0,
  efficiency_score numeric(5,2) DEFAULT 0,
  quality_score numeric(5,2) DEFAULT 0,
  team_performance numeric(5,2) DEFAULT 0,
  budget_efficiency numeric(5,2) DEFAULT 0,
  investor_satisfaction numeric(5,2) DEFAULT 0,
  notes text,
  recorded_by uuid REFERENCES farm_staff_hierarchy(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- سجل النشاطات التفصيلي
CREATE TABLE IF NOT EXISTS farm_operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES b2f_farm_operations(id) ON DELETE CASCADE NOT NULL,
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  activity_description text NOT NULL,
  performed_by uuid REFERENCES farm_staff_hierarchy(id) ON DELETE SET NULL,
  affected_contracts jsonb DEFAULT '[]'::jsonb,
  before_state jsonb,
  after_state jsonb,
  impact_level text DEFAULT 'normal' CHECK (impact_level IN ('low', 'normal', 'high', 'critical')),
  created_at timestamptz DEFAULT now()
);

-- الفهارس
CREATE INDEX IF NOT EXISTS idx_operation_assignments_operation ON farm_operation_assignments(operation_id);
CREATE INDEX IF NOT EXISTS idx_operation_assignments_staff ON farm_operation_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_operation_assignments_status ON farm_operation_assignments(status);
CREATE INDEX IF NOT EXISTS idx_operation_assignments_due_date ON farm_operation_assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON operation_performance_metrics(operation_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_farm ON operation_performance_metrics(farm_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_date ON operation_performance_metrics(metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_operation_logs_operation ON farm_operation_logs(operation_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_farm ON farm_operation_logs(farm_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON farm_operation_logs(created_at DESC);

-- RLS
ALTER TABLE farm_operation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_operation_logs ENABLE ROW LEVEL SECURITY;

-- سياسات farm_operation_assignments
CREATE POLICY "Platform admins can view assignments"
  ON farm_operation_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

CREATE POLICY "Platform admins can manage assignments"
  ON farm_operation_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

-- سياسات operation_performance_metrics
CREATE POLICY "Platform admins can view performance metrics"
  ON operation_performance_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

CREATE POLICY "Platform admins can manage performance metrics"
  ON operation_performance_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

-- سياسات farm_operation_logs
CREATE POLICY "Platform admins can view operation logs"
  ON farm_operation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

CREATE POLICY "Platform admins can insert operation logs"
  ON farm_operation_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

-- دالة للحصول على إحصائيات التشغيل الشاملة
CREATE OR REPLACE FUNCTION get_comprehensive_operation_stats(p_farm_id uuid DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_operations', COUNT(DISTINCT fo.id),
    'active_operations', COUNT(DISTINCT fo.id) FILTER (WHERE fo.is_active = true),
    'completed_operations', COUNT(DISTINCT fo.id) FILTER (WHERE fo.is_active = false AND fo.actual_completion_date IS NOT NULL),
    'total_contracts', COUNT(DISTINCT c.id),
    'total_investors', COUNT(DISTINCT c.investor_phone),
    'total_trees', COALESCE(SUM(c.trees_count), 0),
    'total_staff_assigned', COUNT(DISTINCT oa.staff_id),
    'pending_tasks', COUNT(DISTINCT oa.id) FILTER (WHERE oa.status = 'pending'),
    'in_progress_tasks', COUNT(DISTINCT oa.id) FILTER (WHERE oa.status = 'in_progress'),
    'completed_tasks', COUNT(DISTINCT oa.id) FILTER (WHERE oa.status = 'completed'),
    'delayed_tasks', COUNT(DISTINCT oa.id) FILTER (WHERE oa.status = 'delayed'),
    'avg_performance_score', ROUND(AVG(fo.performance_score), 2),
    'avg_quality_rating', ROUND(AVG(fo.quality_rating), 2),
    'total_budget_allocated', COALESCE(SUM(fo.budget_allocated), 0),
    'total_budget_spent', COALESCE(SUM(fo.budget_spent), 0),
    'budget_utilization', CASE 
      WHEN SUM(fo.budget_allocated) > 0 
      THEN ROUND((SUM(fo.budget_spent) / SUM(fo.budget_allocated)) * 100, 2)
      ELSE 0 
    END
  ) INTO result
  FROM b2f_farm_operations fo
  LEFT JOIN b2f_contracts c ON c.farm_id = fo.farm_id AND c.status = 'active'
  LEFT JOIN farm_operation_assignments oa ON oa.operation_id = fo.id
  WHERE (p_farm_id IS NULL OR fo.farm_id = p_farm_id);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإحصائيات مدير المزرعة المحدث
CREATE OR REPLACE FUNCTION get_enhanced_director_stats(p_director_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_farms', COUNT(DISTINCT bf.id),
    'active_farms', COUNT(DISTINCT bf.id) FILTER (WHERE bf.is_active = true),
    'total_operations', COUNT(DISTINCT fo.id),
    'active_operations', COUNT(DISTINCT fo.id) FILTER (WHERE fo.is_active = true),
    'total_staff', COUNT(DISTINCT fsh.id),
    'total_contracts', COUNT(DISTINCT c.id),
    'total_investors', COUNT(DISTINCT c.investor_phone),
    'total_opportunities', COUNT(DISTINCT bo.id),
    'avg_farm_performance', ROUND(AVG(fo.performance_score), 2),
    'avg_quality_rating', ROUND(AVG(fo.quality_rating), 2),
    'total_budget', COALESCE(SUM(fo.budget_allocated), 0),
    'budget_spent', COALESCE(SUM(fo.budget_spent), 0),
    'pending_tasks', COUNT(DISTINCT oa.id) FILTER (WHERE oa.status = 'pending'),
    'completed_tasks', COUNT(DISTINCT oa.id) FILTER (WHERE oa.status = 'completed')
  ) INTO result
  FROM farm_directors fd
  LEFT JOIN b2f_farms bf ON bf.farm_director_id = fd.id
  LEFT JOIN farm_staff_hierarchy fsh ON fsh.farm_id = bf.id AND fsh.is_active = true
  LEFT JOIN b2f_opportunities bo ON bo.farm_id = bf.id
  LEFT JOIN b2f_farm_operations fo ON fo.farm_id = bf.id
  LEFT JOIN b2f_contracts c ON c.farm_id = bf.id AND c.status = 'active'
  LEFT JOIN farm_operation_assignments oa ON oa.operation_id = fo.id
  WHERE fd.id = p_director_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإحصائيات المزرعة التفصيلية
CREATE OR REPLACE FUNCTION get_farm_operation_details(p_farm_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'farm_info', jsonb_build_object(
      'id', bf.id,
      'name', bf.name,
      'location', bf.location,
      'city', bf.city,
      'director', jsonb_build_object(
        'id', fd.id,
        'name', fd.name_ar
      ),
      'manager', jsonb_build_object(
        'id', fsh.id,
        'name', fsh.name_ar,
        'role', fsh.role
      )
    ),
    'operations', jsonb_build_object(
      'total', COUNT(DISTINCT fo.id),
      'active', COUNT(DISTINCT fo.id) FILTER (WHERE fo.is_active = true),
      'avg_performance', ROUND(AVG(fo.performance_score), 2),
      'avg_quality', ROUND(AVG(fo.quality_rating), 2)
    ),
    'contracts', jsonb_build_object(
      'total', COUNT(DISTINCT c.id),
      'active', COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active'),
      'investors', COUNT(DISTINCT c.investor_phone),
      'trees', COALESCE(SUM(c.trees_count), 0)
    ),
    'staff', jsonb_build_object(
      'total', COUNT(DISTINCT fsh2.id),
      'by_role', jsonb_object_agg(
        COALESCE(fsh2.role, 'unassigned'),
        COUNT(DISTINCT fsh2.id)
      )
    ),
    'tasks', jsonb_build_object(
      'total', COUNT(DISTINCT oa.id),
      'pending', COUNT(DISTINCT oa.id) FILTER (WHERE oa.status = 'pending'),
      'in_progress', COUNT(DISTINCT oa.id) FILTER (WHERE oa.status = 'in_progress'),
      'completed', COUNT(DISTINCT oa.id) FILTER (WHERE oa.status = 'completed'),
      'delayed', COUNT(DISTINCT oa.id) FILTER (WHERE oa.status = 'delayed')
    ),
    'budget', jsonb_build_object(
      'allocated', COALESCE(SUM(fo.budget_allocated), 0),
      'spent', COALESCE(SUM(fo.budget_spent), 0),
      'remaining', COALESCE(SUM(fo.budget_allocated) - SUM(fo.budget_spent), 0),
      'utilization', CASE 
        WHEN SUM(fo.budget_allocated) > 0 
        THEN ROUND((SUM(fo.budget_spent) / SUM(fo.budget_allocated)) * 100, 2)
        ELSE 0 
      END
    )
  ) INTO result
  FROM b2f_farms bf
  LEFT JOIN farm_directors fd ON fd.id = bf.farm_director_id
  LEFT JOIN farm_staff_hierarchy fsh ON fsh.id = bf.farm_manager_id
  LEFT JOIN farm_staff_hierarchy fsh2 ON fsh2.farm_id = bf.id AND fsh2.is_active = true
  LEFT JOIN b2f_farm_operations fo ON fo.farm_id = bf.id
  LEFT JOIN b2f_contracts c ON c.farm_id = bf.id
  LEFT JOIN farm_operation_assignments oa ON oa.operation_id = fo.id
  WHERE bf.id = p_farm_id
  GROUP BY bf.id, bf.name, bf.location, bf.city, fd.id, fd.name_ar, fsh.id, fsh.name_ar, fsh.role;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتقرير أداء الموظف
CREATE OR REPLACE FUNCTION get_staff_performance_report(p_staff_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'staff_info', jsonb_build_object(
      'id', fsh.id,
      'name', fsh.name_ar,
      'role', fsh.role,
      'farm', bf.name
    ),
    'tasks', jsonb_build_object(
      'total', COUNT(oa.id),
      'completed', COUNT(oa.id) FILTER (WHERE oa.status = 'completed'),
      'in_progress', COUNT(oa.id) FILTER (WHERE oa.status = 'in_progress'),
      'pending', COUNT(oa.id) FILTER (WHERE oa.status = 'pending'),
      'delayed', COUNT(oa.id) FILTER (WHERE oa.status = 'delayed'),
      'completion_rate', CASE 
        WHEN COUNT(oa.id) > 0 
        THEN ROUND((COUNT(oa.id) FILTER (WHERE oa.status = 'completed')::numeric / COUNT(oa.id)) * 100, 2)
        ELSE 0 
      END,
      'on_time_rate', CASE 
        WHEN COUNT(oa.id) FILTER (WHERE oa.status = 'completed') > 0 
        THEN ROUND((COUNT(oa.id) FILTER (WHERE oa.status = 'completed' AND oa.completed_date <= oa.due_date)::numeric / 
                    COUNT(oa.id) FILTER (WHERE oa.status = 'completed')) * 100, 2)
        ELSE 0 
      END
    ),
    'operations', jsonb_build_object(
      'participated_in', COUNT(DISTINCT oa.operation_id),
      'avg_performance', ROUND(AVG(fo.performance_score), 2)
    )
  ) INTO result
  FROM farm_staff_hierarchy fsh
  LEFT JOIN b2f_farms bf ON bf.id = fsh.farm_id
  LEFT JOIN farm_operation_assignments oa ON oa.staff_id = fsh.id
  LEFT JOIN b2f_farm_operations fo ON fo.id = oa.operation_id
  WHERE fsh.id = p_staff_id
  GROUP BY fsh.id, fsh.name_ar, fsh.role, bf.name;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
