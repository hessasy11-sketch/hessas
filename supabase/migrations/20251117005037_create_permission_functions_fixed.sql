/*
  # Create Permission Functions (Fixed)

  1. Functions
    - check_user_permission: Check if user has specific permission
    - get_user_role_limits: Get user's role limits
    - assign_user_role: Assign role based on plan type
    - auto_update_user_role: Trigger function for auto role update
*/

CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id uuid,
  p_permission_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT pp.is_allowed INTO v_has_permission
  FROM user_plan_roles upr
  JOIN plan_permissions pp ON pp.role_id = upr.role_id
  WHERE upr.user_id = p_user_id
    AND upr.is_active = true
    AND pp.permission_key = p_permission_key
  LIMIT 1;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

CREATE OR REPLACE FUNCTION get_user_role_limits(p_user_id uuid)
RETURNS TABLE(
  permission_key text,
  limit_value integer,
  limit_unit text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.permission_key,
    pp.limit_value,
    pp.limit_unit
  FROM user_plan_roles upr
  JOIN plan_permissions pp ON pp.role_id = upr.role_id
  WHERE upr.user_id = p_user_id
    AND upr.is_active = true
    AND pp.permission_type = 'limit'
    AND pp.is_allowed = true;
END;
$$;

CREATE OR REPLACE FUNCTION assign_user_role(
  p_user_id uuid,
  p_plan_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_id uuid;
  v_current_role_id uuid;
BEGIN
  SELECT id INTO v_role_id
  FROM plan_roles
  WHERE plan_type = p_plan_type
    AND is_active = true
  LIMIT 1;

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role not found for plan type: %', p_plan_type;
  END IF;

  SELECT role_id INTO v_current_role_id
  FROM user_plan_roles
  WHERE user_id = p_user_id
    AND is_active = true
  LIMIT 1;

  IF v_current_role_id IS NOT NULL AND v_current_role_id != v_role_id THEN
    UPDATE user_plan_roles
    SET is_active = false, updated_at = now()
    WHERE user_id = p_user_id AND is_active = true;

    INSERT INTO user_plan_roles (user_id, role_id, previous_role_id, is_active)
    VALUES (p_user_id, v_role_id, v_current_role_id, true);
  ELSIF v_current_role_id IS NULL THEN
    INSERT INTO user_plan_roles (user_id, role_id, is_active)
    VALUES (p_user_id, v_role_id, true);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION auto_update_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_type text;
BEGIN
  SELECT sp.plan_type INTO v_plan_type
  FROM subscription_plans sp
  WHERE sp.id = NEW.plan_id;

  IF NEW.status = 'active' THEN
    PERFORM assign_user_role(NEW.user_id, COALESCE(v_plan_type, 'free'));
  ELSE
    PERFORM assign_user_role(NEW.user_id, 'free');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_update_user_role ON user_subscriptions;
CREATE TRIGGER trigger_auto_update_user_role
  AFTER INSERT OR UPDATE OF status, plan_id
  ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_user_role();

INSERT INTO user_plan_roles (user_id, role_id, is_active)
SELECT 
  p.id,
  (SELECT id FROM plan_roles WHERE role_key = 'free_seller' LIMIT 1),
  true
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_plan_roles upr 
  WHERE upr.user_id = p.id AND upr.is_active = true
)
ON CONFLICT DO NOTHING;
