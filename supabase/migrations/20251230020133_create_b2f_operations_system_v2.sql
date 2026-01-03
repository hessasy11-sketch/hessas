/*
  # نظام التشغيل الكامل لاستثمار أشجار المزارع - النسخة النهائية

  ## الوظائف
  - استقبال الطلبات من قسم العقود فقط
  - 6 مراحل تشغيلية على شكل بطاقات
  - ربط الأشجار بموقعها في المزرعة
  - تصنيف المستثمر حسب عدد أشجاره
  - عرض للمستثمر (بدون تحكم)
*/

-- ===================================
-- 1. البطاقات التشغيلية
-- ===================================

CREATE TABLE IF NOT EXISTS b2f_tree_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  sales_request_id uuid NOT NULL UNIQUE REFERENCES b2f_sales_requests(id) ON DELETE RESTRICT,
  contract_number text NOT NULL UNIQUE,
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE RESTRICT,
  opportunity_id uuid NOT NULL REFERENCES b2f_opportunities(id) ON DELETE RESTRICT,
  
  investor_name text NOT NULL,
  investor_phone text NOT NULL,
  investor_email text,
  investor_account_id uuid REFERENCES b2f_investor_accounts(id),
  
  tree_type text NOT NULL,
  tree_count integer NOT NULL CHECK (tree_count > 0),
  
  farm_section text,
  farm_plot text,
  internal_code text,
  
  current_phase text NOT NULL DEFAULT 'activation' CHECK (
    current_phase IN ('activation', 'service', 'irrigation', 'fruiting', 'pre_harvest', 'ready')
  ),
  
  progress_percentage integer DEFAULT 10 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  activation_date timestamptz,
  service_start_date timestamptz,
  irrigation_start_date timestamptz,
  fruiting_start_date timestamptz,
  pre_harvest_date timestamptz,
  ready_date timestamptz,
  
  contract_start_date date NOT NULL,
  contract_end_date date NOT NULL,
  contract_duration_years integer NOT NULL DEFAULT 10,
  
  total_amount numeric(12, 2) NOT NULL CHECK (total_amount >= 0),
  
  is_active boolean DEFAULT true,
  is_paused boolean DEFAULT false,
  pause_reason text,
  paused_at timestamptz,
  
  admin_notes text,
  last_update_description text,
  last_update_date timestamptz DEFAULT now(),
  
  investor_classification text GENERATED ALWAYS AS (
    CASE
      WHEN tree_count BETWEEN 1 AND 10 THEN 'seedling'
      WHEN tree_count BETWEEN 11 AND 50 THEN 'garden'
      WHEN tree_count BETWEEN 51 AND 150 THEN 'plot'
      WHEN tree_count BETWEEN 151 AND 300 THEN 'orchard'
      WHEN tree_count BETWEEN 301 AND 1000 THEN 'small_farm'
      WHEN tree_count BETWEEN 1001 AND 10000 THEN 'operation_farm'
      ELSE 'investment_farm'
    END
  ) STORED,
  
  transferred_from_contracts_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tree_ops_contract ON b2f_tree_operations(contract_number);
CREATE INDEX IF NOT EXISTS idx_tree_ops_farm ON b2f_tree_operations(farm_id);
CREATE INDEX IF NOT EXISTS idx_tree_ops_investor ON b2f_tree_operations(investor_phone);
CREATE INDEX IF NOT EXISTS idx_tree_ops_phase ON b2f_tree_operations(current_phase);
CREATE INDEX IF NOT EXISTS idx_tree_ops_active ON b2f_tree_operations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tree_ops_classification ON b2f_tree_operations(investor_classification);

ALTER TABLE b2f_tree_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage operations"
  ON b2f_tree_operations FOR ALL TO authenticated
  USING (is_b2f_admin(auth.uid()))
  WITH CHECK (is_b2f_admin(auth.uid()));

CREATE POLICY "Public view active operations"
  ON b2f_tree_operations FOR SELECT TO public
  USING (is_active = true);

-- ===================================
-- 2. سجل التحديثات
-- ===================================

CREATE TABLE IF NOT EXISTS b2f_operation_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES b2f_tree_operations(id) ON DELETE CASCADE,
  
  update_type text NOT NULL CHECK (
    update_type IN ('phase_change', 'location_assigned', 'progress_update', 'pause', 'resume', 'maintenance', 'note')
  ),
  
  title text NOT NULL,
  description text NOT NULL,
  old_value text,
  new_value text,
  related_phase text,
  images jsonb DEFAULT '[]'::jsonb,
  admin_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_updates_op ON b2f_operation_updates(operation_id);
