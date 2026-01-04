/*
  # إعادة إنشاء جداول التشغيل على مستوى المزرعة

  ## المشكلة
  - جدول `b2f_farm_operation_updates` غير موجود
  - جدول `b2f_farm_operation_phases` غير موجود
  - هذا يمنع نظام التشغيل من العمل بشكل صحيح

  ## الحل
  - إعادة إنشاء الجداول المفقودة مع سياسات RLS
  - إضافة البيانات الأساسية للمراحل
*/

-- =====================================================
-- 1. جدول تحديثات التشغيل على مستوى المزرعة
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
-- 2. المراحل التشغيلية على مستوى المزرعة
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
-- 3. View: تحديثات المستثمر بناءً على عقوده
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
-- 4. دالة: الحصول على تحديثات المستثمر
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