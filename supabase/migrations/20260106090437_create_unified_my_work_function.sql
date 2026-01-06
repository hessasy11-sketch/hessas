/*
  # Unified My Work Function - Single Source of Truth

  1. Function
    - `get_my_work(p_staff_id uuid)` - Returns all work data in one call

  2. Returns
    - tasks: Unified list from staff_tasks + farm_tasks
    - approvals: Items awaiting this user's approval
    - alerts: Overdue, urgent, needs proof
    - counts: Quick summary numbers

  3. Security
    - GM sees everything (or wide scope)
    - Non-GM sees only their assigned work
    - Enforces permission checks internally
*/

-- Drop existing function if any
DROP FUNCTION IF EXISTS get_my_work(uuid);

-- Create unified function
CREATE OR REPLACE FUNCTION get_my_work(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_is_gm boolean := false;
  v_tasks jsonb;
  v_approvals jsonb;
  v_alerts jsonb;
  v_counts jsonb;
  v_result jsonb;
BEGIN
  -- Get user role
  SELECT role INTO v_role
  FROM platform_staff
  WHERE id = p_staff_id;

  -- Check if GM
  v_is_gm := (v_role = 'general_manager');

  -- ============================================
  -- 1. TASKS (Unified from staff_tasks + farm_tasks)
  -- ============================================

  WITH staff_tasks_data AS (
    SELECT
      st.id,
      'staff' as task_type,
      COALESCE(st.title, 'مهمة') as title,
      st.description,
      st.status,
      COALESCE(st.priority, 'medium') as priority,
      st.due_date,
      st.requires_proof,
      st.proof_url,
      st.assigned_to as assigned_to_id,
      ps1.staff_name as assigned_to_name,
      st.assigned_by as assigned_by_id,
      ps2.staff_name as assigned_by_name,
      st.created_at,
      st.started_at,
      st.completed_at,
      NULL::uuid as farm_id,
      NULL::text as farm_name,
      st.notes,
      st.rejection_reason
    FROM staff_tasks st
    LEFT JOIN platform_staff ps1 ON ps1.id = st.assigned_to
    LEFT JOIN platform_staff ps2 ON ps2.id = st.assigned_by
    WHERE
      CASE
        WHEN v_is_gm THEN true
        ELSE st.assigned_to = p_staff_id
      END
      AND st.status NOT IN ('completed', 'rejected')
  ),
  farm_tasks_data AS (
    SELECT
      ft.id,
      'farm' as task_type,
      COALESCE(ft.task_title, 'مهمة مزرعة') as title,
      ft.task_description as description,
      ft.status,
      COALESCE(ft.priority, 'medium') as priority,
      ft.due_date,
      ft.requires_proof,
      ft.proof_url,
      ft.assigned_to_user_id as assigned_to_id,
      ps1.staff_name as assigned_to_name,
      ft.created_by as assigned_by_id,
      ps2.staff_name as assigned_by_name,
      ft.created_at,
      ft.started_at,
      ft.completed_at,
      ft.farm_id,
      f.name as farm_name,
      ft.notes,
      ft.rejection_reason
    FROM farm_tasks ft
    LEFT JOIN platform_staff ps1 ON ps1.id = ft.assigned_to_user_id
    LEFT JOIN platform_staff ps2 ON ps2.id = ft.created_by
    LEFT JOIN b2f_farms f ON f.id = ft.farm_id
    WHERE
      CASE
        WHEN v_is_gm THEN true
        ELSE ft.assigned_to_user_id = p_staff_id
      END
      AND ft.status NOT IN ('completed', 'rejected')
  ),
  all_tasks AS (
    SELECT * FROM staff_tasks_data
    UNION ALL
    SELECT * FROM farm_tasks_data
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'taskType', task_type,
      'title', title,
      'description', description,
      'status', status,
      'priority', priority,
      'dueDate', due_date,
      'requiresProof', requires_proof,
      'proofUrl', proof_url,
      'assignedToId', assigned_to_id,
      'assignedToName', assigned_to_name,
      'assignedById', assigned_by_id,
      'assignedByName', assigned_by_name,
      'createdAt', created_at,
      'startedAt', started_at,
      'completedAt', completed_at,
      'farmId', farm_id,
      'farmName', farm_name,
      'notes', notes,
      'rejectionReason', rejection_reason
    ) ORDER BY
      CASE priority
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        ELSE 4
      END,
      due_date NULLS LAST,
      created_at DESC
  ) INTO v_tasks
  FROM all_tasks;

  -- Default to empty array if no tasks
  v_tasks := COALESCE(v_tasks, '[]'::jsonb);

  -- ============================================
  -- 2. APPROVALS (Items awaiting user's approval)
  -- ============================================

  WITH decision_approvals AS (
    SELECT
      dq.id,
      'decision' as approval_type,
      dq.title,
      dq.description,
      dq.priority,
      dq.section,
      dq.created_at,
      dq.created_by,
      ps.staff_name as created_by_name,
      NULL::uuid as farm_id,
      NULL::text as farm_name
    FROM decision_queue dq
    LEFT JOIN platform_staff ps ON ps.id = dq.created_by
    WHERE dq.status = 'pending'
      AND (
        v_is_gm OR
        EXISTS (
          SELECT 1 FROM decision_authorities da
          WHERE da.decision_type = dq.decision_type
            AND (
              da.role_name = v_role
              OR da.custom_role_id IN (
                SELECT role_id FROM authority_assignments
                WHERE staff_id = p_staff_id AND is_active = true
              )
            )
        )
      )
  ),
  task_approvals AS (
    SELECT
      st.id,
      'task_staff' as approval_type,
      COALESCE(st.title, 'مهمة') as title,
      st.description,
      st.priority,
      'tasks' as section,
      st.created_at,
      st.assigned_by as created_by,
      ps.staff_name as created_by_name,
      NULL::uuid as farm_id,
      NULL::text as farm_name
    FROM staff_tasks st
    LEFT JOIN platform_staff ps ON ps.id = st.assigned_by
    WHERE st.status = 'under_review'
      AND (
        v_is_gm OR
        st.assigned_by = p_staff_id OR
        v_role IN ('supervisor', 'manager', 'accountant')
      )

    UNION ALL

    SELECT
      ft.id,
      'task_farm' as approval_type,
      COALESCE(ft.task_title, 'مهمة مزرعة') as title,
      ft.task_description as description,
      ft.priority,
      'farm_tasks' as section,
      ft.created_at,
      ft.created_by as created_by,
      ps.staff_name as created_by_name,
      ft.farm_id,
      f.name as farm_name
    FROM farm_tasks ft
    LEFT JOIN platform_staff ps ON ps.id = ft.created_by
    LEFT JOIN b2f_farms f ON f.id = ft.farm_id
    WHERE ft.status = 'awaiting_approval'
      AND (
        v_is_gm OR
        ft.created_by = p_staff_id OR
        v_role IN ('supervisor', 'manager', 'farm_manager', 'accountant')
      )
  ),
  expense_approvals AS (
    SELECT
      fe.id,
      'expense' as approval_type,
      'موافقة على مصروف' as title,
      fe.description,
      'medium' as priority,
      'expenses' as section,
      fe.expense_date as created_at,
      NULL::uuid as created_by,
      NULL::text as created_by_name,
      fe.farm_id,
      f.name as farm_name
    FROM farm_expenses fe
    LEFT JOIN b2f_farms f ON f.id = fe.farm_id
    WHERE fe.approval_status = 'pending'
      AND (
        v_is_gm OR
        v_role IN ('accountant', 'manager', 'farm_manager')
      )
  ),
  all_approvals AS (
    SELECT * FROM decision_approvals
    UNION ALL
    SELECT * FROM task_approvals
    UNION ALL
    SELECT * FROM expense_approvals
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'approvalType', approval_type,
      'title', title,
      'description', description,
      'priority', priority,
      'section', section,
      'createdAt', created_at,
      'createdBy', created_by,
      'createdByName', created_by_name,
      'farmId', farm_id,
      'farmName', farm_name
    ) ORDER BY
      CASE priority
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        ELSE 4
      END,
      created_at DESC
  ) INTO v_approvals
  FROM all_approvals;

  -- Default to empty array if no approvals
  v_approvals := COALESCE(v_approvals, '[]'::jsonb);

  -- ============================================
  -- 3. ALERTS (Overdue, Urgent, Needs Proof)
  -- ============================================

  WITH task_alerts AS (
    SELECT
      st.id,
      'staff' as task_type,
      COALESCE(st.title, 'مهمة') as title,
      st.status,
      st.priority,
      st.due_date,
      st.requires_proof,
      st.proof_url,
      NULL::uuid as farm_id,
      NULL::text as farm_name,
      CASE
        WHEN st.due_date IS NOT NULL AND st.due_date < CURRENT_TIMESTAMP AND st.status NOT IN ('completed', 'rejected') THEN 'overdue'
        WHEN st.priority = 'high' AND st.status = 'pending' THEN 'urgent'
        WHEN st.requires_proof AND st.proof_url IS NULL AND st.status = 'in_progress' THEN 'needs_proof'
        ELSE NULL
      END as alert_type
    FROM staff_tasks st
    WHERE
      CASE
        WHEN v_is_gm THEN true
        ELSE st.assigned_to = p_staff_id
      END
      AND st.status NOT IN ('completed', 'rejected')

    UNION ALL

    SELECT
      ft.id,
      'farm' as task_type,
      COALESCE(ft.task_title, 'مهمة مزرعة') as title,
      ft.status,
      ft.priority,
      ft.due_date,
      ft.requires_proof,
      ft.proof_url,
      ft.farm_id,
      f.name as farm_name,
      CASE
        WHEN ft.due_date IS NOT NULL AND ft.due_date < CURRENT_TIMESTAMP AND ft.status NOT IN ('completed', 'rejected') THEN 'overdue'
        WHEN ft.priority = 'high' AND ft.status = 'pending' THEN 'urgent'
        WHEN ft.requires_proof AND ft.proof_url IS NULL AND ft.status = 'in_progress' THEN 'needs_proof'
        ELSE NULL
      END as alert_type
    FROM farm_tasks ft
    LEFT JOIN b2f_farms f ON f.id = ft.farm_id
    WHERE
      CASE
        WHEN v_is_gm THEN true
        ELSE ft.assigned_to_user_id = p_staff_id
      END
      AND ft.status NOT IN ('completed', 'rejected')
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'taskType', task_type,
      'title', title,
      'status', status,
      'priority', priority,
      'dueDate', due_date,
      'requiresProof', requires_proof,
      'proofUrl', proof_url,
      'farmId', farm_id,
      'farmName', farm_name,
      'alertType', alert_type
    ) ORDER BY
      CASE alert_type
        WHEN 'overdue' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'needs_proof' THEN 3
        ELSE 4
      END
  ) INTO v_alerts
  FROM task_alerts
  WHERE alert_type IS NOT NULL;

  -- Default to empty array if no alerts
  v_alerts := COALESCE(v_alerts, '[]'::jsonb);

  -- ============================================
  -- 4. COUNTS (Quick summary numbers)
  -- ============================================

  SELECT jsonb_build_object(
    'totalTasks', (
      SELECT COUNT(*) FROM (
        SELECT id FROM staff_tasks st
        WHERE
          CASE WHEN v_is_gm THEN true ELSE st.assigned_to = p_staff_id END
          AND st.status NOT IN ('completed', 'rejected')
        UNION ALL
        SELECT id FROM farm_tasks ft
        WHERE
          CASE WHEN v_is_gm THEN true ELSE ft.assigned_to_user_id = p_staff_id END
          AND ft.status NOT IN ('completed', 'rejected')
      ) t
    ),
    'openTasks', (
      SELECT COUNT(*) FROM (
        SELECT id FROM staff_tasks st
        WHERE
          CASE WHEN v_is_gm THEN true ELSE st.assigned_to = p_staff_id END
          AND st.status = 'pending'
        UNION ALL
        SELECT id FROM farm_tasks ft
        WHERE
          CASE WHEN v_is_gm THEN true ELSE ft.assigned_to_user_id = p_staff_id END
          AND ft.status = 'pending'
      ) t
    ),
    'inProgress', (
      SELECT COUNT(*) FROM (
        SELECT id FROM staff_tasks st
        WHERE
          CASE WHEN v_is_gm THEN true ELSE st.assigned_to = p_staff_id END
          AND st.status = 'in_progress'
        UNION ALL
        SELECT id FROM farm_tasks ft
        WHERE
          CASE WHEN v_is_gm THEN true ELSE ft.assigned_to_user_id = p_staff_id END
          AND ft.status = 'in_progress'
      ) t
    ),
    'awaitingApproval', (
      SELECT COUNT(*) FROM (
        SELECT id FROM staff_tasks st
        WHERE st.status = 'under_review'
          AND (
            v_is_gm OR
            st.assigned_by = p_staff_id OR
            v_role IN ('supervisor', 'manager', 'accountant')
          )
        UNION ALL
        SELECT id FROM farm_tasks ft
        WHERE ft.status = 'awaiting_approval'
          AND (
            v_is_gm OR
            ft.created_by = p_staff_id OR
            v_role IN ('supervisor', 'manager', 'farm_manager', 'accountant')
          )
      ) t
    ),
    'urgentTasks', (
      SELECT COUNT(*) FROM (
        SELECT id FROM staff_tasks st
        WHERE
          CASE WHEN v_is_gm THEN true ELSE st.assigned_to = p_staff_id END
          AND st.priority = 'high'
          AND st.status NOT IN ('completed', 'rejected')
        UNION ALL
        SELECT id FROM farm_tasks ft
        WHERE
          CASE WHEN v_is_gm THEN true ELSE ft.assigned_to_user_id = p_staff_id END
          AND ft.priority = 'high'
          AND ft.status NOT IN ('completed', 'rejected')
      ) t
    ),
    'overdueTasks', (
      SELECT COUNT(*) FROM (
        SELECT id FROM staff_tasks st
        WHERE
          CASE WHEN v_is_gm THEN true ELSE st.assigned_to = p_staff_id END
          AND st.due_date IS NOT NULL
          AND st.due_date < CURRENT_TIMESTAMP
          AND st.status NOT IN ('completed', 'rejected')
        UNION ALL
        SELECT id FROM farm_tasks ft
        WHERE
          CASE WHEN v_is_gm THEN true ELSE ft.assigned_to_user_id = p_staff_id END
          AND ft.due_date IS NOT NULL
          AND ft.due_date < CURRENT_TIMESTAMP
          AND ft.status NOT IN ('completed', 'rejected')
      ) t
    ),
    'needsProof', (
      SELECT COUNT(*) FROM (
        SELECT id FROM staff_tasks st
        WHERE
          CASE WHEN v_is_gm THEN true ELSE st.assigned_to = p_staff_id END
          AND st.requires_proof = true
          AND st.proof_url IS NULL
          AND st.status = 'in_progress'
        UNION ALL
        SELECT id FROM farm_tasks ft
        WHERE
          CASE WHEN v_is_gm THEN true ELSE ft.assigned_to_user_id = p_staff_id END
          AND ft.requires_proof = true
          AND ft.proof_url IS NULL
          AND ft.status = 'in_progress'
      ) t
    ),
    'totalApprovals', jsonb_array_length(v_approvals)
  ) INTO v_counts;

  -- ============================================
  -- 5. BUILD FINAL RESULT
  -- ============================================

  v_result := jsonb_build_object(
    'tasks', v_tasks,
    'approvals', v_approvals,
    'alerts', v_alerts,
    'counts', v_counts,
    'role', v_role,
    'isGM', v_is_gm
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated and service_role
GRANT EXECUTE ON FUNCTION get_my_work(uuid) TO authenticated, service_role, anon;

-- Add comment
COMMENT ON FUNCTION get_my_work(uuid) IS 'Unified My Work API - Returns all work data (tasks, approvals, alerts, counts) in a single call';
