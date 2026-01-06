/*
  # Staff Scope System - Farm Team Integration

  1. New Fields
    - Add `scope_type` to platform_staff (GLOBAL/DEPARTMENT/FARM)
    - Add `scope_board` to platform_staff (B2F/B2B/Finance/Marketing)
  
  2. Functions
    - `get_staff_scope(staff_id)` - Returns scope type, board, and farm_ids
    - `get_staff_farms(staff_id)` - Returns list of farms user has access to
    - `check_farm_access(staff_id, farm_id)` - Check if staff can access specific farm
  
  3. Security
    - GM always has GLOBAL scope
    - Farm team members automatically get FARM scope
    - Department heads get DEPARTMENT scope
*/

-- Add scope fields to platform_staff
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_staff' AND column_name = 'scope_type'
  ) THEN
    ALTER TABLE platform_staff 
    ADD COLUMN scope_type text DEFAULT 'FARM' CHECK (scope_type IN ('GLOBAL', 'DEPARTMENT', 'FARM'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_staff' AND column_name = 'scope_board'
  ) THEN
    ALTER TABLE platform_staff 
    ADD COLUMN scope_board text CHECK (scope_board IN ('B2F', 'B2B', 'Finance', 'Marketing', NULL));
  END IF;
END $$;

-- Set GM to GLOBAL scope automatically
UPDATE platform_staff 
SET scope_type = 'GLOBAL', scope_board = NULL
WHERE role = 'general_manager';

-- Function to get staff scope with farms list
CREATE OR REPLACE FUNCTION get_staff_scope(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scope_type text;
  v_scope_board text;
  v_role text;
  v_department text;
  v_farm_ids uuid[];
  v_is_global boolean := false;
BEGIN
  -- Get staff info
  SELECT 
    COALESCE(scope_type, 'FARM'),
    scope_board,
    role,
    department
  INTO v_scope_type, v_scope_board, v_role, v_department
  FROM platform_staff
  WHERE id = p_staff_id;

  -- GM always has GLOBAL scope
  IF v_role = 'general_manager' THEN
    v_scope_type := 'GLOBAL';
    v_is_global := true;
  END IF;

  -- Get farm IDs based on scope
  IF v_scope_type = 'GLOBAL' THEN
    -- Global: all farms
    SELECT ARRAY_AGG(id) INTO v_farm_ids FROM b2f_farms WHERE deleted_at IS NULL;
    
  ELSIF v_scope_type = 'DEPARTMENT' THEN
    -- Department: all farms in that board (e.g., all B2F farms)
    IF v_scope_board = 'B2F' THEN
      SELECT ARRAY_AGG(id) INTO v_farm_ids FROM b2f_farms WHERE deleted_at IS NULL;
    ELSE
      -- Other departments don't have farm access
      v_farm_ids := ARRAY[]::uuid[];
    END IF;
    
  ELSIF v_scope_type = 'FARM' THEN
    -- Farm: only assigned farms from farm_team
    SELECT ARRAY_AGG(DISTINCT farm_id) INTO v_farm_ids
    FROM farm_team
    WHERE user_id = p_staff_id AND is_active = true;
  END IF;

  -- Return scope info
  RETURN jsonb_build_object(
    'scopeType', v_scope_type,
    'scopeBoard', v_scope_board,
    'role', v_role,
    'department', v_department,
    'farmIds', COALESCE(v_farm_ids, ARRAY[]::uuid[]),
    'isGlobal', v_is_global,
    'canAccessAllFarms', (v_scope_type IN ('GLOBAL', 'DEPARTMENT'))
  );
END;
$$;

-- Function to get staff farms (simple list)
CREATE OR REPLACE FUNCTION get_staff_farms(p_staff_id uuid)
RETURNS TABLE (
  farm_id uuid,
  farm_name text,
  farm_code text,
  user_role text,
  is_manager boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scope jsonb;
BEGIN
  -- Get scope first
  v_scope := get_staff_scope(p_staff_id);

  -- If global or department, return all farms
  IF (v_scope->>'isGlobal')::boolean OR (v_scope->>'canAccessAllFarms')::boolean THEN
    RETURN QUERY
    SELECT 
      f.id,
      f.name,
      f.code,
      'viewer'::text,
      false
    FROM b2f_farms f
    WHERE f.deleted_at IS NULL
    ORDER BY f.name;
  ELSE
    -- Return only assigned farms from farm_team
    RETURN QUERY
    SELECT 
      f.id,
      f.name,
      f.code,
      ft.role,
      (ft.role = 'farm_manager')
    FROM farm_team ft
    JOIN b2f_farms f ON f.id = ft.farm_id
    WHERE ft.user_id = p_staff_id 
      AND ft.is_active = true
      AND f.deleted_at IS NULL
    ORDER BY f.name;
  END IF;
END;
$$;

-- Function to check farm access
CREATE OR REPLACE FUNCTION check_farm_access(p_staff_id uuid, p_farm_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scope jsonb;
  v_farm_ids uuid[];
BEGIN
  v_scope := get_staff_scope(p_staff_id);
  
  -- If global, always true
  IF (v_scope->>'isGlobal')::boolean THEN
    RETURN true;
  END IF;

  -- Check if farm_id is in allowed list
  v_farm_ids := ARRAY(
    SELECT jsonb_array_elements_text(v_scope->'farmIds')::uuid
  );

  RETURN p_farm_id = ANY(v_farm_ids);
END;
$$;

-- Update get_my_work to filter by scope
CREATE OR REPLACE FUNCTION get_my_work(p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_is_gm boolean := false;
  v_scope jsonb;
  v_farm_ids uuid[];
  v_tasks jsonb;
  v_approvals jsonb;
  v_alerts jsonb;
  v_counts jsonb;
BEGIN
  -- Get user role and scope
  SELECT role INTO v_role FROM platform_staff WHERE id = p_staff_id;
  v_is_gm := (v_role = 'general_manager');
  v_scope := get_staff_scope(p_staff_id);
  
  -- Extract farm IDs
  v_farm_ids := ARRAY(
    SELECT jsonb_array_elements_text(v_scope->'farmIds')::uuid
  );

  -- Unified tasks from staff_tasks + farm_tasks (with scope filter)
  WITH staff_tasks_data AS (
    SELECT 
      st.id,
      'staff'::text as task_type,
      st.title,
      st.description,
      st.status,
      st.priority,
      st.due_date,
      st.assigned_to,
      ps.staff_name as assignee_name,
      st.assigned_by,
      assigner.staff_name as assigner_name,
      st.requires_proof,
      st.created_at,
      NULL::text as farm_name,
      NULL::uuid as farm_id
    FROM staff_tasks st
    LEFT JOIN platform_staff ps ON ps.id = st.assigned_to
    LEFT JOIN platform_staff assigner ON assigner.id = st.assigned_by
    WHERE (v_is_gm OR st.assigned_to = p_staff_id OR st.assigned_by = p_staff_id)
  ),
  farm_tasks_data AS (
    SELECT 
      ft.id,
      'farm'::text as task_type,
      ft.title,
      ft.description,
      ft.status,
      ft.priority,
      ft.due_date,
      ft.assigned_to,
      ps.staff_name as assignee_name,
      ft.assigned_by,
      assigner.staff_name as assigner_name,
      ft.requires_proof,
      ft.created_at,
      f.name as farm_name,
      ft.farm_id
    FROM farm_tasks ft
    LEFT JOIN platform_staff ps ON ps.id = ft.assigned_to
    LEFT JOIN platform_staff assigner ON assigner.id = ft.assigned_by
    LEFT JOIN b2f_farms f ON f.id = ft.farm_id
    WHERE (
      v_is_gm OR 
      ft.assigned_to = p_staff_id OR 
      ft.assigned_by = p_staff_id OR
      (v_farm_ids IS NOT NULL AND ft.farm_id = ANY(v_farm_ids))
    )
  ),
  all_tasks AS (
    SELECT * FROM staff_tasks_data
    UNION ALL
    SELECT * FROM farm_tasks_data
    ORDER BY 
      CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      due_date NULLS LAST,
      created_at DESC
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
      'assignedTo', assigned_to,
      'assigneeName', assignee_name,
      'assignedBy', assigned_by,
      'assignerName', assigner_name,
      'requiresProof', requires_proof,
      'createdAt', created_at,
      'farmName', farm_name,
      'farmId', farm_id
    )
  ) INTO v_tasks FROM all_tasks;

  -- Approvals (with scope filter for farm-related approvals)
  WITH decision_approvals AS (
    SELECT 
      dq.id,
      'decision'::text as approval_type,
      dq.title,
      dq.description,
      dq.status,
      dq.priority,
      dq.created_at,
      dq.farm_id,
      f.name as farm_name
    FROM decision_queue dq
    LEFT JOIN b2f_farms f ON f.id = dq.farm_id
    WHERE dq.status = 'pending'
      AND (
        v_is_gm OR 
        dq.farm_id IS NULL OR
        (v_farm_ids IS NOT NULL AND dq.farm_id = ANY(v_farm_ids))
      )
  ),
  task_approvals AS (
    SELECT 
      ft.id,
      'task'::text as approval_type,
      ft.title,
      ft.description,
      ft.status,
      ft.priority,
      ft.created_at,
      ft.farm_id,
      f.name as farm_name
    FROM farm_tasks ft
    LEFT JOIN b2f_farms f ON f.id = ft.farm_id
    WHERE ft.status = 'pending_approval'
      AND (
        v_is_gm OR 
        ft.assigned_by = p_staff_id OR
        (v_farm_ids IS NOT NULL AND ft.farm_id = ANY(v_farm_ids))
      )
  ),
  expense_approvals AS (
    SELECT 
      fe.id,
      'expense'::text as approval_type,
      fe.description as title,
      fe.notes as description,
      fe.approval_status as status,
      'medium'::text as priority,
      fe.created_at,
      fe.farm_id,
      f.name as farm_name
    FROM farm_expenses fe
    LEFT JOIN b2f_farms f ON f.id = fe.farm_id
    WHERE fe.approval_status = 'pending'
      AND (
        v_is_gm OR
        (v_farm_ids IS NOT NULL AND fe.farm_id = ANY(v_farm_ids))
      )
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'approvalType', approval_type,
      'title', title,
      'description', description,
      'status', status,
      'priority', priority,
      'createdAt', created_at,
      'farmId', farm_id,
      'farmName', farm_name
    )
  ) INTO v_approvals FROM (
    SELECT * FROM decision_approvals
    UNION ALL
    SELECT * FROM task_approvals
    UNION ALL
    SELECT * FROM expense_approvals
    ORDER BY created_at DESC
  ) all_approvals;

  -- Alerts (with scope filter)
  WITH alert_tasks AS (
    SELECT 
      ft.id,
      ft.title,
      ft.priority,
      ft.due_date,
      ft.status,
      ft.requires_proof,
      ft.farm_id,
      f.name as farm_name,
      CASE 
        WHEN ft.due_date < CURRENT_DATE THEN 'overdue'
        WHEN ft.due_date = CURRENT_DATE THEN 'due_today'
        WHEN ft.priority = 'urgent' THEN 'urgent'
        WHEN ft.requires_proof AND ft.status = 'completed' THEN 'needs_proof'
        ELSE NULL
      END as alert_type
    FROM farm_tasks ft
    LEFT JOIN b2f_farms f ON f.id = ft.farm_id
    WHERE ft.status IN ('pending', 'in_progress', 'completed')
      AND (
        v_is_gm OR 
        ft.assigned_to = p_staff_id OR
        (v_farm_ids IS NOT NULL AND ft.farm_id = ANY(v_farm_ids))
      )
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title', title,
      'alertType', alert_type,
      'priority', priority,
      'dueDate', due_date,
      'farmId', farm_id,
      'farmName', farm_name
    )
  ) INTO v_alerts FROM alert_tasks WHERE alert_type IS NOT NULL;

  -- Counts (with scope filter)
  SELECT jsonb_build_object(
    'openTasks', (
      SELECT COUNT(*) FROM farm_tasks ft
      WHERE ft.status IN ('pending', 'in_progress')
        AND (
          v_is_gm OR 
          ft.assigned_to = p_staff_id OR
          (v_farm_ids IS NOT NULL AND ft.farm_id = ANY(v_farm_ids))
        )
    ) + (
      SELECT COUNT(*) FROM staff_tasks st
      WHERE st.status IN ('pending', 'in_progress')
        AND (v_is_gm OR st.assigned_to = p_staff_id)
    ),
    'pendingApprovals', (
      SELECT COUNT(*) FROM decision_queue dq
      WHERE dq.status = 'pending'
        AND (
          v_is_gm OR 
          dq.farm_id IS NULL OR
          (v_farm_ids IS NOT NULL AND dq.farm_id = ANY(v_farm_ids))
        )
    ),
    'urgentAlerts', (
      SELECT COUNT(*) FROM farm_tasks ft
      WHERE ft.priority = 'urgent' 
        AND ft.status IN ('pending', 'in_progress')
        AND (
          v_is_gm OR 
          ft.assigned_to = p_staff_id OR
          (v_farm_ids IS NOT NULL AND ft.farm_id = ANY(v_farm_ids))
        )
    ),
    'overdueTasks', (
      SELECT COUNT(*) FROM farm_tasks ft
      WHERE ft.due_date < CURRENT_DATE 
        AND ft.status IN ('pending', 'in_progress')
        AND (
          v_is_gm OR 
          ft.assigned_to = p_staff_id OR
          (v_farm_ids IS NOT NULL AND ft.farm_id = ANY(v_farm_ids))
        )
    )
  ) INTO v_counts;

  -- Return everything with scope info
  RETURN jsonb_build_object(
    'tasks', COALESCE(v_tasks, '[]'::jsonb),
    'approvals', COALESCE(v_approvals, '[]'::jsonb),
    'alerts', COALESCE(v_alerts, '[]'::jsonb),
    'counts', v_counts,
    'role', v_role,
    'isGM', v_is_gm,
    'scope', v_scope
  );
END;
$$;