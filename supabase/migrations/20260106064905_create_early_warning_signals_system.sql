/*
  # المرحلة 4: مؤشرات ضغط مبكر (Early Warning Signals)
  
  ## الفكرة
  تنبيهات ذكية مثل:
  - Cluster تجاوز حد المصروف
  - أكثر من 3 مزارع متعثرة في نفس المنطقة
  - مدير مزرعة منخفض الأداء مرتين متتاليتين
  
  ## ملاحظة
  - تنبيه = رؤية
  - القرار يبقى بيدك
*/

-- ===================================
-- جدول: Early Warning Signals
-- ===================================
CREATE TABLE IF NOT EXISTS early_warning_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- نوع التنبيه
  signal_type text NOT NULL CHECK (signal_type IN (
    'cluster_expense_limit',          -- تجاوز حد المصروف
    'multiple_struggling_farms',      -- عدة مزارع متعثرة
    'low_performance_manager',        -- مدير منخفض الأداء
    'pending_decisions_accumulating', -- قرارات معلقة متراكمة
    'budget_overrun',                 -- تجاوز الميزانية
    'repeated_maintenance',           -- صيانة متكررة
    'high_expense_rate',              -- معدل مصروف عالي
    'cluster_bottleneck'              -- اختناق في المنطقة
  )),
  
  -- مستوى الخطورة
  severity text NOT NULL CHECK (severity IN (
    'info',
    'warning',
    'critical',
    'urgent'
  )),
  
  -- الهدف
  target_type text NOT NULL CHECK (target_type IN ('cluster', 'farm', 'staff')),
  target_id uuid NOT NULL,
  
  -- التفاصيل
  title text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,  -- بيانات إضافية للتنبيه
  
  -- القياسات
  threshold_value numeric,  -- الحد
  current_value numeric,    -- القيمة الحالية
  
  -- الحالة
  status text DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  
  -- المسؤول
  acknowledged_by uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  
  -- التواريخ
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- ملاحظات
  notes text
);

-- ===================================
-- RLS Policies
-- ===================================
ALTER TABLE early_warning_signals ENABLE ROW LEVEL SECURITY;

-- القراءة: جميع الموظفين
CREATE POLICY "Platform staff can view signals"
  ON early_warning_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = (current_setting('app.current_staff_id', true))::uuid
    )
  );

-- الإدارة: الإدارة العليا فقط
CREATE POLICY "Admins can manage signals"
  ON early_warning_signals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE id = (current_setting('app.current_staff_id', true))::uuid
      AND role IN ('general_manager', 'operations_manager')
    )
  );

-- ===================================
-- دالة: كشف التنبيهات التلقائي
-- ===================================
CREATE OR REPLACE FUNCTION detect_early_warnings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_signals jsonb := '[]'::jsonb;
  v_cluster record;
  v_struggling_count int;
  v_expense_total numeric;
BEGIN
  -- 1. كشف: Cluster تجاوز حد المصروف
  FOR v_cluster IN
    SELECT 
      fc.id,
      fc.name,
      (
        SELECT COALESCE(SUM(fe.amount), 0)
        FROM farm_expenses fe
        JOIN b2f_farms f ON f.id = fe.farm_id
        WHERE f.cluster_id = fc.id
        AND fe.created_at > now() - interval '30 days'
      ) as total_expenses
    FROM farm_clusters fc
    WHERE fc.status = 'active'
  LOOP
    -- حد افتراضي: 100,000 ر.س لكل cluster كل 30 يوم
    IF v_cluster.total_expenses > 100000 THEN
      INSERT INTO early_warning_signals (
        signal_type,
        severity,
        target_type,
        target_id,
        title,
        description,
        threshold_value,
        current_value,
        metadata,
        status
      ) VALUES (
        'cluster_expense_limit',
        CASE 
          WHEN v_cluster.total_expenses > 150000 THEN 'urgent'
          WHEN v_cluster.total_expenses > 120000 THEN 'critical'
          ELSE 'warning'
        END,
        'cluster',
        v_cluster.id,
        'تجاوز حد المصروفات',
        'المنطقة ' || v_cluster.name || ' تجاوزت الحد المسموح للمصروفات (30 يوم)',
        100000,
        v_cluster.total_expenses,
        jsonb_build_object(
          'cluster_name', v_cluster.name,
          'period_days', 30
        ),
        'active'
      ) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- 2. كشف: أكثر من 3 مزارع متعثرة في نفس Cluster
  FOR v_cluster IN
    SELECT 
      fc.id,
      fc.name,
      COUNT(*) as struggling_count
    FROM farm_clusters fc
    JOIN b2f_farms f ON f.cluster_id = fc.id
    WHERE fc.status = 'active'
    AND f.operational_status IN ('suspended', 'maintenance')
    GROUP BY fc.id, fc.name
    HAVING COUNT(*) >= 3
  LOOP
    INSERT INTO early_warning_signals (
      signal_type,
      severity,
      target_type,
      target_id,
      title,
      description,
      threshold_value,
      current_value,
      metadata,
      status
    ) VALUES (
      'multiple_struggling_farms',
      CASE 
        WHEN v_cluster.struggling_count >= 5 THEN 'urgent'
        WHEN v_cluster.struggling_count >= 4 THEN 'critical'
        ELSE 'warning'
      END,
      'cluster',
      v_cluster.id,
      'مزارع متعثرة متعددة',
      v_cluster.struggling_count || ' مزارع متعثرة في ' || v_cluster.name,
      3,
      v_cluster.struggling_count,
      jsonb_build_object(
        'cluster_name', v_cluster.name
      ),
      'active'
    ) ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- 3. كشف: قرارات معلقة متراكمة
  FOR v_cluster IN
    SELECT 
      fc.id,
      fc.name,
      COUNT(*) as pending_count
    FROM farm_clusters fc
    JOIN b2f_farms f ON f.cluster_id = fc.id
    JOIN decision_queue dq ON dq.farm_id = f.id
    WHERE fc.status = 'active'
    AND dq.status = 'pending'
    GROUP BY fc.id, fc.name
    HAVING COUNT(*) >= 5
  LOOP
    INSERT INTO early_warning_signals (
      signal_type,
      severity,
      target_type,
      target_id,
      title,
      description,
      threshold_value,
      current_value,
      metadata,
      status
    ) VALUES (
      'pending_decisions_accumulating',
      CASE 
        WHEN v_cluster.pending_count >= 10 THEN 'urgent'
        WHEN v_cluster.pending_count >= 7 THEN 'critical'
        ELSE 'warning'
      END,
      'cluster',
      v_cluster.id,
      'قرارات معلقة متراكمة',
      v_cluster.pending_count || ' قرار معلق في ' || v_cluster.name,
      5,
      v_cluster.pending_count,
      jsonb_build_object(
        'cluster_name', v_cluster.name
      ),
      'active'
    ) ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- إرجاع التنبيهات المكتشفة
  SELECT jsonb_agg(
    jsonb_build_object(
      'signal_type', signal_type,
      'title', title,
      'detected', 'true'
    )
  ) INTO v_signals
  FROM early_warning_signals
  WHERE detected_at > now() - interval '1 minute';
  
  RETURN COALESCE(v_signals, '[]'::jsonb);
