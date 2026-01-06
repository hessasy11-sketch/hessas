/*
  # Fix get_my_work - Use Correct farm_tasks Columns
  
  1. Changes
    - Use assigned_to not assigned_to_user_id
    - Use title not task_title
    - Use description not task_description
    - Use proof_notes not notes
*/

DROP FUNCTION IF EXISTS get_my_work(uuid);

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
BEGIN
  SELECT role INTO v_role FROM platform_staff WHERE id = p_staff_id;
  v_is_gm := (v_role = 'general_manager');

  -- ============================================
  -- 1. TASKS
  -- ============================================

  WITH staff_tasks_data AS (
    SELECT
      st.id,
      'staff' as task_type,
      st.title,
      st.description,
      st.status,
      st.priority,
      st.due_date,
      st.requires_proof,
      st.staff_id as assigned_to_id,
      ps1.full_name as assigned_to_name,
      st.assigned_by as assigned_by_id,
      ps2.full_name as assigned_by_name,
      st.created_at,
      st.started_at,
      st.completed_at,
      st.farm_id,
      st.approval_notes as notes
    FROM staff_tasks st
    LEFT JOIN platform_staff ps1 ON ps1.id = st.staff_id
    LEFT JOIN platform_staff ps2 ON ps2.id = st.assigned_by
    WHERE
      (v_is_gm OR st.staff_id = p_staff_id)
      AND st.status NOT IN ('completed', 'cancelled')
  ),
  farm_tasks_data AS (
    SELECT
      ft.id,
      'farm' as task_type,
      ft.title,
      ft.description,
      ft.status,
      ft.priority,
      ft.due_date,
      ft.requires_proof,
      ft.assigned_to as assigned_to_id,
      ft.assigned_to_name,
      ft.created_by as assigned_by_id,
      ft.created_by_name as assigned_by_name,
      ft.created_at,
      ft.started_at,
      ft.approved_at as completed_at,
      ft.farm_id,
      ft.approval_notes as notes
    FROM farm_tasks ft
    WHERE
      (v_is_gm OR ft.assigned_to = p_staff_id)
      AND ft.status NOT IN ('completed', 'rejected')
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
      'assignedToId', assigned_to_id,
      'assignedToName', assigned_to_name,
      'assignedById', assigned_by_id,
      'assignedByName', assigned_by_name,
      'createdAt', created_at,
      'startedAt', started_at,
      'completedAt', completed_at,
      'farmId', farm_id,
      'notes', notes
    ) ORDER BY
      CASE priority
        WHEN 'urgent' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        ELSE 4
      END,
      due_date NULLS LAST,
      created_at DESC
  ) INTO v_tasks
  FROM (
    SELECT * FROM staff_tasks_data
    UNION ALL
    SELECT * FROM farm_tasks_data
  ) all_tasks;

  v_tasks := COALESCE(v_tasks, '[]'::jsonb);

  -- ============================================
  -- 2. APPROVALS
  -- ============================================

  WITH all_approvals AS (
    SELECT
      dq.id,
      'decision' as approval_type,
      dq.title,
      dq.description,
      dq.priority,
      dq.section,
      dq.created_at,
      dq.created_by,
      ps.full_name as created_by_name
    FROM decision_queue dq
    LEFT JOIN platform_staff ps ON ps.id = dq.created_by
    WHERE dq.status = 'pending'
      AND (v_is_gm OR v_role IN ('supervisor', 'manager', 'accountant'))

    UNION ALL

    SELECT
      ft.id,
      'task_farm' as approval_type,
      ft.title,
      ft.description,
      ft.priority,
      'farm_tasks' as section,
      ft.created_at,
      ft.created_by,
      ft.created_by_name
    FROM farm_tasks ft
    WHERE ft.status = 'awaiting_approval'
      AND (v_is_gm OR ft.created_by = p_staff_id OR v_role IN ('supervisor', 'manager', 'farm_manager', 'accountant'))
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
      'createdByName', created_by_name
    ) ORDER BY created_at DESC
  ) INTO v_approvals
  FROM all_approvals;

  v_approvals := COALESCE(v_approvals, '[]'::jsonb);

  -- ============================================
  -- 3. ALERTS
  -- ============================================

  WITH task_alerts AS (
    SELECT
      st.id,
      'staff' as task_type,
      st.title,
      st.status,
      st.priority,
      st.due_date,
      st.requires_proof,
      st.farm_id,
      CASE
        WHEN st.due_date < now() AND st.status NOT IN ('completed', 'cancelled') THEN 'overdue'
        WHEN st.priority IN ('urgent', 'high') AND st.status = 'pending' THEN 'urgent'
        WHEN st.requires_proof AND st.status = 'in_progress' THEN 'needs_proof'
      END as alert_type
    FROM staff_tasks st
    WHERE (v_is_gm OR st.staff_id = p_staff_id)
      AND st.status NOT IN ('completed', 'cancelled')

    UNION ALL

    SELECT
      ft.id,
      'farm' as task_type,
      ft.title,
      ft.status,
      ft.priority,
      ft.due_date,
      ft.requires_proof,
      ft.farm_id,
      CASE
        WHEN ft.due_date < now() AND ft.status NOT IN ('completed', 'rejected') THEN 'overdue'
        WHEN ft.priority = 'high' AND ft.status = 'pending' THEN 'urgent'
        WHEN ft.requires_proof AND ft.status = 'in_progress' THEN 'needs_proof'
      END as alert_type
    FROM farm_tasks ft
    WHERE (v_is_gm OR ft.assigned_to = p_staff_id)
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
      'farmId', farm_id,
      'alertType', alert_type
    )
  ) INTO v_alerts
  FROM task_alerts
  WHERE alert_type IS NOT NULL;

  v_alerts := COALESCE(v_alerts, '[]'::jsonb);

  -- ============================================
  -- 4. COUNTS
  -- ============================================

  v_counts := jsonb_build_object(
    'totalTasks', (
      SELECT COUNT(*) FROM (
        SELECT 1 FROM staff_tasks WHERE (v_is_gm OR staff_id = p_staff_id) AND status NOT IN ('completed', 'cancelled')
        UNION ALL
        SELECT 1 FROM farm_tasks WHERE (v_is_gm OR assigned_to = p_staff_id) AND status NOT IN ('completed', 'rejected')
      ) t
    ),
    'openTasks', (
      SELECT COUNT(*) FROM (
        SELECT 1 FROM staff_tasks WHERE (v_is_gm OR staff_id = p_staff_id) AND status = 'pending'
        UNION ALL
        SELECT 1 FROM farm_tasks WHERE (v_is_gm OR assigned_to = p_staff_id) AND status = 'pending'
      ) t
    ),
    'inProgress', (
      SELECT COUNT(*) FROM (
        SELECT 1 FROM staff_tasks WHERE (v_is_gm OR staff_id = p_staff_id) AND status = 'in_progress'
        UNION ALL
        SELECT 1 FROM farm_tasks WHERE (v_is_gm OR assigned_to = p_staff_id) AND status = 'in_progress'
      ) t
    ),
    'awaitingApproval', jsonb_array_length(v_approvals),
    'urgentTasks', (
      SELECT COUNT(*) FROM (
        SELECT 1 FROM staff_tasks WHERE (v_is_gm OR staff_id = p_staff_id) AND priority IN ('high', 'urgent') AND status NOT IN ('completed', 'cancelled')
        UNION ALL
        SELECT 1 FROM farm_tasks WHERE (v_is_gm OR assigned_to = p_staff_id) AND priority = 'high' AND status NOT IN ('completed', 'rejected')
      ) t
    ),
    'overdueTasks', (
      SELECT COUNT(*) FROM (
        SELECT 1 FROM staff_tasks WHERE (v_is_gm OR staff_id = p_staff_id) AND due_date < now() AND status NOT IN ('completed', 'cancelled')
        UNION ALL
        SELECT 1 FROM farm_tasks WHERE (v_is_gm OR assigned_to = p_staff_id) AND due_date < now() AND status NOT IN ('completed', 'rejected')
      ) t
    ),
    'needsProof', (
      SELECT COUNT(*) FROM (
        SELECT 1 FROM staff_tasks WHERE (v_is_gm OR staff_id = p_staff_id) AND requires_proof = true AND status = 'in_progress'
        UNION ALL
        SELECT 1 FROM farm_tasks WHERE (v_is_gm OR assigned_to = p_staff_id) AND requires_proof = true AND status = 'in_progress'
      ) t
    ),
    'totalApprovals', jsonb_array_length(v_approvals)
  );

  -- ============================================
  -- 5. RESULT
  -- ============================================

  RETURN jsonb_build_object(
    'tasks', v_tasks,
    'approvals', v_approvals,
    'alerts', v_alerts,
    'counts', v_counts,
    'role', v_role,
    'isGM', v_is_gm
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_work(uuid) TO authenticated, service_role, anon;
