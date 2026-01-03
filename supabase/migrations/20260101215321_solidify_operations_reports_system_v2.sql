/*
  # تثبيت وترابط نظام التشغيل والتقارير وخدمة المستثمر

  1. منع تكرار التقارير - UNIQUE constraint
  2. توثيق الاعتماد - approved_by, approved_at
  3. الربط مع التشغيل - operation_id
  4. حالة التقرير - status
  5. Timeline موحد
*/

-- ========================================
-- 1️⃣ تحسين management_reports
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'management_reports' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE management_reports ADD COLUMN approved_by uuid REFERENCES b2f_admin_users(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'management_reports' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE management_reports ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'management_reports' AND column_name = 'operation_id'
  ) THEN
    ALTER TABLE management_reports ADD COLUMN operation_id uuid REFERENCES b2f_farm_operations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'management_reports' AND column_name = 'status'
  ) THEN
    ALTER TABLE management_reports ADD COLUMN status text DEFAULT 'sent_to_admin'
      CHECK (status IN ('sent_to_admin', 'viewed', 'archived'));
  END IF;
END $$;

-- UNIQUE constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'management_reports_task_id_report_type_unique'
  ) THEN
    ALTER TABLE management_reports
    ADD CONSTRAINT management_reports_task_id_report_type_unique
    UNIQUE (task_id, report_type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_management_reports_status ON management_reports(status);
CREATE INDEX IF NOT EXISTS idx_management_reports_operation_id ON management_reports(operation_id);

-- ========================================
-- 2️⃣ Timeline موحد
-- ========================================

CREATE TABLE IF NOT EXISTS unified_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE,
  task_id uuid REFERENCES farm_tasks(id) ON DELETE SET NULL,
  report_id uuid REFERENCES management_reports(id) ON DELETE SET NULL,
  operation_id uuid REFERENCES b2f_farm_operations(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'task_created', 'task_assigned', 'task_submitted',
    'task_approved', 'report_created', 'report_viewed',
    'operation_created', 'operation_sent_to_investors'
  )),
  actor_id uuid,
  actor_name text,
  actor_role text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE unified_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view timeline"
  ON unified_timeline FOR SELECT
  USING (is_b2f_admin());

CREATE POLICY "System can insert timeline"
  ON unified_timeline FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_unified_timeline_farm ON unified_timeline(farm_id);
CREATE INDEX IF NOT EXISTS idx_unified_timeline_task ON unified_timeline(task_id);
CREATE INDEX IF NOT EXISTS idx_unified_timeline_created ON unified_timeline(created_at DESC);

-- ========================================
-- 3️⃣ دالة إنشاء تقرير محصّن
-- ========================================

