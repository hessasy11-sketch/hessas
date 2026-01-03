/*
  # إصلاح دالة get_task_complete_timeline
  
  تصحيح اسم العمود من task_type إلى type
*/

CREATE OR REPLACE FUNCTION get_task_complete_timeline(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'task', (
      SELECT jsonb_build_object(
        'id', id,
        'title', title,
        'type', type,  -- تصحيح: type بدلاً من task_type
        'status', status
      )
      FROM farm_tasks
      WHERE id = p_task_id
    ),
    'timeline', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'event_type', event_type,
          'actor_name', actor_name,
          'description', description,
          'created_at', created_at
        ) ORDER BY created_at
      )
      FROM unified_timeline
      WHERE task_id = p_task_id
    ),
    'report', (
      SELECT jsonb_build_object(
        'id', id,
        'status', status,
        'viewed_by_admin', viewed_by_admin,
        'admin_notes', admin_notes
      )
      FROM management_reports
      WHERE task_id = p_task_id
      LIMIT 1
    ),
    'operation', (
      SELECT jsonb_build_object(
        'id', o.id,
        'operation_type', o.operation_type,
        'investors_count', COUNT(DISTINCT io.investor_account_id)
      )
      FROM management_reports r
      LEFT JOIN b2f_farm_operations o ON o.id = r.operation_id
      LEFT JOIN investor_operations io ON io.operation_id = o.id
      WHERE r.task_id = p_task_id
      GROUP BY o.id, o.operation_type
    )
  );
END;
$$;