/*
  # Create Gateway KPIs Functions
  
  Functions to get quick KPIs for GM Gateway Cards:
  - get_b2f_gateway_kpis() - 3 KPIs for B2F card
  - get_b2b_gateway_kpis() - 3 KPIs for B2B card
*/

-- B2F Gateway KPIs
CREATE OR REPLACE FUNCTION get_b2f_gateway_kpis()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_decisions int;
  v_active_farms int;
  v_critical_alerts int;
BEGIN
  -- Count pending decisions
  SELECT COUNT(*)
  INTO v_pending_decisions
  FROM decision_queue
  WHERE status = 'pending';
  
  -- Count active farms (farms with bookings enabled)
  SELECT COUNT(*)
  INTO v_active_farms
  FROM b2f_farms
  WHERE bookings_enabled = true;
  
  -- Count critical alerts (urgent priority decisions)
  SELECT COUNT(*)
  INTO v_critical_alerts
  FROM decision_queue
  WHERE status = 'pending' AND priority = 'urgent';
  
  RETURN json_build_object(
    'pending_decisions', COALESCE(v_pending_decisions, 0),
    'active_farms', COALESCE(v_active_farms, 0),
    'critical_alerts', COALESCE(v_critical_alerts, 0)
  );
END;
$$;

-- B2B Gateway KPIs
CREATE OR REPLACE FUNCTION get_b2b_gateway_kpis()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_decisions int;
  v_active_auctions int;
  v_critical_issues int;
BEGIN
  -- Count pending B2B decisions
  SELECT COUNT(*)
  INTO v_pending_decisions
  FROM b2b_decision_queue
  WHERE status = 'pending';
  
  -- Count active auctions (running auctions)
  SELECT COUNT(*)
  INTO v_active_auctions
  FROM auctions
  WHERE status = 'active' AND ends_at > now();
  
  -- Count critical issues (urgent priority decisions)
  SELECT COUNT(*)
  INTO v_critical_issues
  FROM b2b_decision_queue
  WHERE status = 'pending' AND priority = 'urgent';
  
  RETURN json_build_object(
    'pending_decisions', COALESCE(v_pending_decisions, 0),
    'active_auctions', COALESCE(v_active_auctions, 0),
    'critical_issues', COALESCE(v_critical_issues, 0)
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_b2f_gateway_kpis TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_b2b_gateway_kpis TO authenticated, anon, service_role;

-- Add comments
COMMENT ON FUNCTION get_b2f_gateway_kpis IS 'Returns 3 quick KPIs for B2F gateway card';
COMMENT ON FUNCTION get_b2b_gateway_kpis IS 'Returns 3 quick KPIs for B2B gateway card';