/*
  # نظام بوابة قيادة المنصة (الإدارة العليا)

  ## الوصف
  نظام الإدارة العليا للمنصة - يوفر:
  1. إدارة المسؤولين على مستوى المنصة
  2. لوحة قيادة إشرافية
  3. نظام صلاحيات متعدد المستويات
  
  ## الجداول
  1. `platform_administrators` - المسؤولين على مستوى المنصة
  2. `platform_alerts` - التنبيهات الحرجة
  3. دوال التحقق من الصلاحيات
*/

-- =====================================================
-- 1. جدول المسؤولين على مستوى المنصة
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_administrators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- الصلاحية على مستوى المنصة
  platform_role text NOT NULL CHECK (platform_role IN (
    'platform_owner',      -- مالك المنصة
    'platform_admin',      -- مدير عام
    'platform_supervisor'  -- مشرف عام
  )),

  -- القسم المسؤول عنه (اختياري - للمشرفين المتخصصين)
  section text CHECK (section IN (
    'b2f',              -- استثمار أشجار المزارع
    'auctions',         -- مزاد الشركات
    'general'           -- عام (لجميع الأقسام)
  )),

  -- المعلومات الشخصية
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,

  -- الحالة
  is_active boolean DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  deactivated_at timestamptz,

  -- ملاحظات
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- منع التكرار
  CONSTRAINT platform_administrators_unique_user
    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_user ON platform_administrators(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_role ON platform_administrators(platform_role);
CREATE INDEX IF NOT EXISTS idx_platform_admins_active ON platform_administrators(is_active) WHERE is_active = true;

ALTER TABLE platform_administrators ENABLE ROW LEVEL SECURITY;

-- سياسة: المسؤولون يرون بعضهم
CREATE POLICY "Platform admins view all admins"
  ON platform_administrators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_administrators
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- سياسة: المالك والمدير العام فقط يديرون المسؤولين
CREATE POLICY "Platform owners manage admins"
  ON platform_administrators FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_administrators
      WHERE user_id = auth.uid()
        AND platform_role IN ('platform_owner', 'platform_admin')
        AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_administrators
      WHERE user_id = auth.uid()
        AND platform_role IN ('platform_owner', 'platform_admin')
        AND is_active = true
    )
  );

-- =====================================================
-- 2. جدول التنبيهات الحرجة
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- نوع التنبيه
  alert_type text NOT NULL CHECK (alert_type IN (
    'unreviewed_reports',    -- تقارير لم تُراجع
    'overdue_tasks',         -- مهام تجاوزت SLA
    'farms_without_manager', -- مزارع بدون مدير
    'pending_requests',      -- طلبات متراكمة
    'system_error'          -- خطأ نظامي
  )),

  -- المحتوى
  title text NOT NULL,
  description text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- البيانات المرتبطة
  related_entity_type text, -- farm, task, report, request
  related_entity_id uuid,

  -- القسم المرتبط
  section text,

  -- الحالة
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_alerts_type ON platform_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_platform_alerts_severity ON platform_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_platform_alerts_unresolved ON platform_alerts(is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_platform_alerts_created ON platform_alerts(created_at DESC);

ALTER TABLE platform_alerts ENABLE ROW LEVEL SECURITY;

-- سياسة: المسؤولون على مستوى المنصة يرون التنبيهات
CREATE POLICY "Platform admins view alerts"
  ON platform_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_administrators
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- سياسة: المسؤولون يمكنهم حل التنبيهات
CREATE POLICY "Platform admins resolve alerts"
  ON platform_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_administrators
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =====================================================
-- 3. دالة: التحقق من صلاحية المنصة
-- =====================================================

CREATE OR REPLACE FUNCTION is_platform_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM platform_administrators
    WHERE user_id = check_user_id
      AND is_active = true
      AND platform_role IN ('platform_owner', 'platform_admin')
  );
END;
$$;

-- =====================================================
-- 4. دالة: الحصول على دور المستخدم في المنصة
-- =====================================================

