/*
  # Add Get Pending B2F Decisions Function
  
  Function to retrieve all pending decisions from decision_queue
*/

-- Function to get pending B2F decisions
CREATE OR REPLACE FUNCTION get_pending_b2f_decisions()
RETURNS TABLE (
  id uuid,
  decision_type text,
  farm_id uuid,
  farm_name text,
  target_staff_id uuid,
  target_staff_name text,
  expense_amount numeric,
  expense_description text,
  status text,
  priority text,
  requested_by uuid,
  requester_name text,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dq.id,
    dq.decision_type,
    dq.farm_id,
    COALESCE(dq.action_data->>'farm_name', f.name) as farm_name,
    dq.target_staff_id,
    CAST(NULL AS text) as target_staff_name,
    dq.expense_amount,
    dq.expense_description,
    dq.status,
    dq.priority,
    dq.requested_by,
    COALESCE(dq.action_data->>'requester_name', ps.full_name_ar, ps.staff_code) as requester_name,
    dq.notes,
    dq.created_at
  FROM decision_queue dq
  LEFT JOIN b2f_farms f ON f.id = dq.farm_id
  LEFT JOIN platform_staff ps ON ps.id = dq.requested_by
  WHERE dq.status = 'pending'
  ORDER BY 
    CASE dq.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END,
    dq.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pending_b2f_decisions TO authenticated, anon, service_role;

COMMENT ON FUNCTION get_pending_b2f_decisions IS 'Returns all pending B2F decisions from decision_queue';