/*
  # Get Last Timeline Event Function - Phase 4

  1. Function: get_last_timeline_event
     Returns the most recent timeline event for a farm
     - Event type (task_created, proof_uploaded, task_approved, etc.)
     - Event description
     - Actor name
     - Time ago

  2. Used in B2F Operations Room to show latest activity
*/

-- Function: Get Last Timeline Event for a Farm
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
    'description', description,
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
'Returns the most recent timeline event for a farm, used in operations room';