CREATE OR REPLACE FUNCTION get_platform_role(check_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT platform_role INTO v_role
  FROM platform_administrators
  WHERE user_id = check_user_id
    AND is_active = true
  LIMIT 1;

  RETURN v_role;
END;
$$;

-- =====================================================
-- 5. دالة: إحصائيات لوحة القيادة
-- =====================================================

CREATE OR REPLACE FUNCTION get_command_center_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
  v_unreviewed_reports integer;
  v_overdue_tasks integer;
  v_active_farms integer;
  v_affected_investors integer;
  v_critical_alerts integer;
BEGIN
  -- التحقق من الصلاحية
  IF NOT is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  -- التقارير غير المقروءة
  SELECT COUNT(*) INTO v_unreviewed_reports
  FROM management_reports
  WHERE status = 'sent_to_admin';

  -- المهام المتأخرة
  SELECT COUNT(*) INTO v_overdue_tasks
  FROM farm_tasks
  WHERE due_date < CURRENT_DATE
    AND status IN ('new', 'in_progress');

  -- المزارع النشطة
  SELECT COUNT(*) INTO v_active_farms
  FROM b2f_farms
  WHERE is_active = true;

  -- المستثمرين المتأثرين اليوم (لديهم تحديثات جديدة)
  SELECT COUNT(DISTINCT investor_id) INTO v_affected_investors
  FROM investor_operations
  WHERE operation_date::date = CURRENT_DATE;

  -- التنبيهات الحرجة
  SELECT COUNT(*) INTO v_critical_alerts
  FROM platform_alerts
  WHERE is_resolved = false
    AND severity IN ('high', 'critical');

  RETURN jsonb_build_object(
    'unreviewed_reports', v_unreviewed_reports,
    'overdue_tasks', v_overdue_tasks,
    'active_farms', v_active_farms,
    'affected_investors_today', v_affected_investors,
    'critical_alerts', v_critical_alerts
  );
END;
$$;

-- =====================================================
-- 6. دالة: جلب التنبيهات النشطة
-- =====================================================

CREATE OR REPLACE FUNCTION get_active_alerts(
  p_severity text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  alert_type text,
  title text,
  description text,
  severity text,
  related_entity_type text,
  related_entity_id uuid,
  section text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من الصلاحية
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.alert_type,
    a.title,
    a.description,
    a.severity,
    a.related_entity_type,
    a.related_entity_id,
    a.section,
    a.created_at
  FROM platform_alerts a
  WHERE a.is_resolved = false
    AND (p_severity IS NULL OR a.severity = p_severity)
  ORDER BY
    CASE a.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    a.created_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 7. دالة: توليد تنبيهات تلقائية
-- =====================================================

CREATE OR REPLACE FUNCTION generate_automatic_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alerts_created integer := 0;
  v_farm record;
BEGIN
  -- مزارع بدون مدير
  FOR v_farm IN
    SELECT f.id, f.name
    FROM b2f_farms f
    WHERE f.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM farm_team_members ftm
        WHERE ftm.farm_id = f.id
          AND ftm.role = 'farm_manager'
          AND ftm.is_active = true
          AND ftm.user_id IS NOT NULL
      )
  LOOP
    INSERT INTO platform_alerts (
      alert_type,
      title,
      description,
      severity,
      related_entity_type,
      related_entity_id,
      section
    )
    VALUES (
      'farms_without_manager',
      'مزرعة بدون مدير',
      'المزرعة "' || v_farm.name || '" لا يوجد لها مدير مُعيّن',
      'high',
      'farm',
      v_farm.id,
      'b2f'
    )
    ON CONFLICT DO NOTHING;

    v_alerts_created := v_alerts_created + 1;
  END LOOP;

  -- تقارير غير مقروءة لأكثر من 3 أيام
  INSERT INTO platform_alerts (
    alert_type,
    title,
    description,
    severity,
    section
  )
  SELECT
    'unreviewed_reports',
    'تقارير متراكمة',
    COUNT(*) || ' تقرير لم يُراجع منذ أكثر من 3 أيام',
    'medium',
    'b2f'
  FROM management_reports
  WHERE status = 'sent_to_admin'
    AND created_at < NOW() - INTERVAL '3 days'
  HAVING COUNT(*) > 0
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'alerts_created', v_alerts_created
  );
END;
$$;

-- =====================================================
-- 8. إضافة مسؤول منصة افتراضي (admin@example.com)
-- =====================================================

DO $$
DECLARE
  v_admin_user_id uuid;
BEGIN
  -- البحث عن المستخدم admin
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE email = 'admin@example.com'
  LIMIT 1;

  -- إذا وجد، أضفه كمسؤول منصة
  IF v_admin_user_id IS NOT NULL THEN
    INSERT INTO platform_administrators (
      user_id,
      platform_role,
      section,
      full_name,
      email,
      is_active
    )
    VALUES (
      v_admin_user_id,
      'platform_owner',
      'general',
      'مدير المنصة',
      'admin@example.com',
      true
    )
    ON CONFLICT (user_id) DO UPDATE
    SET platform_role = 'platform_owner',
        section = 'general',
        is_active = true;

    RAISE NOTICE 'تم إضافة admin@example.com كمسؤول منصة';
  ELSE
    RAISE NOTICE 'المستخدم admin@example.com غير موجود';
  END IF;
END $$;
