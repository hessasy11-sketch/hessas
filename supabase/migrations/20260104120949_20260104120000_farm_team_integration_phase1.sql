/*
  # المرحلة 1: ربط فرق المزارع - إضافة حقول المسؤولين

  1. تحديثات على b2f_farms
    - إضافة farm_manager_user_id
    - إضافة investment_manager_user_id

  2. جدول جديد: farm_logbook
    - دفتر ارتباط بين مدير المزرعة ومدير الاستثمار

  3. تحديث staff_tasks - إضافة farm_id + نظام الاعتماد الثنائي

  4. الأمان
    - RLS على farm_logbook
    - دوال جديدة للتحقق من الصلاحيات
*/

-- =========================================================
-- 1. تحديث جدول b2f_farms
-- =========================================================

DO $$
BEGIN
  -- إضافة farm_manager_user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_farms' AND column_name = 'farm_manager_user_id'
  ) THEN
    ALTER TABLE b2f_farms ADD COLUMN farm_manager_user_id uuid REFERENCES profiles(id);
    CREATE INDEX IF NOT EXISTS idx_b2f_farms_farm_manager
      ON b2f_farms(farm_manager_user_id) WHERE farm_manager_user_id IS NOT NULL;
  END IF;

  -- إضافة investment_manager_user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_farms' AND column_name = 'investment_manager_user_id'
  ) THEN
    ALTER TABLE b2f_farms ADD COLUMN investment_manager_user_id uuid REFERENCES profiles(id);
    CREATE INDEX IF NOT EXISTS idx_b2f_farms_investment_manager
      ON b2f_farms(investment_manager_user_id) WHERE investment_manager_user_id IS NOT NULL;
  END IF;
END $$;

-- =========================================================
-- 2. جدول دفتر ارتباط المزرعة (Farm Logbook)
-- =========================================================

CREATE TABLE IF NOT EXISTS farm_logbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  created_by_role text NOT NULL CHECK (created_by_role IN ('farm_manager', 'investment_manager', 'farm_supervisor', 'admin')),
  type text NOT NULL CHECK (type IN ('update', 'issue', 'request', 'decision', 'note')),
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE farm_logbook IS 'دفتر الارتباط بين مدير المزرعة ومدير الاستثمار';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_farm_logbook_farm_id ON farm_logbook(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_logbook_created_by ON farm_logbook(created_by);
CREATE INDEX IF NOT EXISTS idx_farm_logbook_type ON farm_logbook(type);
CREATE INDEX IF NOT EXISTS idx_farm_logbook_created_at ON farm_logbook(created_at DESC);

-- Enable RLS
ALTER TABLE farm_logbook ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3. تحديث staff_tasks - إضافة farm_id + الاعتماد الثنائي
-- =========================================================

DO $$
BEGIN
  -- إضافة farm_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_tasks' AND column_name = 'farm_id'
  ) THEN
    ALTER TABLE staff_tasks ADD COLUMN farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_staff_tasks_farm_id
      ON staff_tasks(farm_id) WHERE farm_id IS NOT NULL;
  END IF;

  -- إضافة investment_impact
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_tasks' AND column_name = 'investment_impact'
  ) THEN
    ALTER TABLE staff_tasks ADD COLUMN investment_impact boolean DEFAULT false;
  END IF;

  -- إضافة approval_chain
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_tasks' AND column_name = 'approval_chain'
  ) THEN
    ALTER TABLE staff_tasks ADD COLUMN approval_chain text DEFAULT 'farm_only'
      CHECK (approval_chain IN ('farm_only', 'farm_then_investment'));
  END IF;

  -- إضافة investment_approved_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_tasks' AND column_name = 'investment_approved_by'
  ) THEN
    ALTER TABLE staff_tasks ADD COLUMN investment_approved_by uuid;
  END IF;

  -- إضافة investment_approved_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_tasks' AND column_name = 'investment_approved_at'
  ) THEN
    ALTER TABLE staff_tasks ADD COLUMN investment_approved_at timestamptz;
  END IF;

  -- إضافة investment_notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_tasks' AND column_name = 'investment_notes'
  ) THEN
    ALTER TABLE staff_tasks ADD COLUMN investment_notes text;
  END IF;
END $$;

COMMENT ON COLUMN staff_tasks.farm_id IS 'المزرعة المرتبطة - إلزامي عندما board IN (b2f, operations)';
COMMENT ON COLUMN staff_tasks.investment_impact IS 'هل للمهمة تأثير استثماري';
COMMENT ON COLUMN staff_tasks.approval_chain IS 'سلسلة الاعتماد: farm_only أو farm_then_investment';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_tasks_approval_chain
  ON staff_tasks(approval_chain) WHERE approval_chain = 'farm_then_investment';
CREATE INDEX IF NOT EXISTS idx_staff_tasks_investment_approved
  ON staff_tasks(investment_approved_at) WHERE investment_approved_at IS NULL;

-- =========================================================
-- 4. دوال RLS الجديدة
-- =========================================================

-- دالة: هل المستخدم عضو في farm_team
CREATE OR REPLACE FUNCTION is_farm_member(p_user_id uuid, p_farm_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM farm_team
    WHERE user_id = p_user_id
    AND farm_id = p_farm_id
    AND is_active = true
  );
END;
$$;

-- دالة: هل المستخدم مدير مزرعة
CREATE OR REPLACE FUNCTION is_farm_manager(p_user_id uuid, p_farm_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM farm_team
    WHERE user_id = p_user_id
    AND farm_id = p_farm_id
    AND role = 'farm_manager'
    AND is_active = true
  );
END;
$$;