END;
$$;

-- ===================================
-- دالة: الحصول على التنبيهات النشطة
-- ===================================
CREATE OR REPLACE FUNCTION get_active_early_warnings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ews.id,
        'signal_type', ews.signal_type,
        'severity', ews.severity,
        'target_type', ews.target_type,
        'target_id', ews.target_id,
        'target_name', CASE
          WHEN ews.target_type = 'cluster' THEN (SELECT name FROM farm_clusters WHERE id = ews.target_id)
          WHEN ews.target_type = 'farm' THEN (SELECT name FROM b2f_farms WHERE id = ews.target_id)
          WHEN ews.target_type = 'staff' THEN (SELECT full_name FROM platform_staff WHERE id = ews.target_id)
        END,
        'title', ews.title,
        'description', ews.description,
        'threshold_value', ews.threshold_value,
        'current_value', ews.current_value,
        'metadata', ews.metadata,
        'status', ews.status,
        'detected_at', ews.detected_at,
        'acknowledged_by', ews.acknowledged_by,
        'acknowledged_at', ews.acknowledged_at
      )
      ORDER BY 
        CASE ews.severity
          WHEN 'urgent' THEN 1
          WHEN 'critical' THEN 2
          WHEN 'warning' THEN 3
          ELSE 4
        END,
        ews.detected_at DESC
    ), '[]'::jsonb)
    FROM early_warning_signals ews
    WHERE ews.status = 'active'
  );
END;
$$;

-- ===================================
-- دالة: الاعتراف بالتنبيه
-- ===================================
CREATE OR REPLACE FUNCTION acknowledge_warning(
  p_signal_id uuid,
  p_staff_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE early_warning_signals
  SET 
    status = 'acknowledged',
    acknowledged_by = p_staff_id,
    acknowledged_at = now(),
    notes = p_notes
  WHERE id = p_signal_id;
  
  RETURN FOUND;
END;
$$;

-- ===================================
-- دالة: حل التنبيه
-- ===================================
CREATE OR REPLACE FUNCTION resolve_warning(
  p_signal_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE early_warning_signals
  SET 
    status = 'resolved',
    resolved_at = now(),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_signal_id;
  
  RETURN FOUND;
END;
$$;

-- ===================================
-- دالة: رفض التنبيه
-- ===================================
CREATE OR REPLACE FUNCTION dismiss_warning(
  p_signal_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE early_warning_signals
  SET 
    status = 'dismissed',
    notes = COALESCE(p_notes, notes)
  WHERE id = p_signal_id;
  
  RETURN FOUND;
END;
$$;

-- ===================================
-- Indexes للأداء
-- ===================================
CREATE INDEX IF NOT EXISTS idx_early_warning_signals_status ON early_warning_signals(status);
CREATE INDEX IF NOT EXISTS idx_early_warning_signals_severity ON early_warning_signals(severity);
CREATE INDEX IF NOT EXISTS idx_early_warning_signals_target ON early_warning_signals(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_early_warning_signals_detected ON early_warning_signals(detected_at);

-- ===================================
-- تفعيل Realtime
-- ===================================
ALTER PUBLICATION supabase_realtime ADD TABLE early_warning_signals;

-- ===================================
-- تشغيل الكشف التلقائي للاختبار
-- ===================================
SELECT detect_early_warnings();
