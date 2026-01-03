/*
  # نظام التشغيل على مستوى المزرعة - Farm-Level Operations

  ## الفكرة الأساسية
  - التشغيل يكون على مستوى المزرعة وليس على الأفراد
  - العقود هي حلقة الربط بين المزرعة والمستثمر
  - عند تسجيل تحديث في المزرعة، يظهر لجميع المستثمرين المرتبطين بها

  ## الجداول
  1. `b2f_farm_operations` - العمليات التشغيلية على مستوى المزرعة
  2. `b2f_farm_operation_updates` - تحديثات التشغيل (على مستوى المزرعة)
  3. View لعرض التحديثات للمستثمرين بناءً على عقودهم

  ## سير العمل
  1. الإدارة تسجل تحديث تشغيلي للمزرعة
  2. النظام يتعرف تلقائياً على جميع العقود المرتبطة بهذه المزرعة
  3. يظهر التحديث في تبويب "تشغيل أشجاري" لكل مستثمر مرتبط
  4. لا تظهر التكاليف - فقط الحالة والمستجدات
*/

-- =====================================================
-- 1. جدول العمليات التشغيلية على مستوى المزرعة
-- =====================================================

CREATE TABLE IF NOT EXISTS b2f_farm_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,

  -- المرحلة الحالية للمزرعة
  current_phase text NOT NULL DEFAULT 'preparation' CHECK (
    current_phase IN ('preparation', 'activation', 'service', 'irrigation', 'fruiting', 'pre_harvest', 'harvest', 'post_harvest')
  ),

  -- نسبة التقدم العامة للمزرعة
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- تواريخ المراحل
  preparation_date timestamptz,
  activation_date timestamptz,
  service_start_date timestamptz,
  irrigation_start_date timestamptz,
  fruiting_start_date timestamptz,
  pre_harvest_date timestamptz,
  harvest_start_date timestamptz,
  post_harvest_date timestamptz,

  -- الحالة
  is_active boolean DEFAULT true,
  is_paused boolean DEFAULT false,
  pause_reason text,
  paused_at timestamptz,

  -- آخر تحديث
  last_update_title text,
  last_update_description text,
  last_update_date timestamptz DEFAULT now(),

  -- ملاحظات إدارية
  admin_notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farm_ops_farm ON b2f_farm_operations(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_ops_phase ON b2f_farm_operations(current_phase);
CREATE INDEX IF NOT EXISTS idx_farm_ops_active ON b2f_farm_operations(is_active) WHERE is_active = true;

ALTER TABLE b2f_farm_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage farm operations"
  ON b2f_farm_operations FOR ALL TO authenticated
  USING (is_b2f_admin(auth.uid()))
  WITH CHECK (is_b2f_admin(auth.uid()));

CREATE POLICY "Public view active farm operations"
  ON b2f_farm_operations FOR SELECT TO public
  USING (is_active = true);

-- =====================================================
-- 2. جدول تحديثات التشغيل على مستوى المزرعة
-- =====================================================

CREATE TABLE IF NOT EXISTS b2f_farm_operation_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_operation_id uuid NOT NULL REFERENCES b2f_farm_operations(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,

  -- نوع التحديث
  update_type text NOT NULL CHECK (
    update_type IN ('phase_change', 'progress_update', 'maintenance', 'irrigation', 'fertilization', 'pest_control', 'harvest', 'general', 'pause', 'resume')
  ),

  -- محتوى التحديث
  title text NOT NULL,
  description text NOT NULL,

  -- القيم القديمة والجديدة (للتتبع)
  old_value text,
  new_value text,

  -- المرحلة المرتبطة
  related_phase text,

  -- صور التحديث (اختياري)
  images jsonb DEFAULT '[]'::jsonb,

  -- معلومات الإدارة
  admin_id uuid,
  admin_name text,

  -- الظهور للمستثمرين
  visible_to_investors boolean DEFAULT true,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farm_updates_farm_op ON b2f_farm_operation_updates(farm_operation_id);
CREATE INDEX IF NOT EXISTS idx_farm_updates_farm ON b2f_farm_operation_updates(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_updates_type ON b2f_farm_operation_updates(update_type);
CREATE INDEX IF NOT EXISTS idx_farm_updates_date ON b2f_farm_operation_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_farm_updates_visible ON b2f_farm_operation_updates(visible_to_investors) WHERE visible_to_investors = true;

ALTER TABLE b2f_farm_operation_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage farm updates"
  ON b2f_farm_operation_updates FOR ALL TO authenticated
  USING (is_b2f_admin(auth.uid()))
  WITH CHECK (is_b2f_admin(auth.uid()));

CREATE POLICY "Public view visible farm updates"
  ON b2f_farm_operation_updates FOR SELECT TO public
  USING (visible_to_investors = true);

-- =====================================================
-- 3. المراحل التشغيلية على مستوى المزرعة
-- =====================================================

CREATE TABLE IF NOT EXISTS b2f_farm_operation_phases (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  order_number integer NOT NULL UNIQUE,
  estimated_duration_days integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO b2f_farm_operation_phases (id, name_ar, name_en, description, icon, color, order_number, estimated_duration_days) VALUES
  ('preparation', 'التحضير والإعداد', 'Preparation', 'تجهيز المزرعة واستقبال العقود الجديدة', 'settings', 'gray', 1, 14),
  ('activation', 'التفعيل', 'Activation', 'تفعيل المزرعة وبدء العمليات الزراعية', 'check-circle', 'emerald', 2, 7),
  ('service', 'الخدمة الزراعية', 'Agricultural Service', 'متابعة الخدمات الزراعية الأساسية', 'wrench', 'blue', 3, 90),
  ('irrigation', 'الري والرعاية', 'Irrigation & Care', 'نظام الري المنتظم والرعاية المستمرة', 'droplet', 'cyan', 4, 180),
  ('fruiting', 'الإثمار', 'Fruiting', 'بداية مرحلة الإنتاج وظهور الثمار', 'sprout', 'amber', 5, 365),
  ('pre_harvest', 'ما قبل الحصاد', 'Pre-Harvest', 'التحضير لموسم الحصاد', 'calendar', 'orange', 6, 60),
  ('harvest', 'موسم الحصاد', 'Harvest Season', 'جني الثمار وتوزيع الإنتاج', 'package', 'green', 7, 90),
  ('post_harvest', 'ما بعد الحصاد', 'Post-Harvest', 'الصيانة والتحضير للموسم القادم', 'leaf', 'teal', 8, 30)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE b2f_farm_operation_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View farm phases"
  ON b2f_farm_operation_phases FOR SELECT TO public
  USING (is_active = true);

-- =====================================================
-- 4. View: تحديثات المستثمر بناءً على عقوده
-- =====================================================

CREATE OR REPLACE VIEW investor_operation_updates AS
SELECT DISTINCT
  u.id as update_id,
  u.farm_id,
  u.farm_operation_id,
  u.update_type,
  u.title,
  u.description,
  u.related_phase,
  u.images,
  u.admin_name,
  u.created_at,
  c.investor_phone,
  c.investor_id,
  c.contract_number,
  c.trees_count,
  f.name as farm_name,
  f.location as farm_location,
  f.city as farm_city,
  fo.current_phase as farm_current_phase,
  fo.progress_percentage as farm_progress,
  p.name_ar as phase_name_ar,
  p.color as phase_color,
  p.icon as phase_icon
FROM b2f_farm_operation_updates u
JOIN b2f_farm_operations fo ON u.farm_operation_id = fo.id
JOIN b2f_contracts c ON c.farm_id = u.farm_id AND c.status = 'active'
JOIN b2f_farms f ON f.id = u.farm_id
LEFT JOIN b2f_farm_operation_phases p ON p.id = u.related_phase
WHERE u.visible_to_investors = true
  AND fo.is_active = true
ORDER BY u.created_at DESC;

-- =====================================================
-- 5. دالة: إنشاء تشغيل جديد للمزرعة
-- =====================================================

CREATE OR REPLACE FUNCTION create_farm_operation(
  p_farm_id uuid,
  p_initial_phase text DEFAULT 'preparation'
)
RETURNS json AS $$
DECLARE
  v_operation_id uuid;
  v_farm_name text;
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  SELECT name INTO v_farm_name FROM b2f_farms WHERE id = p_farm_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'المزرعة غير موجودة');
  END IF;

  IF EXISTS (SELECT 1 FROM b2f_farm_operations WHERE farm_id = p_farm_id AND is_active = true) THEN
    RETURN json_build_object('success', false, 'error', 'يوجد تشغيل نشط بالفعل لهذه المزرعة');
  END IF;

  INSERT INTO b2f_farm_operations (
    farm_id,
    current_phase,
    progress_percentage,
    preparation_date,
    last_update_title,
    last_update_description
  ) VALUES (
    p_farm_id,
    p_initial_phase,
    5,
    CASE WHEN p_initial_phase = 'preparation' THEN now() ELSE NULL END,
    'تم إنشاء التشغيل',
    'تم البدء بالعمليات التشغيلية للمزرعة'
  ) RETURNING id INTO v_operation_id;

  INSERT INTO b2f_farm_operation_updates (
    farm_operation_id,
    farm_id,
    update_type,
    title,
    description,
    related_phase,
    visible_to_investors
  ) VALUES (
    v_operation_id,
    p_farm_id,
    'phase_change',
    'بدء العمليات التشغيلية',
    'تم إنشاء سجل التشغيل للمزرعة. سيتم تحديثكم بكل جديد.',
    p_initial_phase,
    true
  );

  RETURN json_build_object(
    'success', true,
    'operationId', v_operation_id,
    'farmName', v_farm_name,
    'message', 'تم إنشاء التشغيل بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. دالة: تحديث مرحلة المزرعة
-- =====================================================

CREATE OR REPLACE FUNCTION update_farm_operation_phase(
  p_farm_id uuid,
  p_new_phase text,
  p_title text,
  p_description text,
  p_progress integer DEFAULT NULL,
  p_images jsonb DEFAULT '[]'::jsonb
)
RETURNS json AS $$
DECLARE
  v_operation_id uuid;
  v_old_phase text;
  v_farm_name text;
  v_contracts_count integer;
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  SELECT id, current_phase INTO v_operation_id, v_old_phase
  FROM b2f_farm_operations
  WHERE farm_id = p_farm_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'لا يوجد تشغيل نشط لهذه المزرعة');
  END IF;

  SELECT name INTO v_farm_name FROM b2f_farms WHERE id = p_farm_id;

  SELECT COUNT(*) INTO v_contracts_count
  FROM b2f_contracts
  WHERE farm_id = p_farm_id AND status = 'active';

  UPDATE b2f_farm_operations SET
    current_phase = p_new_phase,
    progress_percentage = COALESCE(p_progress, progress_percentage),
    last_update_title = p_title,
    last_update_description = p_description,
    last_update_date = now(),
    activation_date = CASE WHEN p_new_phase = 'activation' AND activation_date IS NULL THEN now() ELSE activation_date END,
    service_start_date = CASE WHEN p_new_phase = 'service' AND service_start_date IS NULL THEN now() ELSE service_start_date END,
    irrigation_start_date = CASE WHEN p_new_phase = 'irrigation' AND irrigation_start_date IS NULL THEN now() ELSE irrigation_start_date END,
    fruiting_start_date = CASE WHEN p_new_phase = 'fruiting' AND fruiting_start_date IS NULL THEN now() ELSE fruiting_start_date END,
    pre_harvest_date = CASE WHEN p_new_phase = 'pre_harvest' AND pre_harvest_date IS NULL THEN now() ELSE pre_harvest_date END,
    harvest_start_date = CASE WHEN p_new_phase = 'harvest' AND harvest_start_date IS NULL THEN now() ELSE harvest_start_date END,
    post_harvest_date = CASE WHEN p_new_phase = 'post_harvest' AND post_harvest_date IS NULL THEN now() ELSE post_harvest_date END,
    updated_at = now()
  WHERE id = v_operation_id;

  INSERT INTO b2f_farm_operation_updates (
    farm_operation_id,
    farm_id,
    update_type,
    title,
    description,
    old_value,
    new_value,
    related_phase,
    images,
    visible_to_investors
  ) VALUES (
    v_operation_id,
    p_farm_id,
    'phase_change',
    p_title,
    p_description,
    v_old_phase,
    p_new_phase,
    p_new_phase,
    p_images,
    true
  );

  RETURN json_build_object(
    'success', true,
    'farmName', v_farm_name,
    'affectedContracts', v_contracts_count,
    'message', format('تم التحديث بنجاح. سيصل للمستثمرين (%s عقد)', v_contracts_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. دالة: إضافة تحديث عام للمزرعة
-- =====================================================

CREATE OR REPLACE FUNCTION add_farm_operation_update(
  p_farm_id uuid,
  p_update_type text,
  p_title text,
  p_description text,
  p_images jsonb DEFAULT '[]'::jsonb,
  p_visible boolean DEFAULT true
)
RETURNS json AS $$
DECLARE
  v_operation_id uuid;
  v_contracts_count integer;
BEGIN
  IF NOT is_b2f_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  SELECT id INTO v_operation_id
  FROM b2f_farm_operations
  WHERE farm_id = p_farm_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'لا يوجد تشغيل نشط لهذه المزرعة');
  END IF;

  SELECT COUNT(*) INTO v_contracts_count
  FROM b2f_contracts
  WHERE farm_id = p_farm_id AND status = 'active';

  INSERT INTO b2f_farm_operation_updates (
    farm_operation_id,
    farm_id,
    update_type,
    title,
    description,
    images,
    visible_to_investors
  ) VALUES (
    v_operation_id,
    p_farm_id,
    p_update_type,
    p_title,
    p_description,
    p_images,
    p_visible
  );

  UPDATE b2f_farm_operations SET
    last_update_title = p_title,
    last_update_description = p_description,
    last_update_date = now(),
    updated_at = now()
  WHERE id = v_operation_id;

  RETURN json_build_object(
    'success', true,
    'affectedContracts', v_contracts_count,
    'message', 'تم إضافة التحديث بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. دالة: الحصول على تحديثات المستثمر
-- =====================================================

CREATE OR REPLACE FUNCTION get_investor_farm_updates(p_phone text)
RETURNS TABLE (
  update_id uuid,
  farm_name text,
  farm_city text,
  contract_number text,
  trees_count integer,
  update_type text,
  title text,
  description text,
  phase_name text,
  phase_color text,
  phase_icon text,
  images jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.update_id,
    u.farm_name,
    u.farm_city,
    u.contract_number,
    u.trees_count,
    u.update_type,
    u.title,
    u.description,
    u.phase_name_ar,
    u.phase_color,
    u.phase_icon,
    u.images,
    u.created_at
  FROM investor_operation_updates u
  WHERE u.investor_phone = p_phone
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. Trigger للتحديث التلقائي
-- =====================================================

CREATE OR REPLACE FUNCTION update_farm_ops_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_farm_ops_timestamp ON b2f_farm_operations;
CREATE TRIGGER trigger_update_farm_ops_timestamp
  BEFORE UPDATE ON b2f_farm_operations
  FOR EACH ROW EXECUTE FUNCTION update_farm_ops_timestamp();