-- دالة: هل المستخدم مدير استثمار للمزرعة
CREATE OR REPLACE FUNCTION is_investment_manager(p_user_id uuid, p_farm_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM b2f_farms
    WHERE id = p_farm_id
    AND investment_manager_user_id = p_user_id
  );
END;
$$;

-- دالة: الحصول على مزارع المستخدم
CREATE OR REPLACE FUNCTION get_user_farms(p_user_id uuid)
RETURNS TABLE (
  farm_id uuid,
  farm_name text,
  role text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ft.farm_id,
    f.name as farm_name,
    ft.role,
    ft.is_active
  FROM farm_team ft
  INNER JOIN b2f_farms f ON f.id = ft.farm_id
  WHERE ft.user_id = p_user_id
  AND ft.is_active = true
  ORDER BY f.name;
END;
$$;

-- دالة: الحصول على مزارع مدير الاستثمار
CREATE OR REPLACE FUNCTION get_investment_manager_farms(p_user_id uuid)
RETURNS TABLE (
  farm_id uuid,
  farm_name text,
  location text,
  tree_type text,
  pending_approvals bigint,
  overdue_tasks bigint,
  last_logbook_entry timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id as farm_id,
    f.name as farm_name,
    f.location,
    f.tree_type,
    COUNT(DISTINCT st.id) FILTER (
      WHERE st.approval_chain = 'farm_then_investment'
      AND st.status IN ('completed', 'awaiting_approval')
      AND st.investment_approved_at IS NULL
    ) as pending_approvals,
    COUNT(DISTINCT st.id) FILTER (
      WHERE st.due_date < now()
      AND st.status NOT IN ('completed', 'approved', 'cancelled')
    ) as overdue_tasks,
    MAX(fl.created_at) as last_logbook_entry
  FROM b2f_farms f
  LEFT JOIN staff_tasks st ON st.farm_id = f.id
  LEFT JOIN farm_logbook fl ON fl.farm_id = f.id
  WHERE f.investment_manager_user_id = p_user_id
  AND f.is_active = true
  GROUP BY f.id, f.name, f.location, f.tree_type
  ORDER BY pending_approvals DESC, overdue_tasks DESC;
END;
$$;

-- =========================================================
-- 5. RLS Policies لـ farm_logbook
-- =========================================================

CREATE POLICY "Service role full access to farm_logbook"
  ON farm_logbook FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all logbook"
  ON farm_logbook FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Farm members can view logbook"
  ON farm_logbook FOR SELECT
  TO authenticated
  USING (
    is_farm_member(auth.uid(), farm_id)
    OR is_investment_manager(auth.uid(), farm_id)
  );

CREATE POLICY "Farm managers can create logbook entries"
  ON farm_logbook FOR INSERT
  TO authenticated
  WITH CHECK (
    is_farm_manager(auth.uid(), farm_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Investment managers can create logbook entries"
  ON farm_logbook FOR INSERT
  TO authenticated
  WITH CHECK (
    is_investment_manager(auth.uid(), farm_id)
    AND created_by = auth.uid()
  );

-- =========================================================
-- 6. دوال اعتماد المهام الاستثمارية
-- =========================================================

CREATE OR REPLACE FUNCTION approve_task_investment(
  p_task_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task staff_tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM staff_tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المهمة غير موجودة');
  END IF;

  IF v_task.farm_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'المهمة غير مرتبطة بمزرعة');
  END IF;

  IF NOT is_investment_manager(auth.uid(), v_task.farm_id) AND NOT is_platform_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  IF v_task.approval_chain != 'farm_then_investment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'المهمة لا تتطلب اعتماد استثماري');
  END IF;

  IF v_task.status NOT IN ('completed', 'awaiting_approval') THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب إكمال المهمة أولاً');
  END IF;

  UPDATE staff_tasks SET
    investment_approved_by = auth.uid(),
    investment_approved_at = now(),
    investment_notes = p_notes,
    status = 'approved',
    updated_at = now()
  WHERE id = p_task_id;

  INSERT INTO farm_logbook (
    farm_id,
    created_by,
    created_by_role,
    type,
    message
  ) VALUES (
    v_task.farm_id,
    auth.uid(),
    'investment_manager',
    'decision',
    format('تم اعتماد المهمة "%s" استثمارياً%s',
      v_task.title,
      CASE WHEN p_notes IS NOT NULL THEN ' - ' || p_notes ELSE '' END
    )
  );

  RETURN jsonb_build_object('success', true, 'message', 'تم اعتماد المهمة استثمارياً');
END;
$$;

CREATE OR REPLACE FUNCTION reject_task_investment(
  p_task_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task staff_tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM staff_tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المهمة غير موجودة');
  END IF;

  IF v_task.farm_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'المهمة غير مرتبطة بمزرعة');
  END IF;

  IF NOT is_investment_manager(auth.uid(), v_task.farm_id) AND NOT is_platform_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مصرح');
  END IF;

  UPDATE staff_tasks SET
    investment_approved_by = auth.uid(),
    investment_approved_at = NULL,
    investment_notes = p_reason,
    status = 'in_progress',
    updated_at = now()
  WHERE id = p_task_id;

  INSERT INTO farm_logbook (
    farm_id,
    created_by,
    created_by_role,
    type,
    message
  ) VALUES (
    v_task.farm_id,
    auth.uid(),
    'investment_manager',
    'decision',
    format('تم رفض المهمة "%s" استثمارياً - %s', v_task.title, p_reason)
  );

  RETURN jsonb_build_object('success', true, 'message', 'تم رفض المهمة');
END;
$$;

-- =========================================================
-- 7. منح الصلاحيات
-- =========================================================

GRANT EXECUTE ON FUNCTION is_farm_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_farm_manager(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_investment_manager(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_farms(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_investment_manager_farms(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_task_investment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_task_investment(uuid, text) TO authenticated;