CREATE OR REPLACE FUNCTION create_management_report_safe(
  p_task_id uuid,
  p_farm_id uuid,
  p_approved_by uuid,
  p_title text,
  p_summary text,
  p_approved_photos jsonb,
  p_send_to_investors boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report_id uuid;
  v_operation_id uuid;
  v_task record;
  v_farm record;
  v_investor_count int := 0;
BEGIN
  -- منع التكرار
  IF EXISTS (
    SELECT 1 FROM management_reports
    WHERE task_id = p_task_id AND report_type = 'task_completion'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم إنشاء تقرير لهذه المهمة مسبقاً');
  END IF;

  SELECT * INTO v_task FROM farm_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المهمة غير موجودة');
  END IF;

  SELECT * INTO v_farm FROM b2f_farms WHERE id = p_farm_id;

  -- إنشاء التقرير
  INSERT INTO management_reports (
    farm_id, task_id, report_type, title, summary,
    approved_photos, approved_by, approved_at, priority, status,
    metadata
  )
  VALUES (
    p_farm_id, p_task_id, 'task_completion', p_title, p_summary,
    p_approved_photos, p_approved_by, now(), 'normal', 'sent_to_admin',
    jsonb_build_object(
      'farm_name', v_farm.name,
      'task_type', v_task.task_type,
      'task_title', v_task.title,
      'supervisor_name', v_task.assigned_to
    )
  )
  RETURNING id INTO v_report_id;

  -- Timeline
  INSERT INTO unified_timeline (
    farm_id, task_id, report_id, event_type,
    actor_id, actor_name, actor_role, description
  )
  VALUES (
    p_farm_id, p_task_id, v_report_id, 'report_created',
    p_approved_by, 'مدير المزرعة', 'farm_manager', 'تم إنشاء تقرير توثيقي معتمد'
  );

  -- إرسال للمستثمرين
  IF p_send_to_investors AND v_task.task_type IN ('irrigation', 'maintenance', 'pest_control', 'harvest') THEN

    INSERT INTO b2f_farm_operations (
      farm_id, operation_type, title, description,
      status, scheduled_date, completed_date,
      photos, notes, metadata
    )
    VALUES (
      p_farm_id, v_task.task_type, v_task.title, p_summary,
      'completed', v_task.created_at, now(),
      p_approved_photos, 'عملية معتمدة من إدارة المزرعة',
      jsonb_build_object('source', 'approved_task', 'task_id', p_task_id, 'report_id', v_report_id)
    )
    RETURNING id INTO v_operation_id;

    UPDATE management_reports SET operation_id = v_operation_id WHERE id = v_report_id;

    INSERT INTO investor_operations (
      investor_account_id, operation_id, farm_id,
      contract_id, operation_type, trees_affected, status, notification_sent
    )
    SELECT
      c.investor_account_id, v_operation_id, c.farm_id,
      c.id, v_task.task_type, c.tree_count, 'completed', true
    FROM b2f_contracts c
    WHERE c.farm_id = p_farm_id AND c.status = 'active' AND c.operation_status = 'active';

    GET DIAGNOSTICS v_investor_count = ROW_COUNT;

    INSERT INTO unified_timeline (
      farm_id, operation_id, report_id, event_type,
      actor_id, actor_name, actor_role, description, metadata
    )
    VALUES (
      p_farm_id, v_operation_id, v_report_id, 'operation_sent_to_investors',
      p_approved_by, 'مدير المزرعة', 'farm_manager',
      format('تم إرسال العملية إلى %s مستثمر', v_investor_count),
      jsonb_build_object('investor_count', v_investor_count)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'report_id', v_report_id,
    'operation_id', v_operation_id, 'investors_notified', v_investor_count
  );
END;
$$;

-- ========================================
-- 4️⃣ دوال المشاهدة والملاحظات
-- ========================================

CREATE OR REPLACE FUNCTION mark_report_as_viewed(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE management_reports
  SET viewed_by_admin = true, viewed_at = now(), status = 'viewed'
  WHERE id = p_report_id AND viewed_by_admin = false;

  IF FOUND THEN
    INSERT INTO unified_timeline (farm_id, report_id, event_type, actor_role, description)
    SELECT farm_id, id, 'report_viewed', 'admin', 'تم مشاهدة التقرير'
    FROM management_reports WHERE id = p_report_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION add_admin_notes_to_report(p_report_id uuid, p_admin_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE management_reports SET admin_notes = p_admin_notes, status = 'viewed' WHERE id = p_report_id;
  
  INSERT INTO unified_timeline (farm_id, report_id, event_type, actor_role, description)
  SELECT farm_id, id, 'report_viewed', 'admin', 'تم إضافة ملاحظات إدارية'
  FROM management_reports WHERE id = p_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_task_complete_timeline(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'task', (SELECT jsonb_build_object('id', id, 'title', title, 'task_type', task_type, 'status', status) FROM farm_tasks WHERE id = p_task_id),
    'timeline', (SELECT jsonb_agg(jsonb_build_object('event_type', event_type, 'actor_name', actor_name, 'description', description, 'created_at', created_at) ORDER BY created_at) FROM unified_timeline WHERE task_id = p_task_id),
    'report', (SELECT jsonb_build_object('id', id, 'status', status, 'viewed_by_admin', viewed_by_admin) FROM management_reports WHERE task_id = p_task_id LIMIT 1)
  );
END;
$$;

CREATE OR REPLACE FUNCTION check_system_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_tasks', (SELECT COUNT(*) FROM farm_tasks),
    'total_reports', (SELECT COUNT(*) FROM management_reports),
    'reports_with_operations', (SELECT COUNT(*) FROM management_reports WHERE operation_id IS NOT NULL),
    'timeline_events', (SELECT COUNT(*) FROM unified_timeline),
    'duplicate_reports', (SELECT COUNT(*) FROM (SELECT task_id FROM management_reports WHERE task_id IS NOT NULL GROUP BY task_id HAVING COUNT(*) > 1) d)
  );
END;
$$;

-- ========================================
-- 5️⃣ Triggers
-- ========================================

CREATE OR REPLACE FUNCTION log_task_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO unified_timeline (farm_id, task_id, event_type, actor_name, actor_role, description)
  VALUES (NEW.farm_id, NEW.id, 'task_created', 'مدير المزرعة', 'farm_manager', format('تم إنشاء مهمة: %s', NEW.title));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_task_creation ON farm_tasks;
CREATE TRIGGER trigger_log_task_creation AFTER INSERT ON farm_tasks FOR EACH ROW EXECUTE FUNCTION log_task_creation();

CREATE OR REPLACE FUNCTION log_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO unified_timeline (farm_id, task_id, event_type, actor_role, description)
    VALUES (NEW.farm_id, NEW.id,
      CASE WHEN NEW.status = 'submitted' THEN 'task_submitted' WHEN NEW.status = 'approved' THEN 'task_approved' ELSE 'task_created' END,
      CASE WHEN NEW.status = 'submitted' THEN 'supervisor' WHEN NEW.status = 'approved' THEN 'farm_manager' ELSE 'system' END,
      format('تغيرت حالة المهمة من %s إلى %s', OLD.status, NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_task_status_change ON farm_tasks;
CREATE TRIGGER trigger_log_task_status_change AFTER UPDATE ON farm_tasks FOR EACH ROW EXECUTE FUNCTION log_task_status_change();

GRANT EXECUTE ON FUNCTION create_management_report_safe TO authenticated, anon;
GRANT EXECUTE ON FUNCTION mark_report_as_viewed TO authenticated, anon;
GRANT EXECUTE ON FUNCTION add_admin_notes_to_report TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_task_complete_timeline TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_system_integrity TO authenticated, anon;