CREATE INDEX IF NOT EXISTS idx_ops_updates_type ON b2f_operation_updates(update_type);
CREATE INDEX IF NOT EXISTS idx_ops_updates_date ON b2f_operation_updates(created_at DESC);

ALTER TABLE b2f_operation_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage updates"
  ON b2f_operation_updates FOR ALL TO authenticated
  USING (is_b2f_admin(auth.uid()))
  WITH CHECK (is_b2f_admin(auth.uid()));

CREATE POLICY "Public view updates"
  ON b2f_operation_updates FOR SELECT TO public
  USING (true);

-- ===================================
-- 3. المراحل التشغيلية
-- ===================================

CREATE TABLE IF NOT EXISTS b2f_operation_phases (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  order_number integer NOT NULL,
  estimated_duration_days integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO b2f_operation_phases (id, name_ar, name_en, description, icon, color, order_number, estimated_duration_days) VALUES
  ('activation', 'تم التفعيل داخل المزرعة', 'Activation', 'تم تسجيل الأشجار وتخصيصها داخل المزرعة', 'check-circle', 'emerald', 1, 7),
  ('service', 'متابعة الخدمة الزراعية', 'Agricultural Service', 'بدء خدمات الرعاية الأساسية والمتابعة الدورية', 'wrench', 'blue', 2, 90),
  ('irrigation', 'الري والرعاية', 'Irrigation & Care', 'نظام الري المنتظم والرعاية المستمرة', 'droplet', 'cyan', 3, 180),
  ('fruiting', 'بداية الإثمار', 'Fruiting Start', 'بداية مرحلة الإنتاج وظهور الثمار الأولى', 'sprout', 'amber', 4, 365),
  ('pre_harvest', 'ما قبل الحصاد', 'Pre-Harvest', 'التحضير لموسم الحصاد والإنتاج', 'calendar', 'orange', 5, 60),
  ('ready', 'جاهز للاستفادة من الإنتاج', 'Ready for Production', 'الأشجار جاهزة للإنتاج والاستفادة المستمرة', 'package', 'green', 6, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE b2f_operation_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View phases"
  ON b2f_operation_phases FOR SELECT TO public
  USING (is_active = true);

-- ===================================
-- 4. تصنيفات المستثمرين
-- ===================================

CREATE TABLE IF NOT EXISTS b2f_investor_classifications (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  icon text NOT NULL,
  min_trees integer NOT NULL,
  max_trees integer,
  color text NOT NULL,
  description text NOT NULL,
  order_number integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

INSERT INTO b2f_investor_classifications (id, name_ar, icon, min_trees, max_trees, color, description, order_number) VALUES
  ('seedling', 'غرسة', '🌱', 1, 10, 'green', 'مستثمر بداية - حتى 10 أشجار', 1),
  ('garden', 'حديقة', '🌿', 11, 50, 'emerald', 'مستثمر ناشئ - من 11 إلى 50 شجرة', 2),
  ('plot', 'قطعة زراعية', '🌾', 51, 150, 'teal', 'مستثمر نشط - من 51 إلى 150 شجرة', 3),
  ('orchard', 'بستان', '🌳', 151, 300, 'cyan', 'مستثمر متمرس - من 151 إلى 300 شجرة', 4),
  ('small_farm', 'مزرعة صغيرة', '🏡', 301, 1000, 'blue', 'مستثمر كبير - من 301 إلى 1000 شجرة', 5),
  ('operation_farm', 'مزرعة تشغيلية', '🚜', 1001, 10000, 'indigo', 'مستثمر محترف - من 1001 إلى 10000 شجرة', 6),
  ('investment_farm', 'مزرعة استثمارية', '🟩', 10001, NULL, 'purple', 'مستثمر مؤسسي - أكثر من 10000 شجرة', 7)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE b2f_investor_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View classifications"
  ON b2f_investor_classifications FOR SELECT TO public
  USING (true);

-- ===================================
-- 5. تحويل الطلب للتشغيل
-- ===================================

CREATE OR REPLACE FUNCTION transfer_contract_to_operations(p_request_id uuid)
RETURNS json AS $$
DECLARE
  v_request record;
  v_operation_id uuid;
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  SELECT * INTO v_request FROM b2f_sales_requests
  WHERE id = p_request_id AND status = 'contract_issued';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الطلب غير موجود أو لم يصدر له عقد');
  END IF;

  IF EXISTS (SELECT 1 FROM b2f_tree_operations WHERE sales_request_id = p_request_id) THEN
    RETURN json_build_object('success', false, 'error', 'تم تحويله مسبقاً');
  END IF;

  INSERT INTO b2f_tree_operations (
    sales_request_id, contract_number, farm_id, opportunity_id,
    investor_name, investor_phone, investor_email, investor_account_id,
    tree_type, tree_count, current_phase, progress_percentage, activation_date,
    contract_start_date, contract_end_date, total_amount, last_update_description
  ) SELECT
    v_request.id, v_request.contract_number, v_request.farm_id, v_request.opportunity_id,
    v_request.investor_name, v_request.investor_phone, v_request.investor_email, v_request.investor_account_id,
    v_request.tree_type, v_request.number_of_trees, 'activation', 10, now(),
    CURRENT_DATE, CURRENT_DATE + INTERVAL '10 years', v_request.total_amount,
    'تم تفعيل شجرتك داخل المزرعة، وستتقدم عبر مراحل التشغيل الزراعي حسب التحديثات المعتمدة'
  RETURNING id INTO v_operation_id;

  UPDATE b2f_sales_requests SET
    status = 'operational',
    transferred_to_operations = true,
    transferred_to_operations_at = now()
  WHERE id = p_request_id;

  INSERT INTO b2f_operation_updates (operation_id, update_type, title, description, new_value, related_phase)
  VALUES (v_operation_id, 'phase_change', 'تم التفعيل داخل المزرعة',
    'تم تسجيل وتفعيل أشجارك بنجاح. سنبدأ المتابعة الدورية.', 'activation', 'activation');

  RETURN json_build_object('success', true, 'operationId', v_operation_id,
    'message', 'تم تحويل الطلب للتشغيل بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 6. تحديث المرحلة
-- ===================================

CREATE OR REPLACE FUNCTION update_operation_phase(
  p_operation_id uuid, p_new_phase text, p_title text, p_description text, p_progress integer DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_old_phase text;
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  SELECT current_phase INTO v_old_phase FROM b2f_tree_operations WHERE id = p_operation_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'البطاقة غير موجودة');
  END IF;

  UPDATE b2f_tree_operations SET
    current_phase = p_new_phase,
    progress_percentage = COALESCE(p_progress, progress_percentage),
    last_update_description = p_description,
    last_update_date = now(),
    service_start_date = CASE WHEN p_new_phase = 'service' AND service_start_date IS NULL THEN now() ELSE service_start_date END,
    irrigation_start_date = CASE WHEN p_new_phase = 'irrigation' AND irrigation_start_date IS NULL THEN now() ELSE irrigation_start_date END,
    fruiting_start_date = CASE WHEN p_new_phase = 'fruiting' AND fruiting_start_date IS NULL THEN now() ELSE fruiting_start_date END,
    pre_harvest_date = CASE WHEN p_new_phase = 'pre_harvest' AND pre_harvest_date IS NULL THEN now() ELSE pre_harvest_date END,
    ready_date = CASE WHEN p_new_phase = 'ready' AND ready_date IS NULL THEN now() ELSE ready_date END
  WHERE id = p_operation_id;

  INSERT INTO b2f_operation_updates (operation_id, update_type, title, description, old_value, new_value, related_phase)
  VALUES (p_operation_id, 'phase_change', p_title, p_description, v_old_phase, p_new_phase, p_new_phase);

  RETURN json_build_object('success', true, 'message', 'تم التحديث بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 7. إحصائيات المستثمر
-- ===================================

CREATE OR REPLACE FUNCTION get_investor_operations_summary(p_phone text)
RETURNS json AS $$
DECLARE
  v_total_trees integer;
  v_classification text;
  v_classification_name text;
BEGIN
  SELECT COALESCE(SUM(tree_count), 0), MAX(investor_classification)
  INTO v_total_trees, v_classification
  FROM b2f_tree_operations WHERE investor_phone = p_phone AND is_active = true;

  SELECT name_ar INTO v_classification_name FROM b2f_investor_classifications WHERE id = v_classification;

  RETURN json_build_object(
    'totalTrees', v_total_trees,
    'classification', v_classification,
    'classificationName', COALESCE(v_classification_name, 'غير محدد'),
    'activeOperations', (SELECT COUNT(*) FROM b2f_tree_operations WHERE investor_phone = p_phone AND is_active = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 8. Trigger للتحديث التلقائي
-- ===================================

CREATE OR REPLACE FUNCTION update_tree_ops_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tree_ops_timestamp ON b2f_tree_operations;
CREATE TRIGGER trigger_update_tree_ops_timestamp
  BEFORE UPDATE ON b2f_tree_operations
  FOR EACH ROW EXECUTE FUNCTION update_tree_ops_timestamp();
