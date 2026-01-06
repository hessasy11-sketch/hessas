/*
  # نظام Decision Queue الموحد لـ B2F (مزارع)

  ## الهدف
  توحيد جميع القرارات الحساسة في B2F في طابور واحد مرتبط بالمزرعة

  ## المميزات
  1. حقل required_roles لتحديد من يستطيع الاعتماد
  2. ربط كل قرار بـ farm_id
  3. 4 أنواع قرارات في Phase 1:
     - approve_expense (اعتماد مصروف)
     - approve_task_submission (اعتماد مهمة)
     - change_farm_manager (تغيير مدير مزرعة)
     - request_visit (طلب زيارة)
  4. تكامل مع decision_authorities
  5. تنفيذ تلقائي بعد الموافقة
*/

-- ==================================
-- 1. إضافة حقل required_roles
-- ==================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'decision_queue' AND column_name = 'required_roles'
  ) THEN
    ALTER TABLE decision_queue
    ADD COLUMN required_roles text[] DEFAULT ARRAY['super_admin']::text[];
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_decision_queue_farm_status
  ON decision_queue(farm_id, status)
  WHERE status = 'pending';

-- ==================================
-- 2. حذف الدوال الموجودة وإعادة إنشائها
-- ==================================

DROP FUNCTION IF EXISTS get_pending_b2f_decisions();
DROP FUNCTION IF EXISTS approve_b2f_decision(uuid, uuid, text);
DROP FUNCTION IF EXISTS create_expense_decision(uuid, uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS create_task_approval_decision(uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS create_manager_change_decision(uuid, uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS create_visit_request_decision(uuid, date, text, text, text, uuid);

-- ==================================
-- 3. دالة: إنشاء قرار اعتماد مصروف
-- ==================================

CREATE OR REPLACE FUNCTION create_expense_decision(
  p_farm_id uuid,
  p_expense_id uuid,
  p_expense_amount numeric,
  p_expense_description text,
  p_requested_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_id uuid;
  v_required_roles text[];
  v_expense_category text;
BEGIN
  SELECT category INTO v_expense_category
  FROM farm_expenses
  WHERE id = p_expense_id;

  IF p_expense_amount < 5000 THEN
    v_required_roles := ARRAY['super_admin', 'b2f_assistant'];
  ELSE
    v_required_roles := ARRAY['super_admin'];
  END IF;

  INSERT INTO decision_queue (
    decision_type,
    farm_id,
    expense_amount,
    expense_description,
    action_data,
    status,
    priority,
    requested_by,
    required_roles,
    notes
  ) VALUES (
    'approve_expense',
    p_farm_id,
    p_expense_amount,
    p_expense_description,
    jsonb_build_object(
      'expense_id', p_expense_id,
      'category', COALESCE(v_expense_category, 'general')
    ),
    'pending',
    CASE
      WHEN p_expense_amount >= 10000 THEN 'urgent'
      WHEN p_expense_amount >= 5000 THEN 'high'
      ELSE 'normal'
    END,
    p_requested_by,
    v_required_roles,
    'طلب اعتماد مصروف: ' || p_expense_description
  )
  RETURNING id INTO v_decision_id;

  UPDATE farm_expenses
  SET
    approval_status = 'pending_approval',
    updated_at = now()
  WHERE id = p_expense_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', v_decision_id,
    'message_ar', 'تم إرسال طلب اعتماد المصروف',
    'required_roles', v_required_roles
  );
END;
$$;

-- ==================================
-- 4. دالة: إنشاء قرار اعتماد مهمة
-- ==================================

CREATE OR REPLACE FUNCTION create_task_approval_decision(
  p_farm_id uuid,
  p_task_id uuid,
  p_task_title text,
  p_requested_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_id uuid;
  v_required_roles text[];
  v_task_priority text;
BEGIN
  SELECT priority INTO v_task_priority
  FROM farm_tasks
  WHERE id = p_task_id;

  v_required_roles := ARRAY['super_admin', 'farm_manager'];

  INSERT INTO decision_queue (
    decision_type,
    farm_id,
    action_data,
    status,
    priority,
    requested_by,
    required_roles,
    notes
  ) VALUES (
    'approve_task_submission',
    p_farm_id,
    jsonb_build_object(
      'task_id', p_task_id,
      'task_title', p_task_title,
      'task_priority', COALESCE(v_task_priority, 'normal')
    ),
    'pending',
    COALESCE(v_task_priority, 'normal'),
    p_requested_by,
    v_required_roles,
    'طلب اعتماد مهمة: ' || p_task_title
  )
  RETURNING id INTO v_decision_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', v_decision_id,
    'message_ar', 'تم إرسال طلب اعتماد المهمة',
    'required_roles', v_required_roles
  );
END;
$$;

-- ==================================
-- 5. دالة: إنشاء قرار تغيير مدير مزرعة
-- ==================================

CREATE OR REPLACE FUNCTION create_manager_change_decision(
  p_farm_id uuid,
  p_current_manager_id uuid,
  p_new_manager_id uuid,
  p_reason text,
  p_requested_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_id uuid;
  v_required_roles text[];
  v_farm_name text;
  v_current_manager_name text;
  v_new_manager_name text;
BEGIN
  SELECT name INTO v_farm_name FROM b2f_farms WHERE id = p_farm_id;
  SELECT full_name INTO v_current_manager_name FROM platform_staff WHERE id = p_current_manager_id;
  SELECT full_name INTO v_new_manager_name FROM platform_staff WHERE id = p_new_manager_id;

  v_required_roles := ARRAY['super_admin'];

  INSERT INTO decision_queue (
    decision_type,
    farm_id,
    target_staff_id,
    action_data,
    status,
    priority,
    requested_by,
    required_roles,
    notes
  ) VALUES (
    'change_farm_manager',
    p_farm_id,
    p_new_manager_id,
    jsonb_build_object(
      'current_manager_id', p_current_manager_id,
      'current_manager_name', v_current_manager_name,
      'new_manager_id', p_new_manager_id,
      'new_manager_name', v_new_manager_name,
      'farm_name', v_farm_name,
      'reason', p_reason
    ),
    'pending',
    'high',
    p_requested_by,
    v_required_roles,
    format('طلب تغيير مدير مزرعة %s من %s إلى %s - السبب: %s',
      v_farm_name, v_current_manager_name, v_new_manager_name, p_reason)
  )
  RETURNING id INTO v_decision_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', v_decision_id,
    'message_ar', 'تم إرسال طلب تغيير مدير المزرعة - يتطلب موافقة المدير العام',
    'required_roles', v_required_roles
  );
END;
$$;

-- ==================================
-- 6. دالة: إنشاء قرار طلب زيارة
-- ==================================

CREATE OR REPLACE FUNCTION create_visit_request_decision(
  p_farm_id uuid,
  p_visit_date date,
  p_visit_purpose text,
  p_visitor_name text,
  p_visitor_phone text,
  p_requested_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision_id uuid;
  v_required_roles text[];
  v_farm_name text;
BEGIN
  SELECT name INTO v_farm_name FROM b2f_farms WHERE id = p_farm_id;

  v_required_roles := ARRAY['super_admin', 'farm_manager'];

  INSERT INTO decision_queue (
    decision_type,
    farm_id,
    action_data,
    status,
    priority,
    requested_by,
    required_roles,
    notes
  ) VALUES (
    'request_visit',
    p_farm_id,
    jsonb_build_object(
      'visit_date', p_visit_date,
      'visit_purpose', p_visit_purpose,
      'visitor_name', p_visitor_name,
      'visitor_phone', p_visitor_phone,
      'farm_name', v_farm_name
    ),
    'pending',
    'normal',
    p_requested_by,
    v_required_roles,
    format('طلب زيارة إلى مزرعة %s - الغرض: %s - التاريخ: %s',
      v_farm_name, p_visit_purpose, p_visit_date::text)
  )
  RETURNING id INTO v_decision_id;

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', v_decision_id,
    'message_ar', 'تم إرسال طلب الزيارة',
    'required_roles', v_required_roles
  );
END;
$$;

-- ==================================
-- 7. دالة: جلب القرارات المعلقة B2F
-- ==================================

CREATE OR REPLACE FUNCTION get_pending_b2f_decisions()
RETURNS TABLE (
  id uuid,
  decision_type text,
  decision_type_ar text,
  farm_id uuid,
  farm_name text,
  farm_location text,
  target_staff_id uuid,
  target_staff_name text,
  expense_amount numeric,
  expense_description text,
  action_data jsonb,
  status text,
  priority text,
  priority_ar text,
  requested_by uuid,
  requested_by_name text,
  required_roles text[],
  notes text,
  created_at timestamptz,
  hours_pending numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dq.id,
    dq.decision_type,
    CASE dq.decision_type
      WHEN 'approve_expense' THEN 'اعتماد مصروف'
      WHEN 'approve_task_submission' THEN 'اعتماد مهمة'
      WHEN 'change_farm_manager' THEN 'تغيير مدير مزرعة'
      WHEN 'request_visit' THEN 'طلب زيارة'
      ELSE dq.decision_type
    END as decision_type_ar,
    dq.farm_id,
    bf.name as farm_name,
    bf.location as farm_location,
    dq.target_staff_id,
    ps_target.full_name as target_staff_name,
    dq.expense_amount,
    dq.expense_description,
    dq.action_data,
    dq.status,
    dq.priority,
    CASE dq.priority
      WHEN 'urgent' THEN 'عاجل'
      WHEN 'high' THEN 'عالي'
      WHEN 'normal' THEN 'عادي'
      WHEN 'low' THEN 'منخفض'
    END as priority_ar,
    dq.requested_by,
    ps_requester.full_name as requested_by_name,
    dq.required_roles,
    dq.notes,
    dq.created_at,
    EXTRACT(EPOCH FROM (now() - dq.created_at)) / 3600 as hours_pending
  FROM decision_queue dq
  LEFT JOIN b2f_farms bf ON dq.farm_id = bf.id
  LEFT JOIN platform_staff ps_target ON dq.target_staff_id = ps_target.id
  LEFT JOIN platform_staff ps_requester ON dq.requested_by = ps_requester.id
  WHERE dq.status = 'pending'
    AND dq.farm_id IS NOT NULL
  ORDER BY
    CASE dq.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    dq.created_at ASC;
END;
$$;

-- ==================================
-- 8. دالة: الموافقة على قرار B2F وتنفيذه
-- ==================================

CREATE OR REPLACE FUNCTION approve_b2f_decision(
  p_decision_id uuid,
  p_approved_by uuid,
  p_approval_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_decision RECORD;
  v_staff_role text;
  v_can_approve boolean := false;
  v_execution_result jsonb;
BEGIN
  SELECT * INTO v_decision
  FROM decision_queue
  WHERE id = p_decision_id;

  IF v_decision.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision not found'
    );
  END IF;

  IF v_decision.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Decision already processed'
    );
  END IF;

  SELECT role INTO v_staff_role
  FROM platform_staff
  WHERE id = p_approved_by;

  IF v_staff_role = ANY(v_decision.required_roles) THEN
    v_can_approve := true;
  END IF;

  IF NOT v_can_approve THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions',
      'error_ar', 'ليس لديك صلاحية لاعتماد هذا القرار'
    );
  END IF;

  UPDATE decision_queue
  SET
    status = 'approved',
    approved_by = p_approved_by,
    notes = COALESCE(p_approval_notes, notes),
    updated_at = now()
  WHERE id = p_decision_id;

  CASE v_decision.decision_type
    WHEN 'approve_expense' THEN
      UPDATE farm_expenses
      SET
        approval_status = 'approved',
        approved_by = p_approved_by,
        approved_at = now(),
        updated_at = now()
      WHERE id = (v_decision.action_data->>'expense_id')::uuid;

      v_execution_result := jsonb_build_object(
        'action', 'expense_approved',
        'expense_id', v_decision.action_data->>'expense_id'
      );

    WHEN 'approve_task_submission' THEN
      UPDATE farm_tasks
      SET
        status = 'approved',
        updated_at = now()
      WHERE id = (v_decision.action_data->>'task_id')::uuid;

      v_execution_result := jsonb_build_object(
        'action', 'task_approved',
        'task_id', v_decision.action_data->>'task_id'
      );

    WHEN 'change_farm_manager' THEN
      UPDATE b2f_farms
      SET
        farm_manager_id = (v_decision.action_data->>'new_manager_id')::uuid,
        updated_at = now()
      WHERE id = v_decision.farm_id;

      INSERT INTO farm_team (farm_id, user_id, role, is_active)
      SELECT
        v_decision.farm_id,
        ps.user_id,
        'farm_manager',
        true
      FROM platform_staff ps
      WHERE ps.id = (v_decision.action_data->>'new_manager_id')::uuid
      ON CONFLICT (farm_id, user_id, role)
      DO UPDATE SET is_active = true, updated_at = now();

      v_execution_result := jsonb_build_object(
        'action', 'manager_changed',
        'new_manager_id', v_decision.action_data->>'new_manager_id'
      );

    WHEN 'request_visit' THEN
      v_execution_result := jsonb_build_object(
        'action', 'visit_approved',
        'visit_date', v_decision.action_data->>'visit_date'
      );

    ELSE
      v_execution_result := jsonb_build_object(
        'action', 'generic_approval'
      );
  END CASE;

  UPDATE decision_queue
  SET
    status = 'executed',
    executed_at = now()
  WHERE id = p_decision_id;

  INSERT INTO executive_logs (
    action_type,
    farm_id,
    decision_id,
    action_data,
    performed_by,
    result,
    notes
  ) VALUES (
    'approve_decision',
    v_decision.farm_id,
    p_decision_id,
    jsonb_build_object(
      'decision_type', v_decision.decision_type,
      'execution', v_execution_result
    ),
    p_approved_by,
    'success',
    'تمت الموافقة والتنفيذ'
  );

  RETURN jsonb_build_object(
    'success', true,
    'decision_id', p_decision_id,
    'status', 'executed',
    'message_ar', 'تمت الموافقة وتم تنفيذ القرار بنجاح',
    'execution_result', v_execution_result
  );
END;
$$;

-- ==================================
-- 9. Grant Execute
-- ==================================

GRANT EXECUTE ON FUNCTION create_expense_decision TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_task_approval_decision TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_manager_change_decision TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_visit_request_decision TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_pending_b2f_decisions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION approve_b2f_decision TO authenticated, anon;
