/*
  # Critical Alerts System for B2F Operations Room
  
  1. Functions
    - `get_b2f_critical_alerts()` - Returns all critical alerts with counts and farm IDs
    
  2. Alert Types
    - Farms without manager
    - Farms without team members
    - Farms with overdue tasks (7+ days)
    - Farms with high expenses (threshold-based)
    - Farms with closed bookings but pending requests (optional)
    
  3. Security
    - Functions are accessible to authenticated users
    - Returns aggregated data with farm IDs for filtering
*/

-- Function to get all critical alerts
CREATE OR REPLACE FUNCTION get_b2f_critical_alerts()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_farms_no_manager text[];
  v_farms_no_team text[];
  v_farms_overdue_tasks text[];
  v_farms_high_expenses text[];
  v_farms_closed_with_requests text[];
BEGIN
  -- 1. Farms without manager
  SELECT ARRAY_AGG(id::text)
  INTO v_farms_no_manager
  FROM b2f_farms
  WHERE farm_manager_id IS NULL
    AND status = 'active';
  
  -- 2. Farms without team members
  SELECT ARRAY_AGG(DISTINCT f.id::text)
  INTO v_farms_no_team
  FROM b2f_farms f
  WHERE f.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM farm_team_members ftm 
      WHERE ftm.farm_id = f.id
    );
  
  -- 3. Farms with overdue tasks (7+ days)
  SELECT ARRAY_AGG(DISTINCT ft.farm_id::text)
  INTO v_farms_overdue_tasks
  FROM farm_tasks ft
  INNER JOIN b2f_farms f ON f.id = ft.farm_id
  WHERE ft.status = 'pending'
    AND ft.due_date < NOW() - INTERVAL '7 days'
    AND f.status = 'active';
  
  -- 4. Farms with high expenses (>50000 temporary threshold)
  SELECT ARRAY_AGG(DISTINCT fe.farm_id::text)
  INTO v_farms_high_expenses
  FROM farm_expenses fe
  INNER JOIN b2f_farms f ON f.id = fe.farm_id
  WHERE fe.created_at >= NOW() - INTERVAL '30 days'
    AND f.status = 'active'
  GROUP BY fe.farm_id
  HAVING SUM(fe.amount) > 50000;
  
  -- 5. Farms with closed bookings but pending requests (optional)
  SELECT ARRAY_AGG(DISTINCT f.id::text)
  INTO v_farms_closed_with_requests
  FROM b2f_farms f
  WHERE f.status = 'active'
    AND f.bookings_enabled = false
    AND EXISTS (
      SELECT 1 FROM b2f_sales_requests sr
      WHERE sr.farm_id = f.id
        AND sr.status IN ('pending', 'pending_review')
        AND sr.created_at >= NOW() - INTERVAL '7 days'
    );
  
  -- Build JSON result
  v_result := json_build_object(
    'farms_no_manager', json_build_object(
      'count', COALESCE(array_length(v_farms_no_manager, 1), 0),
      'farm_ids', COALESCE(v_farms_no_manager, ARRAY[]::text[])
    ),
    'farms_no_team', json_build_object(
      'count', COALESCE(array_length(v_farms_no_team, 1), 0),
      'farm_ids', COALESCE(v_farms_no_team, ARRAY[]::text[])
    ),
    'farms_overdue_tasks', json_build_object(
      'count', COALESCE(array_length(v_farms_overdue_tasks, 1), 0),
      'farm_ids', COALESCE(v_farms_overdue_tasks, ARRAY[]::text[])
    ),
    'farms_high_expenses', json_build_object(
      'count', COALESCE(array_length(v_farms_high_expenses, 1), 0),
      'farm_ids', COALESCE(v_farms_high_expenses, ARRAY[]::text[])
    ),
    'farms_closed_with_requests', json_build_object(
      'count', COALESCE(array_length(v_farms_closed_with_requests, 1), 0),
      'farm_ids', COALESCE(v_farms_closed_with_requests, ARRAY[]::text[])
    )
  );
  
  RETURN v_result;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_b2f_critical_alerts() TO authenticated, anon, service_role;

-- Add comment
COMMENT ON FUNCTION get_b2f_critical_alerts() IS 'Returns critical alerts for B2F operations room with farm IDs for filtering';