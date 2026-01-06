/*
  # Fix get_last_timeline_event - Build description from event_data
  
  1. Problem
     - Function tries to select 'description' column which doesn't exist
     - farm_activity_timeline only has: event_type, event_data, actor_name
  
  2. Solution
     - Build description dynamically from event_data
     - Use CASE statement to format description based on event_type
  
  3. This fixes Phase 4 completely!
*/

-- Drop and recreate the function with correct logic
DROP FUNCTION IF EXISTS get_last_timeline_event(uuid);

CREATE OR REPLACE FUNCTION get_last_timeline_event(p_farm_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_event json;
BEGIN
  SELECT json_build_object(
    'event_type', event_type,
    'description',
      CASE event_type
        WHEN 'task_created' THEN 'أنشأ مهمة: ' || COALESCE(event_data->>'task_title', 'غير معنون')
        WHEN 'task_status_changed' THEN 'غيّر حالة مهمة: ' || COALESCE(event_data->>'task_title', 'غير معنون')
        WHEN 'proof_uploaded' THEN 'رفع إثبات لمهمة: ' || COALESCE(event_data->>'task_title', 'غير معنون')
        WHEN 'task_approved' THEN 'اعتمد مهمة: ' || COALESCE(event_data->>'task_title', 'غير معنون')
        WHEN 'task_rejected' THEN 'رفض مهمة: ' || COALESCE(event_data->>'task_title', 'غير معنون')
        WHEN 'expense_added' THEN 'أضاف مصروف: ' || COALESCE(event_data->>'description', 'بدون وصف')
        WHEN 'equipment_added' THEN 'أضاف معدة: ' || COALESCE(event_data->>'equipment_name', 'غير محددة')
        WHEN 'farm_created' THEN 'تم إنشاء المزرعة'
        ELSE event_type
      END,
    'actor_name', actor_name,
    'created_at', created_at,
    'event_data', event_data
  )
  INTO v_last_event
  FROM farm_activity_timeline
  WHERE farm_id = p_farm_id
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_last_event;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_last_timeline_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_last_timeline_event(uuid) TO anon;

COMMENT ON FUNCTION get_last_timeline_event IS 
'Returns the most recent timeline event for a farm with description built from event_data';
