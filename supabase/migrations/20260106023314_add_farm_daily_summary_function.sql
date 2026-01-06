/*
  # Farm Daily Summary Function - Phase 3

  1. Function: get_farm_daily_summary
     Returns daily statistics for a farm:
     - Tasks created today
     - Tasks completed today  
     - Overdue tasks
     - Last approval details

  2. Real-time statistics that update automatically
*/

-- Function: Get Farm Daily Summary
CREATE OR REPLACE FUNCTION get_farm_daily_summary(
  p_farm_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tasks_created_today integer;
  v_tasks_completed_today integer;
  v_tasks_overdue integer;
  v_last_approval json;
BEGIN
  -- Tasks created today
  SELECT COUNT(*)
  INTO v_tasks_created_today
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND DATE(created_at) = p_date;

  -- Tasks completed (approved) today
  SELECT COUNT(*)
  INTO v_tasks_completed_today
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND DATE(approved_at) = p_date;

  -- Overdue tasks (due_date passed but not approved)
  SELECT COUNT(*)
  INTO v_tasks_overdue
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND due_date < NOW()
    AND status NOT IN ('approved', 'rejected')
    AND status != 'cancelled';

  -- Last approval details
  SELECT json_build_object(
    'task_id', id,
    'task_title', title,
    'task_type', type,
    'approved_at', approved_at,
    'approved_by_name', 
      CASE 
        WHEN approved_by IS NOT NULL THEN 
          (SELECT staff_name FROM platform_staff WHERE id = approved_by LIMIT 1)
        ELSE 'مدير المزرعة'
      END,
    'approval_notes', approval_notes
  )
  INTO v_last_approval
  FROM farm_tasks
  WHERE farm_id = p_farm_id
    AND status = 'approved'
    AND approved_at IS NOT NULL
  ORDER BY approved_at DESC
  LIMIT 1;

  -- Return combined results
  RETURN json_build_object(
    'date', p_date,
    'tasks_created_today', v_tasks_created_today,
    'tasks_completed_today', v_tasks_completed_today,
    'tasks_overdue', v_tasks_overdue,
    'last_approval', v_last_approval,
    'completion_rate', 
      CASE 
        WHEN v_tasks_created_today > 0 THEN
          ROUND((v_tasks_completed_today::numeric / v_tasks_created_today::numeric) * 100, 1)
        ELSE 0
      END
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_farm_daily_summary(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_daily_summary(uuid, date) TO anon;

-- Test the function (optional)
COMMENT ON FUNCTION get_farm_daily_summary IS 
'Returns daily summary statistics for a farm including tasks created/completed today, overdue tasks, and last approval details';